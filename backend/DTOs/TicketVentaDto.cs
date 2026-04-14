namespace Pinecos.DTOs
{
    public class TicketVentaDetalleDto
    {
        public string Producto { get; set; } = string.Empty;
        public string Presentacion { get; set; } = string.Empty;
        public int Cantidad { get; set; }
        public decimal PrecioUnitario { get; set; }
        public decimal CostoUnitario { get; set; }
        public decimal Subtotal { get; set; }
    }

    public class TicketVentaDto
    {
        public int IdVenta { get; set; }
        public DateTime Fecha { get; set; }
        public string Sucursal { get; set; } = string.Empty;
        public string Cajero { get; set; } = string.Empty;
        public string MetodoPago { get; set; } = string.Empty;
        public decimal Subtotal { get; set; }
        public decimal Descuento { get; set; }
        public decimal Impuesto { get; set; }
        public decimal Total { get; set; }
        public decimal CostoTotal { get; set; }
        public decimal UtilidadBruta { get; set; }
        public string Observacion { get; set; } = string.Empty;
        public bool EsFacturaCai { get; set; }
        public string NumeroFactura { get; set; } = string.Empty;
        public string Cai { get; set; } = string.Empty;
        public DateTime? FechaLimiteEmision { get; set; }
        public string RangoInicio { get; set; } = string.Empty;
        public string RangoFin { get; set; } = string.Empty;
        public List<TicketVentaDetalleDto> Detalles { get; set; } = new();
    }
}
