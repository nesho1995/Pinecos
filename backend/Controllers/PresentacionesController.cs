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

    public class PresentacionesController : ControllerBase
    {
        private readonly PinecosDbContext _context;

        public PresentacionesController(PinecosDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult> GetPresentaciones()
        {
            var presentaciones = await _context.Presentaciones
                .OrderBy(p => p.Onzas)
                .ToListAsync();

            return Ok(presentaciones);
        }

        [HttpPost]
        public async Task<ActionResult> CrearPresentacion([FromBody] Presentacion presentacion)
        {
            if (string.IsNullOrWhiteSpace(presentacion.Nombre))
                return BadRequest(new { message = "El nombre es requerido" });

            var nombreNormalizado = presentacion.Nombre.Trim().ToLower();
            var duplicado = await _context.Presentaciones.AnyAsync(p =>
                p.Nombre.ToLower().Trim() == nombreNormalizado);
            if (duplicado)
                return BadRequest(new { message = "Ya existe una presentacion con ese nombre" });

            _context.Presentaciones.Add(presentacion);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Presentación creada correctamente",
                data = presentacion
            });
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult> EditarPresentacion(int id, [FromBody] Presentacion presentacion)
        {
            var actual = await _context.Presentaciones.FirstOrDefaultAsync(x => x.Id_Presentacion == id);
            if (actual == null)
                return NotFound(new { message = "Presentacion no encontrada" });

            if (string.IsNullOrWhiteSpace(presentacion.Nombre))
                return BadRequest(new { message = "El nombre es requerido" });

            var nombreNormalizado = presentacion.Nombre.Trim().ToLower();
            var duplicado = await _context.Presentaciones.AnyAsync(p =>
                p.Id_Presentacion != id &&
                p.Nombre.ToLower().Trim() == nombreNormalizado);
            if (duplicado)
                return BadRequest(new { message = "Ya existe otra presentacion con ese nombre" });

            actual.Nombre = presentacion.Nombre.Trim();
            actual.Onzas = presentacion.Onzas;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Presentacion actualizada correctamente",
                data = actual
            });
        }

        [HttpDelete("{id:int}")]
        public async Task<ActionResult> EliminarPresentacion(int id)
        {
            var actual = await _context.Presentaciones.FirstOrDefaultAsync(x => x.Id_Presentacion == id);
            if (actual == null)
                return NotFound(new { message = "Presentacion no encontrada" });

            var enUsoEnMenu = await _context.ProductoPresentaciones.AnyAsync(x => x.Id_Presentacion == id);
            var enUsoEnVentas = await _context.DetalleVenta.AnyAsync(x => x.Id_Presentacion == id)
                               || await _context.DetalleCuentaMesa.AnyAsync(x => x.Id_Presentacion == id);

            if (enUsoEnMenu || enUsoEnVentas)
            {
                return BadRequest(new
                {
                    message = "No se puede eliminar esta presentacion porque ya esta en uso en menu o historial de ventas/cuentas."
                });
            }

            _context.Presentaciones.Remove(actual);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Presentacion eliminada correctamente" });
        }
    }
}