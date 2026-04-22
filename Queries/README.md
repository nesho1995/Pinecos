# Queries de despliegue y verificacion (actualizado 2026-04-22)

Este paquete acompana los cambios de backend/frontend implementados.

## Importante
- En esta iteracion se incluye un hotfix de esquema para cierre de caja:
  - `ALTER TABLE cajas MODIFY observacion LONGTEXT NULL;`
- La configuracion SAR por sucursal se guarda en archivo: `backend/App_Data/facturacion_sar.json`.
- Desde 2026-04-22 se agrega auditoria fiscal en BD para correlativos CAI y seguimiento operativo (revision/comentario).

## Archivos
- `2026-04-14_predeploy_checks.sql`: validaciones rapidas antes de publicar.
- `2026-04-14_postdeploy_checks.sql`: validaciones rapidas despues de publicar.
- `2026-04-14_cuadre_y_estado_cuenta.sql`: consultas utiles de auditoria.
- `2026-04-14_schema_hotfix_observacion_caja.sql`: hotfix para permitir JSON largo en cierre de caja.
- `2026-04-17_inventario_proveedores.sql`: crea estructura inicial de proveedores, inventario, movimientos y compras.
- `2026-04-17_recetas_consumo_automatico.sql`: crea estructura de recetas por producto/sucursal para consumo automatico.
- `2026-04-17_reportes_performance_indexes.sql`: agrega indices para acelerar reportes (ventas, gastos, cajas, movimientos, detalle_venta).
- `2026-04-22_fiscal_por_linea_cai.sql`: columnas fiscales por linea para ventas y cuentas de mesa.
- `2026-04-22_ventas_observacion_longtext.sql`: ajusta longitud de observacion en ventas para metadatos extensos.
- `2026-04-22_facturacion_sar_correlativo_eventos.sql`: crea bitacora fiscal de correlativos (`RESERVADO/EMITIDO/FALLIDO`) y campos de revision.
- `2026-04-22_facturacion_sar_correlativo_eventos_revision_columns.sql`: solo para instancias donde la tabla de eventos ya existia sin campos de revision.
- `2026-04-22_indices_rendimiento_reportes_caja.sql`: indices adicionales para reportes avanzados, caja y movimientos.

## Recomendacion de orden (upgrade completo)
### Fase 0 - Pre chequeo
1. `2026-04-14_predeploy_checks.sql`

### Fase 1 - Estructura base y hotfixes
2. `2026-04-14_schema_hotfix_observacion_caja.sql`
3. `2026-04-17_inventario_proveedores.sql`
4. `2026-04-17_recetas_consumo_automatico.sql`
5. `2026-04-22_fiscal_por_linea_cai.sql`
6. `2026-04-22_ventas_observacion_longtext.sql`

### Fase 2 - Flujo fiscal y auditoria
7. `2026-04-22_facturacion_sar_correlativo_eventos.sql`
8. `2026-04-22_facturacion_sar_correlativo_eventos_revision_columns.sql` (solo para ambientes que ya tenian la tabla previa)

### Fase 3 - Rendimiento
9. `2026-04-17_reportes_performance_indexes.sql`
10. `2026-04-22_indices_rendimiento_reportes_caja.sql`

### Fase 4 - Despliegue aplicacion y post chequeo
11. Desplegar API + frontend
12. `2026-04-14_postdeploy_checks.sql`

## Idempotencia de scripts (2026-04-22)
- `2026-04-22_facturacion_sar_correlativo_eventos_revision_columns.sql` ya incluye validaciones por `information_schema` para no fallar en re-ejecucion.
- `2026-04-22_indices_rendimiento_reportes_caja.sql` ya incluye validaciones por `information_schema` para no fallar si el indice existe.

## Validacion rapida post despliegue
- Abrir `Configuracion > SAR / CAI` y confirmar:
  - panel operativo con pendientes/revisados,
  - bitacora filtrable y paginada,
  - revision individual/masiva/seleccion.
- Verificar `Movimientos de caja`:
  - filtros por fecha/tipo,
  - paginacion,
  - resumen ingresos/egresos.
- Verificar `Reportes`:
  - carga por bloque (core + pestaña activa),
  - tab `Caja avanzado`,
  - exportaciones CSV.
