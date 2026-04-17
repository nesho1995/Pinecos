-- Optimizacion de reportes para produccion (MySQL 8+)
-- Fecha: 2026-04-17
-- Objetivo: mejorar filtros por sucursal/fecha/estado y joins mas usados en reportes.

SET NAMES utf8mb4;

-- Helper para crear index solo si no existe
DROP PROCEDURE IF EXISTS sp_add_index_if_missing;
DELIMITER $$
CREATE PROCEDURE sp_add_index_if_missing(
    IN p_table_name VARCHAR(128),
    IN p_index_name VARCHAR(128),
    IN p_sql TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = p_table_name
          AND index_name = p_index_name
    ) THEN
        SET @sql_stmt = p_sql;
        PREPARE s1 FROM @sql_stmt;
        EXECUTE s1;
        DEALLOCATE PREPARE s1;
    END IF;
END $$
DELIMITER ;

CALL sp_add_index_if_missing(
  'ventas',
  'idx_ventas_estado_fecha_sucursal',
  'CREATE INDEX idx_ventas_estado_fecha_sucursal ON ventas (estado, fecha, id_sucursal)'
);

CALL sp_add_index_if_missing(
  'ventas',
  'idx_ventas_fecha_sucursal',
  'CREATE INDEX idx_ventas_fecha_sucursal ON ventas (fecha, id_sucursal)'
);

CALL sp_add_index_if_missing(
  'detalle_venta',
  'idx_detalle_venta_id_venta',
  'CREATE INDEX idx_detalle_venta_id_venta ON detalle_venta (id_venta)'
);

CALL sp_add_index_if_missing(
  'detalle_venta',
  'idx_detalle_venta_id_producto',
  'CREATE INDEX idx_detalle_venta_id_producto ON detalle_venta (id_producto)'
);

CALL sp_add_index_if_missing(
  'gastos',
  'idx_gastos_activo_fecha_sucursal',
  'CREATE INDEX idx_gastos_activo_fecha_sucursal ON gastos (activo, fecha, id_sucursal)'
);

CALL sp_add_index_if_missing(
  'cajas',
  'idx_cajas_fecha_apertura_sucursal_estado',
  'CREATE INDEX idx_cajas_fecha_apertura_sucursal_estado ON cajas (fecha_apertura, id_sucursal, estado)'
);

CALL sp_add_index_if_missing(
  'movimientos_caja',
  'idx_movimientos_caja_fecha_idcaja',
  'CREATE INDEX idx_movimientos_caja_fecha_idcaja ON movimientos_caja (fecha, id_caja)'
);

-- Limpieza helper
DROP PROCEDURE IF EXISTS sp_add_index_if_missing;

