namespace Pinecos.Models
{
    public class MovimientoCaja
    {
        public int Id_Movimiento_Caja { get; set; }
        public int Id_Caja { get; set; }
        public DateTime Fecha { get; set; }
        public string Tipo { get; set; } = string.Empty;
        public string Descripcion { get; set; } = string.Empty;
        public decimal Monto { get; set; }
        public int Id_Usuario { get; set; }
    }
}