using Pinecos.DTOs;
using System.Text;

namespace Pinecos.Helpers
{
    public static class TicketTermicoHelper
    {
        public static string Generar(TicketVentaDto ticket)
        {
            var sb = new StringBuilder();

            sb.AppendLine("      PINECOS");
            sb.AppendLine(ticket.Sucursal);
            sb.AppendLine("------------------------------");
            sb.AppendLine($"Ticket: {ticket.IdVenta}");
            sb.AppendLine($"Fecha: {ticket.Fecha:dd/MM/yyyy HH:mm}");
            sb.AppendLine($"Cajero: {ticket.Cajero}");
            sb.AppendLine($"Pago: {ticket.MetodoPago}");

            if (ticket.EsFacturaCai)
            {
                sb.AppendLine("DOCUMENTO FISCAL SAR");
                sb.AppendLine($"Factura: {ticket.NumeroFactura}");
                sb.AppendLine($"CAI: {ticket.Cai}");
                sb.AppendLine($"Rango: {ticket.RangoInicio} - {ticket.RangoFin}");
                sb.AppendLine($"Fecha limite: {(ticket.FechaLimiteEmision.HasValue ? ticket.FechaLimiteEmision.Value.ToString("dd/MM/yyyy") : "-")}");
            }

            sb.AppendLine("------------------------------");

            foreach (var item in ticket.Detalles)
            {
                sb.AppendLine(item.Producto);

                sb.AppendLine(
                    $"{item.Cantidad} x {item.PrecioUnitario:N2} = {item.Subtotal:N2}"
                );
            }

            sb.AppendLine("------------------------------");
            sb.AppendLine($"Subtotal: {ticket.Subtotal:N2}");
            sb.AppendLine($"Desc: {ticket.Descuento:N2}");
            sb.AppendLine($"Imp: {ticket.Impuesto:N2}");
            sb.AppendLine($"TOTAL: {ticket.Total:N2}");
            sb.AppendLine("------------------------------");

            if (!string.IsNullOrWhiteSpace(ticket.Observacion))
                sb.AppendLine($"Obs: {ticket.Observacion}");

            sb.AppendLine("");
            sb.AppendLine("  Gracias por su compra");
            sb.AppendLine("\n\n");

            return sb.ToString();
        }
    }
}
