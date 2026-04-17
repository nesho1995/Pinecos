-- 2026-04-17_recetas_consumo_automatico.sql
-- Recetas por producto/sucursal para consumo automatico de inventario en ventas.

CREATE TABLE IF NOT EXISTS receta_producto_insumo (
    id_receta_producto_insumo INT AUTO_INCREMENT PRIMARY KEY,
    id_sucursal INT NOT NULL,
    id_producto INT NOT NULL,
    id_presentacion INT NULL,
    id_inventario_item INT NOT NULL,
    cantidad_insumo DECIMAL(14,3) NOT NULL DEFAULT 0,
    activo TINYINT(1) NOT NULL DEFAULT 1,

    CONSTRAINT fk_receta_sucursal FOREIGN KEY (id_sucursal) REFERENCES sucursales(id_sucursal),
    CONSTRAINT fk_receta_producto FOREIGN KEY (id_producto) REFERENCES productos(id_producto),
    CONSTRAINT fk_receta_presentacion FOREIGN KEY (id_presentacion) REFERENCES presentaciones(id_presentacion),
    CONSTRAINT fk_receta_item FOREIGN KEY (id_inventario_item) REFERENCES inventario_items(id_inventario_item)
);

CREATE INDEX ix_receta_sucursal_producto ON receta_producto_insumo(id_sucursal, id_producto);
CREATE INDEX ix_receta_item ON receta_producto_insumo(id_inventario_item);
