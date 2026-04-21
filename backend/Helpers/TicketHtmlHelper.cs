using Pinecos.DTOs;
using System.Text;

namespace Pinecos.Helpers
{
    public static class TicketHtmlHelper
    {
        private static string Esc(string? value)
        {
            return System.Net.WebUtility.HtmlEncode(value ?? string.Empty);
        }

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

            if (ticket.EsFacturaCai)
            {
                var ciudadFecha = string.IsNullOrWhiteSpace(ticket.CiudadFechaFactura)
                    ? ticket.Fecha.ToString("dd/MM/yyyy")
                    : $"{Esc(ticket.CiudadFechaFactura)}, {ticket.Fecha:dd/MM/yyyy}";

                var fechaLimStr = ticket.FechaLimiteEmision.HasValue
                    ? ticket.FechaLimiteEmision.Value.ToString("dd/MM/yyyy")
                    : "—";

                var pieTexto = string.IsNullOrWhiteSpace(ticket.PieFactura)
                    ? "La factura es beneficio de todos. Exijala."
                    : ticket.PieFactura;

                var leyendaBloque = string.IsNullOrWhiteSpace(ticket.LeyendaSar)
                    ? string.Empty
                    : $@"<div class='cai-leyenda-sar'><div class='cai-leyenda-titulo'>LEYENDA</div><div>{Esc(ticket.LeyendaSar)}</div></div>";

                sb.Append($@"
<!DOCTYPE html>
<html lang='es'>
<head>
  <meta charset='UTF-8'>
  <title>Factura {Esc(ticket.NumeroFactura)}</title>
  <style>
    body {{ font-family: 'Segoe UI', Arial, Helvetica, sans-serif; font-size: 11.5px; margin: 0; padding: 0; color: #111; }}
    .sheet {{ width: 210mm; margin: 0 auto; padding: 8mm 10mm; box-sizing: border-box; }}
    .center {{ text-align: center; }}
    .row {{ display:flex; justify-content:space-between; gap:12px; flex-wrap: wrap; }}
    .line {{ border-top:1px solid #222; margin: 6px 0; }}
    table {{ width:100%; border-collapse: collapse; }}
    th, td {{ border:1px solid #222; padding:4px 5px; vertical-align: top; }}
    .num {{ text-align: right; white-space: nowrap; }}
    .small {{ font-size: 10.5px; }}
    .doc-fiscal {{ font-size: 11px; font-weight: 800; letter-spacing: 0.06em; }}
    .doc-original {{ font-size: 10px; margin-top: 2px; color: #333; }}
    .no-control {{ font-family: Consolas, 'Courier New', monospace; font-size: 15px; font-weight: 800; margin: 6px 0; letter-spacing: 0.02em; }}
    .cai-caja {{ border: 2px solid #111; padding: 8px 10px; margin: 8px 0; background: #fafafa; }}
    .cai-caja .fila {{ margin: 3px 0; font-size: 10.5px; }}
    .cai-caja .etq {{ font-weight: 700; display: inline-block; min-width: 9.2em; }}
    .cai-leyenda-sar {{ border: 1px dashed #444; padding: 6px 8px; margin: 8px 0; font-size: 10px; text-align: justify; line-height: 1.35; }}
    .cai-leyenda-titulo {{ font-weight: 800; font-size: 9px; letter-spacing: 0.12em; margin-bottom: 4px; color: #333; }}
    .imprenta-block {{ font-size: 10px; margin-top: 6px; padding: 6px; border: 1px solid #bbb; background: #fff; }}
    .pie-fiscal {{ margin-top: 10px; text-align: center; font-size: 10px; font-weight: 600; }}
    @media print {{
      @page {{ size: letter; margin: 8mm; }}
    }}
  </style>
</head>
<body>
  <div class='sheet'>
    {logoHtml}
    <div class='center doc-fiscal'>DOCUMENTO FISCAL (SAR)</div>
    <div class='center doc-original'>FACTURA ORIGINAL — CLIENTE</div>
    <div class='center no-control'>No. CONTROL: {Esc(ticket.NumeroFactura)}</div>
    <div class='center'><strong>{Esc(ticket.NombreNegocio)}</strong></div>
    <div class='center small'>{Esc(ticket.DireccionNegocio)}</div>
    <div class='center small'>RTN: {Esc(ticket.RtnNegocio)} | Tel: {Esc(ticket.TelefonoNegocio)} {(string.IsNullOrWhiteSpace(ticket.CorreoNegocio) ? "" : $"| Email: {Esc(ticket.CorreoNegocio)}")}</div>
    <div class='line'></div>
    <div class='row'>
      <div><strong>Cliente:</strong> {Esc(ticket.NombreCliente)}</div>
      <div><strong>CAI vigente</strong> (ver recuadro abajo)</div>
    </div>
    <div class='row'>
      <div><strong>Direccion:</strong> {Esc(ticket.DireccionCliente)}</div>
      <div><strong>RTN / Identidad:</strong> {Esc(string.IsNullOrWhiteSpace(ticket.RtnCliente) ? ticket.IdentidadCliente : ticket.RtnCliente)}</div>
    </div>
    <div class='row'>
      <div><strong>Lugar y fecha de emision:</strong> {ciudadFecha}</div>
      <div><strong>Condicion de pago:</strong> {Esc(ticket.CondicionPago)}</div>
    </div>
    <div class='line'></div>
    <table>
      <thead>
        <tr>
          <th>Cantidad</th>
          <th>Descripcion</th>
          <th class='num'>Precio Unitario</th>
          <th class='num'>Descuentos / Rebajas</th>
          <th class='num'>Total Lps.</th>
        </tr>
      </thead>
      <tbody>");

                foreach (var item in ticket.Detalles)
                {
                    var nombre = item.Producto;
                    if (!string.IsNullOrWhiteSpace(item.Presentacion))
                        nombre += $" ({item.Presentacion})";

                    sb.Append($@"
        <tr>
          <td class='num'>{item.Cantidad}</td>
          <td>{Esc(nombre)}</td>
          <td class='num'>{item.PrecioUnitario:N2}</td>
          <td class='num'>0.00</td>
          <td class='num'>{item.Subtotal:N2}</td>
        </tr>");
                }

                sb.Append($@"
      </tbody>
    </table>
    <div class='row' style='margin-top:8px;'>
      <div style='width:60%;'>
        <div><strong>Valor en letras:</strong> {Esc(ticket.TotalEnLetras)}</div>
        <div class='small'><strong>Datos de exento/exonerado:</strong></div>
        <div class='small'>N° Orden Compra Exenta: {Esc(ticket.NumeroOrdenCompraExenta)}</div>
        <div class='small'>N° Constancia Registro Exonerado: {Esc(ticket.NumeroConstanciaRegistroExonerado)}</div>
        <div class='small'>N° Registro SAG: {Esc(ticket.NumeroRegistroSag)}</div>
      </div>
      <div style='width:38%;'>
        <table>
          <tr><td>Importe Exento</td><td class='num'>{ticket.ImporteExento:N2}</td></tr>
          <tr><td>Importe Exonerado</td><td class='num'>{ticket.ImporteExonerado:N2}</td></tr>
          <tr><td>Importe Gravado 15%</td><td class='num'>{ticket.ImporteGravado15:N2}</td></tr>
          <tr><td>Importe Gravado 18%</td><td class='num'>{ticket.ImporteGravado18:N2}</td></tr>
          <tr><td>ISV 15%</td><td class='num'>{ticket.Isv15:N2}</td></tr>
          <tr><td>ISV 18%</td><td class='num'>{ticket.Isv18:N2}</td></tr>
          <tr><td><strong>Total L.</strong></td><td class='num'><strong>{ticket.Total:N2}</strong></td></tr>
        </table>
      </div>
    </div>
    <div class='line'></div>
    <div class='cai-caja'>
      <div class='fila'><span class='etq'>C.A.I.</span> {Esc(ticket.Cai)}</div>
      <div class='fila'><span class='etq'>Rango autorizado</span> {Esc(ticket.RangoInicio)} <strong>al</strong> {Esc(ticket.RangoFin)}</div>
      <div class='fila'><span class='etq'>Fecha limite emision</span> {fechaLimStr}</div>
    </div>
    {leyendaBloque}
    <div class='imprenta-block'>
      <div><strong>Datos de imprenta / autorizacion</strong></div>
      <div class='small'>Nombre: {Esc(ticket.NombreImprenta)}</div>
      <div class='small'>RTN imprenta: {Esc(ticket.RtnImprenta)}</div>
      <div class='small'>No. registro / certificado: {Esc(ticket.NumeroCertificadoImprenta)}</div>
    </div>
    <div class='pie-fiscal'>{Esc(pieTexto)}</div>
  </div>
</body>
</html>");

                return sb.ToString();
            }

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
