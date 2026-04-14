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

    public class PresentacionesController : ControllerBase
    {
        private readonly PinecosDbContext _context;

        public PresentacionesController(PinecosDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult> GetPresentaciones()
        {
            var presentaciones = await _context.Presentaciones
                .OrderBy(p => p.Onzas)
                .ToListAsync();

            return Ok(presentaciones);
        }

        [HttpPost]
        public async Task<ActionResult> CrearPresentacion([FromBody] Presentacion presentacion)
        {
            if (string.IsNullOrWhiteSpace(presentacion.Nombre))
                return BadRequest(new { message = "El nombre es requerido" });

            _context.Presentaciones.Add(presentacion);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Presentación creada correctamente",
                data = presentacion
            });
        }
    }
}