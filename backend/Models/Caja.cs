namespace Pinecos.Models
{
    public class Caja
    {
        public int Id_Caja { get; set; }
        public int Id_Sucursal { get; set; }
        public int Id_Usuario_Apertura { get; set; }
        public DateTime Fecha_Apertura { get; set; }
        public decimal Monto_Inicial { get; set; }
        public string Estado { get; set; } = string.Empty;
        public int? Id_Usuario_Cierre { get; set; }
        public DateTime? Fecha_Cierre { get; set; }
        public decimal? Monto_Cierre { get; set; }
        public string Observacion { get; set; } = string.Empty;
    }
}