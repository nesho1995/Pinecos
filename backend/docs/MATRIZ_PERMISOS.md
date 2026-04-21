# Matriz De Permisos (Regla Oficial)

## Regla Base
- La caja es por sucursal y turno, no por usuario.
- Solo puede existir 1 caja abierta por sucursal.
- Cajero solo opera en su propia sucursal (segun token).
- Configuracion y catalogos son solo de ADMIN.

## Pantallas Frontend
| Pantalla | ADMIN | CAJERO |
|---|---|---|
| Dashboard | Si | Si |
| Caja | Si | Si |
| Movimientos de Caja | Si | Si |
| POS Ventas | Si | Si |
| Mesas y Cuentas | Si | Si |
| Gastos | Si | Si (limitado a su sucursal) |
| Reportes | Si | No |
| Gestion de ventas (listado / anular) | Si | No |
| Estado de Cuenta | Si | No |
| Bitacora | Si | No |
| Mesas (Administracion) | Si | No |
| Productos / Categorias / Presentaciones | Si | No |
| Precios por Sucursal | Si | No |
| Sucursales / Usuarios / Configuracion | Si | No |

## API Backend
| Recurso | ADMIN | CAJERO | Notas |
|---|---|---|---|
| `api/Auth/*` | Si | Si | Login con bloqueo por intentos + rate limit |
| `api/Dashboard/*` | Si | Si | Caja actual y resumen filtrados por sucursal para cajero |
| `api/Cajas/abrir` | Si | Si | Abre caja en sucursal del token |
| `api/Cajas/cerrar/{id}` | Si | Si | Cierra caja de su sucursal |
| `api/Cajas/abiertas` | Si | Si | Cajero solo su sucursal |
| `api/Cajas/canales-config` GET | Si | Si | Cajero solo su sucursal |
| `api/Cajas/canales-config` PUT | Si | No | Solo admin configura POS/apps |
| `api/Cajas/cierres` | Si | No | Solo admin |
| `api/Cajas/estado-cuenta/{id}` | Si | No | Solo admin |
| `api/MovimientosCaja/*` | Si | Si | Cajero solo cajas de su sucursal |
| `api/Ventas/*` crear | Si | Si | Venta en caja abierta de su sucursal |
| `api/Ventas` GET (listado) / `anular` POST | Si | No | Solo admin; anular requiere motivo en cuerpo |
| `api/CuentasMesa/*` | Si | Si | Cajero solo su sucursal |
| `api/Mesas/sucursal/{id}` | Si | Si | Cajero restringido a su sucursal |
| `api/Mesas` crear/editar | Si | No | Solo admin |
| `api/Gastos` GET/POST | Si | Si | Cajero ve/crea solo sus gastos en su sucursal |
| `api/Gastos/{id}` DELETE | Si | No | Solo admin |
| `api/Reportes/*` | Si | No | Solo admin |
| `api/Bitacora/*` | Si | No | Solo admin |
| `api/FacturacionSar/*` PUT/lista | Si | No | Solo admin |
| `api/AjustesVenta` PUT | Si | No | Solo admin |
| `api/Menu/*` | Si | No | Solo admin |
| `api/Productos/*` | Si | No | Solo admin |
| `api/Categorias/*` | Si | No | Solo admin |
| `api/Presentaciones/*` | Si | No | Solo admin |
| `api/Sucursales/*` | Si | No | Solo admin |
| `api/Usuarios/*` | Si | No | Solo admin |

## Criterios De Auditoria
- Si un endpoint cambia datos de catalogo/configuracion: debe ser ADMIN.
- Si un endpoint opera caja/ventas/mesas/gastos: puede ser CAJERO, pero siempre filtrado por sucursal del token.
- Ninguna validacion de seguridad depende solo del frontend; todo se valida en backend.
