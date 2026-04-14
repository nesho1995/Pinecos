using Microsoft.EntityFrameworkCore;
using Pinecos.Data;
using Pinecos.Models;

namespace Pinecos
{
    public static class CreateAdmin
    {
        public static async Task SeedAdminAsync(IServiceProvider services)
        {
            using var scope = services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<PinecosDbContext>();

            var existe = await context.Usuarios.AnyAsync(u => u.UsuarioLogin == "admin");

            if (existe)
                return;

            var admin = new Usuario
            {
                Nombre = "Administrador",
                UsuarioLogin = "admin",
                Clave = BCrypt.Net.BCrypt.HashPassword(Environment.GetEnvironmentVariable("PINECOS_ADMIN_PASSWORD") ?? "1234"),
                Rol = "ADMIN",
                Id_Sucursal = 1,
                Activo = true
            };

            context.Usuarios.Add(admin);
            await context.SaveChangesAsync();
        }
    }
}
