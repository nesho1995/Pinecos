namespace Pinecos.Models
{
    public class Mesa
    {
        public int Id_Mesa { get; set; }
        public int Id_Sucursal { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public int Capacidad { get; set; }
        public string Estado { get; set; } = string.Empty;
        public string Forma { get; set; } = string.Empty;
        public int Pos_X { get; set; }
        public int Pos_Y { get; set; }
        public int Ancho { get; set; }
        public int Alto { get; set; }
        public bool Activo { get; set; }
    }
}