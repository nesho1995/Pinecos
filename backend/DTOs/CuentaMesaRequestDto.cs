namespace Pinecos.DTOs
{
    public class AbrirCuentaMesaRequestDto
    {
        public int Id_Mesa { get; set; }
        public string Observacion { get; set; } = string.Empty;
    }

    public class DetalleCuentaMesaRequestDto
    {
        public int Id_Producto { get; set; }
        public int? Id_Presentacion { get; set; }
        public int Cantidad { get; set; }
        public decimal Precio_Unitario { get; set; }
        public string Observacion { get; set; } = string.Empty;
    }

    public class CobrarCuentaMesaRequestDto
    {
        public int Id_Caja { get; set; }
        public decimal Descuento { get; set; }
        public decimal Impuesto { get; set; }
        public bool ImpuestoIncluidoEnSubtotal { get; set; }
        public bool EmitirFactura { get; set; }
        public string Metodo_Pago { get; set; } = string.Empty;
        public string Observacion { get; set; } = string.Empty;
    }
}
