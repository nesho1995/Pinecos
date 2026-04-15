import { useEffect, useState } from 'react';
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

  return (
    <div>
      <h2 className="mb-2">Precios por sucursal</h2>
      <p className="text-muted mb-4">
        Aqui defines el precio de venta por sucursal. El costo se maneja en Productos.
      </p>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <label className="form-label">Sucursal</label>
          <select
            className="form-select"
            value={sucursalSeleccionada}
            onChange={(e) => setSucursalSeleccionada(e.target.value)}
          >
            <option value="">Seleccione</option>
            {sucursales.map((s) => (
              <option key={s.id_Sucursal} value={s.id_Sucursal}>
                {s.nombre}
              </option>
            ))}
          </select>
          {!sucursalSeleccionada && (
            <small className="text-muted d-block mt-2">Primero selecciona sucursal para guardar precios.</small>
          )}
        </div>
      </div>

      {mensaje && <div className="alert alert-success">{mensaje}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-4">
        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5>Paso 1: Precio de producto normal</h5>
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
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="Precio"
                    value={formProductoSucursal.precio}
                    onChange={(e) =>
                      setFormProductoSucursal({ ...formProductoSucursal, precio: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="col-12">
                  <button className="btn btn-dark w-100" disabled={!sucursalSeleccionada}>
                    Guardar precio
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5>Paso 2: Relacion producto-presentacion</h5>
              <small className="text-muted d-block mb-2">
                Este paso es de catalogo global (se reutiliza en todas las sucursales).
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
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5>Paso 3: Precio por presentacion</h5>
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
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="Precio"
                    value={formPrecioPresentacion.precio}
                    onChange={(e) =>
                      setFormPrecioPresentacion({ ...formPrecioPresentacion, precio: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="col-12">
                  <button className="btn btn-dark w-100" disabled={!sucursalSeleccionada}>
                    Guardar precio
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {sucursalSeleccionada && (
        <div className="row g-4 mt-2">
          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-body">
                <h5>Productos normales</h5>
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Categoria</th>
                      <th>Precio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menu.normales?.map((item, index) => (
                      <tr key={index}>
                        <td>{item.producto}</td>
                        <td>{item.categoria}</td>
                        <td>L {Number(item.precio || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-body">
                <h5>Productos con presentacion</h5>
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Presentacion</th>
                      <th>Precio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menu.conPresentacion?.map((item, index) => (
                      <tr key={index}>
                        <td>{item.producto}</td>
                        <td>{item.presentacion}</td>
                        <td>L {Number(item.precio || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MenuSucursal;
