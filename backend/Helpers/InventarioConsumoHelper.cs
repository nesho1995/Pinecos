using Microsoft.EntityFrameworkCore;
using Pinecos.Data;

namespace Pinecos.Helpers
{
    public class DetalleConsumoVentaInput
    {
        public int Id_Producto { get; set; }
        public int? Id_Presentacion { get; set; }
        public int Cantidad { get; set; }
        public decimal CostoFallbackUnidad { get; set; }
    }

    public class PlanConsumoVentaResult
    {
        public bool Ok { get; set; }
        public string Error { get; set; } = string.Empty;
        public Dictionary<int, decimal> ConsumoPorItem { get; set; } = new();
        public Dictionary<int, decimal> CostoPromedioPorItem { get; set; } = new();
        public Dictionary<int, decimal> CostoTotalPorDetalleIndex { get; set; } = new();
    }

    public static class InventarioConsumoHelper
    {
        private sealed class RecetaLite
        {
            public int Id_Producto { get; set; }
            public int? Id_Presentacion { get; set; }
            public int Id_Inventario_Item { get; set; }
            public decimal Cantidad_Insumo { get; set; }
        }

        public static async Task<PlanConsumoVentaResult> ConstruirPlanConsumoAsync(
            PinecosDbContext context,
            int idSucursal,
            List<DetalleConsumoVentaInput> detalles)
        {
            var result = new PlanConsumoVentaResult { Ok = false };
            if (detalles == null || detalles.Count == 0)
            {
                result.Error = "No hay detalles para calcular consumo";
                return result;
            }

            var productIds = detalles.Select(x => x.Id_Producto).Distinct().ToList();
            List<RecetaLite> recetas;
            try
            {
                recetas = await context.RecetasProductoInsumo
                    .Where(x => x.Activo && x.Id_Sucursal == idSucursal && productIds.Contains(x.Id_Producto))
                    .Select(x => new RecetaLite
                    {
                        Id_Producto = x.Id_Producto,
                        Id_Presentacion = x.Id_Presentacion,
                        Id_Inventario_Item = x.Id_Inventario_Item,
                        Cantidad_Insumo = x.Cantidad_Insumo
                    })
                    .ToListAsync();
            }
            catch
            {
                // Compatibilidad mientras la migracion de recetas no se haya aplicado.
                recetas = new List<RecetaLite>();
            }

            var consumoPorItem = new Dictionary<int, decimal>();
            var costoTotalPorDetalle = new Dictionary<int, decimal>();

            for (var i = 0; i < detalles.Count; i++)
            {
                var d = detalles[i];
                var recetasProducto = recetas.Where(x => x.Id_Producto == d.Id_Producto).ToList();
                var recetasEspecificas = recetasProducto.Where(x => x.Id_Presentacion == d.Id_Presentacion).ToList();
                var recetasGenerales = recetasProducto.Where(x => x.Id_Presentacion == null).ToList();

                var aplicables = recetasEspecificas.Count > 0 ? recetasEspecificas : recetasGenerales;
                if (aplicables.Count == 0)
                {
                    costoTotalPorDetalle[i] = d.Cantidad * d.CostoFallbackUnidad;
                    continue;
                }

                foreach (var r in aplicables)
                {
                    var qty = d.Cantidad * r.Cantidad_Insumo;
                    if (qty <= 0) continue;
                    var idItem = r.Id_Inventario_Item;
                    consumoPorItem[idItem] = (consumoPorItem.TryGetValue(idItem, out var ac) ? ac : 0m) + qty;
                }
            }

            var itemIds = consumoPorItem.Keys.ToList();
            if (itemIds.Count == 0)
            {
                // No hay receta aplicada: costos por fallback.
                for (var i = 0; i < detalles.Count; i++)
                {
                    if (!costoTotalPorDetalle.ContainsKey(i))
                        costoTotalPorDetalle[i] = detalles[i].Cantidad * detalles[i].CostoFallbackUnidad;
                }

                result.Ok = true;
                result.CostoTotalPorDetalleIndex = costoTotalPorDetalle;
                return result;
            }

            var items = await context.InventarioItems
                .Where(x => itemIds.Contains(x.Id_Inventario_Item) && x.Activo && x.Id_Sucursal == idSucursal)
                .Select(x => new
                {
                    x.Id_Inventario_Item,
                    x.Stock_Inicial,
                    x.Costo_Referencia
                })
                .ToListAsync();
            if (items.Count != itemIds.Count)
            {
                result.Error = "Uno o mas insumos de receta no existen/inactivos o no pertenecen a la sucursal";
                return result;
            }

            var movimientos = await context.MovimientosInventario
                .Where(x => itemIds.Contains(x.Id_Inventario_Item))
                .OrderBy(x => x.Id_Inventario_Item)
                .ThenBy(x => x.Fecha)
                .ThenBy(x => x.Id_Movimiento_Inventario)
                .Select(x => new
                {
                    x.Id_Inventario_Item,
                    x.Tipo,
                    x.Cantidad,
                    x.Costo_Unitario
                })
                .ToListAsync();

            var costoPromedioPorItem = new Dictionary<int, decimal>();
            var stockPorItem = new Dictionary<int, decimal>();

            foreach (var item in items)
            {
                var qty = item.Stock_Inicial;
                var avg = item.Costo_Referencia < 0 ? 0m : item.Costo_Referencia;
                var itemMovs = movimientos.Where(m => m.Id_Inventario_Item == item.Id_Inventario_Item).ToList();

                foreach (var m in itemMovs)
                {
                    var tipo = InventarioHelper.NormalizarTipo(m.Tipo);
                    var signo = InventarioHelper.SignoTipo(tipo);
                    if (signo > 0)
                    {
                        var totalPrev = qty * avg;
                        var totalIn = m.Cantidad * (m.Costo_Unitario < 0 ? 0m : m.Costo_Unitario);
                        qty += m.Cantidad;
                        avg = qty > 0 ? (totalPrev + totalIn) / qty : avg;
                    }
                    else if (signo < 0)
                    {
                        qty -= m.Cantidad;
                    }
                }

                if (qty < 0) qty = 0;
                if (avg < 0) avg = 0;

                stockPorItem[item.Id_Inventario_Item] = qty;
                costoPromedioPorItem[item.Id_Inventario_Item] = avg;
            }

            foreach (var kv in consumoPorItem)
            {
                var stock = stockPorItem.TryGetValue(kv.Key, out var st) ? st : 0m;
                if (stock < kv.Value)
                {
                    result.Error = $"Stock insuficiente para insumo #{kv.Key}. Disponible: {stock:N3}, requerido: {kv.Value:N3}";
                    return result;
                }
            }

            for (var i = 0; i < detalles.Count; i++)
            {
                var d = detalles[i];
                var recetasProducto = recetas.Where(x => x.Id_Producto == d.Id_Producto).ToList();
                var recetasEspecificas = recetasProducto.Where(x => x.Id_Presentacion == d.Id_Presentacion).ToList();
                var recetasGenerales = recetasProducto.Where(x => x.Id_Presentacion == null).ToList();
                var aplicables = recetasEspecificas.Count > 0 ? recetasEspecificas : recetasGenerales;

                if (aplicables.Count == 0)
                {
                    costoTotalPorDetalle[i] = d.Cantidad * d.CostoFallbackUnidad;
                    continue;
                }

                decimal costoTotal = 0m;
                foreach (var r in aplicables)
                {
                    var qty = d.Cantidad * r.Cantidad_Insumo;
                    var idItem = r.Id_Inventario_Item;
                    var avg = costoPromedioPorItem.TryGetValue(idItem, out var c) ? c : 0m;
                    costoTotal += qty * avg;
                }
                costoTotalPorDetalle[i] = costoTotal;
            }

            result.Ok = true;
            result.ConsumoPorItem = consumoPorItem;
            result.CostoPromedioPorItem = costoPromedioPorItem;
            result.CostoTotalPorDetalleIndex = costoTotalPorDetalle;
            return result;
        }
    }
}
