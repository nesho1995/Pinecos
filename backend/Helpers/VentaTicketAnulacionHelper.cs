using Pinecos.DTOs;
using Pinecos.Models;

namespace Pinecos.Helpers
{
    public static class VentaTicketAnulacionHelper
    {
        public static void AplicarEstadoAnulacion(TicketVentaDto ticket, Venta venta)
        {
            ticket.EsAnulada = string.Equals(venta.Estado, "ANULADA", StringComparison.OrdinalIgnoreCase);
            if (!ticket.EsAnulada)
            {
                ticket.TextoBannerAnulacion = string.Empty;
                return;
            }

            var partes = new List<string> { "VENTA ANULADA EN SISTEMA — NO ES COMPROBANTE VIGENTE" };
            if (venta.Fecha_Anulacion.HasValue)
                partes.Add($"Fecha anulacion: {venta.Fecha_Anulacion:dd/MM/yyyy HH:mm}");
            if (!string.IsNullOrWhiteSpace(venta.Motivo_Anulacion))
                partes.Add($"Motivo: {venta.Motivo_Anulacion.Trim()}");
            if (!string.IsNullOrWhiteSpace(venta.Referencia_Anulacion_Fiscal))
                partes.Add($"Ref. documento fiscal: {venta.Referencia_Anulacion_Fiscal.Trim()}");

            ticket.TextoBannerAnulacion = string.Join(" | ", partes);
        }
    }
}
