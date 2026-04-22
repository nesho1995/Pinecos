import { useEffect, useState } from 'react';
import api from '../../services/api';
import { formatCurrencyHNL, formatDateTimeHN } from '../../utils/formatters';
import { getUserRole } from '../../utils/auth';

function ProductosPendientes() {
  const role = getUserRole();
  const esAdmin = role === 'ADMIN';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [sucursales, setSucursales] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('PENDIENTE');
  const [filtroSucursal, setFiltroSucursal] = useState('');
  const [listado, setListado] = useState([]);
  const [form, setForm] = useState({
    nombre: '',
    precioSugerido: '',
    notaSolicitud: ''
  });
  const [resolucion, setResolucion] = useState({
    idCategoria: '',
    costoReferencia: '',
    tipoFiscal: 'GRAVADO_15',
    precioAprobado: '',
    comentarioRevision: ''
  });

  const cargarCatalogosAdmin = async () => {
    if (!esAdmin) return;
    const [resSucursales, resCategorias] = await Promise.all([
      api.get('/Sucursales', { params: { incluirInactivas: false } }),
      api.get('/Categorias')
    ]);
    setSucursales(resSucursales.data || []);
    setCategorias(resCategorias.data || []);
  };

  const cargarSolicitudes = async () => {
    const params = {};
    if (filtroEstado) params.estado = filtroEstado;
    if (esAdmin && filtroSucursal) params.idSucursal = Number(filtroSucursal);
    const res = await api.get('/ProductoPendientes', { params });
    setListado(res.data?.data || []);
  };

  const recargarTodo = async () => {
    try {
      setLoading(true);
      setError('');
      await Promise.all([cargarCatalogosAdmin(), cargarSolicitudes()]);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo cargar el panel de productos pendientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    recargarTodo();
  }, [filtroEstado, filtroSucursal]);

  const enviarSolicitud = async (e) => {
    e.preventDefault();
    setMensaje('');
    setError('');
    try {
      await api.post('/ProductoPendientes', {
        nombre: form.nombre,
        precioSugerido: Number(form.precioSugerido),
        notaSolicitud: form.notaSolicitud
      });
      setMensaje('Solicitud registrada. Administracion ya puede revisarla.');
      setForm({ nombre: '', precioSugerido: '', notaSolicitud: '' });
      await cargarSolicitudes();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo guardar la solicitud');
    }
  };

  const resolver = async (item, aprobar) => {
    setMensaje('');
    setError('');
    try {
      await api.patch(`/ProductoPendientes/${item.id_Producto_Pendiente}/resolver`, {
        aprobar,
        idCategoria: aprobar ? Number(resolucion.idCategoria) : null,
        costoReferencia: aprobar && resolucion.costoReferencia !== '' ? Number(resolucion.costoReferencia) : null,
        tipoFiscal: resolucion.tipoFiscal,
        precioAprobado: aprobar && resolucion.precioAprobado !== '' ? Number(resolucion.precioAprobado) : 0,
        comentarioRevision: resolucion.comentarioRevision
      });
      setMensaje(aprobar ? 'Solicitud aprobada y publicada en catalogo.' : 'Solicitud rechazada.');
      setResolucion({
        idCategoria: '',
        costoReferencia: '',
        tipoFiscal: 'GRAVADO_15',
        precioAprobado: '',
        comentarioRevision: ''
      });
      await cargarSolicitudes();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo procesar la solicitud');
    }
  };

  return (
    <div>
      <h2 className="mb-3">Productos faltantes</h2>
      <p className="text-muted small mb-3">
        Este panel evita perder ventas cuando no existe un producto en catalogo: caja lo solicita y administracion lo aprueba o rechaza con trazabilidad.
      </p>

      {mensaje && <div className="alert alert-success">{mensaje}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <h3 className="h6">Solicitar producto no encontrado</h3>
          <form className="row g-2" onSubmit={enviarSolicitud}>
            <div className="col-md-4">
              <label className="form-label">Nombre del producto</label>
              <input
                className="form-control"
                value={form.nombre}
                onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                required
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Precio sugerido (L)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="form-control"
                value={form.precioSugerido}
                onChange={(e) => setForm((p) => ({ ...p, precioSugerido: e.target.value }))}
                required
              />
            </div>
            <div className="col-md-5">
              <label className="form-label">Nota operativa (opcional)</label>
              <input
                className="form-control"
                placeholder="Ej. cliente lo pide todos los dias"
                value={form.notaSolicitud}
                onChange={(e) => setForm((p) => ({ ...p, notaSolicitud: e.target.value }))}
              />
            </div>
            <div className="col-12">
              <button type="submit" className="btn btn-primary btn-sm">Enviar a administracion</button>
            </div>
          </form>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <div className="d-flex flex-wrap gap-2 align-items-end mb-3">
            <div>
              <label className="form-label">Estado</label>
              <select className="form-select" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                <option value="">Todos</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="APROBADO">Aprobado</option>
                <option value="RECHAZADO">Rechazado</option>
              </select>
            </div>
            {esAdmin && (
              <div>
                <label className="form-label">Sucursal</label>
                <select className="form-select" value={filtroSucursal} onChange={(e) => setFiltroSucursal(e.target.value)}>
                  <option value="">Todas</option>
                  {sucursales.map((s) => <option key={s.id_Sucursal} value={s.id_Sucursal}>{s.nombre}</option>)}
                </select>
              </div>
            )}
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={recargarTodo}>Actualizar</button>
          </div>

          {loading ? (
            <div className="text-muted">Cargando solicitudes...</div>
          ) : listado.length === 0 ? (
            <div className="alert alert-light border mb-0">No hay solicitudes para el filtro actual.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Producto</th>
                    <th>Sucursal</th>
                    <th>Precio sugerido</th>
                    <th>Solicita</th>
                    <th>Estado</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {listado.map((item) => (
                    <tr key={item.id_Producto_Pendiente}>
                      <td>{formatDateTimeHN(item.fecha_Creacion)}</td>
                      <td className="fw-semibold">{item.nombre}</td>
                      <td>{item.sucursal}</td>
                      <td>{formatCurrencyHNL(item.precio_Sugerido)}</td>
                      <td>{item.usuarioSolicita}</td>
                      <td>
                        <span className={`badge ${item.estado === 'PENDIENTE' ? 'text-bg-warning' : item.estado === 'APROBADO' ? 'text-bg-success' : 'text-bg-secondary'}`}>
                          {item.estado}
                        </span>
                      </td>
                      <td>
                        <div className="small">
                          {item.nota_Solicitud ? <div><strong>Nota:</strong> {item.nota_Solicitud}</div> : <div className="text-muted">Sin nota</div>}
                          {item.comentario_Revision && <div><strong>Revision:</strong> {item.comentario_Revision}</div>}
                          {esAdmin && item.estado === 'PENDIENTE' && (
                            <div className="mt-2 border rounded p-2">
                              <div className="row g-2">
                                <div className="col-md-4">
                                  <select className="form-select form-select-sm" value={resolucion.idCategoria} onChange={(e) => setResolucion((p) => ({ ...p, idCategoria: e.target.value }))}>
                                    <option value="">Categoria para aprobar</option>
                                    {categorias.map((c) => <option key={c.id_Categoria} value={c.id_Categoria}>{c.nombre}</option>)}
                                  </select>
                                </div>
                                <div className="col-md-3">
                                  <input className="form-control form-control-sm" type="number" min="0" step="0.01" placeholder="Costo ref." value={resolucion.costoReferencia} onChange={(e) => setResolucion((p) => ({ ...p, costoReferencia: e.target.value }))} />
                                </div>
                                <div className="col-md-3">
                                  <input className="form-control form-control-sm" type="number" min="0.01" step="0.01" placeholder="Precio aprobado" value={resolucion.precioAprobado} onChange={(e) => setResolucion((p) => ({ ...p, precioAprobado: e.target.value }))} />
                                </div>
                                <div className="col-md-2">
                                  <select className="form-select form-select-sm" value={resolucion.tipoFiscal} onChange={(e) => setResolucion((p) => ({ ...p, tipoFiscal: e.target.value }))}>
                                    <option value="GRAVADO_15">15%</option>
                                    <option value="GRAVADO_18">18%</option>
                                    <option value="EXENTO">Exento</option>
                                    <option value="EXONERADO">Exonerado</option>
                                  </select>
                                </div>
                                <div className="col-12">
                                  <input className="form-control form-control-sm" placeholder="Comentario de revision" value={resolucion.comentarioRevision} onChange={(e) => setResolucion((p) => ({ ...p, comentarioRevision: e.target.value }))} />
                                </div>
                                <div className="col-12 d-flex gap-2">
                                  <button type="button" className="btn btn-success btn-sm" onClick={() => resolver(item, true)}>Aprobar y publicar</button>
                                  <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => resolver(item, false)}>Rechazar</button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductosPendientes;
