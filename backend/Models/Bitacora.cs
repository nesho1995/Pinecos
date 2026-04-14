namespace Pinecos.Models
{
    public class Bitacora
    {
        public int Id_Bitacora { get; set; }
        public DateTime Fecha { get; set; }
        public int? Id_Usuario { get; set; }
        public string Modulo { get; set; } = string.Empty;
        public string Accion { get; set; } = string.Empty;
        public string Detalle { get; set; } = string.Empty;
    }
}