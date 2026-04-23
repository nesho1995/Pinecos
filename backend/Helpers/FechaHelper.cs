namespace Pinecos.Helpers
{
    public static class FechaHelper
    {
        private static readonly TimeZoneInfo HondurasTimeZone = ResolverZonaHoraria();

        private static TimeZoneInfo ResolverZonaHoraria()
        {
            var ids = new[]
            {
                "America/Tegucigalpa",            // Linux
                "Central America Standard Time"   // Windows
            };

            foreach (var id in ids)
            {
                try
                {
                    return TimeZoneInfo.FindSystemTimeZoneById(id);
                }
                catch (TimeZoneNotFoundException)
                {
                }
                catch (InvalidTimeZoneException)
                {
                }
            }

            return TimeZoneInfo.Utc;
        }

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