namespace Pinecos.Helpers
{
    /// <summary>
    /// La observacion guarda tokens FEXTRA (base64) y datos FACTURA/CAI; VARCHAR cortos en BD provocan error al guardar.
    /// </summary>
    public static class ObservacionVentaHelper
    {
        public const int MaxLengthMySqlText = 65535;

        public static string TruncarSiHaceFalta(string? observacion)
        {
            if (string.IsNullOrEmpty(observacion)) return observacion ?? string.Empty;
            if (observacion.Length <= MaxLengthMySqlText) return observacion;

            const string marker = " |...[OBSERVACION_TRUNCADA]";
            var take = MaxLengthMySqlText - marker.Length;
            return take <= 0 ? marker : observacion.Substring(0, take) + marker;
        }
    }
}
