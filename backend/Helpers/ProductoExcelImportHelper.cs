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
        public const string NombreArchivoPlantillaConPresentacion = "plantilla_productos_con_presentacion_pinecos.xlsx";

        public static byte[] GenerarPlantilla(string formato = "basico")
        {
            var formatoNorm = (formato ?? string.Empty).Trim().ToLowerInvariant();
            using var wb = new XLWorkbook();
            var ws = wb.Worksheets.Add("Productos");

            if (formatoNorm == "presentacion")
            {
                ws.Cell(1, 1).Value = "nombre";
                ws.Cell(1, 2).Value = "categoria";
                ws.Cell(1, 3).Value = "costo";
                ws.Cell(1, 4).Value = "presentacion";
                ws.Cell(1, 5).Value = "precio";
                ws.Cell(1, 6).Value = "sucursal";
                ws.Cell(2, 1).Value = "Cafe latte";
                ws.Cell(2, 2).Value = "Bebidas calientes";
                ws.Cell(2, 3).Value = 25.00m;
                ws.Cell(2, 4).Value = "12 OZ";
                ws.Cell(2, 5).Value = 80.00m;
                ws.Cell(2, 6).Value = "Nombre exacto de la sucursal";
            }
            else
            {
                ws.Cell(1, 1).Value = "nombre";
                ws.Cell(1, 2).Value = "categoria";
                ws.Cell(1, 3).Value = "costo";
                ws.Cell(1, 4).Value = "precio";
                ws.Cell(1, 5).Value = "sucursal";
                ws.Cell(2, 1).Value = "Cafe americano";
                ws.Cell(2, 2).Value = "Bebidas calientes";
                ws.Cell(2, 3).Value = 12.50m;
                ws.Cell(2, 4).Value = 45.00m;
                ws.Cell(2, 5).Value = "Nombre exacto de la sucursal";
            }

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
            string formato = "basico",
            CancellationToken cancellationToken = default)
        {
            var formatoNorm = (formato ?? string.Empty).Trim().ToLowerInvariant();
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
            int? colPrecio = ResolverColumna(headerMap, "precio", "price", "precio_venta");
            int? colSucursal = ResolverColumna(headerMap, "sucursal", "sucursal_nombre", "branch", "tienda");
            int? colPresentacion = ResolverColumna(headerMap, "presentacion", "presentación", "size");

            if (colNombre == null || colCategoria == null || colCosto == null)
            {
                resultado.Errores.Add(new ProductoImportLineaError(
                    firstRow,
                    "Encabezados requeridos: nombre, categoria, costo (nombres sin tildes en el archivo tambien sirven)."));
                return resultado;
            }

            if (colPrecio == null || colSucursal == null)
            {
                resultado.Errores.Add(new ProductoImportLineaError(
                    firstRow,
                    "Debes incluir columnas precio y sucursal (las dos). La importacion se gestiona por sucursal."));
                return resultado;
            }

            if (formatoNorm == "presentacion" && colPresentacion == null)
            {
                resultado.Errores.Add(new ProductoImportLineaError(
                    firstRow,
                    "Para formato con presentacion se requiere la columna presentacion."));
                return resultado;
            }

            var categorias = await context.Categorias.ToListAsync(cancellationToken);
            var sucursales = await context.Sucursales.Where(s => s.Activo).ToListAsync(cancellationToken);
            var presentaciones = await context.Presentaciones.ToListAsync(cancellationToken);
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

                var productoExistente = await context.Productos
                    .FirstOrDefaultAsync(p => p.Nombre == nombre && p.Activo, cancellationToken);

                int? idSucursalPrecio = null;
                decimal? precioImport = null;
                int? idPresentacionImport = null;
                if (formatoNorm == "presentacion")
                {
                    var presentacionNombre = ws.Cell(r, colPresentacion!.Value).GetString().Trim();
                    if (string.IsNullOrWhiteSpace(presentacionNombre))
                    {
                        resultado.Errores.Add(new ProductoImportLineaError(r, "Presentacion vacia."));
                        continue;
                    }

                    var presentacion = presentaciones.FirstOrDefault(p =>
                        string.Equals(p.Nombre.Trim(), presentacionNombre.Trim(), StringComparison.OrdinalIgnoreCase));
                    if (presentacion == null)
                    {
                        resultado.Errores.Add(new ProductoImportLineaError(r,
                            $"Presentacion no encontrada: '{presentacionNombre}'."));
                        continue;
                    }

                    idPresentacionImport = presentacion.Id_Presentacion;
                }

                if (colPrecio != null && colSucursal != null)
                {
                    var nombreSuc = ws.Cell(r, colSucursal.Value).GetString().Trim();
                    var precioCell = ws.Cell(r, colPrecio.Value);
                    var precioVacio = precioCell.IsEmpty() && precioCell.DataType != XLDataType.Number;
                    var sucursalVacia = string.IsNullOrEmpty(nombreSuc);

                    if (precioVacio || sucursalVacia)
                    {
                        resultado.Errores.Add(new ProductoImportLineaError(r,
                            "Columnas precio y sucursal: llena las dos en la fila."));
                        continue;
                    }
                    else
                    {
                        decimal precioVenta;
                        if (precioCell.DataType == XLDataType.Number && precioCell.TryGetValue(out double precioNum))
                            precioVenta = (decimal)precioNum;
                        else
                        {
                            var precioRaw = precioCell.GetString().Trim();
                            if (!decimal.TryParse(precioRaw.Replace(',', '.'), System.Globalization.NumberStyles.Any,
                                    System.Globalization.CultureInfo.InvariantCulture, out precioVenta) || precioVenta <= 0)
                            {
                                resultado.Errores.Add(new ProductoImportLineaError(r, $"Precio de venta invalido: '{precioRaw}'."));
                                continue;
                            }
                        }

                        var sucursal = sucursales.FirstOrDefault(s =>
                            string.Equals(s.Nombre.Trim(), nombreSuc, StringComparison.OrdinalIgnoreCase));
                        if (sucursal == null)
                        {
                            resultado.Errores.Add(new ProductoImportLineaError(r,
                                $"Sucursal no encontrada o inactiva: '{nombreSuc}'."));
                            continue;
                        }

                        idSucursalPrecio = sucursal.Id_Sucursal;
                        precioImport = precioVenta;
                    }
                }

                if (productoExistente != null)
                {
                    if (formatoNorm == "presentacion")
                    {
                        if (!precioImport.HasValue || !idSucursalPrecio.HasValue || !idPresentacionImport.HasValue)
                        {
                            resultado.Errores.Add(new ProductoImportLineaError(r,
                                "En formato con presentacion se requieren precio, sucursal y presentacion por fila."));
                            continue;
                        }

                        var idProductoPresentacion = await UpsertProductoPresentacionAsync(
                            context,
                            productoExistente.Id_Producto,
                            idPresentacionImport.Value,
                            cancellationToken);

                        await UpsertProductoPresentacionSucursalAsync(
                            context,
                            idProductoPresentacion,
                            idSucursalPrecio.Value,
                            precioImport.Value,
                            cancellationToken);
                        resultado.PreciosAsignados++;
                    }
                    else
                    {
                        // Caso clave negocio: el producto ya existe, pero queremos asignar/actualizar precio
                        // para otra sucursal sin duplicar catálogo global.
                        if (precioImport.HasValue && idSucursalPrecio.HasValue)
                        {
                            await UpsertProductoSucursalAsync(context, productoExistente.Id_Producto, idSucursalPrecio.Value,
                                precioImport.Value, cancellationToken);
                            resultado.PreciosAsignados++;
                        }
                        else
                        {
                            resultado.Omitidos.Add(new ProductoImportOmitido(
                                r,
                                nombre,
                                "Ya existe un producto activo con ese nombre. Para usarlo en otra sucursal, llena precio y sucursal en la fila."));
                        }
                    }
                    continue;
                }

                var nuevoProducto = new Producto
                {
                    Nombre = nombre,
                    Id_Categoria = idCategoria.Value,
                    Costo = costo,
                    Activo = true
                };

                context.Productos.Add(nuevoProducto);
                await context.SaveChangesAsync(cancellationToken);
                resultado.Creados++;

                if (formatoNorm == "presentacion")
                {
                    if (!precioImport.HasValue || !idSucursalPrecio.HasValue || !idPresentacionImport.HasValue)
                    {
                        resultado.Errores.Add(new ProductoImportLineaError(r,
                            "En formato con presentacion se requieren precio, sucursal y presentacion por fila."));
                        continue;
                    }

                    var idProductoPresentacion = await UpsertProductoPresentacionAsync(
                        context,
                        nuevoProducto.Id_Producto,
                        idPresentacionImport.Value,
                        cancellationToken);

                    await UpsertProductoPresentacionSucursalAsync(
                        context,
                        idProductoPresentacion,
                        idSucursalPrecio.Value,
                        precioImport.Value,
                        cancellationToken);
                    resultado.PreciosAsignados++;
                }
                else if (precioImport.HasValue && idSucursalPrecio.HasValue)
                {
                    await UpsertProductoSucursalAsync(context, nuevoProducto.Id_Producto, idSucursalPrecio.Value,
                        precioImport.Value, cancellationToken);
                    resultado.PreciosAsignados++;
                }
            }

            return resultado;
        }

        private static async Task UpsertProductoSucursalAsync(
            PinecosDbContext context,
            int idProducto,
            int idSucursal,
            decimal precio,
            CancellationToken cancellationToken)
        {
            var existente = await context.ProductosSucursal.FirstOrDefaultAsync(x =>
                x.Id_Producto == idProducto && x.Id_Sucursal == idSucursal, cancellationToken);

            if (existente == null)
            {
                context.ProductosSucursal.Add(new ProductoSucursal
                {
                    Id_Producto = idProducto,
                    Id_Sucursal = idSucursal,
                    Precio = precio,
                    Activo = true
                });
            }
            else
            {
                existente.Precio = precio;
                existente.Activo = true;
            }

            await context.SaveChangesAsync(cancellationToken);
        }

        private static async Task<int> UpsertProductoPresentacionAsync(
            PinecosDbContext context,
            int idProducto,
            int idPresentacion,
            CancellationToken cancellationToken)
        {
            var existente = await context.ProductoPresentaciones.FirstOrDefaultAsync(x =>
                x.Id_Producto == idProducto && x.Id_Presentacion == idPresentacion, cancellationToken);

            if (existente != null)
                return existente.Id_Producto_Presentacion;

            var nueva = new ProductoPresentacion
            {
                Id_Producto = idProducto,
                Id_Presentacion = idPresentacion
            };
            context.ProductoPresentaciones.Add(nueva);
            await context.SaveChangesAsync(cancellationToken);
            return nueva.Id_Producto_Presentacion;
        }

        private static async Task UpsertProductoPresentacionSucursalAsync(
            PinecosDbContext context,
            int idProductoPresentacion,
            int idSucursal,
            decimal precio,
            CancellationToken cancellationToken)
        {
            var existente = await context.ProductoPresentacionSucursales.FirstOrDefaultAsync(x =>
                x.Id_Producto_Presentacion == idProductoPresentacion && x.Id_Sucursal == idSucursal, cancellationToken);

            if (existente == null)
            {
                context.ProductoPresentacionSucursales.Add(new ProductoPresentacionSucursal
                {
                    Id_Producto_Presentacion = idProductoPresentacion,
                    Id_Sucursal = idSucursal,
                    Precio = precio,
                    Activo = true
                });
            }
            else
            {
                existente.Precio = precio;
                existente.Activo = true;
            }

            await context.SaveChangesAsync(cancellationToken);
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
        public int PreciosAsignados { get; set; }
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
