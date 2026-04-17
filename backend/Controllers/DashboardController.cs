using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pinecos.Attributes;
using Pinecos.Data;
using Pinecos.Helpers;
using System.Text.Json;

namespace Pinecos.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AuthorizeRoles("ADMIN", "CAJERO")]
    public class DashboardController : ControllerBase
    {
        private readonly PinecosDbContext _context;

        public DashboardController(PinecosDbContext context)
        {
            _context = context;
        }

        [HttpGet("resumen")]
        public async Task<ActionResult> GetResumen()
        {
            var rol = UserHelper.GetUserRole(User);
            var idSucursal = UserHelper.GetSucursalId(User);

            var inicioHoy = FechaHelper.HoyInicioHonduras();
            var finHoy = FechaHelper.HoyFinHonduras();

            var ventasQuery = _context.Ventas
                .Where(x => x.Fecha >= inicioHoy && x.Fecha <= finHoy && x.Estado == "ACTIVA");

            var gastosQuery = _context.Gastos
                .Where(x => x.Fecha >= inicioHoy && x.Fecha <= finHoy && x.Activo);

            var cajasAbiertasQuery = _context.Cajas
                .Where(x => x.Estado == "ABIERTA");

            if (rol != "ADMIN")
            {
                if (!idSucursal.HasValue)
                    return BadRequest(new { message = "El usuario no tiene sucursal asignada" });

                ventasQuery = ventasQuery.Where(x => x.Id_Sucursal == idSucursal.Value);
                gastosQuery = gastosQuery.Where(x => x.Id_Sucursal == idSucursal.Value);
                cajasAbiertasQuery = cajasAbiertasQuery.Where(x => x.Id_Sucursal == idSucursal.Value);
            }

            var ventas = await ventasQuery.ToListAsync();
            var gastos = await gastosQuery.ToListAsync();
            var cajasAbiertas = await cajasAbiertasQuery.ToListAsync();

            var idsVentas = ventas.Select(x => x.Id_Venta).ToList();

            var detalles = await _context.DetalleVenta
                .Where(x => idsVentas.Contains(x.Id_Venta))
                .ToListAsync();

            var totalVentas = ventas.Sum(x => x.Total);
            var totalGastos = gastos.Sum(x => x.Monto);
            var costoVentas = detalles.Sum(x => x.Costo_Unitario * x.Cantidad);
            var utilidadBruta = totalVentas - costoVentas;
            var utilidadNeta = utilidadBruta - totalGastos;

            return Ok(new
            {
                fecha = FechaHelper.AhoraHonduras().ToString("yyyy-MM-dd HH:mm:ss"),
                ventasHoy = ventas.Count,
                montoVendidoHoy = totalVentas,
                gastosHoy = totalGastos,
                cajasAbiertas = cajasAbiertas.Count,
                costoVentasHoy = costoVentas,
                utilidadBrutaHoy = utilidadBruta,
                utilidadNetaHoy = utilidadNeta
            });
        }

        [HttpGet("ventas-del-dia")]
        public async Task<ActionResult> GetVentasDelDia()
        {
            var rol = UserHelper.GetUserRole(User);
            var idSucursal = UserHelper.GetSucursalId(User);

            var inicioHoy = FechaHelper.HoyInicioHonduras();
            var finHoy = FechaHelper.HoyFinHonduras();

            var query = _context.Ventas
                .Where(x => x.Fecha >= inicioHoy && x.Fecha <= finHoy && x.Estado == "ACTIVA");

            if (rol != "ADMIN")
            {
                if (!idSucursal.HasValue)
                    return BadRequest(new { message = "El usuario no tiene sucursal asignada" });

                query = query.Where(x => x.Id_Sucursal == idSucursal.Value);
            }

            var data = await query
                .OrderByDescending(x => x.Fecha)
                .Select(x => new
                {
                    x.Id_Venta,
                    x.Fecha,
                    x.Total,
                    x.Metodo_Pago,
                    x.Id_Sucursal,
                    x.Id_Usuario
                })
                .ToListAsync();

            return Ok(data);
        }

        [HttpGet("gastos-del-dia")]
        public async Task<ActionResult> GetGastosDelDia()
        {
            var rol = UserHelper.GetUserRole(User);
            var idSucursal = UserHelper.GetSucursalId(User);

            var inicioHoy = FechaHelper.HoyInicioHonduras();
            var finHoy = FechaHelper.HoyFinHonduras();

            var query = _context.Gastos
                .Where(x => x.Fecha >= inicioHoy && x.Fecha <= finHoy && x.Activo);

            if (rol != "ADMIN")
            {
                if (!idSucursal.HasValue)
                    return BadRequest(new { message = "El usuario no tiene sucursal asignada" });

                query = query.Where(x => x.Id_Sucursal == idSucursal.Value);
            }

            var data = await query
                .OrderByDescending(x => x.Fecha)
                .Select(x => new
                {
                    x.Id_Gasto,
                    x.Fecha,
                    x.Categoria_Gasto,
                    x.Descripcion,
                    x.Monto,
                    x.Id_Sucursal
                })
                .ToListAsync();

            return Ok(data);
        }

        [HttpGet("caja-actual")]
        public async Task<ActionResult> GetCajaActual([FromQuery] int? idSucursal = null)
        {
            var rol = UserHelper.GetUserRole(User);
            var idSucursalToken = UserHelper.GetSucursalId(User);

            if (rol != "ADMIN" && !idSucursalToken.HasValue)
                return BadRequest(new { message = "El usuario no tiene sucursal asignada" });

            int? sucursalObjetivo = null;
            if (rol == "ADMIN")
            {
                sucursalObjetivo = idSucursalToken ?? idSucursal;
            }
            else
            {
                sucursalObjetivo = idSucursalToken;
            }

            var query = _context.Cajas
                .Where(x => x.Estado == "ABIERTA");

            if (sucursalObjetivo.HasValue)
            {
                query = query.Where(x => x.Id_Sucursal == sucursalObjetivo.Value);
            }

            var caja = await query
                .OrderByDescending(x => x.Fecha_Apertura)
                .FirstOrDefaultAsync();

            if (caja == null)
                return Ok(new { abierta = false });

            string? usuarioAperturaNombre = null;
            string? turnoApertura = null;
            if (!string.IsNullOrWhiteSpace(caja.Observacion))
            {
                try
                {
                    using var doc = JsonDocument.Parse(caja.Observacion);
                    var root = doc.RootElement;
                    if (root.TryGetProperty("usuarioAperturaNombre", out var nombreEl))
                        usuarioAperturaNombre = (nombreEl.GetString() ?? string.Empty).Trim();
                    if (root.TryGetProperty("turno", out var turnoEl))
                        turnoApertura = (turnoEl.GetString() ?? string.Empty).Trim();
                }
                catch
                {
                }
            }

            if (string.IsNullOrWhiteSpace(usuarioAperturaNombre))
            {
                usuarioAperturaNombre = await _context.Usuarios
                    .Where(u => u.Id_Usuario == caja.Id_Usuario_Apertura)
                    .Select(u => u.Nombre)
                    .FirstOrDefaultAsync();
            }

            return Ok(new
            {
                abierta = true,
                caja.Id_Caja,
                caja.Id_Sucursal,
                caja.Id_Usuario_Apertura,
                usuarioAperturaNombre = string.IsNullOrWhiteSpace(usuarioAperturaNombre) ? $"Usuario #{caja.Id_Usuario_Apertura}" : usuarioAperturaNombre,
                turnoApertura = turnoApertura ?? string.Empty,
                caja.Fecha_Apertura,
                caja.Monto_Inicial,
                caja.Estado,
                caja.Observacion
            });
        }
    }
}
