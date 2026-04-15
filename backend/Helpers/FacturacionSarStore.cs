using System.Text.Json;
using System.Text.RegularExpressions;
using Pinecos.DTOs;

namespace Pinecos.Helpers
{
    public static class FacturacionSarStore
    {
        private static readonly object Sync = new();

        private static string GetFilePath(string contentRootPath)
        {
            var folder = Path.Combine(contentRootPath, "App_Data");
            Directory.CreateDirectory(folder);
            return Path.Combine(folder, "facturacion_sar.json");
        }

        public static FacturacionSarStoreDataDto LoadData(string contentRootPath)
        {
            lock (Sync)
            {
                var filePath = GetFilePath(contentRootPath);
                if (!File.Exists(filePath))
                    return new FacturacionSarStoreDataDto();

                var json = File.ReadAllText(filePath);

                // Compatibilidad: archivo antiguo (config unica global)
                try
                {
                    var legacy = JsonSerializer.Deserialize<FacturacionSarConfigDto>(json, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });

                    if (legacy != null && (legacy.HabilitadoCai || !string.IsNullOrWhiteSpace(legacy.Cai)))
                    {
                        return new FacturacionSarStoreDataDto
                        {
                            ConfiguracionesPorSucursal = new Dictionary<int, FacturacionSarConfigDto>
                            {
                                [0] = legacy
                            }
                        };
                    }
                }
                catch
                {
                }

                var data = JsonSerializer.Deserialize<FacturacionSarStoreDataDto>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                return data ?? new FacturacionSarStoreDataDto();
            }
        }

        public static void SaveData(string contentRootPath, FacturacionSarStoreDataDto data)
        {
            lock (Sync)
            {
                var filePath = GetFilePath(contentRootPath);
                var json = JsonSerializer.Serialize(data, new JsonSerializerOptions
                {
                    WriteIndented = true
                });
                File.WriteAllText(filePath, json);
            }
        }

        public static FacturacionSarConfigDto GetConfig(string contentRootPath, int idSucursal)
        {
            lock (Sync)
            {
                var data = LoadData(contentRootPath);
                if (data.ConfiguracionesPorSucursal.TryGetValue(idSucursal, out var config))
                {
                    config.IdSucursal = idSucursal;
                    AplicarMetricas(config);
                    return config;
                }

                // Fallback de legado (key 0)
                if (data.ConfiguracionesPorSucursal.TryGetValue(0, out var legacy))
                {
                    var fallback = Clone(legacy);
                    fallback.IdSucursal = idSucursal;
                    AplicarMetricas(fallback);
                    return fallback;
                }

                var nuevo = new FacturacionSarConfigDto
                {
                    IdSucursal = idSucursal,
                    HabilitadoCai = false,
                    PermitirVentaSinFactura = true
                };
                AplicarMetricas(nuevo);
                return nuevo;
            }
        }

        public static List<FacturacionSarSucursalResumenDto> GetAllResumen(string contentRootPath)
        {
            lock (Sync)
            {
                var data = LoadData(contentRootPath);
                return data.ConfiguracionesPorSucursal
                    .Where(kv => kv.Key > 0)
                    .Select(kv => new FacturacionSarSucursalResumenDto
                    {
                        IdSucursal = kv.Key,
                        HabilitadoCai = kv.Value.HabilitadoCai,
                        Cai = kv.Value.Cai,
                        SiguienteCorrelativo = kv.Value.SiguienteCorrelativo,
                        FechaLimiteEmision = kv.Value.FechaLimiteEmision,
                        FacturasRestantes = CalcularFacturasRestantes(kv.Value),
                        CaiVencido = kv.Value.FechaLimiteEmision.HasValue && kv.Value.FechaLimiteEmision.Value.Date < DateTime.Now.Date
                    })
                    .OrderBy(x => x.IdSucursal)
                    .ToList();
            }
        }

        public static void SaveConfig(string contentRootPath, int idSucursal, FacturacionSarConfigDto config)
        {
            lock (Sync)
            {
                var data = LoadData(contentRootPath);
                config.IdSucursal = idSucursal;
                data.ConfiguracionesPorSucursal[idSucursal] = config;
                SaveData(contentRootPath, data);
            }
        }

        public static FacturaEmitidaDto EmitirSiguiente(string contentRootPath, int idSucursal)
        {
            lock (Sync)
            {
                var config = GetConfig(contentRootPath, idSucursal);

                if (!config.HabilitadoCai)
                    throw new InvalidOperationException($"La facturacion CAI esta desactivada para sucursal {idSucursal}");

                if (string.IsNullOrWhiteSpace(config.Cai))
                    throw new InvalidOperationException("Debe configurar el CAI");

                if (string.IsNullOrWhiteSpace(config.RangoInicio) || string.IsNullOrWhiteSpace(config.RangoFin))
                    throw new InvalidOperationException("Debe configurar el rango de facturacion");

                if (config.FechaLimiteEmision.HasValue && config.FechaLimiteEmision.Value.Date < DateTime.Now.Date)
                    throw new InvalidOperationException("El CAI ya vencio. Actualice fecha limite");

                var (prefixInicio, correlativoInicio) = ParseRango(config.RangoInicio);
                var (prefixFin, correlativoFin) = ParseRango(config.RangoFin);

                if (!string.Equals(prefixInicio, prefixFin, StringComparison.Ordinal))
                    throw new InvalidOperationException("El rango inicio y fin deben compartir el mismo prefijo");

                var siguiente = config.SiguienteCorrelativo ?? correlativoInicio;
                if (siguiente < correlativoInicio)
                    siguiente = correlativoInicio;

                if (siguiente > correlativoFin)
                    throw new InvalidOperationException("Se alcanzo el limite del rango autorizado por SAR");

                var numeroFactura = $"{prefixInicio}{siguiente:00000000}";

                config.SiguienteCorrelativo = siguiente + 1;
                SaveConfig(contentRootPath, idSucursal, config);

                return new FacturaEmitidaDto
                {
                    NumeroFactura = numeroFactura,
                    Cai = config.Cai,
                    FechaLimiteEmision = config.FechaLimiteEmision
                };
            }
        }

        public static void ValidarConfiguracion(FacturacionSarConfigDto config)
        {
            if (!config.HabilitadoCai)
                return;

            if (string.IsNullOrWhiteSpace(config.Cai))
                throw new InvalidOperationException("El CAI es requerido cuando esta habilitado");

            if (!Regex.IsMatch(config.Cai.Trim(), @"^[A-Za-z0-9\-]{14,64}$"))
                throw new InvalidOperationException("Formato de CAI invalido");

            if (string.IsNullOrWhiteSpace(config.RangoInicio) || string.IsNullOrWhiteSpace(config.RangoFin))
                throw new InvalidOperationException("Debe ingresar rango de facturacion");

            var (prefixInicio, correlativoInicio) = ParseRango(config.RangoInicio);
            var (prefixFin, correlativoFin) = ParseRango(config.RangoFin);

            if (!string.Equals(prefixInicio, prefixFin, StringComparison.Ordinal))
                throw new InvalidOperationException("El rango inicio y fin deben compartir el mismo prefijo");

            if (correlativoFin < correlativoInicio)
                throw new InvalidOperationException("El rango fin no puede ser menor al rango inicio");

            if (config.SiguienteCorrelativo.HasValue &&
                (config.SiguienteCorrelativo.Value < correlativoInicio || config.SiguienteCorrelativo.Value > correlativoFin))
            {
                throw new InvalidOperationException("Siguiente correlativo fuera de rango");
            }
        }

        public static int CalcularFacturasRestantes(FacturacionSarConfigDto config)
        {
            if (!config.HabilitadoCai)
                return 0;

            try
            {
                var (_, correlativoInicio) = ParseRango(config.RangoInicio);
                var (_, correlativoFin) = ParseRango(config.RangoFin);
                var siguiente = config.SiguienteCorrelativo ?? correlativoInicio;
                if (siguiente < correlativoInicio)
                    siguiente = correlativoInicio;

                var restantes = correlativoFin - siguiente + 1;
                return restantes < 0 ? 0 : restantes;
            }
            catch
            {
                return 0;
            }
        }

        private static FacturacionSarConfigDto Clone(FacturacionSarConfigDto source)
        {
            return new FacturacionSarConfigDto
            {
                IdSucursal = source.IdSucursal,
                HabilitadoCai = source.HabilitadoCai,
                Cai = source.Cai,
                RangoInicio = source.RangoInicio,
                RangoFin = source.RangoFin,
                SiguienteCorrelativo = source.SiguienteCorrelativo,
                FechaLimiteEmision = source.FechaLimiteEmision,
                LeyendaSar = source.LeyendaSar,
                PermitirVentaSinFactura = source.PermitirVentaSinFactura
            };
        }

        private static void AplicarMetricas(FacturacionSarConfigDto config)
        {
            if (!config.HabilitadoCai)
            {
                config.CorrelativoInicio = null;
                config.CorrelativoFin = null;
                config.CorrelativoActual = null;
                config.FacturasRestantes = 0;
                config.CaiVencido = false;
                return;
            }

            config.CaiVencido = config.FechaLimiteEmision.HasValue && config.FechaLimiteEmision.Value.Date < DateTime.Now.Date;

            try
            {
                var (_, correlativoInicio) = ParseRango(config.RangoInicio);
                var (_, correlativoFin) = ParseRango(config.RangoFin);
                var siguiente = config.SiguienteCorrelativo ?? correlativoInicio;
                if (siguiente < correlativoInicio)
                    siguiente = correlativoInicio;

                config.CorrelativoInicio = correlativoInicio;
                config.CorrelativoFin = correlativoFin;
                config.CorrelativoActual = siguiente;
                config.FacturasRestantes = CalcularFacturasRestantes(config);
            }
            catch
            {
                config.CorrelativoInicio = null;
                config.CorrelativoFin = null;
                config.CorrelativoActual = null;
                config.FacturasRestantes = 0;
            }
        }

        private static (string Prefix, int Correlativo) ParseRango(string rango)
        {
            var match = Regex.Match(rango.Trim(), @"^(\d{3}-\d{3}-\d{2}-)(\d{8})$");
            if (!match.Success)
                throw new InvalidOperationException("Formato de rango invalido. Use 000-000-00-00000000");

            var prefix = match.Groups[1].Value;
            var correlativo = int.Parse(match.Groups[2].Value);
            return (prefix, correlativo);
        }
    }
}
