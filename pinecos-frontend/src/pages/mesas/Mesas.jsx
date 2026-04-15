import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { imprimirTicketHtml } from '../../utils/printTicket';
import { getUsuario } from '../../utils/auth';

function Mesas() {
  const usuario = getUsuario();
  const esAdmin = String(usuario?.rol || usuario?.Rol || '').toUpperCase() === 'ADMIN';
  const idSucursalUsuario = usuario?.id_Sucursal ?? usuario?.id_sucursal ?? null;
  const [sucursales, setSucursales] = useState([]);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState('');
  const [mesas, setMesas] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);
  const [detalleCuenta, setDetalleCuenta] = useState(null);

  const [formAbrir, setFormAbrir] = useState({ observacion: '' });
  const [formAgregar, setFormAgregar] = useState({
    id_Producto: '',
    id_Presentacion: '',
    cantidad: 1
  });
  const [filtroProducto, setFiltroProducto] = useState('');
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

  const [menuItems, setMenuItems] = useState([]);
  const [cajaActual, setCajaActual] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState(false);

  const limpiarMensajes = () => {
    setMensaje('');
    setError('');
  };

  const cargarSucursales = async () => {
    if (esAdmin) {
      const response = await api.get('/Sucursales', { params: { incluirInactivas: true } });
      setSucursales(response.data || []);
      return;
    }

    if (!idSucursalUsuario) {
      setSucursales([]);
      return;
    }

    setSucursales([
      {
        id_Sucursal: Number(idSucursalUsuario),
        nombre: `Sucursal #${idSucursalUsuario}`
      }
    ]);
  };

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

  const cargarMenu = async (idSucursal) => {
    if (!idSucursal) {
      setMenuItems([]);
      return;
    }

    const response = await api.get(`/Menu/sucursal/${idSucursal}`);
    const normales = (response.data?.normales || []).map((item) => ({
      id_Producto: item.id_Producto,
      id_Presentacion: null,
      nombre: item.producto,
      precio: Number(item.precio || 0),
      costo: Number(item.costo || 0)
    }));

    const conPresentacion = (response.data?.conPresentacion || []).map((item) => ({
      id_Producto: item.id_Producto,
      id_Presentacion: item.id_Presentacion,
      nombre: `${item.producto} - ${item.presentacion || 'Presentacion'}`,
      precio: Number(item.precio || 0),
      costo: Number(item.costo || 0)
    }));

    setMenuItems([...normales, ...conPresentacion].filter((x) => x.precio > 0));
  };

  const cargarAjustesVenta = async (idSucursal) => {
    if (!idSucursal) {
      setAjustesVenta({ descuentos: [], impuestos: [] });
      return;
    }
    const response = await api.get('/AjustesVenta', { params: { idSucursal: Number(idSucursal) } });
    setAjustesVenta({
      descuentos: response.data?.descuentos || [],
      impuestos: response.data?.impuestos || []
    });
  };

  const cargarMesas = async (idSucursal) => {
    if (!idSucursal) return;
    const response = await api.get(`/Mesas/sucursal/${idSucursal}`);
    setMesas(response.data || []);
  };

  const cargarCuentasAbiertas = async () => {
    const response = await api.get('/CuentasMesa/abiertas');
    setCuentas(response.data || []);
  };

  const cargarCanalesConfig = async () => {
    try {
      const response = await api.get('/Cajas/canales-config');
      setMetodosPago((response.data?.metodosPago || []).filter((x) => x.activo));
    } catch {
      setMetodosPago([
        { codigo: 'EFECTIVO', nombre: 'Efectivo', categoria: 'EFECTIVO', activo: true },
        { codigo: 'TARJETA', nombre: 'Tarjeta', categoria: 'POS', activo: true }
      ]);
    }
  };

  const cargarCuentaDetalle = async (idCuenta) => {
    const response = await api.get(`/CuentasMesa/${idCuenta}`);
    setDetalleCuenta(response.data);
  };

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([cargarSucursales(), cargarCajaActual(), cargarCuentasAbiertas(), cargarFacturacionSar()]);
        await cargarCanalesConfig();
        if (!esAdmin && idSucursalUsuario) {
          setSucursalSeleccionada(String(idSucursalUsuario));
        }
      } catch (err) {
        setError(err?.response?.data?.message || 'Error al cargar mesas');
      }
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sucursalSeleccionada) return;
    cargarMesas(sucursalSeleccionada);
    cargarMenu(sucursalSeleccionada);
    cargarAjustesVenta(sucursalSeleccionada);
  }, [sucursalSeleccionada]);

  const menuItemsOrdenados = useMemo(
    () => [...menuItems].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [menuItems]
  );
  const menuItemsFiltrados = useMemo(() => {
    const filtro = filtroProducto.trim().toLowerCase();
    if (!filtro) return menuItemsOrdenados;
    return menuItemsOrdenados.filter((item) => item.nombre.toLowerCase().includes(filtro));
  }, [menuItemsOrdenados, filtroProducto]);

  const menuSeleccionado = useMemo(() => {
    if (!formAgregar.id_Producto) return null;
    return menuItems.find(
      (x) =>
        String(x.id_Producto) === String(formAgregar.id_Producto) &&
        String(x.id_Presentacion ?? '') === String(formAgregar.id_Presentacion ?? '')
    );
  }, [menuItems, formAgregar]);

  const descuentosActivos = useMemo(
    () => (ajustesVenta.descuentos || []).filter((x) => x.activo),
    [ajustesVenta.descuentos]
  );

  const impuestosActivos = useMemo(
    () => (ajustesVenta.impuestos || []).filter((x) => x.activo),
    [ajustesVenta.impuestos]
  );

  useEffect(() => {
    if (!metodosPago.some((x) => x.codigo === metodoPago)) {
      setMetodoPago(metodosPago[0]?.codigo || 'EFECTIVO');
    }
  }, [metodosPago, metodoPago]);

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

  const subtotalCuenta = Number(detalleCuenta?.total || 0);
  const descuentoSeleccionado = descuentosActivos.find((x) => x.codigo === modoDescuento) || null;
  const impuestoSeleccionado = impuestosActivos.find((x) => x.codigo === modoImpuesto) || null;

  const descuentoNum = useMemo(() => {
    if (!descuentoSeleccionado) return 0;
    const tipo = String(descuentoSeleccionado.tipoCalculo || '').toUpperCase();
    const valor = Number(descuentoSeleccionado.valor || 0);
    if (tipo === 'PORCENTAJE') return subtotalCuenta * (valor / 100);
    if (tipo === 'MONTO') return descuentoSeleccionado.permiteEditarMonto ? Number(descuentoManual || 0) : valor;
    return 0;
  }, [descuentoSeleccionado, descuentoManual, subtotalCuenta]);

  const { impuestoNum, impuestoIncluidoEnSubtotal } = useMemo(() => {
    if (!impuestoSeleccionado) return { impuestoNum: 0, impuestoIncluidoEnSubtotal: false };
    const tipo = String(impuestoSeleccionado.tipoCalculo || '').toUpperCase();
    const valor = Number(impuestoSeleccionado.valor || 0);
    if (tipo === 'PORCENTAJE') return { impuestoNum: subtotalCuenta * (valor / 100), impuestoIncluidoEnSubtotal: false };
    if (tipo === 'MONTO') {
      return {
        impuestoNum: impuestoSeleccionado.permiteEditarMonto ? Number(impuestoManual || 0) : valor,
        impuestoIncluidoEnSubtotal: false
      };
    }
    if (tipo === 'INCLUIDO_PORCENTAJE') {
      const imp = subtotalCuenta > 0 ? subtotalCuenta * (valor / (100 + valor)) : 0;
      return { impuestoNum: imp, impuestoIncluidoEnSubtotal: true };
    }
    return { impuestoNum: 0, impuestoIncluidoEnSubtotal: false };
  }, [impuestoSeleccionado, impuestoManual, subtotalCuenta]);

  const subtotalBaseCuenta = subtotalCuenta - (impuestoIncluidoEnSubtotal ? impuestoNum : 0);
  const totalCuenta = subtotalBaseCuenta - descuentoNum + impuestoNum;
  const getCuentaMesa = (idMesa) => cuentas.find((c) => c.id_Mesa === idMesa);
  const mesasActivas = mesas.filter((m) => m.activo);

  const abrirCuenta = async () => {
    limpiarMensajes();
    if (!mesaSeleccionada) return setError('Selecciona una mesa');
    if (getCuentaMesa(mesaSeleccionada.id_Mesa)) return setError('La mesa ya tiene una cuenta abierta');
    try {
      setProcesando(true);
      await api.post('/CuentasMesa/abrir', {
        id_Mesa: mesaSeleccionada.id_Mesa,
        observacion: formAbrir.observacion
      });
      setMensaje('Cuenta abierta correctamente');
      setFormAbrir({ observacion: '' });
      await cargarCuentasAbiertas();
      await cargarMesas(sucursalSeleccionada);
      const response = await api.get('/CuentasMesa/abiertas');
      const cuentaNueva = (response.data || []).find((c) => c.id_Mesa === mesaSeleccionada.id_Mesa);
      if (cuentaNueva) await cargarCuentaDetalle(cuentaNueva.id_Cuenta_Mesa);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al abrir cuenta');
    } finally {
      setProcesando(false);
    }
  };

  const agregarProducto = async () => {
    limpiarMensajes();
    if (!detalleCuenta?.cuenta?.id_Cuenta_Mesa) return setError('No hay cuenta abierta');
    if (!formAgregar.id_Producto) return setError('Selecciona un producto');
    if (!formAgregar.cantidad || Number(formAgregar.cantidad) <= 0) return setError('Cantidad invalida');

    try {
      setProcesando(true);
      await api.post(`/CuentasMesa/${detalleCuenta.cuenta.id_Cuenta_Mesa}/agregar-producto`, {
        id_Producto: Number(formAgregar.id_Producto),
        id_Presentacion: formAgregar.id_Presentacion ? Number(formAgregar.id_Presentacion) : null,
        cantidad: Number(formAgregar.cantidad),
        observacion: ''
      });
      setMensaje('Producto agregado');
      setFormAgregar({ id_Producto: '', id_Presentacion: '', cantidad: 1 });
      await cargarCuentaDetalle(detalleCuenta.cuenta.id_Cuenta_Mesa);
      await cargarCuentasAbiertas();
      await cargarMesas(sucursalSeleccionada);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al agregar producto');
    } finally {
      setProcesando(false);
    }
  };

  const eliminarDetalle = async (idDetalle) => {
    limpiarMensajes();
    try {
      setProcesando(true);
      await api.delete(`/CuentasMesa/detalle/${idDetalle}`);
      setMensaje('Detalle eliminado');
      if (detalleCuenta?.cuenta?.id_Cuenta_Mesa) await cargarCuentaDetalle(detalleCuenta.cuenta.id_Cuenta_Mesa);
      await cargarCuentasAbiertas();
      await cargarMesas(sucursalSeleccionada);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al eliminar detalle');
    } finally {
      setProcesando(false);
    }
  };

  const cobrarCuenta = async () => {
    limpiarMensajes();
    if (!detalleCuenta?.cuenta?.id_Cuenta_Mesa) return setError('No hay cuenta abierta');
    if (!cajaActual?.abierta) return setError('Debes abrir caja primero');
    if (!detalleCuenta.detalles || detalleCuenta.detalles.length === 0) return setError('La cuenta no tiene productos');
    if (descuentoNum < 0 || impuestoNum < 0) return setError('Descuento/impuesto invalidos');
    if (subtotalBaseCuenta < 0) return setError('El subtotal base no puede ser negativo');
    if (totalCuenta < 0) return setError('El total no puede ser negativo');

    try {
      setProcesando(true);
      const response = await api.post(`/CuentasMesa/${detalleCuenta.cuenta.id_Cuenta_Mesa}/cobrar`, {
        id_Caja: cajaActual.id_Caja,
        descuento: descuentoNum,
        impuesto: impuestoNum,
        impuestoIncluidoEnSubtotal,
        emitirFactura: emitirFactura && !!facturacionSar?.habilitadoCai,
        metodo_Pago: metodoPago,
        tipo_Servicio: tipoServicio,
        observacion: `Cobro de mesa | Desc:${modoDescuento} | Imp:${modoImpuesto}`
      });

      const idVenta = response.data.data.id_Venta;
      setMensaje(`Cuenta cobrada. Venta #${idVenta}`);
      await cargarCuentasAbiertas();
      await cargarMesas(sucursalSeleccionada);
      setDetalleCuenta(null);
      setModoDescuento('NINGUNO');
      setDescuentoManual('0');
      setModoImpuesto('INCLUIDO_15');
      setImpuestoManual('0');
      setEmitirFactura(false);
      setMetodoPago('EFECTIVO');
      setTipoServicio('COMER_AQUI');
      await imprimirTicketHtml(idVenta);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al cobrar cuenta');
    } finally {
      setProcesando(false);
    }
  };

  const cancelarCuenta = async () => {
    limpiarMensajes();
    if (!detalleCuenta?.cuenta?.id_Cuenta_Mesa) return setError('No hay cuenta abierta');
    if (!window.confirm('Se cancelara esta cuenta y se eliminaran sus productos. Continuar?')) return;

    try {
      setProcesando(true);
      await api.post(`/CuentasMesa/${detalleCuenta.cuenta.id_Cuenta_Mesa}/cancelar`);
      setMensaje('Cuenta cancelada y mesa liberada correctamente');
      setDetalleCuenta(null);
      setFormAgregar({ id_Producto: '', id_Presentacion: '', cantidad: 1 });
      setFiltroProducto('');
      await cargarCuentasAbiertas();
      await cargarMesas(sucursalSeleccionada);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al cancelar cuenta');
    } finally {
      setProcesando(false);
    }
  };

  const seleccionarMesa = async (mesa) => {
    limpiarMensajes();
    setMesaSeleccionada(mesa);
    setDetalleCuenta(null);
    setModoDescuento('NINGUNO');
    setDescuentoManual('0');
    setModoImpuesto('INCLUIDO_15');
    setImpuestoManual('0');
    setEmitirFactura(false);
    setMetodoPago('EFECTIVO');
    setTipoServicio('COMER_AQUI');
    setFiltroProducto('');
    const cuenta = getCuentaMesa(mesa.id_Mesa);
    if (cuenta) await cargarCuentaDetalle(cuenta.id_Cuenta_Mesa);
  };

  return (
    <div>
      <h2 className="mb-4">Mesas y Cuentas</h2>
      {mensaje && <div className="alert alert-success">{mensaje}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label className="form-label">Sucursal</label>
              <select className="form-select" value={sucursalSeleccionada} onChange={(e) => setSucursalSeleccionada(e.target.value)} disabled={!esAdmin}>
                <option value="">Seleccione</option>
                {sucursales.map((s) => <option key={s.id_Sucursal} value={s.id_Sucursal}>{s.nombre}</option>)}
              </select>
            </div>
            {esAdmin && (
              <div className="col-md-8">
                <div className="alert alert-info mb-0">
                  La configuracion de mesas se hace en Administracion {'>'} Mesas.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-8">
          <div className="card shadow-sm">
            <div className="card-body position-relative" style={{ minHeight: '500px' }}>
              {mesasActivas.map((mesa) => {
                const cuenta = getCuentaMesa(mesa.id_Mesa);
                const color = cuenta ? '#dc3545' : '#198754';
                const borderRadius = mesa.forma === 'CIRCULAR' ? '50%' : '12px';
                return (
                  <div
                    key={mesa.id_Mesa}
                    onClick={() => seleccionarMesa(mesa)}
                    style={{
                      position: 'absolute',
                      left: `${mesa.pos_X}px`,
                      top: `${mesa.pos_Y}px`,
                      width: `${mesa.ancho}px`,
                      height: `${mesa.alto}px`,
                      backgroundColor: color,
                      borderRadius,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      padding: '8px',
                      boxShadow: mesaSeleccionada?.id_Mesa === mesa.id_Mesa ? '0 0 0 4px rgba(13,110,253,.35)' : 'none'
                    }}
                  >
                    <div>
                      <div>{mesa.nombre}</div>
                      <small>{cuenta ? 'OCUPADA' : 'LIBRE'}</small>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body">
              {!mesaSeleccionada ? (
                <p>Selecciona una mesa</p>
              ) : (
                <>
                  <h5>{mesaSeleccionada.nombre}</h5>
                  <p>Capacidad: {mesaSeleccionada.capacidad}</p>
                  {!detalleCuenta ? (
                    <>
                      <h6>Abrir cuenta</h6>
                      <input type="text" className="form-control mb-3" placeholder="Observacion" value={formAbrir.observacion} onChange={(e) => setFormAbrir({ observacion: e.target.value })} />
                      <button className="btn btn-dark w-100" onClick={abrirCuenta} disabled={procesando}>{procesando ? 'Procesando...' : 'Abrir cuenta'}</button>
                    </>
                  ) : (
                    <>
                      <h6>Cuenta #{detalleCuenta.cuenta.id_Cuenta_Mesa}</h6>

                      <div className="position-sticky top-0 bg-white border rounded p-2 mb-3" style={{ zIndex: 10 }}>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <strong>Total actual: L {totalCuenta.toFixed(2)}</strong>
                          <span className={`badge ${cajaActual?.abierta ? 'bg-success' : 'bg-warning text-dark'}`}>
                            {cajaActual?.abierta ? `Caja #${cajaActual.id_Caja} abierta` : 'Caja cerrada'}
                          </span>
                        </div>
                        <div className="d-grid gap-2">
                          <button className="btn btn-success" onClick={cobrarCuenta} disabled={!cajaActual?.abierta || procesando}>
                            {procesando ? 'Procesando...' : 'Cobrar mesa'}
                          </button>
                          <button className="btn btn-outline-danger" onClick={cancelarCuenta} disabled={procesando}>
                            Cancelar cuenta
                          </button>
                        </div>
                      </div>

                      <ul className="list-group mb-3">
                        {detalleCuenta.detalles.length === 0 ? (
                          <li className="list-group-item text-center">Sin productos</li>
                        ) : (
                          detalleCuenta.detalles.map((d) => (
                            <li key={d.id_Detalle_Cuenta_Mesa} className="list-group-item d-flex justify-content-between align-items-start gap-2">
                              <div>
                                <strong>{d.producto}</strong>
                                <div className="small">Cant: {d.cantidad}</div>
                                <div className="small">Precio: L {Number(d.precio_Unitario || 0).toFixed(2)}</div>
                                <div className="small">Subt: L {Number(d.subtotal || 0).toFixed(2)}</div>
                              </div>
                              <button className="btn btn-sm btn-danger" onClick={() => eliminarDetalle(d.id_Detalle_Cuenta_Mesa)} disabled={procesando}>X</button>
                            </li>
                          ))
                        )}
                      </ul>

                      <hr />
                      <h6>Agregar producto</h6>
                      <input
                        type="text"
                        className="form-control mb-2"
                        placeholder="Buscar producto..."
                        value={filtroProducto}
                        onChange={(e) => setFiltroProducto(e.target.value)}
                      />
                      <div className="border rounded mb-2" style={{ maxHeight: 190, overflowY: 'auto' }}>
                        {menuItemsFiltrados.length === 0 ? (
                          <div className="p-2 small text-muted">No hay productos para ese filtro.</div>
                        ) : (
                          menuItemsFiltrados.slice(0, 50).map((item) => {
                            const seleccionado =
                              String(formAgregar.id_Producto) === String(item.id_Producto) &&
                              String(formAgregar.id_Presentacion ?? '') === String(item.id_Presentacion ?? '');
                            return (
                              <button
                                type="button"
                                key={`${item.id_Producto}-${item.id_Presentacion ?? 'n'}`}
                                className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${seleccionado ? 'active' : ''}`}
                                onClick={() => setFormAgregar({
                                  ...formAgregar,
                                  id_Producto: String(item.id_Producto),
                                  id_Presentacion: item.id_Presentacion ? String(item.id_Presentacion) : ''
                                })}
                              >
                                <span className="text-start">{item.nombre}</span>
                                <span className="small">L {Number(item.precio).toFixed(2)}</span>
                              </button>
                            );
                          })
                        )}
                      </div>
                      <input type="number" className="form-control mb-2" placeholder="Cantidad" value={formAgregar.cantidad} min="1" onChange={(e) => setFormAgregar({ ...formAgregar, cantidad: e.target.value })} />
                      <div className="form-control mb-3 bg-light">
                        Precio: L {Number(menuSeleccionado?.precio || 0).toFixed(2)}
                      </div>
                      <button className="btn btn-dark w-100 mb-3" onClick={agregarProducto} disabled={procesando}>Agregar a cuenta</button>

                      <div className="row g-2 mb-2">
                        <div className="col-12">
                          <label className="form-label mb-1">Metodo de pago</label>
                          <select className="form-select" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                            {metodosPago.map((m) => (
                              <option key={m.codigo} value={m.codigo}>{m.nombre}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-12">
                          <label className="form-label mb-1">Tipo de servicio</label>
                          <select className="form-select" value={tipoServicio} onChange={(e) => setTipoServicio(e.target.value)}>
                            <option value="COMER_AQUI">Comer aqui</option>
                            <option value="LLEVAR">Para llevar</option>
                          </select>
                        </div>
                        {facturacionSar?.habilitadoCai && (
                          <div className="col-12">
                            <div className={`alert py-2 mb-0 ${facturacionSar.facturasRestantes > 0 ? 'alert-info' : 'alert-danger'}`}>
                              Facturas CAI restantes: <strong>{Number(facturacionSar.facturasRestantes || 0)}</strong>
                            </div>
                          </div>
                        )}
                        {facturacionSar?.habilitadoCai && (
                          <div className="col-12">
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="emitirFacturaMesa"
                                checked={emitirFactura}
                                onChange={(e) => setEmitirFactura(e.target.checked)}
                              />
                              <label className="form-check-label" htmlFor="emitirFacturaMesa">
                                Emitir factura CAI
                              </label>
                            </div>
                          </div>
                        )}
                        <div className="col-12">
                          <label className="form-label mb-1">Descuento</label>
                          <select className="form-select" value={modoDescuento} onChange={(e) => setModoDescuento(e.target.value)}>
                            {descuentosActivos.map((opt) => <option key={opt.codigo} value={opt.codigo}>{opt.nombre}</option>)}
                          </select>
                        </div>
                        {descuentoSeleccionado?.permiteEditarMonto && (
                          <div className="col-12">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="form-control"
                              value={descuentoManual}
                              onChange={(e) => setDescuentoManual(e.target.value)}
                              placeholder="Monto descuento"
                            />
                          </div>
                        )}
                        <div className="col-12">
                          <label className="form-label mb-1">Impuesto</label>
                          <select className="form-select" value={modoImpuesto} onChange={(e) => setModoImpuesto(e.target.value)}>
                            {impuestosActivos.map((opt) => <option key={opt.codigo} value={opt.codigo}>{opt.nombre}</option>)}
                          </select>
                        </div>
                        {impuestoSeleccionado?.permiteEditarMonto && (
                          <div className="col-12">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="form-control"
                              value={impuestoManual}
                              onChange={(e) => setImpuestoManual(e.target.value)}
                              placeholder="Monto impuesto"
                            />
                          </div>
                        )}
                      </div>

                      <div className="bg-dark text-white rounded p-3 mb-3">
                        <div className="d-flex justify-content-between"><span>Subtotal base</span><strong>L {subtotalBaseCuenta.toFixed(2)}</strong></div>
                        <div className="d-flex justify-content-between"><span>Descuento</span><strong>L {descuentoNum.toFixed(2)}</strong></div>
                        <div className="d-flex justify-content-between"><span>Impuesto</span><strong>L {impuestoNum.toFixed(2)}</strong></div>
                        {impuestoIncluidoEnSubtotal && <div className="small text-warning">Impuesto incluido en precios (no se suma al total)</div>}
                        <hr className="my-2" />
                        <div className="d-flex justify-content-between"><span>Total</span><strong>L {totalCuenta.toFixed(2)}</strong></div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Mesas;
