namespace Pinecos.Models
{
    public class Usuario
    {
        public int Id_Usuario { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string UsuarioLogin { get; set; } = string.Empty;
        public string Clave { get; set; } = string.Empty;
        public string Rol { get; set; } = string.Empty;
        public int? Id_Sucursal { get; set; }
        public bool Activo { get; set; }
    }
}