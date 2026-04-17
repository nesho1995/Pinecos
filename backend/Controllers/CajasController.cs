using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pinecos.Attributes;
using Pinecos.Data;
using Pinecos.DTOs;
using Pinecos.Helpers;
using Pinecos.Models;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Pinecos.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AuthorizeRoles("ADMIN", "CAJERO")]
    public class CajasController : ControllerBase
    {
        private readonly PinecosDbContext _context;
        private readonly IWebHostEnvironment _env;
        private readonly JsonSerializerOptions _jsonOptions = new()
        {
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };

        public CajasController(PinecosDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        private class CuadreResumenDto
        {
            public decimal MontoInicial { get; set; }
            public decimal VentasTotal { get; set; }
            public decimal VentasEfectivo { get; set; }
            public decimal VentasPos { get; set; }
            public decimal VentasDelivery { get; set; }
            public decimal IngresosCaja { get; set; }
            public decimal EgresosCaja { get; set; }
            public decimal Gastos { get; set; }
            public decimal EfectivoEsperado { get; set; }
            public decimal TotalEsperado { get; set; }
            public List<object> VentasPorMetodo { get; set; } = new();
        }

        private async Task<ActionResult<Caja>> GetCajaValidadaAsync(int idCaja)
        {
            var idSucursal = UserHelper.GetSucursalId(User);
            var rol = UserHelper.GetUserRole(User);

            if (rol != "ADMIN" && !idSucursal.HasValue)
                return BadRequest(new { message = "El usuario no tiene sucursal asignada" });

            var caja = await _context.Cajas.FirstOrDefaultAsync(x => x.Id_Caja == idCaja);

            if (caja == null)
                return NotFound(new { message = "Caja no encontrada" });

            if (rol != "ADMIN" && caja.Id_Sucursal != idSucursal!.Value)
                return Forbid();

            return caja;
        }

        private static bool EsMetodoEfectivo(string? metodo)
        {
            var m = (metodo ?? string.Empty).Trim().ToUpper();
            return m == "EFECTIVO" || m == "CASH";
        }

        private static bool EsMetodoDelivery(string? metodo)
        {
            var m = NormalizeCanal(metodo);
            return m == "PEDIDOSYA" || m.StartsWith("PEDIDOSYA") || m.StartsWith("DELIVERY");
        }

        private static bool EsIngreso(string? tipo)
        {
            var t = (tipo ?? string.Empty).Trim().ToUpper();
            return t.Contains("INGRESO") || t == "ENTRADA";
        }

        private static bool EsEgreso(string? tipo)
        {
            var t = (tipo ?? string.Empty).Trim().ToUpper();
            return t.Contains("EGRESO") || t == "SALIDA";
        }

        private static string NormalizeCanal(string? canal)
        {
            var raw = (canal ?? string.Empty).Trim().ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(raw)) return string.Empty;
            return new string(raw.Where(char.IsLetterOrDigit).ToArray());
        }

        private static Dictionary<string, HashSet<string>> ConstruirMapaMetodos(CuadreCanalesConfigDto config)
        {
            var mapa = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase)
            {
                ["EFECTIVO"] = new HashSet<string>(StringComparer.Ordinal),
                ["POS"] = new HashSet<string>(StringComparer.Ordinal),
                ["DELIVERY"] = new HashSet<string>(StringComparer.Ordinal)
            };

            foreach (var metodo in config.MetodosPago ?? new List<MetodoPagoConfigDto>())
            {
                if (!metodo.Activo) continue;
                var categoria = (metodo.Categoria ?? string.Empty).Trim().ToUpperInvariant();
                if (!mapa.ContainsKey(categoria)) continue;

                var codigo = NormalizeCanal(metodo.Codigo);
                var nombre = NormalizeCanal(metodo.Nombre);
                if (!string.IsNullOrWhiteSpace(codigo)) mapa[categoria].Add(codigo);
                if (!string.IsNullOrWhiteSpace(nombre)) mapa[categoria].Add(nombre);
            }

            if (mapa["EFECTIVO"].Count == 0)
            {
                mapa["EFECTIVO"].Add(NormalizeCanal("EFECTIVO"));
                mapa["EFECTIVO"].Add(NormalizeCanal("CASH"));
            }

            return mapa;
        }

        private async Task<CuadreResumenDto> ConstruirResumenCuadreAsync(Caja caja, DateTime fechaCorte)
        {
            var canalesConfig = CuadreCanalesStore.GetConfig(_env.ContentRootPath, caja.Id_Sucursal);
            var metodosPorCategoria = ConstruirMapaMetodos(canalesConfig);

            var ventas = await _context.Ventas
                .Where(x =>
                    x.Id_Caja == caja.Id_Caja &&
                    x.Estado == "ACTIVA" &&
                    x.Fecha >= caja.Fecha_Apertura &&
                    x.Fecha <= fechaCorte)
                .ToListAsync();

            var movimientos = await _context.MovimientosCaja
                .Where(x => x.Id_Caja == caja.Id_Caja)
                .ToListAsync();

            var gastos = await _context.Gastos
                .Where(x =>
                    x.Id_Sucursal == caja.Id_Sucursal &&
                    x.Activo &&
                    x.Fecha >= caja.Fecha_Apertura &&
                    x.Fecha <= fechaCorte)
                .ToListAsync();

            var ventasTotal = ventas.Sum(x => x.Total);

            var ingresosCaja = movimientos.Where(x => EsIngreso(x.Tipo)).Sum(x => x.Monto);
            var egresosCaja = movimientos.Where(x => EsEgreso(x.Tipo)).Sum(x => x.Monto);
            var totalGastos = gastos.Sum(x => x.Monto);

            var pagosExpandidos = ventas
                .SelectMany(v => PagoVentaHelper.ObtenerPagosVenta(v)
                    .Select(p => new
                    {
                        Metodo = NormalizeCanal(p.Metodo_Pago),
                        MetodoLabel = (p.Metodo_Pago ?? string.Empty).Trim().ToUpperInvariant(),
                        Monto = p.Monto
                    }))
                .Where(x => x.Monto > 0)
                .ToList();

            var ventasPorMetodoRaw = pagosExpandidos
                .GroupBy(x => x.Metodo)
                .ToDictionary(g => g.Key, g => g.Sum(x => x.Monto));

            var ventasEfectivo = ventasPorMetodoRaw
                .Where(x => metodosPorCategoria["EFECTIVO"].Contains(x.Key))
                .Sum(x => x.Value);

            var ventasPos = ventasPorMetodoRaw
                .Where(x => metodosPorCategoria["POS"].Contains(x.Key))
                .Sum(x => x.Value);

            var ventasDelivery = ventasPorMetodoRaw
                .Where(x => metodosPorCategoria["DELIVERY"].Contains(x.Key))
                .Sum(x => x.Value);

            // Si hay metodos no clasificados, van como POS por defecto para no perder cuadre.
            var totalClasificado = ventasEfectivo + ventasPos + ventasDelivery;
            if (ventasTotal > totalClasificado)
                ventasPos += ventasTotal - totalClasificado;

            var efectivoEsperado = caja.Monto_Inicial + ventasEfectivo + ingresosCaja - egresosCaja - totalGastos;
            var totalEsperado = efectivoEsperado + ventasPos + ventasDelivery;

            var ventasPorMetodo = pagosExpandidos
                .GroupBy(x => x.MetodoLabel)
                .Select(g => new
                {
                    metodo = string.IsNullOrWhiteSpace(g.Key) ? "SIN_METODO" : g.Key,
                    total = g.Sum(x => x.Monto),
                    cantidad = g.Count()
                })
                .OrderByDescending(x => x.total)
                .Cast<object>()
                .ToList();

            return new CuadreResumenDto
            {
                MontoInicial = caja.Monto_Inicial,
                VentasTotal = ventasTotal,
                VentasEfectivo = ventasEfectivo,
                VentasPos = ventasPos,
                VentasDelivery = ventasDelivery,
                IngresosCaja = ingresosCaja,
                EgresosCaja = egresosCaja,
                Gastos = totalGastos,
                EfectivoEsperado = efectivoEsperado,
                TotalEsperado = totalEsperado,
                VentasPorMetodo = ventasPorMetodo
            };
        }

        [HttpGet("abiertas")]
        public async Task<ActionResult> GetCajasAbiertas([FromQuery] int? idSucursal = null)
        {
            var rol = UserHelper.GetUserRole(User);
            var idSucursalToken = UserHelper.GetSucursalId(User);

            var query = _context.Cajas
                .Where(x => x.Estado == "ABIERTA")
                .AsQueryable();

            if (rol != "ADMIN")
            {
                if (!idSucursalToken.HasValue)
                    return BadRequest(new { message = "El usuario no tiene sucursal asignada" });

                query = query.Where(x => x.Id_Sucursal == idSucursalToken.Value);
            }
            else if (idSucursal.HasValue && idSucursal.Value > 0)
            {
                query = query.Where(x => x.Id_Sucursal == idSucursal.Value);
            }

            var cajas = await query
                .OrderByDescending(x => x.Fecha_Apertura)
                .ToListAsync();

            return Ok(cajas);
        }

        [HttpGet("canales-config")]
        public ActionResult GetCanalesConfig([FromQuery] int? idSucursal = null)
        {
            var rol = UserHelper.GetUserRole(User);
            var idSucursalToken = UserHelper.GetSucursalId(User);

            int sucursalObjetivo;
            if (rol == "ADMIN")
            {
                if (!idSucursal.HasValue || idSucursal.Value <= 0)
                    return BadRequest(new { message = "Para ADMIN debes indicar idSucursal" });
                sucursalObjetivo = idSucursal.Value;
            }
            else
            {
                if (!idSucursalToken.HasValue)
                    return BadRequest(new { message = "El usuario no tiene sucursal asignada" });
                sucursalObjetivo = idSucursalToken.Value;
            }

            var config = CuadreCanalesStore.GetConfig(_env.ContentRootPath, sucursalObjetivo);
            return Ok(config);
        }

        [HttpPut("canales-config")]
        [AuthorizeRoles("ADMIN")]
        public ActionResult PutCanalesConfig([FromQuery] int idSucursal, [FromBody] CuadreCanalesConfigDto model)
        {
            if (idSucursal <= 0)
                return BadRequest(new { message = "idSucursal invalido" });

            var config = CuadreCanalesStore.Sanitize(model);
            config.IdSucursal = idSucursal;
            CuadreCanalesStore.SaveConfig(_env.ContentRootPath, idSucursal, config);

            return Ok(new { message = "Canales de cuadre guardados", data = config });
        }

        [HttpGet("cierres")]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> GetCierres(
            [FromQuery] DateTime? desde = null,
            [FromQuery] DateTime? hasta = null,
            [FromQuery] int? idSucursal = null)
        {
            var rol = UserHelper.GetUserRole(User);
            var idSucursalToken = UserHelper.GetSucursalId(User);

            if (rol != "ADMIN" && !idSucursalToken.HasValue)
                return BadRequest(new { message = "El usuario no tiene sucursal asignada" });

            var query = _context.Cajas
                .Where(x => x.Estado == "CERRADA")
                .AsQueryable();

            if (rol != "ADMIN")
            {
                query = query.Where(x => x.Id_Sucursal == idSucursalToken!.Value);
            }
            else if (idSucursal.HasValue)
            {
                query = query.Where(x => x.Id_Sucursal == idSucursal.Value);
            }

            if (desde.HasValue)
                query = query.Where(x => x.Fecha_Cierre.HasValue && x.Fecha_Cierre.Value >= desde.Value);

            if (hasta.HasValue)
                query = query.Where(x => x.Fecha_Cierre.HasValue && x.Fecha_Cierre.Value <= hasta.Value);

            var cajas = await query
                .OrderByDescending(x => x.Fecha_Cierre)
                .Take(300)
                .ToListAsync();

            var data = cajas.Select(c =>
            {
                bool? cuadro = null;
                decimal? diferencia = null;
                decimal? totalEsperado = null;
                decimal? totalDeclarado = null;

                if (!string.IsNullOrWhiteSpace(c.Observacion))
                {
                    try
                    {
                        using var doc = JsonDocument.Parse(c.Observacion);
                        var root = doc.RootElement;
                        if (root.TryGetProperty("cuadro", out var cuadroEl) && cuadroEl.ValueKind is JsonValueKind.True or JsonValueKind.False)
                            cuadro = cuadroEl.GetBoolean();
                        if (root.TryGetProperty("diferencia", out var difEl) && difEl.ValueKind == JsonValueKind.Number)
                            diferencia = difEl.GetDecimal();
                        if (root.TryGetProperty("esperado", out var espEl) &&
                            espEl.TryGetProperty("TotalEsperado", out var teEl) &&
                            teEl.ValueKind == JsonValueKind.Number)
                            totalEsperado = teEl.GetDecimal();
                        if (root.TryGetProperty("declarado", out var decEl) &&
                            decEl.TryGetProperty("total", out var tdEl) &&
                            tdEl.ValueKind == JsonValueKind.Number)
                            totalDeclarado = tdEl.GetDecimal();
                    }
                    catch
                    {
                    }
                }

                return new
                {
                    c.Id_Caja,
                    c.Id_Sucursal,
                    c.Fecha_Apertura,
                    c.Fecha_Cierre,
                    c.Monto_Inicial,
                    c.Monto_Cierre,
                    cuadro,
                    diferencia,
                    totalEsperado,
                    totalDeclarado
                };
            });

            return Ok(data);
        }

        [HttpPost("abrir")]
        public async Task<ActionResult> AbrirCaja([FromBody] AperturaCajaRequestDto request)
        {
            if (request == null)
                return BadRequest(new { message = "Debes enviar los datos de apertura de caja" });

            var idUsuario = UserHelper.GetUserId(User);
            var idSucursal = UserHelper.GetSucursalId(User);

            if (!idUsuario.HasValue)
                return Unauthorized(new { message = "Usuario no valido en el token" });

            if (!idSucursal.HasValue)
                return BadRequest(new { message = "El usuario no tiene sucursal asignada" });

            var cajaAbierta = await _context.Cajas.AnyAsync(x =>
                x.Id_Sucursal == idSucursal.Value && x.Estado == "ABIERTA");

            if (cajaAbierta)
                return BadRequest(new { message = "Ya existe una caja abierta en esta sucursal" });

            if (request.Monto_Inicial < 0)
                return BadRequest(new { message = "El monto inicial no puede ser negativo" });

            if (request.Monto_Inicial > 1000000)
                return BadRequest(new { message = "El monto inicial excede el limite permitido" });

            var usuarioDb = await _context.Usuarios
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id_Usuario == idUsuario.Value);
            var nombreUsuario = string.IsNullOrWhiteSpace(usuarioDb?.Nombre)
                ? (User?.Identity?.Name ?? $"Usuario #{idUsuario.Value}")
                : usuarioDb!.Nombre;

            var observacionApertura = new
            {
                tipo = "APERTURA_CAJA_V2",
                fechaApertura = FechaHelper.AhoraHonduras(),
                usuarioAperturaId = idUsuario.Value,
                usuarioAperturaNombre = nombreUsuario,
                turno = (request.Turno ?? string.Empty).Trim(),
                observacionUsuario = (request.Observacion ?? string.Empty).Trim()
            };

            var model = new Caja
            {
                Id_Sucursal = idSucursal.Value,
                Id_Usuario_Apertura = idUsuario.Value,
                Fecha_Apertura = FechaHelper.AhoraHonduras(),
                Monto_Inicial = request.Monto_Inicial,
                Estado = "ABIERTA",
                Observacion = JsonSerializer.Serialize(observacionApertura, _jsonOptions)
            };

            _context.Cajas.Add(model);
            await _context.SaveChangesAsync();

            // Mantiene traza de caja chica inicial asociada a esta caja.
            _context.MovimientosCaja.Add(new MovimientoCaja
            {
                Id_Caja = model.Id_Caja,
                Fecha = model.Fecha_Apertura,
                Tipo = "APERTURA_CAJA_CHICA",
                Descripcion = "Apertura de caja con monto inicial",
                Monto = model.Monto_Inicial,
                Id_Usuario = idUsuario.Value
            });
            await _context.SaveChangesAsync();

            await BitacoraHelper.RegistrarAsync(_context, idUsuario.Value, "CAJA", "ABRIR", $"Caja #{model.Id_Caja} abierta");

            return Ok(new
            {
                message = "Caja abierta correctamente",
                data = model,
                auditoria = new
                {
                    usuarioAperturaId = idUsuario.Value,
                    usuarioAperturaNombre = nombreUsuario,
                    turno = (request.Turno ?? string.Empty).Trim()
                }
            });
        }

        [HttpGet("cuadre-previo/{idCaja}")]
        public async Task<ActionResult> GetCuadrePrevio(int idCaja)
        {
            var cajaResult = await GetCajaValidadaAsync(idCaja);
            if (cajaResult.Result != null) return cajaResult.Result;
            var caja = cajaResult.Value!;

            var fechaCorte = FechaHelper.AhoraHonduras();
            var resumen = await ConstruirResumenCuadreAsync(caja, fechaCorte);
            var canalesConfig = CuadreCanalesStore.GetConfig(_env.ContentRootPath, caja.Id_Sucursal);

            return Ok(new
            {
                caja = new
                {
                    caja.Id_Caja,
                    caja.Id_Sucursal,
                    caja.Id_Usuario_Apertura,
                    caja.Fecha_Apertura,
                    caja.Monto_Inicial,
                    caja.Estado,
                    caja.Observacion
                },
                canalesConfig,
                resumen,
                fechaCorte
            });
        }

        [HttpGet("estado-cuenta/{idCaja}")]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> GetEstadoCuenta(int idCaja)
        {
            var cajaResult = await GetCajaValidadaAsync(idCaja);
            if (cajaResult.Result != null) return cajaResult.Result;
            var caja = cajaResult.Value!;

            var fechaFinal = caja.Fecha_Cierre ?? FechaHelper.AhoraHonduras();
            var resumen = await ConstruirResumenCuadreAsync(caja, fechaFinal);

            var movimientos = await _context.MovimientosCaja
                .Where(x => x.Id_Caja == idCaja)
                .OrderBy(x => x.Fecha)
                .ToListAsync();

            var ventas = await _context.Ventas
                .Where(x => x.Id_Caja == idCaja)
                .OrderBy(x => x.Fecha)
                .ToListAsync();

            object? cierreData = null;
            if (!string.IsNullOrWhiteSpace(caja.Observacion))
            {
                try
                {
                    cierreData = JsonSerializer.Deserialize<object>(caja.Observacion);
                }
                catch
                {
                    cierreData = new { observacion = caja.Observacion };
                }
            }

            return Ok(new
            {
                caja,
                resumen,
                cierre = cierreData,
                movimientos,
                ventas
            });
        }

        [HttpPost("cerrar/{idCaja}")]
        public async Task<ActionResult> CerrarCaja(int idCaja, [FromBody] CierreCajaRequestDto request)
        {
            if (request == null)
                return BadRequest(new { message = "Debes enviar los datos de cierre de caja" });

            var idUsuario = UserHelper.GetUserId(User);
            var idSucursal = UserHelper.GetSucursalId(User);

            if (!idUsuario.HasValue)
                return Unauthorized(new { message = "Usuario no valido en el token" });

            if (!idSucursal.HasValue)
                return BadRequest(new { message = "El usuario no tiene sucursal asignada" });

            var caja = await _context.Cajas.FirstOrDefaultAsync(x =>
                x.Id_Caja == idCaja &&
                x.Id_Sucursal == idSucursal.Value);

            if (caja == null)
                return NotFound(new { message = "Caja no encontrada" });

            if (caja.Estado == "CERRADA")
                return BadRequest(new { message = "La caja ya esta cerrada" });

            var cuentasAbiertas = await _context.CuentasMesa
                .AnyAsync(x => x.Id_Sucursal == caja.Id_Sucursal && x.Estado == "ABIERTA");

            if (cuentasAbiertas)
                return BadRequest(new { message = "No se puede cerrar caja: existen cuentas de mesa abiertas en la sucursal" });

            if (request.Monto_Cierre < 0)
                return BadRequest(new { message = "El efectivo final no puede ser negativo" });

            if ((request.Pos?.Any(x => x.Monto < 0) ?? false) || (request.Delivery?.Any(x => x.Monto < 0) ?? false))
                return BadRequest(new { message = "No se permiten montos negativos en POS o delivery" });

            if ((request.Pos?.Any(x => string.IsNullOrWhiteSpace(x.Canal)) ?? false) ||
                (request.Delivery?.Any(x => string.IsNullOrWhiteSpace(x.Canal)) ?? false))
            {
                return BadRequest(new { message = "Cada linea de POS o delivery debe tener nombre de canal" });
            }

            var canalesConfig = CuadreCanalesStore.GetConfig(_env.ContentRootPath, caja.Id_Sucursal);
            var expectedPos = canalesConfig.Pos.Select(NormalizeCanal).ToHashSet(StringComparer.Ordinal);
            var expectedDelivery = canalesConfig.Delivery.Select(NormalizeCanal).ToHashSet(StringComparer.Ordinal);

            var posDeclarado = (request.Pos ?? new List<CanalMontoDto>())
                .Select(x => NormalizeCanal(x.Canal))
                .ToHashSet(StringComparer.Ordinal);

            var deliveryDeclarado = (request.Delivery ?? new List<CanalMontoDto>())
                .Select(x => NormalizeCanal(x.Canal))
                .ToHashSet(StringComparer.Ordinal);

            if (!expectedPos.SetEquals(posDeclarado))
                return BadRequest(new { message = "Los canales POS del cierre no coinciden con la configuracion de admin" });

            if (!expectedDelivery.SetEquals(deliveryDeclarado))
                return BadRequest(new { message = "Los canales Delivery del cierre no coinciden con la configuracion de admin" });

            var usuarioDb = await _context.Usuarios
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id_Usuario == idUsuario.Value);
            var nombreUsuario = string.IsNullOrWhiteSpace(usuarioDb?.Nombre)
                ? (User?.Identity?.Name ?? $"Usuario #{idUsuario.Value}")
                : usuarioDb!.Nombre;

            var fechaCierre = FechaHelper.AhoraHonduras();
            var resumen = await ConstruirResumenCuadreAsync(caja, fechaCierre);

            var totalPosDeclarado = (request.Pos ?? new List<CanalMontoDto>()).Sum(x => x.Monto);
            var totalDeliveryDeclarado = (request.Delivery ?? new List<CanalMontoDto>()).Sum(x => x.Monto);
            var totalDeclarado = request.Monto_Cierre + totalPosDeclarado + totalDeliveryDeclarado;
            var diferencia = totalDeclarado - resumen.TotalEsperado;
            var cuadro = Math.Abs(diferencia) <= 0.01m;

            var cierreDetalle = new
            {
                tipo = "CIERRE_CAJA_V2",
                fechaCierre,
                usuarioCierreId = idUsuario.Value,
                usuarioCierreNombre = nombreUsuario,
                turno = (request.Turno ?? string.Empty).Trim(),
                observacionUsuario = request.Observacion,
                esperado = new
                {
                    resumen.EfectivoEsperado,
                    resumen.VentasPos,
                    resumen.VentasDelivery,
                    resumen.TotalEsperado
                },
                declarado = new
                {
                    efectivo = request.Monto_Cierre,
                    totalPos = totalPosDeclarado,
                    totalDelivery = totalDeliveryDeclarado,
                    total = totalDeclarado,
                    pos = request.Pos ?? new List<CanalMontoDto>(),
                    delivery = request.Delivery ?? new List<CanalMontoDto>()
                },
                diferencia,
                cuadro
            };

            caja.Estado = "CERRADA";
            caja.Id_Usuario_Cierre = idUsuario.Value;
            caja.Fecha_Cierre = fechaCierre;
            caja.Monto_Cierre = request.Monto_Cierre;
            caja.Observacion = JsonSerializer.Serialize(cierreDetalle, _jsonOptions);

            _context.MovimientosCaja.Add(new MovimientoCaja
            {
                Id_Caja = caja.Id_Caja,
                Fecha = fechaCierre,
                Tipo = "CIERRE_CAJA",
                Descripcion = "Cierre de caja",
                Monto = request.Monto_Cierre,
                Id_Usuario = idUsuario.Value
            });

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (
                ex.ToString().Contains("Data too long for column", StringComparison.OrdinalIgnoreCase) ||
                ex.ToString().Contains("String or binary data would be truncated", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new
                {
                    message = "No se pudo guardar el detalle del cierre por limite de columna. Ejecuta ALTER TABLE cajas MODIFY observacion LONGTEXT NULL;"
                });
            }

            await BitacoraHelper.RegistrarAsync(_context, idUsuario.Value, "CAJA", "CERRAR", $"Caja #{caja.Id_Caja} cerrada");

            return Ok(new
            {
                message = cuadro ? "Caja cerrada correctamente. El cuadre coincide." : "Caja cerrada, pero el cuadre NO coincide.",
                data = caja,
                cuadre = new
                {
                    cuadro,
                    diferencia,
                    esperado = resumen.TotalEsperado,
                    declarado = totalDeclarado
                }
            });
        }
    }
}
