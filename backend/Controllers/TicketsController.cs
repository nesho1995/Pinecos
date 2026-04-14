using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pinecos.Attributes;
using Pinecos.Data;
using Pinecos.Documents;
using Pinecos.DTOs;
using Pinecos.Helpers;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace Pinecos.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AuthorizeRoles("ADMIN", "CAJERO")]
    public class TicketsController : ControllerBase
    {
        private readonly PinecosDbContext _context;
        private readonly IWebHostEnvironment _env;

        public TicketsController(PinecosDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        [HttpGet("venta/{idVenta}")]
        public async Task<ActionResult> GetTicketVenta(int idVenta)
        {
            var rol = UserHelper.GetUserRole(User);
            var idSucursal = UserHelper.GetSucursalId(User);

            var venta = await _context.Ventas.FirstOrDefaultAsync(x => x.Id_Venta == idVenta);

            if (venta == null)
                return NotFound(new { message = "Venta no encontrada" });

            if (rol != "ADMIN")
            {
                if (!idSucursal.HasValue || venta.Id_Sucursal != idSucursal.Value)
                    return Forbid();
            }

            var sucursal = await _context.Sucursales.FirstOrDefaultAsync(x => x.Id_Sucursal == venta.Id_Sucursal);
            var usuario = await _context.Usuarios.FirstOrDefaultAsync(x => x.Id_Usuario == venta.Id_Usuario);

            var detalles = await (
                from d in _context.DetalleVenta
                join p in _context.Productos on d.Id_Producto equals p.Id_Producto
                join pr in _context.Presentaciones on d.Id_Presentacion equals pr.Id_Presentacion into prj
                from pr in prj.DefaultIfEmpty()
                where d.Id_Venta == idVenta
                select new TicketVentaDetalleDto
                {
                    Producto = p.Nombre,
                    Presentacion = pr != null ? pr.Nombre : "",
                    Cantidad = d.Cantidad,
                    PrecioUnitario = d.Precio_Unitario,
                    CostoUnitario = d.Costo_Unitario,
                    Subtotal = d.Subtotal
                }
            ).ToListAsync();

            var costoTotal = detalles.Sum(d => d.CostoUnitario * d.Cantidad);
            var facturaMeta = FacturaMetadataHelper.ParseFromObservacion(venta.Observacion);

            var ticket = new TicketVentaDto
            {
                IdVenta = venta.Id_Venta,
                Fecha = venta.Fecha,
                Sucursal = sucursal?.Nombre ?? "",
                Cajero = usuario?.Nombre ?? "",
                MetodoPago = venta.Metodo_Pago,
                Subtotal = venta.Subtotal,
                Descuento = venta.Descuento,
                Impuesto = venta.Impuesto,
                Total = venta.Total,
                CostoTotal = costoTotal,
                UtilidadBruta = venta.Total - costoTotal,
                Observacion = venta.Observacion,
                EsFacturaCai = facturaMeta.EsFacturaCai,
                NumeroFactura = facturaMeta.NumeroFactura,
                Cai = facturaMeta.Cai,
                FechaLimiteEmision = facturaMeta.FechaLimiteEmision,
                RangoInicio = facturaMeta.RangoInicio,
                RangoFin = facturaMeta.RangoFin,
                Detalles = detalles
            };

            return Ok(ticket);
        }

        [HttpGet("venta/{idVenta}/pdf")]
        public async Task<IActionResult> ExportarTicketPdf(int idVenta)
        {
            QuestPDF.Settings.License = LicenseType.Community;

            var rol = UserHelper.GetUserRole(User);
            var idSucursal = UserHelper.GetSucursalId(User);

            var venta = await _context.Ventas.FirstOrDefaultAsync(x => x.Id_Venta == idVenta);

            if (venta == null)
                return NotFound(new { message = "Venta no encontrada" });

            if (rol != "ADMIN")
            {
                if (!idSucursal.HasValue || venta.Id_Sucursal != idSucursal.Value)
                    return Forbid();
            }

            var sucursal = await _context.Sucursales.FirstOrDefaultAsync(x => x.Id_Sucursal == venta.Id_Sucursal);
            var usuario = await _context.Usuarios.FirstOrDefaultAsync(x => x.Id_Usuario == venta.Id_Usuario);

            var detalles = await (
                from d in _context.DetalleVenta
                join p in _context.Productos on d.Id_Producto equals p.Id_Producto
                join pr in _context.Presentaciones on d.Id_Presentacion equals pr.Id_Presentacion into prj
                from pr in prj.DefaultIfEmpty()
                where d.Id_Venta == idVenta
                select new TicketVentaDetalleDto
                {
                    Producto = p.Nombre,
                    Presentacion = pr != null ? pr.Nombre : "",
                    Cantidad = d.Cantidad,
                    PrecioUnitario = d.Precio_Unitario,
                    CostoUnitario = d.Costo_Unitario,
                    Subtotal = d.Subtotal
                }
            ).ToListAsync();

            var costoTotal = detalles.Sum(d => d.CostoUnitario * d.Cantidad);
            var facturaMeta = FacturaMetadataHelper.ParseFromObservacion(venta.Observacion);

            var ticket = new TicketVentaDto
            {
                IdVenta = venta.Id_Venta,
                Fecha = venta.Fecha,
                Sucursal = sucursal?.Nombre ?? "",
                Cajero = usuario?.Nombre ?? "",
                MetodoPago = venta.Metodo_Pago,
                Subtotal = venta.Subtotal,
                Descuento = venta.Descuento,
                Impuesto = venta.Impuesto,
                Total = venta.Total,
                CostoTotal = costoTotal,
                UtilidadBruta = venta.Total - costoTotal,
                Observacion = venta.Observacion,
                EsFacturaCai = facturaMeta.EsFacturaCai,
                NumeroFactura = facturaMeta.NumeroFactura,
                Cai = facturaMeta.Cai,
                FechaLimiteEmision = facturaMeta.FechaLimiteEmision,
                RangoInicio = facturaMeta.RangoInicio,
                RangoFin = facturaMeta.RangoFin,
                Detalles = detalles
            };

            var document = new TicketVentaDocument(ticket);
            var pdfBytes = document.GeneratePdf();

            return File(pdfBytes, "application/pdf", $"ticket-venta-{idVenta}.pdf");
        }

        [HttpGet("venta/{idVenta}/html")]
        public async Task<IActionResult> GetTicketHtml(int idVenta)
        {
            var rol = UserHelper.GetUserRole(User);
            var idSucursal = UserHelper.GetSucursalId(User);

            var venta = await _context.Ventas.FirstOrDefaultAsync(x => x.Id_Venta == idVenta);

            if (venta == null)
                return NotFound(new { message = "Venta no encontrada" });

            if (rol != "ADMIN")
            {
                if (!idSucursal.HasValue || venta.Id_Sucursal != idSucursal.Value)
                    return Forbid();
            }

            var sucursal = await _context.Sucursales.FirstOrDefaultAsync(x => x.Id_Sucursal == venta.Id_Sucursal);
            var usuario = await _context.Usuarios.FirstOrDefaultAsync(x => x.Id_Usuario == venta.Id_Usuario);
            var baseConfig = await _context.ConfiguracionNegocio.FirstOrDefaultAsync(x => x.Activo);

            if (baseConfig == null)
                return BadRequest(new { message = "No existe configuracion del negocio" });

            var config = ConfiguracionSucursalStore.GetMergedConfig(_env.ContentRootPath, venta.Id_Sucursal, baseConfig);

            var detalles = await (
                from d in _context.DetalleVenta
                join p in _context.Productos on d.Id_Producto equals p.Id_Producto
                join pr in _context.Presentaciones on d.Id_Presentacion equals pr.Id_Presentacion into prj
                from pr in prj.DefaultIfEmpty()
                where d.Id_Venta == idVenta
                select new TicketVentaDetalleDto
                {
                    Producto = p.Nombre,
                    Presentacion = pr != null ? pr.Nombre : "",
                    Cantidad = d.Cantidad,
                    PrecioUnitario = d.Precio_Unitario,
                    CostoUnitario = d.Costo_Unitario,
                    Subtotal = d.Subtotal
                }
            ).ToListAsync();

            var costoTotal = detalles.Sum(d => d.CostoUnitario * d.Cantidad);
            var facturaMeta = FacturaMetadataHelper.ParseFromObservacion(venta.Observacion);

            var ticket = new TicketVentaDto
            {
                IdVenta = venta.Id_Venta,
                Fecha = venta.Fecha,
                Sucursal = sucursal?.Nombre ?? "",
                Cajero = usuario?.Nombre ?? "",
                MetodoPago = venta.Metodo_Pago,
                Subtotal = venta.Subtotal,
                Descuento = venta.Descuento,
                Impuesto = venta.Impuesto,
                Total = venta.Total,
                CostoTotal = costoTotal,
                UtilidadBruta = venta.Total - costoTotal,
                Observacion = venta.Observacion,
                EsFacturaCai = facturaMeta.EsFacturaCai,
                NumeroFactura = facturaMeta.NumeroFactura,
                Cai = facturaMeta.Cai,
                FechaLimiteEmision = facturaMeta.FechaLimiteEmision,
                RangoInicio = facturaMeta.RangoInicio,
                RangoFin = facturaMeta.RangoFin,
                Detalles = detalles
            };

            var html = TicketHtmlHelper.Generar(
                ticket,
                config.Nombre_Negocio,
                config.Direccion,
                config.Telefono,
                config.Mensaje_Ticket,
                config.Ancho_Ticket,
                config.Logo_Url,
                config.Moneda
            );

            return Content(html, "text/html");
        }

        [HttpGet("venta/{idVenta}/termico")]
        public async Task<ActionResult> GetTicketTermico(int idVenta)
        {
            var rol = UserHelper.GetUserRole(User);
            var idSucursal = UserHelper.GetSucursalId(User);

            var venta = await _context.Ventas.FirstOrDefaultAsync(x => x.Id_Venta == idVenta);

            if (venta == null)
                return NotFound(new { message = "Venta no encontrada" });

            if (rol != "ADMIN")
            {
                if (!idSucursal.HasValue || venta.Id_Sucursal != idSucursal.Value)
                    return Forbid();
            }

            var sucursal = await _context.Sucursales.FirstOrDefaultAsync(x => x.Id_Sucursal == venta.Id_Sucursal);
            var usuario = await _context.Usuarios.FirstOrDefaultAsync(x => x.Id_Usuario == venta.Id_Usuario);

            var detalles = await (
                from d in _context.DetalleVenta
                join p in _context.Productos on d.Id_Producto equals p.Id_Producto
                where d.Id_Venta == idVenta
                select new TicketVentaDetalleDto
                {
                    Producto = p.Nombre,
                    Presentacion = "",
                    Cantidad = d.Cantidad,
                    PrecioUnitario = d.Precio_Unitario,
                    CostoUnitario = d.Costo_Unitario,
                    Subtotal = d.Subtotal
                }
            ).ToListAsync();

            var costoTotal = detalles.Sum(d => d.CostoUnitario * d.Cantidad);
            var facturaMeta = FacturaMetadataHelper.ParseFromObservacion(venta.Observacion);

            var ticket = new TicketVentaDto
            {
                IdVenta = venta.Id_Venta,
                Fecha = venta.Fecha,
                Sucursal = sucursal?.Nombre ?? "",
                Cajero = usuario?.Nombre ?? "",
                MetodoPago = venta.Metodo_Pago,
                Subtotal = venta.Subtotal,
                Descuento = venta.Descuento,
                Impuesto = venta.Impuesto,
                Total = venta.Total,
                CostoTotal = costoTotal,
                UtilidadBruta = venta.Total - costoTotal,
                Observacion = venta.Observacion,
                EsFacturaCai = facturaMeta.EsFacturaCai,
                NumeroFactura = facturaMeta.NumeroFactura,
                Cai = facturaMeta.Cai,
                FechaLimiteEmision = facturaMeta.FechaLimiteEmision,
                RangoInicio = facturaMeta.RangoInicio,
                RangoFin = facturaMeta.RangoFin,
                Detalles = detalles
            };

            var texto = TicketTermicoHelper.Generar(ticket);

            return Ok(new { ticket = texto });
        }
    }
}

