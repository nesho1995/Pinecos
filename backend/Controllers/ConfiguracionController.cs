using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pinecos.Attributes;
using Pinecos.Data;
using Pinecos.DTOs;
using Pinecos.Helpers;
using Pinecos.Models;

namespace Pinecos.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AuthorizeRoles("ADMIN")]
    public class ConfiguracionController : ControllerBase
    {
        private readonly PinecosDbContext _context;
        private readonly IWebHostEnvironment _env;

        public ConfiguracionController(PinecosDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        /// <summary>
        /// Garantiza una fila base con Activo=true (BD nueva o tabla vacia tras TRUNCATE).
        /// </summary>
        private async Task<ConfiguracionNegocio> ObtenerOCrearConfiguracionBaseAsync()
        {
            var baseConfig = await _context.ConfiguracionNegocio
                .FirstOrDefaultAsync(x => x.Activo);

            if (baseConfig != null)
                return baseConfig;

            var inactiva = await _context.ConfiguracionNegocio
                .OrderBy(x => x.Id_Configuracion)
                .FirstOrDefaultAsync();

            if (inactiva != null)
            {
                inactiva.Activo = true;
                await _context.SaveChangesAsync();
                return inactiva;
            }

            var nuevo = new ConfiguracionNegocio
            {
                Nombre_Negocio = "Mi negocio",
                Direccion = string.Empty,
                Telefono = string.Empty,
                Rtn = string.Empty,
                Correo_Negocio = string.Empty,
                Mensaje_Ticket = "Gracias por su compra",
                Ancho_Ticket = "80mm",
                Logo_Url = string.Empty,
                Moneda = "L",
                Activo = true
            };

            _context.ConfiguracionNegocio.Add(nuevo);
            await _context.SaveChangesAsync();

            return nuevo;
        }

        [HttpGet]
        public async Task<ActionResult> GetConfiguracion([FromQuery] int? idSucursal = null)
        {
            var baseConfig = await ObtenerOCrearConfiguracionBaseAsync();

            if (idSucursal.HasValue && idSucursal.Value > 0)
            {
                var merged = ConfiguracionSucursalStore.GetMergedConfig(_env.ContentRootPath, idSucursal.Value, baseConfig);
                return Ok(merged);
            }

            return Ok(baseConfig);
        }

        [HttpPut]
        public async Task<ActionResult> ActualizarConfiguracion([FromQuery] int? idSucursal, [FromBody] ConfiguracionNegocio model)
        {
            var idUsuario = UserHelper.GetUserId(User);

            var baseConfig = await ObtenerOCrearConfiguracionBaseAsync();

            if (idSucursal.HasValue && idSucursal.Value > 0)
            {
                var cfg = new ConfiguracionSucursalDto
                {
                    IdSucursal = idSucursal.Value,
                    Nombre_Negocio = model.Nombre_Negocio,
                    Direccion = model.Direccion,
                    Telefono = model.Telefono,
                    Rtn = model.Rtn,
                    Correo_Negocio = model.Correo_Negocio,
                    Mensaje_Ticket = model.Mensaje_Ticket,
                    Ancho_Ticket = model.Ancho_Ticket,
                    Logo_Url = model.Logo_Url,
                    Moneda = model.Moneda,
                    Activo = model.Activo
                };

                ConfiguracionSucursalStore.SaveOverride(_env.ContentRootPath, idSucursal.Value, cfg);

                await BitacoraHelper.RegistrarAsync(_context, idUsuario, "CONFIGURACION", "EDITAR", $"Configuracion sucursal #{idSucursal.Value} actualizada");

                var merged = ConfiguracionSucursalStore.GetMergedConfig(_env.ContentRootPath, idSucursal.Value, baseConfig);
                return Ok(new
                {
                    message = "Configuracion por sucursal actualizada correctamente",
                    data = merged
                });
            }

            baseConfig.Nombre_Negocio = model.Nombre_Negocio;
            baseConfig.Direccion = model.Direccion;
            baseConfig.Telefono = model.Telefono;
            baseConfig.Rtn = model.Rtn;
            baseConfig.Correo_Negocio = model.Correo_Negocio;
            baseConfig.Mensaje_Ticket = model.Mensaje_Ticket;
            baseConfig.Ancho_Ticket = model.Ancho_Ticket;
            baseConfig.Logo_Url = model.Logo_Url;
            baseConfig.Moneda = model.Moneda;

            await _context.SaveChangesAsync();

            await BitacoraHelper.RegistrarAsync(_context, idUsuario, "CONFIGURACION", "EDITAR", "Configuracion global actualizada");

            return Ok(new
            {
                message = "Configuracion global actualizada correctamente",
                data = baseConfig
            });
        }

        [HttpPost("logo")]
        [RequestSizeLimit(2_097_152)]
        public async Task<ActionResult> SubirLogo([FromForm] IFormFile? file, [FromQuery] int? idSucursal = null)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "Adjunta un logo en formato PNG, JPG o WEBP." });

            if (file.Length > 2_097_152)
                return BadRequest(new { message = "El logo no debe superar 2 MB." });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            var permitidas = new[] { ".png", ".jpg", ".jpeg", ".webp" };
            if (!permitidas.Contains(ext))
                return BadRequest(new { message = "Solo se admiten logos PNG, JPG, JPEG o WEBP." });

            var contentType = (file.ContentType ?? string.Empty).ToLowerInvariant();
            if (!contentType.StartsWith("image/"))
                return BadRequest(new { message = "El archivo debe ser una imagen valida." });

            var baseConfig = await ObtenerOCrearConfiguracionBaseAsync();
            var uploadsFolder = Path.Combine(_env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"), "uploads", "logos");
            Directory.CreateDirectory(uploadsFolder);

            var fileName = $"logo-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid():N}{ext}";
            var fullPath = Path.Combine(uploadsFolder, fileName);
            await using (var stream = System.IO.File.Create(fullPath))
                await file.CopyToAsync(stream);

            var logoUrl = $"/uploads/logos/{fileName}";
            if (idSucursal.HasValue && idSucursal.Value > 0)
            {
                var cfg = ConfiguracionSucursalStore.GetMergedConfig(_env.ContentRootPath, idSucursal.Value, baseConfig);
                cfg.Logo_Url = logoUrl;
                ConfiguracionSucursalStore.SaveOverride(_env.ContentRootPath, idSucursal.Value, ConfiguracionSucursalStore.ToDto(cfg, idSucursal.Value));
            }
            else
            {
                baseConfig.Logo_Url = logoUrl;
                await _context.SaveChangesAsync();
            }

            return Ok(new
            {
                message = "Logo cargado correctamente",
                logo_Url = logoUrl
            });
        }
    }
}
