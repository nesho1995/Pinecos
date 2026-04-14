import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { imprimirTicketHtml } from '../../utils/printTicket';
import { getUsuario } from '../../utils/auth';

const mesaFormInicial = {
  nombre: '',
  capacidad: 2,
  forma: 'RECTANGULAR',
  pos_X: 30,
  pos_Y: 30,
  ancho: 120,
  alto: 70,
  activo: true
};

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
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [modoDescuento, setModoDescuento] = useState('NINGUNO');
  const [descuentoManual, setDescuentoManual] = useState('0');
  const [modoImpuesto, setModoImpuesto] = useState('INCLUIDO_15');
  const [impuestoManual, setImpuestoManual] = useState('0');
  const [ajustesVenta, setAjustesVenta] = useState({ descuentos: [], impuestos: [] });
  const [facturacionSar, setFacturacionSar] = useState({ habilitadoCai: false });
  const [emitirFactura, setEmitirFactura] = useState(false);

  const [mesaForm, setMesaForm] = useState(mesaFormInicial);
  const [mesaEditandoId, setMesaEditandoId] = useState(null);

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

  const cargarCuentaDetalle = async (idCuenta) => {
    const response = await api.get(`/CuentasMesa/${idCuenta}`);
    setDetalleCuenta(response.data);
  };

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([cargarSucursales(), cargarCajaActual(), cargarCuentasAbiertas(), cargarFacturacionSar()]);
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
  const costoTotalCuenta = (detalleCuenta?.detalles || []).reduce(
    (acc, item) => acc + Number(item.costo_Unitario || 0) * Number(item.cantidad || 0),
    0
  );
  const utilidadCuenta = totalCuenta - costoTotalCuenta;

  const getCuentaMesa = (idMesa) => cuentas.find((c) => c.id_Mesa === idMesa);
  const mesasActivas = mesas.filter((m) => m.activo);

  const seSobreponen = (a, b, margen = 14) => {
    return !(
      a.x + a.w + margen <= b.x ||
      b.x + b.w + margen <= a.x ||
      a.y + a.h + margen <= b.y ||
      b.y + b.h + margen <= a.y
    );
  };

  const calcularPosicionLibre = (anchoMesa, altoMesa, idMesaEdicion = null) => {
    const anchoLienzo = 920;
    const altoLienzo = 520;
    const pasoX = 28;
    const pasoY = 24;
    const inicioX = 20;
    const inicioY = 20;

    const ocupadas = mesas
      .filter((m) => m.activo && m.id_Mesa !== idMesaEdicion)
      .map((m) => ({
        x: Number(m.pos_X || 0),
        y: Number(m.pos_Y || 0),
        w: Number(m.ancho || 120),
        h: Number(m.alto || 70)
      }));

    for (let y = inicioY; y <= altoLienzo - altoMesa - 10; y += pasoY) {
      for (let x = inicioX; x <= anchoLienzo - anchoMesa - 10; x += pasoX) {
        const candidata = { x, y, w: anchoMesa, h: altoMesa };
        const colisiona = ocupadas.some((o) => seSobreponen(candidata, o));
        if (!colisiona) return { x, y };
      }
    }

    return { x: inicioX, y: inicioY };
  };

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
      await imprimirTicketHtml(idVenta);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al cobrar cuenta');
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
    const cuenta = getCuentaMesa(mesa.id_Mesa);
    if (cuenta) await cargarCuentaDetalle(cuenta.id_Cuenta_Mesa);
  };

  const handleMesaFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setMesaForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const guardarMesa = async (e) => {
    e.preventDefault();
    limpiarMensajes();
    if (!sucursalSeleccionada) return setError('Selecciona una sucursal');
    if (!mesaForm.nombre.trim()) return setError('Nombre de mesa requerido');
    try {
      const payload = {
        id_Sucursal: Number(sucursalSeleccionada),
        nombre: mesaForm.nombre.trim(),
        capacidad: Number(mesaForm.capacidad || 0),
        forma: mesaForm.forma,
        pos_X: Number(mesaForm.pos_X || 0),
        pos_Y: Number(mesaForm.pos_Y || 0),
        ancho: Number(mesaForm.ancho || 120),
        alto: Number(mesaForm.alto || 70),
        activo: true
      };

      if (mesaEditandoId) {
        const posicion = calcularPosicionLibre(payload.ancho, payload.alto, mesaEditandoId);
        payload.pos_X = posicion.x;
        payload.pos_Y = posicion.y;
        await api.put(`/Mesas/${mesaEditandoId}`, payload);
        setMensaje('Mesa actualizada correctamente (reubicada automaticamente para evitar choques)');
      } else {
        const posicion = calcularPosicionLibre(payload.ancho, payload.alto);
        payload.pos_X = posicion.x;
        payload.pos_Y = posicion.y;
        await api.post('/Mesas', payload);
        setMensaje(`Mesa creada correctamente en posicion X:${payload.pos_X} Y:${payload.pos_Y}`);
      }

      setMesaForm(mesaFormInicial);
      setMesaEditandoId(null);
      await cargarMesas(sucursalSeleccionada);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al guardar mesa');
    }
  };

  const editarMesa = (mesa) => {
    setMesaEditandoId(mesa.id_Mesa);
    setMesaForm({
      nombre: mesa.nombre || '',
      capacidad: mesa.capacidad || 2,
      forma: mesa.forma || 'RECTANGULAR',
      pos_X: mesa.pos_X || 0,
      pos_Y: mesa.pos_Y || 0,
      ancho: mesa.ancho || 120,
      alto: mesa.alto || 70,
      activo: mesa.activo ?? true
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
          </div>
        </div>
      </div>

      {sucursalSeleccionada && esAdmin && (
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h5 className="mb-3">{mesaEditandoId ? `Editar mesa #${mesaEditandoId}` : 'Agregar mesa a sucursal'}</h5>
            <form onSubmit={guardarMesa} className="row g-2">
              <div className="col-md-2">
                <input className="form-control" name="nombre" value={mesaForm.nombre} onChange={handleMesaFormChange} placeholder="Nombre" />
              </div>
              <div className="col-md-1">
                <input className="form-control" type="number" name="capacidad" value={mesaForm.capacidad} onChange={handleMesaFormChange} placeholder="Cap." />
              </div>
              <div className="col-md-2">
                <select className="form-select" name="forma" value={mesaForm.forma} onChange={handleMesaFormChange}>
                  <option value="RECTANGULAR">RECTANGULAR</option>
                  <option value="CIRCULAR">CIRCULAR</option>
                </select>
              </div>
              <div className="col-md-1">
                <input className="form-control" type="number" name="pos_X" value={mesaForm.pos_X} onChange={handleMesaFormChange} placeholder="X" />
              </div>
              <div className="col-md-1">
                <input className="form-control" type="number" name="pos_Y" value={mesaForm.pos_Y} onChange={handleMesaFormChange} placeholder="Y" />
              </div>
              <div className="col-md-1">
                <input className="form-control" type="number" name="ancho" value={mesaForm.ancho} onChange={handleMesaFormChange} placeholder="Ancho" />
              </div>
              <div className="col-md-1">
                <input className="form-control" type="number" name="alto" value={mesaForm.alto} onChange={handleMesaFormChange} placeholder="Alto" />
              </div>
              <div className="col-md-2 d-flex gap-2">
                <button className="btn btn-dark w-100" type="submit">{mesaEditandoId ? 'Actualizar' : 'Crear'}</button>
                <button className="btn btn-outline-secondary w-100" type="button" onClick={() => { setMesaForm(mesaFormInicial); setMesaEditandoId(null); }}>
                  Limpiar
                </button>
              </div>
            </form>

            <div className="table-responsive mt-3">
              <table className="table table-bordered align-middle">
                <thead>
                  <tr>
                    <th>Codigo</th><th>Nombre</th><th>Cap.</th><th>Forma</th><th>Posicion</th><th>Tamano</th><th>Estado</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {mesas.map((m) => (
                    <tr key={m.id_Mesa}>
                      <td>{m.id_Mesa}</td>
                      <td>{m.nombre}</td>
                      <td>{m.capacidad}</td>
                      <td>{m.forma}</td>
                      <td>({m.pos_X},{m.pos_Y})</td>
                      <td>{m.ancho}x{m.alto}</td>
                      <td><span className={`status-pill ${m.activo ? 'active' : 'inactive'}`}>{m.activo ? 'Activa' : 'Inactiva'}</span></td>
                      <td>
                        <div className="d-flex gap-2">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => editarMesa(m)}>Editar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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
                                <div className="small">Costo: L {Number(d.costo_Unitario || 0).toFixed(2)}</div>
                                <div className="small">Subt: L {Number(d.subtotal || 0).toFixed(2)}</div>
                              </div>
                              <button className="btn btn-sm btn-danger" onClick={() => eliminarDetalle(d.id_Detalle_Cuenta_Mesa)} disabled={procesando}>X</button>
                            </li>
                          ))
                        )}
                      </ul>

                      <hr />
                      <h6>Agregar producto</h6>
                      <select
                        className="form-select mb-2"
                        value={`${formAgregar.id_Producto}|${formAgregar.id_Presentacion}`}
                        onChange={(e) => {
                          const [idProducto, idPresentacion] = e.target.value.split('|');
                          setFormAgregar({ ...formAgregar, id_Producto: idProducto || '', id_Presentacion: idPresentacion || '' });
                        }}
                      >
                        <option value="|">Producto</option>
                        {menuItemsOrdenados.map((item) => (
                          <option key={`${item.id_Producto}-${item.id_Presentacion ?? 'n'}`} value={`${item.id_Producto}|${item.id_Presentacion ?? ''}`}>
                            {item.nombre} - L {Number(item.precio).toFixed(2)}
                          </option>
                        ))}
                      </select>
                      <input type="number" className="form-control mb-2" placeholder="Cantidad" value={formAgregar.cantidad} min="1" onChange={(e) => setFormAgregar({ ...formAgregar, cantidad: e.target.value })} />
                      <div className="form-control mb-3 bg-light">
                        Precio: L {Number(menuSeleccionado?.precio || 0).toFixed(2)} | Costo: L {Number(menuSeleccionado?.costo || 0).toFixed(2)}
                      </div>
                      <button className="btn btn-dark w-100 mb-3" onClick={agregarProducto} disabled={procesando}>Agregar a cuenta</button>

                      <div className="row g-2 mb-2">
                        <div className="col-12">
                          <label className="form-label mb-1">Metodo de pago</label>
                          <select className="form-select" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                            <option value="EFECTIVO">EFECTIVO</option>
                            <option value="TARJETA">TARJETA</option>
                            <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                            <option value="PEDIDOS_YA">PEDIDOS_YA</option>
                            <option value="DELIVERY_APP">DELIVERY_APP</option>
                          </select>
                        </div>
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
                        <div className="d-flex justify-content-between small mt-2"><span>Costo total</span><strong>L {costoTotalCuenta.toFixed(2)}</strong></div>
                        <div className="d-flex justify-content-between small"><span>Utilidad estimada</span><strong>L {utilidadCuenta.toFixed(2)}</strong></div>
                      </div>

                      <button className="btn btn-success w-100" onClick={cobrarCuenta} disabled={!cajaActual?.abierta || procesando}>
                        {procesando ? 'Procesando...' : 'Cobrar mesa'}
                      </button>
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



