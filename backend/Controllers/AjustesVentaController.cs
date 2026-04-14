using Microsoft.AspNetCore.Mvc;
using Pinecos.Attributes;
using Pinecos.DTOs;
using Pinecos.Helpers;

namespace Pinecos.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AuthorizeRoles("ADMIN", "CAJERO")]
    public class AjustesVentaController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;

        public AjustesVentaController(IWebHostEnvironment env)
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
                if (!idSucursal.HasValue || idSucursal.Value <= 0)
                    return BadRequest(new { message = "Para ADMIN debes indicar idSucursal" });
                sucursalObjetivo = idSucursal.Value;
            }
            else
            {
                if (!idSucursalToken.HasValue)
                    return BadRequest(new { message = "El usuario no tiene sucursal asignada" });
                sucursalObjetivo = idSucursalToken.Value;
            }

            var config = AjustesVentaStore.GetConfig(_env.ContentRootPath, sucursalObjetivo);
            return Ok(config);
        }

        [HttpPut]
        [AuthorizeRoles("ADMIN")]
        public ActionResult Put([FromQuery] int idSucursal, [FromBody] AjustesVentaSucursalDto model)
        {
            if (idSucursal <= 0)
                return BadRequest(new { message = "idSucursal invalido" });

            var config = AjustesVentaStore.Sanitize(model);
            config.IdSucursal = idSucursal;
            AjustesVentaStore.SaveConfig(_env.ContentRootPath, idSucursal, config);
            return Ok(new { message = "Ajustes de venta guardados", data = config });
        }
    }
}
