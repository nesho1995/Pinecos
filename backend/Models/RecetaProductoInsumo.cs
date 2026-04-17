namespace Pinecos.Models
{
    public class RecetaProductoInsumo
    {
        public int Id_Receta_Producto_Insumo { get; set; }
        public int Id_Sucursal { get; set; }
        public int Id_Producto { get; set; }
        public int? Id_Presentacion { get; set; }
        public int Id_Inventario_Item { get; set; }
        public decimal Cantidad_Insumo { get; set; }
        public bool Activo { get; set; }
    }
}
