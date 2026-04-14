import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { imprimirTicketHtml } from '../../utils/printTicket';
import { getUsuario } from '../../utils/auth';

const descuentoOpciones = [
  { value: 'NINGUNO', label: 'Sin descuento' },
  { value: 'PORC_5', label: '5% descuento' },
  { value: 'PORC_10', label: '10% descuento' },
  { value: 'PORC_15', label: '15% descuento' },
  { value: 'MANUAL', label: 'Manual (L)' }
];

const impuestoOpciones = [
  { value: 'INCLUIDO_15', label: 'Incluido en precio (15%)' },
  { value: 'EXENTO', label: 'Exento (0%)' },
  { value: 'AGREGAR_15', label: 'Agregar 15%' },
  { value: 'MANUAL', label: 'Manual (L)' }
];

function VentasPOS() {
  const usuario = getUsuario();
  const idSucursalUsuario = usuario?.id_Sucursal ?? usuario?.id_sucursal ?? null;

  const [cajaActual, setCajaActual] = useState(null);
  const [productos, setProductos] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [modoDescuento, setModoDescuento] = useState('NINGUNO');
  const [descuentoManual, setDescuentoManual] = useState('0');
  const [modoImpuesto, setModoImpuesto] = useState('INCLUIDO_15');
  const [impuestoManual, setImpuestoManual] = useState('0');
  const [facturacionSar, setFacturacionSar] = useState({ habilitadoCai: false });
  const [emitirFactura, setEmitirFactura] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [ultimaVentaId, setUltimaVentaId] = useState(null);
  const [procesando, setProcesando] = useState(false);

  const cargarCajaActual = async () => {
    const response = await api.get('/Dashboard/caja-actual');
    setCajaActual(response.data);
  };

  const cargarFacturacionSar = async () => {
    try {
      const response = await api.get('/FacturacionSar');
      setFacturacionSar(response.data || { habilitadoCai: false });
    } catch {
      setFacturacionSar({ habilitadoCai: false });
    }
  };

  const cargarMenuSucursal = async () => {
    if (!idSucursalUsuario) {
      setProductos([]);
      return;
    }

    const response = await api.get(`/Menu/sucursal/${idSucursalUsuario}`);
    const normales = (response.data?.normales || []).map((item) => ({
      id_Producto: item.id_Producto,
      id_Presentacion: null,
      nombre: item.producto,
      categoria: item.categoria || 'Sin categoria',
      precio: Number(item.precio || 0),
      costo: Number(item.costo || 0)
    }));

    const conPresentacion = (response.data?.conPresentacion || []).map((item) => ({
      id_Producto: item.id_Producto,
      id_Presentacion: item.id_Presentacion,
      nombre: `${item.producto} - ${item.presentacion || 'Presentacion'}`,
      categoria: item.categoria || 'Sin categoria',
      precio: Number(item.precio || 0),
      costo: Number(item.costo || 0)
    }));

    setProductos([...normales, ...conPresentacion].filter((x) => x.precio > 0));
  };

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([cargarCajaActual(), cargarMenuSucursal(), cargarFacturacionSar()]);
      } catch (err) {
        setError(err?.response?.data?.message || 'Error al cargar POS');
      }
    };
    init();
  }, []);

  const categorias = useMemo(() => {
    const unique = [...new Set(productos.map((p) => p.categoria).filter(Boolean))];
    return unique.sort((a, b) => a.localeCompare(b));
  }, [productos]);

  const limpiarMensajes = () => {
    setMensaje('');
    setError('');
  };

  const productosFiltrados = useMemo(() => {
    let lista = [...productos];
    if (categoriaSeleccionada) lista = lista.filter((p) => p.categoria === categoriaSeleccionada);
    if (busqueda.trim()) {
      const texto = busqueda.toLowerCase();
      lista = lista.filter((p) => p.nombre?.toLowerCase().includes(texto));
    }
    return lista;
  }, [productos, categoriaSeleccionada, busqueda]);

  const agregarProducto = (producto) => {
    limpiarMensajes();
    if (!cajaActual?.abierta) return setError('Debes abrir caja antes de vender');

    const indexExistente = carrito.findIndex(
      (x) =>
        x.id_Producto === producto.id_Producto &&
        String(x.id_Presentacion ?? '') === String(producto.id_Presentacion ?? '')
    );

    if (indexExistente >= 0) {
      const nuevo = [...carrito];
      nuevo[indexExistente].cantidad += 1;
      nuevo[indexExistente].subtotal = nuevo[indexExistente].cantidad * nuevo[indexExistente].precio_Unitario;
      setCarrito(nuevo);
      return;
    }

    const nuevoItem = {
      id_Producto: producto.id_Producto,
      id_Presentacion: producto.id_Presentacion,
      nombre: producto.nombre,
      cantidad: 1,
      precio_Unitario: Number(producto.precio),
      costo_Unitario: Number(producto.costo || 0),
      subtotal: Number(producto.precio)
    };
    setCarrito([...carrito, nuevoItem]);
  };

  const cambiarCantidad = (index, nuevaCantidad) => {
    const cantidadNumero = Number(nuevaCantidad);
    if (!cantidadNumero || cantidadNumero <= 0) return;
    const nuevo = [...carrito];
    nuevo[index].cantidad = cantidadNumero;
    nuevo[index].subtotal = nuevo[index].cantidad * nuevo[index].precio_Unitario;
    setCarrito(nuevo);
  };

  const quitarItem = (index) => {
    limpiarMensajes();
    setCarrito(carrito.filter((_, i) => i !== index));
  };

  const limpiarCarrito = () => {
    limpiarMensajes();
    setCarrito([]);
    setUltimaVentaId(null);
    setModoDescuento('NINGUNO');
    setDescuentoManual('0');
    setModoImpuesto('INCLUIDO_15');
    setImpuestoManual('0');
    setEmitirFactura(false);
  };

  const subtotal = carrito.reduce((acc, item) => acc + Number(item.subtotal || 0), 0);

  const descuentoCalculado = useMemo(() => {
    switch (modoDescuento) {
      case 'PORC_5': return subtotal * 0.05;
      case 'PORC_10': return subtotal * 0.10;
      case 'PORC_15': return subtotal * 0.15;
      case 'MANUAL': return Number(descuentoManual || 0);
      default: return 0;
    }
  }, [modoDescuento, descuentoManual, subtotal]);

  const impuestoCalculado = useMemo(() => {
    switch (modoImpuesto) {
      case 'AGREGAR_15':
        return subtotal * 0.15;
      case 'MANUAL':
        return Number(impuestoManual || 0);
      case 'INCLUIDO_15':
        return subtotal > 0 ? subtotal * (15 / 115) : 0;
      case 'EXENTO':
      default:
        return 0;
    }
  }, [modoImpuesto, impuestoManual, subtotal]);

  const impuestoIncluidoEnSubtotal = modoImpuesto === 'INCLUIDO_15';
  const impuestoASumar = impuestoIncluidoEnSubtotal ? 0 : impuestoCalculado;
  const total = subtotal - descuentoCalculado + impuestoASumar;
  const costoTotal = carrito.reduce((acc, item) => acc + Number(item.costo_Unitario || 0) * Number(item.cantidad || 0), 0);
  const utilidadBruta = total - costoTotal;

  const cobrarVenta = async () => {
    limpiarMensajes();
    if (!cajaActual?.abierta) return setError('No hay caja abierta');
    if (carrito.length === 0) return setError('Agrega productos al carrito');
    if (descuentoCalculado < 0 || impuestoCalculado < 0) return setError('Descuento e impuesto no pueden ser negativos');
    if (total < 0) return setError('El total no puede ser negativo');

    try {
      setProcesando(true);
      const response = await api.post('/Ventas', {
        id_Caja: cajaActual.id_Caja,
        descuento: Number(descuentoCalculado.toFixed(2)),
        impuesto: Number(impuestoCalculado.toFixed(2)),
        impuestoIncluidoEnSubtotal,
        emitirFactura: emitirFactura && !!facturacionSar?.habilitadoCai,
        metodo_Pago: metodoPago,
        observacion: `Venta POS | Desc:${modoDescuento} | Imp:${modoImpuesto}`,
        detalles: carrito.map((item) => ({
          id_Producto: item.id_Producto,
          id_Presentacion: item.id_Presentacion,
          cantidad: item.cantidad,
          observacion: ''
        }))
      });

      const idVenta = response.data.data.id_Venta;
      setUltimaVentaId(idVenta);
      setMensaje(`Venta registrada correctamente. Venta #${idVenta}`);
      setCarrito([]);
      setModoDescuento('NINGUNO');
      setDescuentoManual('0');
      setModoImpuesto('INCLUIDO_15');
      setImpuestoManual('0');
      setEmitirFactura(false);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al registrar venta');
    } finally {
      setProcesando(false);
    }
  };

  const imprimirTicket = async () => {
    limpiarMensajes();
    if (!ultimaVentaId) return setError('No hay ticket para imprimir');
    try {
      await imprimirTicketHtml(ultimaVentaId);
    } catch (err) {
      setError(err?.message || 'No se pudo imprimir el ticket');
    }
  };

  return (
    <div className="pos-page">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">POS Ventas</h2>
          <div className="text-muted">{cajaActual?.abierta ? `Caja abierta #${cajaActual.id_Caja}` : 'No hay caja abierta'}</div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={limpiarCarrito}>Limpiar</button>
          <button className="btn btn-outline-dark" onClick={imprimirTicket} disabled={!ultimaVentaId}>Ticket</button>
        </div>
      </div>

      {mensaje && <div className="alert alert-success">{mensaje}</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      {!idSucursalUsuario && <div className="alert alert-warning mb-3">El usuario no tiene sucursal asignada.</div>}

      {!cajaActual?.abierta ? (
        <div className="alert alert-warning">Debes abrir caja antes de vender.</div>
      ) : (
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label">Categoria</label>
                    <select className="form-select" value={categoriaSeleccionada} onChange={(e) => setCategoriaSeleccionada(e.target.value)}>
                      <option value="">Todas</option>
                      {categorias.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="col-md-8">
                    <label className="form-label">Buscar producto</label>
                    <input type="text" className="form-control" placeholder="Escribe para buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className="row g-3">
              {productosFiltrados.length === 0 ? (
                <div className="col-12"><div className="alert alert-light border">No hay productos con precio configurado para esta sucursal.</div></div>
              ) : (
                productosFiltrados.map((producto) => (
                  <div className="col-md-4 col-xl-3" key={`${producto.id_Producto}-${producto.id_Presentacion ?? 'n'}`}>
                    <div className="card h-100 shadow-sm border-0 product-card" onClick={() => agregarProducto(producto)} style={{ cursor: 'pointer' }}>
                      <div className="card-body d-flex flex-column justify-content-between">
                        <div>
                          <h6 className="mb-2">{producto.nombre}</h6>
                          <div className="text-muted small">{producto.categoria}</div>
                          <div className="fw-semibold mt-2">Venta: L {Number(producto.precio).toFixed(2)}</div>
                          <div className="small text-muted">Costo: L {Number(producto.costo).toFixed(2)}</div>
                        </div>
                        <div className="mt-3"><button className="btn btn-dark w-100" type="button">Agregar</button></div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card shadow-sm border-0 carrito-sticky">
              <div className="card-body">
                <h5 className="mb-3">Cuenta actual</h5>
                <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                  {carrito.length === 0 ? (
                    <div className="text-muted">No hay productos agregados.</div>
                  ) : (
                    carrito.map((item, index) => (
                      <div className="border rounded p-2 mb-2" key={index}>
                        <div className="d-flex justify-content-between align-items-start gap-2">
                          <strong>{item.nombre}</strong>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => quitarItem(index)}>X</button>
                        </div>
                        <div className="row g-2 mt-1">
                          <div className="col-4">
                            <label className="form-label small mb-1">Cant.</label>
                            <input type="number" min="1" className="form-control form-control-sm" value={item.cantidad} onChange={(e) => cambiarCantidad(index, e.target.value)} />
                          </div>
                          <div className="col-4">
                            <label className="form-label small mb-1">Precio</label>
                            <div className="form-control form-control-sm bg-light">{Number(item.precio_Unitario || 0).toFixed(2)}</div>
                          </div>
                          <div className="col-4">
                            <label className="form-label small mb-1">Subt.</label>
                            <div className="form-control form-control-sm bg-light">{Number(item.subtotal || 0).toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <hr />
                <div className="mb-2">
                  <label className="form-label">Metodo de pago</label>
                  <select className="form-select" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                    <option value="EFECTIVO">EFECTIVO</option>
                    <option value="TARJETA">TARJETA</option>
                    <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                    <option value="PEDIDOS_YA">PEDIDOS_YA</option>
                    <option value="DELIVERY_APP">DELIVERY_APP</option>
                  </select>
                </div>

                {facturacionSar?.habilitadoCai && (
                  <div className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="emitirFacturaPos"
                      checked={emitirFactura}
                      onChange={(e) => setEmitirFactura(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="emitirFacturaPos">
                      Emitir factura CAI
                    </label>
                  </div>
                )}

                <div className="row g-2 mb-2">
                  <div className="col-12">
                    <label className="form-label mb-1">Descuento</label>
                    <select className="form-select" value={modoDescuento} onChange={(e) => setModoDescuento(e.target.value)}>
                      {descuentoOpciones.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  {modoDescuento === 'MANUAL' && (
                    <div className="col-12">
                      <input type="number" min="0" step="0.01" className="form-control" value={descuentoManual} onChange={(e) => setDescuentoManual(e.target.value)} placeholder="Monto descuento" />
                    </div>
                  )}
                </div>

                <div className="row g-2 mb-2">
                  <div className="col-12">
                    <label className="form-label mb-1">Impuesto</label>
                    <select className="form-select" value={modoImpuesto} onChange={(e) => setModoImpuesto(e.target.value)}>
                      {impuestoOpciones.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  {modoImpuesto === 'MANUAL' && (
                    <div className="col-12">
                      <input type="number" min="0" step="0.01" className="form-control" value={impuestoManual} onChange={(e) => setImpuestoManual(e.target.value)} placeholder="Monto impuesto" />
                    </div>
                  )}
                </div>

                <div className="bg-dark text-white rounded p-3 mb-3">
                  <div className="d-flex justify-content-between"><span>Subtotal</span><strong>L {subtotal.toFixed(2)}</strong></div>
                  <div className="d-flex justify-content-between"><span>Descuento</span><strong>L {descuentoCalculado.toFixed(2)}</strong></div>
                  <div className="d-flex justify-content-between"><span>Impuesto</span><strong>L {impuestoCalculado.toFixed(2)}</strong></div>
                  {impuestoIncluidoEnSubtotal && <div className="small text-warning">Impuesto incluido en precios (no se suma al total)</div>}
                  <hr className="my-2" />
                  <div className="d-flex justify-content-between"><span>Total</span><strong>L {total.toFixed(2)}</strong></div>
                  <div className="d-flex justify-content-between small mt-2"><span>Costo total</span><strong>L {costoTotal.toFixed(2)}</strong></div>
                  <div className="d-flex justify-content-between small"><span>Utilidad estimada</span><strong>L {utilidadBruta.toFixed(2)}</strong></div>
                </div>

                <div className="d-grid gap-2">
                  <button className="btn btn-success btn-lg" onClick={cobrarVenta} disabled={procesando || carrito.length === 0}>
                    {procesando ? 'Procesando...' : 'Cobrar venta'}
                  </button>
                  <button className="btn btn-outline-secondary" onClick={limpiarCarrito} disabled={carrito.length === 0}>
                    Limpiar cuenta
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VentasPOS;

