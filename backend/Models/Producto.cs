namespace Pinecos.Models
{
    public class Producto
    {
        public int Id_Producto { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public int Id_Categoria { get; set; }
        public decimal Costo { get; set; }
        public bool Activo { get; set; }
    }
}