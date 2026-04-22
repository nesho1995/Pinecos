namespace Pinecos.Models
{
    public class DetalleCuentaMesa
    {
        public int Id_Detalle_Cuenta_Mesa { get; set; }
        public int Id_Cuenta_Mesa { get; set; }
        public int Id_Producto { get; set; }
        public int? Id_Presentacion { get; set; }
        public int Cantidad { get; set; }
        public decimal Precio_Unitario { get; set; }
        public decimal Subtotal { get; set; }
        public string Tipo_Fiscal_Linea { get; set; } = "GRAVADO_15";
        public string Observacion { get; set; } = string.Empty;
    }
}