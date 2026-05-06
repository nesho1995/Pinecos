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
WEB_HEALTH_URL="${WEB_HEALTH_URL:-https://pinecoscafehn.com}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

check_http_status() {
  local url="$1"
  local expected="${2:-200}"
  local status
  status="$(curl -k -sS -o /dev/null -w '%{http_code}' "$url")"
  case ",$expected," in
    *,"$status",*) return 0 ;;
    *)
      echo "ERROR: health check inesperado para $url: HTTP $status (esperado: $expected)" >&2
      return 1
      ;;
  esac
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
assert_command rsync
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

case "$APP_DIR" in
  *pinecos*) ;;
  *)
    echo "ERROR: APP_DIR debe apuntar al repo de Pinecos: $APP_DIR" >&2
    exit 1
    ;;
esac

case "$API_OUT_DIR" in
  *pinecos*) ;;
  *)
    echo "ERROR: API_OUT_DIR debe apuntar a Pinecos: $API_OUT_DIR" >&2
    exit 1
    ;;
esac

case "$WEB_DIR" in
  /var/www/pinecos|/var/www/pinecos/*) ;;
  *)
    echo "ERROR: WEB_DIR debe estar dentro de /var/www/pinecos: $WEB_DIR" >&2
    exit 1
    ;;
esac

if [ "$SKIP_GIT_PULL" != "1" ]; then
  log "Actualizando codigo desde GitHub (branch: $TARGET_BRANCH)"
  chown -R "$APP_USER:$APP_USER" "$APP_DIR"
  runuser -u "$APP_USER" -- git -C "$APP_DIR" fetch --prune origin
  runuser -u "$APP_USER" -- git -C "$APP_DIR" checkout "$TARGET_BRANCH"
  runuser -u "$APP_USER" -- git -C "$APP_DIR" pull --ff-only origin "$TARGET_BRANCH"
else
  log "SKIP_GIT_PULL=1, se omite git pull"
fi

log "Version desplegada"
runuser -u "$APP_USER" -- git -C "$APP_DIR" log -1 --date=iso --pretty=format:"%H%n%h %ad%n%s%n"

log "Compilando y publicando backend"
mkdir -p "$API_OUT_DIR"
chown -R "$APP_USER:$APP_USER" "$API_OUT_DIR"
runuser -u "$APP_USER" -- bash -lc "cd '$APP_DIR/backend' && dotnet restore && dotnet publish -c Release -o '$API_OUT_DIR'"

log "Reiniciando servicio API: $API_SERVICE"
systemctl restart "$API_SERVICE"
systemctl is-active --quiet "$API_SERVICE"

log "Compilando frontend"
runuser -u "$APP_USER" -- bash -lc "cd '$APP_DIR/pinecos-frontend' && npm ci --no-audit --no-fund && npm run build"

log "Publicando frontend en $WEB_DIR"
mkdir -p "$WEB_DIR"
rsync -a --delete "$APP_DIR/pinecos-frontend/dist/" "$WEB_DIR/"
chown -R www-data:www-data "$WEB_DIR"

log "Recargando Nginx"
nginx -t
systemctl reload nginx

log "Validando health checks"
check_http_status "$API_HEALTH_URL" "200,401"
check_http_status "$WEB_HEALTH_URL" "200"

log "Deploy finalizado correctamente"
