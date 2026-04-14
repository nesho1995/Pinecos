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
    public class GastosController : ControllerBase
    {
        private readonly PinecosDbContext _context;

        public GastosController(PinecosDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [AuthorizeRoles("ADMIN", "CAJERO")]
        public async Task<ActionResult> GetGastos()
        {
            var rol = UserHelper.GetUserRole(User);
            var idSucursal = UserHelper.GetSucursalId(User);

            var query = _context.Gastos
                .Where(x => x.Activo);

            if (rol != "ADMIN")
            {
                if (!idSucursal.HasValue)
                    return BadRequest(new { message = "El usuario no tiene sucursal asignada" });

                query = query.Where(x => x.Id_Sucursal == idSucursal.Value);
            }

            var gastos = await query
                .OrderByDescending(x => x.Fecha)
                .ToListAsync();

            return Ok(gastos);
        }

        [HttpPost]
        [AuthorizeRoles("ADMIN", "CAJERO")]
        public async Task<ActionResult> CrearGasto([FromBody] Gasto gasto)
        {
            var idUsuario = UserHelper.GetUserId(User);
            var idSucursal = UserHelper.GetSucursalId(User);

            if (!idUsuario.HasValue)
                return Unauthorized(new { message = "Usuario no válido en el token" });

            if (!idSucursal.HasValue)
                return BadRequest(new { message = "El usuario no tiene sucursal asignada" });

            if (gasto.Monto <= 0)
                return BadRequest(new { message = "El monto debe ser mayor a cero" });

            gasto.Fecha = FechaHelper.AhoraHonduras();
            gasto.Activo = true;
            gasto.Id_Usuario = idUsuario.Value;
            gasto.Id_Sucursal = idSucursal.Value;

            _context.Gastos.Add(gasto);
            await _context.SaveChangesAsync();

            await BitacoraHelper.RegistrarAsync(_context, idUsuario.Value, "GASTOS", "CREAR", $"Gasto #{gasto.Id_Gasto} creado");

            return Ok(new { message = "Gasto registrado correctamente", data = gasto });
        }

        [HttpDelete("{id}")]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> EliminarGasto(int id)
        {
            var gasto = await _context.Gastos.FindAsync(id);

            if (gasto == null)
                return NotFound(new { message = "Gasto no encontrado" });

            gasto.Activo = false;
            await _context.SaveChangesAsync();

            await BitacoraHelper.RegistrarAsync(_context, gasto.Id_Usuario, "GASTOS", "INACTIVAR", $"Gasto #{gasto.Id_Gasto} inactivado");

            return Ok(new { message = "Gasto inactivado correctamente" });
        }
    }
}