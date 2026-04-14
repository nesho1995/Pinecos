using System.Text.Json;
using Pinecos.DTOs;

namespace Pinecos.Helpers
{
    public static class AjustesVentaStore
    {
        private static readonly object Sync = new();

        private class StoreData
        {
            public Dictionary<int, AjustesVentaSucursalDto> ConfigPorSucursal { get; set; } = new();
        }

        private static string GetFilePath(string contentRootPath)
        {
            var folder = Path.Combine(contentRootPath, "App_Data");
            Directory.CreateDirectory(folder);
            return Path.Combine(folder, "ajustes_venta.json");
        }

        private static StoreData LoadData(string contentRootPath)
        {
            lock (Sync)
            {
                var filePath = GetFilePath(contentRootPath);
                if (!File.Exists(filePath))
                    return new StoreData();

                var json = File.ReadAllText(filePath);
                var data = JsonSerializer.Deserialize<StoreData>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                return data ?? new StoreData();
            }
        }

        private static void SaveData(string contentRootPath, StoreData data)
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

        private static List<OpcionAjusteVentaDto> GetDescuentosDefault()
        {
            return new List<OpcionAjusteVentaDto>
            {
                new() { Codigo = "NINGUNO", Nombre = "Sin descuento", TipoCalculo = "NINGUNO", Valor = 0, Activo = true },
                new() { Codigo = "PORC_5", Nombre = "5% descuento", TipoCalculo = "PORCENTAJE", Valor = 5, Activo = true },
                new() { Codigo = "PORC_10", Nombre = "10% descuento", TipoCalculo = "PORCENTAJE", Valor = 10, Activo = true },
                new() { Codigo = "PORC_15", Nombre = "15% descuento", TipoCalculo = "PORCENTAJE", Valor = 15, Activo = true },
                new() { Codigo = "MANUAL", Nombre = "Manual (L)", TipoCalculo = "MONTO", Valor = 0, PermiteEditarMonto = true, Activo = true }
            };
        }

        private static List<OpcionAjusteVentaDto> GetImpuestosDefault()
        {
            return new List<OpcionAjusteVentaDto>
            {
                new() { Codigo = "INCLUIDO_15", Nombre = "Incluido en precio (15%)", TipoCalculo = "INCLUIDO_PORCENTAJE", Valor = 15, Activo = true },
                new() { Codigo = "EXENTO", Nombre = "Exento (0%)", TipoCalculo = "NINGUNO", Valor = 0, Activo = true },
                new() { Codigo = "AGREGAR_15", Nombre = "Agregar 15%", TipoCalculo = "PORCENTAJE", Valor = 15, Activo = true },
                new() { Codigo = "MANUAL", Nombre = "Manual (L)", TipoCalculo = "MONTO", Valor = 0, PermiteEditarMonto = true, Activo = true }
            };
        }

        public static AjustesVentaSucursalDto GetConfig(string contentRootPath, int idSucursal)
        {
            lock (Sync)
            {
                var data = LoadData(contentRootPath);
                if (data.ConfigPorSucursal.TryGetValue(idSucursal, out var cfg))
                {
                    cfg.IdSucursal = idSucursal;
                    return Sanitize(cfg);
                }

                return new AjustesVentaSucursalDto
                {
                    IdSucursal = idSucursal,
                    Descuentos = GetDescuentosDefault(),
                    Impuestos = GetImpuestosDefault()
                };
            }
        }

        public static void SaveConfig(string contentRootPath, int idSucursal, AjustesVentaSucursalDto config)
        {
            lock (Sync)
            {
                var data = LoadData(contentRootPath);
                config.IdSucursal = idSucursal;
                data.ConfigPorSucursal[idSucursal] = Sanitize(config);
                SaveData(contentRootPath, data);
            }
        }

        public static AjustesVentaSucursalDto Sanitize(AjustesVentaSucursalDto config)
        {
            List<OpcionAjusteVentaDto> Normalize(IEnumerable<OpcionAjusteVentaDto>? source, IEnumerable<OpcionAjusteVentaDto> fallback)
            {
                var list = (source ?? fallback)
                    .Where(x => !string.IsNullOrWhiteSpace(x.Codigo) && !string.IsNullOrWhiteSpace(x.Nombre))
                    .Select(x => new OpcionAjusteVentaDto
                    {
                        Codigo = x.Codigo.Trim().ToUpperInvariant(),
                        Nombre = x.Nombre.Trim(),
                        TipoCalculo = (x.TipoCalculo ?? "NINGUNO").Trim().ToUpperInvariant(),
                        Valor = x.Valor < 0 ? 0 : x.Valor,
                        PermiteEditarMonto = x.PermiteEditarMonto,
                        Activo = x.Activo
                    })
                    .GroupBy(x => x.Codigo, StringComparer.OrdinalIgnoreCase)
                    .Select(g => g.First())
                    .ToList();

                if (!list.Any())
                    return fallback.ToList();

                return list;
            }

            return new AjustesVentaSucursalDto
            {
                IdSucursal = config.IdSucursal,
                Descuentos = Normalize(config.Descuentos, GetDescuentosDefault()),
                Impuestos = Normalize(config.Impuestos, GetImpuestosDefault())
            };
        }
    }
}
