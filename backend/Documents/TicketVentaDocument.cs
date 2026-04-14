using Pinecos.DTOs;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Pinecos.Documents
{
    public class TicketVentaDocument : IDocument
    {
        private readonly TicketVentaDto _ticket;

        public TicketVentaDocument(TicketVentaDto ticket)
        {
            _ticket = ticket;
        }

        public DocumentMetadata GetMetadata() => DocumentMetadata.Default;

        public void Compose(IDocumentContainer container)
        {
            container.Page(page =>
            {
                page.Margin(20);

                page.Header().Column(column =>
                {
                    column.Item().AlignCenter().Text("PINECOS").Bold().FontSize(18);
                    column.Item().AlignCenter().Text(_ticket.Sucursal).FontSize(11);
                    column.Item().AlignCenter().Text($"Ticket Venta #{_ticket.IdVenta}").FontSize(11);
                    column.Item().PaddingTop(5).Text($"Fecha: {_ticket.Fecha:dd/MM/yyyy HH:mm}");
                    column.Item().Text($"Cajero: {_ticket.Cajero}");
                    column.Item().Text($"Método de pago: {_ticket.MetodoPago}");
                    if (_ticket.EsFacturaCai)
                    {
                        column.Item().PaddingTop(5).Text("Documento Fiscal SAR").Bold();
                        column.Item().Text($"Factura: {_ticket.NumeroFactura}");
                        column.Item().Text($"CAI: {_ticket.Cai}");
                        column.Item().Text($"Rango: {_ticket.RangoInicio} - {_ticket.RangoFin}");
                        column.Item().Text($"Fecha límite: {(_ticket.FechaLimiteEmision.HasValue ? _ticket.FechaLimiteEmision.Value.ToString("dd/MM/yyyy") : "-")}");
                    }
                });

                page.Content().PaddingVertical(10).Column(column =>
                {
                    column.Item().LineHorizontal(1);

                    column.Item().PaddingVertical(5).Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(4);
                            columns.RelativeColumn(2);
                            columns.RelativeColumn(1);
                            columns.RelativeColumn(2);
                            columns.RelativeColumn(2);
                        });

                        table.Header(header =>
                        {
                            header.Cell().Text("Producto").Bold();
                            header.Cell().Text("Pres.").Bold();
                            header.Cell().AlignCenter().Text("Cant").Bold();
                            header.Cell().AlignRight().Text("Precio").Bold();
                            header.Cell().AlignRight().Text("Subt.").Bold();
                        });

                        foreach (var item in _ticket.Detalles)
                        {
                            table.Cell().Text(item.Producto);
                            table.Cell().Text(item.Presentacion);
                            table.Cell().AlignCenter().Text(item.Cantidad.ToString());
                            table.Cell().AlignRight().Text(item.PrecioUnitario.ToString("N2"));
                            table.Cell().AlignRight().Text(item.Subtotal.ToString("N2"));
                        }
                    });

                    column.Item().PaddingTop(10).LineHorizontal(1);

                    column.Item().AlignRight().Text($"Subtotal: {_ticket.Subtotal:N2}");
                    column.Item().AlignRight().Text($"Descuento: {_ticket.Descuento:N2}");
                    column.Item().AlignRight().Text($"Impuesto: {_ticket.Impuesto:N2}");
                    column.Item().AlignRight().Text($"Total: {_ticket.Total:N2}").Bold().FontSize(14);

                    if (!string.IsNullOrWhiteSpace(_ticket.Observacion))
                    {
                        column.Item().PaddingTop(8).Text($"Observación: {_ticket.Observacion}");
                    }
                });

                page.Footer().AlignCenter().Text("Gracias por su compra").FontSize(10);
            });
        }
    }
}
