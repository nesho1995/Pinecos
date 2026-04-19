# Pipeline de Deploy Automatico (GitHub -> Hetzner)

Este pipeline despliega automaticamente cuando haces `push` a `main`.

## 1) Requisitos previos en servidor

- Repo clonado en: `/home/pinecos/app`
- Usuario de app: `pinecos`
- API service systemd creado: `pinecos-api`
- Nginx sirviendo frontend desde: `/var/www/pinecos`

## 2) Secrets en GitHub

En tu repo: `Settings -> Secrets and variables -> Actions -> New repository secret`

Crear estos secretos:

- `PROD_HOST`: IP publica del servidor (ej. `178.156.210.184`)
- `PROD_PORT`: `22`
- `PROD_USER`: `root`
- `PROD_SSH_KEY`: clave privada SSH (multilinea completa)

Ejemplo de `PROD_SSH_KEY`:

```text
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

## 3) Dar acceso SSH al servidor para la key del pipeline

Si usas una key nueva para GitHub Actions:

1. Genera la key en tu maquina local.
2. Copia la publica al servidor en `/root/.ssh/authorized_keys`.
3. Prueba SSH manual antes de usar el pipeline.

## 4) Workflow incluido

Archivo: `.github/workflows/deploy-production.yml`

Flujo:

1. Build backend (`dotnet build`).
2. Lint + build frontend (`npm run lint`, `npm run build`).
3. SSH al servidor.
4. `git pull` en `/home/pinecos/app`.
5. Ejecuta `ops/deploy_prod.sh`:
   - publish backend
   - restart `pinecos-api`
   - build frontend
   - copiar `dist/` a `/var/www/pinecos`
   - reload nginx
   - health checks de API y web local

## 5) Deploy manual en servidor (fallback)

```bash
chmod +x /home/pinecos/app/ops/deploy_prod.sh
TARGET_BRANCH=main /home/pinecos/app/ops/deploy_prod.sh
```

## 6) Rollback rapido (si fuera necesario)

```bash
su - pinecos -c "cd /home/pinecos/app && git log --oneline -n 5"
# elegir commit previo
su - pinecos -c "cd /home/pinecos/app && git checkout <commit>"
SKIP_GIT_PULL=1 /home/pinecos/app/ops/deploy_prod.sh
```

Luego vuelve a `main`:

```bash
su - pinecos -c "cd /home/pinecos/app && git checkout main"
```
