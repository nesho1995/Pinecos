namespace Pinecos.Models
{
    public class CompraProveedorDetalle
    {
        public int Id_Compra_Proveedor_Detalle { get; set; }
        public int Id_Compra_Proveedor { get; set; }
        public int Id_Inventario_Item { get; set; }
        public decimal Cantidad { get; set; }
        public decimal Costo_Unitario { get; set; }
        public decimal Subtotal { get; set; }
    }
}
