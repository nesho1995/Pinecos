import { useEffect, useState } from 'react';
import api from '../../services/api';

function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [nombre, setNombre] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargarCategorias = async () => {
    try {
      const response = await api.get('/Categorias');
      setCategorias(response.data);
    } catch {
      setError('Error al cargar categorías');
    }
  };

  const limpiarMensajes = () => {
    setError('');
    setMensaje('');
  };

  const guardarCategoria = async (e) => {
    e.preventDefault();
    limpiarMensajes();

    try {
      if (editandoId) {
        await api.put(`/Categorias/${editandoId}`, { nombre });
        setMensaje('Categoría actualizada correctamente');
      } else {
        await api.post('/Categorias', { nombre });
        setMensaje('Categoría creada correctamente');
      }

      setNombre('');
      setEditandoId(null);
      cargarCategorias();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al guardar categoría');
    }
  };

  const editarCategoria = (item) => {
    limpiarMensajes();
    setNombre(item.nombre);
    setEditandoId(item.id_Categoria);
  };

  const eliminarCategoria = async (id) => {
    if (!window.confirm('¿Eliminar esta categoría?')) return;

    limpiarMensajes();

    try {
      await api.delete(`/Categorias/${id}`);
      setMensaje('Categoría eliminada correctamente');

      if (editandoId === id) {
        setEditandoId(null);
        setNombre('');
      }

      cargarCategorias();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al eliminar categoría');
    }
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setNombre('');
    limpiarMensajes();
  };

  useEffect(() => {
    cargarCategorias();
  }, []);

  return (
    <div>
      <h2 className="mb-4">Categorías</h2>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <form onSubmit={guardarCategoria} className="row g-3">
            <div className="col-md-8">
              <input
                type="text"
                className="form-control"
                placeholder="Nombre de la categoría"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>

            <div className="col-md-2">
              <button className="btn btn-dark w-100" type="submit">
                {editandoId ? 'Actualizar' : 'Guardar'}
              </button>
            </div>

            <div className="col-md-2">
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
                <th>ID</th>
                <th>Nombre</th>
                <th style={{ width: '180px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((item) => (
                <tr key={item.id_Categoria}>
                  <td>{item.id_Categoria}</td>
                  <td>{item.nombre}</td>
                  <td>
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => editarCategoria(item)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => eliminarCategoria(item.id_Categoria)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {categorias.length === 0 && (
                <tr>
                  <td colSpan="3" className="text-center">
                    No hay categorías registradas
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

export default Categorias;