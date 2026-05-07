using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.IdentityModel.Tokens;
using Pinecos.Data;
using Pinecos.DTOs;
using Pinecos.Helpers;
using Pinecos.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Pinecos.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly PinecosDbContext _context;
        private readonly IConfiguration _config;
        private readonly IMemoryCache _cache;

        private sealed class LoginFailState
        {
            public int IntentosFallidos { get; set; }
            public DateTime PrimerIntentoUtc { get; set; }
            public DateTime? BloqueadoHastaUtc { get; set; }
        }

        public AuthController(PinecosDbContext context, IConfiguration config, IMemoryCache cache)
        {
            _context = context;
            _config = config;
            _cache = cache;
        }

        [HttpPost("login")]
        [EnableRateLimiting("auth-login")]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto? body)
        {
            var usuarioValue = body?.Usuario?.Trim();
            var claveValue = body?.Clave;

            if (string.IsNullOrWhiteSpace(usuarioValue) || string.IsNullOrWhiteSpace(claveValue))
                return BadRequest(new { message = "Usuario y clave son requeridos" });

            if (usuarioValue.Length > 80)
                return BadRequest(new { message = "El usuario excede el tamano permitido" });

            var userKey = usuarioValue.ToLowerInvariant();
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var lockKey = $"auth:login:{ip}:{userKey}";
            var nowUtc = DateTime.UtcNow;

            if (_cache.TryGetValue<LoginFailState>(lockKey, out var estadoActual) &&
                estadoActual?.BloqueadoHastaUtc.HasValue == true &&
                estadoActual.BloqueadoHastaUtc.Value > nowUtc)
            {
                return StatusCode(StatusCodes.Status429TooManyRequests, new
                {
                    message = "Demasiados intentos fallidos. Espera unos minutos antes de reintentar."
                });
            }

            var user = await _context.Usuarios
                .FirstOrDefaultAsync(u =>
                    u.Activo &&
                    u.UsuarioLogin != null &&
                    u.UsuarioLogin.Trim().ToLower() == userKey);

            var credencialesValidas = user != null && BCrypt.Net.BCrypt.Verify(claveValue, user.Clave);

            if (!credencialesValidas)
            {
                var estado = estadoActual ?? new LoginFailState
                {
                    IntentosFallidos = 0,
                    PrimerIntentoUtc = nowUtc
                };

                if (nowUtc - estado.PrimerIntentoUtc > TimeSpan.FromMinutes(15))
                {
                    estado.IntentosFallidos = 0;
                    estado.PrimerIntentoUtc = nowUtc;
                    estado.BloqueadoHastaUtc = null;
                }

                estado.IntentosFallidos++;
                if (estado.IntentosFallidos >= 5)
                    estado.BloqueadoHastaUtc = nowUtc.AddMinutes(15);

                _cache.Set(lockKey, estado, TimeSpan.FromMinutes(30));

                return Unauthorized(new { message = "Credenciales invalidas" });
            }

            _cache.Remove(lockKey);

            var sucursalesAsignadas = await _context.UsuarioSucursales
                .Include(us => us.Sucursal)
                .Where(us => us.Id_Usuario == user!.Id_Usuario)
                .OrderBy(us => us.Sucursal!.Nombre)
                .ToListAsync();

            if (sucursalesAsignadas.Count > 1)
            {
                var selectionToken = GenerateTempToken(user!.Id_Usuario);
                return Ok(new
                {
                    requiresSucursalSelection = true,
                    selectionToken,
                    sucursales = sucursalesAsignadas.Select(us => new
                    {
                        us.Sucursal!.Id_Sucursal,
                        us.Sucursal.Nombre
                    })
                });
            }

            int? sucursalId = sucursalesAsignadas.Count == 1
                ? sucursalesAsignadas[0].Id_Sucursal
                : user!.Id_Sucursal;

            var token = GenerateToken(user!, sucursalId);

            return Ok(new
            {
                token,
                usuario = new
                {
                    user!.Id_Usuario,
                    user.Nombre,
                    user.UsuarioLogin,
                    user.Rol,
                    Id_Sucursal = sucursalId
                }
            });
        }

        [HttpPost("seleccionar-sucursal")]
        [EnableRateLimiting("auth-login")]
        public async Task<IActionResult> SeleccionarSucursal([FromBody] SeleccionarSucursalDto? body)
        {
            if (body == null || string.IsNullOrWhiteSpace(body.SelectionToken) || body.Id_Sucursal <= 0)
                return BadRequest(new { message = "Datos invalidos" });

            var userId = ValidarTempToken(body.SelectionToken);
            if (userId == null)
                return Unauthorized(new { message = "Token de seleccion invalido o expirado" });

            var tieneAsignacion = await _context.UsuarioSucursales
                .AnyAsync(us => us.Id_Usuario == userId && us.Id_Sucursal == body.Id_Sucursal);

            if (!tieneAsignacion)
                return BadRequest(new { message = "Sucursal no asignada a este usuario" });

            var user = await _context.Usuarios.FindAsync(userId.Value);
            if (user == null || !user.Activo)
                return Unauthorized(new { message = "Usuario invalido" });

            var token = GenerateToken(user, body.Id_Sucursal);

            return Ok(new
            {
                token,
                usuario = new
                {
                    user.Id_Usuario,
                    user.Nombre,
                    user.UsuarioLogin,
                    user.Rol,
                    Id_Sucursal = body.Id_Sucursal
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

        private string GenerateToken(Usuario user, int? sucursalId = null)
        {
            var jwtKey = _config["Jwt:Key"] ?? throw new Exception("Jwt:Key no esta configurado");
            var issuer = _config["Jwt:Issuer"] ?? throw new Exception("Jwt:Issuer no esta configurado");
            var audience = _config["Jwt:Audience"] ?? throw new Exception("Jwt:Audience no esta configurado");
            var rolNormalizado = (user.Rol ?? string.Empty).Trim().ToUpperInvariant();
            var resolvedSucursal = sucursalId ?? user.Id_Sucursal;

            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim("id_usuario", user.Id_Usuario.ToString()),
                new Claim("usuario", user.UsuarioLogin),
                new Claim("rol", rolNormalizado),
                new Claim("id_sucursal", resolvedSucursal?.ToString() ?? ""),
                new Claim(ClaimTypes.Name, user.UsuarioLogin),
                new Claim(ClaimTypes.Role, rolNormalizado)
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

        private string GenerateTempToken(int userId)
        {
            var jwtKey = _config["Jwt:Key"] ?? throw new Exception("Jwt:Key no esta configurado");
            var issuer = _config["Jwt:Issuer"] ?? throw new Exception("Jwt:Issuer no esta configurado");
            var audience = _config["Jwt:Audience"] ?? throw new Exception("Jwt:Audience no esta configurado");

            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim("id_usuario", userId.ToString()),
                new Claim("temp_auth", "true")
            };

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(5),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private int? ValidarTempToken(string tokenStr)
        {
            try
            {
                var jwtKey = _config["Jwt:Key"] ?? throw new Exception("Jwt:Key no esta configurado");
                var issuer = _config["Jwt:Issuer"] ?? throw new Exception("Jwt:Issuer no esta configurado");
                var audience = _config["Jwt:Audience"] ?? throw new Exception("Jwt:Audience no esta configurado");

                var handler = new JwtSecurityTokenHandler();
                var principal = handler.ValidateToken(tokenStr, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
                    ValidateIssuer = true,
                    ValidIssuer = issuer,
                    ValidateAudience = true,
                    ValidAudience = audience,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                }, out _);

                var isTempAuth = principal.FindFirst("temp_auth")?.Value == "true";
                if (!isTempAuth) return null;

                var userIdStr = principal.FindFirst("id_usuario")?.Value;
                if (int.TryParse(userIdStr, out var userId)) return userId;

                return null;
            }
            catch
            {
                return null;
            }
        }
    }
}
