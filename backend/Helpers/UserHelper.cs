using System.Security.Claims;

namespace Pinecos.Helpers
{
    public static class UserHelper
    {
        public static int? GetUserId(ClaimsPrincipal user)
        {
            var value = user.FindFirst("id_usuario")?.Value;
            return int.TryParse(value, out int id) ? id : null;
        }

        public static string GetUserName(ClaimsPrincipal user)
        {
            return user.FindFirst("usuario")?.Value ?? string.Empty;
        }

        public static string GetUserRole(ClaimsPrincipal user)
        {
            return user.FindFirst("rol")?.Value ?? string.Empty;
        }

        public static int? GetSucursalId(ClaimsPrincipal user)
        {
            var value = user.FindFirst("id_sucursal")?.Value;
            return int.TryParse(value, out int id) ? id : null;
        }
    }
}