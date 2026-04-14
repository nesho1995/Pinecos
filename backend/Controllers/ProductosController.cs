using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pinecos.Attributes;
using Pinecos.Data;
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

        [HttpGet]
        public async Task<ActionResult> GetProductos([FromQuery] bool incluirInactivos = false)
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
                if (!producto.Activo)
                    return BadRequest(new { message = "Ya existe otro producto activo con ese nombre" });

                foreach (var duplicado in duplicadosActivos)
                    duplicado.Activo = false;
            }

            productoDb.Nombre = producto.Nombre;
            productoDb.Id_Categoria = producto.Id_Categoria;
            productoDb.Costo = producto.Costo;
            productoDb.Activo = producto.Activo;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = duplicadosActivos.Count > 0
                    ? "Producto actualizado. Se inactivaron duplicados activos con el mismo nombre."
                    : "Producto actualizado correctamente",
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
                foreach (var duplicado in duplicadosActivos)
                    duplicado.Activo = false;
            }

            productoDb.Activo = true;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = duplicadosActivos.Count > 0
                    ? "Producto reactivado. Se inactivaron productos duplicados con el mismo nombre."
                    : "Producto reactivado correctamente",
                data = productoDb
            });
        }
    }
}
