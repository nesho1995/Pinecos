using System.Text.RegularExpressions;

namespace Pinecos.Helpers
{
    /// <summary>
    /// La observacion guarda SERVICIO/ATENDIO/COBRO, tokens FEXTRA (base64), PAGOS, FACTURA/CAI; VARCHAR cortos en BD provocan error al guardar.
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

        /// <summary>Valor del token SERVICIO: (COMER_AQUI / LLEVAR) o SIN_DEFINIR si no hay.</summary>
        public static string ObtenerTipoServicio(string? observacion)
        {
            var raw = ExtraerTokenValor(observacion, "SERVICIO");
            if (string.IsNullOrWhiteSpace(raw))
                return "SIN_DEFINIR";

            var t = raw.Trim().ToUpperInvariant();
            return t switch
            {
                "COMER_AQUI" => "COMER_AQUI",
                "LLEVAR" => "LLEVAR",
                _ => t
            };
        }

        public static string ObtenerAtendio(string? observacion) =>
            ExtraerTokenValor(observacion, "ATENDIO");

        public static string ObtenerCobro(string? observacion) =>
            ExtraerTokenValor(observacion, "COBRO");

        private static string ExtraerTokenValor(string? observacion, string clave)
        {
            if (string.IsNullOrWhiteSpace(observacion) || string.IsNullOrWhiteSpace(clave))
                return string.Empty;

            var m = Regex.Match(
                observacion,
                $@"(?:^|\|\s*){Regex.Escape(clave)}\s*:\s*(?<v>[^|]+)",
                RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

            return m.Success ? m.Groups["v"].Value.Trim() : string.Empty;
        }
    }
}
