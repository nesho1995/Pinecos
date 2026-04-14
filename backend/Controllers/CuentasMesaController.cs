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
    public class CuentasMesaController : ControllerBase
    {
        private readonly PinecosDbContext _context;
        private readonly IWebHostEnvironment _env;

        public CuentasMesaController(PinecosDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        [HttpPost("abrir")]
        public async Task<ActionResult> AbrirCuenta([FromBody] AbrirCuentaMesaRequestDto request)
        {
            var idUsuario = UserHelper.GetUserId(User);
            var idSucursal = UserHelper.GetSucursalId(User);

            if (!idUsuario.HasValue)
                return Unauthorized(new { message = "Usuario no válido en el token" });

            if (!idSucursal.HasValue)
                return BadRequest(new { message = "El usuario no tiene sucursal asignada" });

            var mesa = await _context.Mesas.FirstOrDefaultAsync(x =>
                x.Id_Mesa == request.Id_Mesa &&
                x.Id_Sucursal == idSucursal.Value &&
                x.Activo);

            if (mesa == null)
                return NotFound(new { message = "Mesa no encontrada" });

            var cuentaAbierta = await _context.CuentasMesa.AnyAsync(x =>
                x.Id_Mesa == request.Id_Mesa &&
                x.Estado == "ABIERTA");

            if (cuentaAbierta)
                return BadRequest(new { message = "La mesa ya tiene una cuenta abierta" });

            var cuenta = new CuentaMesa
            {
                Id_Mesa = request.Id_Mesa,
                Id_Sucursal = idSucursal.Value,
                Id_Usuario = idUsuario.Value,
                Fecha_Apertura = FechaHelper.AhoraHonduras(),
                Estado = "ABIERTA",
                Observacion = request.Observacion
            };

            _context.CuentasMesa.Add(cuenta);
            mesa.Estado = "OCUPADA";

            await _context.SaveChangesAsync();

            await BitacoraHelper.RegistrarAsync(_context, idUsuario.Value, "CUENTAS_MESA", "ABRIR", $"Cuenta mesa #{cuenta.Id_Cuenta_Mesa} abierta");

            return Ok(new { message = "Cuenta de mesa abierta correctamente", data = cuenta });
        }

        [HttpGet("abiertas")]
        public async Task<ActionResult> GetCuentasAbiertas()
        {
            var rol = UserHelper.GetUserRole(User);
            var idSucursal = UserHelper.GetSucursalId(User);

            var query = _context.CuentasMesa.Where(x => x.Estado == "ABIERTA");

            if (rol != "ADMIN")
            {
                if (!idSucursal.HasValue)
                    return BadRequest(new { message = "El usuario no tiene sucursal asignada" });

                query = query.Where(x => x.Id_Sucursal == idSucursal.Value);
            }

            var data = await (
                from c in query
                join m in _context.Mesas on c.Id_Mesa equals m.Id_Mesa
                select new
                {
                    c.Id_Cuenta_Mesa,
                    c.Id_Mesa,
                    Mesa = m.Nombre,
                    c.Fecha_Apertura,
                    c.Estado,
                    c.Observacion
                }
            ).ToListAsync();

            return Ok(data);
        }

        [HttpGet("{idCuenta}")]
        public async Task<ActionResult> GetCuenta(int idCuenta)
        {
            var cuenta = await _context.CuentasMesa.FindAsync(idCuenta);

            if (cuenta == null)
                return NotFound(new { message = "Cuenta de mesa no encontrada" });

            var detalles = await (
                from d in _context.DetalleCuentaMesa
                join p in _context.Productos on d.Id_Producto equals p.Id_Producto
                join pr in _context.Presentaciones on d.Id_Presentacion equals pr.Id_Presentacion into prj
                from pr in prj.DefaultIfEmpty()
                where d.Id_Cuenta_Mesa == idCuenta
                select new
                {
                    d.Id_Detalle_Cuenta_Mesa,
                    d.Id_Producto,
                    Producto = p.Nombre,
                    d.Id_Presentacion,
                    Presentacion = pr != null ? pr.Nombre : "",
                    d.Cantidad,
                    Costo_Unitario = p.Costo,
                    d.Precio_Unitario,
                    d.Subtotal,
                    d.Observacion
                }
            ).ToListAsync();

            var total = detalles.Sum(x => x.Subtotal);

            return Ok(new
            {
                cuenta,
                detalles,
                total
            });
        }

        [HttpPost("{idCuenta}/agregar-producto")]
        public async Task<ActionResult> AgregarProducto(int idCuenta, [FromBody] DetalleCuentaMesaRequestDto request)
        {
            var idUsuario = UserHelper.GetUserId(User);
            var idSucursal = UserHelper.GetSucursalId(User);

            if (!idUsuario.HasValue)
                return Unauthorized(new { message = "Usuario no válido en el token" });

            if (!idSucursal.HasValue)
                return BadRequest(new { message = "El usuario no tiene sucursal asignada" });

            if (request.Cantidad <= 0)
                return BadRequest(new { message = "La cantidad debe ser mayor a cero" });

            var cuenta = await _context.CuentasMesa.FirstOrDefaultAsync(x =>
                x.Id_Cuenta_Mesa == idCuenta &&
                x.Estado == "ABIERTA" &&
                x.Id_Sucursal == idSucursal.Value);

            if (cuenta == null)
                return NotFound(new { message = "Cuenta abierta no encontrada" });

            var producto = await _context.Productos.FirstOrDefaultAsync(x =>
                x.Id_Producto == request.Id_Producto &&
                x.Activo);

            if (producto == null)
                return BadRequest(new { message = "Producto no válido" });

            var precioUnitario = await PreciosHelper.ObtenerPrecioAsync(
                _context,
                idSucursal.Value,
                request.Id_Producto,
                request.Id_Presentacion);

            if (!precioUnitario.HasValue || precioUnitario.Value <= 0)
                return BadRequest(new { message = "No hay precio configurado para este producto en la sucursal" });

            var subtotal = request.Cantidad * precioUnitario.Value;

            var detalle = new DetalleCuentaMesa
            {
                Id_Cuenta_Mesa = idCuenta,
                Id_Producto = request.Id_Producto,
                Id_Presentacion = request.Id_Presentacion,
                Cantidad = request.Cantidad,
                Precio_Unitario = precioUnitario.Value,
                Subtotal = subtotal,
                Observacion = request.Observacion
            };

            _context.DetalleCuentaMesa.Add(detalle);
            await _context.SaveChangesAsync();

            await BitacoraHelper.RegistrarAsync(_context, idUsuario.Value, "CUENTAS_MESA", "AGREGAR_PRODUCTO", $"Detalle #{detalle.Id_Detalle_Cuenta_Mesa} agregado a cuenta #{idCuenta}");

            return Ok(new { message = "Producto agregado a la cuenta correctamente", data = detalle });
        }

        [HttpDelete("detalle/{idDetalle}")]
        public async Task<ActionResult> EliminarDetalle(int idDetalle)
        {
            var idUsuario = UserHelper.GetUserId(User);

            if (!idUsuario.HasValue)
                return Unauthorized(new { message = "Usuario no válido en el token" });

            var detalle = await _context.DetalleCuentaMesa.FindAsync(idDetalle);

            if (detalle == null)
                return NotFound(new { message = "Detalle no encontrado" });

            _context.DetalleCuentaMesa.Remove(detalle);
            await _context.SaveChangesAsync();

            await BitacoraHelper.RegistrarAsync(_context, idUsuario.Value, "CUENTAS_MESA", "ELIMINAR_DETALLE", $"Detalle #{idDetalle} eliminado");

            return Ok(new { message = "Detalle eliminado correctamente" });
        }

        [HttpPost("{idCuenta}/cobrar")]
        public async Task<ActionResult> CobrarCuenta(int idCuenta, [FromBody] CobrarCuentaMesaRequestDto request)
        {
            var idUsuario = UserHelper.GetUserId(User);
            var idSucursal = UserHelper.GetSucursalId(User);

            if (!idUsuario.HasValue)
                return Unauthorized(new { message = "Usuario no válido en el token" });

            if (!idSucursal.HasValue)
                return BadRequest(new { message = "El usuario no tiene sucursal asignada" });

            var cuenta = await _context.CuentasMesa.FirstOrDefaultAsync(x =>
                x.Id_Cuenta_Mesa == idCuenta &&
                x.Estado == "ABIERTA" &&
                x.Id_Sucursal == idSucursal.Value);

            if (cuenta == null)
                return NotFound(new { message = "Cuenta abierta no encontrada" });

            var caja = await _context.Cajas.FirstOrDefaultAsync(x =>
                x.Id_Caja == request.Id_Caja &&
                x.Id_Sucursal == idSucursal.Value &&
                x.Estado == "ABIERTA");

            if (caja == null)
                return BadRequest(new { message = "Caja no válida o cerrada" });

            var detallesCuenta = await _context.DetalleCuentaMesa
                .Where(x => x.Id_Cuenta_Mesa == idCuenta)
                .ToListAsync();

            if (detallesCuenta.Count == 0)
                return BadRequest(new { message = "La cuenta no tiene productos" });

            var sarConfig = FacturacionSarStore.GetConfig(_env.ContentRootPath, idSucursal.Value);
            if (sarConfig.HabilitadoCai && !request.EmitirFactura && !sarConfig.PermitirVentaSinFactura)
                return BadRequest(new { message = "En esta sucursal se requiere emitir factura CAI en cada venta" });

            if (!sarConfig.HabilitadoCai && request.EmitirFactura)
                return BadRequest(new { message = "La facturacion CAI esta desactivada para esta sucursal" });

            if (request.Descuento < 0 || request.Impuesto < 0)
                return BadRequest(new { message = "Descuento e impuesto no pueden ser negativos" });

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var subtotal = detallesCuenta.Sum(x => x.Subtotal);
                var impuestoAplicado = request.ImpuestoIncluidoEnSubtotal ? 0 : request.Impuesto;
                var total = subtotal - request.Descuento + impuestoAplicado;

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

                foreach (var item in detallesCuenta)
                {
                    var producto = await _context.Productos.FirstOrDefaultAsync(x => x.Id_Producto == item.Id_Producto);

                    var detalleVenta = new DetalleVenta
                    {
                        Id_Venta = venta.Id_Venta,
                        Id_Producto = item.Id_Producto,
                        Id_Presentacion = item.Id_Presentacion,
                        Cantidad = item.Cantidad,
                        Precio_Unitario = item.Precio_Unitario,
                        Costo_Unitario = producto?.Costo ?? 0,
                        Subtotal = item.Subtotal,
                        Observacion = item.Observacion
                    };

                    _context.DetalleVenta.Add(detalleVenta);
                }

                cuenta.Estado = "CERRADA";
                cuenta.Fecha_Cierre = FechaHelper.AhoraHonduras();

                var mesa = await _context.Mesas.FindAsync(cuenta.Id_Mesa);
                if (mesa != null)
                    mesa.Estado = "LIBRE";

                await _context.SaveChangesAsync();

                await BitacoraHelper.RegistrarAsync(_context, idUsuario.Value, "CUENTAS_MESA", "COBRAR", $"Cuenta mesa #{idCuenta} cobrada y convertida en venta #{venta.Id_Venta}");

                await transaction.CommitAsync();

                return Ok(new
                {
                    message = "Cuenta cobrada correctamente",
                    data = new
                    {
                        cuenta.Id_Cuenta_Mesa,
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
    }
}
