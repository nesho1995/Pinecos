using System.Text.RegularExpressions;

namespace Pinecos.Helpers
{
    public static partial class SecurityValidationHelper
    {
        private static readonly HashSet<string> RolesPermitidos = new(StringComparer.OrdinalIgnoreCase)
        {
            "ADMIN",
            "CAJERO",
            "SUPERVISOR"
        };

        [GeneratedRegex("^[a-zA-Z0-9._-]{4,40}$", RegexOptions.Compiled)]
        private static partial Regex UsuarioRegex();

        public static string NormalizeRol(string? rol)
        {
            return (rol ?? string.Empty).Trim().ToUpperInvariant();
        }

        public static bool EsRolValido(string? rol)
        {
            return RolesPermitidos.Contains(NormalizeRol(rol));
        }

        public static bool EsUsuarioLoginValido(string? usuarioLogin)
        {
            var value = (usuarioLogin ?? string.Empty).Trim();
            return UsuarioRegex().IsMatch(value);
        }

        public static bool EsNombreValido(string? nombre)
        {
            var value = (nombre ?? string.Empty).Trim();
            return value.Length is >= 3 and <= 120;
        }

        public static bool EsClaveFuerte(string? clave)
        {
            var value = clave ?? string.Empty;
            if (value.Length < 8 || value.Length > 128) return false;
            if (!value.Any(char.IsUpper)) return false;
            if (!value.Any(char.IsLower)) return false;
            if (!value.Any(char.IsDigit)) return false;
            if (!value.Any(ch => !char.IsLetterOrDigit(ch))) return false;
            return true;
        }
    }
}
