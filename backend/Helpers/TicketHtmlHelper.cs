using Pinecos.DTOs;
using System.Text;
using System.Text.RegularExpressions;

namespace Pinecos.Helpers
{
    public static class TicketHtmlHelper
    {
        /// <summary>
        /// Tickets térmicos (58–80 mm): la plantilla CAI en 210 mm cortaba el lado derecho al imprimir.
        /// </summary>
        private static bool EsFormatoEstrecho(string? anchoTicket)
        {
            if (string.IsNullOrWhiteSpace(anchoTicket)) return false;
            var m = Regex.Match(anchoTicket.Trim(), @"(\d+)\s*mm", RegexOptions.IgnoreCase);
            if (!m.Success || !int.TryParse(m.Groups[1].Value, out var mm)) return false;
            return mm is >= 40 and <= 99;
        }

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

            var anchoTicketTrim = string.IsNullOrWhiteSpace(anchoTicket) ? "72mm" : anchoTicket.Trim();
            var ticketThermal = EsFormatoEstrecho(anchoTicket);

            var logoImgStyle = ticketThermal
                ? "max-width:100%;max-height:52px;height:auto;"
                : "max-width:180px;max-height:80px;";
            var logoHtml = string.IsNullOrWhiteSpace(logoUrl)
                ? ""
                : $"<div class='center'><img src='{Esc(logoUrl)}' alt='' style='{logoImgStyle}' /></div>";

            if (ticket.EsFacturaCai)
            {
                var cult = System.Globalization.CultureInfo.GetCultureInfo("es-HN");
                string L(decimal d) => d.ToString("N2", cult);

                var ciudadFecha = string.IsNullOrWhiteSpace(ticket.CiudadFechaFactura)
                    ? ticket.Fecha.ToString("dd/MM/yyyy", cult)
                    : $"{Esc(ticket.CiudadFechaFactura)}, {ticket.Fecha.ToString("dd/MM/yyyy", cult)}";

                var fechaLimStr = ticket.FechaLimiteEmision.HasValue
                    ? ticket.FechaLimiteEmision.Value.ToString("dd/MM/yyyy", cult)
                    : "—";

                var pieTexto = string.IsNullOrWhiteSpace(ticket.PieFactura)
                    ? "La Factura es Beneficio de Todos. Exijala."
                    : ticket.PieFactura;

                var pieFinal = pieTexto.Trim();
                if (pieFinal.IndexOf("modalidad", StringComparison.OrdinalIgnoreCase) < 0)
                {
                    pieFinal = pieFinal.TrimEnd('.') + " | Modalidad: Impresión por imprenta.";
                }

                var fv = ticket.Fecha;
                var esCredito = string.Equals(ticket.CondicionPago, "CREDITO", StringComparison.OrdinalIgnoreCase);
                var chkCont = esCredito ? "\u2610" : "\u2611";
                var chkCred = esCredito ? "\u2611" : "\u2610";

                var leyendaBloque = string.IsNullOrWhiteSpace(ticket.LeyendaSar)
                    ? string.Empty
                    : $@"<div class='cai-leyenda-sar'><div class='cai-leyenda-titulo'>LEYENDA AUTORIZADA</div><div>{Esc(ticket.LeyendaSar)}</div></div>";

                var textoAnul = string.IsNullOrWhiteSpace(ticket.TextoBannerAnulacion)
                    ? "VENTA ANULADA EN SISTEMA"
                    : ticket.TextoBannerAnulacion;
                var bannerAnulacionHtml = ticket.EsAnulada
                    ? $"<div class='anulacion-banner'>{Esc(textoAnul)}</div>"
                    : string.Empty;

                var formatoEstrecho = ticketThermal;
                var anchoSheet = formatoEstrecho ? anchoTicketTrim : "210mm";

                var filasDetSb = new StringBuilder();
                foreach (var item in ticket.Detalles)
                {
                    var nombreItem = item.Producto;
                    if (!string.IsNullOrWhiteSpace(item.Presentacion))
                        nombreItem += $" ({item.Presentacion})";

                    if (formatoEstrecho)
                    {
                        filasDetSb.Append($@"
        <tr>
          <td class='num'>{item.Cantidad}</td>
          <td>{Esc(nombreItem)}</td>
          <td class='num'>L {L(item.PrecioUnitario)}</td>
          <td class='num'>L {L(item.Subtotal)}</td>
        </tr>");
                    }
                    else
                    {
                        filasDetSb.Append($@"
        <tr>
          <td class='num'>{item.Cantidad}</td>
          <td>{Esc(nombreItem)}</td>
          <td class='num'>L. {L(item.PrecioUnitario)}</td>
          <td class='num'>L. 0.00</td>
          <td class='num'>L. {L(item.Subtotal)}</td>
        </tr>");
                    }
                }

                var tablaHead = formatoEstrecho
                    ? @"<tr>
          <th class='num'>CANT</th>
          <th>DESCRIPCION</th>
          <th class='num'>P.U.</th>
          <th class='num'>TOTAL</th>
        </tr>"
                    : @"<tr>
          <th>CANTIDAD</th>
          <th>DESCRIPCIÓN</th>
          <th class='num'>PRECIO UNITARIO</th>
          <th class='num'>DESC. Y REBAJAS OTORGADAS</th>
          <th class='num'>TOTAL L.</th>
        </tr>";

                var bloqueTotales = formatoEstrecho
                    ? $@"
    <div class='totales-estrecho'>
      <table class='tbl-mini'>
        <tr><td>IMPORTE EXONERADO</td><td class='num'>L {L(ticket.ImporteExonerado)}</td></tr>
        <tr><td>IMPORTE EXENTO</td><td class='num'>L {L(ticket.ImporteExento)}</td></tr>
        <tr><td>IMPORTE GRAVADO 15%</td><td class='num'>L {L(ticket.ImporteGravado15)}</td></tr>
        <tr><td>IMPORTE GRAVADO 18%</td><td class='num'>L {L(ticket.ImporteGravado18)}</td></tr>
        <tr><td>I.S.V. 15%</td><td class='num'>L {L(ticket.Isv15)}</td></tr>
        <tr><td>I.S.V. 18%</td><td class='num'>L {L(ticket.Isv18)}</td></tr>
        <tr><td><strong>TOTAL</strong></td><td class='num'><strong>L {L(ticket.Total)}</strong></td></tr>
      </table>
      <div class='small' style='margin-top:8px;'><strong>Valor en letras:</strong> {Esc(ticket.TotalEnLetras)}</div>
      <div class='small' style='margin-top:6px;'><strong>Datos adquiriente exonerado</strong></div>
      <div class='small'>OC exenta: {Esc(ticket.NumeroOrdenCompraExenta)}</div>
      <div class='small'>Const. registro: {Esc(ticket.NumeroConstanciaRegistroExonerado)}</div>
      <div class='small'>Reg. SAG: {Esc(ticket.NumeroRegistroSag)}</div>
    </div>"
                    : $@"
    <div class='row' style='margin-top:8px; align-items:flex-start;'>
      <div style='flex:1; min-width:55%;'>
        <div><strong>Valor en letras:</strong> {Esc(ticket.TotalEnLetras)}</div>
        <div class='small' style='margin-top:8px;'><strong>Datos del adquiriente exonerado</strong></div>
        <div class='small'>No. correlativo de orden de compra exenta: {Esc(ticket.NumeroOrdenCompraExenta)}</div>
        <div class='small'>No. correlativo de constancia de registro exonerado: {Esc(ticket.NumeroConstanciaRegistroExonerado)}</div>
        <div class='small'>No. identificativo del registro de la SAG: {Esc(ticket.NumeroRegistroSag)}</div>
      </div>
      <div style='flex:1; min-width:38%; max-width:42%;'>
        <table>
          <tr><td>IMPORTE EXONERADO</td><td class='num'>L. {L(ticket.ImporteExonerado)}</td></tr>
          <tr><td>IMPORTE EXENTO</td><td class='num'>L. {L(ticket.ImporteExento)}</td></tr>
          <tr><td>IMPORTE GRAVADO 15%</td><td class='num'>L. {L(ticket.ImporteGravado15)}</td></tr>
          <tr><td>IMPORTE GRAVADO 18%</td><td class='num'>L. {L(ticket.ImporteGravado18)}</td></tr>
          <tr><td>I.S.V. 15%</td><td class='num'>L. {L(ticket.Isv15)}</td></tr>
          <tr><td>I.S.V. 18%</td><td class='num'>L. {L(ticket.Isv18)}</td></tr>
          <tr><td><strong>TOTAL</strong></td><td class='num'><strong>L. {L(ticket.Total)}</strong></td></tr>
        </table>
      </div>
    </div>";

                var cssEstrecho = formatoEstrecho
                    ? $@"
    * {{ box-sizing: border-box; }}
    html, body {{ overflow-x: hidden; max-width: 100%; }}
    img {{ max-width: 100% !important; height: auto; }}
    body {{ font-size: 9.5px; }}
    .sheet {{ width: {anchoSheet}; max-width: 100%; margin: 0 auto; padding: 3mm 2mm; }}
    .row {{ flex-direction: column; gap: 4px; align-items: stretch; }}
    .row > div {{ min-width: 0 !important; max-width: 100% !important; flex: none !important; }}
    table {{ table-layout: fixed; word-break: break-word; }}
    th, td {{ padding: 2px 3px !important; font-size: 8.5px; overflow-wrap: anywhere; }}
    th:nth-child(2), td:nth-child(2) {{ word-break: break-word; }}
    .cai-caja .etq {{ min-width: 5.5em !important; }}
    .sheet--estrecho .num {{ white-space: normal !important; }}
    .totales-estrecho {{ margin-top: 8px; }}
    .totales-estrecho .tbl-mini {{ width: 100%; border-collapse: collapse; font-size: 8.5px; }}
    .totales-estrecho .tbl-mini td {{ border: 1px solid #222; padding: 2px 4px !important; vertical-align: top; }}
    .totales-estrecho .tbl-mini td:first-child {{ word-break: break-word; }}
    @media print {{
      @page {{ size: {anchoSheet} auto; margin: 1mm 1.5mm; }}
    }}"
                    : $@"
    @media print {{
      @page {{ size: letter; margin: 8mm; }}
    }}";

                var cssBase = $@"
    * {{ box-sizing: border-box; }}
    body {{ font-family: 'Segoe UI', Arial, Helvetica, sans-serif; font-size: 11.5px; margin: 0; padding: 0; color: #111; }}
    .sheet {{ width: {anchoSheet}; margin: 0 auto; padding: 8mm 10mm; box-sizing: border-box; max-width: 100%; }}
    .center {{ text-align: center; }}
    .row {{ display:flex; justify-content:space-between; gap:12px; flex-wrap: wrap; }}
    .line {{ border-top:1px solid #222; margin: 6px 0; }}
    table {{ width:100%; border-collapse: collapse; }}
    th, td {{ border:1px solid #222; padding:4px 5px; vertical-align: top; overflow-wrap: anywhere; word-break: break-word; }}
    .num {{ text-align: right; white-space: nowrap; }}
    .small {{ font-size: 10.5px; }}
    .titulo-factura {{ font-size: 14px; font-weight: 900; letter-spacing: 0.12em; margin-top: 6px; }}
    .no-factura {{ font-family: Consolas, 'Courier New', monospace; font-size: 13px; font-weight: 800; margin: 4px 0; }}
    .cai-header {{ font-family: Consolas, 'Courier New', monospace; font-size: 10.5px; margin: 4px 0; }}
    .fecha-emision {{ margin: 6px 0; font-size: 11px; }}
    .pago-tipo {{ margin: 4px 0; font-size: 11px; }}
    .cai-caja {{ border: 2px solid #111; padding: 8px 10px; margin: 8px 0; background: #fafafa; }}
    .cai-caja .fila {{ margin: 3px 0; font-size: 10.5px; }}
    .cai-caja .etq {{ font-weight: 700; display: inline-block; min-width: 10.5em; }}
    .cai-leyenda-sar {{ border: 1px dashed #444; padding: 6px 8px; margin: 8px 0; font-size: 10px; text-align: justify; line-height: 1.35; }}
    .cai-leyenda-titulo {{ font-weight: 800; font-size: 9px; letter-spacing: 0.12em; margin-bottom: 4px; color: #333; }}
    .imprenta-block {{ font-size: 10px; margin-top: 6px; padding: 6px; border: 1px solid #bbb; background: #fff; }}
    .pie-fiscal {{ margin-top: 10px; text-align: center; font-size: 10px; font-weight: 600; }}
    .firma-linea {{ margin-top: 28px; border-top: 1px solid #222; width: 55%; margin-left: auto; margin-right: auto; padding-top: 4px; text-align: center; font-size: 10px; }}
    .anulacion-banner {{ border: 3px solid #b91c1c; background: #fee2e2; color: #7f1d1d; padding: 10px 12px; margin: 8px 0 10px; text-align: center; font-weight: 800; font-size: 10.5px; line-height: 1.35; }}";

                sb.Append($@"
<!DOCTYPE html>
<html lang='es'>
<head>
  <meta charset='UTF-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1' />
  <title>Factura {Esc(ticket.NumeroFactura)}</title>
  <style>
{cssBase}
{cssEstrecho}
  </style>
</head>
<body>
  <div class='sheet {(formatoEstrecho ? "sheet--estrecho" : "")}'>
    {bannerAnulacionHtml}
    {logoHtml}
    <div class='center'><strong>{Esc(ticket.NombreNegocio)}</strong></div>
    <div class='center small'>{Esc(ticket.DireccionNegocio)}</div>
    <div class='center small'>R.T.N.: {Esc(ticket.RtnNegocio)} | Tel.: {Esc(ticket.TelefonoNegocio)}{(string.IsNullOrWhiteSpace(ticket.CorreoNegocio) ? "" : $" | E-mail: {Esc(ticket.CorreoNegocio)}")}</div>
    <div class='center cai-header'><strong>C.A.I.:</strong> {Esc(ticket.Cai)}</div>
    <div class='line'></div>
    <div class='center titulo-factura'>FACTURA</div>
    <div class='center no-factura'>N° {Esc(ticket.NumeroFactura)}</div>
    <div class='fecha-emision center'><strong>Fecha de emisión:</strong> DÍA: {fv.Day} &nbsp; MES: {fv.Month:00} &nbsp; AÑO: {fv.Year}</div>
    <div class='pago-tipo center'><strong>Forma de pago:</strong> {chkCont} CONTADO &nbsp;&nbsp; {chkCred} CRÉDITO</div>
    <div class='line'></div>
    <div class='row'>
      <div style='flex:1; min-width:48%'><strong>Cliente:</strong> {Esc(ticket.NombreCliente)}</div>
      <div style='flex:1; min-width:48%'><strong>R.T.N.:</strong> {Esc(ticket.RtnCliente)}</div>
    </div>
    <div class='row'>
      <div style='flex:1; min-width:48%'><strong>Dirección:</strong> {Esc(ticket.DireccionCliente)}</div>
      <div style='flex:1; min-width:48%'><strong>Tel.:</strong> {Esc(ticket.TelefonoCliente)}</div>
    </div>
    <div class='small' style='margin-top:4px;'><strong>Lugar y fecha (ciudad):</strong> {ciudadFecha}</div>
    <div class='line'></div>
    <table>
      <thead>
        {tablaHead}
      </thead>
      <tbody>{filasDetSb.ToString()}</tbody>
    </table>
    {bloqueTotales}
    <div class='line'></div>
    <div class='cai-caja'>
      <div class='fila'><span class='etq'>C.A.I.</span> {Esc(ticket.Cai)}</div>
      <div class='fila'><span class='etq'>Rango autorizado</span> Del {Esc(ticket.RangoInicio)} Al {Esc(ticket.RangoFin)}</div>
      <div class='fila'><span class='etq'>Fecha límite de emisión</span> {fechaLimStr}</div>
    </div>
    {leyendaBloque}
    <div class='imprenta-block'>
      <div><strong>Datos de imprenta / autorización</strong></div>
      <div class='small'>Nombre: {Esc(ticket.NombreImprenta)}</div>
      <div class='small'>R.T.N. imprenta: {Esc(ticket.RtnImprenta)}</div>
      <div class='small'>No. registro / certificado: {Esc(ticket.NumeroCertificadoImprenta)}</div>
    </div>
    <div class='pie-fiscal'>{Esc(pieFinal)}</div>
    <div class='firma-linea'>FIRMA AUTORIZADA</div>
  </div>
</body>
</html>");

                return sb.ToString();
            }

            var textoAnulTicket = string.IsNullOrWhiteSpace(ticket.TextoBannerAnulacion)
                ? "VENTA ANULADA EN SISTEMA"
                : ticket.TextoBannerAnulacion;
            var bannerTicket = ticket.EsAnulada
                ? $"<div style='border:2px solid #b91c1c;background:#fee2e2;color:#7f1d1d;padding:8px;margin-bottom:8px;text-align:center;font-weight:800;font-size:11px;'>{Esc(textoAnulTicket)}</div>"
                : string.Empty;

            var cssTicketSimplePrint = ticketThermal
                ? $@"
            @media print {{
                body {{ width: {anchoTicketTrim}; max-width: 100%; }}
                .no-print {{ display: none; }}
                @page {{
                    size: {anchoTicketTrim} auto;
                    margin: 0.5mm 1mm;
                }}
            }}"
                : $@"
            @media print {{
                body {{ width: {anchoTicketTrim}; max-width: 100%; }}
                .no-print {{ display: none; }}
                @page {{
                    size: {anchoTicketTrim} auto;
                    margin: 2mm;
                }}
            }}";

            var cssTicketSimpleThermal = ticketThermal
                ? $@"
        body {{ font-size: 10.5px; }}
        .ticket {{
            padding: 3px 4px;
            overflow-wrap: anywhere;
            word-break: break-word;
        }}
        .small {{ font-size: 10px; }}
        .row {{
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            column-gap: 4px;
            align-items: start;
        }}
        .row > span:first-child {{
            min-width: 0;
            overflow-wrap: anywhere;
            word-break: break-word;
        }}
        .row > span:last-child {{
            text-align: right;
            white-space: nowrap;
        }}
        .product .small.bold {{
            display: block;
            width: 100%;
            line-height: 1.25;
        }}"
                : string.Empty;

            sb.Append($@"
<!DOCTYPE html>
<html lang='es'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1' />
    <title>Ticket Venta #{ticket.IdVenta}</title>
    <style>
        *, *::before, *::after {{ box-sizing: border-box; }}
        html, body {{
            overflow-x: hidden;
            max-width: 100%;
        }}
        body {{
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
            margin: 0;
            padding: 0;
            width: {anchoTicketTrim};
            max-width: 100%;
        }}

        .ticket {{
            width: {anchoTicketTrim};
            max-width: 100%;
            margin: 0 auto;
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
{cssTicketSimpleThermal}
{cssTicketSimplePrint}

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
        {bannerTicket}
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
