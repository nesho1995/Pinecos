using System.Net;
using System.Text;
using Pinecos.DTOs;
using Pinecos.Models;

namespace Pinecos.Helpers
{
    public static class CotizacionHtmlHelper
    {
        public static string Generar(CotizacionResponseDto cotizacion, ConfiguracionNegocio config, string? logoUrlAbsoluta = null)
        {
            static string H(string? value) => WebUtility.HtmlEncode(value ?? string.Empty);
            static string Money(decimal value, string moneda) => $"{moneda} {value:N2}";

            var moneda = string.IsNullOrWhiteSpace(config.Moneda) ? "L" : config.Moneda.Trim();
            var logo = !string.IsNullOrWhiteSpace(logoUrlAbsoluta)
                ? $"<img src=\"{H(logoUrlAbsoluta)}\" alt=\"Logo\" class=\"logo\" />"
                : "<div class=\"logo-placeholder\">PINECOS</div>";

            var rows = new StringBuilder();
            foreach (var d in cotizacion.Detalles.OrderBy(x => x.Orden))
            {
                rows.Append($@"
                  <tr>
                    <td class=""qty"">{d.Cantidad:N2}</td>
                    <td>{H(d.Descripcion)}</td>
                    <td class=""money"">{Money(d.Precio_Unitario, moneda)}</td>
                    <td class=""money"">{Money(d.Subtotal, moneda)}</td>
                  </tr>");
            }

            var estado = cotizacion.Estado.Equals("ANULADA", StringComparison.OrdinalIgnoreCase)
                ? "<div class=\"stamp\">ANULADA</div>"
                : string.Empty;

            return $@"<!doctype html>
<html lang=""es"">
<head>
  <meta charset=""utf-8"" />
  <title>Cotizacion {H(cotizacion.Numero)}</title>
  <style>
    body {{ margin: 0; background: #f3f4f6; color: #111827; font-family: Arial, Helvetica, sans-serif; }}
    .page {{ width: 8.5in; min-height: 11in; box-sizing: border-box; margin: 24px auto; background: #fff; padding: 42px 46px; position: relative; box-shadow: 0 8px 30px rgba(15,23,42,.12); }}
    .top {{ display: flex; justify-content: space-between; align-items: flex-start; gap: 28px; border-bottom: 3px solid #111827; padding-bottom: 18px; }}
    .logo {{ max-width: 150px; max-height: 110px; object-fit: contain; }}
    .logo-placeholder {{ width: 150px; height: 90px; border: 2px solid #111827; display: flex; align-items: center; justify-content: center; font-weight: 800; letter-spacing: .08em; }}
    .contact {{ text-align: right; font-size: 13px; line-height: 1.45; color: #374151; }}
    h1 {{ font-size: 25px; margin: 20px 0 4px; letter-spacing: 0; }}
    .number {{ color: #6b7280; font-size: 14px; }}
    .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin: 22px 0; }}
    .box {{ border: 1px solid #d1d5db; padding: 14px 16px; min-height: 110px; }}
    .box h2 {{ font-size: 12px; margin: 0 0 10px; color: #6b7280; text-transform: uppercase; letter-spacing: .05em; }}
    .line {{ font-size: 14px; margin: 5px 0; }}
    .line strong {{ display: inline-block; min-width: 78px; color: #111827; }}
    table {{ width: 100%; border-collapse: collapse; margin-top: 18px; }}
    th {{ background: #111827; color: #fff; font-size: 12px; text-align: left; padding: 10px; text-transform: uppercase; }}
    td {{ border-bottom: 1px solid #e5e7eb; padding: 10px; font-size: 13px; vertical-align: top; }}
    .qty {{ width: 92px; text-align: center; }}
    .money {{ width: 128px; text-align: right; white-space: nowrap; }}
    .totals {{ margin-left: auto; margin-top: 18px; width: 260px; font-size: 14px; }}
    .total-row {{ display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e5e7eb; }}
    .total-row.final {{ border-bottom: 0; font-size: 18px; font-weight: 800; padding-top: 10px; }}
    .notes {{ margin-top: 28px; border-top: 1px solid #e5e7eb; padding-top: 14px; font-size: 13px; color: #374151; }}
    .stamp {{ position: absolute; top: 190px; right: 70px; transform: rotate(-12deg); border: 4px solid #b91c1c; color: #b91c1c; padding: 8px 18px; font-size: 25px; font-weight: 800; opacity: .82; }}
    @media print {{ body {{ background: #fff; }} .page {{ margin: 0; box-shadow: none; }} }}
  </style>
</head>
<body>
  <main class=""page"">
    {estado}
    <section class=""top"">
      <div>{logo}</div>
      <div class=""contact"">
        <div><strong>{H(config.Nombre_Negocio)}</strong></div>
        <div>Telefono: {H(config.Telefono)}</div>
        <div>Correo: {H(config.Correo_Negocio)}</div>
        <div>RTN: {H(config.Rtn)}</div>
      </div>
    </section>
    <h1>Cotizacion</h1>
    <div class=""number"">{H(cotizacion.Numero)} | Fecha: {cotizacion.Fecha:dd/MM/yyyy}</div>

    <section class=""grid"">
      <div class=""box"">
        <h2>Negocio</h2>
        <div class=""line""><strong>Nombre:</strong> {H(config.Nombre_Negocio)}</div>
        <div class=""line""><strong>RTN:</strong> {H(config.Rtn)}</div>
        <div class=""line""><strong>Direccion:</strong> {H(config.Direccion)}</div>
      </div>
      <div class=""box"">
        <h2>Cliente</h2>
        <div class=""line""><strong>Nombre:</strong> {H(cotizacion.Cliente_Nombre)}</div>
        <div class=""line""><strong>RTN:</strong> {H(cotizacion.Cliente_Rtn)}</div>
        <div class=""line""><strong>Direccion:</strong> {H(cotizacion.Cliente_Direccion)}</div>
        <div class=""line""><strong>Telefono:</strong> {H(cotizacion.Cliente_Telefono)}</div>
      </div>
    </section>

    <table>
      <thead>
        <tr>
          <th class=""qty"">Cantidad</th>
          <th>Descripcion</th>
          <th class=""money"">Precio unitario</th>
          <th class=""money"">Total</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>

    <section class=""totals"">
      <div class=""total-row""><span>Subtotal</span><strong>{Money(cotizacion.Subtotal, moneda)}</strong></div>
      <div class=""total-row""><span>Descuento</span><strong>{Money(cotizacion.Descuento, moneda)}</strong></div>
      <div class=""total-row""><span>Impuesto</span><strong>{Money(cotizacion.Impuesto, moneda)}</strong></div>
      <div class=""total-row final""><span>Total</span><span>{Money(cotizacion.Total, moneda)}</span></div>
    </section>

    {(string.IsNullOrWhiteSpace(cotizacion.Observacion) ? string.Empty : $@"<section class=""notes""><strong>Observaciones:</strong><br />{H(cotizacion.Observacion)}</section>")}
  </main>
</body>
</html>";
        }
    }
}
