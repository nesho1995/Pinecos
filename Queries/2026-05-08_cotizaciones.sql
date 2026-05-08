-- Modulo Cotizaciones: aditivo, no toca ventas/caja/inventario/fiscal.

SET @db_name := DATABASE();
SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'configuracion_negocio'
    AND COLUMN_NAME = 'correo_negocio'
);

SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE configuracion_negocio ADD COLUMN correo_negocio VARCHAR(255) NOT NULL DEFAULT '''' AFTER rtn',
  'SELECT ''correo_negocio ya existe'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS cotizaciones (
  id_cotizacion INT NOT NULL AUTO_INCREMENT,
  numero VARCHAR(30) NOT NULL,
  fecha DATETIME NOT NULL,
  id_sucursal INT NULL,
  id_usuario INT NOT NULL,
  cliente_nombre VARCHAR(180) NOT NULL,
  cliente_rtn VARCHAR(30) NOT NULL DEFAULT '',
  cliente_direccion VARCHAR(255) NOT NULL DEFAULT '',
  cliente_telefono VARCHAR(50) NOT NULL DEFAULT '',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  descuento DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  impuesto DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  estado VARCHAR(20) NOT NULL DEFAULT 'EMITIDA',
  observacion TEXT NULL,
  fecha_creacion DATETIME NOT NULL,
  fecha_actualizacion DATETIME NULL,
  fecha_anulacion DATETIME NULL,
  id_usuario_anulacion INT NULL,
  motivo_anulacion VARCHAR(255) NOT NULL DEFAULT '',
  PRIMARY KEY (id_cotizacion),
  UNIQUE KEY ux_cotizaciones_numero (numero),
  KEY ix_cotizaciones_fecha (fecha),
  KEY ix_cotizaciones_estado (estado),
  KEY ix_cotizaciones_sucursal_fecha (id_sucursal, fecha),
  KEY ix_cotizaciones_usuario (id_usuario),
  CONSTRAINT fk_cotizaciones_sucursal FOREIGN KEY (id_sucursal) REFERENCES sucursales(id_sucursal),
  CONSTRAINT fk_cotizaciones_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cotizacion_detalle (
  id_cotizacion_detalle INT NOT NULL AUTO_INCREMENT,
  id_cotizacion INT NOT NULL,
  id_producto INT NULL,
  id_presentacion INT NULL,
  descripcion VARCHAR(255) NOT NULL,
  cantidad DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  precio_unitario DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  orden INT NOT NULL DEFAULT 1,
  PRIMARY KEY (id_cotizacion_detalle),
  KEY ix_cotizacion_detalle_cotizacion (id_cotizacion),
  KEY ix_cotizacion_detalle_producto (id_producto),
  CONSTRAINT fk_cotizacion_detalle_cotizacion FOREIGN KEY (id_cotizacion) REFERENCES cotizaciones(id_cotizacion) ON DELETE CASCADE,
  CONSTRAINT fk_cotizacion_detalle_producto FOREIGN KEY (id_producto) REFERENCES productos(id_producto),
  CONSTRAINT fk_cotizacion_detalle_presentacion FOREIGN KEY (id_presentacion) REFERENCES presentaciones(id_presentacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
