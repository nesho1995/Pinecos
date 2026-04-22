-- Columnas de seguimiento operativo para eventos fiscales
-- Ejecutar solo si la tabla ya existe de una version previa sin estas columnas

SET @schema_name = DATABASE();

SET @sql_stmt = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = @schema_name
        AND table_name = 'facturacion_sar_correlativo_eventos'
        AND column_name = 'revisado'
    ),
    'SELECT ''column revisado already exists''',
    'ALTER TABLE facturacion_sar_correlativo_eventos ADD COLUMN revisado TINYINT(1) NOT NULL DEFAULT 0 AFTER motivo_fallo'
  )
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = @schema_name
        AND table_name = 'facturacion_sar_correlativo_eventos'
        AND column_name = 'comentario_operacion'
    ),
    'SELECT ''column comentario_operacion already exists''',
    'ALTER TABLE facturacion_sar_correlativo_eventos ADD COLUMN comentario_operacion VARCHAR(500) NULL AFTER revisado'
  )
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = @schema_name
        AND table_name = 'facturacion_sar_correlativo_eventos'
        AND column_name = 'id_usuario_revision'
    ),
    'SELECT ''column id_usuario_revision already exists''',
    'ALTER TABLE facturacion_sar_correlativo_eventos ADD COLUMN id_usuario_revision INT NULL AFTER comentario_operacion'
  )
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = @schema_name
        AND table_name = 'facturacion_sar_correlativo_eventos'
        AND column_name = 'fecha_revision'
    ),
    'SELECT ''column fecha_revision already exists''',
    'ALTER TABLE facturacion_sar_correlativo_eventos ADD COLUMN fecha_revision DATETIME NULL AFTER id_usuario_revision'
  )
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = @schema_name
        AND table_name = 'facturacion_sar_correlativo_eventos'
        AND index_name = 'ix_fsc_evento_revisado'
    ),
    'SELECT ''index ix_fsc_evento_revisado already exists''',
    'CREATE INDEX ix_fsc_evento_revisado ON facturacion_sar_correlativo_eventos (revisado)'
  )
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

