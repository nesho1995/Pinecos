import { useEffect, useState } from 'react';
import api from '../../services/api';

function Presentaciones() {
  const [presentaciones, setPresentaciones] = useState([]);
  const [form, setForm] = useState({
    nombre: '',
    onzas: ''
  });
  const [editandoId, setEditandoId] = useState(null);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargarPresentaciones = async () => {
    try {
      const response = await api.get('/Presentaciones');
      setPresentaciones(response.data);
    } catch {
      setError('Error al cargar presentaciones');
    }
  };

  const limpiarMensajes = () => {
    setError('');
    setMensaje('');
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const guardarPresentacion = async (e) => {
    e.preventDefault();
    limpiarMensajes();

    const payload = {
      nombre: form.nombre,
      onzas: Number(form.onzas)
    };

    try {
      if (editandoId) {
        await api.put(`/Presentaciones/${editandoId}`, payload);
        setMensaje('Presentación actualizada correctamente');
      } else {
        await api.post('/Presentaciones', payload);
        setMensaje('Presentación creada correctamente');
      }

      setForm({
        nombre: '',
        onzas: ''
      });
      setEditandoId(null);
      cargarPresentaciones();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al guardar presentación');
    }
  };

  const editarPresentacion = (item) => {
    limpiarMensajes();
    setEditandoId(item.id_Presentacion);
    setForm({
      nombre: item.nombre,
      onzas: item.onzas
    });
  };

  const eliminarPresentacion = async (id) => {
    if (!window.confirm('¿Eliminar esta presentación?')) return;

    limpiarMensajes();

    try {
      await api.delete(`/Presentaciones/${id}`);
      setMensaje('Presentación eliminada correctamente');

      if (editandoId === id) {
        setEditandoId(null);
        setForm({ nombre: '', onzas: '' });
      }

      cargarPresentaciones();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al eliminar presentación');
    }
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setForm({ nombre: '', onzas: '' });
    limpiarMensajes();
  };

  useEffect(() => {
    cargarPresentaciones();
  }, []);

  return (
    <div>
      <h2 className="mb-4">Presentaciones</h2>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <form onSubmit={guardarPresentacion} className="row g-3">
            <div className="col-md-5">
              <label className="form-label">Nombre</label>
              <input
                type="text"
                className="form-control"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                placeholder="Ej: 8 oz"
                required
              />
            </div>

            <div className="col-md-3">
              <label className="form-label">Onzas</label>
              <input
                type="number"
                className="form-control"
                name="onzas"
                value={form.onzas}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-md-2 d-flex align-items-end">
              <button className="btn btn-dark w-100" type="submit">
                {editandoId ? 'Actualizar' : 'Guardar'}
              </button>
            </div>

            <div className="col-md-2 d-flex align-items-end">
              <button
                className="btn btn-outline-secondary w-100"
                type="button"
                onClick={cancelarEdicion}
              >
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
          <table className="table table-bordered align-middle">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Nombre</th>
                <th>Onzas</th>
                <th style={{ width: '180px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {presentaciones.map((item) => (
                <tr key={item.id_Presentacion}>
                  <td>{item.id_Presentacion}</td>
                  <td>{item.nombre}</td>
                  <td>{item.onzas}</td>
                  <td>
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => editarPresentacion(item)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => eliminarPresentacion(item.id_Presentacion)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {presentaciones.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center">
                    No hay presentaciones registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Presentaciones;
