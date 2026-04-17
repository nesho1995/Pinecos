using System.Globalization;
using System.Text;
using System.Text.Json;
using Pinecos.DTOs;
using Pinecos.Models;

namespace Pinecos.Helpers
{
    public class PagoVentaLinea
    {
        public string Metodo_Pago { get; set; } = string.Empty;
        public decimal Monto { get; set; }
    }

    public static class PagoVentaHelper
    {
        private const string PagosToken = "PAGOS_B64:";

        public static List<PagoVentaRequestDto> NormalizarPagos(IEnumerable<PagoVentaRequestDto>? pagos)
        {
            return (pagos ?? Enumerable.Empty<PagoVentaRequestDto>())
                .Where(x => x != null)
                .Select(x => new PagoVentaRequestDto
                {
                    Metodo_Pago = (x.Metodo_Pago ?? string.Empty).Trim().ToUpperInvariant(),
                    Monto = Math.Round(x.Monto, 2, MidpointRounding.AwayFromZero)
                })
                .Where(x => !string.IsNullOrWhiteSpace(x.Metodo_Pago) && x.Monto > 0)
                .ToList();
        }

        public static string BuildPagosToken(IEnumerable<PagoVentaRequestDto>? pagos)
        {
            var pagosNormalizados = NormalizarPagos(pagos);
            if (pagosNormalizados.Count == 0)
                return string.Empty;

            var json = JsonSerializer.Serialize(pagosNormalizados);
            var b64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(json));
            return $"{PagosToken}{b64}";
        }

        public static List<PagoVentaLinea> ParseFromObservacion(string? observacion)
        {
            if (string.IsNullOrWhiteSpace(observacion))
                return new List<PagoVentaLinea>();

            var idx = observacion.IndexOf(PagosToken, StringComparison.OrdinalIgnoreCase);
            if (idx < 0)
                return new List<PagoVentaLinea>();

            var start = idx + PagosToken.Length;
            var end = observacion.IndexOf(' ', start);
            var raw = end >= 0 ? observacion[start..end] : observacion[start..];
            raw = raw.Trim();
            if (string.IsNullOrWhiteSpace(raw))
                return new List<PagoVentaLinea>();

            try
            {
                var json = Encoding.UTF8.GetString(Convert.FromBase64String(raw));
                var parsed = JsonSerializer.Deserialize<List<PagoVentaRequestDto>>(json) ?? new List<PagoVentaRequestDto>();
                return NormalizarPagos(parsed)
                    .Select(x => new PagoVentaLinea { Metodo_Pago = x.Metodo_Pago, Monto = x.Monto })
                    .ToList();
            }
            catch
            {
                return new List<PagoVentaLinea>();
            }
        }

        public static List<PagoVentaLinea> ObtenerPagosVenta(Venta venta)
        {
            var pagos = ParseFromObservacion(venta.Observacion);
            if (pagos.Count > 0)
                return pagos;

            return new List<PagoVentaLinea>
            {
                new()
                {
                    Metodo_Pago = (venta.Metodo_Pago ?? string.Empty).Trim().ToUpperInvariant(),
                    Monto = Math.Round(venta.Total, 2, MidpointRounding.AwayFromZero)
                }
            };
        }

        public static List<PagoVentaLinea> ObtenerPagosVenta(string? metodoPago, decimal total, string? observacion)
        {
            var pagos = ParseFromObservacion(observacion);
            if (pagos.Count > 0)
                return pagos;

            return new List<PagoVentaLinea>
            {
                new()
                {
                    Metodo_Pago = (metodoPago ?? string.Empty).Trim().ToUpperInvariant(),
                    Monto = Math.Round(total, 2, MidpointRounding.AwayFromZero)
                }
            };
        }

        public static bool CuadraConTotal(IEnumerable<PagoVentaRequestDto>? pagos, decimal total)
        {
            var suma = NormalizarPagos(pagos).Sum(x => x.Monto);
            return Math.Abs(suma - Math.Round(total, 2, MidpointRounding.AwayFromZero)) <= 0.01m;
        }

        public static string FormatearMonto(decimal monto)
        {
            return monto.ToString("0.00", CultureInfo.InvariantCulture);
        }
    }
}
