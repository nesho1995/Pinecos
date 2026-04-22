import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';

function Sucursales() {
  const [sucursales, setSucursales] = useState([]);
  const [mostrarInactivas, setMostrarInactivas] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({
    nombre: '',
    direccion: '',
    telefono: '',
    activo: true
  });
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargarSucursales = async () => {
    try {
      const response = await api.get('/Sucursales', {
        params: { incluirInactivas: mostrarInactivas }
      });
      setSucursales(response.data || []);
    } catch {
      setError('Error al cargar sucursales');
    }
  };

  useEffect(() => {
    cargarSucursales();
  }, [mostrarInactivas]);

  const limpiarMensajes = () => {
    setError('');
    setMensaje('');
  };

  const limpiarFormulario = () => {
    setEditandoId(null);
    setForm({
      nombre: '',
      direccion: '',
      telefono: '',
      activo: true
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const guardarSucursal = async (e) => {
    e.preventDefault();
    limpiarMensajes();

    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    try {
      const payload = {
        nombre: form.nombre.trim(),
        direccion: form.direccion.trim(),
        telefono: form.telefono.trim(),
        activo: form.activo
      };

      if (editandoId) {
        await api.put(`/Sucursales/${editandoId}`, payload);
        setMensaje('Sucursal actualizada correctamente');
      } else {
        await api.post('/Sucursales', payload);
        setMensaje('Sucursal creada correctamente');
      }

      limpiarFormulario();
      await cargarSucursales();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al guardar sucursal');
    }
  };

  const editarSucursal = (item) => {
    limpiarMensajes();
    setEditandoId(item.id_Sucursal);
    setForm({
      nombre: item.nombre || '',
      direccion: item.direccion || '',
      telefono: item.telefono || '',
      activo: item.activo ?? true
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const desactivarSucursal = async (item) => {
    if (!window.confirm('Se desactivara esta sucursal. Continuar?')) return;
    limpiarMensajes();
    try {
      await api.delete(`/Sucursales/${item.id_Sucursal}`);
      setMensaje('Sucursal desactivada correctamente');
      if (editandoId === item.id_Sucursal) limpiarFormulario();
      await cargarSucursales();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al desactivar sucursal');
    }
  };

  const reactivarSucursal = async (item) => {
    limpiarMensajes();
    try {
      await api.put(`/Sucursales/${item.id_Sucursal}`, {
        ...item,
        activo: true
      });
      setMensaje('Sucursal reactivada correctamente');
      await cargarSucursales();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al reactivar sucursal');
    }
  };

  const dataFiltrada = useMemo(() => {
    const texto = filtro.toLowerCase().trim();
    if (!texto) return sucursales;
    return sucursales.filter((s) =>
      [s.nombre, s.direccion, s.telefono].join(' ').toLowerCase().includes(texto)
    );
  }, [sucursales, filtro]);

  return (
    <div>
      <h2 className="mb-4">Sucursales</h2>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <form onSubmit={guardarSucursal} className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Nombre</label>
              <input type="text" className="form-control" name="nombre" value={form.nombre} onChange={handleChange} required />
            </div>
            <div className="col-md-4">
              <label className="form-label">Direccion</label>
              <input type="text" className="form-control" name="direccion" value={form.direccion} onChange={handleChange} />
            </div>
            <div className="col-md-2">
              <label className="form-label">Telefono</label>
              <input type="text" className="form-control" name="telefono" value={form.telefono} onChange={handleChange} />
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <div className="form-check">
                <input type="checkbox" className="form-check-input" name="activo" checked={form.activo} onChange={handleChange} />
                <label className="form-check-label">Activa</label>
              </div>
            </div>
            <div className="col-md-2">
              <button className="btn btn-dark w-100" type="submit">
                {editandoId ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
            <div className="col-md-2">
              <button className="btn btn-outline-secondary w-100" type="button" onClick={limpiarFormulario}>
                Limpiar
              </button>
            </div>
          </form>
          {mensaje && <div className="alert alert-success mt-3 mb-0">{mensaje}</div>}
          {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <div className="module-filters-bar mb-3">
            <div className="module-filters-main">
              <input
                type="text"
                className="form-control module-filter-input"
                placeholder="Buscar sucursal..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              />
            </div>
            <div className="form-check module-filter-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="mostrarInactivas"
                checked={mostrarInactivas}
                onChange={(e) => setMostrarInactivas(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="mostrarInactivas">
                Ver inactivas
              </label>
            </div>
          </div>

          <table className="table table-bordered align-middle">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Nombre</th>
                <th>Direccion</th>
                <th>Telefono</th>
                <th>Estado</th>
                <th style={{ width: 220 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {dataFiltrada.map((item) => (
                <tr key={item.id_Sucursal}>
                  <td>{item.id_Sucursal}</td>
                  <td>{item.nombre}</td>
                  <td>{item.direccion || '-'}</td>
                  <td>{item.telefono || '-'}</td>
                  <td>
                    <span className={`status-pill ${item.activo ? 'active' : 'inactive'}`}>
                      {item.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      <button className="btn btn-sm btn-outline-primary" onClick={() => editarSucursal(item)}>
                        Editar
                      </button>
                      {item.activo ? (
                        <button className="btn btn-sm btn-outline-danger" onClick={() => desactivarSucursal(item)}>
                          Desactivar
                        </button>
                      ) : (
                        <button className="btn btn-sm btn-outline-success" onClick={() => reactivarSucursal(item)}>
                          Reactivar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {dataFiltrada.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center">No hay sucursales para mostrar</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Sucursales;

