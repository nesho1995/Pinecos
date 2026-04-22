-- Auditoria de correlativos fiscales CAI (reservado, emitido, fallido)
-- Ejecutar en MySQL 8+



CREATE TABLE IF NOT EXISTS facturacion_sar_correlativo_eventos (
  id_facturacion_sar_correlativo_evento BIGINT NOT NULL AUTO_INCREMENT,
  id_sucursal INT NOT NULL,
  numero_factura VARCHAR(25) NOT NULL,
  cai VARCHAR(64) NOT NULL,
  fecha_limite_emision DATE NULL,
  estado VARCHAR(20) NOT NULL,
  origen VARCHAR(30) NOT NULL,
  id_venta INT NULL,
  id_usuario INT NULL,
  motivo_fallo VARCHAR(500) NULL,
  revisado TINYINT(1) NOT NULL DEFAULT 0,
  comentario_operacion VARCHAR(500) NULL,
  id_usuario_revision INT NULL,
  fecha_revision DATETIME NULL,
  fecha_creacion DATETIME NOT NULL,
  fecha_actualizacion DATETIME NULL,
  PRIMARY KEY (id_facturacion_sar_correlativo_evento),
  INDEX ix_fsc_evento_sucursal_fecha (id_sucursal, fecha_creacion),
  INDEX ix_fsc_evento_estado (estado),
  INDEX ix_fsc_evento_numero (numero_factura),
  INDEX ix_fsc_evento_venta (id_venta),
  INDEX ix_fsc_evento_revisado (revisado)
);