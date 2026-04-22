using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pinecos.Attributes;
using Pinecos.Data;
using Pinecos.Helpers;
using Pinecos.Models;

namespace Pinecos.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AuthorizeRoles("ADMIN")]
    public class ProductosController : ControllerBase
    {
        private readonly PinecosDbContext _context;

        public ProductosController(PinecosDbContext context)
        {
            _context = context;
        }

        [HttpGet("excel/plantilla")]
        public IActionResult DescargarPlantillaExcel([FromQuery] string formato = "basico")
        {
            var formatoNorm = (formato ?? string.Empty).Trim().ToLowerInvariant();
            var bytes = ProductoExcelImportHelper.GenerarPlantilla(formatoNorm);
            var fileName = formatoNorm == "presentacion"
                ? ProductoExcelImportHelper.NombreArchivoPlantillaConPresentacion
                : ProductoExcelImportHelper.NombreArchivoPlantilla;
            return File(
                bytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                fileName);
        }

        [HttpPost("excel/importar")]
        [RequestSizeLimit(10_485_760)]
        public async Task<ActionResult> ImportarExcel(
            IFormFile? file,
            [FromQuery] bool crearCategorias = true,
            [FromQuery] string formato = "basico",
            CancellationToken cancellationToken = default)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "Adjunta un archivo Excel (.xlsx)." });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (ext != ".xlsx")
                return BadRequest(new { message = "Solo se admite formato .xlsx (Excel)." });

            await using var stream = file.OpenReadStream();
            ProductoImportResult resultado;
            try
            {
                resultado = await ProductoExcelImportHelper.ImportarAsync(
                    stream,
                    _context,
                    crearCategorias,
                    formato,
                    cancellationToken);
            }
            catch (Exception)
            {
                return BadRequest(new { message = "No se pudo leer el archivo. Verifica que sea un Excel valido (.xlsx)." });
            }

            return Ok(new
            {
                message =
                    $"Importacion finalizada. Productos creados: {resultado.Creados}. Precios de venta asignados: {resultado.PreciosAsignados}.",
                creados = resultado.Creados,
                preciosAsignados = resultado.PreciosAsignados,
                errores = resultado.Errores.Select(e => new { fila = e.Fila, mensaje = e.Mensaje }),
                omitidos = resultado.Omitidos.Select(o => new { fila = o.Fila, nombre = o.Nombre, razon = o.Razon })
            });
        }

        [HttpGet]
        public async Task<ActionResult> GetProductos(
            [FromQuery] bool incluirInactivos = false,
            [FromQuery] int? idSucursal = null)
        {
            var productosQuery = _context.Productos.AsQueryable();
            if (!incluirInactivos)
                productosQuery = productosQuery.Where(p => p.Activo);

            var productos = await (
                from p in productosQuery
                join c in _context.Categorias on p.Id_Categoria equals c.Id_Categoria
                orderby p.Id_Producto
                select new
                {
                    p.Id_Producto,
                    p.Nombre,
                    p.Id_Categoria,
                    categoria = c.Nombre,
                    p.Costo,
                    precioReferencia = idSucursal.HasValue && idSucursal.Value > 0
                        ? _context.ProductosSucursal
                            .Where(ps =>
                                ps.Id_Producto == p.Id_Producto &&
                                ps.Activo &&
                                ps.Id_Sucursal == idSucursal.Value)
                            .Select(ps => (decimal?)ps.Precio)
                            .FirstOrDefault()
                        : _context.ProductosSucursal
                            .Where(ps => ps.Id_Producto == p.Id_Producto && ps.Activo)
                            .OrderBy(ps => ps.Id_Producto_Sucursal)
                            .Select(ps => (decimal?)ps.Precio)
                            .FirstOrDefault(),
                    preciosConfigurados = _context.ProductosSucursal
                        .Count(ps => ps.Id_Producto == p.Id_Producto && ps.Activo),
                    p.Tipo_Fiscal,
                    p.Activo
                }
            ).ToListAsync();

            return Ok(productos);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult> GetProducto(int id)
        {
            var producto = await (
                from p in _context.Productos
                join c in _context.Categorias on p.Id_Categoria equals c.Id_Categoria
                where p.Id_Producto == id
                select new
                {
                    p.Id_Producto,
                    p.Nombre,
                    p.Id_Categoria,
                    categoria = c.Nombre,
                    p.Costo,
                    precioReferencia = _context.ProductosSucursal
                        .Where(ps => ps.Id_Producto == p.Id_Producto && ps.Activo)
                        .OrderBy(ps => ps.Id_Producto_Sucursal)
                        .Select(ps => (decimal?)ps.Precio)
                        .FirstOrDefault(),
                    preciosConfigurados = _context.ProductosSucursal
                        .Count(ps => ps.Id_Producto == p.Id_Producto && ps.Activo),
                    p.Tipo_Fiscal,
                    p.Activo
                }
            ).FirstOrDefaultAsync();

            if (producto == null)
                return NotFound(new { message = "Producto no encontrado" });

            return Ok(producto);
        }

        [HttpPost]
        public async Task<ActionResult> CrearProducto([FromBody] Producto producto)
        {
            if (string.IsNullOrWhiteSpace(producto.Nombre))
                return BadRequest(new { message = "El nombre es requerido" });

            var categoriaExiste = await _context.Categorias
                .AnyAsync(c => c.Id_Categoria == producto.Id_Categoria);

            if (!categoriaExiste)
                return BadRequest(new { message = "La categoría no existe" });

            var existe = await _context.Productos
                .AnyAsync(p => p.Nombre == producto.Nombre && p.Activo);

            if (existe)
                return BadRequest(new { message = "Ya existe un producto activo con ese nombre" });

            producto.Activo = true;
            producto.Tipo_Fiscal = FiscalTipoHelper.Normalizar(producto.Tipo_Fiscal);

            _context.Productos.Add(producto);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Producto creado correctamente",
                data = producto
            });
        }

        [HttpPut("{id}")]
        public async Task<ActionResult> EditarProducto(int id, [FromBody] Producto producto)
        {
            var productoDb = await _context.Productos.FindAsync(id);

            if (productoDb == null)
                return NotFound(new { message = "Producto no encontrado" });

            if (string.IsNullOrWhiteSpace(producto.Nombre))
                return BadRequest(new { message = "El nombre es requerido" });

            var categoriaExiste = await _context.Categorias
                .AnyAsync(c => c.Id_Categoria == producto.Id_Categoria);

            if (!categoriaExiste)
                return BadRequest(new { message = "La categoría no existe" });

            var nombreNormalizado = producto.Nombre.Trim().ToLower();

            var duplicadosActivos = await _context.Productos
                .Where(p =>
                    p.Id_Producto != id &&
                    p.Activo &&
                    p.Nombre.ToLower().Trim() == nombreNormalizado
                )
                .ToListAsync();

            if (duplicadosActivos.Count > 0)
            {
                return BadRequest(new { message = "Ya existe otro producto activo con ese nombre. Cambia el nombre o desactiva/elimina el duplicado." });
            }

            productoDb.Nombre = producto.Nombre;
            productoDb.Id_Categoria = producto.Id_Categoria;
            productoDb.Costo = producto.Costo;
            productoDb.Tipo_Fiscal = FiscalTipoHelper.Normalizar(producto.Tipo_Fiscal);
            productoDb.Activo = producto.Activo;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Producto actualizado correctamente",
                data = productoDb
            });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> EliminarProducto(int id)
        {
            var productoDb = await _context.Productos.FindAsync(id);

            if (productoDb == null)
                return NotFound(new { message = "Producto no encontrado" });

            productoDb.Activo = false;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Producto inactivado correctamente" });
        }

        [HttpPost("{id}/reactivar")]
        public async Task<ActionResult> ReactivarProducto(int id)
        {
            var productoDb = await _context.Productos.FindAsync(id);

            if (productoDb == null)
                return NotFound(new { message = "Producto no encontrado" });

            var nombreNormalizado = productoDb.Nombre.Trim().ToLower();

            var duplicadosActivos = await _context.Productos
                .Where(p =>
                    p.Id_Producto != id &&
                    p.Activo &&
                    p.Nombre.ToLower().Trim() == nombreNormalizado)
                .ToListAsync();

            if (duplicadosActivos.Count > 0)
            {
                return BadRequest(new { message = "No se puede reactivar porque ya existe otro producto activo con ese nombre" });
            }

            productoDb.Activo = true;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Producto reactivado correctamente",
                data = productoDb
            });
        }

        [HttpDelete("{id}/fisico")]
        public async Task<ActionResult> EliminarProductoFisico(int id)
        {
            var productoDb = await _context.Productos.FindAsync(id);
            if (productoDb == null)
                return NotFound(new { message = "Producto no encontrado" });

            var tieneMovimientos = await _context.DetalleVenta.AnyAsync(x => x.Id_Producto == id)
                                  || await _context.DetalleCuentaMesa.AnyAsync(x => x.Id_Producto == id);

            if (tieneMovimientos)
                return BadRequest(new { message = "No se puede eliminar fisicamente un producto con historial de ventas o cuentas. Solo puedes inactivarlo." });

            using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                var relacionesPresentacion = await _context.ProductoPresentaciones
                    .Where(x => x.Id_Producto == id)
                    .ToListAsync();

                if (relacionesPresentacion.Count > 0)
                {
                    var idsRelaciones = relacionesPresentacion.Select(x => x.Id_Producto_Presentacion).ToList();
                    var preciosPresentacion = await _context.ProductoPresentacionSucursales
                        .Where(x => idsRelaciones.Contains(x.Id_Producto_Presentacion))
                        .ToListAsync();

                    if (preciosPresentacion.Count > 0)
                        _context.ProductoPresentacionSucursales.RemoveRange(preciosPresentacion);

                    _context.ProductoPresentaciones.RemoveRange(relacionesPresentacion);
                }

                var preciosSucursal = await _context.ProductosSucursal
                    .Where(x => x.Id_Producto == id)
                    .ToListAsync();

                if (preciosSucursal.Count > 0)
                    _context.ProductosSucursal.RemoveRange(preciosSucursal);

                _context.Productos.Remove(productoDb);
                await _context.SaveChangesAsync();
                await tx.CommitAsync();

                return Ok(new { message = "Producto eliminado fisicamente correctamente" });
            }
            catch (DbUpdateException)
            {
                await tx.RollbackAsync();
                return BadRequest(new
                {
                    message = "No se puede eliminar fisicamente este producto porque tiene relaciones operativas. Inactivalo en su lugar."
                });
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }
    }
}
