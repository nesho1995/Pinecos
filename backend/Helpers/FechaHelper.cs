namespace Pinecos.Helpers
{
    public static class FechaHelper
    {
        private static readonly TimeZoneInfo HondurasTimeZone =
            TimeZoneInfo.FindSystemTimeZoneById("Central America Standard Time");

        public static DateTime AhoraHonduras()
        {
            return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, HondurasTimeZone);
        }

        public static DateTime HoyInicioHonduras()
        {
            var ahora = AhoraHonduras();
            return new DateTime(ahora.Year, ahora.Month, ahora.Day, 0, 0, 0);
        }

        public static DateTime HoyFinHonduras()
        {
            var ahora = AhoraHonduras();
            return new DateTime(ahora.Year, ahora.Month, ahora.Day, 23, 59, 59);
        }
    }
}