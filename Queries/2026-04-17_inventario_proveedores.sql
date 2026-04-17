-- Inventario + Proveedores (Fase 1)
-- Fecha: 2026-04-17
-- Motor esperado: MySQL 8+

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS proveedores (
  id_proveedor INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  rtn VARCHAR(30) NULL,
  telefono VARCHAR(40) NULL,
  email VARCHAR(120) NULL,
  contacto VARCHAR(120) NULL,
  direccion VARCHAR(250) NULL,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  activo BIT(1) NOT NULL DEFAULT b'1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS inventario_items (
  id_inventario_item INT AUTO_INCREMENT PRIMARY KEY,
  id_sucursal INT NOT NULL,
  codigo VARCHAR(40) NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  unidad_medida VARCHAR(30) NOT NULL,
  stock_inicial DECIMAL(18,3) NOT NULL DEFAULT 0,
  stock_minimo DECIMAL(18,3) NOT NULL DEFAULT 0,
  costo_referencia DECIMAL(18,2) NOT NULL DEFAULT 0,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  activo BIT(1) NOT NULL DEFAULT b'1',
  CONSTRAINT fk_inventario_items_sucursal FOREIGN KEY (id_sucursal) REFERENCES sucursales(id_sucursal),
  INDEX idx_inventario_items_sucursal (id_sucursal),
  INDEX idx_inventario_items_codigo (codigo),
  INDEX idx_inventario_items_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id_movimiento_inventario INT AUTO_INCREMENT PRIMARY KEY,
  id_inventario_item INT NOT NULL,
  id_sucursal INT NOT NULL,
  id_usuario INT NOT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tipo VARCHAR(30) NOT NULL,
  cantidad DECIMAL(18,3) NOT NULL,
  costo_unitario DECIMAL(18,2) NOT NULL DEFAULT 0,
  referencia VARCHAR(120) NULL,
  observacion LONGTEXT NULL,
  CONSTRAINT fk_mov_inv_item FOREIGN KEY (id_inventario_item) REFERENCES inventario_items(id_inventario_item),
  CONSTRAINT fk_mov_inv_sucursal FOREIGN KEY (id_sucursal) REFERENCES sucursales(id_sucursal),
  CONSTRAINT fk_mov_inv_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
  INDEX idx_mov_inv_fecha (fecha),
  INDEX idx_mov_inv_item (id_inventario_item),
  INDEX idx_mov_inv_sucursal (id_sucursal),
  INDEX idx_mov_inv_tipo (tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS compras_proveedor (
  id_compra_proveedor INT AUTO_INCREMENT PRIMARY KEY,
  id_proveedor INT NOT NULL,
  id_sucursal INT NOT NULL,
  id_usuario INT NOT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total DECIMAL(18,2) NOT NULL DEFAULT 0,
  estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVA',
  observacion LONGTEXT NULL,
  CONSTRAINT fk_compra_prov_proveedor FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor),
  CONSTRAINT fk_compra_prov_sucursal FOREIGN KEY (id_sucursal) REFERENCES sucursales(id_sucursal),
  CONSTRAINT fk_compra_prov_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
  INDEX idx_compra_prov_fecha (fecha),
  INDEX idx_compra_prov_sucursal (id_sucursal),
  INDEX idx_compra_prov_proveedor (id_proveedor)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS compras_proveedor_detalle (
  id_compra_proveedor_detalle INT AUTO_INCREMENT PRIMARY KEY,
  id_compra_proveedor INT NOT NULL,
  id_inventario_item INT NOT NULL,
  cantidad DECIMAL(18,3) NOT NULL,
  costo_unitario DECIMAL(18,2) NOT NULL,
  subtotal DECIMAL(18,2) NOT NULL,
  CONSTRAINT fk_compra_prov_det_compra FOREIGN KEY (id_compra_proveedor) REFERENCES compras_proveedor(id_compra_proveedor),
  CONSTRAINT fk_compra_prov_det_item FOREIGN KEY (id_inventario_item) REFERENCES inventario_items(id_inventario_item),
  INDEX idx_compra_prov_det_compra (id_compra_proveedor),
  INDEX idx_compra_prov_det_item (id_inventario_item)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
