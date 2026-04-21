namespace Pinecos.Models
{
    public class Venta
    {
        public int Id_Venta { get; set; }
        public int Id_Caja { get; set; }
        public int Id_Sucursal { get; set; }
        public int Id_Usuario { get; set; }
        public DateTime Fecha { get; set; }
        public decimal Subtotal { get; set; }
        public decimal Descuento { get; set; }
        public decimal Impuesto { get; set; }
        public decimal Total { get; set; }
        public string Metodo_Pago { get; set; } = string.Empty;
        public string Observacion { get; set; } = string.Empty;
        public string Estado { get; set; } = string.Empty;

        public DateTime? Fecha_Anulacion { get; set; }
        public int? Id_Usuario_Anulacion { get; set; }
        public string? Motivo_Anulacion { get; set; }
        public string? Referencia_Anulacion_Fiscal { get; set; }
    }
}
