-- Indices recomendados para acelerar reportes, caja y movimientos
-- MySQL 8+
SET @schema_name = DATABASE();

-- Ventas: filtros frecuentes por estado/fecha/sucursal
SET @sql_stmt = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = @schema_name
        AND table_name = 'ventas'
        AND index_name = 'ix_ventas_estado_fecha_sucursal'
    ),
    'SELECT ''index ix_ventas_estado_fecha_sucursal already exists''',
    'CREATE INDEX ix_ventas_estado_fecha_sucursal ON ventas (estado, fecha, id_sucursal)'
  )
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ventas: apoyo para joins por caja y fecha
SET @sql_stmt = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = @schema_name
        AND table_name = 'ventas'
        AND index_name = 'ix_ventas_caja_fecha'
    ),
    'SELECT ''index ix_ventas_caja_fecha already exists''',
    'CREATE INDEX ix_ventas_caja_fecha ON ventas (id_caja, fecha)'
  )
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Detalle venta: joins por id_venta e id_producto
SET @sql_stmt = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = @schema_name
        AND table_name = 'detalle_venta'
        AND index_name = 'ix_detalle_venta_venta_producto'
    ),
    'SELECT ''index ix_detalle_venta_venta_producto already exists''',
    'CREATE INDEX ix_detalle_venta_venta_producto ON detalle_venta (id_venta, id_producto)'
  )
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Gastos: filtros por activo/fecha/sucursal y agrupaciones por categoria
SET @sql_stmt = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = @schema_name
        AND table_name = 'gastos'
        AND index_name = 'ix_gastos_activo_fecha_sucursal'
    ),
    'SELECT ''index ix_gastos_activo_fecha_sucursal already exists''',
    'CREATE INDEX ix_gastos_activo_fecha_sucursal ON gastos (activo, fecha, id_sucursal)'
  )
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = @schema_name
        AND table_name = 'gastos'
        AND index_name = 'ix_gastos_categoria_fecha'
    ),
    'SELECT ''index ix_gastos_categoria_fecha already exists''',
    'CREATE INDEX ix_gastos_categoria_fecha ON gastos (categoria_gasto, fecha)'
  )
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Cajas: filtros por estado/sucursal y apertura
SET @sql_stmt = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = @schema_name
        AND table_name = 'cajas'
        AND index_name = 'ix_cajas_estado_sucursal_apertura'
    ),
    'SELECT ''index ix_cajas_estado_sucursal_apertura already exists''',
    'CREATE INDEX ix_cajas_estado_sucursal_apertura ON cajas (estado, id_sucursal, fecha_apertura)'
  )
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Movimientos de caja: consultas por caja/rango/tipo
SET @sql_stmt = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = @schema_name
        AND table_name = 'movimientos_caja'
        AND index_name = 'ix_movimientos_caja_idcaja_fecha'
    ),
    'SELECT ''index ix_movimientos_caja_idcaja_fecha already exists''',
    'CREATE INDEX ix_movimientos_caja_idcaja_fecha ON movimientos_caja (id_caja, fecha)'
  )
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = @schema_name
        AND table_name = 'movimientos_caja'
        AND index_name = 'ix_movimientos_caja_tipo_fecha'
    ),
    'SELECT ''index ix_movimientos_caja_tipo_fecha already exists''',
    'CREATE INDEX ix_movimientos_caja_tipo_fecha ON movimientos_caja (tipo, fecha)'
  )
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

