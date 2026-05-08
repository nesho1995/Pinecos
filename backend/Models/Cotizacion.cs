namespace Pinecos.Models
{
    public class Cotizacion
    {
        public int Id_Cotizacion { get; set; }
        public string Numero { get; set; } = string.Empty;
        public DateTime Fecha { get; set; }
        public int? Id_Sucursal { get; set; }
        public int Id_Usuario { get; set; }
        public string Cliente_Nombre { get; set; } = string.Empty;
        public string Cliente_Rtn { get; set; } = string.Empty;
        public string Cliente_Direccion { get; set; } = string.Empty;
        public string Cliente_Telefono { get; set; } = string.Empty;
        public decimal Subtotal { get; set; }
        public decimal Descuento { get; set; }
        public decimal Impuesto { get; set; }
        public decimal Total { get; set; }
        public string Estado { get; set; } = "EMITIDA";
        public string Observacion { get; set; } = string.Empty;
        public DateTime Fecha_Creacion { get; set; }
        public DateTime? Fecha_Actualizacion { get; set; }
        public DateTime? Fecha_Anulacion { get; set; }
        public int? Id_Usuario_Anulacion { get; set; }
        public string Motivo_Anulacion { get; set; } = string.Empty;
        public List<CotizacionDetalle> Detalles { get; set; } = new();
    }
}
