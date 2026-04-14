namespace Pinecos.Models
{
    public class Sucursal
    {
        public int Id_Sucursal { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string Direccion { get; set; } = string.Empty;
        public string Telefono { get; set; } = string.Empty;
        public bool Activo { get; set; }
    }
}