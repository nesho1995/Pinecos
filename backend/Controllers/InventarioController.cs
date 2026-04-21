using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pinecos.Attributes;
using Pinecos.Data;
using Pinecos.DTOs;
using Pinecos.Helpers;
using Pinecos.Models;

namespace Pinecos.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AuthorizeRoles("ADMIN")]
    public class InventarioController : ControllerBase
    {
        private readonly PinecosDbContext _context;

        public InventarioController(PinecosDbContext context)
        {
            _context = context;
        }

        private async Task<Dictionary<int, decimal>> CalcularStockPorItemsAsync(List<int> idsItem)
        {
            if (idsItem.Count == 0)
                return new Dictionary<int, decimal>();

            var items = await _context.InventarioItems
                .Where(x => idsItem.Contains(x.Id_Inventario_Item))
                .Select(x => new { x.Id_Inventario_Item, x.Stock_Inicial })
                .ToListAsync();

            var movimientos = await _context.MovimientosInventario
                .Where(x => idsItem.Contains(x.Id_Inventario_Item))
                .Select(x => new { x.Id_Inventario_Item, x.Tipo, x.Cantidad })
                .ToListAsync();

            var delta = movimientos
                .GroupBy(x => x.Id_Inventario_Item)
                .ToDictionary(
                    g => g.Key,
                    g => g.Sum(m => InventarioHelper.SignoTipo(InventarioHelper.NormalizarTipo(m.Tipo)) * m.Cantidad)
                );

            return items.ToDictionary(
                x => x.Id_Inventario_Item,
                x => x.Stock_Inicial + (delta.TryGetValue(x.Id_Inventario_Item, out var d) ? d : 0m)
            );
        }

        private static bool EsEstadoOrdenValido(string estado)
        {
            var e = (estado ?? string.Empty).Trim().ToUpperInvariant();
            return e == "BORRADOR" || e == "APROBADA" || e == "RECIBIDA" || e == "CANCELADA";
        }

        private async Task<(bool Ok, string Error, List<InventarioItem> Items, int IdSucursal, decimal Total)> ValidarDetallesCompraAsync(
            List<CrearCompraProveedorDetalleDto> detalles)
        {
            if (detalles == null || detalles.Count == 0)
                return (false, "La compra debe tener al menos un detalle", new List<InventarioItem>(), 0, 0m);

            var idsItems = detalles.Select(x => x.Id_Inventario_Item).Distinct().ToList();
            if (idsItems.Count != detalles.Count)
                return (false, "No se permiten insumos repetidos en la misma orden/compra", new List<InventarioItem>(), 0, 0m);

            var items = await _context.InventarioItems
                .Where(x => idsItems.Contains(x.Id_Inventario_Item) && x.Activo)
                .ToListAsync();

            if (items.Count != idsItems.Count)
                return (false, "Uno o mas insumos no son validos/inactivos", new List<InventarioItem>(), 0, 0m);

            var sucursalesItems = items.Select(x => x.Id_Sucursal).Distinct().ToList();
            if (sucursalesItems.Count != 1)
                return (false, "Todos los insumos deben pertenecer a la misma sucursal", new List<InventarioItem>(), 0, 0m);

            decimal total = 0m;
            foreach (var det in detalles)
            {
                if (det.Cantidad <= 0 || det.Costo_Unitario < 0)
                    return (false, "Cantidad y costos invalidos en detalle", new List<InventarioItem>(), 0, 0m);
                total += det.Cantidad * det.Costo_Unitario;
            }

            return (true, string.Empty, items, sucursalesItems[0], total);
        }

        [HttpGet("items")]
        public async Task<ActionResult> GetItems([FromQuery] int? idSucursal = null, [FromQuery] bool incluirInactivos = false)
        {
            var rol = UserHelper.GetUserRole(User);
            var idSucursalToken = UserHelper.GetSucursalId(User);

            if (rol != "ADMIN")
            {
                if (!idSucursalToken.HasValue)
                    return BadRequest(new { message = "El usuario no tiene sucursal asignada" });
                idSucursal = idSucursalToken.Value;
            }

            var query = _context.InventarioItems.AsQueryable();

            if (!incluirInactivos)
                query = query.Where(x => x.Activo);

            if (idSucursal.HasValue)
                query = query.Where(x => x.Id_Sucursal == idSucursal.Value);

            var items = await (
                from i in query
                join s in _context.Sucursales on i.Id_Sucursal equals s.Id_Sucursal
                orderby i.Nombre
                select new
                {
                    i.Id_Inventario_Item,
                    i.Id_Sucursal,
                    Sucursal = s.Nombre,
                    i.Codigo,
                    i.Nombre,
                    i.Unidad_Medida,
                    i.Stock_Inicial,
                    i.Stock_Minimo,
                    i.Costo_Referencia,
                    i.Fecha_Creacion,
                    i.Activo
                }
            ).ToListAsync();

            var ids = items.Select(x => x.Id_Inventario_Item).Distinct().ToList();
            var stockDict = await CalcularStockPorItemsAsync(ids);

            var data = items.Select(x => new
            {
                x.Id_Inventario_Item,
                x.Id_Sucursal,
                x.Sucursal,
                x.Codigo,
                x.Nombre,
                x.Unidad_Medida,
                x.Stock_Inicial,
                Stock_Actual = stockDict.TryGetValue(x.Id_Inventario_Item, out var st) ? st : x.Stock_Inicial,
                x.Stock_Minimo,
                x.Costo_Referencia,
                x.Fecha_Creacion,
                x.Activo
            }).ToList();

            return Ok(data);
        }

        [HttpPost("items")]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> CrearItem([FromBody] InventarioItem model)
        {
            var idUsuario = UserHelper.GetUserId(User);
            if (!idUsuario.HasValue)
                return Unauthorized(new { message = "Usuario no valido en el token" });

            if (model.Id_Sucursal <= 0)
                return BadRequest(new { message = "Sucursal requerida" });
            if (!await _context.Sucursales.AnyAsync(x => x.Id_Sucursal == model.Id_Sucursal && x.Activo))
                return BadRequest(new { message = "Sucursal no valida" });

            var nombre = (model.Nombre ?? string.Empty).Trim();
            var codigo = (model.Codigo ?? string.Empty).Trim().ToUpperInvariant();
            var unidad = (model.Unidad_Medida ?? string.Empty).Trim().ToUpperInvariant();

            if (string.IsNullOrWhiteSpace(nombre))
                return BadRequest(new { message = "Nombre de insumo requerido" });
            if (string.IsNullOrWhiteSpace(codigo))
                return BadRequest(new { message = "Codigo de insumo requerido" });
            if (string.IsNullOrWhiteSpace(unidad))
                return BadRequest(new { message = "Unidad de medida requerida" });
            if (model.Stock_Inicial < 0 || model.Stock_Minimo < 0 || model.Costo_Referencia < 0)
                return BadRequest(new { message = "Stock y costos no pueden ser negativos" });

            var duplicado = await _context.InventarioItems.AnyAsync(x =>
                x.Id_Sucursal == model.Id_Sucursal && x.Activo &&
                (x.Codigo.ToUpper() == codigo || x.Nombre.ToUpper() == nombre.ToUpper()));
            if (duplicado)
                return BadRequest(new { message = "Ya existe un insumo activo con ese codigo o nombre en la sucursal" });

            var item = new InventarioItem
            {
                Id_Sucursal = model.Id_Sucursal,
                Codigo = codigo,
                Nombre = nombre,
                Unidad_Medida = unidad,
                Stock_Inicial = model.Stock_Inicial,
                Stock_Minimo = model.Stock_Minimo,
                Costo_Referencia = model.Costo_Referencia,
                Fecha_Creacion = FechaHelper.AhoraHonduras(),
                Activo = true
            };

            _context.InventarioItems.Add(item);
            await _context.SaveChangesAsync();
            await BitacoraHelper.RegistrarAsync(_context, idUsuario.Value, "INVENTARIO", "CREAR_ITEM", $"Item inventario #{item.Id_Inventario_Item} creado");

            return Ok(new { message = "Insumo creado correctamente", data = item });
        }

        [HttpPut("items/{id}")]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> ActualizarItem(int id, [FromBody] InventarioItem model)
        {
            var idUsuario = UserHelper.GetUserId(User);
            if (!idUsuario.HasValue)
                return Unauthorized(new { message = "Usuario no valido en el token" });

            var item = await _context.InventarioItems.FirstOrDefaultAsync(x => x.Id_Inventario_Item == id);
            if (item == null)
                return NotFound(new { message = "Insumo no encontrado" });

            var nombre = (model.Nombre ?? string.Empty).Trim();
            var codigo = (model.Codigo ?? string.Empty).Trim().ToUpperInvariant();
            var unidad = (model.Unidad_Medida ?? string.Empty).Trim().ToUpperInvariant();

            if (string.IsNullOrWhiteSpace(nombre) || string.IsNullOrWhiteSpace(codigo) || string.IsNullOrWhiteSpace(unidad))
                return BadRequest(new { message = "Nombre, codigo y unidad son requeridos" });
            if (model.Stock_Inicial < 0 || model.Stock_Minimo < 0 || model.Costo_Referencia < 0)
                return BadRequest(new { message = "Stock y costos no pueden ser negativos" });

            var duplicado = await _context.InventarioItems.AnyAsync(x =>
                x.Id_Inventario_Item != id &&
                x.Id_Sucursal == item.Id_Sucursal &&
                x.Activo &&
                (x.Codigo.ToUpper() == codigo || x.Nombre.ToUpper() == nombre.ToUpper()));
            if (duplicado)
                return BadRequest(new { message = "Ya existe un insumo activo con ese codigo o nombre en la sucursal" });

            item.Codigo = codigo;
            item.Nombre = nombre;
            item.Unidad_Medida = unidad;
            item.Stock_Inicial = model.Stock_Inicial;
            item.Stock_Minimo = model.Stock_Minimo;
            item.Costo_Referencia = model.Costo_Referencia;
            item.Activo = model.Activo;

            await _context.SaveChangesAsync();
            await BitacoraHelper.RegistrarAsync(_context, idUsuario.Value, "INVENTARIO", "ACTUALIZAR_ITEM", $"Item inventario #{item.Id_Inventario_Item} actualizado");

            return Ok(new { message = "Insumo actualizado correctamente", data = item });
        }

        [HttpDelete("items/{id}")]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> InactivarItem(int id)
        {
            var idUsuario = UserHelper.GetUserId(User);
            if (!idUsuario.HasValue)
                return Unauthorized(new { message = "Usuario no valido en el token" });

            var item = await _context.InventarioItems.FirstOrDefaultAsync(x => x.Id_Inventario_Item == id);
            if (item == null)
                return NotFound(new { message = "Insumo no encontrado" });

            item.Activo = false;
            await _context.SaveChangesAsync();
            await BitacoraHelper.RegistrarAsync(_context, idUsuario.Value, "INVENTARIO", "INACTIVAR_ITEM", $"Item inventario #{item.Id_Inventario_Item} inactivado");

            return Ok(new { message = "Insumo inactivado correctamente" });
        }

        [HttpPost("items/{id}/reactivar")]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> ReactivarItem(int id)
        {
            var idUsuario = UserHelper.GetUserId(User);
            if (!idUsuario.HasValue)
                return Unauthorized(new { message = "Usuario no valido en el token" });

            var item = await _context.InventarioItems.FirstOrDefaultAsync(x => x.Id_Inventario_Item == id);
            if (item == null)
                return NotFound(new { message = "Insumo no encontrado" });

            var duplicado = await _context.InventarioItems.AnyAsync(x =>
                x.Id_Inventario_Item != id &&
                x.Id_Sucursal == item.Id_Sucursal &&
                x.Activo &&
                (x.Codigo.ToUpper() == item.Codigo.ToUpper() || x.Nombre.ToUpper() == item.Nombre.ToUpper()));
            if (duplicado)
                return BadRequest(new { message = "No se puede reactivar porque ya existe un insumo activo con ese codigo o nombre" });

            item.Activo = true;
            await _context.SaveChangesAsync();
            await BitacoraHelper.RegistrarAsync(_context, idUsuario.Value, "INVENTARIO", "REACTIVAR_ITEM", $"Item inventario #{item.Id_Inventario_Item} reactivado");

            return Ok(new { message = "Insumo reactivado correctamente" });
        }

        [HttpGet("movimientos")]
        public async Task<ActionResult> GetMovimientos([FromQuery] int? idSucursal = null, [FromQuery] int? idItem = null, [FromQuery] DateTime? desde = null, [FromQuery] DateTime? hasta = null)
        {
            var rol = UserHelper.GetUserRole(User);
            var idSucursalToken = UserHelper.GetSucursalId(User);

            if (rol != "ADMIN")
            {
                if (!idSucursalToken.HasValue)
                    return BadRequest(new { message = "El usuario no tiene sucursal asignada" });
                idSucursal = idSucursalToken.Value;
            }

            var fechaDesde = desde ?? FechaHelper.HoyInicioHonduras().AddDays(-30);
            var fechaHasta = hasta ?? FechaHelper.HoyFinHonduras();

            var query = _context.MovimientosInventario
                .Where(x => x.Fecha >= fechaDesde && x.Fecha <= fechaHasta);

            if (idSucursal.HasValue)
                query = query.Where(x => x.Id_Sucursal == idSucursal.Value);
            if (idItem.HasValue)
                query = query.Where(x => x.Id_Inventario_Item == idItem.Value);

            var data = await (
                from m in query
                join i in _context.InventarioItems on m.Id_Inventario_Item equals i.Id_Inventario_Item
                join s in _context.Sucursales on m.Id_Sucursal equals s.Id_Sucursal
                join u in _context.Usuarios on m.Id_Usuario equals u.Id_Usuario into uj
                from u in uj.DefaultIfEmpty()
                orderby m.Fecha descending, m.Id_Movimiento_Inventario descending
                select new
                {
                    m.Id_Movimiento_Inventario,
                    m.Fecha,
                    m.Tipo,
                    m.Cantidad,
                    m.Costo_Unitario,
                    m.Referencia,
                    m.Observacion,
                    m.Id_Inventario_Item,
                    Item = i.Nombre,
                    i.Unidad_Medida,
                    m.Id_Sucursal,
                    Sucursal = s.Nombre,
                    m.Id_Usuario,
                    Usuario = u != null ? u.Nombre : ""
                }
            ).Take(500).ToListAsync();

            return Ok(data);
        }

        [HttpPost("movimientos")]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> RegistrarMovimiento([FromBody] RegistrarMovimientoInventarioDto request)
        {
            var idUsuario = UserHelper.GetUserId(User);
            if (!idUsuario.HasValue)
                return Unauthorized(new { message = "Usuario no valido en el token" });

            var tipo = InventarioHelper.NormalizarTipo(request.Tipo);
            if (string.IsNullOrWhiteSpace(tipo) || tipo == "COMPRA")
                return BadRequest(new { message = "Tipo de movimiento invalido. Usa ENTRADA, SALIDA o AJUSTES manuales" });

            if (request.Cantidad <= 0)
                return BadRequest(new { message = "Cantidad debe ser mayor a cero" });
            if (request.Costo_Unitario < 0)
                return BadRequest(new { message = "Costo unitario no puede ser negativo" });

            var item = await _context.InventarioItems.FirstOrDefaultAsync(x => x.Id_Inventario_Item == request.Id_Inventario_Item && x.Activo);
            if (item == null)
                return BadRequest(new { message = "Insumo no valido o inactivo" });

            var stockDict = await CalcularStockPorItemsAsync(new List<int> { item.Id_Inventario_Item });
            var stockActual = stockDict.TryGetValue(item.Id_Inventario_Item, out var st) ? st : item.Stock_Inicial;
            if (InventarioHelper.SignoTipo(tipo) < 0 && stockActual < request.Cantidad)
                return BadRequest(new { message = $"Stock insuficiente. Stock actual: {stockActual:N3}" });

            var movimiento = new MovimientoInventario
            {
                Id_Inventario_Item = item.Id_Inventario_Item,
                Id_Sucursal = item.Id_Sucursal,
                Id_Usuario = idUsuario.Value,
                Fecha = FechaHelper.AhoraHonduras(),
                Tipo = tipo,
                Cantidad = request.Cantidad,
                Costo_Unitario = request.Costo_Unitario,
                Referencia = (request.Referencia ?? string.Empty).Trim(),
                Observacion = (request.Observacion ?? string.Empty).Trim()
            };

            _context.MovimientosInventario.Add(movimiento);
            await _context.SaveChangesAsync();
            await BitacoraHelper.RegistrarAsync(_context, idUsuario.Value, "INVENTARIO", "MOVIMIENTO", $"Movimiento inventario #{movimiento.Id_Movimiento_Inventario} tipo {tipo}");

            return Ok(new { message = "Movimiento registrado correctamente", data = movimiento });
        }

        [HttpPost("compras")]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> RegistrarCompra([FromBody] CrearCompraProveedorDto request)
        {
            var idUsuario = UserHelper.GetUserId(User);
            if (!idUsuario.HasValue)
                return Unauthorized(new { message = "Usuario no valido en el token" });

            if (request.Id_Proveedor <= 0)
                return BadRequest(new { message = "Proveedor requerido" });

            var proveedor = await _context.Proveedores.FirstOrDefaultAsync(x => x.Id_Proveedor == request.Id_Proveedor && x.Activo);
            if (proveedor == null)
                return BadRequest(new { message = "Proveedor no valido o inactivo" });

            var validacion = await ValidarDetallesCompraAsync(request.Detalles);
            if (!validacion.Ok)
                return BadRequest(new { message = validacion.Error });

            var items = validacion.Items;
            var idSucursal = validacion.IdSucursal;
            var total = validacion.Total;

            using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                var compra = new CompraProveedor
                {
                    Id_Proveedor = request.Id_Proveedor,
                    Id_Sucursal = idSucursal,
                    Id_Usuario = idUsuario.Value,
                    Fecha = FechaHelper.AhoraHonduras(),
                    Total = total,
                    Estado = "RECIBIDA",
                    Observacion = (request.Observacion ?? string.Empty).Trim()
                };
                _context.ComprasProveedor.Add(compra);
                await _context.SaveChangesAsync();

                foreach (var det in request.Detalles)
                {
                    var item = items.First(x => x.Id_Inventario_Item == det.Id_Inventario_Item);
                    var subtotal = det.Cantidad * det.Costo_Unitario;

                    _context.ComprasProveedorDetalle.Add(new CompraProveedorDetalle
                    {
                        Id_Compra_Proveedor = compra.Id_Compra_Proveedor,
                        Id_Inventario_Item = det.Id_Inventario_Item,
                        Cantidad = det.Cantidad,
                        Costo_Unitario = det.Costo_Unitario,
                        Subtotal = subtotal
                    });

                    _context.MovimientosInventario.Add(new MovimientoInventario
                    {
                        Id_Inventario_Item = det.Id_Inventario_Item,
                        Id_Sucursal = idSucursal,
                        Id_Usuario = idUsuario.Value,
                        Fecha = compra.Fecha,
                        Tipo = "COMPRA",
                        Cantidad = det.Cantidad,
                        Costo_Unitario = det.Costo_Unitario,
                        Referencia = $"COMPRA#{compra.Id_Compra_Proveedor}",
                        Observacion = $"Compra proveedor {proveedor.Nombre}"
                    });

                    // Actualizar costo referencia hacia el ultimo costo de compra.
                    item.Costo_Referencia = det.Costo_Unitario;
                }

                await _context.SaveChangesAsync();
                await tx.CommitAsync();
                await BitacoraHelper.RegistrarAsync(_context, idUsuario.Value, "INVENTARIO", "COMPRA", $"Compra proveedor #{compra.Id_Compra_Proveedor} registrada");

                return Ok(new
                {
                    message = "Compra registrada correctamente",
                    data = new
                    {
                        compra.Id_Compra_Proveedor,
                        compra.Total,
                        compra.Id_Proveedor,
                        compra.Id_Sucursal,
                        Detalles = request.Detalles.Count
                    }
                });
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        [HttpGet("compras")]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> GetCompras([FromQuery] int? idSucursal = null, [FromQuery] int? idProveedor = null, [FromQuery] DateTime? desde = null, [FromQuery] DateTime? hasta = null)
        {
            var fechaDesde = desde ?? FechaHelper.HoyInicioHonduras().AddDays(-30);
            var fechaHasta = hasta ?? FechaHelper.HoyFinHonduras();

            var query = _context.ComprasProveedor
                .Where(x => x.Fecha >= fechaDesde && x.Fecha <= fechaHasta && (x.Estado == "ACTIVA" || x.Estado == "RECIBIDA"));

            if (idSucursal.HasValue)
                query = query.Where(x => x.Id_Sucursal == idSucursal.Value);
            if (idProveedor.HasValue)
                query = query.Where(x => x.Id_Proveedor == idProveedor.Value);

            var compras = await (
                from c in query
                join p in _context.Proveedores on c.Id_Proveedor equals p.Id_Proveedor
                join s in _context.Sucursales on c.Id_Sucursal equals s.Id_Sucursal
                join u in _context.Usuarios on c.Id_Usuario equals u.Id_Usuario into uj
                from u in uj.DefaultIfEmpty()
                orderby c.Fecha descending
                select new
                {
                    c.Id_Compra_Proveedor,
                    c.Fecha,
                    c.Total,
                    c.Observacion,
                    c.Id_Proveedor,
                    Proveedor = p.Nombre,
                    c.Id_Sucursal,
                    Sucursal = s.Nombre,
                    c.Id_Usuario,
                    Usuario = u != null ? u.Nombre : ""
                }
            ).Take(300).ToListAsync();

            return Ok(compras);
        }

        [HttpGet("recetas-producto")]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> GetRecetasProducto([FromQuery] int idSucursal, [FromQuery] int? idProducto = null)
        {
            if (idSucursal <= 0)
                return BadRequest(new { message = "Sucursal requerida" });

            var query = _context.RecetasProductoInsumo
                .Where(x => x.Activo && x.Id_Sucursal == idSucursal);
            if (idProducto.HasValue)
                query = query.Where(x => x.Id_Producto == idProducto.Value);

            var data = await (
                from r in query
                join p in _context.Productos on r.Id_Producto equals p.Id_Producto
                join i in _context.InventarioItems on r.Id_Inventario_Item equals i.Id_Inventario_Item
                join pr in _context.Presentaciones on r.Id_Presentacion equals pr.Id_Presentacion into prj
                from pr in prj.DefaultIfEmpty()
                orderby p.Nombre, pr.Nombre, i.Nombre
                select new
                {
                    r.Id_Receta_Producto_Insumo,
                    r.Id_Sucursal,
                    r.Id_Producto,
                    Producto = p.Nombre,
                    r.Id_Presentacion,
                    Presentacion = pr != null ? pr.Nombre : "",
                    r.Id_Inventario_Item,
                    Insumo = i.Nombre,
                    i.Unidad_Medida,
                    r.Cantidad_Insumo
                }
            ).ToListAsync();

            return Ok(data);
        }

        [HttpPut("recetas-producto")]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> GuardarRecetaProducto([FromBody] GuardarRecetaProductoDto request)
        {
            var idUsuario = UserHelper.GetUserId(User);
            if (!idUsuario.HasValue)
                return Unauthorized(new { message = "Usuario no valido en el token" });

            if (request.Id_Sucursal <= 0 || request.Id_Producto <= 0)
                return BadRequest(new { message = "Sucursal y producto son requeridos" });
            if (request.Detalles == null || request.Detalles.Count == 0)
                return BadRequest(new { message = "La receta debe tener al menos un insumo" });

            if (!await _context.Sucursales.AnyAsync(x => x.Id_Sucursal == request.Id_Sucursal && x.Activo))
                return BadRequest(new { message = "Sucursal invalida" });
            if (!await _context.Productos.AnyAsync(x => x.Id_Producto == request.Id_Producto && x.Activo))
                return BadRequest(new { message = "Producto invalido o inactivo" });
            if (request.Id_Presentacion.HasValue && !await _context.Presentaciones.AnyAsync(x => x.Id_Presentacion == request.Id_Presentacion.Value))
                return BadRequest(new { message = "Presentacion invalida" });

            var idsItem = request.Detalles.Select(x => x.Id_Inventario_Item).Distinct().ToList();
            if (idsItem.Count != request.Detalles.Count)
                return BadRequest(new { message = "No se permiten insumos repetidos en la receta" });

            var items = await _context.InventarioItems
                .Where(x => idsItem.Contains(x.Id_Inventario_Item) && x.Activo && x.Id_Sucursal == request.Id_Sucursal)
                .Select(x => x.Id_Inventario_Item)
                .ToListAsync();
            if (items.Count != idsItem.Count)
                return BadRequest(new { message = "Uno o mas insumos no son validos, inactivos o no pertenecen a la sucursal" });

            if (request.Detalles.Any(x => x.Cantidad_Insumo <= 0))
                return BadRequest(new { message = "Cantidad de insumo debe ser mayor a cero" });

            using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                var existentes = await _context.RecetasProductoInsumo
                    .Where(x => x.Activo &&
                                x.Id_Sucursal == request.Id_Sucursal &&
                                x.Id_Producto == request.Id_Producto &&
                                x.Id_Presentacion == request.Id_Presentacion)
                    .ToListAsync();

                if (existentes.Count > 0)
                    _context.RecetasProductoInsumo.RemoveRange(existentes);

                foreach (var d in request.Detalles)
                {
                    _context.RecetasProductoInsumo.Add(new RecetaProductoInsumo
                    {
                        Id_Sucursal = request.Id_Sucursal,
                        Id_Producto = request.Id_Producto,
                        Id_Presentacion = request.Id_Presentacion,
                        Id_Inventario_Item = d.Id_Inventario_Item,
                        Cantidad_Insumo = d.Cantidad_Insumo,
                        Activo = true
                    });
                }

                await _context.SaveChangesAsync();
                await tx.CommitAsync();
                await BitacoraHelper.RegistrarAsync(_context, idUsuario.Value, "INVENTARIO", "GUARDAR_RECETA_PRODUCTO", $"Receta guardada para producto #{request.Id_Producto}");

                return Ok(new { message = "Receta guardada correctamente" });
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        [HttpGet("kardex")]
        public async Task<ActionResult> GetKardex([FromQuery] int idItem, [FromQuery] DateTime? desde = null, [FromQuery] DateTime? hasta = null)
        {
            if (idItem <= 0)
                return BadRequest(new { message = "Id de insumo invalido" });

            var item = await _context.InventarioItems
                .FirstOrDefaultAsync(x => x.Id_Inventario_Item == idItem);
            if (item == null)
                return NotFound(new { message = "Insumo no encontrado" });

            var rol = UserHelper.GetUserRole(User);
            var idSucursalToken = UserHelper.GetSucursalId(User);
            if (rol != "ADMIN")
            {
                if (!idSucursalToken.HasValue || idSucursalToken.Value != item.Id_Sucursal)
                    return Forbid();
            }

            var fechaDesde = desde ?? FechaHelper.HoyInicioHonduras().AddDays(-30);
            var fechaHasta = hasta ?? FechaHelper.HoyFinHonduras();
            if (fechaHasta < fechaDesde)
                return BadRequest(new { message = "Rango de fechas invalido" });

            var movimientosPrevios = await _context.MovimientosInventario
                .Where(x => x.Id_Inventario_Item == idItem && x.Fecha < fechaDesde)
                .Select(x => new { x.Tipo, x.Cantidad })
                .ToListAsync();

            var saldoInicial = item.Stock_Inicial + movimientosPrevios.Sum(m =>
                InventarioHelper.SignoTipo(InventarioHelper.NormalizarTipo(m.Tipo)) * m.Cantidad);

            var movimientos = await _context.MovimientosInventario
                .Where(x => x.Id_Inventario_Item == idItem && x.Fecha >= fechaDesde && x.Fecha <= fechaHasta)
                .OrderBy(x => x.Fecha).ThenBy(x => x.Id_Movimiento_Inventario)
                .Select(x => new
                {
                    x.Id_Movimiento_Inventario,
                    x.Fecha,
                    x.Tipo,
                    x.Cantidad,
                    x.Costo_Unitario,
                    x.Referencia,
                    x.Observacion
                })
                .ToListAsync();

            decimal saldo = saldoInicial;
            var costoPromedio = item.Costo_Referencia < 0 ? 0m : item.Costo_Referencia;
            var saldoValor = saldo * costoPromedio;
            var lineas = new List<object>(movimientos.Count);
            foreach (var m in movimientos)
            {
                var tipo = InventarioHelper.NormalizarTipo(m.Tipo);
                var signo = InventarioHelper.SignoTipo(tipo);
                var entrada = signo > 0 ? m.Cantidad : 0m;
                var salida = signo < 0 ? m.Cantidad : 0m;
                decimal valorMovimiento;
                if (signo > 0)
                {
                    valorMovimiento = m.Cantidad * m.Costo_Unitario;
                    saldoValor += valorMovimiento;
                    saldo += m.Cantidad;
                    costoPromedio = saldo > 0 ? saldoValor / saldo : costoPromedio;
                }
                else if (signo < 0)
                {
                    var costoSalida = costoPromedio;
                    valorMovimiento = m.Cantidad * costoSalida;
                    saldo -= m.Cantidad;
                    saldoValor -= valorMovimiento;
                    if (saldo < 0) saldo = 0;
                    if (saldoValor < 0) saldoValor = 0;
                }
                else
                {
                    valorMovimiento = 0m;
                }

                lineas.Add(new
                {
                    m.Id_Movimiento_Inventario,
                    m.Fecha,
                    Tipo = tipo,
                    Entrada = entrada,
                    Salida = salida,
                    m.Costo_Unitario,
                    Valor_Movimiento = Math.Round(valorMovimiento, 4),
                    Saldo = saldo,
                    Saldo_Valor = Math.Round(saldoValor, 4),
                    Costo_Promedio = Math.Round(costoPromedio, 6),
                    m.Referencia,
                    m.Observacion
                });
            }

            return Ok(new
            {
                item.Id_Inventario_Item,
                item.Codigo,
                item.Nombre,
                item.Unidad_Medida,
                Fecha_Desde = fechaDesde,
                Fecha_Hasta = fechaHasta,
                Saldo_Inicial = saldoInicial,
                Saldo_Final = saldo,
                Saldo_Valor_Final = Math.Round(saldoValor, 4),
                Costo_Promedio_Final = Math.Round(costoPromedio, 6),
                Movimientos = lineas
            });
        }

        [HttpGet("dashboard-avanzado")]
        public async Task<ActionResult> GetDashboardAvanzado([FromQuery] int? idSucursal = null)
        {
            var rol = UserHelper.GetUserRole(User);
            var idSucursalToken = UserHelper.GetSucursalId(User);
            if (rol != "ADMIN")
            {
                if (!idSucursalToken.HasValue)
                    return BadRequest(new { message = "El usuario no tiene sucursal asignada" });
                idSucursal = idSucursalToken.Value;
            }

            var itemsQuery = _context.InventarioItems.Where(x => x.Activo);
            if (idSucursal.HasValue)
                itemsQuery = itemsQuery.Where(x => x.Id_Sucursal == idSucursal.Value);

            var items = await itemsQuery
                .Select(x => new
                {
                    x.Id_Inventario_Item,
                    x.Id_Sucursal,
                    x.Codigo,
                    x.Nombre,
                    x.Unidad_Medida,
                    x.Stock_Inicial,
                    x.Stock_Minimo,
                    x.Costo_Referencia
                })
                .ToListAsync();

            var ids = items.Select(x => x.Id_Inventario_Item).ToList();
            var stockDict = await CalcularStockPorItemsAsync(ids);

            var desde30 = FechaHelper.HoyInicioHonduras().AddDays(-30);
            var ahora = FechaHelper.HoyFinHonduras();
            var salidas30 = await _context.MovimientosInventario
                .Where(x => ids.Contains(x.Id_Inventario_Item) && x.Fecha >= desde30 && x.Fecha <= ahora)
                .Select(x => new { x.Id_Inventario_Item, x.Tipo, x.Cantidad })
                .ToListAsync();

            var salidaPorItem = salidas30
                .Where(x =>
                {
                    var t = InventarioHelper.NormalizarTipo(x.Tipo);
                    return t == "SALIDA" || t == "AJUSTE_NEGATIVO";
                })
                .GroupBy(x => x.Id_Inventario_Item)
                .ToDictionary(g => g.Key, g => g.Sum(x => x.Cantidad));

            var data = items.Select(x =>
            {
                var stockActual = stockDict.TryGetValue(x.Id_Inventario_Item, out var st) ? st : x.Stock_Inicial;
                var salida30 = salidaPorItem.TryGetValue(x.Id_Inventario_Item, out var s30) ? s30 : 0m;
                var consumoDiario = salida30 / 30m;
                decimal? coberturaDias = consumoDiario > 0 ? Math.Round(stockActual / consumoDiario, 2) : null;

                var nivel = "NORMAL";
                if (stockActual <= x.Stock_Minimo || (coberturaDias.HasValue && coberturaDias.Value <= 3m))
                    nivel = "CRITICO";
                else if (coberturaDias.HasValue && coberturaDias.Value <= 7m)
                    nivel = "ALERTA";

                return new
                {
                    x.Id_Inventario_Item,
                    x.Codigo,
                    x.Nombre,
                    x.Unidad_Medida,
                    Stock_Actual = stockActual,
                    x.Stock_Minimo,
                    Salida_30_Dias = salida30,
                    Consumo_Diario_Prom = Math.Round(consumoDiario, 4),
                    Cobertura_Dias = coberturaDias,
                    Nivel = nivel,
                    Valor_Stock = Math.Round(stockActual * x.Costo_Referencia, 2)
                };
            }).ToList();

            return Ok(new
            {
                totalItems = data.Count,
                criticos = data.Count(x => x.Nivel == "CRITICO"),
                alertas = data.Count(x => x.Nivel == "ALERTA"),
                valorStockTotal = data.Sum(x => x.Valor_Stock),
                items = data.OrderBy(x => x.Nivel).ThenBy(x => x.Cobertura_Dias ?? 99999m).Take(200).ToList()
            });
        }

        [HttpGet("ordenes-compra")]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> GetOrdenesCompra([FromQuery] int? idSucursal = null, [FromQuery] string? estado = null)
        {
            var query = _context.ComprasProveedor
                .Where(x => x.Estado == "BORRADOR" || x.Estado == "APROBADA" || x.Estado == "RECIBIDA" || x.Estado == "CANCELADA");

            if (idSucursal.HasValue)
                query = query.Where(x => x.Id_Sucursal == idSucursal.Value);

            if (!string.IsNullOrWhiteSpace(estado))
            {
                var e = estado.Trim().ToUpperInvariant();
                if (!EsEstadoOrdenValido(e))
                    return BadRequest(new { message = "Estado invalido" });
                query = query.Where(x => x.Estado == e);
            }

            var data = await (
                from c in query
                join p in _context.Proveedores on c.Id_Proveedor equals p.Id_Proveedor
                join s in _context.Sucursales on c.Id_Sucursal equals s.Id_Sucursal
                orderby c.Fecha descending
                select new
                {
                    c.Id_Compra_Proveedor,
                    c.Fecha,
                    c.Estado,
                    c.Total,
                    c.Observacion,
                    c.Id_Proveedor,
                    Proveedor = p.Nombre,
                    c.Id_Sucursal,
                    Sucursal = s.Nombre
                }
            ).Take(300).ToListAsync();

            return Ok(data);
        }

        [HttpPost("ordenes-compra")]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> CrearOrdenCompra([FromBody] CrearOrdenCompraProveedorDto request)
        {
            var idUsuario = UserHelper.GetUserId(User);
            if (!idUsuario.HasValue)
                return Unauthorized(new { message = "Usuario no valido en el token" });

            if (request.Id_Proveedor <= 0)
                return BadRequest(new { message = "Proveedor requerido" });

            var proveedor = await _context.Proveedores.FirstOrDefaultAsync(x => x.Id_Proveedor == request.Id_Proveedor && x.Activo);
            if (proveedor == null)
                return BadRequest(new { message = "Proveedor no valido o inactivo" });

            var validacion = await ValidarDetallesCompraAsync(request.Detalles);
            if (!validacion.Ok)
                return BadRequest(new { message = validacion.Error });

            using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                var orden = new CompraProveedor
                {
                    Id_Proveedor = request.Id_Proveedor,
                    Id_Sucursal = validacion.IdSucursal,
                    Id_Usuario = idUsuario.Value,
                    Fecha = FechaHelper.AhoraHonduras(),
                    Total = validacion.Total,
                    Estado = "BORRADOR",
                    Observacion = (request.Observacion ?? string.Empty).Trim()
                };
                _context.ComprasProveedor.Add(orden);
                await _context.SaveChangesAsync();

                foreach (var det in request.Detalles)
                {
                    _context.ComprasProveedorDetalle.Add(new CompraProveedorDetalle
                    {
                        Id_Compra_Proveedor = orden.Id_Compra_Proveedor,
                        Id_Inventario_Item = det.Id_Inventario_Item,
                        Cantidad = det.Cantidad,
                        Costo_Unitario = det.Costo_Unitario,
                        Subtotal = det.Cantidad * det.Costo_Unitario
                    });
                }

                await _context.SaveChangesAsync();
                await tx.CommitAsync();
                await BitacoraHelper.RegistrarAsync(_context, idUsuario.Value, "INVENTARIO", "CREAR_ORDEN_COMPRA", $"Orden compra #{orden.Id_Compra_Proveedor} creada");

                return Ok(new { message = "Orden de compra creada", data = orden });
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        [HttpPut("ordenes-compra/{id}")]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> ActualizarOrdenCompra(int id, [FromBody] ActualizarOrdenCompraProveedorDto request)
        {
            var idUsuario = UserHelper.GetUserId(User);
            if (!idUsuario.HasValue)
                return Unauthorized(new { message = "Usuario no valido en el token" });

            var orden = await _context.ComprasProveedor.FirstOrDefaultAsync(x => x.Id_Compra_Proveedor == id);
            if (orden == null)
                return NotFound(new { message = "Orden no encontrada" });
            if (orden.Estado != "BORRADOR")
                return BadRequest(new { message = "Solo se puede editar una orden en estado BORRADOR" });

            var validacion = await ValidarDetallesCompraAsync(request.Detalles);
            if (!validacion.Ok)
                return BadRequest(new { message = validacion.Error });
            if (orden.Id_Sucursal != validacion.IdSucursal)
                return BadRequest(new { message = "Los insumos deben corresponder a la misma sucursal de la orden" });

            using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                orden.Total = validacion.Total;
                orden.Observacion = (request.Observacion ?? string.Empty).Trim();

                var actuales = await _context.ComprasProveedorDetalle
                    .Where(x => x.Id_Compra_Proveedor == id)
                    .ToListAsync();
                _context.ComprasProveedorDetalle.RemoveRange(actuales);

                foreach (var det in request.Detalles)
                {
                    _context.ComprasProveedorDetalle.Add(new CompraProveedorDetalle
                    {
                        Id_Compra_Proveedor = orden.Id_Compra_Proveedor,
                        Id_Inventario_Item = det.Id_Inventario_Item,
                        Cantidad = det.Cantidad,
                        Costo_Unitario = det.Costo_Unitario,
                        Subtotal = det.Cantidad * det.Costo_Unitario
                    });
                }

                await _context.SaveChangesAsync();
                await tx.CommitAsync();
                await BitacoraHelper.RegistrarAsync(_context, idUsuario.Value, "INVENTARIO", "ACTUALIZAR_ORDEN_COMPRA", $"Orden compra #{id} actualizada");

                return Ok(new { message = "Orden actualizada correctamente" });
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        [HttpPost("ordenes-compra/{id}/aprobar")]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> AprobarOrdenCompra(int id)
        {
            var idUsuario = UserHelper.GetUserId(User);
            if (!idUsuario.HasValue)
                return Unauthorized(new { message = "Usuario no valido en el token" });

            var orden = await _context.ComprasProveedor.FirstOrDefaultAsync(x => x.Id_Compra_Proveedor == id);
            if (orden == null)
                return NotFound(new { message = "Orden no encontrada" });
            if (orden.Estado != "BORRADOR")
                return BadRequest(new { message = "Solo se puede aprobar una orden BORRADOR" });

            orden.Estado = "APROBADA";
            await _context.SaveChangesAsync();
            await BitacoraHelper.RegistrarAsync(_context, idUsuario.Value, "INVENTARIO", "APROBAR_ORDEN_COMPRA", $"Orden compra #{id} aprobada");
            return Ok(new { message = "Orden aprobada correctamente" });
        }

        [HttpPost("ordenes-compra/{id}/cancelar")]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> CancelarOrdenCompra(int id)
        {
            var idUsuario = UserHelper.GetUserId(User);
            if (!idUsuario.HasValue)
                return Unauthorized(new { message = "Usuario no valido en el token" });

            var orden = await _context.ComprasProveedor.FirstOrDefaultAsync(x => x.Id_Compra_Proveedor == id);
            if (orden == null)
                return NotFound(new { message = "Orden no encontrada" });
            if (orden.Estado == "RECIBIDA")
                return BadRequest(new { message = "No se puede cancelar una orden ya recibida" });
            if (orden.Estado == "CANCELADA")
                return Ok(new { message = "La orden ya estaba cancelada" });

            orden.Estado = "CANCELADA";
            await _context.SaveChangesAsync();
            await BitacoraHelper.RegistrarAsync(_context, idUsuario.Value, "INVENTARIO", "CANCELAR_ORDEN_COMPRA", $"Orden compra #{id} cancelada");
            return Ok(new { message = "Orden cancelada correctamente" });
        }

        [HttpPost("ordenes-compra/{id}/recibir")]
        [AuthorizeRoles("ADMIN")]
        public async Task<ActionResult> RecibirOrdenCompra(int id)
        {
            var idUsuario = UserHelper.GetUserId(User);
            if (!idUsuario.HasValue)
                return Unauthorized(new { message = "Usuario no valido en el token" });

            var orden = await _context.ComprasProveedor.FirstOrDefaultAsync(x => x.Id_Compra_Proveedor == id);
            if (orden == null)
                return NotFound(new { message = "Orden no encontrada" });
            if (orden.Estado != "APROBADA")
                return BadRequest(new { message = "Solo se puede recibir una orden APROBADA" });

            var detalles = await _context.ComprasProveedorDetalle
                .Where(x => x.Id_Compra_Proveedor == id)
                .ToListAsync();
            if (detalles.Count == 0)
                return BadRequest(new { message = "La orden no tiene detalles" });

            var idsItem = detalles.Select(x => x.Id_Inventario_Item).Distinct().ToList();
            var items = await _context.InventarioItems
                .Where(x => idsItem.Contains(x.Id_Inventario_Item) && x.Activo)
                .ToListAsync();
            if (items.Count != idsItem.Count)
                return BadRequest(new { message = "Uno o mas insumos de la orden no existen o estan inactivos" });

            using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                foreach (var det in detalles)
                {
                    var item = items.First(x => x.Id_Inventario_Item == det.Id_Inventario_Item);
                    _context.MovimientosInventario.Add(new MovimientoInventario
                    {
                        Id_Inventario_Item = item.Id_Inventario_Item,
                        Id_Sucursal = orden.Id_Sucursal,
                        Id_Usuario = idUsuario.Value,
                        Fecha = FechaHelper.AhoraHonduras(),
                        Tipo = "COMPRA",
                        Cantidad = det.Cantidad,
                        Costo_Unitario = det.Costo_Unitario,
                        Referencia = $"ORDEN_COMPRA#{orden.Id_Compra_Proveedor}",
                        Observacion = "Recepcion de orden de compra"
                    });

                    item.Costo_Referencia = det.Costo_Unitario;
                }

                orden.Estado = "RECIBIDA";
                await _context.SaveChangesAsync();
                await tx.CommitAsync();
                await BitacoraHelper.RegistrarAsync(_context, idUsuario.Value, "INVENTARIO", "RECIBIR_ORDEN_COMPRA", $"Orden compra #{id} recibida");

                return Ok(new { message = "Orden recibida y stock actualizado correctamente" });
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        [HttpGet("resumen")]
        public async Task<ActionResult> GetResumen([FromQuery] int? idSucursal = null)
        {
            var rol = UserHelper.GetUserRole(User);
            var idSucursalToken = UserHelper.GetSucursalId(User);
            if (rol != "ADMIN")
            {
                if (!idSucursalToken.HasValue)
                    return BadRequest(new { message = "El usuario no tiene sucursal asignada" });
                idSucursal = idSucursalToken.Value;
            }

            var itemsQuery = _context.InventarioItems.Where(x => x.Activo);
            if (idSucursal.HasValue)
                itemsQuery = itemsQuery.Where(x => x.Id_Sucursal == idSucursal.Value);

            var items = await itemsQuery
                .Select(x => new
                {
                    x.Id_Inventario_Item,
                    x.Stock_Inicial,
                    x.Stock_Minimo
                })
                .ToListAsync();

            var ids = items.Select(x => x.Id_Inventario_Item).ToList();
            var stock = await CalcularStockPorItemsAsync(ids);

            var totalItems = items.Count;
            var itemsStockBajo = items.Count(x =>
            {
                var actual = stock.TryGetValue(x.Id_Inventario_Item, out var st) ? st : x.Stock_Inicial;
                return actual <= x.Stock_Minimo;
            });

            return Ok(new
            {
                totalItems,
                itemsStockBajo,
                porcentajeBajo = totalItems == 0 ? 0m : Math.Round((decimal)itemsStockBajo * 100m / totalItems, 2)
            });
        }
    }
}
