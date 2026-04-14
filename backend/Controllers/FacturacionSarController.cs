using Microsoft.AspNetCore.Mvc;
using Pinecos.Attributes;
using Pinecos.DTOs;
using Pinecos.Helpers;

namespace Pinecos.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AuthorizeRoles("ADMIN", "CAJERO")]
    public class FacturacionSarController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;

        public FacturacionSarController(IWebHostEnvironment env)
        {
            _env = env;
        }

        [HttpGet]
        public ActionResult Get([FromQuery] int? idSucursal = null)
        {
            var rol = UserHelper.GetUserRole(User);
            var idSucursalToken = UserHelper.GetSucursalId(User);

            int sucursalObjetivo;
            if (rol == "ADMIN")
            {
                if (idSucursal.HasValue && idSucursal.Value > 0)
                {
                    sucursalObjetivo = idSucursal.Value;
                }
                else if (idSucursalToken.HasValue)
                {
                    sucursalObjetivo = idSucursalToken.Value;
                }
                else
                {
                    return BadRequest(new { message = "Para ADMIN debes indicar idSucursal" });
                }
            }
            else
            {
                if (!idSucursalToken.HasValue)
                    return BadRequest(new { message = "El usuario no tiene sucursal asignada" });
                sucursalObjetivo = idSucursalToken.Value;
            }

            var config = FacturacionSarStore.GetConfig(_env.ContentRootPath, sucursalObjetivo);
            return Ok(config);
        }

        [HttpGet("lista")]
        [AuthorizeRoles("ADMIN")]
        public ActionResult GetLista()
        {
            var data = FacturacionSarStore.GetAllResumen(_env.ContentRootPath);
            return Ok(data);
        }

        [HttpPut]
        [AuthorizeRoles("ADMIN")]
        public ActionResult Put([FromQuery] int idSucursal, [FromBody] FacturacionSarConfigDto model)
        {
            if (idSucursal <= 0)
                return BadRequest(new { message = "idSucursal invalido" });

            try
            {
                model.IdSucursal = idSucursal;
                FacturacionSarStore.ValidarConfiguracion(model);
                FacturacionSarStore.SaveConfig(_env.ContentRootPath, idSucursal, model);
                return Ok(new { message = "Configuracion SAR actualizada", data = model });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
