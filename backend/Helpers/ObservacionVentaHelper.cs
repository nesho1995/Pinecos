using System.Text.RegularExpressions;

namespace Pinecos.Helpers
{
    public static class ObservacionVentaHelper
    {
        public static string ObtenerToken(string? observacion, string clave)
        {
            var text = observacion ?? string.Empty;
            var match = Regex.Match(text, $@"(?:^|\||\s){Regex.Escape(clave)}\s*:\s*(?<v>[^|]+)", RegexOptions.IgnoreCase);
            return match.Success ? match.Groups["v"].Value.Trim() : string.Empty;
        }

        public static string ObtenerTipoServicio(string? observacion)
        {
            var tipo = ObtenerToken(observacion, "SERVICIO");
            if (string.IsNullOrWhiteSpace(tipo)) return "SIN_DEFINIR";
            return tipo.Trim().ToUpperInvariant();
        }

        public static string ObtenerAtendio(string? observacion)
        {
            return ObtenerToken(observacion, "ATENDIO");
        }

        public static string ObtenerCobro(string? observacion)
        {
            return ObtenerToken(observacion, "COBRO");
        }
    }
}
