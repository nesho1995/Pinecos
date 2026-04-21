import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

function MenuSucursal() {
  const [sucursales, setSucursales] = useState([]);
  const [productos, setProductos] = useState([]);
  const [presentaciones, setPresentaciones] = useState([]);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState('');
  const [menu, setMenu] = useState({ normales: [], conPresentacion: [] });

  const [formProductoSucursal, setFormProductoSucursal] = useState({
    id_Producto: '',
    precio: '',
    activo: true
  });

  const [formProductoPresentacion, setFormProductoPresentacion] = useState({
    id_Producto: '',
    id_Presentacion: ''
  });

  const [formPrecioPresentacion, setFormPrecioPresentacion] = useState({
    id_Producto_Presentacion: '',
    precio: '',
    activo: true
  });

  const [productoPresentaciones, setProductoPresentaciones] = useState([]);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [vista, setVista] = useState('asignar');
  const [eliminandoRelacionId, setEliminandoRelacionId] = useState(null);

  const cargarSucursales = async () => {
    const response = await api.get('/Sucursales');
    setSucursales(response.data || []);
  };

  const cargarProductos = async () => {
    const response = await api.get('/Productos');
    setProductos(response.data || []);
  };

  const cargarPresentaciones = async () => {
    const response = await api.get('/Presentaciones');
    setPresentaciones(response.data || []);
  };

  const cargarProductoPresentaciones = async () => {
    try {
      const response = await api.get('/Menu/producto-presentacion');
      setProductoPresentaciones(response.data || []);
    } catch {
      setProductoPresentaciones([]);
    }
  };

  const cargarMenu = async (idSucursal) => {
    if (!idSucursal) return;

    try {
      const response = await api.get(`/Menu/sucursal/${idSucursal}`);
      setMenu(response.data || { normales: [], conPresentacion: [] });
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al cargar menu');
    }
  };

  const handleAsignarProductoSucursal = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');

    try {
      await api.post('/Menu/producto-sucursal', {
        id_Producto: Number(formProductoSucursal.id_Producto),
        id_Sucursal: Number(sucursalSeleccionada),
        precio: Number(formProductoSucursal.precio),
        activo: formProductoSucursal.activo
      });

      setMensaje('Precio de producto guardado correctamente');
      setFormProductoSucursal({
        id_Producto: '',
        precio: '',
        activo: true
      });
      await cargarMenu(sucursalSeleccionada);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al guardar precio de producto');
    }
  };

  const handleAsignarProductoPresentacion = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');

    try {
      await api.post('/Menu/producto-presentacion', {
        id_Producto: Number(formProductoPresentacion.id_Producto),
        id_Presentacion: Number(formProductoPresentacion.id_Presentacion)
      });

      setMensaje('Relacion producto-presentacion guardada');
      setFormProductoPresentacion({
        id_Producto: '',
        id_Presentacion: ''
      });
      await cargarProductoPresentaciones();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al guardar relacion');
    }
  };

  const handleAsignarPrecioPresentacion = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');

    try {
      await api.post('/Menu/producto-presentacion-sucursal', {
        id_Producto_Presentacion: Number(formPrecioPresentacion.id_Producto_Presentacion),
        id_Sucursal: Number(sucursalSeleccionada),
        precio: Number(formPrecioPresentacion.precio),
        activo: formPrecioPresentacion.activo
      });

      setMensaje('Precio de presentacion guardado correctamente');
      setFormPrecioPresentacion({
        id_Producto_Presentacion: '',
        precio: '',
        activo: true
      });
      await cargarMenu(sucursalSeleccionada);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al guardar precio de presentacion');
    }
  };

  const handleEliminarRelacionProductoPresentacion = async (idProductoPresentacion) => {
    setError('');
    setMensaje('');

    if (!window.confirm('Esta accion eliminara la relacion en todas las sucursales. Deseas continuar?')) {
      return;
    }

    try {
      setEliminandoRelacionId(idProductoPresentacion);
      const res = await api.delete(`/Menu/producto-presentacion/${idProductoPresentacion}`);
      const body = res.data ?? {};
      setMensaje(body.message || 'Relacion eliminada correctamente');
      await cargarProductoPresentaciones();
      if (sucursalSeleccionada) {
        await cargarMenu(sucursalSeleccionada);
      }
    } catch (err) {
      const d = err?.response?.data;
      const extra = d?.detalle ? ` (${d.detalle})` : '';
      setError((d?.message || 'Error al eliminar relacion') + extra);
    } finally {
      setEliminandoRelacionId(null);
    }
  };

  useEffect(() => {
    cargarSucursales();
    cargarProductos();
    cargarPresentaciones();
    cargarProductoPresentaciones();
  }, []);

  useEffect(() => {
    if (sucursalSeleccionada) {
      cargarMenu(sucursalSeleccionada);
    }
  }, [sucursalSeleccionada]);

  const nombreSucursalActiva = sucursales.find((s) => String(s.id_Sucursal) === String(sucursalSeleccionada))?.nombre;

  return (
    <div>
      <h2 className="mb-2">Precios por sucursal (venta en POS)</h2>
      <p className="text-muted mb-3">
        El POS cobra segun el <strong>precio de venta</strong> configurado <strong>por cada sucursal</strong>. El costo interno y el catalogo estan en{' '}
        <Link to="/productos">Productos</Link>
        {' '}(tambien puedes{' '}
        <Link to={{ pathname: '/productos', hash: 'importar-productos-excel' }}>importar con Excel</Link>
        {' '}con costo y, si quieres, precio por sucursal).
      </p>

      <div className="card shadow-sm mb-4 border-0 bg-light">
        <div className="card-body">
          <h3 className="h6 mb-2">Guia rapida</h3>
          <ol className="small mb-0 ps-3">
            <li className="mb-2">
              <strong>Producto simple</strong> (un solo precio, sin tamanos): arriba elige la sucursal, luego en &quot;Paso A&quot; asigna producto + precio. Listo para cobrar en esa sucursal.
            </li>
            <li className="mb-2">
              <strong>Producto con tamanos</strong> (ej. 8/12/16 oz): en &quot;Paso B&quot; une el producto con cada presentacion (vale para todas las sucursales). Luego elige sucursal y en &quot;Paso C&quot; pon el precio de cada combinacion. En el POS, si ya hay precios activos por presentacion en esa sucursal, <strong>no</strong> se muestra tambien el precio &quot;simple&quot; del mismo producto (solo las lineas por tamano).
            </li>
            <li>
              Usa la pestana <strong>Ver listado</strong> para comprobar que cada producto ya tiene precio en la sucursal elegida antes de abrir caja.
            </li>
          </ol>
        </div>
      </div>

      <div className="card shadow-sm mb-4 border-primary border-2">
        <div className="card-body">
          <label className="form-label fw-semibold">1. Sucursal en la que vas a trabajar</label>
          <select
            className="form-select"
            value={sucursalSeleccionada}
            onChange={(e) => setSucursalSeleccionada(e.target.value)}
          >
            <option value="">Seleccione sucursal</option>
            {sucursales.map((s) => (
              <option key={s.id_Sucursal} value={s.id_Sucursal}>
                {s.nombre}
              </option>
            ))}
          </select>
          {sucursalSeleccionada ? (
            <div className="mt-2 small text-success">
              Precios que guardes abajo quedan en: <strong>{nombreSucursalActiva || 'sucursal seleccionada'}</strong>. Cambia la sucursal aqui para configurar otra tienda.
            </div>
          ) : (
            <small className="text-muted d-block mt-2">
              Debes elegir sucursal antes de guardar precios en los pasos A y C (el paso B no la necesita).
            </small>
          )}
        </div>
      </div>

      {mensaje && <div className="alert alert-success">{mensaje}</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="reports-tabs mb-3">
        <button className={`btn btn-sm ${vista === 'asignar' ? 'btn-dark' : 'btn-outline-secondary'}`} onClick={() => setVista('asignar')}>
          Dar precios de venta
        </button>
        <button className={`btn btn-sm ${vista === 'menu' ? 'btn-dark' : 'btn-outline-secondary'}`} onClick={() => setVista('menu')}>
          Ver listado (como en POS)
        </button>
      </div>

      {vista === 'asignar' && (
      <div className="row g-4">
        <div className="col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                <h5 className="mb-0">Paso A: Precio de venta (producto simple)</h5>
                <span className="badge text-bg-secondary text-wrap" style={{ maxWidth: '8rem' }}>Lo mas usual</span>
              </div>
              <p className="small text-muted mb-3">
                Para productos que se venden <strong>sin elegir tamano</strong> (un solo precio). El mismo producto puede tener otro precio en otra sucursal: cambia la sucursal arriba y vuelve a guardar.
              </p>
              <form onSubmit={handleAsignarProductoSucursal} className="row g-3">
                <div className="col-12">
                  <select
                    className="form-select"
                    value={formProductoSucursal.id_Producto}
                    onChange={(e) =>
                      setFormProductoSucursal({ ...formProductoSucursal, id_Producto: e.target.value })
                    }
                    required
                  >
                    <option value="">Producto</option>
                    {productos.map((p) => (
                      <option key={p.id_Producto} value={p.id_Producto}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-12">
                  <label className="form-label small mb-0">Precio de venta (L)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="Ej. 45.00"
                    value={formProductoSucursal.precio}
                    onChange={(e) =>
                      setFormProductoSucursal({ ...formProductoSucursal, precio: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="col-12">
                  <button className="btn btn-dark w-100" disabled={!sucursalSeleccionada}>
                    Guardar precio en esta sucursal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                <h5 className="mb-0">Paso B: Producto + presentacion (tamano)</h5>
                <span className="badge text-bg-warning text-dark text-wrap" style={{ maxWidth: '8rem' }}>Solo si aplica</span>
              </div>
              <small className="text-muted d-block mb-2">
                Define que tu producto se puede vender en cierto tamano (ej. 12 oz). Es <strong>catalogo global</strong>: una vez creada la relacion, sirve para todas las sucursales. El precio por tamano lo pones en el Paso C.
              </small>
              <form onSubmit={handleAsignarProductoPresentacion} className="row g-3">
                <div className="col-12">
                  <select
                    className="form-select"
                    value={formProductoPresentacion.id_Producto}
                    onChange={(e) =>
                      setFormProductoPresentacion({ ...formProductoPresentacion, id_Producto: e.target.value })
                    }
                    required
                  >
                    <option value="">Producto</option>
                    {productos.map((p) => (
                      <option key={p.id_Producto} value={p.id_Producto}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-12">
                  <select
                    className="form-select"
                    value={formProductoPresentacion.id_Presentacion}
                    onChange={(e) =>
                      setFormProductoPresentacion({
                        ...formProductoPresentacion,
                        id_Presentacion: e.target.value
                      })
                    }
                    required
                  >
                    <option value="">Presentacion</option>
                    {presentaciones.map((p) => (
                      <option key={p.id_Presentacion} value={p.id_Presentacion}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-12">
                  <button className="btn btn-dark w-100">Guardar relacion</button>
                </div>
              </form>

              <hr />
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">Relaciones creadas</h6>
                <small className="text-muted">{productoPresentaciones.length} total</small>
              </div>
              <div className="compact-table-wrap" style={{ maxHeight: '260px' }}>
                <table className="table table-sm table-bordered mb-0">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Presentacion</th>
                      <th style={{ width: '92px' }}>Accion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productoPresentaciones.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-center text-muted">Sin relaciones</td>
                      </tr>
                    ) : (
                      productoPresentaciones.map((item) => (
                        <tr key={item.id_Producto_Presentacion}>
                          <td>{item.producto}</td>
                          <td>{item.presentacion}</td>
                          <td className="text-center">
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => handleEliminarRelacionProductoPresentacion(item.id_Producto_Presentacion)}
                              disabled={eliminandoRelacionId === item.id_Producto_Presentacion}
                            >
                              Quitar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                <h5 className="mb-0">Paso C: Precio por tamano (en esta sucursal)</h5>
                <span className="badge text-bg-warning text-dark text-wrap" style={{ maxWidth: '8rem' }}>Tras paso B</span>
              </div>
              <p className="small text-muted mb-3">
                Solo aparecen las combinaciones que creaste en el Paso B. Cada sucursal puede tener precios distintos para la misma bebida en distinto tamano.
              </p>
              <form onSubmit={handleAsignarPrecioPresentacion} className="row g-3">
                <div className="col-12">
                  <select
                    className="form-select"
                    value={formPrecioPresentacion.id_Producto_Presentacion}
                    onChange={(e) =>
                      setFormPrecioPresentacion({
                        ...formPrecioPresentacion,
                        id_Producto_Presentacion: e.target.value
                      })
                    }
                    required
                  >
                    <option value="">Producto + Presentacion</option>
                    {productoPresentaciones.map((item) => (
                      <option
                        key={item.id_Producto_Presentacion}
                        value={item.id_Producto_Presentacion}
                      >
                        {item.producto} - {item.presentacion}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-12">
                  <label className="form-label small mb-0">Precio de venta (L)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="Ej. 55.00"
                    value={formPrecioPresentacion.precio}
                    onChange={(e) =>
                      setFormPrecioPresentacion({ ...formPrecioPresentacion, precio: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="col-12">
                  <button className="btn btn-dark w-100" disabled={!sucursalSeleccionada}>
                    Guardar precio en esta sucursal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      )}

      {vista === 'menu' && sucursalSeleccionada && (
        <div className="row g-4 mt-2">
          <div className="col-12">
            <p className="small text-muted mb-2">
              Listado para <strong>{nombreSucursalActiva}</strong>. Si un precio sale en L 0.00, aun no lo configuraste para esta sucursal.
            </p>
          </div>
          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-body">
                <h5 className="h6">Productos sin tamano (precio unico)</h5>
                <div className="compact-table-wrap">
                  <table className="table table-bordered mb-0">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Categoria</th>
                        <th>Precio venta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {menu.normales?.length ? (
                        menu.normales.map((item, index) => (
                          <tr key={index}>
                            <td>{item.producto}</td>
                            <td>{item.categoria}</td>
                            <td>L {Number(item.precio || 0).toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="text-center text-muted">Sin productos en esta lista</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-body">
                <h5 className="h6">Productos con tamano / presentacion</h5>
                <div className="compact-table-wrap">
                  <table className="table table-bordered mb-0">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Presentacion</th>
                        <th>Precio venta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {menu.conPresentacion?.length ? (
                        menu.conPresentacion.map((item, index) => (
                          <tr key={index}>
                            <td>{item.producto}</td>
                            <td>{item.presentacion}</td>
                            <td>L {Number(item.precio || 0).toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="text-center text-muted">Sin combinaciones con precio</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {vista === 'menu' && !sucursalSeleccionada && (
        <div className="alert alert-warning">Selecciona una sucursal para visualizar su menu.</div>
      )}
    </div>
  );
}

export default MenuSucursal;
