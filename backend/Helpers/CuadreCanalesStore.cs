using System.Text.Json;
using Pinecos.DTOs;

namespace Pinecos.Helpers
{
    public static class CuadreCanalesStore
    {
        private static readonly object Sync = new();

        private class StoreData
        {
            public Dictionary<int, CuadreCanalesConfigDto> ConfigPorSucursal { get; set; } = new();
        }

        private static string GetFilePath(string contentRootPath)
        {
            var folder = Path.Combine(contentRootPath, "App_Data");
            Directory.CreateDirectory(folder);
            return Path.Combine(folder, "cuadre_canales.json");
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

        public static CuadreCanalesConfigDto GetConfig(string contentRootPath, int idSucursal)
        {
            lock (Sync)
            {
                var data = LoadData(contentRootPath);
                if (data.ConfigPorSucursal.TryGetValue(idSucursal, out var cfg))
                {
                    cfg.IdSucursal = idSucursal;
                    return Sanitize(cfg);
                }

                return new CuadreCanalesConfigDto
                {
                    IdSucursal = idSucursal,
                    Pos = new List<string> { "POS 1" },
                    Delivery = new List<string> { "PEDIDOS_YA" },
                    RequiereMontoEnTodos = true
                };
            }
        }

        public static void SaveConfig(string contentRootPath, int idSucursal, CuadreCanalesConfigDto config)
        {
            lock (Sync)
            {
                var data = LoadData(contentRootPath);
                config.IdSucursal = idSucursal;
                data.ConfigPorSucursal[idSucursal] = Sanitize(config);
                SaveData(contentRootPath, data);
            }
        }

        public static CuadreCanalesConfigDto Sanitize(CuadreCanalesConfigDto config)
        {
            var pos = (config.Pos ?? new List<string>())
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            var delivery = (config.Delivery ?? new List<string>())
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (pos.Count == 0) pos.Add("POS 1");
            if (delivery.Count == 0) delivery.Add("PEDIDOS_YA");

            return new CuadreCanalesConfigDto
            {
                IdSucursal = config.IdSucursal,
                Pos = pos,
                Delivery = delivery,
                RequiereMontoEnTodos = config.RequiereMontoEnTodos
            };
        }
    }
}
