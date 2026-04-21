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
    [AuthorizeRoles("ADMIN", "CAJERO")]
    public class MovimientosCajaController : ControllerBase
    {
        private readonly PinecosDbContext _context;

        public MovimientosCajaController(PinecosDbContext context)
        {
            _context = context;
        }

        [HttpGet("caja/{idCaja}")]
        public async Task<ActionResult> GetMovimientosCaja(int idCaja)
        {
            var idSucursal = UserHelper.GetSucursalId(User);
            var rol = UserHelper.GetUserRole(User);

            if (rol != "ADMIN" && !idSucursal.HasValue)
                return BadRequest(new { message = "El usuario no tiene sucursal asignada" });

            var caja = await _context.Cajas.FirstOrDefaultAsync(x => x.Id_Caja == idCaja);

            if (caja == null)
                return NotFound(new { message = "Caja no encontrada" });

            if (rol != "ADMIN")
            {
                if (caja.Id_Sucursal != idSucursal!.Value)
                    return Forbid();
            }

            var movimientos = await _context.MovimientosCaja
                .Where(x => x.Id_Caja == idCaja)
                .OrderByDescending(x => x.Fecha)
                .ToListAsync();

            return Ok(movimientos);
        }

        [HttpPost]
        public async Task<ActionResult> CrearMovimiento([FromBody] MovimientoCaja model)
        {
            var idUsuario = UserHelper.GetUserId(User);
            var idSucursal = UserHelper.GetSucursalId(User);

            if (!idUsuario.HasValue)
                return Unauthorized(new { message = "Usuario no válido en el token" });

            if (!idSucursal.HasValue)
                return BadRequest(new { message = "El usuario no tiene sucursal asignada" });

            if (model.Monto <= 0)
                return BadRequest(new { message = "El monto debe ser mayor a cero" });

            if (string.IsNullOrWhiteSpace(model.Tipo))
                return BadRequest(new { message = "El tipo es requerido" });

            if (string.IsNullOrWhiteSpace(model.Descripcion))
                return BadRequest(new { message = "La descripción es requerida" });

            var caja = await _context.Cajas.FirstOrDefaultAsync(x =>
                x.Id_Caja == model.Id_Caja &&
                x.Id_Sucursal == idSucursal.Value &&
                x.Estado == "ABIERTA");

            if (caja == null)
                return BadRequest(new { message = "La caja no existe o no está abierta" });

            model.Id_Usuario = idUsuario.Value;
            model.Fecha = FechaHelper.AhoraHonduras();

            _context.MovimientosCaja.Add(model);
            await _context.SaveChangesAsync();

            await BitacoraHelper.RegistrarAsync(_context, idUsuario.Value, "MOVIMIENTOS_CAJA", "CREAR", $"Movimiento #{model.Id_Movimiento_Caja} registrado en caja #{model.Id_Caja}");

            return Ok(new
            {
                message = "Movimiento de caja registrado correctamente",
                data = model
            });
        }
    }
}
