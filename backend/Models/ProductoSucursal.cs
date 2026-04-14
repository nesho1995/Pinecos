namespace Pinecos.Models
{
    public class ProductoSucursal
    {
        public int Id_Producto_Sucursal { get; set; }
        public int Id_Producto { get; set; }
        public int Id_Sucursal { get; set; }
        public decimal Precio { get; set; }
        public bool Activo { get; set; }
    }
}