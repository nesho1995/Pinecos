using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pinecos.Attributes;
using Pinecos.Data;
using Pinecos.Helpers;
using Pinecos.Models;

namespace Pinecos.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AuthorizeRoles("ADMIN", "CAJERO")]
    public class ProductoPendientesController : ControllerBase
    {
        private readonly PinecosDbContext _context;

        public ProductoPendientesController(PinecosDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<ActionResult> CrearSolicitud([FromBody] CrearProductoPendienteRequest request)
        {
            var idUsuario = UserHelper.GetUserId(User);
            var idSucursalToken = UserHelper.GetSucursalId(User);
            if (!idUsuario.HasValue || !idSucursalToken.HasValue)
                return Unauthorized(new { message = "No se pudo validar el usuario o sucursal en sesion." });

            var nombre = (request.Nombre ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(nombre))
                return BadRequest(new { message = "El nombre del producto es requerido." });

            if (request.PrecioSugerido <= 0)
                return BadRequest(new { message = "El precio sugerido debe ser mayor a cero." });

            if (nombre.Length > 120)
                return BadRequest(new { message = "El nombre excede el maximo permitido (120)." });

            var existeProducto = await _context.Productos.AnyAsync(p =>
                p.Activo && p.Nombre.Trim().ToLower() == nombre.ToLower());
            if (existeProducto)
                return Conflict(new { message = "Ese producto ya existe en el catalogo activo." });

            var existePendiente = await _context.Set<ProductoPendiente>().AnyAsync(x =>
                x.Estado == "PENDIENTE" &&
                x.Id_Sucursal == idSucursalToken.Value &&
                x.Nombre.Trim().ToLower() == nombre.ToLower());
            if (existePendiente)
                return BadRequest(new { message = "Ya existe una solicitud pendiente con ese nombre en esta sucursal." });

            var model = new ProductoPendiente
            {
                Nombre = nombre,
                Precio_Sugerido = request.PrecioSugerido,
                Id_Sucursal = idSucursalToken.Value,
                Id_Usuario_Solicita = idUsuario.Value,
                Nota_Solicitud = string.IsNullOrWhiteSpace(request.NotaSolicitud) ? null : request.NotaSolicitud.Trim(),
                Estado = "PENDIENTE",
                Fecha_Creacion = DateTime.UtcNow
            };

            _context.Set<ProductoPendiente>().Add(model);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Solicitud enviada para revision del administrador.", data = model });
        }

        [HttpGet]
        public async Task<ActionResult> Listar(
            [FromQuery] string estado = "",
            [FromQuery] int? idSucursal = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var rol = UserHelper.GetUserRole(User);
            var idUsuario = UserHelper.GetUserId(User);
            var idSucursalToken = UserHelper.GetSucursalId(User);
            if (!idUsuario.HasValue)
                return Unauthorized(new { message = "Usuario no valido en sesion." });

            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = _context.Set<ProductoPendiente>().AsQueryable();

            var estadoNorm = (estado ?? string.Empty).Trim().ToUpperInvariant();
            if (!string.IsNullOrWhiteSpace(estadoNorm))
                query = query.Where(x => x.Estado == estadoNorm);

            if (rol == "ADMIN")
            {
                if (idSucursal.HasValue && idSucursal.Value > 0)
                    query = query.Where(x => x.Id_Sucursal == idSucursal.Value);
            }
            else
            {
                if (!idSucursalToken.HasValue)
                    return Unauthorized(new { message = "Tu usuario no tiene sucursal asignada." });
                query = query.Where(x => x.Id_Sucursal == idSucursalToken.Value);
            }

            var total = await query.CountAsync();
            var data = await (
                from p in query
                join s in _context.Sucursales on p.Id_Sucursal equals s.Id_Sucursal
                join u in _context.Usuarios on p.Id_Usuario_Solicita equals u.Id_Usuario
                join ur in _context.Usuarios on p.Id_Usuario_Revision equals ur.Id_Usuario into urj
                from rev in urj.DefaultIfEmpty()
                orderby p.Estado == "PENDIENTE" descending, p.Fecha_Creacion descending
                select new
                {
                    p.Id_Producto_Pendiente,
                    p.Nombre,
                    p.Precio_Sugerido,
                    p.Id_Sucursal,
                    sucursal = s.Nombre,
                    p.Id_Usuario_Solicita,
                    usuarioSolicita = u.Nombre,
                    p.Nota_Solicitud,
                    p.Estado,
                    p.Comentario_Revision,
                    p.Id_Usuario_Revision,
                    usuarioRevision = rev != null ? rev.Nombre : null,
                    p.Id_Producto_Creado,
                    p.Fecha_Creacion,
                    p.Fecha_Revision
                }
            )
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

            return Ok(new { total, page, pageSize, data });
        }

        [HttpPatch("{id:int}/resolver")]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> Resolver(int id, [FromBody] ResolverProductoPendienteRequest request)
        {
            var idUsuario = UserHelper.GetUserId(User);
            if (!idUsuario.HasValue)
                return Unauthorized(new { message = "Usuario no valido en sesion." });

            var model = await _context.Set<ProductoPendiente>().FirstOrDefaultAsync(x => x.Id_Producto_Pendiente == id);
            if (model == null)
                return NotFound(new { message = "Solicitud no encontrada." });
            if (model.Estado != "PENDIENTE")
                return BadRequest(new { message = "La solicitud ya fue procesada." });

            if (!request.Aprobar)
            {
                model.Estado = "RECHAZADO";
                model.Comentario_Revision = string.IsNullOrWhiteSpace(request.ComentarioRevision)
                    ? "Rechazado por administracion."
                    : request.ComentarioRevision.Trim();
                model.Id_Usuario_Revision = idUsuario.Value;
                model.Fecha_Revision = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return Ok(new { message = "Solicitud rechazada.", data = model });
            }

            if (!request.IdCategoria.HasValue || request.IdCategoria.Value <= 0)
                return BadRequest(new { message = "Selecciona una categoria para aprobar el producto." });

            var categoriaExiste = await _context.Categorias.AnyAsync(c => c.Id_Categoria == request.IdCategoria.Value);
            if (!categoriaExiste)
                return BadRequest(new { message = "La categoria seleccionada no existe." });

            using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                var nombreNormalizado = model.Nombre.Trim().ToLower();
                var producto = await _context.Productos.FirstOrDefaultAsync(p =>
                    p.Activo && p.Nombre.Trim().ToLower() == nombreNormalizado);

                if (producto == null)
                {
                    producto = new Producto
                    {
                        Nombre = model.Nombre.Trim(),
                        Id_Categoria = request.IdCategoria.Value,
                        Costo = Math.Max(0, request.CostoReferencia ?? 0),
                        Tipo_Fiscal = FiscalTipoHelper.Normalizar(request.TipoFiscal),
                        Activo = true
                    };
                    _context.Productos.Add(producto);
                    await _context.SaveChangesAsync();
                }

                var precioFinal = request.PrecioAprobado > 0 ? request.PrecioAprobado : model.Precio_Sugerido;
                var productoSucursal = await _context.ProductosSucursal.FirstOrDefaultAsync(x =>
                    x.Id_Producto == producto.Id_Producto && x.Id_Sucursal == model.Id_Sucursal);

                if (productoSucursal == null)
                {
                    _context.ProductosSucursal.Add(new ProductoSucursal
                    {
                        Id_Producto = producto.Id_Producto,
                        Id_Sucursal = model.Id_Sucursal,
                        Precio = precioFinal,
                        Activo = true
                    });
                }
                else
                {
                    productoSucursal.Precio = precioFinal;
                    productoSucursal.Activo = true;
                }

                model.Estado = "APROBADO";
                model.Comentario_Revision = string.IsNullOrWhiteSpace(request.ComentarioRevision)
                    ? "Aprobado y publicado en catalogo."
                    : request.ComentarioRevision.Trim();
                model.Id_Usuario_Revision = idUsuario.Value;
                model.Id_Producto_Creado = producto.Id_Producto;
                model.Fecha_Revision = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                await tx.CommitAsync();
                return Ok(new { message = "Solicitud aprobada y producto habilitado para venta.", data = model });
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }
    }

    public sealed class CrearProductoPendienteRequest
    {
        public string Nombre { get; set; } = string.Empty;
        public decimal PrecioSugerido { get; set; }
        public string? NotaSolicitud { get; set; }
    }

    public sealed class ResolverProductoPendienteRequest
    {
        public bool Aprobar { get; set; }
        public int? IdCategoria { get; set; }
        public decimal? CostoReferencia { get; set; }
        public string TipoFiscal { get; set; } = "GRAVADO_15";
        public decimal PrecioAprobado { get; set; }
        public string? ComentarioRevision { get; set; }
    }
}
