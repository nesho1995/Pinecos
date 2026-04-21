using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Pinecos.DTOs;

namespace Pinecos.Helpers
{
    public static class FacturaClienteMetadataHelper
    {
        private const string TokenKey = "FEXTRA";

        public static FacturaClienteRequestDto Normalizar(FacturaClienteRequestDto? request)
        {
            var tipoCliente = (request?.TipoCliente ?? "CONSUMIDOR_FINAL").Trim().ToUpperInvariant();
            if (tipoCliente != "OBLIGADO_TRIBUTARIO")
                tipoCliente = "CONSUMIDOR_FINAL";

            var condicionPago = (request?.CondicionPago ?? "CONTADO").Trim().ToUpperInvariant();
            if (condicionPago != "CREDITO")
                condicionPago = "CONTADO";

            var tipoFacturaFiscal = (request?.TipoFacturaFiscal ?? "GRAVADO_15").Trim().ToUpperInvariant();
            if (tipoFacturaFiscal != "GRAVADO_18" &&
                tipoFacturaFiscal != "EXENTO" &&
                tipoFacturaFiscal != "EXONERADO")
            {
                tipoFacturaFiscal = "GRAVADO_15";
            }

            return new FacturaClienteRequestDto
            {
                TipoCliente = tipoCliente,
                NombreCliente = Limpiar(request?.NombreCliente, 160),
                RtnCliente = Limpiar(request?.RtnCliente, 32),
                IdentidadCliente = Limpiar(request?.IdentidadCliente, 32),
                DireccionCliente = Limpiar(request?.DireccionCliente, 220),
                TelefonoCliente = Limpiar(request?.TelefonoCliente, 32),
                CondicionPago = condicionPago,
                TipoFacturaFiscal = tipoFacturaFiscal,
                NumeroOrdenCompraExenta = Limpiar(request?.NumeroOrdenCompraExenta, 60),
                NumeroConstanciaRegistroExonerado = Limpiar(request?.NumeroConstanciaRegistroExonerado, 60),
                NumeroRegistroSag = Limpiar(request?.NumeroRegistroSag, 60)
            };
        }

        public static string BuildToken(FacturaClienteRequestDto? request)
        {
            var normalizado = Normalizar(request);
            var json = JsonSerializer.Serialize(normalizado);
            var encoded = Convert.ToBase64String(Encoding.UTF8.GetBytes(json));
            return $"{TokenKey}:{encoded}";
        }

        public static FacturaClienteRequestDto ParseFromObservacion(string? observacion)
        {
            var encoded = GetToken(observacion ?? string.Empty, TokenKey);
            if (string.IsNullOrWhiteSpace(encoded))
                return Normalizar(null);

            try
            {
                var bytes = Convert.FromBase64String(encoded.Trim());
                var json = Encoding.UTF8.GetString(bytes);
                var data = JsonSerializer.Deserialize<FacturaClienteRequestDto>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                return Normalizar(data);
            }
            catch
            {
                return Normalizar(null);
            }
        }

        private static string GetToken(string text, string key)
        {
            var match = Regex.Match(text, $@"(?:^|\||\s){Regex.Escape(key)}\s*:\s*(?<v>[^|]+)", RegexOptions.IgnoreCase);
            return match.Success ? match.Groups["v"].Value.Trim() : string.Empty;
        }

        private static string Limpiar(string? value, int maxLen)
        {
            var cleaned = (value ?? string.Empty)
                .Replace("|", " ")
                .Trim();

            if (cleaned.Length <= maxLen)
                return cleaned;

            return cleaned.Substring(0, maxLen);
        }
    }
}
