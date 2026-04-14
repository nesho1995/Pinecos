using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Pinecos.Data;
using Pinecos.DTOs;
using Pinecos.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Pinecos.Helpers;

namespace Pinecos.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly PinecosDbContext _context;
        private readonly IConfiguration _config;

        public AuthController(PinecosDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(
            [FromBody] LoginRequestDto? body,
            [FromQuery] string? usuario,
            [FromQuery] string? clave)
        {
            var usuarioValue = body?.Usuario ?? usuario;
            var claveValue = body?.Clave ?? clave;

            if (string.IsNullOrWhiteSpace(usuarioValue) || string.IsNullOrWhiteSpace(claveValue))
                return BadRequest(new { message = "Usuario y clave son requeridos" });

            var user = await _context.Usuarios
                .FirstOrDefaultAsync(u => u.UsuarioLogin == usuarioValue && u.Activo);

            if (user == null)
                return Unauthorized(new { message = "Usuario no encontrado" });

            if (!BCrypt.Net.BCrypt.Verify(claveValue, user.Clave))
                return Unauthorized(new { message = "Clave incorrecta" });

            var token = GenerateToken(user);

            return Ok(new
            {
                token,
                usuario = new
                {
                    user.Id_Usuario,
                    user.Nombre,
                    user.UsuarioLogin,
                    user.Rol,
                    user.Id_Sucursal
                }
            });
        }
        [HttpGet("me")]
        [Authorize]
        public IActionResult Me()
        {
            var idUsuario = UserHelper.GetUserId(User);
            var usuario = UserHelper.GetUserName(User);
            var rol = UserHelper.GetUserRole(User);
            var idSucursal = UserHelper.GetSucursalId(User);

            return Ok(new
            {
                idUsuario,
                usuario,
                rol,
                idSucursal
            });
        }
        private string GenerateToken(Usuario user)
        {
            var jwtKey = _config["Jwt:Key"] ?? throw new Exception("Jwt:Key no está configurado");
            var issuer = _config["Jwt:Issuer"] ?? throw new Exception("Jwt:Issuer no está configurado");
            var audience = _config["Jwt:Audience"] ?? throw new Exception("Jwt:Audience no está configurado");

            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
  {
    new Claim("id_usuario", user.Id_Usuario.ToString()),
    new Claim("usuario", user.UsuarioLogin),
    new Claim("rol", user.Rol),
    new Claim("id_sucursal", user.Id_Sucursal?.ToString() ?? ""),
    new Claim(ClaimTypes.Name, user.UsuarioLogin),
    new Claim(ClaimTypes.Role, user.Rol)
};

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: DateTime.UtcNow.AddHours(8),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
