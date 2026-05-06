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
    [AuthorizeRoles("ADMIN", "CAJERO", "SUPERVISOR")]
    public class MovimientosCajaController : ControllerBase
    {
        private readonly PinecosDbContext _context;

        public MovimientosCajaController(PinecosDbContext context)
        {
            _context = context;
        }

        [HttpGet("caja/{idCaja}")]
        public async Task<ActionResult> GetMovimientosCaja(
            int idCaja,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50,
            [FromQuery] DateTime? desde = null,
            [FromQuery] DateTime? hasta = null,
            [FromQuery] string? tipo = null)
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

            if (page <= 0) page = 1;
            if (pageSize <= 0 || pageSize > 200) pageSize = 50;

            var query = _context.MovimientosCaja
                .AsNoTracking()
                .Where(x => x.Id_Caja == idCaja);

            if (desde.HasValue)
                query = query.Where(x => x.Fecha >= desde.Value);
            if (hasta.HasValue)
                query = query.Where(x => x.Fecha <= hasta.Value);
            if (!string.IsNullOrWhiteSpace(tipo))
            {
                var tipoNorm = tipo.Trim();
                query = query.Where(x => x.Tipo == tipoNorm);
            }

            var total = await query.CountAsync();
            var movimientos = await query
                .OrderByDescending(x => x.Fecha)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var resumen = await query
                .GroupBy(x => 1)
                .Select(g => new
                {
                    ingresos = g
                        .Where(x => (x.Tipo ?? string.Empty).ToUpper().Contains("INGRESO") || (x.Tipo ?? string.Empty).ToUpper() == "ENTRADA")
                        .Sum(x => (decimal?)x.Monto) ?? 0m,
                    egresos = g
                        .Where(x => (x.Tipo ?? string.Empty).ToUpper().Contains("EGRESO") || (x.Tipo ?? string.Empty).ToUpper() == "SALIDA")
                        .Sum(x => (decimal?)x.Monto) ?? 0m
                })
                .FirstOrDefaultAsync();

            return Ok(new
            {
                total,
                page,
                pageSize,
                resumen = resumen ?? new { ingresos = 0m, egresos = 0m },
                data = movimientos
            });
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
