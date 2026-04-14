namespace Pinecos.Models
{
    public class Gasto
    {
        public int Id_Gasto { get; set; }
        public int Id_Sucursal { get; set; }
        public int Id_Usuario { get; set; }
        public DateTime Fecha { get; set; }
        public string Categoria_Gasto { get; set; } = string.Empty;
        public string Descripcion { get; set; } = string.Empty;
        public decimal Monto { get; set; }
        public bool Activo { get; set; }
    }
}