using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
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
        private readonly IMemoryCache _cache;

        public ReportesController(PinecosDbContext context, IMemoryCache cache)
        {
            _context = context;
            _cache = cache;
        }

        private async Task<T> GetOrSetCacheAsync<T>(string key, Func<Task<T>> factory, int seconds = 45)
        {
            if (_cache.TryGetValue<T>(key, out var value) && value is not null)
                return value;

            var result = await factory();
            _cache.Set(key, result, TimeSpan.FromSeconds(seconds));
            return result;
        }

        private static string KeyPart(DateTime? dt) => dt?.ToString("yyyyMMddHHmmss") ?? "null";

        private static string NormalizarTipoServicioDesdeObservacion(string? observacion)
        {
            return ObservacionVentaHelper.ObtenerTipoServicio(observacion);
        }

        private static object ConstruirResumenPeriodoVacio(DateTime fechaDesde, DateTime fechaHasta)
        {
            return new
            {
                desde = fechaDesde,
                hasta = fechaHasta,
                ventas = new
                {
                    cantidad = 0,
                    subtotal = 0m,
                    descuento = 0m,
                    impuesto = 0m,
                    total = 0m,
                    ticketPromedio = 0m
                },
                costos = new
                {
                    costoTotal = 0m,
                    utilidadBruta = 0m,
                    utilidadNeta = 0m
                },
                gastos = new
                {
                    cantidad = 0,
                    total = 0m
                },
                cajas = new
                {
                    abiertas = 0,
                    cerradas = 0
                },
                movimientosCaja = new
                {
                    ingresos = 0m,
                    egresos = 0m
                }
            };
        }

        private async Task<decimal> CalcularCostoVentasAsync(DateTime fechaDesde, DateTime fechaHasta, int? idSucursal)
        {
            var costoQuery =
                from d in _context.DetalleVenta.AsNoTracking()
                join v in _context.Ventas.AsNoTracking() on d.Id_Venta equals v.Id_Venta
                where v.Fecha >= fechaDesde && v.Fecha <= fechaHasta && v.Estado == "ACTIVA" &&
                      (!idSucursal.HasValue || v.Id_Sucursal == idSucursal.Value)
                select (decimal?)(d.Costo_Unitario * d.Cantidad);

            return await costoQuery.SumAsync() ?? 0m;
        }

        private async Task<object> ConstruirResumenPeriodo(DateTime fechaDesde, DateTime fechaHasta, int? idSucursal)
        {
            try
            {
                var ventasQuery = _context.Ventas
                    .AsNoTracking()
                    .Where(x => x.Fecha >= fechaDesde && x.Fecha <= fechaHasta && x.Estado == "ACTIVA");
                var gastosQuery = _context.Gastos
                    .AsNoTracking()
                    .Where(x => x.Fecha >= fechaDesde && x.Fecha <= fechaHasta && x.Activo);
                var cajasQuery = _context.Cajas
                    .AsNoTracking()
                    .Where(x => x.Fecha_Apertura >= fechaDesde && x.Fecha_Apertura <= fechaHasta);

                if (idSucursal.HasValue)
                {
                    ventasQuery = ventasQuery.Where(x => x.Id_Sucursal == idSucursal.Value);
                    gastosQuery = gastosQuery.Where(x => x.Id_Sucursal == idSucursal.Value);
                    cajasQuery = cajasQuery.Where(x => x.Id_Sucursal == idSucursal.Value);
                }

                var cantidadVentas = await ventasQuery.CountAsync();
                var subtotalVentas = await ventasQuery.SumAsync(x => (decimal?)x.Subtotal) ?? 0m;
                var descuentoVentas = await ventasQuery.SumAsync(x => (decimal?)x.Descuento) ?? 0m;
                var impuestoVentas = await ventasQuery.SumAsync(x => (decimal?)x.Impuesto) ?? 0m;
                var totalVentas = await ventasQuery.SumAsync(x => (decimal?)x.Total) ?? 0m;

                var costoTotal = await CalcularCostoVentasAsync(fechaDesde, fechaHasta, idSucursal);
                var cantidadGastos = await gastosQuery.CountAsync();
                var totalGastos = await gastosQuery.SumAsync(x => (decimal?)x.Monto) ?? 0m;
                var abiertas = await cajasQuery.CountAsync(x => (x.Estado ?? string.Empty) == "ABIERTA");
                var cerradas = await cajasQuery.CountAsync(x => (x.Estado ?? string.Empty) == "CERRADA");

                var movimientosQuery = _context.MovimientosCaja
                    .AsNoTracking()
                    .Where(x => x.Fecha >= fechaDesde && x.Fecha <= fechaHasta);

                if (idSucursal.HasValue)
                {
                    movimientosQuery =
                        from m in movimientosQuery
                        join c in _context.Cajas.AsNoTracking() on m.Id_Caja equals c.Id_Caja
                        where c.Id_Sucursal == idSucursal.Value
                        select m;
                }

                var movimientos = await movimientosQuery
                    .Select(x => new
                    {
                        Tipo = (x.Tipo ?? string.Empty).ToUpper(),
                        x.Monto
                    })
                    .ToListAsync();

                var ingresos = movimientos
                    .Where(x => x.Tipo.Contains("INGRESO") || x.Tipo == "ENTRADA")
                    .Sum(x => x.Monto);
                var egresos = movimientos
                    .Where(x => x.Tipo.Contains("EGRESO") || x.Tipo == "SALIDA")
                    .Sum(x => x.Monto);

                var utilidadBruta = totalVentas - costoTotal;
                var utilidadNeta = utilidadBruta - totalGastos;

                return new
                {
                    desde = fechaDesde,
                    hasta = fechaHasta,
                    ventas = new
                    {
                        cantidad = cantidadVentas,
                        subtotal = subtotalVentas,
                        descuento = descuentoVentas,
                        impuesto = impuestoVentas,
                        total = totalVentas,
                        ticketPromedio = cantidadVentas == 0 ? 0m : totalVentas / cantidadVentas
                    },
                    costos = new
                    {
                        costoTotal,
                        utilidadBruta,
                        utilidadNeta
                    },
                    gastos = new
                    {
                        cantidad = cantidadGastos,
                        total = totalGastos
                    },
                    cajas = new
                    {
                        abiertas,
                        cerradas
                    },
                    movimientosCaja = new
                    {
                        ingresos,
                        egresos
                    }
                };
            }
            catch
            {
                return ConstruirResumenPeriodoVacio(fechaDesde, fechaHasta);
            }
        }

        private static (DateTime Inicio, DateTime Fin) ObtenerRangoPeriodo(string periodo)
        {
            var now = FechaHelper.AhoraHonduras();
            var p = (periodo ?? "DIA").Trim().ToUpperInvariant();

            if (p == "MES")
            {
                var ini = new DateTime(now.Year, now.Month, 1, 0, 0, 0);
                var fin = ini.AddMonths(1).AddTicks(-1);
                return (ini, fin);
            }

            if (p == "ANIO")
            {
                var ini = new DateTime(now.Year, 1, 1, 0, 0, 0);
                var fin = ini.AddYears(1).AddTicks(-1);
                return (ini, fin);
            }

            if (p == "TRIMESTRE")
            {
                var trimestre = ((now.Month - 1) / 3) + 1;
                var mesInicio = ((trimestre - 1) * 3) + 1;
                var ini = new DateTime(now.Year, mesInicio, 1, 0, 0, 0);
                var fin = ini.AddMonths(3).AddTicks(-1);
                return (ini, fin);
            }

            var diaIni = FechaHelper.HoyInicioHonduras();
            var diaFin = FechaHelper.HoyFinHonduras();
            return (diaIni, diaFin);
        }

        [HttpGet("panel-negocio")]
        public async Task<ActionResult> PanelNegocio([FromQuery] int? idSucursal = null)
        {
            var hoyInicio = FechaHelper.HoyInicioHonduras();
            var hoyFin = FechaHelper.HoyFinHonduras();
            var ahora = FechaHelper.AhoraHonduras();
            var mesInicio = new DateTime(ahora.Year, ahora.Month, 1, 0, 0, 0);
            var mesFin = mesInicio.AddMonths(1).AddTicks(-1);
            var ultimos7Inicio = hoyInicio.AddDays(-6);
            var key = $"rep:panel:{idSucursal?.ToString() ?? "all"}:{hoyInicio:yyyyMMddHH}";
            var data = await GetOrSetCacheAsync<object>(key, async () =>
            {
                try
                {
                    var resumenHoy = await ConstruirResumenPeriodo(hoyInicio, hoyFin, idSucursal);
                    var resumenMes = await ConstruirResumenPeriodo(mesInicio, mesFin, idSucursal);

                    var ventas7Query = _context.Ventas
                        .AsNoTracking()
                        .Where(x => x.Fecha >= ultimos7Inicio && x.Fecha <= hoyFin && x.Estado == "ACTIVA");
                    if (idSucursal.HasValue)
                        ventas7Query = ventas7Query.Where(x => x.Id_Sucursal == idSucursal.Value);

                    var tendencia7Dias = await ventas7Query
                        .GroupBy(x => x.Fecha.Date)
                        .Select(g => new
                        {
                            fecha = g.Key,
                            total = g.Sum(x => x.Total),
                            ventas = g.Count()
                        })
                        .OrderBy(x => x.fecha)
                        .ToListAsync();

                    var movimientosHoyQuery = _context.MovimientosCaja
                        .AsNoTracking()
                        .Where(x => x.Fecha >= hoyInicio && x.Fecha <= hoyFin);
                    if (idSucursal.HasValue)
                        movimientosHoyQuery =
                            from m in movimientosHoyQuery
                            join c in _context.Cajas.AsNoTracking() on m.Id_Caja equals c.Id_Caja
                            where c.Id_Sucursal == idSucursal.Value
                            select m;

                    var movimientosHoy = await movimientosHoyQuery
                        .OrderByDescending(x => x.Fecha)
                        .Take(100)
                        .Select(x => new
                        {
                            x.Id_Movimiento_Caja,
                            x.Id_Caja,
                            x.Fecha,
                            Tipo = x.Tipo ?? string.Empty,
                            Descripcion = x.Descripcion ?? string.Empty,
                            x.Monto,
                            x.Id_Usuario
                        })
                        .ToListAsync();

                    return (object)new
                    {
                        hoy = resumenHoy,
                        mesActual = resumenMes,
                        tendencia7Dias,
                        movimientosHoy
                    };
                }
                catch
                {
                    return (object)new
                    {
                        hoy = ConstruirResumenPeriodoVacio(hoyInicio, hoyFin),
                        mesActual = ConstruirResumenPeriodoVacio(mesInicio, mesFin),
                        tendencia7Dias = Array.Empty<object>(),
                        movimientosHoy = Array.Empty<object>()
                    };
                }
            }, 30);

            return Ok(data);
        }

        [HttpGet("dashboard-avanzado")]
        public async Task<ActionResult> DashboardAvanzado([FromQuery] int? idSucursal = null, [FromQuery] string intervalo = "DIA")
        {
            var now = FechaHelper.AhoraHonduras();
            var (iniDia, finDia) = ObtenerRangoPeriodo("DIA");
            var (iniMes, finMes) = ObtenerRangoPeriodo("MES");
            var (iniTrim, finTrim) = ObtenerRangoPeriodo("TRIMESTRE");
            var (iniAnio, finAnio) = ObtenerRangoPeriodo("ANIO");

            var key = $"rep:dashadv:{idSucursal?.ToString() ?? "all"}:{intervalo}:{now:yyyyMMddHHmm}";
            var data = await GetOrSetCacheAsync<object>(key, async () =>
            {
                var dia = await ConstruirResumenPeriodo(iniDia, finDia, idSucursal);
                var mes = await ConstruirResumenPeriodo(iniMes, finMes, idSucursal);
                var trimestre = await ConstruirResumenPeriodo(iniTrim, finTrim, idSucursal);
                var anio = await ConstruirResumenPeriodo(iniAnio, finAnio, idSucursal);

                var intv = (intervalo ?? "DIA").Trim().ToUpperInvariant();
                var serieDesde = intv switch
                {
                    "MES" => new DateTime(now.Year, 1, 1, 0, 0, 0),
                    "ANIO" => now.AddYears(-4),
                    "TRIMESTRE" => now.AddYears(-1),
                    _ => now.AddDays(-30)
                };
                var serieHasta = FechaHelper.HoyFinHonduras();

                var ventasBase = _context.Ventas
                    .AsNoTracking()
                    .Where(x => x.Estado == "ACTIVA" && x.Fecha >= serieDesde && x.Fecha <= serieHasta);
                if (idSucursal.HasValue)
                    ventasBase = ventasBase.Where(x => x.Id_Sucursal == idSucursal.Value);

                var ventasRaw = await ventasBase
                    .Select(x => new { x.Fecha, x.Total })
                    .ToListAsync();

                var serie = intv switch
                {
                    "MES" => ventasRaw
                        .GroupBy(x => new { x.Fecha.Year, x.Fecha.Month })
                        .Select(g => new { periodo = $"{g.Key.Year}-{g.Key.Month:D2}", total = g.Sum(x => x.Total), ventas = g.Count() })
                        .OrderBy(x => x.periodo).ToList<object>(),
                    "ANIO" => ventasRaw
                        .GroupBy(x => x.Fecha.Year)
                        .Select(g => new { periodo = $"{g.Key}", total = g.Sum(x => x.Total), ventas = g.Count() })
                        .OrderBy(x => x.periodo).ToList<object>(),
                    "TRIMESTRE" => ventasRaw
                        .GroupBy(x => new { x.Fecha.Year, Q = ((x.Fecha.Month - 1) / 3) + 1 })
                        .Select(g => new { periodo = $"{g.Key.Year}-T{g.Key.Q}", total = g.Sum(x => x.Total), ventas = g.Count() })
                        .OrderBy(x => x.periodo).ToList<object>(),
                    _ => ventasRaw
                        .GroupBy(x => x.Fecha.Date)
                        .Select(g => new { periodo = g.Key.ToString("yyyy-MM-dd"), total = g.Sum(x => x.Total), ventas = g.Count() })
                        .OrderBy(x => x.periodo).ToList<object>()
                };

                return (object)new
                {
                    periodoActual = new
                    {
                        dia,
                        mes,
                        trimestre,
                        anio
                    },
                    serie
                };
            }, 45);

            return Ok(data);
        }

        [HttpGet("ventas-resumen")]
        public async Task<ActionResult> VentasResumen(DateTime? desde, DateTime? hasta, int? idSucursal)
        {
            var fechaDesde = desde ?? FechaHelper.HoyInicioHonduras();
            var fechaHasta = hasta ?? FechaHelper.HoyFinHonduras();

            try
            {
                var query = _context.Ventas
                    .AsNoTracking()
                    .Where(x => x.Fecha >= fechaDesde && x.Fecha <= fechaHasta && x.Estado == "ACTIVA");

                if (idSucursal.HasValue)
                    query = query.Where(x => x.Id_Sucursal == idSucursal.Value);

                var cantidadVentas = await query.CountAsync();
                var subtotal = await query.SumAsync(x => (decimal?)x.Subtotal) ?? 0m;
                var descuento = await query.SumAsync(x => (decimal?)x.Descuento) ?? 0m;
                var impuesto = await query.SumAsync(x => (decimal?)x.Impuesto) ?? 0m;
                var totalVentas = await query.SumAsync(x => (decimal?)x.Total) ?? 0m;
                var costoTotal = await CalcularCostoVentasAsync(fechaDesde, fechaHasta, idSucursal);

                return Ok(new
                {
                    cantidadVentas,
                    subtotal,
                    descuento,
                    impuesto,
                    total = totalVentas,
                    costoTotal,
                    utilidadBruta = totalVentas - costoTotal
                });
            }
            catch
            {
                return Ok(new
                {
                    cantidadVentas = 0,
                    subtotal = 0m,
                    descuento = 0m,
                    impuesto = 0m,
                    total = 0m,
                    costoTotal = 0m,
                    utilidadBruta = 0m
                });
            }
        }

        [HttpGet("gastos-resumen")]
        public async Task<ActionResult> GastosResumen(DateTime? desde, DateTime? hasta, int? idSucursal)
        {
            var fechaDesde = desde ?? FechaHelper.HoyInicioHonduras();
            var fechaHasta = hasta ?? FechaHelper.HoyFinHonduras();

            try
            {
                var query = _context.Gastos
                    .AsNoTracking()
                    .Where(x => x.Fecha >= fechaDesde && x.Fecha <= fechaHasta && x.Activo);

                if (idSucursal.HasValue)
                    query = query.Where(x => x.Id_Sucursal == idSucursal.Value);

                return Ok(new
                {
                    cantidadGastos = await query.CountAsync(),
                    totalGastos = await query.SumAsync(x => (decimal?)x.Monto) ?? 0m
                });
            }
            catch
            {
                return Ok(new
                {
                    cantidadGastos = 0,
                    totalGastos = 0m
                });
            }
        }

        [HttpGet("utilidad")]
        public async Task<ActionResult> Utilidad(DateTime? desde, DateTime? hasta, int? idSucursal)
        {
            var fechaDesde = desde ?? FechaHelper.HoyInicioHonduras();
            var fechaHasta = hasta ?? FechaHelper.HoyFinHonduras();

            try
            {
                var ventasQuery = _context.Ventas
                    .AsNoTracking()
                    .Where(x => x.Fecha >= fechaDesde && x.Fecha <= fechaHasta && x.Estado == "ACTIVA");

                var gastosQuery = _context.Gastos
                    .AsNoTracking()
                    .Where(x => x.Fecha >= fechaDesde && x.Fecha <= fechaHasta && x.Activo);

                if (idSucursal.HasValue)
                {
                    ventasQuery = ventasQuery.Where(x => x.Id_Sucursal == idSucursal.Value);
                    gastosQuery = gastosQuery.Where(x => x.Id_Sucursal == idSucursal.Value);
                }

                var ventaTotal = await ventasQuery.SumAsync(x => (decimal?)x.Total) ?? 0m;
                var costoTotal = await CalcularCostoVentasAsync(fechaDesde, fechaHasta, idSucursal);
                var gastosTotal = await gastosQuery.SumAsync(x => (decimal?)x.Monto) ?? 0m;
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
            catch
            {
                return Ok(new
                {
                    ventaTotal = 0m,
                    costoTotal = 0m,
                    gastosTotal = 0m,
                    utilidadBruta = 0m,
                    utilidadNeta = 0m
                });
            }
        }

        [HttpGet("productos-mas-vendidos")]
        public async Task<ActionResult> ProductosMasVendidos(DateTime? desde, DateTime? hasta, int? idSucursal)
        {
            var fechaDesde = desde ?? FechaHelper.HoyInicioHonduras();
            var fechaHasta = hasta ?? FechaHelper.HoyFinHonduras();

            try
            {
                var data = await (
                    from d in _context.DetalleVenta.AsNoTracking()
                    join p in _context.Productos.AsNoTracking() on d.Id_Producto equals p.Id_Producto
                    join v in _context.Ventas.AsNoTracking() on d.Id_Venta equals v.Id_Venta
                    where v.Fecha >= fechaDesde && v.Fecha <= fechaHasta && v.Estado == "ACTIVA" &&
                          (!idSucursal.HasValue || v.Id_Sucursal == idSucursal.Value)
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
            catch
            {
                return Ok(Array.Empty<object>());
            }
        }

        [HttpGet("ventas-por-metodo-pago")]
        public async Task<ActionResult> VentasPorMetodoPago(DateTime? desde, DateTime? hasta, int? idSucursal)
        {
            var fechaDesde = desde ?? FechaHelper.HoyInicioHonduras();
            var fechaHasta = hasta ?? FechaHelper.HoyFinHonduras();

            try
            {
                var query = _context.Ventas
                    .AsNoTracking()
                    .Where(x => x.Fecha >= fechaDesde && x.Fecha <= fechaHasta && x.Estado == "ACTIVA");

                if (idSucursal.HasValue)
                    query = query.Where(x => x.Id_Sucursal == idSucursal.Value);

                var ventas = await query
                    .Select(x => new
                    {
                        MetodoPago = x.Metodo_Pago ?? string.Empty,
                        x.Total,
                        Observacion = x.Observacion ?? string.Empty
                    })
                    .ToListAsync();

                var pagos = ventas
                    .SelectMany(v => PagoVentaHelper.ObtenerPagosVenta(v.MetodoPago, v.Total, v.Observacion)
                        .Select(p => new
                        {
                            MetodoPago = (p.Metodo_Pago ?? string.Empty).Trim().ToUpperInvariant(),
                            p.Monto
                        }))
                    .Where(x => x.Monto > 0)
                    .ToList();

                var data = pagos
                    .GroupBy(x => x.MetodoPago)
                    .Select(g => new
                    {
                        MetodoPago = g.Key,
                        Cantidad = g.Count(),
                        Total = g.Sum(x => x.Monto)
                    })
                    .OrderByDescending(x => x.Total)
                    .ToList();

                return Ok(data);
            }
            catch
            {
                return Ok(Array.Empty<object>());
            }
        }

        [HttpGet("ventas-por-tipo-servicio")]
        public async Task<ActionResult> VentasPorTipoServicio(DateTime? desde, DateTime? hasta, int? idSucursal)
        {
            var fechaDesde = desde ?? FechaHelper.HoyInicioHonduras();
            var fechaHasta = hasta ?? FechaHelper.HoyFinHonduras();

            try
            {
                var query = _context.Ventas
                    .AsNoTracking()
                    .Where(x => x.Fecha >= fechaDesde && x.Fecha <= fechaHasta && x.Estado == "ACTIVA");

                if (idSucursal.HasValue)
                    query = query.Where(x => x.Id_Sucursal == idSucursal.Value);

                var ventas = await query
                    .Select(x => new
                    {
                        Observacion = x.Observacion ?? string.Empty,
                        x.Total
                    })
                    .ToListAsync();

                var data = ventas
                    .GroupBy(x => NormalizarTipoServicioDesdeObservacion(x.Observacion))
                    .Select(g => new
                    {
                        tipoServicio = g.Key,
                        cantidad = g.Count(),
                        total = g.Sum(x => x.Total)
                    })
                    .OrderByDescending(x => x.total)
                    .ToList();

                return Ok(data);
            }
            catch
            {
                return Ok(Array.Empty<object>());
            }
        }

        [HttpGet("ventas-detalle")]
        [HttpGet("detalle-ventas")]
        [HttpGet("ventas-detalle-atendio-cobro")]
        [HttpGet("ventas/detalle")]
        public async Task<ActionResult> VentasDetalle(DateTime? desde, DateTime? hasta, int? idSucursal)
        {
            try
            {
                var fechaDesde = desde ?? FechaHelper.HoyInicioHonduras();
                var fechaHasta = hasta ?? FechaHelper.HoyFinHonduras();

                var query = _context.Ventas
                    .AsNoTracking()
                    .Where(x => x.Fecha >= fechaDesde && x.Fecha <= fechaHasta && x.Estado == "ACTIVA");

                if (idSucursal.HasValue)
                    query = query.Where(x => x.Id_Sucursal == idSucursal.Value);

                var ventas = await query
                    .OrderByDescending(x => x.Fecha)
                    .Take(500)
                    .Select(x => new
                    {
                        x.Id_Venta,
                        x.Fecha,
                        x.Id_Sucursal,
                        x.Id_Usuario,
                        x.Observacion,
                        x.Metodo_Pago,
                        x.Total
                    })
                    .ToListAsync();

                var idsSucursal = ventas.Select(x => x.Id_Sucursal).Distinct().ToList();
                var idsUsuario = ventas.Select(x => x.Id_Usuario).Distinct().ToList();

                var sucursales = idsSucursal.Count == 0
                    ? new Dictionary<int, string>()
                    : await _context.Sucursales
                        .AsNoTracking()
                        .Where(x => idsSucursal.Contains(x.Id_Sucursal))
                        .GroupBy(x => x.Id_Sucursal)
                        .Select(g => new
                        {
                            Id = g.Key,
                            Nombre = g.Select(x => x.Nombre).FirstOrDefault() ?? $"Sucursal {g.Key}"
                        })
                        .ToDictionaryAsync(x => x.Id, x => x.Nombre);

                var usuarios = idsUsuario.Count == 0
                    ? new Dictionary<int, string>()
                    : await _context.Usuarios
                        .AsNoTracking()
                        .Where(x => idsUsuario.Contains(x.Id_Usuario))
                        .GroupBy(x => x.Id_Usuario)
                        .Select(g => new
                        {
                            Id = g.Key,
                            Nombre = g.Select(x => x.Nombre).FirstOrDefault() ?? string.Empty
                        })
                        .ToDictionaryAsync(x => x.Id, x => x.Nombre);

                var data = new List<object>(ventas.Count);
                foreach (var v in ventas)
                {
                    try
                    {
                        var atendio = ObservacionVentaHelper.ObtenerAtendio(v.Observacion);
                        var cobro = ObservacionVentaHelper.ObtenerCobro(v.Observacion);
                        var tipoServicio = NormalizarTipoServicioDesdeObservacion(v.Observacion);

                        if (string.IsNullOrWhiteSpace(cobro) && usuarios.TryGetValue(v.Id_Usuario, out var nombreCajero))
                            cobro = nombreCajero;

                        data.Add(new
                        {
                            v.Id_Venta,
                            v.Fecha,
                            v.Id_Sucursal,
                            Sucursal = sucursales.TryGetValue(v.Id_Sucursal, out var nombreSucursal) ? nombreSucursal : $"Sucursal {v.Id_Sucursal}",
                            v.Metodo_Pago,
                            TipoServicio = tipoServicio,
                            Atendio = string.IsNullOrWhiteSpace(atendio) ? "N/D" : atendio,
                            Cobro = string.IsNullOrWhiteSpace(cobro) ? "N/D" : cobro,
                            v.Total
                        });
                    }
                    catch
                    {
                        data.Add(new
                        {
                            v.Id_Venta,
                            v.Fecha,
                            v.Id_Sucursal,
                            Sucursal = sucursales.TryGetValue(v.Id_Sucursal, out var nombreSucursal) ? nombreSucursal : $"Sucursal {v.Id_Sucursal}",
                            Metodo_Pago = v.Metodo_Pago,
                            TipoServicio = "SIN_DEFINIR",
                            Atendio = "N/D",
                            Cobro = "N/D",
                            v.Total
                        });
                    }
                }

                return Ok(data);
            }
            catch
            {
                return Ok(Array.Empty<object>());
            }
        }

        [HttpGet("ventas-por-categoria")]
        public async Task<ActionResult> VentasPorCategoria(DateTime? desde, DateTime? hasta, int? idSucursal)
        {
            var fechaDesde = desde ?? FechaHelper.HoyInicioHonduras();
            var fechaHasta = hasta ?? FechaHelper.HoyFinHonduras();

            try
            {
                var data = await (
                    from d in _context.DetalleVenta.AsNoTracking()
                    join p in _context.Productos.AsNoTracking() on d.Id_Producto equals p.Id_Producto
                    join c in _context.Categorias.AsNoTracking() on p.Id_Categoria equals c.Id_Categoria
                    join v in _context.Ventas.AsNoTracking() on d.Id_Venta equals v.Id_Venta
                    where v.Fecha >= fechaDesde && v.Fecha <= fechaHasta && v.Estado == "ACTIVA" &&
                          (!idSucursal.HasValue || v.Id_Sucursal == idSucursal.Value)
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
            catch
            {
                return Ok(Array.Empty<object>());
            }
        }

        [HttpGet("gastos-por-categoria")]
        public async Task<ActionResult> GastosPorCategoria(DateTime? desde, DateTime? hasta, int? idSucursal)
        {
            var fechaDesde = desde ?? FechaHelper.HoyInicioHonduras();
            var fechaHasta = hasta ?? FechaHelper.HoyFinHonduras();

            try
            {
                var query = _context.Gastos
                    .AsNoTracking()
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
            catch
            {
                return Ok(Array.Empty<object>());
            }
        }
    }
}


