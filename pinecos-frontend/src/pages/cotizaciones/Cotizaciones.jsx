import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { getUsuario, isAdmin } from '../../utils/auth';

const nuevaLinea = () => ({
  id_Producto: '',
  id_Presentacion: '',
  descripcion: '',
  cantidad: 1,
  precio_Unitario: 0
});

const formInicial = {
  id_Cotizacion: 0,
  id_Sucursal: '',
  cliente_Nombre: '',
  cliente_Rtn: '',
  cliente_Direccion: '',
  cliente_Telefono: '',
  descuento: 0,
  impuesto: 0,
  observacion: '',
  detalles: [nuevaLinea()]
};

function Cotizaciones() {
  const usuario = getUsuario();
  const admin = isAdmin();
  const [cotizaciones, setCotizaciones] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [productos, setProductos] = useState([]);
  const [form, setForm] = useState(formInicial);
  const [filtros, setFiltros] = useState({ busqueda: '', estado: '', idSucursal: '' });
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const moneda = 'L';
  const subtotal = useMemo(
    () => (form.detalles || []).reduce((acc, item) => acc + Number(item.cantidad || 0) * Number(item.precio_Unitario || 0), 0),
    [form.detalles]
  );
  const total = Math.max(0, subtotal - Number(form.descuento || 0) + Number(form.impuesto || 0));

  const cargarSucursales = async () => {
    if (!admin) return [];
    const res = await api.get('/Sucursales', { params: { incluirInactivas: true } });
    const data = res.data || [];
    setSucursales(data);
    return data;
  };

  const cargarProductos = async (idSucursal = '') => {
    try {
      const params = idSucursal ? { idSucursal: Number(idSucursal) } : undefined;
      const res = await api.get('/Productos', { params });
      setProductos(res.data || []);
    } catch {
      setProductos([]);
    }
  };

  const cargarCotizaciones = async (override = {}) => {
    const params = { ...filtros, ...override };
    Object.keys(params).forEach((key) => {
      if (params[key] === '' || params[key] == null) delete params[key];
    });
    const res = await api.get('/Cotizaciones', { params });
    setCotizaciones(res.data || []);
  };

  const cargarTodo = async () => {
    setLoading(true);
    setError('');
    try {
      const sucursalesData = await cargarSucursales();
      const sucursalInicial = admin && sucursalesData[0] ? String(sucursalesData[0].id_Sucursal) : String(usuario?.id_Sucursal || usuario?.id_sucursal || '');
      setForm((prev) => ({ ...prev, id_Sucursal: sucursalInicial }));
      await cargarProductos(sucursalInicial);
      await cargarCotizaciones(admin && sucursalInicial ? { idSucursal: sucursalInicial } : {});
      if (admin && sucursalInicial) setFiltros((prev) => ({ ...prev, idSucursal: sucursalInicial }));
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo cargar cotizaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  const limpiarForm = () => {
    setForm({
      ...formInicial,
      id_Sucursal: form.id_Sucursal || filtros.idSucursal || ''
    });
    setMensaje('');
    setError('');
  };

  const cambiarForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const cambiarLinea = (index, field, value) => {
    setForm((prev) => {
      const detalles = [...prev.detalles];
      detalles[index] = { ...detalles[index], [field]: value };
      return { ...prev, detalles };
    });
  };

  const seleccionarProducto = (index, idProducto) => {
    const producto = productos.find((p) => String(p.id_Producto) === String(idProducto));
    setForm((prev) => {
      const detalles = [...prev.detalles];
      detalles[index] = {
        ...detalles[index],
        id_Producto: idProducto,
        descripcion: producto?.nombre || detalles[index].descripcion,
        precio_Unitario: Number(producto?.precioReferencia || detalles[index].precio_Unitario || 0)
      };
      return { ...prev, detalles };
    });
  };

  const agregarLinea = () => setForm((prev) => ({ ...prev, detalles: [...prev.detalles, nuevaLinea()] }));
  const quitarLinea = (index) => {
    setForm((prev) => ({
      ...prev,
      detalles: prev.detalles.length > 1 ? prev.detalles.filter((_, i) => i !== index) : [nuevaLinea()]
    }));
  };

  const guardar = async (e) => {
    e.preventDefault();
    setMensaje('');
    setError('');
    setGuardando(true);
    try {
      const payload = {
        id_Sucursal: form.id_Sucursal ? Number(form.id_Sucursal) : null,
        cliente_Nombre: form.cliente_Nombre,
        cliente_Rtn: form.cliente_Rtn,
        cliente_Direccion: form.cliente_Direccion,
        cliente_Telefono: form.cliente_Telefono,
        descuento: Number(form.descuento || 0),
        impuesto: Number(form.impuesto || 0),
        observacion: form.observacion,
        detalles: form.detalles.map((x) => ({
          id_Producto: x.id_Producto ? Number(x.id_Producto) : null,
          id_Presentacion: x.id_Presentacion ? Number(x.id_Presentacion) : null,
          descripcion: x.descripcion,
          cantidad: Number(x.cantidad || 0),
          precio_Unitario: Number(x.precio_Unitario || 0)
        }))
      };

      if (form.id_Cotizacion) {
        await api.put(`/Cotizaciones/${form.id_Cotizacion}`, payload);
        setMensaje('Cotizacion actualizada correctamente');
      } else {
        await api.post('/Cotizaciones', payload);
        setMensaje('Cotizacion creada correctamente');
      }

      await cargarCotizaciones();
      limpiarForm();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo guardar la cotizacion');
    } finally {
      setGuardando(false);
    }
  };

  const editar = async (id) => {
    setMensaje('');
    setError('');
    try {
      const res = await api.get(`/Cotizaciones/${id}`);
      const data = res.data || {};
      setForm({
        id_Cotizacion: data.id_Cotizacion || 0,
        id_Sucursal: data.id_Sucursal ? String(data.id_Sucursal) : '',
        cliente_Nombre: data.cliente_Nombre || '',
        cliente_Rtn: data.cliente_Rtn || '',
        cliente_Direccion: data.cliente_Direccion || '',
        cliente_Telefono: data.cliente_Telefono || '',
        descuento: Number(data.descuento || 0),
        impuesto: Number(data.impuesto || 0),
        observacion: data.observacion || '',
        detalles: (data.detalles || []).length
          ? data.detalles.map((x) => ({
              id_Producto: x.id_Producto ? String(x.id_Producto) : '',
              id_Presentacion: x.id_Presentacion ? String(x.id_Presentacion) : '',
              descripcion: x.descripcion || '',
              cantidad: Number(x.cantidad || 0),
              precio_Unitario: Number(x.precio_Unitario || 0)
            }))
          : [nuevaLinea()]
      });
      await cargarProductos(data.id_Sucursal || '');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo abrir la cotizacion');
    }
  };

  const anular = async (id) => {
    const motivo = window.prompt('Motivo de anulacion');
    if (motivo === null) return;
    setMensaje('');
    setError('');
    try {
      await api.post(`/Cotizaciones/${id}/anular`, { motivo });
      await cargarCotizaciones();
      setMensaje('Cotizacion anulada');
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo anular la cotizacion');
    }
  };

  const verHtml = async (id) => {
    try {
      const res = await api.get(`/Cotizaciones/${id}/html`, { responseType: 'text' });
      const win = window.open('', '_blank', 'noopener,noreferrer');
      if (win) {
        win.document.open();
        win.document.write(res.data);
        win.document.close();
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo generar la vista HTML');
    }
  };

  const descargarPdf = async (id, numero) => {
    try {
      const res = await api.get(`/Cotizaciones/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `cotizacion-${numero || id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo descargar el PDF');
    }
  };

  const aplicarFiltros = async (e) => {
    e.preventDefault();
    setMensaje('');
    setError('');
    await cargarCotizaciones();
  };

  if (loading) return <div>Cargando cotizaciones...</div>;

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="mb-1">Cotizaciones</h2>
          <div className="text-muted small">Modulo independiente: no descuenta inventario, no toca caja y no genera factura fiscal.</div>
        </div>
        <button type="button" className="btn btn-outline-secondary" onClick={limpiarForm}>Nueva</button>
      </div>

      {mensaje && <div className="alert alert-success">{mensaje}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <form onSubmit={guardar} className="row g-3">
            {admin && (
              <div className="col-md-3">
                <label className="form-label">Sucursal</label>
                <select
                  className="form-select"
                  value={form.id_Sucursal}
                  onChange={async (e) => {
                    cambiarForm('id_Sucursal', e.target.value);
                    await cargarProductos(e.target.value);
                  }}
                >
                  <option value="">Sin sucursal</option>
                  {sucursales.map((s) => (
                    <option key={s.id_Sucursal} value={s.id_Sucursal}>{s.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="col-md-5">
              <label className="form-label">Cliente</label>
              <input className="form-control" value={form.cliente_Nombre} onChange={(e) => cambiarForm('cliente_Nombre', e.target.value)} required />
            </div>
            <div className="col-md-2">
              <label className="form-label">RTN</label>
              <input className="form-control" value={form.cliente_Rtn} onChange={(e) => cambiarForm('cliente_Rtn', e.target.value)} />
            </div>
            <div className="col-md-2">
              <label className="form-label">Telefono</label>
              <input className="form-control" value={form.cliente_Telefono} onChange={(e) => cambiarForm('cliente_Telefono', e.target.value)} />
            </div>
            <div className="col-md-12">
              <label className="form-label">Direccion</label>
              <input className="form-control" value={form.cliente_Direccion} onChange={(e) => cambiarForm('cliente_Direccion', e.target.value)} />
            </div>

            <div className="col-12">
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead className="table-light">
                    <tr>
                      <th style={{ minWidth: 210 }}>Catalogo</th>
                      <th style={{ minWidth: 260 }}>Descripcion</th>
                      <th style={{ width: 120 }}>Cantidad</th>
                      <th style={{ width: 150 }}>Precio</th>
                      <th style={{ width: 150 }}>Total</th>
                      <th style={{ width: 90 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.detalles.map((item, index) => (
                      <tr key={`detalle-${index}`}>
                        <td>
                          <select className="form-select form-select-sm" value={item.id_Producto} onChange={(e) => seleccionarProducto(index, e.target.value)}>
                            <option value="">Linea libre</option>
                            {productos.map((p) => (
                              <option key={p.id_Producto} value={p.id_Producto}>{p.nombre}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input className="form-control form-control-sm" value={item.descripcion} onChange={(e) => cambiarLinea(index, 'descripcion', e.target.value)} required />
                        </td>
                        <td>
                          <input type="number" step="0.01" min="0.01" className="form-control form-control-sm" value={item.cantidad} onChange={(e) => cambiarLinea(index, 'cantidad', e.target.value)} required />
                        </td>
                        <td>
                          <input type="number" step="0.01" min="0" className="form-control form-control-sm" value={item.precio_Unitario} onChange={(e) => cambiarLinea(index, 'precio_Unitario', e.target.value)} required />
                        </td>
                        <td className="text-end fw-semibold">{moneda} {(Number(item.cantidad || 0) * Number(item.precio_Unitario || 0)).toFixed(2)}</td>
                        <td>
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => quitarLinea(index)}>Quitar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={agregarLinea}>Agregar linea</button>
            </div>

            <div className="col-md-6">
              <label className="form-label">Observaciones</label>
              <textarea className="form-control" rows={3} value={form.observacion} onChange={(e) => cambiarForm('observacion', e.target.value)} />
            </div>
            <div className="col-md-6">
              <div className="row g-2 justify-content-end">
                <div className="col-md-5">
                  <label className="form-label">Descuento</label>
                  <input type="number" step="0.01" min="0" className="form-control text-end" value={form.descuento} onChange={(e) => cambiarForm('descuento', e.target.value)} />
                </div>
                <div className="col-md-5">
                  <label className="form-label">Impuesto</label>
                  <input type="number" step="0.01" min="0" className="form-control text-end" value={form.impuesto} onChange={(e) => cambiarForm('impuesto', e.target.value)} />
                </div>
                <div className="col-12">
                  <div className="border rounded p-3 bg-light">
                    <div className="d-flex justify-content-between"><span>Subtotal</span><strong>{moneda} {subtotal.toFixed(2)}</strong></div>
                    <div className="d-flex justify-content-between"><span>Descuento</span><strong>{moneda} {Number(form.descuento || 0).toFixed(2)}</strong></div>
                    <div className="d-flex justify-content-between"><span>Impuesto</span><strong>{moneda} {Number(form.impuesto || 0).toFixed(2)}</strong></div>
                    <div className="d-flex justify-content-between fs-5 mt-2"><span>Total</span><strong>{moneda} {total.toFixed(2)}</strong></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 d-flex gap-2">
              <button className="btn btn-dark" type="submit" disabled={guardando}>
                {guardando ? 'Guardando...' : form.id_Cotizacion ? 'Actualizar cotizacion' : 'Crear cotizacion'}
              </button>
              {form.id_Cotizacion > 0 && <button type="button" className="btn btn-outline-secondary" onClick={limpiarForm}>Cancelar edicion</button>}
            </div>
          </form>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <form className="row g-2 align-items-end mb-3" onSubmit={aplicarFiltros}>
            <div className="col-md-4">
              <label className="form-label">Buscar</label>
              <input className="form-control" value={filtros.busqueda} onChange={(e) => setFiltros((prev) => ({ ...prev, busqueda: e.target.value }))} placeholder="Numero, cliente o RTN" />
            </div>
            <div className="col-md-2">
              <label className="form-label">Estado</label>
              <select className="form-select" value={filtros.estado} onChange={(e) => setFiltros((prev) => ({ ...prev, estado: e.target.value }))}>
                <option value="">Todos</option>
                <option value="EMITIDA">Emitida</option>
                <option value="ANULADA">Anulada</option>
              </select>
            </div>
            {admin && (
              <div className="col-md-3">
                <label className="form-label">Sucursal</label>
                <select className="form-select" value={filtros.idSucursal} onChange={(e) => setFiltros((prev) => ({ ...prev, idSucursal: e.target.value }))}>
                  <option value="">Todas</option>
                  {sucursales.map((s) => (
                    <option key={s.id_Sucursal} value={s.id_Sucursal}>{s.nombre}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="col-md-3 d-flex gap-2">
              <button type="submit" className="btn btn-outline-primary">Filtrar</button>
              <button type="button" className="btn btn-outline-secondary" onClick={async () => {
                setFiltros({ busqueda: '', estado: '', idSucursal: '' });
                await cargarCotizaciones({ busqueda: '', estado: '', idSucursal: '' });
              }}>Limpiar</button>
            </div>
          </form>

          <div className="table-responsive">
            <table className="table table-bordered table-sm align-middle">
              <thead className="table-light">
                <tr>
                  <th>Numero</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Sucursal</th>
                  <th>Estado</th>
                  <th className="text-end">Total</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cotizaciones.map((c) => (
                  <tr key={c.id_Cotizacion}>
                    <td className="font-monospace">{c.numero}</td>
                    <td>{c.fecha ? new Date(c.fecha).toLocaleDateString('es-HN') : '-'}</td>
                    <td>{c.cliente_Nombre}</td>
                    <td>{c.sucursal || '-'}</td>
                    <td>
                      <span className={`status-pill ${c.estado === 'ANULADA' ? 'inactive' : 'active'}`}>{c.estado}</span>
                    </td>
                    <td className="text-end">{moneda} {Number(c.total || 0).toFixed(2)}</td>
                    <td>
                      <div className="d-flex flex-wrap gap-1">
                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => editar(c.id_Cotizacion)}>Editar</button>
                        <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => verHtml(c.id_Cotizacion)}>HTML</button>
                        <button type="button" className="btn btn-sm btn-outline-success" onClick={() => descargarPdf(c.id_Cotizacion, c.numero)}>PDF</button>
                        {c.estado !== 'ANULADA' && <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => anular(c.id_Cotizacion)}>Anular</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {cotizaciones.length === 0 && (
                  <tr><td colSpan="7" className="text-center text-muted">Sin cotizaciones registradas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Cotizaciones;
