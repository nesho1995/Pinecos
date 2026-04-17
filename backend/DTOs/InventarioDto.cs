namespace Pinecos.DTOs
{
    public class RegistrarMovimientoInventarioDto
    {
        public int Id_Inventario_Item { get; set; }
        public string Tipo { get; set; } = string.Empty;
        public decimal Cantidad { get; set; }
        public decimal Costo_Unitario { get; set; }
        public string Referencia { get; set; } = string.Empty;
        public string Observacion { get; set; } = string.Empty;
    }

    public class CrearCompraProveedorDetalleDto
    {
        public int Id_Inventario_Item { get; set; }
        public decimal Cantidad { get; set; }
        public decimal Costo_Unitario { get; set; }
    }

    public class CrearCompraProveedorDto
    {
        public int Id_Proveedor { get; set; }
        public string Observacion { get; set; } = string.Empty;
        public List<CrearCompraProveedorDetalleDto> Detalles { get; set; } = new();
    }

    public class CrearOrdenCompraProveedorDto
    {
        public int Id_Proveedor { get; set; }
        public string Observacion { get; set; } = string.Empty;
        public List<CrearCompraProveedorDetalleDto> Detalles { get; set; } = new();
    }

    public class ActualizarOrdenCompraProveedorDto
    {
        public string Observacion { get; set; } = string.Empty;
        public List<CrearCompraProveedorDetalleDto> Detalles { get; set; } = new();
    }

    public class RecetaProductoDetalleDto
    {
        public int Id_Inventario_Item { get; set; }
        public decimal Cantidad_Insumo { get; set; }
    }

    public class GuardarRecetaProductoDto
    {
        public int Id_Sucursal { get; set; }
        public int Id_Producto { get; set; }
        public int? Id_Presentacion { get; set; }
        public List<RecetaProductoDetalleDto> Detalles { get; set; } = new();
    }
}
