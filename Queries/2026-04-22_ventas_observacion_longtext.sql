-- Al emitir factura CAI, la columna ventas.observacion acumula FEXTRA (base64) + metadatos FACTURA/CAI.
-- Si la columna es VARCHAR(255) o similar, MySQL/MariaDB rechaza el INSERT y la API responde 500.
-- Ejecutar en produccion si ves "Data too long for column 'observacion'" (o error interno al cobrar con CAI).

ALTER TABLE ventas
  MODIFY COLUMN observacion LONGTEXT NULL;
