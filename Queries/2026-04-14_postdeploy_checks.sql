-- POSTDEPLOY CHECKS

-- 1) Caja cerrada mas reciente
SELECT id_caja, id_sucursal, fecha_apertura, fecha_cierre, monto_inicial, monto_cierre, estado
FROM cajas
WHERE estado = 'CERRADA'
ORDER BY fecha_cierre DESC
LIMIT 20;

-- 2) Ventas recientes con observacion (para validar metadatos FACTURA/CAI cuando aplique)
SELECT id_venta, id_sucursal, fecha, total, metodo_pago, observacion
FROM ventas
ORDER BY fecha DESC
LIMIT 50;

-- 3) Detalles de venta recientes
SELECT dv.id_venta, dv.id_producto, dv.id_presentacion, dv.cantidad, dv.precio_unitario, dv.costo_unitario, dv.subtotal
FROM detalle_venta dv
JOIN ventas v ON v.id_venta = dv.id_venta
ORDER BY v.fecha DESC
LIMIT 100;

-- 4) Gastos activos recientes
SELECT id_gasto, id_sucursal, fecha, categoria_gasto, monto
FROM gastos
WHERE activo = 1
ORDER BY fecha DESC
LIMIT 50;
