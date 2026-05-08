using Pinecos.DTOs;
using Pinecos.Models;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Pinecos.Documents
{
    public class CotizacionDocument : IDocument
    {
        private readonly CotizacionResponseDto _cotizacion;
        private readonly ConfiguracionNegocio _config;
        private readonly string? _logoPath;

        public CotizacionDocument(CotizacionResponseDto cotizacion, ConfiguracionNegocio config, string? logoPath)
        {
            _cotizacion = cotizacion;
            _config = config;
            _logoPath = logoPath;
        }

        public DocumentMetadata GetMetadata() => DocumentMetadata.Default;

        public void Compose(IDocumentContainer container)
        {
            var moneda = string.IsNullOrWhiteSpace(_config.Moneda) ? "L" : _config.Moneda.Trim();

            container.Page(page =>
            {
                page.Size(PageSizes.Letter);
                page.Margin(36);
                page.DefaultTextStyle(x => x.FontSize(9).FontFamily("Arial"));

                page.Content().Column(column =>
                {
                    column.Item().Row(row =>
                    {
                        row.RelativeItem().Height(76).Element(Logo);
                        row.RelativeItem().AlignRight().Column(info =>
                        {
                            info.Item().Text(_config.Nombre_Negocio ?? string.Empty).Bold().FontSize(12);
                            info.Item().Text($"Telefono: {_config.Telefono}");
                            if (!string.IsNullOrWhiteSpace(_config.Correo_Negocio))
                                info.Item().Text($"Correo: {_config.Correo_Negocio}");
                            info.Item().Text($"RTN: {_config.Rtn}");
                        });
                    });

                    column.Item().PaddingTop(12).LineHorizontal(2);
                    column.Item().PaddingTop(14).Text("Cotizacion").Bold().FontSize(20);
                    column.Item().Text($"{_cotizacion.Numero} | Fecha: {_cotizacion.Fecha:dd/MM/yyyy}").FontColor(Colors.Grey.Darken2);

                    if (_cotizacion.Estado.Equals("ANULADA", StringComparison.OrdinalIgnoreCase))
                    {
                        column.Item().PaddingTop(8).Background(Colors.Red.Lighten4).Border(1).BorderColor(Colors.Red.Darken2)
                            .Padding(8).AlignCenter().Text("ANULADA").FontColor(Colors.Red.Darken3).Bold().FontSize(14);
                    }

                    column.Item().PaddingTop(16).Row(row =>
                    {
                        row.RelativeItem().Border(1).BorderColor(Colors.Grey.Lighten1).Padding(10).Column(box =>
                        {
                            box.Item().Text("NEGOCIO").Bold().FontSize(8).FontColor(Colors.Grey.Darken2);
                            box.Item().Text(_config.Nombre_Negocio ?? string.Empty).Bold();
                            box.Item().Text($"RTN: {_config.Rtn}");
                            box.Item().Text($"Direccion: {_config.Direccion}");
                        });
                        row.ConstantItem(18);
                        row.RelativeItem().Border(1).BorderColor(Colors.Grey.Lighten1).Padding(10).Column(box =>
                        {
                            box.Item().Text("CLIENTE").Bold().FontSize(8).FontColor(Colors.Grey.Darken2);
                            box.Item().Text(_cotizacion.Cliente_Nombre).Bold();
                            box.Item().Text($"RTN: {_cotizacion.Cliente_Rtn}");
                            box.Item().Text($"Direccion: {_cotizacion.Cliente_Direccion}");
                            box.Item().Text($"Telefono: {_cotizacion.Cliente_Telefono}");
                        });
                    });

                    column.Item().PaddingTop(16).Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.ConstantColumn(70);
                            columns.RelativeColumn();
                            columns.ConstantColumn(95);
                            columns.ConstantColumn(95);
                        });

                        table.Header(header =>
                        {
                            HeaderCell(header.Cell(), "CANTIDAD");
                            HeaderCell(header.Cell(), "DESCRIPCION");
                            HeaderCell(header.Cell().AlignRight(), "PRECIO UNIT.");
                            HeaderCell(header.Cell().AlignRight(), "TOTAL");
                        });

                        foreach (var d in _cotizacion.Detalles.OrderBy(x => x.Orden))
                        {
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(7).AlignCenter().Text(d.Cantidad.ToString("N2"));
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(7).Text(d.Descripcion);
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(7).AlignRight().Text($"{moneda} {d.Precio_Unitario:N2}");
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(7).AlignRight().Text($"{moneda} {d.Subtotal:N2}");
                        }
                    });

                    column.Item().PaddingTop(14).AlignRight().Width(230).Column(totals =>
                    {
                        TotalLine(totals, "Subtotal", _cotizacion.Subtotal, moneda, false);
                        TotalLine(totals, "Descuento", _cotizacion.Descuento, moneda, false);
                        TotalLine(totals, "Impuesto", _cotizacion.Impuesto, moneda, false);
                        TotalLine(totals, "Total", _cotizacion.Total, moneda, true);
                    });

                    if (!string.IsNullOrWhiteSpace(_cotizacion.Observacion))
                    {
                        column.Item().PaddingTop(20).LineHorizontal(1);
                        column.Item().PaddingTop(8).Text("Observaciones").Bold();
                        column.Item().Text(_cotizacion.Observacion);
                    }
                });
            });
        }

        private void Logo(IContainer container)
        {
            if (!string.IsNullOrWhiteSpace(_logoPath) && File.Exists(_logoPath))
                container.AlignLeft().Image(_logoPath).FitArea();
            else
                container.Border(1).BorderColor(Colors.Grey.Darken2).AlignCenter().AlignMiddle().Text("PINECOS").Bold().FontSize(16);
        }

        private static void HeaderCell(IContainer container, string text)
        {
            container.Background(Colors.Grey.Darken4).Padding(7).Text(text).FontColor(Colors.White).Bold().FontSize(8);
        }

        private static void TotalLine(ColumnDescriptor column, string label, decimal amount, string moneda, bool final)
        {
            column.Item().Row(row =>
            {
                var labelText = row.RelativeItem().Text(label);
                var amountText = row.RelativeItem().AlignRight().Text($"{moneda} {amount:N2}");
                if (final)
                {
                    labelText.Bold();
                    amountText.Bold();
                }
            });
        }
    }
}
