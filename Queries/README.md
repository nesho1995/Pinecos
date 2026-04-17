# Queries de despliegue y verificacion (2026-04-14)

Este paquete acompana los cambios de backend/frontend implementados.

## Importante
- En esta iteracion se incluye un hotfix de esquema para cierre de caja:
  - `ALTER TABLE cajas MODIFY observacion LONGTEXT NULL;`
- La configuracion SAR por sucursal se guarda en archivo: `backend/App_Data/facturacion_sar.json`.

## Archivos
- `2026-04-14_predeploy_checks.sql`: validaciones rapidas antes de publicar.
- `2026-04-14_postdeploy_checks.sql`: validaciones rapidas despues de publicar.
- `2026-04-14_cuadre_y_estado_cuenta.sql`: consultas utiles de auditoria.
- `2026-04-14_schema_hotfix_observacion_caja.sql`: hotfix para permitir JSON largo en cierre de caja.

## Recomendacion
Ejecutar primero `predeploy`, luego `schema_hotfix_observacion_caja`, despues desplegar API+frontend, y por ultimo `postdeploy`.
