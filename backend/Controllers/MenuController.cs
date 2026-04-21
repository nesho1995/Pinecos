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
    public class MenuController : ControllerBase
    {
        private readonly PinecosDbContext _context;

        public MenuController(PinecosDbContext context)
        {
            _context = context;
        }

        [HttpPost("producto-sucursal")]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> AsignarProductoSucursal([FromBody] ProductoSucursal model)
        {
            if (model.Precio <= 0)
                return BadRequest(new { message = "El precio debe ser mayor a cero" });

            var productoExiste = await _context.Productos.AnyAsync(x => x.Id_Producto == model.Id_Producto && x.Activo);
            var sucursalExiste = await _context.Sucursales.AnyAsync(x => x.Id_Sucursal == model.Id_Sucursal && x.Activo);

            if (!productoExiste)
                return BadRequest(new { message = "El producto no existe o está inactivo" });

            if (!sucursalExiste)
                return BadRequest(new { message = "La sucursal no existe o está inactiva" });

            var existente = await _context.ProductosSucursal.FirstOrDefaultAsync(x =>
                x.Id_Producto == model.Id_Producto &&
                x.Id_Sucursal == model.Id_Sucursal);

            if (existente == null)
            {
                model.Activo = true;
                _context.ProductosSucursal.Add(model);
                await _context.SaveChangesAsync();
                return Ok(new { message = "Producto asignado a sucursal correctamente", data = model });
            }

            existente.Precio = model.Precio;
            existente.Activo = model.Activo;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Precio de producto actualizado correctamente", data = existente });
        }

        [HttpPost("producto-presentacion")]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> AsignarPresentacionProducto([FromBody] ProductoPresentacion model)
        {
            var productoExiste = await _context.Productos.AnyAsync(x => x.Id_Producto == model.Id_Producto && x.Activo);
            var presentacionExiste = await _context.Presentaciones.AnyAsync(x => x.Id_Presentacion == model.Id_Presentacion);

            if (!productoExiste)
                return BadRequest(new { message = "El producto no existe o está inactivo" });

            if (!presentacionExiste)
                return BadRequest(new { message = "La presentación no existe" });

            var existeRelacion = await _context.ProductoPresentaciones.AnyAsync(x =>
                x.Id_Producto == model.Id_Producto &&
                x.Id_Presentacion == model.Id_Presentacion);

            if (existeRelacion)
                return Ok(new { message = "La relación producto-presentación ya existe" });

            _context.ProductoPresentaciones.Add(model);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Presentación asignada al producto correctamente",
                data = model
            });
        }

        [HttpGet("producto-presentacion")]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> GetProductoPresentaciones()
        {
            var data = await (
                from pp in _context.ProductoPresentaciones
                join p in _context.Productos on pp.Id_Producto equals p.Id_Producto
                join pr in _context.Presentaciones on pp.Id_Presentacion equals pr.Id_Presentacion
                where p.Activo
                orderby p.Nombre, pr.Onzas
                select new
                {
                    pp.Id_Producto_Presentacion,
                    pp.Id_Producto,
                    Producto = p.Nombre,
                    pp.Id_Presentacion,
                    Presentacion = pr.Nombre,
                    pr.Onzas
                }
            ).ToListAsync();

            return Ok(data);
        }

        [HttpDelete("producto-presentacion/{idProductoPresentacion:int}")]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> EliminarProductoPresentacion(int idProductoPresentacion)
        {
            var idUsuario = UserHelper.GetUserId(User);
            if (!idUsuario.HasValue)
                return Unauthorized(new { message = "Usuario no valido en el token" });

            var relacion = await _context.ProductoPresentaciones
                .FirstOrDefaultAsync(x => x.Id_Producto_Presentacion == idProductoPresentacion);

            if (relacion == null)
                return NotFound(new { message = "Relacion producto-presentacion no encontrada" });

            var tieneHistorial = await _context.DetalleVenta.AnyAsync(x =>
                x.Id_Producto == relacion.Id_Producto &&
                x.Id_Presentacion == relacion.Id_Presentacion)
                || await _context.DetalleCuentaMesa.AnyAsync(x =>
                    x.Id_Producto == relacion.Id_Producto &&
                    x.Id_Presentacion == relacion.Id_Presentacion);

            if (tieneHistorial)
            {
                return BadRequest(new
                {
                    message = "No se puede eliminar esta relacion porque tiene historial en ventas o cuentas. Inactiva sus precios por sucursal en su lugar."
                });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var preciosSucursal = await _context.ProductoPresentacionSucursales
                    .Where(x => x.Id_Producto_Presentacion == idProductoPresentacion)
                    .ToListAsync();

                if (preciosSucursal.Count > 0)
                    _context.ProductoPresentacionSucursales.RemoveRange(preciosSucursal);

                _context.ProductoPresentaciones.Remove(relacion);
                await _context.SaveChangesAsync();

                await BitacoraHelper.RegistrarAsync(
                    _context,
                    idUsuario.Value,
                    "MENU",
                    "ELIMINAR_RELACION",
                    $"Relacion producto-presentacion #{idProductoPresentacion} eliminada");

                await transaction.CommitAsync();
                return Ok(new { message = "Relacion eliminada correctamente" });
            }
            catch (DbUpdateException)
            {
                await transaction.RollbackAsync();
                return BadRequest(new
                {
                    message = "No se pudo eliminar la relacion porque esta en uso por otros registros. Inactiva sus precios por sucursal."
                });
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        [HttpPost("producto-presentacion-sucursal")]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> AsignarPrecioPresentacionSucursal([FromBody] ProductoPresentacionSucursal model)
        {
            if (model.Precio <= 0)
                return BadRequest(new { message = "El precio debe ser mayor a cero" });

            var productoPresentacionExiste = await _context.ProductoPresentaciones
                .AnyAsync(x => x.Id_Producto_Presentacion == model.Id_Producto_Presentacion);

            var sucursalExiste = await _context.Sucursales
                .AnyAsync(x => x.Id_Sucursal == model.Id_Sucursal && x.Activo);

            if (!productoPresentacionExiste)
                return BadRequest(new { message = "La relación producto-presentación no existe" });

            if (!sucursalExiste)
                return BadRequest(new { message = "La sucursal no existe o está inactiva" });

            var existente = await _context.ProductoPresentacionSucursales.FirstOrDefaultAsync(x =>
                x.Id_Producto_Presentacion == model.Id_Producto_Presentacion &&
                x.Id_Sucursal == model.Id_Sucursal);

            if (existente == null)
            {
                model.Activo = true;
                _context.ProductoPresentacionSucursales.Add(model);
                await _context.SaveChangesAsync();
                return Ok(new { message = "Precio de presentación asignado correctamente", data = model });
            }

            existente.Precio = model.Precio;
            existente.Activo = model.Activo;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Precio de presentación actualizado correctamente", data = existente });
        }

        [HttpGet("sucursal/{idSucursal}")]
        public async Task<ActionResult> GetMenuSucursal(int idSucursal)
        {
            var rol = UserHelper.GetUserRole(User).Trim().ToUpperInvariant();
            var idSucursalToken = UserHelper.GetSucursalId(User);

            if (rol != "ADMIN")
            {
                if (!idSucursalToken.HasValue)
                    return BadRequest(new { message = "El usuario no tiene sucursal asignada" });
                if (idSucursalToken.Value != idSucursal)
                    return Forbid();
            }

            var productosNormales = await (
                from ps in _context.ProductosSucursal
                join p in _context.Productos on ps.Id_Producto equals p.Id_Producto
                join c in _context.Categorias on p.Id_Categoria equals c.Id_Categoria
                where ps.Id_Sucursal == idSucursal && ps.Activo && p.Activo
                select new
                {
                    Tipo = "NORMAL",
                    ps.Id_Producto_Sucursal,
                    p.Id_Producto,
                    Id_Presentacion = (int?)null,
                    Producto = p.Nombre,
                    Categoria = c.Nombre,
                    Costo = p.Costo,
                    ps.Precio
                }
            ).ToListAsync();

            var productosConPresentacion = await (
                from pps in _context.ProductoPresentacionSucursales
                join pp in _context.ProductoPresentaciones on pps.Id_Producto_Presentacion equals pp.Id_Producto_Presentacion
                join p in _context.Productos on pp.Id_Producto equals p.Id_Producto
                join pr in _context.Presentaciones on pp.Id_Presentacion equals pr.Id_Presentacion
                join c in _context.Categorias on p.Id_Categoria equals c.Id_Categoria
                where pps.Id_Sucursal == idSucursal && pps.Activo && p.Activo
                select new
                {
                    Tipo = "PRESENTACION",
                    pps.Id_Producto_Presentacion_Sucursal,
                    p.Id_Producto,
                    Id_Presentacion = (int?)pp.Id_Presentacion,
                    Producto = p.Nombre,
                    Categoria = c.Nombre,
                    Presentacion = pr.Nombre,
                    pr.Onzas,
                    Costo = p.Costo,
                    pps.Precio
                }
            ).ToListAsync();

            return Ok(new
            {
                normales = productosNormales,
                conPresentacion = productosConPresentacion
            });
        }
    }
}
