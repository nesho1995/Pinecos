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
        
    public class UsuariosController : ControllerBase
    {
        private readonly PinecosDbContext _context;

        public UsuariosController(PinecosDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult> GetUsuarios()
        {
            var usuarios = await _context.Usuarios
                .GroupJoin(
                    _context.Sucursales,
                    u => u.Id_Sucursal,
                    s => s.Id_Sucursal,
                    (u, sucursales) => new { u, sucursales }
                )
                .SelectMany(
                    x => x.sucursales.DefaultIfEmpty(),
                    (x, s) => new
                    {
                        x.u.Id_Usuario,
                        x.u.Nombre,
                        Usuario = x.u.UsuarioLogin,
                        x.u.Rol,
                        x.u.Id_Sucursal,
                        Sucursal = s != null ? s.Nombre : null,
                        x.u.Activo
                    }
                )
                .OrderBy(x => x.Id_Usuario)
                .ToListAsync();

            return Ok(usuarios);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult> GetUsuario(int id)
        {
            var usuario = await _context.Usuarios
                .Where(u => u.Id_Usuario == id)
                .GroupJoin(
                    _context.Sucursales,
                    u => u.Id_Sucursal,
                    s => s.Id_Sucursal,
                    (u, sucursales) => new { u, sucursales }
                )
                .SelectMany(
                    x => x.sucursales.DefaultIfEmpty(),
                    (x, s) => new
                    {
                        x.u.Id_Usuario,
                        x.u.Nombre,
                        Usuario = x.u.UsuarioLogin,
                        x.u.Rol,
                        x.u.Id_Sucursal,
                        Sucursal = s != null ? s.Nombre : null,
                        x.u.Activo
                    }
                )
                .FirstOrDefaultAsync();

            if (usuario == null)
                return NotFound(new { message = "Usuario no encontrado" });

            return Ok(usuario);
        }

        [HttpPost]
        public async Task<ActionResult> CrearUsuario([FromBody] Usuario usuario)
        {
            if (!SecurityValidationHelper.EsNombreValido(usuario.Nombre))
                return BadRequest(new { message = "El nombre es requerido y debe tener entre 3 y 120 caracteres" });

            if (!SecurityValidationHelper.EsUsuarioLoginValido(usuario.UsuarioLogin))
                return BadRequest(new { message = "El usuario debe tener entre 4 y 40 caracteres (letras, numeros, punto, guion o guion bajo)" });

            if (string.IsNullOrWhiteSpace(usuario.Clave))
                return BadRequest(new { message = "La clave es requerida" });

            if (!SecurityValidationHelper.EsClaveFuerte(usuario.Clave))
                return BadRequest(new { message = "La clave debe tener minimo 8 caracteres e incluir mayuscula, minuscula, numero y simbolo" });

            if (!SecurityValidationHelper.EsRolValido(usuario.Rol))
                return BadRequest(new { message = "Rol invalido. Solo se permite ADMIN o CAJERO" });

            usuario.Nombre = usuario.Nombre.Trim();
            usuario.UsuarioLogin = usuario.UsuarioLogin.Trim();
            usuario.Rol = SecurityValidationHelper.NormalizeRol(usuario.Rol);

            var existeUsuario = await _context.Usuarios
                .AnyAsync(u => u.UsuarioLogin == usuario.UsuarioLogin);

            if (existeUsuario)
                return BadRequest(new { message = "Ya existe un usuario con ese login" });

            if (usuario.Id_Sucursal.HasValue)
            {
                var sucursalExiste = await _context.Sucursales
                    .AnyAsync(s => s.Id_Sucursal == usuario.Id_Sucursal.Value);

                if (!sucursalExiste)
                    return BadRequest(new { message = "La sucursal no existe" });
            }

            usuario.Clave = BCrypt.Net.BCrypt.HashPassword(usuario.Clave);

            _context.Usuarios.Add(usuario);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Usuario creado correctamente",
                data = new
                {
                    usuario.Id_Usuario,
                    usuario.Nombre,
                    Usuario = usuario.UsuarioLogin,
                    usuario.Rol,
                    usuario.Id_Sucursal,
                    usuario.Activo
                }
            });
        }

        [HttpPut("{id}")]
        public async Task<ActionResult> EditarUsuario(int id, [FromBody] Usuario usuario)
        {
            var usuarioDb = await _context.Usuarios.FindAsync(id);

            if (usuarioDb == null)
                return NotFound(new { message = "Usuario no encontrado" });

            if (!SecurityValidationHelper.EsNombreValido(usuario.Nombre))
                return BadRequest(new { message = "El nombre es requerido y debe tener entre 3 y 120 caracteres" });

            if (!SecurityValidationHelper.EsUsuarioLoginValido(usuario.UsuarioLogin))
                return BadRequest(new { message = "El usuario debe tener entre 4 y 40 caracteres (letras, numeros, punto, guion o guion bajo)" });

            if (!SecurityValidationHelper.EsRolValido(usuario.Rol))
                return BadRequest(new { message = "Rol invalido. Solo se permite ADMIN o CAJERO" });

            usuario.Nombre = usuario.Nombre.Trim();
            usuario.UsuarioLogin = usuario.UsuarioLogin.Trim();
            usuario.Rol = SecurityValidationHelper.NormalizeRol(usuario.Rol);

            var existeUsuario = await _context.Usuarios
                .AnyAsync(u => u.UsuarioLogin == usuario.UsuarioLogin && u.Id_Usuario != id);

            if (existeUsuario)
                return BadRequest(new { message = "Ya existe un usuario con ese login" });

            if (usuario.Id_Sucursal.HasValue)
            {
                var sucursalExiste = await _context.Sucursales
                    .AnyAsync(s => s.Id_Sucursal == usuario.Id_Sucursal.Value);

                if (!sucursalExiste)
                    return BadRequest(new { message = "La sucursal no existe" });
            }

            usuarioDb.Nombre = usuario.Nombre;
            usuarioDb.UsuarioLogin = usuario.UsuarioLogin;
            usuarioDb.Rol = usuario.Rol;
            usuarioDb.Id_Sucursal = usuario.Id_Sucursal;
            usuarioDb.Activo = usuario.Activo;

            if (!string.IsNullOrWhiteSpace(usuario.Clave))
            {
                if (!SecurityValidationHelper.EsClaveFuerte(usuario.Clave))
                    return BadRequest(new { message = "La nueva clave debe tener minimo 8 caracteres e incluir mayuscula, minuscula, numero y simbolo" });
                usuarioDb.Clave = BCrypt.Net.BCrypt.HashPassword(usuario.Clave);
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Usuario actualizado correctamente"
            });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> EliminarUsuario(int id)
        {
            var usuarioDb = await _context.Usuarios.FindAsync(id);

            if (usuarioDb == null)
                return NotFound(new { message = "Usuario no encontrado" });

            usuarioDb.Activo = false;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Usuario inactivado correctamente" });
        }
    }
}
