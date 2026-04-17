namespace Pinecos.Helpers
{
    public static class InventarioHelper
    {
        public static string NormalizarTipo(string? tipo)
        {
            var t = (tipo ?? string.Empty).Trim().ToUpperInvariant();
            return t switch
            {
                "ENTRADA" => "ENTRADA",
                "SALIDA" => "SALIDA",
                "AJUSTE_POSITIVO" => "AJUSTE_POSITIVO",
                "AJUSTE_NEGATIVO" => "AJUSTE_NEGATIVO",
                "COMPRA" => "COMPRA",
                _ => string.Empty
            };
        }

        public static decimal SignoTipo(string tipoNormalizado)
        {
            return tipoNormalizado switch
            {
                "ENTRADA" => 1m,
                "AJUSTE_POSITIVO" => 1m,
                "COMPRA" => 1m,
                "SALIDA" => -1m,
                "AJUSTE_NEGATIVO" => -1m,
                _ => 0m
            };
        }

        public static decimal CalcularStockActual(decimal stockInicial, IEnumerable<(string Tipo, decimal Cantidad)> movimientos)
        {
            var delta = movimientos.Sum(m => SignoTipo(NormalizarTipo(m.Tipo)) * m.Cantidad);
            return stockInicial + delta;
        }
    }
}
