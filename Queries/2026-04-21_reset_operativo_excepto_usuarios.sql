-- Reinicio operativo de datos:
-- Conserva unicamente la tabla `usuarios`.
-- ADVERTENCIA: elimina permanentemente datos de operacion.

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE detalle_venta;
TRUNCATE TABLE ventas;
TRUNCATE TABLE movimientos_caja;
TRUNCATE TABLE cajas;
TRUNCATE TABLE gastos;
TRUNCATE TABLE detalle_cuenta_mesa;
TRUNCATE TABLE cuentas_mesa;
TRUNCATE TABLE mesas;
TRUNCATE TABLE producto_presentacion_sucursal;
TRUNCATE TABLE producto_presentacion;
TRUNCATE TABLE productos_sucursal;
TRUNCATE TABLE receta_producto_insumo;
TRUNCATE TABLE compras_proveedor_detalle;
TRUNCATE TABLE compras_proveedor;
TRUNCATE TABLE movimientos_inventario;
TRUNCATE TABLE inventario_items;
TRUNCATE TABLE proveedores;
TRUNCATE TABLE productos;
TRUNCATE TABLE presentaciones;
TRUNCATE TABLE categorias;
TRUNCATE TABLE sucursales;
TRUNCATE TABLE bitacora;
TRUNCATE TABLE configuracion_negocio;

SET FOREIGN_KEY_CHECKS = 1;
