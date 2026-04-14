using Microsoft.EntityFrameworkCore;
using Pinecos.Data;

namespace Pinecos.Helpers
{
    public static class PreciosHelper
    {
        public static async Task<decimal?> ObtenerPrecioAsync(
            PinecosDbContext context,
            int idSucursal,
            int idProducto,
            int? idPresentacion)
        {
            if (idPresentacion.HasValue)
            {
                return await (
                    from pp in context.ProductoPresentaciones
                    join pps in context.ProductoPresentacionSucursales
                        on pp.Id_Producto_Presentacion equals pps.Id_Producto_Presentacion
                    where pp.Id_Producto == idProducto
                          && pp.Id_Presentacion == idPresentacion.Value
                          && pps.Id_Sucursal == idSucursal
                          && pps.Activo
                    select (decimal?)pps.Precio
                ).FirstOrDefaultAsync();
            }

            return await context.ProductosSucursal
                .Where(x => x.Id_Producto == idProducto && x.Id_Sucursal == idSucursal && x.Activo)
                .Select(x => (decimal?)x.Precio)
                .FirstOrDefaultAsync();
        }
    }
}
