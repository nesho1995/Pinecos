import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

function Productos() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [mostrarInactivos, setMostrarInactivos] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({
    nombre: '',
    id_Categoria: '',
    costo: 0,
    activo: true
  });
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargarProductos = async () => {
    try {
      const response = await api.get('/Productos', {
        params: { incluirInactivos: mostrarInactivos }
      });
      setProductos(response.data || []);
    } catch {
      setError('Error al cargar productos');
    }
  };

  const cargarCategorias = async () => {
    try {
      const response = await api.get('/Categorias');
      setCategorias(response.data || []);
    } catch {
      setError('Error al cargar categorias');
    }
  };

  useEffect(() => {
    cargarProductos();
  }, [mostrarInactivos]);

  useEffect(() => {
    cargarCategorias();
  }, []);

  const limpiarMensajes = () => {
    setError('');
    setMensaje('');
  };

  const limpiarFormulario = () => {
    setForm({
      nombre: '',
      id_Categoria: '',
      costo: 0,
      activo: true
    });
    setEditandoId(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const guardarProducto = async (e) => {
    e.preventDefault();
    limpiarMensajes();

    if (!form.nombre.trim()) return setError('El nombre es requerido');
    if (!form.id_Categoria) return setError('Selecciona una categoria');

    const payload = {
      nombre: form.nombre.trim(),
      id_Categoria: Number(form.id_Categoria),
      costo: Number(form.costo || 0),
      activo: form.activo
    };

    try {
      if (editandoId) {
        await api.put(`/Productos/${editandoId}`, payload);
        setMensaje('Producto actualizado correctamente');
      } else {
        await api.post('/Productos', payload);
        setMensaje('Producto creado correctamente');
      }
      limpiarFormulario();
      await cargarProductos();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al guardar producto');
    }
  };

  const editarProducto = (item) => {
    limpiarMensajes();
    setEditandoId(item.id_Producto);
    setForm({
      nombre: item.nombre || '',
      id_Categoria: item.id_Categoria || '',
      costo: item.costo || 0,
      activo: item.activo ?? true
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const desactivarProducto = async (item) => {
    if (!window.confirm('Se desactivara este producto. Continuar?')) return;
    limpiarMensajes();
    try {
      await api.delete(`/Productos/${item.id_Producto}`);
      setMensaje('Producto desactivado correctamente');
      if (editandoId === item.id_Producto) limpiarFormulario();
      await cargarProductos();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al desactivar producto');
    }
  };

  const reactivarProducto = async (item) => {
    limpiarMensajes();
    try {
      await api.post(`/Productos/${item.id_Producto}/reactivar`);
      setMensaje('Producto reactivado correctamente');
      await cargarProductos();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al reactivar producto');
    }
  };

  const dataFiltrada = useMemo(() => {
    const text = filtro.toLowerCase().trim();
    if (!text) return productos;
    return productos.filter((p) =>
      [p.nombre, p.categoria].join(' ').toLowerCase().includes(text)
    );
  }, [productos, filtro]);

  return (
    <div>
      <h2 className="mb-4">Productos</h2>

      <div className="alert alert-info d-flex flex-wrap justify-content-between align-items-center gap-2">
        <span>
          En esta pantalla defines el catalogo y costo. El precio de venta se configura por sucursal.
        </span>
        <Link className="btn btn-sm btn-outline-primary" to="/menu-sucursal">
          Ir a Precios por Sucursal
        </Link>
      </div>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <form onSubmit={guardarProducto} className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Nombre</label>
              <input type="text" className="form-control" name="nombre" value={form.nombre} onChange={handleChange} required />
            </div>
            <div className="col-md-3">
              <label className="form-label">Categoria</label>
              <select className="form-select" name="id_Categoria" value={form.id_Categoria} onChange={handleChange} required>
                <option value="">Seleccione</option>
                {categorias.map((cat) => (
                  <option key={cat.id_Categoria} value={cat.id_Categoria}>{cat.nombre}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Costo</label>
              <input type="number" min="0" step="0.01" className="form-control" name="costo" value={form.costo} onChange={handleChange} />
            </div>
            <div className="col-md-1 d-flex align-items-end">
              <div className="form-check">
                <input type="checkbox" className="form-check-input" name="activo" checked={form.activo} onChange={handleChange} />
                <label className="form-check-label">Activo</label>
              </div>
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button className="btn btn-dark w-100" type="submit">{editandoId ? 'Actualizar' : 'Guardar'}</button>
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button className="btn btn-outline-secondary w-100" type="button" onClick={limpiarFormulario}>Limpiar</button>
            </div>
          </form>
          {mensaje && <div className="alert alert-success mt-3 mb-0">{mensaje}</div>}
          {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <div className="d-flex flex-wrap gap-2 justify-content-between mb-3">
            <input
              type="text"
              className="form-control"
              style={{ maxWidth: 320 }}
              placeholder="Buscar producto..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="verInactivosProductos"
                checked={mostrarInactivos}
                onChange={(e) => setMostrarInactivos(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="verInactivosProductos">
                Ver inactivos
              </label>
            </div>
          </div>

          <table className="table table-bordered align-middle">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Nombre</th>
                <th>Categoria</th>
                <th>Costo</th>
                <th>Estado</th>
                <th style={{ width: 220 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {dataFiltrada.map((item) => (
                <tr key={item.id_Producto}>
                  <td>{item.id_Producto}</td>
                  <td>{item.nombre}</td>
                  <td>{item.categoria}</td>
                  <td>L {Number(item.costo || 0).toFixed(2)}</td>
                  <td>
                    <span className={`status-pill ${item.activo ? 'active' : 'inactive'}`}>
                      {item.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      <button className="btn btn-sm btn-outline-primary" onClick={() => editarProducto(item)}>
                        Editar
                      </button>
                      {item.activo ? (
                        <button className="btn btn-sm btn-outline-warning" onClick={() => desactivarProducto(item)}>
                          Desactivar
                        </button>
                      ) : (
                        <button className="btn btn-sm btn-outline-success" onClick={() => reactivarProducto(item)}>
                          Reactivar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {dataFiltrada.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center">No hay productos para mostrar</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Productos;

