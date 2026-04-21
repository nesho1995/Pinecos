namespace Pinecos.DTOs
{
    public class AnularVentaRequestDto
    {
        /// <summary>Motivo operativo (obligatorio, mínimo 5 caracteres).</summary>
        public string Motivo { get; set; } = string.Empty;

        /// <summary>Opcional: número de nota de crédito u otro documento fiscal de anulación.</summary>
        public string? ReferenciaDocumentoFiscal { get; set; }
    }
}
