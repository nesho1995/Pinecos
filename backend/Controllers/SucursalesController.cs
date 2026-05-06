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
    public class SucursalesController : ControllerBase
    {
        private readonly PinecosDbContext _context;

        public SucursalesController(PinecosDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult> GetSucursales([FromQuery] bool incluirInactivas = false)
        {
            var query = _context.Sucursales.AsQueryable();

            if (!incluirInactivas)
                query = query.Where(s => s.Activo);

            var sucursales = await query
                .OrderBy(s => s.Id_Sucursal)
                .ToListAsync();

            return Ok(sucursales);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult> GetSucursal(int id)
        {
            var sucursal = await _context.Sucursales.FirstOrDefaultAsync(s => s.Id_Sucursal == id && s.Activo);

            if (sucursal == null)
                return NotFound(new { message = "Sucursal no encontrada" });

            return Ok(sucursal);
        }

        [HttpPost]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> CrearSucursal([FromBody] Sucursal sucursal)
        {
            if (string.IsNullOrWhiteSpace(sucursal.Nombre))
                return BadRequest(new { message = "El nombre es requerido" });

            _context.Sucursales.Add(sucursal);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Sucursal creada correctamente",
                data = sucursal
            });
        }

        [HttpPut("{id}")]
        public async Task<ActionResult> EditarSucursal(int id, [FromBody] Sucursal sucursal)
        {
            var sucursalDb = await _context.Sucursales.FindAsync(id);

            if (sucursalDb == null)
                return NotFound(new { message = "Sucursal no encontrada" });

            if (string.IsNullOrWhiteSpace(sucursal.Nombre))
                return BadRequest(new { message = "El nombre es requerido" });

            sucursalDb.Nombre = sucursal.Nombre;
            sucursalDb.Direccion = sucursal.Direccion;
            sucursalDb.Telefono = sucursal.Telefono;
            sucursalDb.Activo = sucursal.Activo;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Sucursal actualizada correctamente",
                data = sucursalDb
            });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> EliminarSucursal(int id)
        {
            var sucursalDb = await _context.Sucursales.FindAsync(id);

            if (sucursalDb == null)
                return NotFound(new { message = "Sucursal no encontrada" });

            sucursalDb.Activo = false;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Sucursal inactivada correctamente" });
        }
    }
}
