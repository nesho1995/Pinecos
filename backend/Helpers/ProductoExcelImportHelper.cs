using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using Pinecos.Data;
using Pinecos.Models;

namespace Pinecos.Helpers
{
    public static class ProductoExcelImportHelper
    {
        public const int MaxFilas = 5000;
        public const string NombreArchivoPlantilla = "plantilla_productos_pinecos.xlsx";

        public static byte[] GenerarPlantilla()
        {
            using var wb = new XLWorkbook();
            var ws = wb.Worksheets.Add("Productos");
            ws.Cell(1, 1).Value = "nombre";
            ws.Cell(1, 2).Value = "categoria";
            ws.Cell(1, 3).Value = "costo";
            ws.Cell(2, 1).Value = "Cafe americano";
            ws.Cell(2, 2).Value = "Bebidas calientes";
            ws.Cell(2, 3).Value = 12.50m;
            ws.Row(1).Style.Font.Bold = true;
            ws.Columns().AdjustToContents();

            using var ms = new MemoryStream();
            wb.SaveAs(ms);
            return ms.ToArray();
        }

        public static async Task<ProductoImportResult> ImportarAsync(
            Stream stream,
            PinecosDbContext context,
            bool crearCategoriasFaltantes,
            CancellationToken cancellationToken = default)
        {
            var resultado = new ProductoImportResult();
            using var wb = new XLWorkbook(stream);
            var ws = wb.Worksheets.FirstOrDefault();
            if (ws == null)
            {
                resultado.Errores.Add(new ProductoImportLineaError(0, "El archivo no tiene hojas."));
                return resultado;
            }

            var firstRow = ws.FirstRowUsed()?.RowNumber() ?? 0;
            var lastRow = ws.LastRowUsed()?.RowNumber() ?? 0;
            if (firstRow == 0 || lastRow < firstRow + 1)
            {
                resultado.Errores.Add(new ProductoImportLineaError(1, "No hay filas de datos debajo del encabezado."));
                return resultado;
            }

            var lastCol = ws.LastColumnUsed()?.ColumnNumber() ?? 0;
            if (lastCol < 1)
            {
                resultado.Errores.Add(new ProductoImportLineaError(1, "No se encontraron columnas."));
                return resultado;
            }

            var headerMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            for (var c = 1; c <= lastCol; c++)
            {
                var raw = ws.Cell(firstRow, c).GetString().Trim();
                if (string.IsNullOrEmpty(raw)) continue;
                var key = NormalizarEncabezado(raw);
                if (!string.IsNullOrEmpty(key) && !headerMap.ContainsKey(key))
                    headerMap[key] = c;
            }

            int? colNombre = ResolverColumna(headerMap, "nombre", "name", "producto");
            int? colCategoria = ResolverColumna(headerMap, "categoria", "categoría", "category");
            int? colCosto = ResolverColumna(headerMap, "costo", "cost");

            if (colNombre == null || colCategoria == null || colCosto == null)
            {
                resultado.Errores.Add(new ProductoImportLineaError(
                    firstRow,
                    "Encabezados requeridos: nombre, categoria, costo (nombres sin tildes en el archivo tambien sirven)."));
                return resultado;
            }

            var categorias = await context.Categorias.ToListAsync(cancellationToken);
            var dataRows = lastRow - firstRow;
            if (dataRows > MaxFilas)
            {
                resultado.Errores.Add(new ProductoImportLineaError(0, $"Demasiadas filas (maximo {MaxFilas})."));
                return resultado;
            }

            for (var r = firstRow + 1; r <= lastRow; r++)
            {
                cancellationToken.ThrowIfCancellationRequested();

                var nombre = ws.Cell(r, colNombre.Value).GetString().Trim();
                var categoriaNombre = ws.Cell(r, colCategoria.Value).GetString().Trim();
                var costoCell = ws.Cell(r, colCosto.Value);

                if (string.IsNullOrEmpty(nombre) && string.IsNullOrEmpty(categoriaNombre) &&
                    costoCell.IsEmpty() && costoCell.DataType != XLDataType.Number)
                    continue;

                if (string.IsNullOrEmpty(nombre))
                {
                    resultado.Errores.Add(new ProductoImportLineaError(r, "Nombre vacio."));
                    continue;
                }

                if (string.IsNullOrEmpty(categoriaNombre))
                {
                    resultado.Errores.Add(new ProductoImportLineaError(r, "Categoria vacia."));
                    continue;
                }

                decimal costo;
                if (costoCell.DataType == XLDataType.Number && costoCell.TryGetValue(out double costoNum))
                {
                    costo = (decimal)costoNum;
                }
                else
                {
                    var costoRaw = costoCell.GetString().Trim();
                    if (!decimal.TryParse(costoRaw.Replace(',', '.'), System.Globalization.NumberStyles.Any,
                            System.Globalization.CultureInfo.InvariantCulture, out costo) || costo < 0)
                    {
                        resultado.Errores.Add(new ProductoImportLineaError(r, $"Costo invalido: '{costoRaw}'."));
                        continue;
                    }
                }

                var idCategoria = BuscarIdCategoria(categorias, categoriaNombre);
                if (idCategoria == null)
                {
                    if (!crearCategoriasFaltantes)
                    {
                        resultado.Errores.Add(new ProductoImportLineaError(r, $"Categoria no existe: '{categoriaNombre}'."));
                        continue;
                    }

                    var nueva = new Categoria { Nombre = categoriaNombre };
                    context.Categorias.Add(nueva);
                    await context.SaveChangesAsync(cancellationToken);
                    categorias.Add(nueva);
                    idCategoria = nueva.Id_Categoria;
                }

                var existeActivo = await context.Productos
                    .AnyAsync(p => p.Nombre == nombre && p.Activo, cancellationToken);

                if (existeActivo)
                {
                    resultado.Omitidos.Add(new ProductoImportOmitido(r, nombre, "Ya existe un producto activo con ese nombre."));
                    continue;
                }

                context.Productos.Add(new Producto
                {
                    Nombre = nombre,
                    Id_Categoria = idCategoria.Value,
                    Costo = costo,
                    Activo = true
                });

                await context.SaveChangesAsync(cancellationToken);
                resultado.Creados++;
            }

            return resultado;
        }

        private static string NormalizarEncabezado(string raw)
        {
            var s = raw.Trim().ToLowerInvariant();
            return s.Replace("í", "i", StringComparison.Ordinal);
        }

        private static int? ResolverColumna(Dictionary<string, int> headerMap, params string[] keys)
        {
            foreach (var k in keys)
            {
                var nk = NormalizarEncabezado(k);
                if (headerMap.TryGetValue(nk, out var col))
                    return col;
            }

            return null;
        }

        private static int? BuscarIdCategoria(List<Categoria> categorias, string nombre)
        {
            foreach (var c in categorias)
            {
                if (string.Equals(c.Nombre.Trim(), nombre.Trim(), StringComparison.OrdinalIgnoreCase))
                    return c.Id_Categoria;
            }

            return null;
        }
    }

    public sealed class ProductoImportResult
    {
        public int Creados { get; set; }
        public List<ProductoImportLineaError> Errores { get; } = new();
        public List<ProductoImportOmitido> Omitidos { get; } = new();
    }

    public sealed class ProductoImportLineaError
    {
        public ProductoImportLineaError(int fila, string mensaje)
        {
            Fila = fila;
            Mensaje = mensaje;
        }

        public int Fila { get; }
        public string Mensaje { get; }
    }

    public sealed class ProductoImportOmitido
    {
        public ProductoImportOmitido(int fila, string nombre, string razon)
        {
            Fila = fila;
            Nombre = nombre;
            Razon = razon;
        }

        public int Fila { get; }
        public string Nombre { get; }
        public string Razon { get; }
    }
}
