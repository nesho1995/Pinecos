-- Reset transaccional/operativo:
-- Elimina historial de ventas, caja y movimientos operativos.
-- Conserva configuraciones, catalogos de producto y usuarios.
--
-- CONSERVA:
-- - usuarios
-- - sucursales
-- - configuracion_negocio
-- - productos, categorias, presentaciones
-- - productos_sucursal, producto_presentacion, producto_presentacion_sucursal
-- - parametros de configuracion SAR (archivo App_Data/facturacion_sar.json)
--
-- LIMPIA:
-- - ventas y detalle
-- - eventos fiscales transaccionales
-- - caja y movimientos
-- - gastos
-- - cuentas de mesa y detalle
-- - compras, inventario operativo y movimientos
-- - bitacora
-- - solicitudes de productos faltantes

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE detalle_venta;
TRUNCATE TABLE ventas;
TRUNCATE TABLE facturacion_sar_correlativo_eventos;

TRUNCATE TABLE detalle_cuenta_mesa;
TRUNCATE TABLE cuentas_mesa;
TRUNCATE TABLE mesas;

TRUNCATE TABLE movimientos_caja;
TRUNCATE TABLE cajas;
TRUNCATE TABLE gastos;

TRUNCATE TABLE compras_proveedor_detalle;
TRUNCATE TABLE compras_proveedor;
TRUNCATE TABLE movimientos_inventario;
TRUNCATE TABLE inventario_items;
TRUNCATE TABLE receta_producto_insumo;

TRUNCATE TABLE bitacora;
TRUNCATE TABLE productos_pendientes;

SET FOREIGN_KEY_CHECKS = 1;
