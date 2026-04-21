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

            var adminPassword = Environment.GetEnvironmentVariable("PINECOS_ADMIN_PASSWORD");
            if (string.IsNullOrWhiteSpace(adminPassword))
                throw new InvalidOperationException("PINECOS_ADMIN_PASSWORD no esta configurado. No se puede crear el usuario admin.");

            var admin = new Usuario
            {
                Nombre = "Administrador",
                UsuarioLogin = "admin",
                Clave = BCrypt.Net.BCrypt.HashPassword(adminPassword),
                Rol = "ADMIN",
                Id_Sucursal = 1,
                Activo = true
            };

            context.Usuarios.Add(admin);
            await context.SaveChangesAsync();
        }
    }
}
