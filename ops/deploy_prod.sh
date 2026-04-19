#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/home/pinecos/app}"
APP_USER="${APP_USER:-pinecos}"
API_OUT_DIR="${API_OUT_DIR:-/home/pinecos/apps/api}"
WEB_DIR="${WEB_DIR:-/var/www/pinecos}"
API_SERVICE="${API_SERVICE:-pinecos-api}"
TARGET_BRANCH="${TARGET_BRANCH:-main}"
SKIP_GIT_PULL="${SKIP_GIT_PULL:-0}"
API_HEALTH_URL="${API_HEALTH_URL:-http://127.0.0.1:5152/api/Sucursales}"
WEB_HEALTH_URL="${WEB_HEALTH_URL:-http://127.0.0.1/}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

assert_command() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "ERROR: comando requerido no encontrado: $cmd" >&2
    exit 1
  fi
}

assert_command git
assert_command dotnet
assert_command npm
assert_command systemctl
assert_command curl

if ! id "$APP_USER" >/dev/null 2>&1; then
  echo "ERROR: usuario de app no existe: $APP_USER" >&2
  exit 1
fi

if [ ! -d "$APP_DIR/.git" ]; then
  echo "ERROR: no se encontro repo git en $APP_DIR" >&2
  exit 1
fi

if [ "$SKIP_GIT_PULL" != "1" ]; then
  log "Actualizando codigo desde GitHub (branch: $TARGET_BRANCH)"
  su - "$APP_USER" -c "cd '$APP_DIR' && git fetch --prune origin && git checkout '$TARGET_BRANCH' && git pull --ff-only origin '$TARGET_BRANCH'"
else
  log "SKIP_GIT_PULL=1, se omite git pull"
fi

log "Compilando y publicando backend"
su - "$APP_USER" -c "cd '$APP_DIR/backend' && dotnet restore && dotnet publish -c Release -o '$API_OUT_DIR'"

log "Reiniciando servicio API: $API_SERVICE"
systemctl restart "$API_SERVICE"
systemctl is-active --quiet "$API_SERVICE"

log "Compilando frontend"
su - "$APP_USER" -c "cd '$APP_DIR/pinecos-frontend' && npm ci --no-audit --no-fund && npm run build"

log "Publicando frontend en $WEB_DIR"
mkdir -p "$WEB_DIR"
rm -rf "$WEB_DIR"/*
cp -r "$APP_DIR/pinecos-frontend/dist/." "$WEB_DIR/"
chown -R www-data:www-data "$WEB_DIR"

log "Recargando Nginx"
systemctl reload nginx

log "Validando health checks"
curl -fsS "$API_HEALTH_URL" >/dev/null
curl -fsS "$WEB_HEALTH_URL" >/dev/null

log "Deploy finalizado correctamente"
