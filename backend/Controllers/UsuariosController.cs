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
            if (string.IsNullOrWhiteSpace(usuario.Nombre))
                return BadRequest(new { message = "El nombre es requerido" });

            if (string.IsNullOrWhiteSpace(usuario.UsuarioLogin))
                return BadRequest(new { message = "El usuario es requerido" });

            if (string.IsNullOrWhiteSpace(usuario.Clave))
                return BadRequest(new { message = "La clave es requerida" });

            if (string.IsNullOrWhiteSpace(usuario.Rol))
                return BadRequest(new { message = "El rol es requerido" });

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

            if (string.IsNullOrWhiteSpace(usuario.Nombre))
                return BadRequest(new { message = "El nombre es requerido" });

            if (string.IsNullOrWhiteSpace(usuario.UsuarioLogin))
                return BadRequest(new { message = "El usuario es requerido" });

            if (string.IsNullOrWhiteSpace(usuario.Rol))
                return BadRequest(new { message = "El rol es requerido" });

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
