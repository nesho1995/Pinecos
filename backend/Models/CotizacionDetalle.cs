namespace Pinecos.Models
{
    public class CotizacionDetalle
    {
        public int Id_Cotizacion_Detalle { get; set; }
        public int Id_Cotizacion { get; set; }
        public int? Id_Producto { get; set; }
        public int? Id_Presentacion { get; set; }
        public string Descripcion { get; set; } = string.Empty;
        public decimal Cantidad { get; set; }
        public decimal Precio_Unitario { get; set; }
        public decimal Subtotal { get; set; }
        public int Orden { get; set; }
        public Cotizacion? Cotizacion { get; set; }
    }
}
