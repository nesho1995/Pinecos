-- PREDEPLOY CHECKS
-- Ajusta esquema BD si usas otro nombre.

-- 1) Caja abierta por sucursal (debe haber maximo una abierta por sucursal)
SELECT id_sucursal, COUNT(*) AS cajas_abiertas
FROM cajas
WHERE estado = 'ABIERTA'
GROUP BY id_sucursal;

-- 2) Ventas activas del dia por metodo
SELECT metodo_pago, COUNT(*) AS cantidad, SUM(total) AS total
FROM ventas
WHERE estado = 'ACTIVA'
  AND fecha >= CURDATE()
  AND fecha < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
GROUP BY metodo_pago
ORDER BY total DESC;

-- 3) Mesas duplicadas por sucursal/nombre (deberia ser 0)
SELECT id_sucursal, nombre, COUNT(*) AS repetidos
FROM mesas
GROUP BY id_sucursal, nombre
HAVING COUNT(*) > 1;

-- 4) Productos activos duplicados por nombre (deberia ser 0)
SELECT LOWER(TRIM(nombre)) AS nombre_norm, COUNT(*) AS repetidos
FROM productos
WHERE activo = 1
GROUP BY LOWER(TRIM(nombre))
HAVING COUNT(*) > 1;
