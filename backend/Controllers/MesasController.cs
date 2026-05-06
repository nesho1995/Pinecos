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
    public class MesasController : ControllerBase
    {
        private readonly PinecosDbContext _context;

        public MesasController(PinecosDbContext context)
        {
            _context = context;
        }

        [HttpGet("sucursal/{idSucursal}")]
        public async Task<ActionResult> GetMesasPorSucursal(int idSucursal, [FromQuery] bool incluirInactivas = false)
        {
            var rol = UserHelper.GetUserRole(User);
            var idSucursalToken = UserHelper.GetSucursalId(User);

            if (rol != "ADMIN")
            {
                if (!idSucursalToken.HasValue)
                    return BadRequest(new { message = "El usuario no tiene sucursal asignada" });

                if (idSucursalToken.Value != idSucursal)
                    return Forbid();
            }

            var query = _context.Mesas
                .Where(x => x.Id_Sucursal == idSucursal);

            if (!incluirInactivas)
                query = query.Where(x => x.Activo);

            var mesas = await query
                .OrderBy(x => x.Id_Mesa)
                .ToListAsync();

            return Ok(mesas);
        }

        [HttpPost]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> CrearMesa([FromBody] Mesa model)
        {
            if (string.IsNullOrWhiteSpace(model.Nombre))
                return BadRequest(new { message = "El nombre de la mesa es requerido" });

            model.Estado = "LIBRE";
            model.Activo = true;

            _context.Mesas.Add(model);
            await _context.SaveChangesAsync();

            var idUsuario = UserHelper.GetUserId(User);
            await BitacoraHelper.RegistrarAsync(_context, idUsuario, "MESAS", "CREAR", $"Mesa #{model.Id_Mesa} creada");

            return Ok(new { message = "Mesa creada correctamente", data = model });
        }

        [HttpPut("{id}")]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> EditarMesa(int id, [FromBody] Mesa model)
        {
            var mesa = await _context.Mesas.FindAsync(id);

            if (mesa == null)
                return NotFound(new { message = "Mesa no encontrada" });

            mesa.Nombre = model.Nombre;
            mesa.Capacidad = model.Capacidad;
            mesa.Forma = model.Forma;
            mesa.Pos_X = model.Pos_X;
            mesa.Pos_Y = model.Pos_Y;
            mesa.Ancho = model.Ancho;
            mesa.Alto = model.Alto;
            mesa.Activo = model.Activo;

            await _context.SaveChangesAsync();

            var idUsuario = UserHelper.GetUserId(User);
            await BitacoraHelper.RegistrarAsync(_context, idUsuario, "MESAS", "EDITAR", $"Mesa #{mesa.Id_Mesa} editada");

            return Ok(new { message = "Mesa actualizada correctamente", data = mesa });
        }
    }
}
