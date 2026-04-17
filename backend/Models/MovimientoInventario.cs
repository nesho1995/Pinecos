namespace Pinecos.Models
{
    public class MovimientoInventario
    {
        public int Id_Movimiento_Inventario { get; set; }
        public int Id_Inventario_Item { get; set; }
        public int Id_Sucursal { get; set; }
        public int Id_Usuario { get; set; }
        public DateTime Fecha { get; set; }
        public string Tipo { get; set; } = string.Empty; // ENTRADA | SALIDA | AJUSTE_POSITIVO | AJUSTE_NEGATIVO | COMPRA
        public decimal Cantidad { get; set; }
        public decimal Costo_Unitario { get; set; }
        public string Referencia { get; set; } = string.Empty;
        public string Observacion { get; set; } = string.Empty;
    }
}
