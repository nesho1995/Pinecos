namespace Pinecos.Models
{
    public class FacturacionSarCorrelativoEvento
    {
        public long Id_Facturacion_Sar_Correlativo_Evento { get; set; }
        public int Id_Sucursal { get; set; }
        public string Numero_Factura { get; set; } = string.Empty;
        public string Cai { get; set; } = string.Empty;
        public DateTime? Fecha_Limite_Emision { get; set; }
        public string Estado { get; set; } = "RESERVADO";
        public string Origen { get; set; } = string.Empty;
        public int? Id_Venta { get; set; }
        public int? Id_Usuario { get; set; }
        public string Motivo_Fallo { get; set; } = string.Empty;
        public bool Revisado { get; set; }
        public string Comentario_Operacion { get; set; } = string.Empty;
        public int? Id_Usuario_Revision { get; set; }
        public DateTime? Fecha_Revision { get; set; }
        public DateTime Fecha_Creacion { get; set; }
        public DateTime? Fecha_Actualizacion { get; set; }
    }
}

