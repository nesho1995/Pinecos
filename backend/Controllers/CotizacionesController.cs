using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pinecos.Attributes;
using Pinecos.Data;
using Pinecos.Documents;
using Pinecos.DTOs;
using Pinecos.Helpers;
using Pinecos.Models;
using QuestPDF.Fluent;

namespace Pinecos.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AuthorizeRoles("ADMIN", "CAJERO", "SUPERVISOR")]
    public class CotizacionesController : ControllerBase
    {
        private readonly PinecosDbContext _context;
        private readonly IWebHostEnvironment _env;

        public CotizacionesController(PinecosDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        [HttpGet]
        public async Task<ActionResult> GetCotizaciones(
            [FromQuery] string? busqueda = null,
            [FromQuery] string? estado = null,
            [FromQuery] int? idSucursal = null,
            [FromQuery] DateTime? desde = null,
            [FromQuery] DateTime? hasta = null)
        {
            var query = FiltrarPorSucursal(_context.Cotizaciones.AsNoTracking(), idSucursal);

            if (!string.IsNullOrWhiteSpace(estado))
            {
                var estadoNorm = estado.Trim().ToUpperInvariant();
                query = query.Where(x => x.Estado == estadoNorm);
            }

            if (desde.HasValue)
                query = query.Where(x => x.Fecha >= desde.Value.Date);
            if (hasta.HasValue)
                query = query.Where(x => x.Fecha < hasta.Value.Date.AddDays(1));

            if (!string.IsNullOrWhiteSpace(busqueda))
            {
                var term = busqueda.Trim();
                query = query.Where(x => x.Numero.Contains(term) || x.Cliente_Nombre.Contains(term) || x.Cliente_Rtn.Contains(term));
            }

            var data = await (
                from c in query
                join s in _context.Sucursales.AsNoTracking() on c.Id_Sucursal equals s.Id_Sucursal into sucJoin
                from s in sucJoin.DefaultIfEmpty()
                join u in _context.Usuarios.AsNoTracking() on c.Id_Usuario equals u.Id_Usuario into userJoin
                from u in userJoin.DefaultIfEmpty()
                orderby c.Fecha_Creacion descending
                select new CotizacionResponseDto
                {
                    Id_Cotizacion = c.Id_Cotizacion,
                    Numero = c.Numero,
                    Fecha = c.Fecha,
                    Id_Sucursal = c.Id_Sucursal,
                    Sucursal = s != null ? s.Nombre : string.Empty,
                    Id_Usuario = c.Id_Usuario,
                    Usuario = u != null ? u.Nombre : string.Empty,
                    Cliente_Nombre = c.Cliente_Nombre,
                    Cliente_Rtn = c.Cliente_Rtn,
                    Cliente_Direccion = c.Cliente_Direccion,
                    Cliente_Telefono = c.Cliente_Telefono,
                    Subtotal = c.Subtotal,
                    Descuento = c.Descuento,
                    Impuesto = c.Impuesto,
                    Total = c.Total,
                    Estado = c.Estado,
                    Observacion = c.Observacion,
                    Fecha_Creacion = c.Fecha_Creacion,
                    Fecha_Actualizacion = c.Fecha_Actualizacion,
                    Fecha_Anulacion = c.Fecha_Anulacion,
                    Motivo_Anulacion = c.Motivo_Anulacion
                }
            ).Take(200).ToListAsync();

            return Ok(data);
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult> GetCotizacion(int id)
        {
            var cotizacion = await CargarCotizacionDtoAsync(id);
            if (cotizacion == null)
                return NotFound(new { message = "Cotizacion no encontrada" });

            if (!PuedeVerSucursal(cotizacion.Id_Sucursal))
                return Forbid();

            return Ok(cotizacion);
        }

        [HttpPost]
        public async Task<ActionResult> CrearCotizacion([FromBody] CotizacionRequestDto request)
        {
            var validacion = ValidarRequest(request);
            if (!string.IsNullOrWhiteSpace(validacion))
                return BadRequest(new { message = validacion });

            var idUsuario = UserHelper.GetUserId(User);
            if (!idUsuario.HasValue)
                return Unauthorized(new { message = "Sesion invalida" });

            var ahora = FechaHelper.AhoraHonduras();
            var idSucursal = ResolverSucursalTrabajo(request.Id_Sucursal);
            var detalles = ConstruirDetalles(request.Detalles);
            var subtotal = detalles.Sum(x => x.Subtotal);
            var descuento = Math.Max(0, request.Descuento);
            var impuesto = Math.Max(0, request.Impuesto);

            var cotizacion = new Cotizacion
            {
                Numero = await GenerarNumeroAsync(ahora),
                Fecha = ahora,
                Id_Sucursal = idSucursal,
                Id_Usuario = idUsuario.Value,
                Cliente_Nombre = request.Cliente_Nombre.Trim(),
                Cliente_Rtn = (request.Cliente_Rtn ?? string.Empty).Trim(),
                Cliente_Direccion = (request.Cliente_Direccion ?? string.Empty).Trim(),
                Cliente_Telefono = (request.Cliente_Telefono ?? string.Empty).Trim(),
                Subtotal = subtotal,
                Descuento = descuento,
                Impuesto = impuesto,
                Total = Math.Max(0, subtotal - descuento + impuesto),
                Estado = "EMITIDA",
                Observacion = (request.Observacion ?? string.Empty).Trim(),
                Fecha_Creacion = ahora,
                Detalles = detalles
            };

            _context.Cotizaciones.Add(cotizacion);
            await _context.SaveChangesAsync();

            await BitacoraHelper.RegistrarAsync(_context, idUsuario, "COTIZACIONES", "CREAR", $"Cotizacion {cotizacion.Numero} creada");

            return CreatedAtAction(nameof(GetCotizacion), new { id = cotizacion.Id_Cotizacion }, await CargarCotizacionDtoAsync(cotizacion.Id_Cotizacion));
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult> ActualizarCotizacion(int id, [FromBody] CotizacionRequestDto request)
        {
            var validacion = ValidarRequest(request);
            if (!string.IsNullOrWhiteSpace(validacion))
                return BadRequest(new { message = validacion });

            var cotizacion = await _context.Cotizaciones.Include(x => x.Detalles).FirstOrDefaultAsync(x => x.Id_Cotizacion == id);
            if (cotizacion == null)
                return NotFound(new { message = "Cotizacion no encontrada" });
            if (!PuedeVerSucursal(cotizacion.Id_Sucursal))
                return Forbid();
            if (cotizacion.Estado == "ANULADA")
                return BadRequest(new { message = "No se puede editar una cotizacion anulada." });

            var detalles = ConstruirDetalles(request.Detalles);
            var subtotal = detalles.Sum(x => x.Subtotal);
            var descuento = Math.Max(0, request.Descuento);
            var impuesto = Math.Max(0, request.Impuesto);

            cotizacion.Id_Sucursal = ResolverSucursalTrabajo(request.Id_Sucursal);
            cotizacion.Cliente_Nombre = request.Cliente_Nombre.Trim();
            cotizacion.Cliente_Rtn = (request.Cliente_Rtn ?? string.Empty).Trim();
            cotizacion.Cliente_Direccion = (request.Cliente_Direccion ?? string.Empty).Trim();
            cotizacion.Cliente_Telefono = (request.Cliente_Telefono ?? string.Empty).Trim();
            cotizacion.Subtotal = subtotal;
            cotizacion.Descuento = descuento;
            cotizacion.Impuesto = impuesto;
            cotizacion.Total = Math.Max(0, subtotal - descuento + impuesto);
            cotizacion.Observacion = (request.Observacion ?? string.Empty).Trim();
            cotizacion.Fecha_Actualizacion = FechaHelper.AhoraHonduras();

            _context.CotizacionDetalle.RemoveRange(cotizacion.Detalles);
            foreach (var detalle in detalles)
                detalle.Id_Cotizacion = cotizacion.Id_Cotizacion;
            _context.CotizacionDetalle.AddRange(detalles);
            await _context.SaveChangesAsync();

            await BitacoraHelper.RegistrarAsync(_context, UserHelper.GetUserId(User), "COTIZACIONES", "EDITAR", $"Cotizacion {cotizacion.Numero} actualizada");

            return Ok(await CargarCotizacionDtoAsync(cotizacion.Id_Cotizacion));
        }

        [HttpPost("{id:int}/anular")]
        public async Task<ActionResult> AnularCotizacion(int id, [FromBody] AnularCotizacionRequestDto request)
        {
            var cotizacion = await _context.Cotizaciones.FirstOrDefaultAsync(x => x.Id_Cotizacion == id);
            if (cotizacion == null)
                return NotFound(new { message = "Cotizacion no encontrada" });
            if (!PuedeVerSucursal(cotizacion.Id_Sucursal))
                return Forbid();
            if (cotizacion.Estado == "ANULADA")
                return BadRequest(new { message = "La cotizacion ya esta anulada." });

            cotizacion.Estado = "ANULADA";
            cotizacion.Fecha_Anulacion = FechaHelper.AhoraHonduras();
            cotizacion.Fecha_Actualizacion = cotizacion.Fecha_Anulacion;
            cotizacion.Id_Usuario_Anulacion = UserHelper.GetUserId(User);
            cotizacion.Motivo_Anulacion = (request.Motivo ?? string.Empty).Trim();

            await _context.SaveChangesAsync();
            await BitacoraHelper.RegistrarAsync(_context, UserHelper.GetUserId(User), "COTIZACIONES", "ANULAR", $"Cotizacion {cotizacion.Numero} anulada");

            return Ok(await CargarCotizacionDtoAsync(cotizacion.Id_Cotizacion));
        }

        [HttpGet("{id:int}/html")]
        public async Task<ActionResult> Html(int id)
        {
            var cotizacion = await CargarCotizacionDtoAsync(id);
            if (cotizacion == null)
                return NotFound(new { message = "Cotizacion no encontrada" });
            if (!PuedeVerSucursal(cotizacion.Id_Sucursal))
                return Forbid();

            var config = await ObtenerConfiguracionAsync(cotizacion.Id_Sucursal);
            var logo = ConstruirLogoUrl(config.Logo_Url);
            var html = CotizacionHtmlHelper.Generar(cotizacion, config, logo);
            return Content(html, "text/html; charset=utf-8");
        }

        [HttpGet("{id:int}/pdf")]
        public async Task<ActionResult> Pdf(int id)
        {
            var cotizacion = await CargarCotizacionDtoAsync(id);
            if (cotizacion == null)
                return NotFound(new { message = "Cotizacion no encontrada" });
            if (!PuedeVerSucursal(cotizacion.Id_Sucursal))
                return Forbid();

            var config = await ObtenerConfiguracionAsync(cotizacion.Id_Sucursal);
            var logoPath = ResolverLogoPath(config.Logo_Url);
            var bytes = new CotizacionDocument(cotizacion, config, logoPath).GeneratePdf();

            return File(bytes, "application/pdf", $"cotizacion-{cotizacion.Numero}.pdf");
        }

        private IQueryable<Cotizacion> FiltrarPorSucursal(IQueryable<Cotizacion> query, int? idSucursal)
        {
            var role = UserHelper.GetUserRole(User);
            if (role == "ADMIN")
            {
                if (idSucursal.HasValue && idSucursal.Value > 0)
                    query = query.Where(x => x.Id_Sucursal == idSucursal.Value);
                return query;
            }

            var userSucursal = UserHelper.GetSucursalId(User);
            return userSucursal.HasValue
                ? query.Where(x => x.Id_Sucursal == userSucursal.Value)
                : query.Where(x => false);
        }

        private bool PuedeVerSucursal(int? idSucursal)
        {
            var role = UserHelper.GetUserRole(User);
            if (role == "ADMIN") return true;
            var userSucursal = UserHelper.GetSucursalId(User);
            return userSucursal.HasValue && idSucursal == userSucursal.Value;
        }

        private int? ResolverSucursalTrabajo(int? requestSucursal)
        {
            var role = UserHelper.GetUserRole(User);
            if (role == "ADMIN")
                return requestSucursal.HasValue && requestSucursal.Value > 0 ? requestSucursal.Value : UserHelper.GetSucursalId(User);
            return UserHelper.GetSucursalId(User);
        }

        private async Task<string> GenerarNumeroAsync(DateTime fecha)
        {
            var prefijo = $"COT-{fecha:yyyyMMdd}";
            var cantidadDia = await _context.Cotizaciones.CountAsync(x => x.Numero.StartsWith(prefijo));
            return $"{prefijo}-{cantidadDia + 1:0000}";
        }

        private static string ValidarRequest(CotizacionRequestDto request)
        {
            if (request == null)
                return "Solicitud invalida.";
            if (string.IsNullOrWhiteSpace(request.Cliente_Nombre))
                return "El nombre del cliente es obligatorio.";
            if (request.Detalles == null || request.Detalles.Count == 0)
                return "Agrega al menos una linea a la cotizacion.";
            if (request.Detalles.Any(x => string.IsNullOrWhiteSpace(x.Descripcion)))
                return "Todas las lineas deben tener descripcion.";
            if (request.Detalles.Any(x => x.Cantidad <= 0))
                return "Todas las cantidades deben ser mayores que cero.";
            if (request.Detalles.Any(x => x.Precio_Unitario < 0))
                return "Los precios no pueden ser negativos.";
            return string.Empty;
        }

        private static List<CotizacionDetalle> ConstruirDetalles(IEnumerable<CotizacionDetalleRequestDto> detalles)
        {
            return detalles.Select((x, idx) =>
            {
                var cantidad = Math.Round(x.Cantidad, 2);
                var precio = Math.Round(x.Precio_Unitario, 2);
                return new CotizacionDetalle
                {
                    Id_Producto = x.Id_Producto,
                    Id_Presentacion = x.Id_Presentacion,
                    Descripcion = x.Descripcion.Trim(),
                    Cantidad = cantidad,
                    Precio_Unitario = precio,
                    Subtotal = Math.Round(cantidad * precio, 2),
                    Orden = idx + 1
                };
            }).ToList();
        }

        private async Task<CotizacionResponseDto?> CargarCotizacionDtoAsync(int id)
        {
            var cotizacion = await (
                from c in _context.Cotizaciones.AsNoTracking()
                join s in _context.Sucursales.AsNoTracking() on c.Id_Sucursal equals s.Id_Sucursal into sucJoin
                from s in sucJoin.DefaultIfEmpty()
                join u in _context.Usuarios.AsNoTracking() on c.Id_Usuario equals u.Id_Usuario into userJoin
                from u in userJoin.DefaultIfEmpty()
                where c.Id_Cotizacion == id
                select new CotizacionResponseDto
                {
                    Id_Cotizacion = c.Id_Cotizacion,
                    Numero = c.Numero,
                    Fecha = c.Fecha,
                    Id_Sucursal = c.Id_Sucursal,
                    Sucursal = s != null ? s.Nombre : string.Empty,
                    Id_Usuario = c.Id_Usuario,
                    Usuario = u != null ? u.Nombre : string.Empty,
                    Cliente_Nombre = c.Cliente_Nombre,
                    Cliente_Rtn = c.Cliente_Rtn,
                    Cliente_Direccion = c.Cliente_Direccion,
                    Cliente_Telefono = c.Cliente_Telefono,
                    Subtotal = c.Subtotal,
                    Descuento = c.Descuento,
                    Impuesto = c.Impuesto,
                    Total = c.Total,
                    Estado = c.Estado,
                    Observacion = c.Observacion,
                    Fecha_Creacion = c.Fecha_Creacion,
                    Fecha_Actualizacion = c.Fecha_Actualizacion,
                    Fecha_Anulacion = c.Fecha_Anulacion,
                    Motivo_Anulacion = c.Motivo_Anulacion
                }
            ).FirstOrDefaultAsync();

            if (cotizacion == null)
                return null;

            cotizacion.Detalles = await _context.CotizacionDetalle.AsNoTracking()
                .Where(x => x.Id_Cotizacion == id)
                .OrderBy(x => x.Orden)
                .Select(x => new CotizacionDetalleResponseDto
                {
                    Id_Cotizacion_Detalle = x.Id_Cotizacion_Detalle,
                    Id_Producto = x.Id_Producto,
                    Id_Presentacion = x.Id_Presentacion,
                    Descripcion = x.Descripcion,
                    Cantidad = x.Cantidad,
                    Precio_Unitario = x.Precio_Unitario,
                    Subtotal = x.Subtotal,
                    Orden = x.Orden
                })
                .ToListAsync();

            return cotizacion;
        }

        private async Task<ConfiguracionNegocio> ObtenerConfiguracionAsync(int? idSucursal)
        {
            var config = await _context.ConfiguracionNegocio.AsNoTracking().FirstOrDefaultAsync(x => x.Activo)
                ?? new ConfiguracionNegocio
                {
                    Nombre_Negocio = "Pinecos",
                    Moneda = "L",
                    Activo = true
                };

            if (idSucursal.HasValue && idSucursal.Value > 0)
                return ConfiguracionSucursalStore.GetMergedConfig(_env.ContentRootPath, idSucursal.Value, config);

            return config;
        }

        private string? ResolverLogoPath(string? logoUrl)
        {
            if (string.IsNullOrWhiteSpace(logoUrl))
                return null;
            if (!logoUrl.StartsWith("/uploads/logos/", StringComparison.OrdinalIgnoreCase))
                return null;

            var relative = logoUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
            var fullPath = Path.Combine(_env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"), relative);
            return System.IO.File.Exists(fullPath) ? fullPath : null;
        }

        private string? ConstruirLogoUrl(string? logoUrl)
        {
            if (string.IsNullOrWhiteSpace(logoUrl))
                return null;
            if (logoUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
                logoUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                return logoUrl;
            return $"{Request.Scheme}://{Request.Host}{logoUrl}";
        }
    }
}
