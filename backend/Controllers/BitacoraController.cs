using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pinecos.Attributes;
using Pinecos.Data;
using Pinecos.Helpers;

namespace Pinecos.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AuthorizeRoles("ADMIN")]
    public class BitacoraController : ControllerBase
    {
        private readonly PinecosDbContext _context;

        public BitacoraController(PinecosDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult> GetBitacora(DateTime? desde, DateTime? hasta, string? modulo)
        {
            var fechaDesde = desde ?? FechaHelper.HoyInicioHonduras();
            var fechaHasta = hasta ?? FechaHelper.HoyFinHonduras();

            var query = _context.Bitacora
                .Where(x => x.Fecha >= fechaDesde && x.Fecha <= fechaHasta);

            if (!string.IsNullOrWhiteSpace(modulo))
                query = query.Where(x => x.Modulo == modulo);

            var data = await query
                .OrderByDescending(x => x.Fecha)
                .ToListAsync();

            return Ok(data);
        }
    }
}
