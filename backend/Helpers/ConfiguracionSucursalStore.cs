using System.Text.Json;
using Pinecos.DTOs;
using Pinecos.Models;

namespace Pinecos.Helpers
{
    public static class ConfiguracionSucursalStore
    {
        private static readonly object Sync = new();

        private class StoreData
        {
            public Dictionary<int, ConfiguracionSucursalDto> ConfigPorSucursal { get; set; } = new();
        }

        private static string GetFilePath(string contentRootPath)
        {
            var folder = Path.Combine(contentRootPath, "App_Data");
            Directory.CreateDirectory(folder);
            return Path.Combine(folder, "configuracion_sucursal.json");
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

        public static ConfiguracionSucursalDto ToDto(ConfiguracionNegocio config, int idSucursal)
        {
            return new ConfiguracionSucursalDto
            {
                IdSucursal = idSucursal,
                Nombre_Negocio = config.Nombre_Negocio ?? string.Empty,
                Direccion = config.Direccion ?? string.Empty,
                Telefono = config.Telefono ?? string.Empty,
                Rtn = config.Rtn ?? string.Empty,
                Mensaje_Ticket = config.Mensaje_Ticket ?? string.Empty,
                Ancho_Ticket = string.IsNullOrWhiteSpace(config.Ancho_Ticket) ? "80mm" : config.Ancho_Ticket,
                Logo_Url = config.Logo_Url ?? string.Empty,
                Moneda = string.IsNullOrWhiteSpace(config.Moneda) ? "L" : config.Moneda,
                Activo = config.Activo
            };
        }

        public static ConfiguracionNegocio Merge(ConfiguracionNegocio baseConfig, ConfiguracionSucursalDto? overrideConfig)
        {
            if (overrideConfig == null)
                return baseConfig;

            baseConfig.Nombre_Negocio = overrideConfig.Nombre_Negocio ?? string.Empty;
            baseConfig.Direccion = overrideConfig.Direccion ?? string.Empty;
            baseConfig.Telefono = overrideConfig.Telefono ?? string.Empty;
            baseConfig.Rtn = overrideConfig.Rtn ?? string.Empty;
            baseConfig.Mensaje_Ticket = overrideConfig.Mensaje_Ticket ?? string.Empty;
            baseConfig.Ancho_Ticket = string.IsNullOrWhiteSpace(overrideConfig.Ancho_Ticket) ? "80mm" : overrideConfig.Ancho_Ticket;
            baseConfig.Logo_Url = overrideConfig.Logo_Url ?? string.Empty;
            baseConfig.Moneda = string.IsNullOrWhiteSpace(overrideConfig.Moneda) ? "L" : overrideConfig.Moneda;
            baseConfig.Activo = overrideConfig.Activo;

            return baseConfig;
        }

        public static ConfiguracionSucursalDto? GetOverride(string contentRootPath, int idSucursal)
        {
            lock (Sync)
            {
                var data = LoadData(contentRootPath);
                if (data.ConfigPorSucursal.TryGetValue(idSucursal, out var cfg))
                    return Sanitize(cfg, idSucursal);
                return null;
            }
        }

        public static ConfiguracionNegocio GetMergedConfig(string contentRootPath, int idSucursal, ConfiguracionNegocio baseConfig)
        {
            var clone = new ConfiguracionNegocio
            {
                Id_Configuracion = baseConfig.Id_Configuracion,
                Nombre_Negocio = baseConfig.Nombre_Negocio,
                Direccion = baseConfig.Direccion,
                Telefono = baseConfig.Telefono,
                Rtn = baseConfig.Rtn,
                Mensaje_Ticket = baseConfig.Mensaje_Ticket,
                Ancho_Ticket = baseConfig.Ancho_Ticket,
                Logo_Url = baseConfig.Logo_Url,
                Moneda = baseConfig.Moneda,
                Activo = baseConfig.Activo
            };

            var overrideConfig = GetOverride(contentRootPath, idSucursal);
            return Merge(clone, overrideConfig);
        }

        public static void SaveOverride(string contentRootPath, int idSucursal, ConfiguracionSucursalDto config)
        {
            lock (Sync)
            {
                var data = LoadData(contentRootPath);
                data.ConfigPorSucursal[idSucursal] = Sanitize(config, idSucursal);
                SaveData(contentRootPath, data);
            }
        }

        private static ConfiguracionSucursalDto Sanitize(ConfiguracionSucursalDto config, int idSucursal)
        {
            return new ConfiguracionSucursalDto
            {
                IdSucursal = idSucursal,
                Nombre_Negocio = (config.Nombre_Negocio ?? string.Empty).Trim(),
                Direccion = (config.Direccion ?? string.Empty).Trim(),
                Telefono = (config.Telefono ?? string.Empty).Trim(),
                Rtn = (config.Rtn ?? string.Empty).Trim(),
                Mensaje_Ticket = (config.Mensaje_Ticket ?? string.Empty).Trim(),
                Ancho_Ticket = string.IsNullOrWhiteSpace(config.Ancho_Ticket) ? "80mm" : config.Ancho_Ticket.Trim(),
                Logo_Url = (config.Logo_Url ?? string.Empty).Trim(),
                Moneda = string.IsNullOrWhiteSpace(config.Moneda) ? "L" : config.Moneda.Trim(),
                Activo = config.Activo
            };
        }
    }
}
