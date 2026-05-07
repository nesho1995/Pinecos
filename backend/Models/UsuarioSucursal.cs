namespace Pinecos.Models
{
    public class UsuarioSucursal
    {
        public int Id_Usuario_Sucursal { get; set; }
        public int Id_Usuario { get; set; }
        public int Id_Sucursal { get; set; }
        public Sucursal? Sucursal { get; set; }
    }
}
