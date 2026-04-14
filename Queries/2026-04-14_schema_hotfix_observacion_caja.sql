-- HOTFIX ESQUEMA: detalle de cierre de caja en JSON puede superar TEXT
-- Ejecutar en cada ambiente donde se despliegue.

ALTER TABLE cajas
MODIFY observacion LONGTEXT NULL;
