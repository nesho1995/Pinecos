using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Pinecos;
using Pinecos.Data;
using System.Diagnostics;
using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.ConfigureKestrel(options =>
{
    // Permite importacion de Excel de productos (multipart) hasta 10 MB; el middleware sigue limitando el resto de /api a 1 MB salvo rutas de importacion.
    options.Limits.MaxRequestBodySize = 10_485_760;
});

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
                      ?? throw new Exception("DefaultConnection no esta configurado");
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();

builder.Services.AddDbContext<PinecosDbContext>(options =>
    options.UseMySql(
        connectionString,
        ServerVersion.AutoDetect(connectionString)
    )
);

var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new Exception("Jwt:Key no esta configurado");
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? throw new Exception("Jwt:Issuer no esta configurado");
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? throw new Exception("Jwt:Audience no esta configurado");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = async context =>
        {
            var userIdClaim = context.Principal?.FindFirst("id_usuario")?.Value;
            if (!int.TryParse(userIdClaim, out var userId))
            {
                context.Fail("Token invalido");
                return;
            }

            var db = context.HttpContext.RequestServices.GetRequiredService<PinecosDbContext>();
            var usuarioDb = await db.Usuarios
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id_Usuario == userId);

            if (usuarioDb == null || !usuarioDb.Activo)
            {
                context.Fail("Sesion invalida");
                return;
            }

            var rolDb = (usuarioDb.Rol ?? string.Empty).Trim();
            var rolDbUpper = rolDb.ToUpperInvariant();
            var rolToken = (context.Principal?.FindFirst("rol")?.Value ?? string.Empty).Trim();
            if (!string.Equals(rolDb, rolToken, StringComparison.OrdinalIgnoreCase))
            {
                context.Fail("Sesion invalida");
                return;
            }

            var sucursalToken = context.Principal?.FindFirst("id_sucursal")?.Value ?? string.Empty;
            var sucursalDb = usuarioDb.Id_Sucursal?.ToString() ?? string.Empty;
            if (!string.Equals(sucursalToken, sucursalDb, StringComparison.Ordinal))
            {
                context.Fail("Sesion invalida");
                return;
            }

            // Refuerza compatibilidad de autorizacion por rol para tokens antiguos
            // con valor de rol no normalizado (ejemplo: "Cajero" vs "CAJERO").
            if (context.Principal?.Identity is ClaimsIdentity identity)
            {
                if (!context.Principal.HasClaim(c => c.Type == "rol" && string.Equals(c.Value, rolDbUpper, StringComparison.OrdinalIgnoreCase)))
                    identity.AddClaim(new Claim("rol", rolDbUpper));

                if (!context.Principal.HasClaim(c => c.Type == ClaimTypes.Role && string.Equals(c.Value, rolDbUpper, StringComparison.OrdinalIgnoreCase)))
                    identity.AddClaim(new Claim(ClaimTypes.Role, rolDbUpper));

                if (!context.Principal.HasClaim(c => c.Type == "id_sucursal" && string.Equals(c.Value, sucursalDb, StringComparison.Ordinal)))
                    identity.AddClaim(new Claim("id_sucursal", sucursalDb));
            }
        }
    };
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("PinecosCors", policy =>
    {
        if (allowedOrigins.Length == 0)
        {
            policy
                .WithOrigins("http://localhost:5173", "http://localhost:4173")
                .AllowAnyHeader()
                .AllowAnyMethod();
            return;
        }

        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddMemoryCache();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        var traceId = Activity.Current?.Id ?? context.HttpContext.TraceIdentifier;
        await context.HttpContext.Response.WriteAsJsonAsync(
            new
            {
                code = "RATE_LIMITED",
                message = "Demasiadas solicitudes. Intenta de nuevo en unos segundos.",
                traceId
            },
            cancellationToken: token);
    };

    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
    {
        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetSlidingWindowLimiter(ip, _ => new SlidingWindowRateLimiterOptions
        {
            PermitLimit = 180,
            Window = TimeSpan.FromMinutes(1),
            SegmentsPerWindow = 6,
            QueueLimit = 0,
            AutoReplenishment = true
        });
    });

    options.AddPolicy("auth-login", httpContext =>
    {
        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 8,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
            AutoReplenishment = true
        });
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";
        var traceId = Activity.Current?.Id ?? context.TraceIdentifier;
        await context.Response.WriteAsJsonAsync(new
        {
            code = "INTERNAL_SERVER_ERROR",
            message = "Error interno del servidor",
            traceId
        });
    });
});

app.UseCors("PinecosCors");
app.UseRateLimiter();
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase))
    {
        var path = context.Request.Path.Value ?? string.Empty;
        var esImportProductos = path.Contains("/Productos/excel/importar", StringComparison.OrdinalIgnoreCase);
        var limite = esImportProductos ? 10_485_760L : 1_048_576L;
        var length = context.Request.ContentLength;
        if (length.HasValue && length.Value > limite)
        {
            context.Response.StatusCode = StatusCodes.Status413PayloadTooLarge;
            context.Response.ContentType = "application/json";
            var mb = limite / 1_048_576.0;
            var traceId = Activity.Current?.Id ?? context.TraceIdentifier;
            await context.Response.WriteAsJsonAsync(new
            {
                code = "PAYLOAD_TOO_LARGE",
                message = $"El tamano del request excede el limite permitido ({mb:0.#} MB).",
                traceId
            });
            return;
        }
    }

    await next();
});

app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase))
    {
        context.Response.Headers.CacheControl = "no-store, no-cache, must-revalidate";
        context.Response.Headers.Pragma = "no-cache";
        context.Response.Headers.Expires = "0";
    }

    context.Response.Headers.XContentTypeOptions = "nosniff";
    context.Response.Headers.XFrameOptions = "DENY";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
    context.Response.Headers["X-Permitted-Cross-Domain-Policies"] = "none";

    if (!app.Environment.IsDevelopment())
        context.Response.Headers.StrictTransportSecurity = "max-age=31536000; includeSubDomains";

    if (!context.Request.Path.StartsWithSegments("/swagger", StringComparison.OrdinalIgnoreCase))
        context.Response.Headers.ContentSecurityPolicy = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'";

    await next();
});

await CreateAdmin.SeedAdminAsync(app.Services);

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
