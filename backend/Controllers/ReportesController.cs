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
    public class ReportesController : ControllerBase
    {
        private readonly PinecosDbContext _context;

        public ReportesController(PinecosDbContext context)
        {
            _context = context;
        }

        [HttpGet("ventas-resumen")]
        public async Task<ActionResult> VentasResumen(DateTime? desde, DateTime? hasta, int? idSucursal)
        {
            var fechaDesde = desde ?? FechaHelper.HoyInicioHonduras();
            var fechaHasta = hasta ?? FechaHelper.HoyFinHonduras();

            var query = _context.Ventas
                .Where(x => x.Fecha >= fechaDesde && x.Fecha <= fechaHasta && x.Estado == "ACTIVA");

            if (idSucursal.HasValue)
                query = query.Where(x => x.Id_Sucursal == idSucursal.Value);

            var ventas = await query.ToListAsync();
            var idsVentas = ventas.Select(x => x.Id_Venta).ToList();
            var detalles = await _context.DetalleVenta
                .Where(x => idsVentas.Contains(x.Id_Venta))
                .ToListAsync();

            var costoTotal = detalles.Sum(x => x.Costo_Unitario * x.Cantidad);
            var totalVentas = ventas.Sum(x => x.Total);

            return Ok(new
            {
                cantidadVentas = ventas.Count,
                subtotal = ventas.Sum(x => x.Subtotal),
                descuento = ventas.Sum(x => x.Descuento),
                impuesto = ventas.Sum(x => x.Impuesto),
                total = totalVentas,
                costoTotal,
                utilidadBruta = totalVentas - costoTotal
            });
        }

        [HttpGet("gastos-resumen")]
        public async Task<ActionResult> GastosResumen(DateTime? desde, DateTime? hasta, int? idSucursal)
        {
            var fechaDesde = desde ?? FechaHelper.HoyInicioHonduras();
            var fechaHasta = hasta ?? FechaHelper.HoyFinHonduras();

            var query = _context.Gastos
                .Where(x => x.Fecha >= fechaDesde && x.Fecha <= fechaHasta && x.Activo);

            if (idSucursal.HasValue)
                query = query.Where(x => x.Id_Sucursal == idSucursal.Value);

            var gastos = await query.ToListAsync();

            return Ok(new
            {
                cantidadGastos = gastos.Count,
                totalGastos = gastos.Sum(x => x.Monto)
            });
        }

        [HttpGet("utilidad")]
        public async Task<ActionResult> Utilidad(DateTime? desde, DateTime? hasta, int? idSucursal)
        {
            var fechaDesde = desde ?? FechaHelper.HoyInicioHonduras();
            var fechaHasta = hasta ?? FechaHelper.HoyFinHonduras();

            var ventasQuery = _context.Ventas
                .Where(x => x.Fecha >= fechaDesde && x.Fecha <= fechaHasta && x.Estado == "ACTIVA");

            var gastosQuery = _context.Gastos
                .Where(x => x.Fecha >= fechaDesde && x.Fecha <= fechaHasta && x.Activo);

            if (idSucursal.HasValue)
            {
                ventasQuery = ventasQuery.Where(x => x.Id_Sucursal == idSucursal.Value);
                gastosQuery = gastosQuery.Where(x => x.Id_Sucursal == idSucursal.Value);
            }

            var ventas = await ventasQuery.ToListAsync();
            var gastos = await gastosQuery.ToListAsync();

            var idsVentas = ventas.Select(x => x.Id_Venta).ToList();

            var detalles = await _context.DetalleVenta
                .Where(x => idsVentas.Contains(x.Id_Venta))
                .ToListAsync();

            var ventaTotal = ventas.Sum(x => x.Total);
            var costoTotal = detalles.Sum(x => x.Costo_Unitario * x.Cantidad);
            var gastosTotal = gastos.Sum(x => x.Monto);
            var utilidadBruta = ventaTotal - costoTotal;
            var utilidadNeta = utilidadBruta - gastosTotal;

            return Ok(new
            {
                ventaTotal,
                costoTotal,
                gastosTotal,
                utilidadBruta,
                utilidadNeta
            });
        }

        [HttpGet("productos-mas-vendidos")]
        public async Task<ActionResult> ProductosMasVendidos(DateTime? desde, DateTime? hasta)
        {
            var fechaDesde = desde ?? FechaHelper.HoyInicioHonduras();
            var fechaHasta = hasta ?? FechaHelper.HoyFinHonduras();

            var data = await (
                from d in _context.DetalleVenta
                join p in _context.Productos on d.Id_Producto equals p.Id_Producto
                join v in _context.Ventas on d.Id_Venta equals v.Id_Venta
                where v.Fecha >= fechaDesde && v.Fecha <= fechaHasta && v.Estado == "ACTIVA"
                group d by new { p.Id_Producto, p.Nombre } into g
                orderby g.Sum(x => x.Cantidad) descending
                select new
                {
                    g.Key.Id_Producto,
                    Producto = g.Key.Nombre,
                    CantidadVendida = g.Sum(x => x.Cantidad),
                    MontoVendido = g.Sum(x => x.Subtotal)
                }
            ).Take(20).ToListAsync();

            return Ok(data);
        }

        [HttpGet("ventas-por-metodo-pago")]
        public async Task<ActionResult> VentasPorMetodoPago(DateTime? desde, DateTime? hasta, int? idSucursal)
        {
            var fechaDesde = desde ?? FechaHelper.HoyInicioHonduras();
            var fechaHasta = hasta ?? FechaHelper.HoyFinHonduras();

            var query = _context.Ventas
                .Where(x => x.Fecha >= fechaDesde && x.Fecha <= fechaHasta && x.Estado == "ACTIVA");

            if (idSucursal.HasValue)
                query = query.Where(x => x.Id_Sucursal == idSucursal.Value);

            var data = await query
                .GroupBy(x => x.Metodo_Pago)
                .Select(g => new
                {
                    MetodoPago = g.Key,
                    Cantidad = g.Count(),
                    Total = g.Sum(x => x.Total)
                })
                .OrderByDescending(x => x.Total)
                .ToListAsync();

            return Ok(data);
        }

        [HttpGet("ventas-por-categoria")]
        public async Task<ActionResult> VentasPorCategoria(DateTime? desde, DateTime? hasta)
        {
            var fechaDesde = desde ?? FechaHelper.HoyInicioHonduras();
            var fechaHasta = hasta ?? FechaHelper.HoyFinHonduras();

            var data = await (
                from d in _context.DetalleVenta
                join p in _context.Productos on d.Id_Producto equals p.Id_Producto
                join c in _context.Categorias on p.Id_Categoria equals c.Id_Categoria
                join v in _context.Ventas on d.Id_Venta equals v.Id_Venta
                where v.Fecha >= fechaDesde && v.Fecha <= fechaHasta && v.Estado == "ACTIVA"
                group d by new { c.Id_Categoria, c.Nombre } into g
                orderby g.Sum(x => x.Subtotal) descending
                select new
                {
                    g.Key.Id_Categoria,
                    Categoria = g.Key.Nombre,
                    CantidadVendida = g.Sum(x => x.Cantidad),
                    MontoVendido = g.Sum(x => x.Subtotal)
                }
            ).ToListAsync();

            return Ok(data);
        }

        [HttpGet("gastos-por-categoria")]
        public async Task<ActionResult> GastosPorCategoria(DateTime? desde, DateTime? hasta, int? idSucursal)
        {
            var fechaDesde = desde ?? FechaHelper.HoyInicioHonduras();
            var fechaHasta = hasta ?? FechaHelper.HoyFinHonduras();

            var query = _context.Gastos
                .Where(x => x.Fecha >= fechaDesde && x.Fecha <= fechaHasta && x.Activo);

            if (idSucursal.HasValue)
                query = query.Where(x => x.Id_Sucursal == idSucursal.Value);

            var data = await query
                .GroupBy(x => x.Categoria_Gasto)
                .Select(g => new
                {
                    CategoriaGasto = g.Key,
                    Cantidad = g.Count(),
                    Total = g.Sum(x => x.Monto)
                })
                .OrderByDescending(x => x.Total)
                .ToListAsync();

            return Ok(data);
        }
    }
}
