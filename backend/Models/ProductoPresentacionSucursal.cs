namespace Pinecos.Models
{
    public class ProductoPresentacionSucursal
    {
        public int Id_Producto_Presentacion_Sucursal { get; set; }
        public int Id_Producto_Presentacion { get; set; }
        public int Id_Sucursal { get; set; }
        public decimal Precio { get; set; }
        public bool Activo { get; set; }
    }
}