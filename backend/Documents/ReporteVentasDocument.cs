using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace Pinecos.Documents
{
    public class ReporteVentasItem
    {
        public int IdVenta { get; set; }
        public DateTime Fecha { get; set; }
        public string MetodoPago { get; set; } = string.Empty;
        public decimal Total { get; set; }
        public string Estado { get; set; } = string.Empty;
    }

    public class ReporteVentasDocument : IDocument
    {
        private readonly List<ReporteVentasItem> _items;
        private readonly DateTime _desde;
        private readonly DateTime _hasta;

        public ReporteVentasDocument(List<ReporteVentasItem> items, DateTime desde, DateTime hasta)
        {
            _items = items;
            _desde = desde;
            _hasta = hasta;
        }

        public DocumentMetadata GetMetadata() => DocumentMetadata.Default;

        public void Compose(IDocumentContainer container)
        {
            container.Page(page =>
            {
                page.Margin(20);

                page.Header().Column(column =>
                {
                    column.Item().Text("PINECOS - REPORTE DE VENTAS").Bold().FontSize(18);
                    column.Item().Text($"Desde: {_desde:dd/MM/yyyy HH:mm}");
                    column.Item().Text($"Hasta: {_hasta:dd/MM/yyyy HH:mm}");
                });

                page.Content().PaddingVertical(10).Table(table =>
                {
                    table.ColumnsDefinition(columns =>
                    {
                        columns.RelativeColumn(1);
                        columns.RelativeColumn(2);
                        columns.RelativeColumn(2);
                        columns.RelativeColumn(1);
                        columns.RelativeColumn(1);
                    });

                    table.Header(header =>
                    {
                        header.Cell().Text("ID").Bold();
                        header.Cell().Text("Fecha").Bold();
                        header.Cell().Text("Método").Bold();
                        header.Cell().AlignRight().Text("Total").Bold();
                        header.Cell().Text("Estado").Bold();
                    });

                    foreach (var item in _items)
                    {
                        table.Cell().Text(item.IdVenta.ToString());
                        table.Cell().Text(item.Fecha.ToString("dd/MM/yyyy HH:mm"));
                        table.Cell().Text(item.MetodoPago);
                        table.Cell().AlignRight().Text(item.Total.ToString("N2"));
                        table.Cell().Text(item.Estado);
                    }
                });

                page.Footer().AlignRight().Text($"Cantidad de ventas: {_items.Count}");
            });
        }
    }
}