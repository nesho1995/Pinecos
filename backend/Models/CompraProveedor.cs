namespace Pinecos.Models
{
    public class CompraProveedor
    {
        public int Id_Compra_Proveedor { get; set; }
        public int Id_Proveedor { get; set; }
        public int Id_Sucursal { get; set; }
        public int Id_Usuario { get; set; }
        public DateTime Fecha { get; set; }
        public decimal Total { get; set; }
        public string Estado { get; set; } = "ACTIVA";
        public string Observacion { get; set; } = string.Empty;
    }
}
