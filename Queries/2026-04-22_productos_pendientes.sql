-- Flujo operativo: solicitudes de producto faltante creadas por caja y revisadas por administracion.
CREATE TABLE IF NOT EXISTS productos_pendientes (
  id_producto_pendiente INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(120) NOT NULL,
  precio_sugerido DECIMAL(12,2) NOT NULL,
  id_sucursal INT NOT NULL,
  id_usuario_solicita INT NOT NULL,
  nota_solicitud VARCHAR(400) NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  comentario_revision VARCHAR(400) NULL,
  id_usuario_revision INT NULL,
  id_producto_creado INT NULL,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_revision DATETIME NULL,
  PRIMARY KEY (id_producto_pendiente),
  KEY ix_productos_pendientes_estado_fecha (estado, fecha_creacion),
  KEY ix_productos_pendientes_sucursal_estado (id_sucursal, estado),
  KEY ix_productos_pendientes_nombre (nombre),
  CONSTRAINT fk_productos_pendientes_sucursal
    FOREIGN KEY (id_sucursal) REFERENCES sucursales(id_sucursal),
  CONSTRAINT fk_productos_pendientes_usuario_solicita
    FOREIGN KEY (id_usuario_solicita) REFERENCES usuarios(id_usuario),
  CONSTRAINT fk_productos_pendientes_usuario_revision
    FOREIGN KEY (id_usuario_revision) REFERENCES usuarios(id_usuario),
  CONSTRAINT fk_productos_pendientes_producto_creado
    FOREIGN KEY (id_producto_creado) REFERENCES productos(id_producto)
);
