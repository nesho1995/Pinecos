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
    permitirVentaSinFactura: true
  });

  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [sucursales, setSucursales] = useState([]);
  const [sucursalSar, setSucursalSar] = useState('');
  const [listaSar, setListaSar] = useState([]);
  const [canalesForm, setCanalesForm] = useState({
    pos: ['POS 1'],
    delivery: ['PEDIDOS_YA'],
    requiereMontoEnTodos: true
  });
  const [ajustesVentaForm, setAjustesVentaForm] = useState({
    descuentos: [],
    impuestos: []
  });

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
    setForm(configRes.data);
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
      permitirVentaSinFactura: data.permitirVentaSinFactura ?? true
    });
  };

  const cargarCanalesSucursal = async (idSucursal) => {
    if (!idSucursal) return;
    const res = await api.get('/Cajas/canales-config', { params: { idSucursal: Number(idSucursal) } });
    const data = res.data || {};
    setCanalesForm({
      pos: data.pos || ['POS 1'],
      delivery: data.delivery || ['PEDIDOS_YA'],
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
      const params = sucursalSar ? { idSucursal: Number(sucursalSar) } : {};
      const response = await api.put('/Configuracion', form, { params });
      setForm(response.data.data);
      setMensaje('Configuracion guardada correctamente');
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al guardar configuracion');
    }
  };

  const guardarFacturacionSar = async (e) => {
    e.preventDefault();
    setMensaje('');
    setError('');

    try {
      const payload = {
        ...sarForm,
        siguienteCorrelativo: sarForm.siguienteCorrelativo === '' ? null : Number(sarForm.siguienteCorrelativo),
        fechaLimiteEmision: sarForm.fechaLimiteEmision || null
      };

      if (!sucursalSar) return setError('Selecciona una sucursal para configurar SAR');

      await api.put('/FacturacionSar', payload, {
        params: { idSucursal: Number(sucursalSar) }
      });
      await cargarSarLista();
      setMensaje('Configuracion SAR guardada correctamente');
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al guardar configuracion SAR');
    }
  };

  const updateCanalNombre = (tipo, index, value) => {
    setCanalesForm((prev) => {
      const list = [...prev[tipo]];
      list[index] = value;
      return { ...prev, [tipo]: list };
    });
  };

  const addCanal = (tipo, prefijo) => {
    setCanalesForm((prev) => ({
      ...prev,
      [tipo]: [...prev[tipo], `${prefijo} ${prev[tipo].length + 1}`]
    }));
  };

  const removeCanal = (tipo, index) => {
    setCanalesForm((prev) => {
      const list = prev[tipo].filter((_, i) => i !== index);
      return { ...prev, [tipo]: list.length ? list : [tipo === 'pos' ? 'POS 1' : 'PEDIDOS_YA'] };
    });
  };

  const guardarCanalesCuadre = async (e) => {
    e.preventDefault();
    setMensaje('');
    setError('');
    if (!sucursalSar) return setError('Selecciona una sucursal');

    const payload = {
      pos: (canalesForm.pos || []).map((x) => String(x || '').trim()).filter(Boolean),
      delivery: (canalesForm.delivery || []).map((x) => String(x || '').trim()).filter(Boolean),
      requiereMontoEnTodos: true
    };

    if (payload.pos.length === 0) return setError('Debes configurar al menos un POS');
    if (payload.delivery.length === 0) return setError('Debes configurar al menos una empresa de pedidos');

    try {
      await api.put('/Cajas/canales-config', payload, {
        params: { idSucursal: Number(sucursalSar) }
      });
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
    if (!sucursalSar) return setError('Selecciona una sucursal');

    const normalizar = (list) => (list || []).map((x) => ({
      codigo: String(x.codigo || '').trim().toUpperCase(),
      nombre: String(x.nombre || '').trim(),
      tipoCalculo: String(x.tipoCalculo || 'NINGUNO').trim().toUpperCase(),
      valor: Number(x.valor || 0),
      permiteEditarMonto: !!x.permiteEditarMonto,
      activo: !!x.activo
    }));

    const payload = {
      idSucursal: Number(sucursalSar),
      descuentos: normalizar(ajustesVentaForm.descuentos).filter((x) => x.codigo && x.nombre),
      impuestos: normalizar(ajustesVentaForm.impuestos).filter((x) => x.codigo && x.nombre)
    };

    if (payload.descuentos.length === 0) return setError('Debes configurar al menos un descuento');
    if (payload.impuestos.length === 0) return setError('Debes configurar al menos un impuesto');

    try {
      await api.put('/AjustesVenta', payload, { params: { idSucursal: Number(sucursalSar) } });
      setMensaje('Ajustes de descuentos/impuestos guardados correctamente');
      await cargarAjustesVentaSucursal(sucursalSar);
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

  return (
    <div>
      <h2 className="mb-4">Configuracion del negocio</h2>

      <div className="card shadow-sm">
        <div className="card-body">
          <form onSubmit={guardarConfiguracion} className="row g-3">
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

            <div className="col-md-6">
              <label className="form-label">Mensaje ticket</label>
              <input type="text" className="form-control" name="mensaje_Ticket" value={form.mensaje_Ticket} onChange={handleChange} />
            </div>

            <div className="col-md-3">
              <label className="form-label">Ancho ticket</label>
              <select className="form-select" name="ancho_Ticket" value={form.ancho_Ticket} onChange={handleChange}>
                <option value="58mm">58mm</option>
                <option value="80mm">80mm</option>
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label">Logo URL</label>
              <input type="text" className="form-control" name="logo_Url" value={form.logo_Url} onChange={handleChange} placeholder="/logo-pinecos.png" />
            </div>

            <div className="col-md-12">
              <button className="btn btn-dark" type="submit">Guardar configuracion</button>
            </div>
          </form>
        </div>
      </div>

      <div className="card shadow-sm mt-4">
        <div className="card-body">
          <h5 className="mb-3">Facturacion SAR (CAI)</h5>
          <form onSubmit={guardarFacturacionSar} className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Sucursal SAR</label>
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
                  Habilitar facturacion con CAI
                </label>
              </div>
            </div>

            <div className="col-md-6">
              <label className="form-label">CAI</label>
              <input type="text" className="form-control" name="cai" value={sarForm.cai} onChange={handleSarChange} />
            </div>

            <div className="col-md-3">
              <label className="form-label">Rango inicio</label>
              <input type="text" className="form-control" name="rangoInicio" value={sarForm.rangoInicio} onChange={handleSarChange} placeholder="000-000-00-00000000" />
            </div>

            <div className="col-md-3">
              <label className="form-label">Rango fin</label>
              <input type="text" className="form-control" name="rangoFin" value={sarForm.rangoFin} onChange={handleSarChange} placeholder="000-000-00-00000000" />
            </div>

            <div className="col-md-3">
              <label className="form-label">Siguiente correlativo</label>
              <input type="number" className="form-control" name="siguienteCorrelativo" value={sarForm.siguienteCorrelativo} onChange={handleSarChange} min="1" />
            </div>

            <div className="col-md-3">
              <label className="form-label">Fecha limite emision</label>
              <input type="date" className="form-control" name="fechaLimiteEmision" value={sarForm.fechaLimiteEmision} onChange={handleSarChange} />
            </div>

            <div className="col-md-6">
              <label className="form-label">Leyenda SAR</label>
              <input type="text" className="form-control" name="leyendaSar" value={sarForm.leyendaSar} onChange={handleSarChange} />
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
                  Permitir ventas sin emitir factura CAI
                </label>
              </div>
            </div>

            <div className="col-12">
              <button className="btn btn-outline-dark" type="submit">Guardar configuracion SAR</button>
            </div>
          </form>

          <hr className="my-4" />
          <h6>Resumen por sucursal</h6>
          <div className="table-responsive">
            <table className="table table-bordered align-middle">
              <thead>
                <tr>
                  <th>Sucursal</th>
                  <th>CAI habilitado</th>
                  <th>CAI</th>
                  <th>Siguiente</th>
                  <th>Fecha limite</th>
                </tr>
              </thead>
              <tbody>
                {listaSar.map((x) => (
                  <tr key={x.idSucursal}>
                    <td>{x.idSucursal}</td>
                    <td>{x.habilitadoCai ? 'SI' : 'NO'}</td>
                    <td>{x.cai || '-'}</td>
                    <td>{x.siguienteCorrelativo ?? '-'}</td>
                    <td>{x.fechaLimiteEmision ? String(x.fechaLimiteEmision).slice(0, 10) : '-'}</td>
                  </tr>
                ))}
                {listaSar.length === 0 && (
                  <tr><td colSpan="5" className="text-center">Sin configuraciones SAR guardadas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card shadow-sm mt-4">
        <div className="card-body">
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
                    <div className="col-md-2 d-flex align-items-center justify-content-between">
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" checked={!!x.activo} onChange={(e) => updateAjuste('descuentos', i, 'activo', e.target.checked)} />
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
                    <div className="col-md-2 d-flex align-items-center justify-content-between">
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" checked={!!x.activo} onChange={(e) => updateAjuste('impuestos', i, 'activo', e.target.checked)} />
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

      <div className="card shadow-sm mt-4">
        <div className="card-body">
          <h5 className="mb-3">Canales de Cuadre por Sucursal</h5>
          <form onSubmit={guardarCanalesCuadre} className="row g-3">
            <div className="col-12">
              <small className="text-muted">Solo admin define estos canales. El cajero solo captura montos en caja.</small>
            </div>

            <div className="col-md-6">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="form-label mb-0">POS habilitados</label>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => addCanal('pos', 'POS')}>Agregar POS</button>
              </div>
              {canalesForm.pos.map((x, i) => (
                <div className="input-group mb-2" key={`pos-${i}`}>
                  <input className="form-control" value={x} onChange={(e) => updateCanalNombre('pos', i, e.target.value)} />
                  <button type="button" className="btn btn-outline-danger" onClick={() => removeCanal('pos', i)}>Quitar</button>
                </div>
              ))}
            </div>

            <div className="col-md-6">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="form-label mb-0">Empresas de pedidos</label>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => addCanal('delivery', 'APP')}>Agregar Empresa</button>
              </div>
              {canalesForm.delivery.map((x, i) => (
                <div className="input-group mb-2" key={`delivery-${i}`}>
                  <input className="form-control" value={x} onChange={(e) => updateCanalNombre('delivery', i, e.target.value)} />
                  <button type="button" className="btn btn-outline-danger" onClick={() => removeCanal('delivery', i)}>Quitar</button>
                </div>
              ))}
            </div>

            <div className="col-12">
              <button className="btn btn-dark" type="submit">Guardar canales de cuadre</button>
            </div>
          </form>
        </div>
      </div>

      {mensaje && <div className="alert alert-success mt-3 mb-0">{mensaje}</div>}
      {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}
    </div>
  );
}

export default Configuracion;
