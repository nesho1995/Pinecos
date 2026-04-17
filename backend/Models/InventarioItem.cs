namespace Pinecos.Models
{
    public class InventarioItem
    {
        public int Id_Inventario_Item { get; set; }
        public int Id_Sucursal { get; set; }
        public string Codigo { get; set; } = string.Empty;
        public string Nombre { get; set; } = string.Empty;
        public string Unidad_Medida { get; set; } = "UNIDAD";
        public decimal Stock_Inicial { get; set; }
        public decimal Stock_Minimo { get; set; }
        public decimal Costo_Referencia { get; set; }
        public DateTime Fecha_Creacion { get; set; }
        public bool Activo { get; set; }
    }
}
