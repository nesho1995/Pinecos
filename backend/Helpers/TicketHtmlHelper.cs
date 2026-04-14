using Pinecos.DTOs;
using System.Text;

namespace Pinecos.Helpers
{
    public static class TicketHtmlHelper
    {
        public static string Generar(
            TicketVentaDto ticket,
            string nombreNegocio,
            string direccion,
            string telefono,
            string mensajeTicket,
            string anchoTicket,
            string logoUrl,
            string moneda)
        {
            var sb = new StringBuilder();

            var logoHtml = string.IsNullOrWhiteSpace(logoUrl)
                ? ""
                : $"<div class='center'><img src='{logoUrl}' style='max-width:180px; max-height:80px;' /></div>";

            sb.Append($@"
<!DOCTYPE html>
<html lang='es'>
<head>
    <meta charset='UTF-8'>
    <title>Ticket Venta #{ticket.IdVenta}</title>
    <style>
        body {{
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
            margin: 0;
            padding: 0;
            width: {anchoTicket};
        }}

        .ticket {{
            width: {anchoTicket};
            padding: 8px;
            box-sizing: border-box;
        }}

        .center {{
            text-align: center;
        }}

        .bold {{
            font-weight: bold;
        }}

        .line {{
            border-top: 1px dashed #000;
            margin: 6px 0;
        }}

        .row {{
            display: flex;
            justify-content: space-between;
            gap: 8px;
        }}

        .small {{
            font-size: 11px;
        }}

        .product {{
            margin-top: 6px;
        }}

        .totals {{
            margin-top: 8px;
        }}

        @media print {{
            body {{
                width: {anchoTicket};
            }}

            .no-print {{
                display: none;
            }}

            @page {{
                size: {anchoTicket} auto;
                margin: 2mm;
            }}
        }}

        .print-btn {{
            margin: 10px;
            padding: 8px 14px;
            border: 1px solid #333;
            background: #f5f5f5;
            cursor: pointer;
        }}
    </style>
</head>
<body>
    <button class='print-btn no-print' onclick='window.print()'>Imprimir</button>

    <div class='ticket'>
        {logoHtml}
        <div class='center bold'>{nombreNegocio}</div>
        <div class='center small'>{ticket.Sucursal}</div>
        <div class='center small'>{direccion}</div>
        <div class='center small'>{telefono}</div>
        <div class='center small'>Ticket Venta #{ticket.IdVenta}</div>

        <div class='line'></div>

        <div class='small'>Fecha: {ticket.Fecha:dd/MM/yyyy HH:mm}</div>
        <div class='small'>Cajero: {ticket.Cajero}</div>
        <div class='small'>Pago: {ticket.MetodoPago}</div>
        <div class='small'>CAI sucursal: {(ticket.CaiHabilitadoSucursal ? "ACTIVO" : "INACTIVO")}</div>
        <div class='small'>Sucursal ticket: {ticket.Sucursal}</div>
");

            if (ticket.CaiHabilitadoSucursal && !string.IsNullOrWhiteSpace(ticket.CaiSucursalConfigurado))
            {
                sb.Append($@"
        <div class='small'>CAI configurado: {ticket.CaiSucursalConfigurado}</div>
");
            }

            if (ticket.EsFacturaCai)
            {
                sb.Append($@"
        <div class='line'></div>
        <div class='small bold center'>DOCUMENTO FISCAL SAR</div>
        <div class='small'>Factura: {ticket.NumeroFactura}</div>
        <div class='small'>CAI: {ticket.Cai}</div>
        <div class='small'>Rango: {ticket.RangoInicio} - {ticket.RangoFin}</div>
        <div class='small'>Fecha limite: {(ticket.FechaLimiteEmision.HasValue ? ticket.FechaLimiteEmision.Value.ToString("dd/MM/yyyy") : "-")}</div>
");
            }

            if (!string.IsNullOrWhiteSpace(ticket.Observacion))
            {
                sb.Append($"<div class='small'>Obs: {ticket.Observacion}</div>");
            }

            sb.Append("<div class='line'></div>");

            foreach (var item in ticket.Detalles)
            {
                var nombre = item.Producto;
                if (!string.IsNullOrWhiteSpace(item.Presentacion))
                    nombre += $" ({item.Presentacion})";

                sb.Append($@"
        <div class='product'>
            <div class='small bold'>{nombre}</div>
            <div class='row small'>
                <span>{item.Cantidad} x {moneda} {item.PrecioUnitario:N2}</span>
                <span>{moneda} {item.Subtotal:N2}</span>
            </div>
        </div>
");
            }

            sb.Append($@"
        <div class='line'></div>

        <div class='totals'>
            <div class='row small'><span>Subtotal</span><span>{moneda} {ticket.Subtotal:N2}</span></div>
            <div class='row small'><span>Descuento</span><span>{moneda} {ticket.Descuento:N2}</span></div>
            <div class='row small'><span>Impuesto</span><span>{moneda} {ticket.Impuesto:N2}</span></div>
            <div class='row bold'><span>TOTAL</span><span>{moneda} {ticket.Total:N2}</span></div>
        </div>

        <div class='line'></div>

        <div class='center small'>{mensajeTicket}</div>
    </div>
</body>
</html>
");

            return sb.ToString();
        }
    }
}
