-- CUADRE Y ESTADO DE CUENTA

-- 1) Ventas por caja y metodo
SELECT id_caja, metodo_pago, COUNT(*) AS cantidad, SUM(total) AS total
FROM ventas
WHERE estado = 'ACTIVA'
GROUP BY id_caja, metodo_pago
ORDER BY id_caja DESC, total DESC;

-- 2) Movimientos por caja
SELECT id_caja,
       SUM(CASE WHEN UPPER(tipo) LIKE '%INGRESO%' OR UPPER(tipo) = 'ENTRADA' THEN monto ELSE 0 END) AS ingresos,
       SUM(CASE WHEN UPPER(tipo) LIKE '%EGRESO%' OR UPPER(tipo) = 'SALIDA' THEN monto ELSE 0 END) AS egresos
FROM movimientos_caja
GROUP BY id_caja
ORDER BY id_caja DESC;

-- 3) Gastos por sucursal y fecha
SELECT id_sucursal, DATE(fecha) AS fecha_dia, SUM(monto) AS total_gastos
FROM gastos
WHERE activo = 1
GROUP BY id_sucursal, DATE(fecha)
ORDER BY fecha_dia DESC;

-- 4) Resumen rapido de cajas cerradas
SELECT id_caja, id_sucursal, fecha_apertura, fecha_cierre, monto_inicial, monto_cierre, observacion
FROM cajas
WHERE estado = 'CERRADA'
ORDER BY fecha_cierre DESC;
