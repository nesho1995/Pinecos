-- Reinicio operativo de datos (conserva sucursales y usuarios)
-- ADVERTENCIA: elimina permanentemente historial y catalogos operativos.
-- Conserva unicamente: `sucursales` y `usuarios`.

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

TRUNCATE TABLE producto_presentacion_sucursal;
TRUNCATE TABLE producto_presentacion;
TRUNCATE TABLE productos_sucursal;
TRUNCATE TABLE productos_pendientes;

TRUNCATE TABLE receta_producto_insumo;
TRUNCATE TABLE compras_proveedor_detalle;
TRUNCATE TABLE compras_proveedor;
TRUNCATE TABLE movimientos_inventario;
TRUNCATE TABLE inventario_items;
TRUNCATE TABLE proveedores;

TRUNCATE TABLE productos;
TRUNCATE TABLE presentaciones;
TRUNCATE TABLE categorias;

TRUNCATE TABLE bitacora;
TRUNCATE TABLE configuracion_negocio;

SET FOREIGN_KEY_CHECKS = 1;
