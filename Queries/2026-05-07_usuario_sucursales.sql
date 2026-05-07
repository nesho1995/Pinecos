-- Tabla de asignacion de multiples sucursales por usuario.
-- Correr antes del deploy. Es aditiva: no modifica tablas existentes.

CREATE TABLE IF NOT EXISTS usuario_sucursales (
    id_usuario_sucursal INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_usuario          INT NOT NULL,
    id_sucursal         INT NOT NULL,
    UNIQUE KEY uq_usuario_sucursal (id_usuario, id_sucursal),
    CONSTRAINT fk_us_usuario   FOREIGN KEY (id_usuario)  REFERENCES usuarios(id_usuario),
    CONSTRAINT fk_us_sucursal  FOREIGN KEY (id_sucursal) REFERENCES sucursales(id_sucursal)
);

-- Migrar asignaciones existentes (id_sucursal en tabla usuarios).
-- Inserta solo los que no sean NULL y que no existan ya en la nueva tabla.
INSERT IGNORE INTO usuario_sucursales (id_usuario, id_sucursal)
SELECT id_usuario, id_sucursal
FROM usuarios
WHERE id_sucursal IS NOT NULL;
