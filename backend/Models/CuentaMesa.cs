namespace Pinecos.Models
{
    public class CuentaMesa
    {
        public int Id_Cuenta_Mesa { get; set; }
        public int Id_Mesa { get; set; }
        public int Id_Sucursal { get; set; }
        public int Id_Usuario { get; set; }
        public DateTime Fecha_Apertura { get; set; }
        public DateTime? Fecha_Cierre { get; set; }
        public string Estado { get; set; } = string.Empty;
        public string Observacion { get; set; } = string.Empty;
    }
}