using System.Text.RegularExpressions;

namespace Pinecos.Helpers
{
    public class FacturaMetadata
    {
        public bool EsFacturaCai { get; set; }
        public string NumeroFactura { get; set; } = string.Empty;
        public string Cai { get; set; } = string.Empty;
        public DateTime? FechaLimiteEmision { get; set; }
        public string RangoInicio { get; set; } = string.Empty;
        public string RangoFin { get; set; } = string.Empty;
    }

    public static class FacturaMetadataHelper
    {
        public static FacturaMetadata ParseFromObservacion(string? observacion)
        {
            var text = observacion ?? string.Empty;

            var numero = GetToken(text, "FACTURA");
            var cai = GetToken(text, "CAI");
            var vence = GetToken(text, "VENCE");
            var rango = GetToken(text, "RANGO");

            var (inicio, fin) = ParseRango(rango);
            DateTime? fechaLimite = null;
            if (DateTime.TryParse(vence, out var fecha))
                fechaLimite = fecha;

            return new FacturaMetadata
            {
                EsFacturaCai = !string.IsNullOrWhiteSpace(numero) && !string.IsNullOrWhiteSpace(cai),
                NumeroFactura = numero,
                Cai = cai,
                FechaLimiteEmision = fechaLimite,
                RangoInicio = inicio,
                RangoFin = fin
            };
        }

        private static string GetToken(string text, string key)
        {
            var match = Regex.Match(text, $@"(?:^|\||\s){Regex.Escape(key)}\s*:\s*(?<v>[^|]+)", RegexOptions.IgnoreCase);
            return match.Success ? match.Groups["v"].Value.Trim() : string.Empty;
        }

        private static (string Inicio, string Fin) ParseRango(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw))
                return (string.Empty, string.Empty);

            var parts = raw.Split("..", StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length != 2)
                return (raw.Trim(), string.Empty);

            return (parts[0], parts[1]);
        }
    }
}
