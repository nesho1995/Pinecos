using Microsoft.EntityFrameworkCore;
using Pinecos.Data;
using Pinecos.DTOs;
using Pinecos.Models;
using System.IO;
using System.Text.Json;

namespace Pinecos.Helpers
{
    public static class FacturacionSarCorrelativoService
    {
        private static void RegistrarReservaNoPersistida(
            string contentRootPath,
            int idSucursal,
            int? idUsuario,
            string origen,
            FacturaEmitidaDto factura,
            string error)
        {
            try
            {
                var appDataPath = Path.Combine(contentRootPath, "App_Data");
                Directory.CreateDirectory(appDataPath);
                var path = Path.Combine(appDataPath, "facturacion_sar_reservas_no_persistidas.log");
                var payload = new
                {
                    fecha = FechaHelper.AhoraHonduras().ToString("yyyy-MM-dd HH:mm:ss"),
                    idSucursal,
                    idUsuario,
                    origen = (origen ?? string.Empty).Trim().ToUpperInvariant(),
                    numeroFactura = factura.NumeroFactura,
                    cai = factura.Cai,
                    fechaLimiteEmision = factura.FechaLimiteEmision?.ToString("yyyy-MM-dd"),
                    error
                };
                File.AppendAllText(path, JsonSerializer.Serialize(payload) + Environment.NewLine);
            }
            catch
            {
                // No bloquear el flujo por fallo en log de contingencia.
            }
        }

        public static async Task<(FacturaEmitidaDto Factura, long EventoId)> ReservarAsync(
            PinecosDbContext context,
            string contentRootPath,
            int idSucursal,
            int? idUsuario,
            string origen)
        {
            var factura = FacturacionSarStore.EmitirSiguiente(contentRootPath, idSucursal);
            var ahora = FechaHelper.AhoraHonduras();
            var evento = new FacturacionSarCorrelativoEvento
            {
                Id_Sucursal = idSucursal,
                Numero_Factura = factura.NumeroFactura,
                Cai = factura.Cai,
                Fecha_Limite_Emision = factura.FechaLimiteEmision,
                Estado = "RESERVADO",
                Origen = (origen ?? string.Empty).Trim().ToUpperInvariant(),
                Id_Usuario = idUsuario,
                Fecha_Creacion = ahora,
                Fecha_Actualizacion = ahora
            };

            try
            {
                context.FacturacionSarCorrelativoEventos.Add(evento);
                await context.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                RegistrarReservaNoPersistida(
                    contentRootPath,
                    idSucursal,
                    idUsuario,
                    origen,
                    factura,
                    ex.InnerException?.Message ?? ex.Message);
                throw new InvalidOperationException(
                    $"No se pudo registrar el evento fiscal en BD ({ex.InnerException?.Message ?? ex.Message})");
            }
            catch (Exception ex)
            {
                RegistrarReservaNoPersistida(
                    contentRootPath,
                    idSucursal,
                    idUsuario,
                    origen,
                    factura,
                    ex.Message);
                throw new InvalidOperationException(
                    $"Error inesperado al registrar evento fiscal ({ex.Message})");
            }

            return (factura, evento.Id_Facturacion_Sar_Correlativo_Evento);
        }

        public static async Task MarcarEmitidoAsync(
            PinecosDbContext context,
            long eventoId,
            int idVenta)
        {
            var ahora = FechaHelper.AhoraHonduras();
            var evento = await context.FacturacionSarCorrelativoEventos
                .FirstOrDefaultAsync(x => x.Id_Facturacion_Sar_Correlativo_Evento == eventoId);

            if (evento == null) return;

            evento.Estado = "EMITIDO";
            evento.Id_Venta = idVenta;
            evento.Motivo_Fallo = string.Empty;
            evento.Fecha_Actualizacion = ahora;
            await context.SaveChangesAsync();
        }

        public static async Task MarcarFallidoAsync(
            PinecosDbContext context,
            long eventoId,
            string motivo)
        {
            var ahora = FechaHelper.AhoraHonduras();
            var evento = await context.FacturacionSarCorrelativoEventos
                .FirstOrDefaultAsync(x => x.Id_Facturacion_Sar_Correlativo_Evento == eventoId);

            if (evento == null) return;

            evento.Estado = "FALLIDO";
            evento.Motivo_Fallo = string.IsNullOrWhiteSpace(motivo)
                ? "Fallo sin detalle"
                : motivo.Trim();
            evento.Fecha_Actualizacion = ahora;
            await context.SaveChangesAsync();
        }
    }
}

