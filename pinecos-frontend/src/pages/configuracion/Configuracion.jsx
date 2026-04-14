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

  const cargarSucursales = async () => {
    try {
      const res = await api.get('/Sucursales', { params: { incluirInactivas: true } });
      const data = res.data || [];
      setSucursales(data);
      if (!sucursalSar && data.length > 0) setSucursalSar(String(data[0].id_Sucursal));
    } catch {
      setSucursales([]);
    }
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

  const cargarConfiguracion = async () => {
    try {
      await cargarSucursales();
      const configRes = await api.get('/Configuracion');

      setForm(configRes.data);
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
      const response = await api.put('/Configuracion', form);
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

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  useEffect(() => {
    if (!sucursalSar) return;
    cargarSarSucursal(sucursalSar).catch((err) => {
      setError(err?.response?.data?.message || 'Error al cargar SAR de la sucursal');
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

      {mensaje && <div className="alert alert-success mt-3 mb-0">{mensaje}</div>}
      {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}
    </div>
  );
}

export default Configuracion;
