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
    public class GastosController : ControllerBase
    {
        private readonly PinecosDbContext _context;

        public GastosController(PinecosDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult> GetGastos([FromQuery] int? idSucursal = null, [FromQuery] int? idUsuario = null)
        {
            var rol = UserHelper.GetUserRole(User);
            var idSucursalToken = UserHelper.GetSucursalId(User);
            var idUsuarioToken = UserHelper.GetUserId(User);

            var query = _context.Gastos
                .Where(x => x.Activo);

            if (rol != "ADMIN")
            {
                if (!idSucursalToken.HasValue)
                    return BadRequest(new { message = "El usuario no tiene sucursal asignada" });

                if (!idUsuarioToken.HasValue)
                    return Unauthorized(new { message = "Usuario no válido en el token" });

                // Seguridad: el cajero solo ve sus propios gastos de su sucursal.
                query = query.Where(x => x.Id_Sucursal == idSucursalToken.Value && x.Id_Usuario == idUsuarioToken.Value);
            }
            else
            {
                if (idSucursal.HasValue)
                    query = query.Where(x => x.Id_Sucursal == idSucursal.Value);
                if (idUsuario.HasValue)
                    query = query.Where(x => x.Id_Usuario == idUsuario.Value);
            }

            var gastos = await (
                from g in query
                join u in _context.Usuarios on g.Id_Usuario equals u.Id_Usuario into uj
                from u in uj.DefaultIfEmpty()
                orderby g.Fecha descending
                select new
                {
                    g.Id_Gasto,
                    g.Id_Sucursal,
                    g.Id_Usuario,
                    Usuario = u != null ? u.Nombre : "",
                    g.Fecha,
                    g.Categoria_Gasto,
                    g.Descripcion,
                    g.Monto,
                    g.Activo
                }
            )
                .OrderByDescending(x => x.Fecha)
                .ToListAsync();

            return Ok(gastos);
        }

        [HttpPost]
        public async Task<ActionResult> CrearGasto([FromBody] Gasto gasto)
        {
            var idUsuario = UserHelper.GetUserId(User);
            var idSucursal = UserHelper.GetSucursalId(User);

            if (!idUsuario.HasValue)
                return Unauthorized(new { message = "Usuario no válido en el token" });

            if (!idSucursal.HasValue)
                return BadRequest(new { message = "El usuario no tiene sucursal asignada" });

            if (string.IsNullOrWhiteSpace(gasto.Categoria_Gasto))
                return BadRequest(new { message = "La categoria del gasto es requerida" });

            if (string.IsNullOrWhiteSpace(gasto.Descripcion))
                return BadRequest(new { message = "La descripcion del gasto es requerida" });

            var categoria = gasto.Categoria_Gasto.Trim();
            var descripcion = gasto.Descripcion.Trim();

            if (categoria.Length > 80)
                return BadRequest(new { message = "La categoria no puede exceder 80 caracteres" });

            if (descripcion.Length > 250)
                return BadRequest(new { message = "La descripcion no puede exceder 250 caracteres" });

            if (gasto.Monto <= 0)
                return BadRequest(new { message = "El monto debe ser mayor a cero" });

            if (gasto.Monto > 1000000)
                return BadRequest(new { message = "El monto excede el limite permitido" });

            gasto.Fecha = FechaHelper.AhoraHonduras();
            gasto.Activo = true;
            gasto.Id_Usuario = idUsuario.Value;
            gasto.Id_Sucursal = idSucursal.Value;
            gasto.Categoria_Gasto = categoria;
            gasto.Descripcion = descripcion;

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
