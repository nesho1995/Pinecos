# Queries de despliegue y verificacion (2026-04-14)

Este paquete acompana los cambios de backend/frontend implementados.

## Importante
- En esta iteracion **no se agregaron columnas/tablas nuevas** en la base de datos.
- La configuracion SAR por sucursal se guarda en archivo: `backend/App_Data/facturacion_sar.json`.

## Archivos
- `2026-04-14_predeploy_checks.sql`: validaciones rapidas antes de publicar.
- `2026-04-14_postdeploy_checks.sql`: validaciones rapidas despues de publicar.
- `2026-04-14_cuadre_y_estado_cuenta.sql`: consultas utiles de auditoria.

## Recomendacion
Ejecutar primero `predeploy`, luego desplegar API+frontend, y por ultimo `postdeploy`.
