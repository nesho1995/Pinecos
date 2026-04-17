namespace Pinecos.Models
{
    public class Proveedor
    {
        public int Id_Proveedor { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string Rtn { get; set; } = string.Empty;
        public string Telefono { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Contacto { get; set; } = string.Empty;
        public string Direccion { get; set; } = string.Empty;
        public DateTime Fecha_Creacion { get; set; }
        public bool Activo { get; set; }
    }
}
