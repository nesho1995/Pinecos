using System.Text;

namespace Pinecos.Helpers
{
    public static class NumeroALetrasHelper
    {
        public static string ConvertirLempiras(decimal monto)
        {
            if (monto < 0)
                monto = Math.Abs(monto);

            var parteEntera = (long)Math.Floor(monto);
            var centavos = (int)Math.Round((monto - parteEntera) * 100, MidpointRounding.AwayFromZero);
            if (centavos == 100)
            {
                parteEntera += 1;
                centavos = 0;
            }

            var letrasEntero = ConvertirEntero(parteEntera);
            if (string.IsNullOrWhiteSpace(letrasEntero))
                letrasEntero = "CERO";

            var moneda = parteEntera == 1 ? "LEMPIRA" : "LEMPIRAS";
            return $"{letrasEntero} {moneda} CON {centavos:00}/100";
        }

        private static string ConvertirEntero(long numero)
        {
            if (numero == 0) return "CERO";
            if (numero < 0) return $"MENOS {ConvertirEntero(Math.Abs(numero))}";
            if (numero <= 29) return Unidades(numero);
            if (numero < 100) return Decenas(numero);
            if (numero < 1000) return Centenas(numero);
            if (numero < 1000000) return Miles(numero);
            if (numero < 1000000000000) return Millones(numero);
            return numero.ToString();
        }

        private static string Unidades(long numero) =>
            numero switch
            {
                0 => "CERO",
                1 => "UN",
                2 => "DOS",
                3 => "TRES",
                4 => "CUATRO",
                5 => "CINCO",
                6 => "SEIS",
                7 => "SIETE",
                8 => "OCHO",
                9 => "NUEVE",
                10 => "DIEZ",
                11 => "ONCE",
                12 => "DOCE",
                13 => "TRECE",
                14 => "CATORCE",
                15 => "QUINCE",
                16 => "DIECISEIS",
                17 => "DIECISIETE",
                18 => "DIECIOCHO",
                19 => "DIECINUEVE",
                20 => "VEINTE",
                21 => "VEINTIUN",
                22 => "VEINTIDOS",
                23 => "VEINTITRES",
                24 => "VEINTICUATRO",
                25 => "VEINTICINCO",
                26 => "VEINTISEIS",
                27 => "VEINTISIETE",
                28 => "VEINTIOCHO",
                29 => "VEINTINUEVE",
                _ => string.Empty
            };

        private static string Decenas(long numero)
        {
            if (numero <= 29) return Unidades(numero);

            var decena = numero / 10;
            var unidad = numero % 10;
            var baseDecena = decena switch
            {
                3 => "TREINTA",
                4 => "CUARENTA",
                5 => "CINCUENTA",
                6 => "SESENTA",
                7 => "SETENTA",
                8 => "OCHENTA",
                9 => "NOVENTA",
                _ => string.Empty
            };

            if (unidad == 0) return baseDecena;
            return $"{baseDecena} Y {Unidades(unidad)}";
        }

        private static string Centenas(long numero)
        {
            if (numero < 100) return Decenas(numero);
            if (numero == 100) return "CIEN";

            var centena = numero / 100;
            var resto = numero % 100;

            var baseCentena = centena switch
            {
                1 => "CIENTO",
                2 => "DOSCIENTOS",
                3 => "TRESCIENTOS",
                4 => "CUATROCIENTOS",
                5 => "QUINIENTOS",
                6 => "SEISCIENTOS",
                7 => "SETECIENTOS",
                8 => "OCHOCIENTOS",
                9 => "NOVECIENTOS",
                _ => string.Empty
            };

            if (resto == 0) return baseCentena;
            return $"{baseCentena} {ConvertirEntero(resto)}";
        }

        private static string Miles(long numero)
        {
            var miles = numero / 1000;
            var resto = numero % 1000;

            var sb = new StringBuilder();
            if (miles == 1)
                sb.Append("MIL");
            else
                sb.Append($"{ConvertirEntero(miles)} MIL");

            if (resto > 0)
                sb.Append($" {ConvertirEntero(resto)}");

            return sb.ToString();
        }

        private static string Millones(long numero)
        {
            var millones = numero / 1000000;
            var resto = numero % 1000000;

            var sb = new StringBuilder();
            if (millones == 1)
                sb.Append("UN MILLON");
            else
                sb.Append($"{ConvertirEntero(millones)} MILLONES");

            if (resto > 0)
                sb.Append($" {ConvertirEntero(resto)}");

            return sb.ToString();
        }
    }
}
