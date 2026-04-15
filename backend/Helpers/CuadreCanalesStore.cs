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
                    MetodosPago = new List<MetodoPagoConfigDto>
                    {
                        new() { Codigo = "EFECTIVO", Nombre = "Efectivo", Categoria = "EFECTIVO", Activo = true },
                        new() { Codigo = "POS_1", Nombre = "POS 1", Categoria = "POS", Activo = true },
                        new() { Codigo = "PEDIDOS_YA", Nombre = "Pedidos Ya", Categoria = "DELIVERY", Activo = true }
                    },
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
            var normalizarCategoria = (string? categoria) =>
            {
                var c = (categoria ?? string.Empty).Trim().ToUpperInvariant();
                return c switch
                {
                    "EFECTIVO" => "EFECTIVO",
                    "POS" => "POS",
                    "DELIVERY" => "DELIVERY",
                    _ => "OTRO"
                };
            };

            var normalizarCodigo = (string? codigo) =>
            {
                var raw = (codigo ?? string.Empty).Trim().ToUpperInvariant();
                if (string.IsNullOrWhiteSpace(raw))
                    return string.Empty;
                return new string(raw.Where(char.IsLetterOrDigit).ToArray());
            };

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

            var metodos = (config.MetodosPago ?? new List<MetodoPagoConfigDto>())
                .Where(x => !string.IsNullOrWhiteSpace(x.Codigo) || !string.IsNullOrWhiteSpace(x.Nombre))
                .Select(x =>
                {
                    var nombre = string.IsNullOrWhiteSpace(x.Nombre) ? x.Codigo : x.Nombre;
                    var codigo = normalizarCodigo(x.Codigo);
                    if (string.IsNullOrWhiteSpace(codigo))
                        codigo = normalizarCodigo(nombre);

                    return new MetodoPagoConfigDto
                    {
                        Codigo = codigo,
                        Nombre = (nombre ?? string.Empty).Trim(),
                        Categoria = normalizarCategoria(x.Categoria),
                        Activo = x.Activo
                    };
                })
                .Where(x => !string.IsNullOrWhiteSpace(x.Codigo) && !string.IsNullOrWhiteSpace(x.Nombre))
                .GroupBy(x => x.Codigo, StringComparer.OrdinalIgnoreCase)
                .Select(g => g.First())
                .ToList();

            if (!metodos.Any())
            {
                metodos.Add(new MetodoPagoConfigDto { Codigo = "EFECTIVO", Nombre = "Efectivo", Categoria = "EFECTIVO", Activo = true });
                metodos.AddRange(pos.Select(p => new MetodoPagoConfigDto
                {
                    Codigo = normalizarCodigo(p),
                    Nombre = p,
                    Categoria = "POS",
                    Activo = true
                }));
                metodos.AddRange(delivery.Select(d => new MetodoPagoConfigDto
                {
                    Codigo = normalizarCodigo(d),
                    Nombre = d,
                    Categoria = "DELIVERY",
                    Activo = true
                }));
            }

            if (!metodos.Any(x => x.Categoria == "EFECTIVO"))
                metodos.Insert(0, new MetodoPagoConfigDto { Codigo = "EFECTIVO", Nombre = "Efectivo", Categoria = "EFECTIVO", Activo = true });

            pos = metodos
                .Where(x => x.Activo && x.Categoria == "POS")
                .Select(x => x.Nombre.Trim())
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            delivery = metodos
                .Where(x => x.Activo && x.Categoria == "DELIVERY")
                .Select(x => x.Nombre.Trim())
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (pos.Count == 0) pos.Add("POS 1");
            if (delivery.Count == 0) delivery.Add("PEDIDOS_YA");

            return new CuadreCanalesConfigDto
            {
                IdSucursal = config.IdSucursal,
                Pos = pos,
                Delivery = delivery,
                MetodosPago = metodos,
                RequiereMontoEnTodos = config.RequiereMontoEnTodos
            };
        }
    }
}
