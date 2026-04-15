import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { imprimirTicketHtml } from '../../utils/printTicket';
import { getUsuario } from '../../utils/auth';

function VentasPOS() {
  const usuario = getUsuario();
  const idSucursalUsuario = usuario?.id_Sucursal ?? usuario?.id_sucursal ?? null;

  const [cajaActual, setCajaActual] = useState(null);
  const [productos, setProductos] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [tipoServicio, setTipoServicio] = useState('COMER_AQUI');
  const [metodosPago, setMetodosPago] = useState([]);
  const [modoDescuento, setModoDescuento] = useState('NINGUNO');
  const [descuentoManual, setDescuentoManual] = useState('0');
  const [modoImpuesto, setModoImpuesto] = useState('INCLUIDO_15');
  const [impuestoManual, setImpuestoManual] = useState('0');
  const [ajustesVenta, setAjustesVenta] = useState({ descuentos: [], impuestos: [] });
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

  const cargarAjustesVenta = async () => {
    if (!idSucursalUsuario) return;
    const response = await api.get('/AjustesVenta', { params: { idSucursal: Number(idSucursalUsuario) } });
    setAjustesVenta({
      descuentos: response.data?.descuentos || [],
      impuestos: response.data?.impuestos || []
    });
  };

  const cargarCanalesConfig = async () => {
    try {
      const response = await api.get('/Cajas/canales-config');
      setMetodosPago((response.data?.metodosPago || []).filter((x) => x.activo));
    } catch {
      setMetodosPago([
        { codigo: 'EFECTIVO', nombre: 'Efectivo', categoria: 'EFECTIVO', activo: true },
        { codigo: 'TARJETA', nombre: 'Tarjeta', categoria: 'POS', activo: true },
        { codigo: 'TRANSFERENCIA', nombre: 'Transferencia', categoria: 'OTRO', activo: true }
      ]);
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
      precio: Number(item.precio || 0)
    }));

    const conPresentacion = (response.data?.conPresentacion || []).map((item) => ({
      id_Producto: item.id_Producto,
      id_Presentacion: item.id_Presentacion,
      nombre: `${item.producto} - ${item.presentacion || 'Presentacion'}`,
      categoria: item.categoria || 'Sin categoria',
      precio: Number(item.precio || 0)
    }));

    setProductos([...normales, ...conPresentacion].filter((x) => x.precio > 0));
  };

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([cargarCajaActual(), cargarMenuSucursal(), cargarFacturacionSar(), cargarAjustesVenta()]);
        await cargarCanalesConfig();
      } catch (err) {
        setError(err?.response?.data?.message || 'Error al cargar POS');
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!metodosPago.some((x) => x.codigo === metodoPago)) {
      setMetodoPago(metodosPago[0]?.codigo || 'EFECTIVO');
    }
  }, [metodosPago, metodoPago]);

  const categorias = useMemo(() => {
    const unique = [...new Set(productos.map((p) => p.categoria).filter(Boolean))];
    return unique.sort((a, b) => a.localeCompare(b));
  }, [productos]);

  const descuentosActivos = useMemo(
    () => (ajustesVenta.descuentos || []).filter((x) => x.activo),
    [ajustesVenta.descuentos]
  );

  const impuestosActivos = useMemo(
    () => (ajustesVenta.impuestos || []).filter((x) => x.activo),
    [ajustesVenta.impuestos]
  );

  useEffect(() => {
    if (!descuentosActivos.some((x) => x.codigo === modoDescuento)) {
      setModoDescuento(descuentosActivos[0]?.codigo || 'NINGUNO');
      setDescuentoManual('0');
    }
  }, [descuentosActivos, modoDescuento]);

  useEffect(() => {
    if (!impuestosActivos.some((x) => x.codigo === modoImpuesto)) {
      setModoImpuesto(impuestosActivos[0]?.codigo || 'INCLUIDO_15');
      setImpuestoManual('0');
    }
  }, [impuestosActivos, modoImpuesto]);

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
    setTipoServicio('COMER_AQUI');
  };

  const subtotal = carrito.reduce((acc, item) => acc + Number(item.subtotal || 0), 0);

  const descuentoSeleccionado = descuentosActivos.find((x) => x.codigo === modoDescuento) || null;
  const impuestoSeleccionado = impuestosActivos.find((x) => x.codigo === modoImpuesto) || null;

  const descuentoCalculado = useMemo(() => {
    if (!descuentoSeleccionado) return 0;
    const tipo = String(descuentoSeleccionado.tipoCalculo || '').toUpperCase();
    const valor = Number(descuentoSeleccionado.valor || 0);
    if (tipo === 'PORCENTAJE') return subtotal * (valor / 100);
    if (tipo === 'MONTO') return descuentoSeleccionado.permiteEditarMonto ? Number(descuentoManual || 0) : valor;
    return 0;
  }, [descuentoSeleccionado, descuentoManual, subtotal]);

  const { impuestoCalculado, impuestoIncluidoEnSubtotal } = useMemo(() => {
    if (!impuestoSeleccionado) return { impuestoCalculado: 0, impuestoIncluidoEnSubtotal: false };
    const tipo = String(impuestoSeleccionado.tipoCalculo || '').toUpperCase();
    const valor = Number(impuestoSeleccionado.valor || 0);
    if (tipo === 'PORCENTAJE') return { impuestoCalculado: subtotal * (valor / 100), impuestoIncluidoEnSubtotal: false };
    if (tipo === 'MONTO') {
      return {
        impuestoCalculado: impuestoSeleccionado.permiteEditarMonto ? Number(impuestoManual || 0) : valor,
        impuestoIncluidoEnSubtotal: false
      };
    }
    if (tipo === 'INCLUIDO_PORCENTAJE') {
      const imp = subtotal > 0 ? subtotal * (valor / (100 + valor)) : 0;
      return { impuestoCalculado: imp, impuestoIncluidoEnSubtotal: true };
    }
    return { impuestoCalculado: 0, impuestoIncluidoEnSubtotal: false };
  }, [impuestoSeleccionado, impuestoManual, subtotal]);

  const subtotalBase = subtotal - (impuestoIncluidoEnSubtotal ? impuestoCalculado : 0);
  const total = subtotalBase - descuentoCalculado + impuestoCalculado;

  const cobrarVenta = async () => {
    limpiarMensajes();
    if (!cajaActual?.abierta) return setError('No hay caja abierta');
    if (carrito.length === 0) return setError('Agrega productos al carrito');
    if (descuentoCalculado < 0 || impuestoCalculado < 0) return setError('Descuento e impuesto no pueden ser negativos');
    if (subtotalBase < 0) return setError('El subtotal base no puede ser negativo');
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
        tipo_Servicio: tipoServicio,
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
      setTipoServicio('COMER_AQUI');
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
        <div className="row g-4 pos-layout-row">
          <div className="col-xl-7 col-lg-7">
            <div className="card shadow-sm border-0 mb-4 pos-catalog-card">
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
                        </div>
                        <div className="mt-3"><button className="btn btn-dark w-100" type="button">Agregar</button></div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="col-xl-5 col-lg-5">
            <div className="card shadow-sm border-0 carrito-sticky pos-order-card">
              <div className="card-body">
                <h5 className="mb-3">Cuenta actual</h5>
                <div className="bg-white border rounded p-2 mb-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <strong>Total: L {total.toFixed(2)}</strong>
                    <span className="small text-muted">{carrito.length} item(s)</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mt-1">
                    <span className={`badge ${cajaActual?.abierta ? 'bg-success' : 'bg-warning text-dark'}`}>
                      {cajaActual?.abierta ? `Caja #${cajaActual.id_Caja} abierta` : 'Caja cerrada'}
                    </span>
                  </div>
                  <div className="d-grid gap-2 mt-2">
                    <button className="btn btn-success" onClick={cobrarVenta} disabled={procesando || carrito.length === 0}>
                      {procesando ? 'Procesando...' : 'Cobrar venta'}
                    </button>
                    <button className="btn btn-outline-secondary" onClick={limpiarCarrito} disabled={carrito.length === 0}>
                      Limpiar cuenta
                    </button>
                  </div>
                </div>

                <div className="order-items-scroll">
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
                    {metodosPago.map((m) => (
                      <option key={m.codigo} value={m.codigo}>{m.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-2">
                  <label className="form-label">Tipo de servicio</label>
                  <select className="form-select" value={tipoServicio} onChange={(e) => setTipoServicio(e.target.value)}>
                    <option value="COMER_AQUI">Comer aqui</option>
                    <option value="LLEVAR">Para llevar</option>
                  </select>
                </div>

                {facturacionSar?.habilitadoCai && (
                  <div className={`alert py-2 ${facturacionSar.facturasRestantes > 0 ? 'alert-info' : 'alert-danger'}`}>
                    Facturas CAI restantes: <strong>{Number(facturacionSar.facturasRestantes || 0)}</strong>
                  </div>
                )}

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
                      {descuentosActivos.map((opt) => <option key={opt.codigo} value={opt.codigo}>{opt.nombre}</option>)}
                    </select>
                  </div>
                  {descuentoSeleccionado?.permiteEditarMonto && (
                    <div className="col-12">
                      <input type="number" min="0" step="0.01" className="form-control" value={descuentoManual} onChange={(e) => setDescuentoManual(e.target.value)} placeholder="Monto descuento" />
                    </div>
                  )}
                </div>

                <div className="row g-2 mb-2">
                  <div className="col-12">
                    <label className="form-label mb-1">Impuesto</label>
                    <select className="form-select" value={modoImpuesto} onChange={(e) => setModoImpuesto(e.target.value)}>
                      {impuestosActivos.map((opt) => <option key={opt.codigo} value={opt.codigo}>{opt.nombre}</option>)}
                    </select>
                  </div>
                  {impuestoSeleccionado?.permiteEditarMonto && (
                    <div className="col-12">
                      <input type="number" min="0" step="0.01" className="form-control" value={impuestoManual} onChange={(e) => setImpuestoManual(e.target.value)} placeholder="Monto impuesto" />
                    </div>
                  )}
                </div>

                <div className="bg-dark text-white rounded p-3 mb-3">
                  <div className="d-flex justify-content-between"><span>Subtotal base</span><strong>L {subtotalBase.toFixed(2)}</strong></div>
                  <div className="d-flex justify-content-between"><span>Descuento</span><strong>L {descuentoCalculado.toFixed(2)}</strong></div>
                  <div className="d-flex justify-content-between"><span>Impuesto</span><strong>L {impuestoCalculado.toFixed(2)}</strong></div>
                  {impuestoIncluidoEnSubtotal && <div className="small text-warning">Impuesto incluido en precios (no se suma al total)</div>}
                  <hr className="my-2" />
                  <div className="d-flex justify-content-between"><span>Total</span><strong>L {total.toFixed(2)}</strong></div>
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

