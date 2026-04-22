namespace Pinecos.Helpers
{
    public static class FiscalTipoHelper
    {
        public const string Gravado15 = "GRAVADO_15";
        public const string Gravado18 = "GRAVADO_18";
        public const string Exento = "EXENTO";
        public const string Exonerado = "EXONERADO";

        public static string Normalizar(string? tipo)
        {
            var t = (tipo ?? string.Empty).Trim().ToUpperInvariant();
            return t switch
            {
                Gravado15 => Gravado15,
                Gravado18 => Gravado18,
                Exento => Exento,
                Exonerado => Exonerado,
                _ => Gravado15
            };
        }
    }
}
