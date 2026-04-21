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
        public bool CaiHabilitadoSucursal { get; set; }
        public string CaiSucursalConfigurado { get; set; } = string.Empty;
        public string NombreNegocio { get; set; } = string.Empty;
        public string RtnNegocio { get; set; } = string.Empty;
        public string DireccionNegocio { get; set; } = string.Empty;
        public string TelefonoNegocio { get; set; } = string.Empty;
        public string LeyendaSar { get; set; } = string.Empty;
        public string NombreImprenta { get; set; } = string.Empty;
        public string RtnImprenta { get; set; } = string.Empty;
        public string NumeroCertificadoImprenta { get; set; } = string.Empty;
        public string TipoCliente { get; set; } = "CONSUMIDOR_FINAL";
        public string NombreCliente { get; set; } = string.Empty;
        public string RtnCliente { get; set; } = string.Empty;
        public string IdentidadCliente { get; set; } = string.Empty;
        public string DireccionCliente { get; set; } = string.Empty;
        public string TelefonoCliente { get; set; } = string.Empty;
        public string CondicionPago { get; set; } = "CONTADO";
        public string TipoFacturaFiscal { get; set; } = "GRAVADO_15";
        public string NumeroOrdenCompraExenta { get; set; } = string.Empty;
        public string NumeroConstanciaRegistroExonerado { get; set; } = string.Empty;
        public string NumeroRegistroSag { get; set; } = string.Empty;
        public decimal ImporteExento { get; set; }
        public decimal ImporteExonerado { get; set; }
        public decimal ImporteGravado15 { get; set; }
        public decimal ImporteGravado18 { get; set; }
        public decimal Isv15 { get; set; }
        public decimal Isv18 { get; set; }
        public string TotalEnLetras { get; set; } = string.Empty;
        public List<TicketVentaDetalleDto> Detalles { get; set; } = new();
    }
}
