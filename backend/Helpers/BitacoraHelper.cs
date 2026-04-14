using Pinecos.Data;
using Pinecos.Models;

namespace Pinecos.Helpers
{
    public static class BitacoraHelper
    {
        public static async Task RegistrarAsync(PinecosDbContext context, int? idUsuario, string modulo, string accion, string detalle)
        {
            var bitacora = new Bitacora
            {
                Fecha = FechaHelper.AhoraHonduras(),
                Id_Usuario = idUsuario,
                Modulo = modulo,
                Accion = accion,
                Detalle = detalle
            };

            context.Bitacora.Add(bitacora);
            await context.SaveChangesAsync();
        }
    }
}