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
                page.Margin(34);
                page.DefaultTextStyle(x => x.FontSize(9).FontFamily("Arial").FontColor("#243126"));

                page.Content().Column(column =>
                {
                    column.Item().BorderBottom(2).BorderColor("#3b6f3d").PaddingBottom(14).Row(row =>
                    {
                        row.RelativeItem().Column(left =>
                        {
                            left.Item().Height(84).Width(150).Element(Logo);
                            left.Item().PaddingTop(8).Text(_config.Nombre_Negocio ?? "Pinecos").Bold().FontSize(11).FontColor("#27492a");
                            if (!string.IsNullOrWhiteSpace(_config.Direccion))
                                left.Item().Text(_config.Direccion).FontSize(8).FontColor("#5b655d");
                        });
                        row.ConstantItem(24);
                        row.RelativeItem().AlignRight().Column(info =>
                        {
                            info.Item().Text("COTIZACION").Bold().FontSize(22).FontColor("#2f5f34");
                            info.Item().Text(_cotizacion.Numero).Bold().FontSize(11).FontColor("#111827");
                            info.Item().PaddingTop(6).Text($"Fecha: {_cotizacion.Fecha:dd/MM/yyyy}");
                            if (!string.IsNullOrWhiteSpace(_config.Correo_Negocio))
                                info.Item().Text($"Correo: {_config.Correo_Negocio}");
                            if (!string.IsNullOrWhiteSpace(_config.Telefono))
                                info.Item().Text($"Telefono: {_config.Telefono}");
                            if (!string.IsNullOrWhiteSpace(_config.Rtn))
                                info.Item().Text($"RTN: {_config.Rtn}");
                        });
                    });

                    if (_cotizacion.Estado.Equals("ANULADA", StringComparison.OrdinalIgnoreCase))
                    {
                        column.Item().PaddingTop(8).Background(Colors.Red.Lighten4).Border(1).BorderColor(Colors.Red.Darken2)
                            .Padding(8).AlignCenter().Text("ANULADA").FontColor(Colors.Red.Darken3).Bold().FontSize(14);
                    }

                    column.Item().PaddingTop(18).Row(row =>
                    {
                        row.RelativeItem().Border(1).BorderColor("#d7ddcf").Background("#fbfcf8").Padding(12).Column(box =>
                        {
                            box.Item().Text("DATOS DEL NEGOCIO").Bold().FontSize(8).FontColor("#2f5f34");
                            box.Item().Text(_config.Nombre_Negocio ?? string.Empty).Bold();
                            if (!string.IsNullOrWhiteSpace(_config.Rtn)) box.Item().Text($"RTN: {_config.Rtn}");
                            if (!string.IsNullOrWhiteSpace(_config.Direccion)) box.Item().Text($"Direccion: {_config.Direccion}");
                            if (!string.IsNullOrWhiteSpace(_config.Telefono)) box.Item().Text($"Telefono: {_config.Telefono}");
                        });
                        row.ConstantItem(18);
                        row.RelativeItem().Border(1).BorderColor("#d7ddcf").Padding(12).Column(box =>
                        {
                            box.Item().Text("DATOS DEL CLIENTE").Bold().FontSize(8).FontColor("#2f5f34");
                            box.Item().Text(_cotizacion.Cliente_Nombre).Bold();
                            box.Item().Text($"RTN: {Valor(_cotizacion.Cliente_Rtn)}");
                            box.Item().Text($"Direccion: {Valor(_cotizacion.Cliente_Direccion)}");
                            box.Item().Text($"Telefono: {Valor(_cotizacion.Cliente_Telefono)}");
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
                            HeaderCell(header.Cell().AlignCenter(), "CANT.");
                            HeaderCell(header.Cell(), "DESCRIPCION");
                            HeaderCell(header.Cell().AlignRight(), "PRECIO UNIT.");
                            HeaderCell(header.Cell().AlignRight(), "TOTAL");
                        });

                        foreach (var d in _cotizacion.Detalles.OrderBy(x => x.Orden))
                        {
                            Cell(table.Cell().AlignCenter()).Text(d.Cantidad.ToString("N2"));
                            Cell(table.Cell()).Text(d.Descripcion);
                            Cell(table.Cell().AlignRight()).Text($"{moneda} {d.Precio_Unitario:N2}");
                            Cell(table.Cell().AlignRight()).Text($"{moneda} {d.Subtotal:N2}");
                        }
                    });

                    column.Item().PaddingTop(16).Row(row =>
                    {
                        row.RelativeItem();
                        row.ConstantItem(250).BorderTop(2).BorderColor("#3b6f3d").PaddingTop(8).Column(totals =>
                        {
                            TotalLine(totals, "Subtotal", _cotizacion.Subtotal, moneda, false);
                            TotalLine(totals, "Descuento", _cotizacion.Descuento, moneda, false);
                            TotalLine(totals, "Impuesto", _cotizacion.Impuesto, moneda, false);
                            totals.Item().PaddingTop(6).Background("#2f5f34").Padding(8).Row(totalRow =>
                            {
                                totalRow.RelativeItem().Text("Total").Bold().FontColor(Colors.White).FontSize(12);
                                totalRow.RelativeItem().AlignRight().Text($"{moneda} {_cotizacion.Total:N2}").Bold().FontColor(Colors.White).FontSize(12);
                            });
                        });
                    });

                    if (!string.IsNullOrWhiteSpace(_cotizacion.Observacion))
                    {
                        column.Item().PaddingTop(20).LineHorizontal(1).LineColor("#d7ddcf");
                        column.Item().PaddingTop(8).Text("Observaciones").Bold().FontColor("#2f5f34");
                        column.Item().Text(_cotizacion.Observacion);
                    }

                    column.Item().PaddingTop(22).AlignCenter().Text("Gracias por preferirnos. Esta cotizacion no es factura fiscal ni descuenta inventario.").FontSize(8).FontColor("#6b7280");
                });
            });
        }

        private void Logo(IContainer container)
        {
            if (!string.IsNullOrWhiteSpace(_logoPath) && File.Exists(_logoPath))
                container.AlignLeft().Image(_logoPath).FitArea();
            else
                container.Border(1).BorderColor("#3b6f3d").AlignCenter().AlignMiddle().Text("PINECOS").Bold().FontSize(16).FontColor("#2f5f34");
        }

        private static void HeaderCell(IContainer container, string text)
        {
            container.Background("#2f5f34").Padding(8).Text(text).FontColor(Colors.White).Bold().FontSize(8);
        }

        private static IContainer Cell(IContainer container)
        {
            return container.BorderBottom(1).BorderColor("#e5eadf").PaddingVertical(8).PaddingHorizontal(7);
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

        private static string Valor(string? value)
        {
            return string.IsNullOrWhiteSpace(value) ? "-" : value.Trim();
        }
    }
}
