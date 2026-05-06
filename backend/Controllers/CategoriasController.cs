using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pinecos.Attributes;
using Pinecos.Data;
using Pinecos.Models;

namespace Pinecos.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AuthorizeRoles("ADMIN", "SUPERVISOR")]
    public class CategoriasController : ControllerBase
    {
        private readonly PinecosDbContext _context;

        public CategoriasController(PinecosDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Categoria>>> GetCategorias()
        {
            var categorias = await _context.Categorias
                .OrderBy(c => c.Id_Categoria)
                .ToListAsync();

            return Ok(categorias);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Categoria>> GetCategoria(int id)
        {
            var categoria = await _context.Categorias.FindAsync(id);

            if (categoria == null)
                return NotFound(new { message = "Categoría no encontrada" });

            return Ok(categoria);
        }

        [HttpPost]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> CrearCategoria([FromBody] Categoria categoria)
        {
            if (string.IsNullOrWhiteSpace(categoria.Nombre))
                return BadRequest(new { message = "El nombre es requerido" });

            var existe = await _context.Categorias
                .AnyAsync(c => c.Nombre == categoria.Nombre);

            if (existe)
                return BadRequest(new { message = "Ya existe una categoría con ese nombre" });

            _context.Categorias.Add(categoria);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Categoría creada correctamente",
                data = categoria
            });
        }

        [HttpPut("{id}")]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> EditarCategoria(int id, [FromBody] Categoria categoria)
        {
            var categoriaDb = await _context.Categorias.FindAsync(id);

            if (categoriaDb == null)
                return NotFound(new { message = "Categoría no encontrada" });

            if (string.IsNullOrWhiteSpace(categoria.Nombre))
                return BadRequest(new { message = "El nombre es requerido" });

            categoriaDb.Nombre = categoria.Nombre;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Categoría actualizada correctamente",
                data = categoriaDb
            });
        }

        [HttpDelete("{id}")]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> EliminarCategoria(int id)
        {
            var categoriaDb = await _context.Categorias.FindAsync(id);

            if (categoriaDb == null)
                return NotFound(new { message = "Categoría no encontrada" });

            _context.Categorias.Remove(categoriaDb);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Categoría eliminada correctamente" });
        }
    }
}