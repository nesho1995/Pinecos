using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pinecos.Attributes;
using Pinecos.Data;
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
        private readonly PinecosDbContext _context;

        public FacturacionSarController(IWebHostEnvironment env, PinecosDbContext context)
        {
            _env = env;
            _context = context;
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
                    return BadRequest(ApiErrorHelper.Build(HttpContext, "MISSING_SUCURSAL", "Para ADMIN debes indicar idSucursal"));
                }
            }
            else
            {
                if (!idSucursalToken.HasValue)
                    return BadRequest(ApiErrorHelper.Build(HttpContext, "MISSING_SUCURSAL", "El usuario no tiene sucursal asignada"));
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
                return BadRequest(ApiErrorHelper.Build(HttpContext, "INVALID_SUCURSAL", "idSucursal invalido"));

            try
            {
                model.IdSucursal = idSucursal;
                FacturacionSarStore.ValidarConfiguracion(model);
                FacturacionSarStore.SaveConfig(_env.ContentRootPath, idSucursal, model);
                return Ok(new { message = "Configuracion SAR actualizada", data = model });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiErrorHelper.Build(HttpContext, "INVALID_SAR_CONFIG", ex.Message));
            }
        }

        [HttpGet("eventos")]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> GetEventos(
            [FromQuery] int? idSucursal = null,
            [FromQuery] string? estado = null,
            [FromQuery] bool soloNoRevisados = false,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 100)
        {
            if (page <= 0) page = 1;
            if (pageSize <= 0 || pageSize > 500) pageSize = 100;

            var query = _context.FacturacionSarCorrelativoEventos.AsNoTracking().AsQueryable();
            if (idSucursal.HasValue && idSucursal.Value > 0)
                query = query.Where(x => x.Id_Sucursal == idSucursal.Value);

            if (!string.IsNullOrWhiteSpace(estado))
            {
                var estadoNorm = estado.Trim().ToUpperInvariant();
                query = query.Where(x => x.Estado == estadoNorm);
            }

            if (soloNoRevisados)
                query = query.Where(x => !x.Revisado);

            var total = await query.CountAsync();
            var data = await query
                .OrderByDescending(x => x.Fecha_Creacion)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new
                {
                    x.Id_Facturacion_Sar_Correlativo_Evento,
                    x.Id_Sucursal,
                    x.Numero_Factura,
                    x.Cai,
                    x.Fecha_Limite_Emision,
                    x.Estado,
                    x.Origen,
                    x.Id_Venta,
                    x.Id_Usuario,
                    x.Motivo_Fallo,
                    x.Revisado,
                    x.Comentario_Operacion,
                    x.Id_Usuario_Revision,
                    x.Fecha_Revision,
                    x.Fecha_Creacion,
                    x.Fecha_Actualizacion
                })
                .ToListAsync();

            return Ok(new
            {
                total,
                page,
                pageSize,
                data
            });
        }

        [HttpGet("resumen-operativo")]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> GetResumenOperativo([FromQuery] int? idSucursal = null)
        {
            var query = _context.FacturacionSarCorrelativoEventos.AsNoTracking().AsQueryable();
            if (idSucursal.HasValue && idSucursal.Value > 0)
                query = query.Where(x => x.Id_Sucursal == idSucursal.Value);

            var total = await query.CountAsync();
            var reservados = await query.CountAsync(x => x.Estado == "RESERVADO");
            var emitidos = await query.CountAsync(x => x.Estado == "EMITIDO");
            var fallidos = await query.CountAsync(x => x.Estado == "FALLIDO");
            var pendientes = reservados + fallidos;
            var revisados = await query.CountAsync(x => x.Revisado);

            var fallosRecientes = await query
                .Where(x => x.Estado == "FALLIDO")
                .OrderByDescending(x => x.Fecha_Actualizacion ?? x.Fecha_Creacion)
                .Take(20)
                .Select(x => new
                {
                    x.Id_Facturacion_Sar_Correlativo_Evento,
                    x.Id_Sucursal,
                    x.Numero_Factura,
                    x.Origen,
                    x.Motivo_Fallo,
                    x.Revisado,
                    x.Comentario_Operacion,
                    fecha = x.Fecha_Actualizacion ?? x.Fecha_Creacion
                })
                .ToListAsync();

            var porSucursal = await query
                .GroupBy(x => x.Id_Sucursal)
                .Select(g => new
                {
                    idSucursal = g.Key,
                    total = g.Count(),
                    reservados = g.Count(x => x.Estado == "RESERVADO"),
                    emitidos = g.Count(x => x.Estado == "EMITIDO"),
                    fallidos = g.Count(x => x.Estado == "FALLIDO")
                })
                .OrderBy(x => x.idSucursal)
                .ToListAsync();

            return Ok(new
            {
                total,
                reservados,
                emitidos,
                fallidos,
                pendientes,
                revisados,
                porSucursal,
                fallosRecientes
            });
        }

        [HttpPatch("eventos/{idEvento:long}/revision")]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> RevisarEvento(long idEvento, [FromBody] FacturacionSarEventoRevisionDto model)
        {
            var idUsuario = UserHelper.GetUserId(User);
            if (!idUsuario.HasValue)
                return Unauthorized(ApiErrorHelper.Build(HttpContext, "INVALID_USER", "Usuario no valido en el token"));

            var evento = await _context.FacturacionSarCorrelativoEventos
                .FirstOrDefaultAsync(x => x.Id_Facturacion_Sar_Correlativo_Evento == idEvento);

            if (evento == null)
                return NotFound(ApiErrorHelper.Build(HttpContext, "EVENT_NOT_FOUND", "Evento fiscal no encontrado"));

            evento.Revisado = model.Revisado;
            evento.Comentario_Operacion = (model.ComentarioOperacion ?? string.Empty).Trim();
            evento.Id_Usuario_Revision = idUsuario.Value;
            evento.Fecha_Revision = FechaHelper.AhoraHonduras();
            evento.Fecha_Actualizacion = evento.Fecha_Revision;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = model.Revisado ? "Evento marcado como revisado" : "Evento marcado como pendiente",
                data = new
                {
                    evento.Id_Facturacion_Sar_Correlativo_Evento,
                    evento.Revisado,
                    evento.Comentario_Operacion,
                    evento.Id_Usuario_Revision,
                    evento.Fecha_Revision
                }
            });
        }

        [HttpPatch("eventos/revision-masiva")]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> RevisarEventosMasivo(
            [FromQuery] int? idSucursal = null,
            [FromQuery] string? estado = null,
            [FromQuery] bool soloNoRevisados = false,
            [FromQuery] int top = 500,
            [FromBody] FacturacionSarEventoRevisionDto model)
        {
            var idUsuario = UserHelper.GetUserId(User);
            if (!idUsuario.HasValue)
                return Unauthorized(ApiErrorHelper.Build(HttpContext, "INVALID_USER", "Usuario no valido en el token"));

            if (top <= 0) top = 500;
            if (top > 2000) top = 2000;

            var query = _context.FacturacionSarCorrelativoEventos.AsQueryable();
            if (idSucursal.HasValue && idSucursal.Value > 0)
                query = query.Where(x => x.Id_Sucursal == idSucursal.Value);

            if (!string.IsNullOrWhiteSpace(estado))
            {
                var estadoNorm = estado.Trim().ToUpperInvariant();
                query = query.Where(x => x.Estado == estadoNorm);
            }

            if (soloNoRevisados)
                query = query.Where(x => !x.Revisado);

            var totalCoincidencias = await query.CountAsync();
            var eventos = await query
                .OrderBy(x => x.Id_Facturacion_Sar_Correlativo_Evento)
                .Take(top)
                .ToListAsync();
            if (eventos.Count == 0)
                return Ok(new { message = "No hay eventos para actualizar con ese filtro", totalActualizados = 0 });

            var ahora = FechaHelper.AhoraHonduras();
            var comentario = (model.ComentarioOperacion ?? string.Empty).Trim();
            foreach (var evento in eventos)
            {
                evento.Revisado = model.Revisado;
                evento.Comentario_Operacion = comentario;
                evento.Id_Usuario_Revision = idUsuario.Value;
                evento.Fecha_Revision = ahora;
                evento.Fecha_Actualizacion = ahora;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = model.Revisado
                    ? "Eventos marcados como revisados"
                    : "Eventos marcados como pendientes",
                totalActualizados = eventos.Count,
                totalCoincidencias,
                limiteAplicado = top,
                pendientesPorActualizar = Math.Max(totalCoincidencias - eventos.Count, 0)
            });
        }

        [HttpPatch("eventos/revision-seleccion")]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> RevisarEventosSeleccion([FromBody] FacturacionSarEventoRevisionSeleccionDto model)
        {
            var idUsuario = UserHelper.GetUserId(User);
            if (!idUsuario.HasValue)
                return Unauthorized(ApiErrorHelper.Build(HttpContext, "INVALID_USER", "Usuario no valido en el token"));

            var ids = (model.IdsEvento ?? new List<long>())
                .Distinct()
                .Where(x => x > 0)
                .ToList();

            if (ids.Count == 0)
                return BadRequest(ApiErrorHelper.Build(HttpContext, "EMPTY_SELECTION", "Debes seleccionar al menos un evento"));

            var eventos = await _context.FacturacionSarCorrelativoEventos
                .Where(x => ids.Contains(x.Id_Facturacion_Sar_Correlativo_Evento))
                .ToListAsync();

            if (eventos.Count == 0)
                return NotFound(ApiErrorHelper.Build(HttpContext, "EVENTS_NOT_FOUND", "No se encontraron eventos para la seleccion"));

            var ahora = FechaHelper.AhoraHonduras();
            var comentario = (model.ComentarioOperacion ?? string.Empty).Trim();
            foreach (var evento in eventos)
            {
                evento.Revisado = model.Revisado;
                evento.Comentario_Operacion = comentario;
                evento.Id_Usuario_Revision = idUsuario.Value;
                evento.Fecha_Revision = ahora;
                evento.Fecha_Actualizacion = ahora;
            }

            await _context.SaveChangesAsync();
            return Ok(new
            {
                message = model.Revisado
                    ? "Eventos seleccionados marcados como revisados"
                    : "Eventos seleccionados marcados como pendientes",
                totalActualizados = eventos.Count
            });
        }
    }
}
