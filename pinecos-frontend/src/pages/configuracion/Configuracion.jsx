import { useEffect, useState } from 'react';
import api from '../../services/api';

function Configuracion() {
  const [form, setForm] = useState({
    id_Configuracion: 0,
    nombre_Negocio: '',
    direccion: '',
    telefono: '',
    rtn: '',
    mensaje_Ticket: '',
    ancho_Ticket: '80mm',
    logo_Url: '',
    moneda: 'L',
    activo: true
  });

  const [sarForm, setSarForm] = useState({
    habilitadoCai: false,
    cai: '',
    rangoInicio: '',
    rangoFin: '',
    siguienteCorrelativo: '',
    fechaLimiteEmision: '',
    leyendaSar: '',
    permitirVentaSinFactura: true,
    nombreImprenta: '',
    rtnImprenta: '',
    numeroCertificadoImprenta: '',
    correoNegocioFactura: '',
    clientePorDefecto: 'CONSUMIDOR FINAL',
    rtnClientePorDefecto: '',
    direccionClientePorDefecto: '',
    ciudadFechaFactura: '',
    pieFactura: 'La factura es beneficio de todos. Exijala.',
    facturasRestantes: 0,
    caiVencido: false
  });

  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [sucursales, setSucursales] = useState([]);
  const [sucursalSar, setSucursalSar] = useState('');
  const [listaSar, setListaSar] = useState([]);
  const [canalesForm, setCanalesForm] = useState({
    pos: ['POS 1', 'Transferencia'],
    delivery: ['PEDIDOS_YA'],
    metodosPago: [
      { codigo: 'EFECTIVO', nombre: 'Efectivo', categoria: 'EFECTIVO', activo: true },
      { codigo: 'POS_1', nombre: 'POS 1', categoria: 'POS', activo: true },
      { codigo: 'TRANSFERENCIA', nombre: 'Transferencia', categoria: 'POS', activo: true },
      { codigo: 'PEDIDOS_YA', nombre: 'Pedidos Ya', categoria: 'DELIVERY', activo: true }
    ],
    requiereMontoEnTodos: true
  });
  const [ajustesVentaForm, setAjustesVentaForm] = useState({
    descuentos: [],
    impuestos: []
  });
  const [tabConfig, setTabConfig] = useState('negocio');

  const cargarSucursales = async () => {
    try {
      const res = await api.get('/Sucursales', { params: { incluirInactivas: true } });
      const data = res.data || [];
      setSucursales(data);
      if (!sucursalSar && data.length > 0) setSucursalSar(String(data[0].id_Sucursal));
      return data;
    } catch {
      setSucursales([]);
      return [];
    }
  };

  const cargarConfiguracionSucursal = async (idSucursal) => {
    if (!idSucursal) return;
    const configRes = await api.get('/Configuracion', { params: { idSucursal: Number(idSucursal) } });
    const data = configRes.data || {};
    setForm({
      id_Configuracion: data.id_Configuracion || 0,
      nombre_Negocio: data.nombre_Negocio || '',
      direccion: data.direccion || '',
      telefono: data.telefono || '',
      rtn: data.rtn || '',
      mensaje_Ticket: data.mensaje_Ticket || '',
      ancho_Ticket: data.ancho_Ticket || '80mm',
      logo_Url: data.logo_Url || '',
      moneda: data.moneda || 'L',
      activo: data.activo ?? true
    });
  };

  const cargarSarLista = async () => {
    try {
      const res = await api.get('/FacturacionSar/lista');
      setListaSar(res.data || []);
    } catch {
      setListaSar([]);
    }
  };

  const cargarSarSucursal = async (idSucursal) => {
    if (!idSucursal) return;
    const sarRes = await api.get('/FacturacionSar', { params: { idSucursal: Number(idSucursal) } });
    const data = sarRes.data || {};
    setSarForm({
      habilitadoCai: !!data.habilitadoCai,
      cai: data.cai || '',
      rangoInicio: data.rangoInicio || '',
      rangoFin: data.rangoFin || '',
      siguienteCorrelativo: data.siguienteCorrelativo ?? '',
      fechaLimiteEmision: data.fechaLimiteEmision ? String(data.fechaLimiteEmision).slice(0, 10) : '',
      leyendaSar: data.leyendaSar || '',
      permitirVentaSinFactura: data.permitirVentaSinFactura ?? true,
      nombreImprenta: data.nombreImprenta || '',
      rtnImprenta: data.rtnImprenta || '',
      numeroCertificadoImprenta: data.numeroCertificadoImprenta || '',
      correoNegocioFactura: data.correoNegocioFactura || '',
      clientePorDefecto: data.clientePorDefecto || 'CONSUMIDOR FINAL',
      rtnClientePorDefecto: data.rtnClientePorDefecto || '',
      direccionClientePorDefecto: data.direccionClientePorDefecto || '',
      ciudadFechaFactura: data.ciudadFechaFactura || '',
      pieFactura: data.pieFactura || 'La factura es beneficio de todos. Exijala.',
      facturasRestantes: Number(data.facturasRestantes || 0),
      caiVencido: !!data.caiVencido
    });
  };

  const cargarCanalesSucursal = async (idSucursal) => {
    if (!idSucursal) return;
    const res = await api.get('/Cajas/canales-config', { params: { idSucursal: Number(idSucursal) } });
    const data = res.data || {};
    setCanalesForm({
      pos: data.pos || ['POS 1', 'Transferencia'],
      delivery: data.delivery || ['PEDIDOS_YA'],
      metodosPago: data.metodosPago || [
        { codigo: 'EFECTIVO', nombre: 'Efectivo', categoria: 'EFECTIVO', activo: true },
        { codigo: 'POS_1', nombre: 'POS 1', categoria: 'POS', activo: true },
        { codigo: 'TRANSFERENCIA', nombre: 'Transferencia', categoria: 'POS', activo: true },
        { codigo: 'PEDIDOS_YA', nombre: 'Pedidos Ya', categoria: 'DELIVERY', activo: true }
      ],
      requiereMontoEnTodos: data.requiereMontoEnTodos ?? true
    });
  };

  const cargarAjustesVentaSucursal = async (idSucursal) => {
    if (!idSucursal) return;
    const res = await api.get('/AjustesVenta', { params: { idSucursal: Number(idSucursal) } });
    const data = res.data || {};
    setAjustesVentaForm({
      descuentos: data.descuentos || [],
      impuestos: data.impuestos || []
    });
  };

  const cargarConfiguracion = async () => {
    try {
      const sucursalesData = await cargarSucursales();
      const sucursalInicial = sucursalSar || (sucursalesData[0] ? String(sucursalesData[0].id_Sucursal) : '');
      if (sucursalInicial) await cargarConfiguracionSucursal(sucursalInicial);
      await cargarSarLista();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al cargar configuracion');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSarChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSarForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const guardarConfiguracion = async (e) => {
    e.preventDefault();
    setMensaje('');
    setError('');

    try {
      const idSucursal = Number(sucursalSar || 0);
      if (!idSucursal) return setError('Selecciona una sucursal');
      await api.put('/Configuracion', form, { params: { idSucursal } });
      await cargarConfiguracionSucursal(idSucursal);
      setMensaje('Configuracion por sucursal guardada correctamente');
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al guardar configuracion de sucursal');
    }
  };

  const guardarFacturacionSar = async (e) => {
    e.preventDefault();
    setMensaje('');
    setError('');

    try {
      if (sarForm.habilitadoCai) {
        const soloDigitos = (v) => String(v || '').replace(/\D/g, '');
        if (String(sarForm.cai || '').trim().length < 14) {
          return setError('SAR/CAI: ingresa un CAI valido.');
        }
        if (!String(sarForm.rangoInicio || '').trim() || !String(sarForm.rangoFin || '').trim()) {
          return setError('SAR/CAI: debes completar rango inicio y rango fin.');
        }
        if (!sarForm.fechaLimiteEmision) {
          return setError('SAR/CAI: la fecha limite de emision es obligatoria.');
        }
        if (String(sarForm.nombreImprenta || '').trim().length < 3) {
          return setError('SAR/CAI: nombre de imprenta/proveedor es obligatorio (minimo 3 caracteres).');
        }
        if (soloDigitos(sarForm.rtnImprenta).length !== 14) {
          return setError('SAR/CAI: RTN de imprenta/proveedor debe tener 14 digitos.');
        }
        if (String(sarForm.numeroCertificadoImprenta || '').trim().length < 3) {
          return setError('SAR/CAI: numero de registro/certificado es obligatorio.');
        }
        if (String(sarForm.ciudadFechaFactura || '').trim().length < 2) {
          return setError('SAR/CAI: ciudad para fecha de factura es obligatoria.');
        }
      }

      const payload = {
        ...sarForm,
        siguienteCorrelativo: sarForm.siguienteCorrelativo === '' ? null : Number(sarForm.siguienteCorrelativo),
        fechaLimiteEmision: sarForm.fechaLimiteEmision || null
      };

      const idSucursal = Number(sucursalSar || 0);
      if (!idSucursal) return setError('Selecciona una sucursal para configurar SAR');

      await api.put('/FacturacionSar', payload, {
        params: { idSucursal }
      });
      await cargarSarLista();
      await cargarSarSucursal(idSucursal);
      setMensaje('Configuracion SAR guardada correctamente');
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al guardar configuracion SAR');
    }
  };

  const updateMetodoPago = (index, field, value) => {
    setCanalesForm((prev) => {
      const list = [...(prev.metodosPago || [])];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, metodosPago: list };
    });
  };

  const addMetodoPago = () => {
    setCanalesForm((prev) => ({
      ...prev,
      metodosPago: [
        ...(prev.metodosPago || []),
        { codigo: `METODO_${Date.now()}`, nombre: '', categoria: 'OTRO', activo: true }
      ]
    }));
  };

  const removeMetodoPago = (index) => {
    setCanalesForm((prev) => {
      const list = (prev.metodosPago || []).filter((_, i) => i !== index);
      return { ...prev, metodosPago: list.length ? list : [{ codigo: 'EFECTIVO', nombre: 'Efectivo', categoria: 'EFECTIVO', activo: true }] };
    });
  };

  const guardarCanalesCuadre = async (e) => {
    e.preventDefault();
    setMensaje('');
    setError('');
    const idSucursal = Number(sucursalSar || 0);
    if (!idSucursal) return setError('Selecciona una sucursal');

    const dedupe = (list) => {
      const seen = new Set();
      return (list || [])
        .map((x) => String(x || '').trim())
        .filter(Boolean)
        .filter((x) => {
          const k = x.toUpperCase();
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
    };

    const normalizarCodigoMetodo = (value) =>
      String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

    const dedupeMetodos = (list) => {
      const seen = new Set();
      return (list || []).filter((item) => {
        const key = String(item.codigo || '').toUpperCase();
        if (!key) return false;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    const esTransferencia = (codigo, nombre) => {
      const c = String(codigo || '').toUpperCase();
      const n = String(nombre || '').toUpperCase();
      return c.includes('TRANSFER') || n.includes('TRANSFER');
    };

    const payload = {
      pos: (canalesForm.pos || []).map((x) => String(x || '').trim()).filter(Boolean),
      delivery: (canalesForm.delivery || []).map((x) => String(x || '').trim()).filter(Boolean),
      metodosPago: (canalesForm.metodosPago || []).map((x) => ({
        codigo: normalizarCodigoMetodo(x.codigo) || normalizarCodigoMetodo(x.nombre),
        nombre: String(x.nombre || '').trim(),
        categoria: (() => {
          const codigoNorm = normalizarCodigoMetodo(x.codigo) || normalizarCodigoMetodo(x.nombre);
          const nombre = String(x.nombre || '').trim();
          if (esTransferencia(codigoNorm, nombre)) return 'POS';
          const cat = String(x.categoria || '').trim().toUpperCase();
          return ['EFECTIVO', 'POS', 'DELIVERY', 'OTRO'].includes(cat) ? cat : 'OTRO';
        })(),
        activo: !!x.activo
      })).filter((x) => x.codigo && x.nombre),
      requiereMontoEnTodos: true
    };

    payload.pos = dedupe(payload.pos);
    payload.delivery = dedupe(payload.delivery);
    payload.metodosPago = dedupeMetodos(payload.metodosPago);

    if (!payload.metodosPago.some((x) => x.categoria === 'EFECTIVO' && x.activo))
      return setError('Debes tener al menos un metodo de pago activo de tipo EFECTIVO');

    try {
      const res = await api.put('/Cajas/canales-config', payload, {
        params: { idSucursal }
      });
      const data = res?.data?.data || {};
      setCanalesForm({
        pos: data.pos || payload.pos,
        delivery: data.delivery || payload.delivery,
        metodosPago: data.metodosPago || payload.metodosPago,
        requiereMontoEnTodos: data.requiereMontoEnTodos ?? true
      });
      await cargarCanalesSucursal(idSucursal);
      setMensaje('Canales de cuadre guardados correctamente');
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al guardar canales de cuadre');
    }
  };

  const updateAjuste = (tipo, index, field, value) => {
    setAjustesVentaForm((prev) => {
      const list = [...(prev[tipo] || [])];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, [tipo]: list };
    });
  };

  const addAjuste = (tipo) => {
    const prefijo = tipo === 'descuentos' ? 'DESC' : 'IMP';
    setAjustesVentaForm((prev) => ({
      ...prev,
      [tipo]: [
        ...(prev[tipo] || []),
        {
          codigo: `${prefijo}_${Date.now()}`,
          nombre: '',
          tipoCalculo: 'PORCENTAJE',
          valor: 0,
          permiteEditarMonto: false,
          activo: true
        }
      ]
    }));
  };

  const removeAjuste = (tipo, index) => {
    setAjustesVentaForm((prev) => ({
      ...prev,
      [tipo]: (prev[tipo] || []).filter((_, i) => i !== index)
    }));
  };

  const guardarAjustesVenta = async (e) => {
    e.preventDefault();
    setMensaje('');
    setError('');
    const idSucursal = Number(sucursalSar || 0);
    if (!idSucursal) return setError('Selecciona una sucursal');

    const normalizar = (list) => (list || []).map((x) => ({
      codigo: String(x.codigo || '').trim().toUpperCase(),
      nombre: String(x.nombre || '').trim(),
      tipoCalculo: String(x.tipoCalculo || 'NINGUNO').trim().toUpperCase(),
      valor: Number(x.valor || 0),
      permiteEditarMonto: !!x.permiteEditarMonto,
      activo: !!x.activo
    }));

    const payload = {
      idSucursal,
      descuentos: normalizar(ajustesVentaForm.descuentos).filter((x) => x.codigo && x.nombre),
      impuestos: normalizar(ajustesVentaForm.impuestos).filter((x) => x.codigo && x.nombre)
    };

    if (payload.descuentos.length === 0) return setError('Debes configurar al menos un descuento');
    if (payload.impuestos.length === 0) return setError('Debes configurar al menos un impuesto');

    try {
      await api.put('/AjustesVenta', payload, { params: { idSucursal } });
      setMensaje('Ajustes de descuentos/impuestos guardados correctamente');
      await cargarAjustesVentaSucursal(idSucursal);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al guardar ajustes de venta');
    }
  };

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  useEffect(() => {
    if (!sucursalSar) return;
    cargarConfiguracionSucursal(sucursalSar).catch((err) => {
      setError(err?.response?.data?.message || 'Error al cargar configuracion de la sucursal');
    });
    cargarSarSucursal(sucursalSar).catch((err) => {
      setError(err?.response?.data?.message || 'Error al cargar SAR de la sucursal');
    });
    cargarCanalesSucursal(sucursalSar).catch((err) => {
      setError(err?.response?.data?.message || 'Error al cargar canales de cuadre');
    });
    cargarAjustesVentaSucursal(sucursalSar).catch((err) => {
      setError(err?.response?.data?.message || 'Error al cargar ajustes de venta');
    });
  }, [sucursalSar]);

  if (loading) return <div>Cargando configuracion...</div>;

  const sucursalActualNombre = sucursales.find((s) => String(s.id_Sucursal) === String(sucursalSar))?.nombre || 'Sin sucursal';
  const nombreSucursalPorId = (idSucursal) =>
    sucursales.find((s) => Number(s.id_Sucursal) === Number(idSucursal))?.nombre || `Sucursal #${idSucursal}`;

  return (
    <div>
      <h2 className="mb-4">Configuracion del negocio</h2>
      <div className="reports-tabs mb-3">
        <button className={`btn btn-sm ${tabConfig === 'negocio' ? 'btn-dark' : 'btn-outline-secondary'}`} onClick={() => setTabConfig('negocio')}>
          Negocio
        </button>
        <button className={`btn btn-sm ${tabConfig === 'sar' ? 'btn-dark' : 'btn-outline-secondary'}`} onClick={() => setTabConfig('sar')}>
          SAR / CAI
        </button>
        <button className={`btn btn-sm ${tabConfig === 'ajustes' ? 'btn-dark' : 'btn-outline-secondary'}`} onClick={() => setTabConfig('ajustes')}>
          Descuentos e Impuestos
        </button>
        <button className={`btn btn-sm ${tabConfig === 'metodos' ? 'btn-dark' : 'btn-outline-secondary'}`} onClick={() => setTabConfig('metodos')}>
          Metodos y Cuadre
        </button>
      </div>
      {mensaje && <div className="alert alert-success mt-2">{mensaje}</div>}
      {error && <div className="alert alert-danger mt-2">{error}</div>}

      {tabConfig === 'negocio' && (
      <div className="card shadow-sm">
        <div className="card-body reports-card-body">
          <h5 className="mb-1">Configuracion por sucursal</h5>
          <div className="small text-muted mb-3">
            Editando sucursal: <strong>{sucursalActualNombre}</strong>
          </div>
          <form onSubmit={guardarConfiguracion} className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Sucursal</label>
              <select className="form-select" value={sucursalSar} onChange={(e) => setSucursalSar(e.target.value)}>
                {sucursales.map((s) => <option key={s.id_Sucursal} value={s.id_Sucursal}>{s.nombre}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Nombre del negocio</label>
              <input type="text" className="form-control" name="nombre_Negocio" value={form.nombre_Negocio} onChange={handleChange} required />
            </div>

            <div className="col-md-6">
              <label className="form-label">Direccion</label>
              <input type="text" className="form-control" name="direccion" value={form.direccion} onChange={handleChange} />
            </div>

            <div className="col-md-4">
              <label className="form-label">Telefono</label>
              <input type="text" className="form-control" name="telefono" value={form.telefono} onChange={handleChange} />
            </div>

            <div className="col-md-4">
              <label className="form-label">RTN</label>
              <input type="text" className="form-control" name="rtn" value={form.rtn} onChange={handleChange} />
            </div>

            <div className="col-md-4">
              <label className="form-label">Moneda</label>
              <input type="text" className="form-control" name="moneda" value={form.moneda} onChange={handleChange} />
            </div>

            <div className="col-md-8">
              <label className="form-label">Mensaje ticket</label>
              <input type="text" className="form-control" name="mensaje_Ticket" value={form.mensaje_Ticket} onChange={handleChange} />
            </div>

            <div className="col-md-4">
              <label className="form-label">Ancho ticket</label>
              <select className="form-select" name="ancho_Ticket" value={form.ancho_Ticket} onChange={handleChange}>
                <option value="58mm">58mm</option>
                <option value="80mm">80mm</option>
              </select>
            </div>

            <div className="col-md-12">
              <label className="form-label">Logo URL</label>
              <input type="text" className="form-control" name="logo_Url" value={form.logo_Url} onChange={handleChange} placeholder="/logo-pinecos.png" />
              <small className="text-muted">Ejemplo local: /logo-pinecos.png (archivo en pinecos-frontend/public)</small>
            </div>

            <div className="col-md-12">
              <button className="btn btn-dark" type="submit">Guardar configuracion de sucursal</button>
            </div>
          </form>
        </div>
      </div>
      )}

      {tabConfig === 'sar' && (
      <div>
        <div className="alert alert-light border mb-3">
          <strong>Factura fiscal SAR (Honduras):</strong> los datos del talonario CAI, correlativo, rangos, fecha limite, leyenda, imprenta y pie se usan al emitir factura desde POS o Mesas.
          El PDF/HTML de factura ahora agrupa el CAI en recuadro, muestra <strong>No. CONTROL</strong> (correlativo emitido), leyenda aparte y pie al final, alineado a un formato de factura fisica tipo SAR.
          Nombre, direccion y RTN del negocio en la factura salen de la pestana <strong>Negocio</strong> (misma sucursal).
        </div>

        <div className="row g-3 align-items-start">
          <div className="col-lg-7">
            <div className="card shadow-sm h-100">
              <div className="card-body reports-card-body">
                <h5 className="mb-1">Facturacion SAR (CAI)</h5>
                <div className="small text-muted mb-3">
                  Editando sucursal: <strong>{sucursalActualNombre}</strong>
                </div>
                <form onSubmit={guardarFacturacionSar} className="row g-3">
                  <div className="col-12">
                    <label className="form-label">Sucursal</label>
                    <select className="form-select" value={sucursalSar} onChange={(e) => setSucursalSar(e.target.value)}>
                      {sucursales.map((s) => <option key={s.id_Sucursal} value={s.id_Sucursal}>{s.nombre}</option>)}
                    </select>
                  </div>

                  <div className="col-12">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="habilitadoCai"
                        name="habilitadoCai"
                        checked={sarForm.habilitadoCai}
                        onChange={handleSarChange}
                      />
                      <label className="form-check-label" htmlFor="habilitadoCai">
                        Habilitar facturacion con CAI en esta sucursal
                      </label>
                    </div>
                  </div>

                  {sarForm.habilitadoCai && (
                    <div className="col-12">
                      <div className={`alert py-2 mb-0 ${sarForm.facturasRestantes > 0 && !sarForm.caiVencido ? 'alert-info' : 'alert-danger'}`}>
                        Facturas CAI restantes en rango: <strong>{sarForm.facturasRestantes}</strong>
                        {sarForm.caiVencido && <span className="ms-2">| Fecha limite vencida — actualiza en SAR</span>}
                      </div>
                    </div>
                  )}

                  <div className="col-12">
                    <fieldset className="border rounded-3 p-3">
                      <legend className="float-none w-auto px-2 fs-6 mb-0">Talonario CAI</legend>
                      <div className="row g-3 mt-1">
                        <div className="col-md-12">
                          <label className="form-label">C.A.I.</label>
                          <input type="text" className="form-control font-monospace" name="cai" value={sarForm.cai} onChange={handleSarChange} autoComplete="off" />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Rango autorizado — inicio</label>
                          <input type="text" className="form-control font-monospace" name="rangoInicio" value={sarForm.rangoInicio} onChange={handleSarChange} placeholder="000-001-01-00000001" />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Rango autorizado — fin</label>
                          <input type="text" className="form-control font-monospace" name="rangoFin" value={sarForm.rangoFin} onChange={handleSarChange} placeholder="000-001-01-00005000" />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Siguiente correlativo a emitir</label>
                          <input type="number" className="form-control" name="siguienteCorrelativo" value={sarForm.siguienteCorrelativo} onChange={handleSarChange} min="1" />
                          <small className="text-muted">Debe caer dentro del rango; al cobrar con factura se incrementa y se imprime como No. CONTROL.</small>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Fecha limite de emision (SAR)</label>
                          <input type="date" className="form-control" name="fechaLimiteEmision" value={sarForm.fechaLimiteEmision} onChange={handleSarChange} />
                        </div>
                      </div>
                    </fieldset>
                  </div>

                  <div className="col-12">
                    <fieldset className="border rounded-3 p-3">
                      <legend className="float-none w-auto px-2 fs-6 mb-0">Textos en el cuerpo de la factura</legend>
                      <div className="row g-3 mt-1">
                        <div className="col-12">
                          <label className="form-label">Leyenda SAR (recuadro en factura)</label>
                          <textarea className="form-control" rows={3} name="leyendaSar" value={sarForm.leyendaSar} onChange={handleSarChange} placeholder="Texto legal o de resolucion que debe verse en la factura..." />
                        </div>
                        <div className="col-12">
                          <label className="form-label">Pie de factura (linea final)</label>
                          <textarea className="form-control" rows={2} name="pieFactura" value={sarForm.pieFactura} onChange={handleSarChange} />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Ciudad (encabezado &quot;Lugar y fecha&quot;)</label>
                          <input type="text" className="form-control" name="ciudadFechaFactura" value={sarForm.ciudadFechaFactura} onChange={handleSarChange} placeholder="Ej. Comayagua" />
                          <small className="text-muted">La fecha de la venta se agrega automaticamente al imprimir.</small>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Correo del negocio en factura</label>
                          <input type="text" className="form-control" name="correoNegocioFactura" value={sarForm.correoNegocioFactura} onChange={handleSarChange} />
                        </div>
                      </div>
                    </fieldset>
                  </div>

                  <div className="col-12">
                    <fieldset className="border rounded-3 p-3">
                      <legend className="float-none w-auto px-2 fs-6 mb-0">Imprenta / autorizacion del formato</legend>
                      <div className="row g-3 mt-1">
                        <div className="col-md-4">
                          <label className="form-label">Nombre imprenta</label>
                          <input type="text" className="form-control" name="nombreImprenta" value={sarForm.nombreImprenta} onChange={handleSarChange} />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">RTN imprenta</label>
                          <input type="text" className="form-control" name="rtnImprenta" value={sarForm.rtnImprenta} onChange={handleSarChange} />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">No. certificado / registro</label>
                          <input type="text" className="form-control" name="numeroCertificadoImprenta" value={sarForm.numeroCertificadoImprenta} onChange={handleSarChange} />
                        </div>
                      </div>
                    </fieldset>
                  </div>

                  <div className="col-12">
                    <fieldset className="border rounded-3 p-3">
                      <legend className="float-none w-auto px-2 fs-6 mb-0">Cliente por defecto (consumidor final)</legend>
                      <div className="row g-3 mt-1">
                        <div className="col-md-6">
                          <label className="form-label">Nombre</label>
                          <input type="text" className="form-control" name="clientePorDefecto" value={sarForm.clientePorDefecto} onChange={handleSarChange} />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label">RTN</label>
                          <input type="text" className="form-control" name="rtnClientePorDefecto" value={sarForm.rtnClientePorDefecto} onChange={handleSarChange} />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label">Direccion</label>
                          <input type="text" className="form-control" name="direccionClientePorDefecto" value={sarForm.direccionClientePorDefecto} onChange={handleSarChange} />
                        </div>
                      </div>
                    </fieldset>
                  </div>

                  <div className="col-12">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="permitirVentaSinFactura"
                        name="permitirVentaSinFactura"
                        checked={sarForm.permitirVentaSinFactura}
                        onChange={handleSarChange}
                      />
                      <label className="form-check-label" htmlFor="permitirVentaSinFactura">
                        Permitir ventas sin emitir factura CAI (ticket no fiscal)
                      </label>
                    </div>
                  </div>

                  <div className="col-12">
                    <button className="btn btn-dark" type="submit">Guardar configuracion SAR</button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="col-lg-5">
            <div className="card border-secondary shadow-sm factura-sar-preview-card sticky-lg-top" style={{ zIndex: 2 }}>
              <div className="card-header py-2 small fw-bold bg-body-secondary">
                Vista previa del bloque fiscal (no es correlativo real hasta cobrar)
              </div>
              <div className="card-body small factura-sar-preview-body">
                <div className="text-center fw-bold text-uppercase" style={{ letterSpacing: '0.06em', fontSize: '0.72rem' }}>Documento fiscal (SAR)</div>
                <div className="text-center text-muted" style={{ fontSize: '0.68rem' }}>Factura original — cliente</div>
                <div className="text-center font-monospace fw-bold my-2" style={{ fontSize: '0.95rem' }}>
                  No. CONTROL: {sarForm.siguienteCorrelativo !== '' && sarForm.siguienteCorrelativo != null
                    ? String(sarForm.siguienteCorrelativo)
                    : '(guarda correlativo)'}
                </div>
                <div className="text-center text-muted" style={{ fontSize: '0.62rem' }}>Al cobrar se usa el correlativo emitido por el sistema.</div>
                <div className="text-center fw-semibold">{form.nombre_Negocio || 'Nombre del negocio (pestaña Negocio)'}</div>
                <div className="text-center text-muted" style={{ fontSize: '0.68rem' }}>{form.direccion || 'Direccion'}</div>
                <div className="text-center text-muted" style={{ fontSize: '0.68rem' }}>
                  RTN: {form.rtn || '—'} {form.telefono ? `| Tel: ${form.telefono}` : ''}
                </div>
                <hr className="my-2" />
                <div className="border border-2 p-2 bg-light" style={{ fontSize: '0.68rem' }}>
                  <div><span className="fw-bold">C.A.I.</span> {sarForm.cai || '—'}</div>
                  <div><span className="fw-bold">Rango</span> {sarForm.rangoInicio || '—'} al {sarForm.rangoFin || '—'}</div>
                  <div><span className="fw-bold">Limite</span> {sarForm.fechaLimiteEmision || '—'}</div>
                </div>
                {sarForm.leyendaSar ? (
                  <div className="border border-dashed p-2 mt-2 text-justify" style={{ fontSize: '0.65rem', lineHeight: 1.35 }}>
                    <div className="fw-bold text-uppercase mb-1" style={{ fontSize: '0.6rem', letterSpacing: '0.1em' }}>Leyenda</div>
                    {sarForm.leyendaSar}
                  </div>
                ) : (
                  <div className="text-muted fst-italic mt-2" style={{ fontSize: '0.65rem' }}>Sin leyenda SAR (opcional en recuadro)</div>
                )}
                <div className="border p-2 mt-2" style={{ fontSize: '0.65rem' }}>
                  <div className="fw-bold mb-1">Imprenta</div>
                  <div>{sarForm.nombreImprenta || '—'}</div>
                  <div>RTN: {sarForm.rtnImprenta || '—'}</div>
                  <div>Cert.: {sarForm.numeroCertificadoImprenta || '—'}</div>
                </div>
                <div className="text-center fw-semibold mt-3" style={{ fontSize: '0.68rem' }}>{sarForm.pieFactura || 'Pie de factura'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card shadow-sm mt-3">
          <div className="card-body">
            <h6 className="mb-3">Resumen por sucursal</h6>
            <div className="table-responsive">
              <table className="table table-bordered align-middle table-sm">
                <thead className="table-light">
                  <tr>
                    <th>Sucursal</th>
                    <th>CAI habilitado</th>
                    <th>CAI</th>
                    <th>Siguiente</th>
                    <th>Restantes</th>
                    <th>Fecha limite</th>
                  </tr>
                </thead>
                <tbody>
                  {listaSar.map((x) => (
                    <tr key={x.idSucursal}>
                      <td>{nombreSucursalPorId(x.idSucursal)}</td>
                      <td>{x.habilitadoCai ? 'SI' : 'NO'}</td>
                      <td className="font-monospace small">{x.cai || '-'}</td>
                      <td>{x.siguienteCorrelativo ?? '-'}</td>
                      <td>
                        <span className={`status-pill ${Number(x.facturasRestantes || 0) > 0 ? 'active' : 'inactive'}`}>
                          {Number(x.facturasRestantes || 0)}
                        </span>
                      </td>
                      <td>{x.fechaLimiteEmision ? String(x.fechaLimiteEmision).slice(0, 10) : '-'}</td>
                    </tr>
                  ))}
                  {listaSar.length === 0 && (
                    <tr><td colSpan="6" className="text-center">Sin configuraciones SAR guardadas</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      )}

      {tabConfig === 'ajustes' && (
      <div className="card shadow-sm">
        <div className="card-body reports-card-body">
          <h5 className="mb-3">Descuentos e Impuestos por Sucursal</h5>
          <form onSubmit={guardarAjustesVenta} className="row g-3">
            <div className="col-12">
              <small className="text-muted">Define que opciones aparecen en POS/Mesas. Puedes agregar, activar/desactivar y eliminar.</small>
            </div>

            <div className="col-md-6">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="form-label mb-0">Descuentos</label>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => addAjuste('descuentos')}>Agregar</button>
              </div>
              {(ajustesVentaForm.descuentos || []).map((x, i) => (
                <div className="border rounded p-2 mb-2" key={`desc-${i}`}>
                  <div className="row g-2">
                    <div className="col-md-4"><input className="form-control" placeholder="Codigo" value={x.codigo || ''} onChange={(e) => updateAjuste('descuentos', i, 'codigo', e.target.value)} /></div>
                    <div className="col-md-8"><input className="form-control" placeholder="Nombre" value={x.nombre || ''} onChange={(e) => updateAjuste('descuentos', i, 'nombre', e.target.value)} /></div>
                    <div className="col-md-4">
                      <select className="form-select" value={x.tipoCalculo || 'NINGUNO'} onChange={(e) => updateAjuste('descuentos', i, 'tipoCalculo', e.target.value)}>
                        <option value="NINGUNO">Sin descuento</option>
                        <option value="PORCENTAJE">Porcentaje</option>
                        <option value="MONTO">Monto</option>
                      </select>
                    </div>
                    <div className="col-md-3"><input type="number" step="0.01" min="0" className="form-control" placeholder="Valor" value={x.valor ?? 0} onChange={(e) => updateAjuste('descuentos', i, 'valor', e.target.value)} /></div>
                    <div className="col-md-3 d-flex align-items-center">
                      <div className="form-check">
                        <input className="form-check-input" type="checkbox" checked={!!x.permiteEditarMonto} onChange={(e) => updateAjuste('descuentos', i, 'permiteEditarMonto', e.target.checked)} />
                        <label className="form-check-label">Manual</label>
                      </div>
                    </div>
                    <div className="col-12 d-flex align-items-center justify-content-between flex-wrap gap-2 mt-1">
                      <div className="form-check form-switch mb-0">
                        <input className="form-check-input" type="checkbox" checked={!!x.activo} onChange={(e) => updateAjuste('descuentos', i, 'activo', e.target.checked)} />
                        <label className="form-check-label">Activo</label>
                      </div>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeAjuste('descuentos', i)}>Quitar</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="col-md-6">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="form-label mb-0">Impuestos</label>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => addAjuste('impuestos')}>Agregar</button>
              </div>
              {(ajustesVentaForm.impuestos || []).map((x, i) => (
                <div className="border rounded p-2 mb-2" key={`imp-${i}`}>
                  <div className="row g-2">
                    <div className="col-md-4"><input className="form-control" placeholder="Codigo" value={x.codigo || ''} onChange={(e) => updateAjuste('impuestos', i, 'codigo', e.target.value)} /></div>
                    <div className="col-md-8"><input className="form-control" placeholder="Nombre" value={x.nombre || ''} onChange={(e) => updateAjuste('impuestos', i, 'nombre', e.target.value)} /></div>
                    <div className="col-md-4">
                      <select className="form-select" value={x.tipoCalculo || 'NINGUNO'} onChange={(e) => updateAjuste('impuestos', i, 'tipoCalculo', e.target.value)}>
                        <option value="NINGUNO">Exento</option>
                        <option value="PORCENTAJE">Porcentaje</option>
                        <option value="MONTO">Monto</option>
                        <option value="INCLUIDO_PORCENTAJE">Incluido en precio (%)</option>
                      </select>
                    </div>
                    <div className="col-md-3"><input type="number" step="0.01" min="0" className="form-control" placeholder="Valor" value={x.valor ?? 0} onChange={(e) => updateAjuste('impuestos', i, 'valor', e.target.value)} /></div>
                    <div className="col-md-3 d-flex align-items-center">
                      <div className="form-check">
                        <input className="form-check-input" type="checkbox" checked={!!x.permiteEditarMonto} onChange={(e) => updateAjuste('impuestos', i, 'permiteEditarMonto', e.target.checked)} />
                        <label className="form-check-label">Manual</label>
                      </div>
                    </div>
                    <div className="col-12 d-flex align-items-center justify-content-between flex-wrap gap-2 mt-1">
                      <div className="form-check form-switch mb-0">
                        <input className="form-check-input" type="checkbox" checked={!!x.activo} onChange={(e) => updateAjuste('impuestos', i, 'activo', e.target.checked)} />
                        <label className="form-check-label">Activo</label>
                      </div>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeAjuste('impuestos', i)}>Quitar</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="col-12">
              <button className="btn btn-dark" type="submit">Guardar descuentos/impuestos</button>
            </div>
          </form>
        </div>
      </div>
      )}

      {tabConfig === 'metodos' && (
      <div className="card shadow-sm">
        <div className="card-body reports-card-body">
          <h5 className="mb-3">Metodos de Pago y Cuadre por Sucursal</h5>
          <form onSubmit={guardarCanalesCuadre} className="row g-3">
            <div className="col-12">
              <small className="text-muted">Solo admin define metodos. POS/Mesas y cierre de caja usaran esta misma configuracion.</small>
            </div>

            <div className="col-12">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="form-label mb-0">Metodos de pago</label>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={addMetodoPago}>Agregar metodo</button>
              </div>
              {(canalesForm.metodosPago || []).map((x, i) => (
                <div className="row g-2 mb-2 align-items-center" key={`mp-${i}`}>
                  <div className="col-md-2">
                    <input className="form-control" placeholder="Codigo" value={x.codigo || ''} onChange={(e) => updateMetodoPago(i, 'codigo', e.target.value)} />
                  </div>
                  <div className="col-md-4">
                    <input className="form-control" placeholder="Nombre" value={x.nombre || ''} onChange={(e) => updateMetodoPago(i, 'nombre', e.target.value)} />
                  </div>
                  <div className="col-md-3">
                    <select className="form-select" value={x.categoria || 'OTRO'} onChange={(e) => updateMetodoPago(i, 'categoria', e.target.value)}>
                      <option value="EFECTIVO">EFECTIVO</option>
                      <option value="POS">POS</option>
                      <option value="DELIVERY">DELIVERY</option>
                      <option value="OTRO">OTRO</option>
                    </select>
                  </div>
                  <div className="col-md-2">
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" checked={!!x.activo} onChange={(e) => updateMetodoPago(i, 'activo', e.target.checked)} />
                      <label className="form-check-label">Activo</label>
                    </div>
                  </div>
                  <div className="col-md-1">
                    <button type="button" className="btn btn-outline-danger w-100" onClick={() => removeMetodoPago(i)}>Quitar</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="col-md-6">
              <label className="form-label mb-1">Canales POS que pedira cierre</label>
              <div className="form-control bg-light" style={{ minHeight: 84 }}>
                {(canalesForm.pos || []).join(', ')}
              </div>
            </div>

            <div className="col-md-6">
              <label className="form-label mb-1">Canales Delivery que pedira cierre</label>
              <div className="form-control bg-light" style={{ minHeight: 84 }}>
                {(canalesForm.delivery || []).join(', ')}
              </div>
            </div>

            <div className="col-12">
              <button className="btn btn-dark" type="submit">Guardar metodos y canales de cuadre</button>
            </div>
          </form>
        </div>
      </div>
      )}
    </div>
  );
}

export default Configuracion;
