-- Anulación de ventas: motivo, referencia fiscal, auditoría (MySQL/MariaDB).
-- Ejecutar antes de usar POST /api/Ventas/anular/{id} con cuerpo extendido.
-- Si la columna ya existe, ignorar el error o usar procedimiento según tu entorno.

ALTER TABLE ventas
  ADD COLUMN fecha_anulacion DATETIME(6) NULL,
  ADD COLUMN id_usuario_anulacion INT NULL,
  ADD COLUMN motivo_anulacion VARCHAR(500) NULL,
  ADD COLUMN referencia_anulacion_fiscal VARCHAR(200) NULL;
