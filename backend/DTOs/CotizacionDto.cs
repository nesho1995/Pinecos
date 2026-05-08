namespace Pinecos.DTOs
{
    public class CotizacionDetalleRequestDto
    {
        public int? Id_Producto { get; set; }
        public int? Id_Presentacion { get; set; }
        public string Descripcion { get; set; } = string.Empty;
        public decimal Cantidad { get; set; }
        public decimal Precio_Unitario { get; set; }
    }

    public class CotizacionRequestDto
    {
        public int? Id_Sucursal { get; set; }
        public string Cliente_Nombre { get; set; } = string.Empty;
        public string Cliente_Rtn { get; set; } = string.Empty;
        public string Cliente_Direccion { get; set; } = string.Empty;
        public string Cliente_Telefono { get; set; } = string.Empty;
        public decimal Descuento { get; set; }
        public decimal Impuesto { get; set; }
        public string Observacion { get; set; } = string.Empty;
        public List<CotizacionDetalleRequestDto> Detalles { get; set; } = new();
    }

    public class AnularCotizacionRequestDto
    {
        public string Motivo { get; set; } = string.Empty;
    }

    public class CotizacionDetalleResponseDto
    {
        public int Id_Cotizacion_Detalle { get; set; }
        public int? Id_Producto { get; set; }
        public int? Id_Presentacion { get; set; }
        public string Descripcion { get; set; } = string.Empty;
        public decimal Cantidad { get; set; }
        public decimal Precio_Unitario { get; set; }
        public decimal Subtotal { get; set; }
        public int Orden { get; set; }
    }

    public class CotizacionResponseDto
    {
        public int Id_Cotizacion { get; set; }
        public string Numero { get; set; } = string.Empty;
        public DateTime Fecha { get; set; }
        public int? Id_Sucursal { get; set; }
        public string Sucursal { get; set; } = string.Empty;
        public int Id_Usuario { get; set; }
        public string Usuario { get; set; } = string.Empty;
        public string Cliente_Nombre { get; set; } = string.Empty;
        public string Cliente_Rtn { get; set; } = string.Empty;
        public string Cliente_Direccion { get; set; } = string.Empty;
        public string Cliente_Telefono { get; set; } = string.Empty;
        public decimal Subtotal { get; set; }
        public decimal Descuento { get; set; }
        public decimal Impuesto { get; set; }
        public decimal Total { get; set; }
        public string Estado { get; set; } = string.Empty;
        public string Observacion { get; set; } = string.Empty;
        public DateTime Fecha_Creacion { get; set; }
        public DateTime? Fecha_Actualizacion { get; set; }
        public DateTime? Fecha_Anulacion { get; set; }
        public string Motivo_Anulacion { get; set; } = string.Empty;
        public List<CotizacionDetalleResponseDto> Detalles { get; set; } = new();
    }
}
