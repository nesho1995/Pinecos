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
    [AuthorizeRoles("ADMIN", "CAJERO")]
    public class VentasController : ControllerBase
    {
        private readonly PinecosDbContext _context;
        private readonly IWebHostEnvironment _env;

        public VentasController(PinecosDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        [HttpPost]
        public async Task<ActionResult> RegistrarVenta([FromBody] VentaRequestDto request)
        {
            var idUsuario = UserHelper.GetUserId(User);
            var idSucursal = UserHelper.GetSucursalId(User);

            if (!idUsuario.HasValue)
                return Unauthorized(new { message = "Usuario no válido en el token" });

            if (!idSucursal.HasValue)
                return BadRequest(new { message = "El usuario no tiene sucursal asignada" });

            if (request.Detalles == null || request.Detalles.Count == 0)
                return BadRequest(new { message = "La venta debe tener al menos un detalle" });

            var sarConfig = FacturacionSarStore.GetConfig(_env.ContentRootPath, idSucursal.Value);
            if (sarConfig.HabilitadoCai && !request.EmitirFactura && !sarConfig.PermitirVentaSinFactura)
                return BadRequest(new { message = "En esta sucursal se requiere emitir factura CAI en cada venta" });

            if (!sarConfig.HabilitadoCai && request.EmitirFactura)
                return BadRequest(new { message = "La facturacion CAI esta desactivada para esta sucursal" });

            var caja = await _context.Cajas.FirstOrDefaultAsync(x =>
                x.Id_Caja == request.Id_Caja &&
                x.Id_Sucursal == idSucursal.Value &&
                x.Estado == "ABIERTA");

            if (caja == null)
                return BadRequest(new { message = "La caja no existe o no está abierta en la sucursal del usuario" });

            var subtotal = 0m;
            var detallesVenta = new List<DetalleVenta>();

            foreach (var item in request.Detalles)
            {
                if (item.Cantidad <= 0)
                    return BadRequest(new { message = "La cantidad debe ser mayor a cero" });

                var producto = await _context.Productos.FirstOrDefaultAsync(x =>
                    x.Id_Producto == item.Id_Producto && x.Activo);

                if (producto == null)
                    return BadRequest(new { message = $"Producto no válido: {item.Id_Producto}" });

                var precioUnitario = await PreciosHelper.ObtenerPrecioAsync(
                    _context,
                    idSucursal.Value,
                    item.Id_Producto,
                    item.Id_Presentacion);

                if (!precioUnitario.HasValue || precioUnitario.Value <= 0)
                {
                    return BadRequest(new
                    {
                        message = $"No hay precio configurado para producto {item.Id_Producto} en la sucursal {idSucursal.Value}"
                    });
                }

                var lineaSubtotal = item.Cantidad * precioUnitario.Value;
                subtotal += lineaSubtotal;

                detallesVenta.Add(new DetalleVenta
                {
                    Id_Producto = item.Id_Producto,
                    Id_Presentacion = item.Id_Presentacion,
                    Cantidad = item.Cantidad,
                    Precio_Unitario = precioUnitario.Value,
                    Costo_Unitario = producto.Costo,
                    Subtotal = lineaSubtotal,
                    Observacion = item.Observacion
                });
            }

            if (request.Descuento < 0 || request.Impuesto < 0)
                return BadRequest(new { message = "Descuento e impuesto no pueden ser negativos" });

            var impuestoAplicado = request.ImpuestoIncluidoEnSubtotal ? 0 : request.Impuesto;
            var total = subtotal - request.Descuento + impuestoAplicado;

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                FacturaEmitidaDto? factura = null;
                if (request.EmitirFactura)
                {
                    try
                    {
                        factura = FacturacionSarStore.EmitirSiguiente(_env.ContentRootPath, idSucursal.Value);
                    }
                    catch (InvalidOperationException ex)
                    {
                        await transaction.RollbackAsync();
                        return BadRequest(new { message = ex.Message });
                    }
                }

                var observacionFinal = request.Observacion;
                if (factura != null)
                {
                    var fechaLimite = factura.FechaLimiteEmision?.ToString("yyyy-MM-dd") ?? "";
                    var rango = string.IsNullOrWhiteSpace(sarConfig.RangoInicio) && string.IsNullOrWhiteSpace(sarConfig.RangoFin)
                        ? ""
                        : $" RANGO:{sarConfig.RangoInicio}..{sarConfig.RangoFin}";
                    var facturaObs = $"FACTURA:{factura.NumeroFactura} | CAI:{factura.Cai} | VENCE:{fechaLimite}{rango}";
                    observacionFinal = string.IsNullOrWhiteSpace(observacionFinal)
                        ? facturaObs
                        : $"{observacionFinal} | {facturaObs}";
                }

                var venta = new Venta
                {
                    Id_Caja = request.Id_Caja,
                    Id_Sucursal = idSucursal.Value,
                    Id_Usuario = idUsuario.Value,
                    Fecha = FechaHelper.AhoraHonduras(),
                    Subtotal = subtotal,
                    Descuento = request.Descuento,
                    Impuesto = request.Impuesto,
                    Total = total,
                    Metodo_Pago = request.Metodo_Pago,
                    Observacion = observacionFinal,
                    Estado = "ACTIVA"
                };

                _context.Ventas.Add(venta);
                await _context.SaveChangesAsync();

                foreach (var detalle in detallesVenta)
                {
                    detalle.Id_Venta = venta.Id_Venta;
                    _context.DetalleVenta.Add(detalle);
                }

                await _context.SaveChangesAsync();

                await BitacoraHelper.RegistrarAsync(_context, idUsuario.Value, "VENTAS", "CREAR", $"Venta #{venta.Id_Venta} registrada");

                await transaction.CommitAsync();

                return Ok(new
                {
                    message = "Venta registrada correctamente",
                    data = new
                    {
                        venta.Id_Venta,
                        venta.Total,
                        factura
                    }
                });
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        [HttpGet]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> GetVentas()
        {
            var rol = UserHelper.GetUserRole(User);
            var idSucursal = UserHelper.GetSucursalId(User);

            var query = _context.Ventas.AsQueryable();

            if (rol != "ADMIN")
            {
                if (!idSucursal.HasValue)
                    return BadRequest(new { message = "El usuario no tiene sucursal asignada" });

                query = query.Where(x => x.Id_Sucursal == idSucursal.Value);
            }

            var ventas = await query
                .OrderByDescending(x => x.Fecha)
                .ToListAsync();

            return Ok(ventas);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult> GetVenta(int id)
        {
            var venta = await _context.Ventas.FindAsync(id);

            if (venta == null)
                return NotFound(new { message = "Venta no encontrada" });

            var detalles = await _context.DetalleVenta
                .Where(x => x.Id_Venta == id)
                .ToListAsync();

            return Ok(new
            {
                venta,
                detalles
            });
        }

        [HttpPost("anular/{id}")]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> AnularVenta(int id)
        {
            var idUsuario = UserHelper.GetUserId(User);

            if (!idUsuario.HasValue)
                return Unauthorized(new { message = "Usuario no válido en el token" });

            var venta = await _context.Ventas.FindAsync(id);

            if (venta == null)
                return NotFound(new { message = "Venta no encontrada" });

            if (venta.Estado == "ANULADA")
                return BadRequest(new { message = "La venta ya está anulada" });

            venta.Estado = "ANULADA";
            await _context.SaveChangesAsync();

            await BitacoraHelper.RegistrarAsync(_context, idUsuario.Value, "VENTAS", "ANULAR", $"Venta #{venta.Id_Venta} anulada");

            return Ok(new { message = "Venta anulada correctamente" });
        }   
    }
}
