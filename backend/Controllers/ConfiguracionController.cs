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
    public class ConfiguracionController : ControllerBase
    {
        private readonly PinecosDbContext _context;

        public ConfiguracionController(PinecosDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult> GetConfiguracion()
        {
            var config = await _context.ConfiguracionNegocio
                .FirstOrDefaultAsync(x => x.Activo);

            if (config == null)
                return NotFound(new { message = "No existe configuración activa" });

            return Ok(config);
        }

        [HttpPut]
        public async Task<ActionResult> ActualizarConfiguracion([FromBody] ConfiguracionNegocio model)
        {
            var idUsuario = UserHelper.GetUserId(User);

            var config = await _context.ConfiguracionNegocio
                .FirstOrDefaultAsync(x => x.Activo);

            if (config == null)
                return NotFound(new { message = "No existe configuración activa" });

            config.Nombre_Negocio = model.Nombre_Negocio;
            config.Direccion = model.Direccion;
            config.Telefono = model.Telefono;
            config.Rtn = model.Rtn;
            config.Mensaje_Ticket = model.Mensaje_Ticket;
            config.Ancho_Ticket = model.Ancho_Ticket;
            config.Logo_Url = model.Logo_Url;
            config.Moneda = model.Moneda;

            await _context.SaveChangesAsync();

            await BitacoraHelper.RegistrarAsync(_context, idUsuario, "CONFIGURACION", "EDITAR", "Configuración del negocio actualizada");

            return Ok(new
            {
                message = "Configuración actualizada correctamente",
                data = config
            });
        }
    }
}