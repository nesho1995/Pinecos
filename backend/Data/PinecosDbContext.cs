using Microsoft.EntityFrameworkCore;
using Pinecos.Models;

namespace Pinecos.Data
{
    public class PinecosDbContext : DbContext
    {
        public PinecosDbContext(DbContextOptions<PinecosDbContext> options) : base(options)
        {
        }

        public DbSet<Usuario> Usuarios { get; set; }
        public DbSet<Categoria> Categorias { get; set; }
        public DbSet<Producto> Productos { get; set; }
        public DbSet<Sucursal> Sucursales { get; set; }
        public DbSet<Presentacion> Presentaciones { get; set; }
        public DbSet<ProductoPresentacion> ProductoPresentaciones { get; set; }
        public DbSet<ProductoSucursal> ProductosSucursal { get; set; }
        public DbSet<ProductoPresentacionSucursal> ProductoPresentacionSucursales { get; set; }
        public DbSet<Caja> Cajas { get; set; }
        public DbSet<MovimientoCaja> MovimientosCaja { get; set; }
        public DbSet<Venta> Ventas { get; set; }
        public DbSet<DetalleVenta> DetalleVenta { get; set; }
        public DbSet<Gasto> Gastos { get; set; }
        public DbSet<Bitacora> Bitacora { get; set; }
        public DbSet<ConfiguracionNegocio> ConfiguracionNegocio { get; set; }
        public DbSet<Mesa> Mesas { get; set; }
        public DbSet<CuentaMesa> CuentasMesa { get; set; }
        public DbSet<DetalleCuentaMesa> DetalleCuentaMesa { get; set; }
        public DbSet<Proveedor> Proveedores { get; set; }
        public DbSet<InventarioItem> InventarioItems { get; set; }
        public DbSet<MovimientoInventario> MovimientosInventario { get; set; }
        public DbSet<CompraProveedor> ComprasProveedor { get; set; }
        public DbSet<CompraProveedorDetalle> ComprasProveedorDetalle { get; set; }
        public DbSet<RecetaProductoInsumo> RecetasProductoInsumo { get; set; }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Usuario>().ToTable("usuarios");
            modelBuilder.Entity<Categoria>().ToTable("categorias");
            modelBuilder.Entity<Producto>().ToTable("productos");
            modelBuilder.Entity<Sucursal>().ToTable("sucursales");
            modelBuilder.Entity<Presentacion>().ToTable("presentaciones");
            modelBuilder.Entity<ProductoPresentacion>().ToTable("producto_presentacion");
            modelBuilder.Entity<ProductoSucursal>().ToTable("productos_sucursal");
            modelBuilder.Entity<ProductoPresentacionSucursal>().ToTable("producto_presentacion_sucursal");
            modelBuilder.Entity<Caja>().ToTable("cajas");
            modelBuilder.Entity<MovimientoCaja>().ToTable("movimientos_caja");
            modelBuilder.Entity<Venta>().ToTable("ventas");
            modelBuilder.Entity<DetalleVenta>().ToTable("detalle_venta");
            modelBuilder.Entity<Gasto>().ToTable("gastos");
            modelBuilder.Entity<Bitacora>().ToTable("bitacora");
            modelBuilder.Entity<ConfiguracionNegocio>().ToTable("configuracion_negocio");
            modelBuilder.Entity<Proveedor>().ToTable("proveedores");
            modelBuilder.Entity<InventarioItem>().ToTable("inventario_items");
            modelBuilder.Entity<MovimientoInventario>().ToTable("movimientos_inventario");
            modelBuilder.Entity<CompraProveedor>().ToTable("compras_proveedor");
            modelBuilder.Entity<CompraProveedorDetalle>().ToTable("compras_proveedor_detalle");
            modelBuilder.Entity<RecetaProductoInsumo>().ToTable("receta_producto_insumo");

            modelBuilder.Entity<Usuario>().HasKey(x => x.Id_Usuario);
            modelBuilder.Entity<Categoria>().HasKey(x => x.Id_Categoria);
            modelBuilder.Entity<Producto>().HasKey(x => x.Id_Producto);
            modelBuilder.Entity<Sucursal>().HasKey(x => x.Id_Sucursal);
            modelBuilder.Entity<Presentacion>().HasKey(x => x.Id_Presentacion);
            modelBuilder.Entity<ProductoPresentacion>().HasKey(x => x.Id_Producto_Presentacion);
            modelBuilder.Entity<ProductoSucursal>().HasKey(x => x.Id_Producto_Sucursal);
            modelBuilder.Entity<ProductoPresentacionSucursal>().HasKey(x => x.Id_Producto_Presentacion_Sucursal);
            modelBuilder.Entity<Caja>().HasKey(x => x.Id_Caja);
            modelBuilder.Entity<MovimientoCaja>().HasKey(x => x.Id_Movimiento_Caja);
            modelBuilder.Entity<Venta>().HasKey(x => x.Id_Venta);
            modelBuilder.Entity<DetalleVenta>().HasKey(x => x.Id_Detalle_Venta);
            modelBuilder.Entity<Gasto>().HasKey(x => x.Id_Gasto);
            modelBuilder.Entity<Bitacora>().HasKey(x => x.Id_Bitacora);
            modelBuilder.Entity<ConfiguracionNegocio>().HasKey(x => x.Id_Configuracion);
            modelBuilder.Entity<Proveedor>().HasKey(x => x.Id_Proveedor);
            modelBuilder.Entity<InventarioItem>().HasKey(x => x.Id_Inventario_Item);
            modelBuilder.Entity<MovimientoInventario>().HasKey(x => x.Id_Movimiento_Inventario);
            modelBuilder.Entity<CompraProveedor>().HasKey(x => x.Id_Compra_Proveedor);
            modelBuilder.Entity<CompraProveedorDetalle>().HasKey(x => x.Id_Compra_Proveedor_Detalle);
            modelBuilder.Entity<RecetaProductoInsumo>().HasKey(x => x.Id_Receta_Producto_Insumo);

            modelBuilder.Entity<Usuario>().Property(x => x.Id_Usuario).HasColumnName("id_usuario");
            modelBuilder.Entity<Usuario>().Property(x => x.Nombre).HasColumnName("nombre");
            modelBuilder.Entity<Usuario>().Property(x => x.UsuarioLogin).HasColumnName("usuario");
            modelBuilder.Entity<Usuario>().Property(x => x.Clave).HasColumnName("clave");
            modelBuilder.Entity<Usuario>().Property(x => x.Rol).HasColumnName("rol");
            modelBuilder.Entity<Usuario>().Property(x => x.Id_Sucursal).HasColumnName("id_sucursal");
            modelBuilder.Entity<Usuario>().Property(x => x.Activo).HasColumnName("activo");

            modelBuilder.Entity<Categoria>().Property(x => x.Id_Categoria).HasColumnName("id_categoria");
            modelBuilder.Entity<Categoria>().Property(x => x.Nombre).HasColumnName("nombre");

            modelBuilder.Entity<Producto>().Property(x => x.Id_Producto).HasColumnName("id_producto");
            modelBuilder.Entity<Producto>().Property(x => x.Nombre).HasColumnName("nombre");
            modelBuilder.Entity<Producto>().Property(x => x.Id_Categoria).HasColumnName("id_categoria");
            modelBuilder.Entity<Producto>().Property(x => x.Costo).HasColumnName("costo");
            modelBuilder.Entity<Producto>().Property(x => x.Activo).HasColumnName("activo");

            modelBuilder.Entity<Sucursal>().Property(x => x.Id_Sucursal).HasColumnName("id_sucursal");
            modelBuilder.Entity<Sucursal>().Property(x => x.Nombre).HasColumnName("nombre");
            modelBuilder.Entity<Sucursal>().Property(x => x.Direccion).HasColumnName("direccion");
            modelBuilder.Entity<Sucursal>().Property(x => x.Telefono).HasColumnName("telefono");
            modelBuilder.Entity<Sucursal>().Property(x => x.Activo).HasColumnName("activo");

            modelBuilder.Entity<Presentacion>().Property(x => x.Id_Presentacion).HasColumnName("id_presentacion");
            modelBuilder.Entity<Presentacion>().Property(x => x.Nombre).HasColumnName("nombre");
            modelBuilder.Entity<Presentacion>().Property(x => x.Onzas).HasColumnName("onzas");

            modelBuilder.Entity<ProductoPresentacion>().Property(x => x.Id_Producto_Presentacion).HasColumnName("id_producto_presentacion");
            modelBuilder.Entity<ProductoPresentacion>().Property(x => x.Id_Producto).HasColumnName("id_producto");
            modelBuilder.Entity<ProductoPresentacion>().Property(x => x.Id_Presentacion).HasColumnName("id_presentacion");

            modelBuilder.Entity<ProductoSucursal>().Property(x => x.Id_Producto_Sucursal).HasColumnName("id_producto_sucursal");
            modelBuilder.Entity<ProductoSucursal>().Property(x => x.Id_Producto).HasColumnName("id_producto");
            modelBuilder.Entity<ProductoSucursal>().Property(x => x.Id_Sucursal).HasColumnName("id_sucursal");
            modelBuilder.Entity<ProductoSucursal>().Property(x => x.Precio).HasColumnName("precio");
            modelBuilder.Entity<ProductoSucursal>().Property(x => x.Activo).HasColumnName("activo");

            modelBuilder.Entity<ProductoPresentacionSucursal>().Property(x => x.Id_Producto_Presentacion_Sucursal).HasColumnName("id_producto_presentacion_sucursal");
            modelBuilder.Entity<ProductoPresentacionSucursal>().Property(x => x.Id_Producto_Presentacion).HasColumnName("id_producto_presentacion");
            modelBuilder.Entity<ProductoPresentacionSucursal>().Property(x => x.Id_Sucursal).HasColumnName("id_sucursal");
            modelBuilder.Entity<ProductoPresentacionSucursal>().Property(x => x.Precio).HasColumnName("precio");
            modelBuilder.Entity<ProductoPresentacionSucursal>().Property(x => x.Activo).HasColumnName("activo");

            modelBuilder.Entity<Caja>().Property(x => x.Id_Caja).HasColumnName("id_caja");
            modelBuilder.Entity<Caja>().Property(x => x.Id_Sucursal).HasColumnName("id_sucursal");
            modelBuilder.Entity<Caja>().Property(x => x.Id_Usuario_Apertura).HasColumnName("id_usuario_apertura");
            modelBuilder.Entity<Caja>().Property(x => x.Fecha_Apertura).HasColumnName("fecha_apertura");
            modelBuilder.Entity<Caja>().Property(x => x.Monto_Inicial).HasColumnName("monto_inicial");
            modelBuilder.Entity<Caja>().Property(x => x.Estado).HasColumnName("estado");
            modelBuilder.Entity<Caja>().Property(x => x.Id_Usuario_Cierre).HasColumnName("id_usuario_cierre");
            modelBuilder.Entity<Caja>().Property(x => x.Fecha_Cierre).HasColumnName("fecha_cierre");
            modelBuilder.Entity<Caja>().Property(x => x.Monto_Cierre).HasColumnName("monto_cierre");
            modelBuilder.Entity<Caja>().Property(x => x.Observacion).HasColumnName("observacion");

            modelBuilder.Entity<MovimientoCaja>().Property(x => x.Id_Movimiento_Caja).HasColumnName("id_movimiento_caja");
            modelBuilder.Entity<MovimientoCaja>().Property(x => x.Id_Caja).HasColumnName("id_caja");
            modelBuilder.Entity<MovimientoCaja>().Property(x => x.Fecha).HasColumnName("fecha");
            modelBuilder.Entity<MovimientoCaja>().Property(x => x.Tipo).HasColumnName("tipo");
            modelBuilder.Entity<MovimientoCaja>().Property(x => x.Descripcion).HasColumnName("descripcion");
            modelBuilder.Entity<MovimientoCaja>().Property(x => x.Monto).HasColumnName("monto");
            modelBuilder.Entity<MovimientoCaja>().Property(x => x.Id_Usuario).HasColumnName("id_usuario");

            modelBuilder.Entity<Venta>().Property(x => x.Id_Venta).HasColumnName("id_venta");
            modelBuilder.Entity<Venta>().Property(x => x.Id_Caja).HasColumnName("id_caja");
            modelBuilder.Entity<Venta>().Property(x => x.Id_Sucursal).HasColumnName("id_sucursal");
            modelBuilder.Entity<Venta>().Property(x => x.Id_Usuario).HasColumnName("id_usuario");
            modelBuilder.Entity<Venta>().Property(x => x.Fecha).HasColumnName("fecha");
            modelBuilder.Entity<Venta>().Property(x => x.Subtotal).HasColumnName("subtotal");
            modelBuilder.Entity<Venta>().Property(x => x.Descuento).HasColumnName("descuento");
            modelBuilder.Entity<Venta>().Property(x => x.Impuesto).HasColumnName("impuesto");
            modelBuilder.Entity<Venta>().Property(x => x.Total).HasColumnName("total");
            modelBuilder.Entity<Venta>().Property(x => x.Metodo_Pago).HasColumnName("metodo_pago");
            modelBuilder.Entity<Venta>().Property(x => x.Observacion).HasColumnName("observacion");
            modelBuilder.Entity<Venta>().Property(x => x.Estado).HasColumnName("estado");

            modelBuilder.Entity<DetalleVenta>().Property(x => x.Id_Detalle_Venta).HasColumnName("id_detalle_venta");
            modelBuilder.Entity<DetalleVenta>().Property(x => x.Id_Venta).HasColumnName("id_venta");
            modelBuilder.Entity<DetalleVenta>().Property(x => x.Id_Producto).HasColumnName("id_producto");
            modelBuilder.Entity<DetalleVenta>().Property(x => x.Id_Presentacion).HasColumnName("id_presentacion");
            modelBuilder.Entity<DetalleVenta>().Property(x => x.Cantidad).HasColumnName("cantidad");
            modelBuilder.Entity<DetalleVenta>().Property(x => x.Precio_Unitario).HasColumnName("precio_unitario");
            modelBuilder.Entity<DetalleVenta>().Property(x => x.Costo_Unitario).HasColumnName("costo_unitario");
            modelBuilder.Entity<DetalleVenta>().Property(x => x.Subtotal).HasColumnName("subtotal");
            modelBuilder.Entity<DetalleVenta>().Property(x => x.Observacion).HasColumnName("observacion");

            modelBuilder.Entity<Gasto>().Property(x => x.Id_Gasto).HasColumnName("id_gasto");
            modelBuilder.Entity<Gasto>().Property(x => x.Id_Sucursal).HasColumnName("id_sucursal");
            modelBuilder.Entity<Gasto>().Property(x => x.Id_Usuario).HasColumnName("id_usuario");
            modelBuilder.Entity<Gasto>().Property(x => x.Fecha).HasColumnName("fecha");
            modelBuilder.Entity<Gasto>().Property(x => x.Categoria_Gasto).HasColumnName("categoria_gasto");
            modelBuilder.Entity<Gasto>().Property(x => x.Descripcion).HasColumnName("descripcion");
            modelBuilder.Entity<Gasto>().Property(x => x.Monto).HasColumnName("monto");
            modelBuilder.Entity<Gasto>().Property(x => x.Activo).HasColumnName("activo");

            modelBuilder.Entity<Bitacora>().Property(x => x.Id_Bitacora).HasColumnName("id_bitacora");
            modelBuilder.Entity<Bitacora>().Property(x => x.Fecha).HasColumnName("fecha");
            modelBuilder.Entity<Bitacora>().Property(x => x.Id_Usuario).HasColumnName("id_usuario");
            modelBuilder.Entity<Bitacora>().Property(x => x.Modulo).HasColumnName("modulo");
            modelBuilder.Entity<Bitacora>().Property(x => x.Accion).HasColumnName("accion");
            modelBuilder.Entity<Bitacora>().Property(x => x.Detalle).HasColumnName("detalle");

            modelBuilder.Entity<ConfiguracionNegocio>().Property(x => x.Id_Configuracion).HasColumnName("id_configuracion");
            modelBuilder.Entity<ConfiguracionNegocio>().Property(x => x.Nombre_Negocio).HasColumnName("nombre_negocio");
            modelBuilder.Entity<ConfiguracionNegocio>().Property(x => x.Direccion).HasColumnName("direccion");
            modelBuilder.Entity<ConfiguracionNegocio>().Property(x => x.Telefono).HasColumnName("telefono");
            modelBuilder.Entity<ConfiguracionNegocio>().Property(x => x.Rtn).HasColumnName("rtn");
            modelBuilder.Entity<ConfiguracionNegocio>().Property(x => x.Mensaje_Ticket).HasColumnName("mensaje_ticket");
            modelBuilder.Entity<ConfiguracionNegocio>().Property(x => x.Ancho_Ticket).HasColumnName("ancho_ticket");
            modelBuilder.Entity<ConfiguracionNegocio>().Property(x => x.Logo_Url).HasColumnName("logo_url");
            modelBuilder.Entity<ConfiguracionNegocio>().Property(x => x.Moneda).HasColumnName("moneda");
            modelBuilder.Entity<ConfiguracionNegocio>().Property(x => x.Activo).HasColumnName("activo");

            modelBuilder.Entity<Proveedor>().Property(x => x.Id_Proveedor).HasColumnName("id_proveedor");
            modelBuilder.Entity<Proveedor>().Property(x => x.Nombre).HasColumnName("nombre");
            modelBuilder.Entity<Proveedor>().Property(x => x.Rtn).HasColumnName("rtn");
            modelBuilder.Entity<Proveedor>().Property(x => x.Telefono).HasColumnName("telefono");
            modelBuilder.Entity<Proveedor>().Property(x => x.Email).HasColumnName("email");
            modelBuilder.Entity<Proveedor>().Property(x => x.Contacto).HasColumnName("contacto");
            modelBuilder.Entity<Proveedor>().Property(x => x.Direccion).HasColumnName("direccion");
            modelBuilder.Entity<Proveedor>().Property(x => x.Fecha_Creacion).HasColumnName("fecha_creacion");
            modelBuilder.Entity<Proveedor>().Property(x => x.Activo).HasColumnName("activo");

            modelBuilder.Entity<InventarioItem>().Property(x => x.Id_Inventario_Item).HasColumnName("id_inventario_item");
            modelBuilder.Entity<InventarioItem>().Property(x => x.Id_Sucursal).HasColumnName("id_sucursal");
            modelBuilder.Entity<InventarioItem>().Property(x => x.Codigo).HasColumnName("codigo");
            modelBuilder.Entity<InventarioItem>().Property(x => x.Nombre).HasColumnName("nombre");
            modelBuilder.Entity<InventarioItem>().Property(x => x.Unidad_Medida).HasColumnName("unidad_medida");
            modelBuilder.Entity<InventarioItem>().Property(x => x.Stock_Inicial).HasColumnName("stock_inicial");
            modelBuilder.Entity<InventarioItem>().Property(x => x.Stock_Minimo).HasColumnName("stock_minimo");
            modelBuilder.Entity<InventarioItem>().Property(x => x.Costo_Referencia).HasColumnName("costo_referencia");
            modelBuilder.Entity<InventarioItem>().Property(x => x.Fecha_Creacion).HasColumnName("fecha_creacion");
            modelBuilder.Entity<InventarioItem>().Property(x => x.Activo).HasColumnName("activo");

            modelBuilder.Entity<MovimientoInventario>().Property(x => x.Id_Movimiento_Inventario).HasColumnName("id_movimiento_inventario");
            modelBuilder.Entity<MovimientoInventario>().Property(x => x.Id_Inventario_Item).HasColumnName("id_inventario_item");
            modelBuilder.Entity<MovimientoInventario>().Property(x => x.Id_Sucursal).HasColumnName("id_sucursal");
            modelBuilder.Entity<MovimientoInventario>().Property(x => x.Id_Usuario).HasColumnName("id_usuario");
            modelBuilder.Entity<MovimientoInventario>().Property(x => x.Fecha).HasColumnName("fecha");
            modelBuilder.Entity<MovimientoInventario>().Property(x => x.Tipo).HasColumnName("tipo");
            modelBuilder.Entity<MovimientoInventario>().Property(x => x.Cantidad).HasColumnName("cantidad");
            modelBuilder.Entity<MovimientoInventario>().Property(x => x.Costo_Unitario).HasColumnName("costo_unitario");
            modelBuilder.Entity<MovimientoInventario>().Property(x => x.Referencia).HasColumnName("referencia");
            modelBuilder.Entity<MovimientoInventario>().Property(x => x.Observacion).HasColumnName("observacion");

            modelBuilder.Entity<CompraProveedor>().Property(x => x.Id_Compra_Proveedor).HasColumnName("id_compra_proveedor");
            modelBuilder.Entity<CompraProveedor>().Property(x => x.Id_Proveedor).HasColumnName("id_proveedor");
            modelBuilder.Entity<CompraProveedor>().Property(x => x.Id_Sucursal).HasColumnName("id_sucursal");
            modelBuilder.Entity<CompraProveedor>().Property(x => x.Id_Usuario).HasColumnName("id_usuario");
            modelBuilder.Entity<CompraProveedor>().Property(x => x.Fecha).HasColumnName("fecha");
            modelBuilder.Entity<CompraProveedor>().Property(x => x.Total).HasColumnName("total");
            modelBuilder.Entity<CompraProveedor>().Property(x => x.Estado).HasColumnName("estado");
            modelBuilder.Entity<CompraProveedor>().Property(x => x.Observacion).HasColumnName("observacion");

            modelBuilder.Entity<CompraProveedorDetalle>().Property(x => x.Id_Compra_Proveedor_Detalle).HasColumnName("id_compra_proveedor_detalle");
            modelBuilder.Entity<CompraProveedorDetalle>().Property(x => x.Id_Compra_Proveedor).HasColumnName("id_compra_proveedor");
            modelBuilder.Entity<CompraProveedorDetalle>().Property(x => x.Id_Inventario_Item).HasColumnName("id_inventario_item");
            modelBuilder.Entity<CompraProveedorDetalle>().Property(x => x.Cantidad).HasColumnName("cantidad");
            modelBuilder.Entity<CompraProveedorDetalle>().Property(x => x.Costo_Unitario).HasColumnName("costo_unitario");
            modelBuilder.Entity<CompraProveedorDetalle>().Property(x => x.Subtotal).HasColumnName("subtotal");

            modelBuilder.Entity<RecetaProductoInsumo>().Property(x => x.Id_Receta_Producto_Insumo).HasColumnName("id_receta_producto_insumo");
            modelBuilder.Entity<RecetaProductoInsumo>().Property(x => x.Id_Sucursal).HasColumnName("id_sucursal");
            modelBuilder.Entity<RecetaProductoInsumo>().Property(x => x.Id_Producto).HasColumnName("id_producto");
            modelBuilder.Entity<RecetaProductoInsumo>().Property(x => x.Id_Presentacion).HasColumnName("id_presentacion");
            modelBuilder.Entity<RecetaProductoInsumo>().Property(x => x.Id_Inventario_Item).HasColumnName("id_inventario_item");
            modelBuilder.Entity<RecetaProductoInsumo>().Property(x => x.Cantidad_Insumo).HasColumnName("cantidad_insumo");
            modelBuilder.Entity<RecetaProductoInsumo>().Property(x => x.Activo).HasColumnName("activo");
            modelBuilder.Entity<Mesa>().ToTable("mesas");
            modelBuilder.Entity<CuentaMesa>().ToTable("cuentas_mesa");
            modelBuilder.Entity<DetalleCuentaMesa>().ToTable("detalle_cuenta_mesa");

            modelBuilder.Entity<Mesa>().HasKey(x => x.Id_Mesa);
            modelBuilder.Entity<CuentaMesa>().HasKey(x => x.Id_Cuenta_Mesa);
            modelBuilder.Entity<DetalleCuentaMesa>().HasKey(x => x.Id_Detalle_Cuenta_Mesa);

            modelBuilder.Entity<Mesa>().Property(x => x.Id_Mesa).HasColumnName("id_mesa");
            modelBuilder.Entity<Mesa>().Property(x => x.Id_Sucursal).HasColumnName("id_sucursal");
            modelBuilder.Entity<Mesa>().Property(x => x.Nombre).HasColumnName("nombre");
            modelBuilder.Entity<Mesa>().Property(x => x.Capacidad).HasColumnName("capacidad");
            modelBuilder.Entity<Mesa>().Property(x => x.Estado).HasColumnName("estado");
            modelBuilder.Entity<Mesa>().Property(x => x.Forma).HasColumnName("forma");
            modelBuilder.Entity<Mesa>().Property(x => x.Pos_X).HasColumnName("pos_x");
            modelBuilder.Entity<Mesa>().Property(x => x.Pos_Y).HasColumnName("pos_y");
            modelBuilder.Entity<Mesa>().Property(x => x.Ancho).HasColumnName("ancho");
            modelBuilder.Entity<Mesa>().Property(x => x.Alto).HasColumnName("alto");
            modelBuilder.Entity<Mesa>().Property(x => x.Activo).HasColumnName("activo");

            modelBuilder.Entity<CuentaMesa>().Property(x => x.Id_Cuenta_Mesa).HasColumnName("id_cuenta_mesa");
            modelBuilder.Entity<CuentaMesa>().Property(x => x.Id_Mesa).HasColumnName("id_mesa");
            modelBuilder.Entity<CuentaMesa>().Property(x => x.Id_Sucursal).HasColumnName("id_sucursal");
            modelBuilder.Entity<CuentaMesa>().Property(x => x.Id_Usuario).HasColumnName("id_usuario");
            modelBuilder.Entity<CuentaMesa>().Property(x => x.Fecha_Apertura).HasColumnName("fecha_apertura");
            modelBuilder.Entity<CuentaMesa>().Property(x => x.Fecha_Cierre).HasColumnName("fecha_cierre");
            modelBuilder.Entity<CuentaMesa>().Property(x => x.Estado).HasColumnName("estado");
            modelBuilder.Entity<CuentaMesa>().Property(x => x.Observacion).HasColumnName("observacion");

            modelBuilder.Entity<DetalleCuentaMesa>().Property(x => x.Id_Detalle_Cuenta_Mesa).HasColumnName("id_detalle_cuenta_mesa");
            modelBuilder.Entity<DetalleCuentaMesa>().Property(x => x.Id_Cuenta_Mesa).HasColumnName("id_cuenta_mesa");
            modelBuilder.Entity<DetalleCuentaMesa>().Property(x => x.Id_Producto).HasColumnName("id_producto");
            modelBuilder.Entity<DetalleCuentaMesa>().Property(x => x.Id_Presentacion).HasColumnName("id_presentacion");
            modelBuilder.Entity<DetalleCuentaMesa>().Property(x => x.Cantidad).HasColumnName("cantidad");
            modelBuilder.Entity<DetalleCuentaMesa>().Property(x => x.Precio_Unitario).HasColumnName("precio_unitario");
            modelBuilder.Entity<DetalleCuentaMesa>().Property(x => x.Subtotal).HasColumnName("subtotal");
            modelBuilder.Entity<DetalleCuentaMesa>().Property(x => x.Observacion).HasColumnName("observacion");
        }
    }
}
