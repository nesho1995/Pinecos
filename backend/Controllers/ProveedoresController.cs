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
    public class ProveedoresController : ControllerBase
    {
        private readonly PinecosDbContext _context;

        public ProveedoresController(PinecosDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult> Get([FromQuery] bool incluirInactivos = false)
        {
            var query = _context.Proveedores.AsQueryable();
            if (!incluirInactivos)
                query = query.Where(x => x.Activo);

            var data = await query
                .OrderBy(x => x.Nombre)
                .ToListAsync();

            return Ok(data);
        }

        [HttpPost]
        public async Task<ActionResult> Post([FromBody] Proveedor model)
        {
            var idUsuario = UserHelper.GetUserId(User);
            if (!idUsuario.HasValue)
                return Unauthorized(new { message = "Usuario no valido en el token" });

            var nombre = (model.Nombre ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(nombre))
                return BadRequest(new { message = "Nombre de proveedor requerido" });
            if (nombre.Length > 120)
                return BadRequest(new { message = "Nombre de proveedor excede 120 caracteres" });

            var existe = await _context.Proveedores.AnyAsync(x =>
                x.Activo && x.Nombre.ToUpper() == nombre.ToUpper());
            if (existe)
                return BadRequest(new { message = "Ya existe un proveedor activo con ese nombre" });

            var proveedor = new Proveedor
            {
                Nombre = nombre,
                Rtn = (model.Rtn ?? string.Empty).Trim(),
                Telefono = (model.Telefono ?? string.Empty).Trim(),
                Email = (model.Email ?? string.Empty).Trim(),
                Contacto = (model.Contacto ?? string.Empty).Trim(),
                Direccion = (model.Direccion ?? string.Empty).Trim(),
                Fecha_Creacion = FechaHelper.AhoraHonduras(),
                Activo = true
            };

            _context.Proveedores.Add(proveedor);
            await _context.SaveChangesAsync();
            await BitacoraHelper.RegistrarAsync(_context, idUsuario.Value, "PROVEEDORES", "CREAR", $"Proveedor #{proveedor.Id_Proveedor} creado");

            return Ok(new { message = "Proveedor creado correctamente", data = proveedor });
        }

        [HttpPut("{id}")]
        public async Task<ActionResult> Put(int id, [FromBody] Proveedor model)
        {
            var idUsuario = UserHelper.GetUserId(User);
            if (!idUsuario.HasValue)
                return Unauthorized(new { message = "Usuario no valido en el token" });

            var proveedor = await _context.Proveedores.FirstOrDefaultAsync(x => x.Id_Proveedor == id);
            if (proveedor == null)
                return NotFound(new { message = "Proveedor no encontrado" });

            var nombre = (model.Nombre ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(nombre))
                return BadRequest(new { message = "Nombre de proveedor requerido" });
            if (nombre.Length > 120)
                return BadRequest(new { message = "Nombre de proveedor excede 120 caracteres" });

            var duplicado = await _context.Proveedores.AnyAsync(x =>
                x.Id_Proveedor != id && x.Activo && x.Nombre.ToUpper() == nombre.ToUpper());
            if (duplicado)
                return BadRequest(new { message = "Ya existe un proveedor activo con ese nombre" });

            proveedor.Nombre = nombre;
            proveedor.Rtn = (model.Rtn ?? string.Empty).Trim();
            proveedor.Telefono = (model.Telefono ?? string.Empty).Trim();
            proveedor.Email = (model.Email ?? string.Empty).Trim();
            proveedor.Contacto = (model.Contacto ?? string.Empty).Trim();
            proveedor.Direccion = (model.Direccion ?? string.Empty).Trim();
            proveedor.Activo = model.Activo;

            await _context.SaveChangesAsync();
            await BitacoraHelper.RegistrarAsync(_context, idUsuario.Value, "PROVEEDORES", "ACTUALIZAR", $"Proveedor #{proveedor.Id_Proveedor} actualizado");

            return Ok(new { message = "Proveedor actualizado correctamente", data = proveedor });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(int id)
        {
            var idUsuario = UserHelper.GetUserId(User);
            if (!idUsuario.HasValue)
                return Unauthorized(new { message = "Usuario no valido en el token" });

            var proveedor = await _context.Proveedores.FirstOrDefaultAsync(x => x.Id_Proveedor == id);
            if (proveedor == null)
                return NotFound(new { message = "Proveedor no encontrado" });

            proveedor.Activo = false;
            await _context.SaveChangesAsync();
            await BitacoraHelper.RegistrarAsync(_context, idUsuario.Value, "PROVEEDORES", "INACTIVAR", $"Proveedor #{proveedor.Id_Proveedor} inactivado");

            return Ok(new { message = "Proveedor inactivado correctamente" });
        }

        [HttpPost("{id}/reactivar")]
        public async Task<ActionResult> Reactivar(int id)
        {
            var idUsuario = UserHelper.GetUserId(User);
            if (!idUsuario.HasValue)
                return Unauthorized(new { message = "Usuario no valido en el token" });

            var proveedor = await _context.Proveedores.FirstOrDefaultAsync(x => x.Id_Proveedor == id);
            if (proveedor == null)
                return NotFound(new { message = "Proveedor no encontrado" });

            var duplicado = await _context.Proveedores.AnyAsync(x =>
                x.Id_Proveedor != id && x.Activo && x.Nombre.ToUpper() == proveedor.Nombre.ToUpper());
            if (duplicado)
                return BadRequest(new { message = "No se puede reactivar porque ya existe un proveedor activo con ese nombre" });

            proveedor.Activo = true;
            await _context.SaveChangesAsync();
            await BitacoraHelper.RegistrarAsync(_context, idUsuario.Value, "PROVEEDORES", "REACTIVAR", $"Proveedor #{proveedor.Id_Proveedor} reactivado");

            return Ok(new { message = "Proveedor reactivado correctamente" });
        }
    }
}
