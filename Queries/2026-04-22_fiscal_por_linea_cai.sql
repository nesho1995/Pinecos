-- Fiscalidad por linea para CAI
-- Ejecutar en MySQL 8+

ALTER TABLE productos
  ADD COLUMN tipo_fiscal VARCHAR(20) NULL AFTER costo;

ALTER TABLE detalle_venta
  ADD COLUMN tipo_fiscal_linea VARCHAR(20) NULL AFTER subtotal;

ALTER TABLE detalle_cuenta_mesa
  ADD COLUMN tipo_fiscal_linea VARCHAR(20) NULL AFTER subtotal;

-- Inicializa catalogo para nuevas capturas
UPDATE productos
SET tipo_fiscal = 'GRAVADO_15'
WHERE tipo_fiscal IS NULL OR TRIM(tipo_fiscal) = '';

-- Normaliza valores invalidos en catalogo
UPDATE productos
SET tipo_fiscal = 'GRAVADO_15'
WHERE UPPER(TRIM(tipo_fiscal)) NOT IN ('GRAVADO_15', 'GRAVADO_18', 'EXENTO', 'EXONERADO');

-- Opcional: para exigir siempre valor en catalogo (descomentar cuando todas las instancias esten migradas)
-- ALTER TABLE productos
--   MODIFY COLUMN tipo_fiscal VARCHAR(20) NOT NULL DEFAULT 'GRAVADO_15';

