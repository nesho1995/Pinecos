import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';

function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({
    nombre: '',
    usuarioLogin: '',
    clave: '',
    rol: 'CAJERO',
    id_Sucursal: '',
    activo: true
  });
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargarUsuarios = async () => {
    try {
      const response = await api.get('/Usuarios');
      setUsuarios(response.data || []);
    } catch {
      setError('Error al cargar usuarios');
    }
  };

  const cargarSucursales = async () => {
    try {
      const response = await api.get('/Sucursales', { params: { incluirInactivas: true } });
      setSucursales(response.data || []);
    } catch {
      setError('Error al cargar sucursales');
    }
  };

  useEffect(() => {
    cargarUsuarios();
    cargarSucursales();
  }, []);

  const limpiarMensajes = () => {
    setError('');
    setMensaje('');
  };

  const limpiarFormulario = () => {
    setEditandoId(null);
    setForm({
      nombre: '',
      usuarioLogin: '',
      clave: '',
      rol: 'CAJERO',
      id_Sucursal: '',
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

  const guardarUsuario = async (e) => {
    e.preventDefault();
    limpiarMensajes();

    const payload = {
      nombre: form.nombre.trim(),
      usuarioLogin: form.usuarioLogin.trim(),
      clave: form.clave,
      rol: form.rol,
      id_Sucursal: form.id_Sucursal ? Number(form.id_Sucursal) : null,
      activo: form.activo
    };

    if (!payload.nombre || !payload.usuarioLogin) {
      setError('Nombre y usuario son obligatorios');
      return;
    }

    try {
      if (editandoId) {
        await api.put(`/Usuarios/${editandoId}`, payload);
        setMensaje('Usuario actualizado correctamente');
      } else {
        if (!payload.clave) return setError('La clave es obligatoria para crear usuario');
        await api.post('/Usuarios', payload);
        setMensaje('Usuario creado correctamente');
      }
      limpiarFormulario();
      await cargarUsuarios();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al guardar usuario');
    }
  };

  const editarUsuario = (item) => {
    limpiarMensajes();
    setEditandoId(item.id_Usuario);
    setForm({
      nombre: item.nombre || '',
      usuarioLogin: item.usuario || '',
      clave: '',
      rol: item.rol || 'CAJERO',
      id_Sucursal: item.id_Sucursal || '',
      activo: item.activo ?? true
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleUsuario = async (item) => {
    const accion = item.activo ? 'desactivar' : 'reactivar';
    if (item.activo && !window.confirm('Se desactivara este usuario. Continuar?')) return;
    limpiarMensajes();
    try {
      await api.put(`/Usuarios/${item.id_Usuario}`, {
        nombre: item.nombre,
        usuarioLogin: item.usuario,
        clave: '',
        rol: item.rol,
        id_Sucursal: item.id_Sucursal,
        activo: !item.activo
      });
      setMensaje(`Usuario ${accion}do correctamente`);
      await cargarUsuarios();
    } catch (err) {
      setError(err?.response?.data?.message || `Error al ${accion} usuario`);
    }
  };

  const dataFiltrada = useMemo(() => {
    const text = filtro.toLowerCase().trim();
    if (!text) return usuarios;
    return usuarios.filter((u) =>
      [u.nombre, u.usuario, u.rol, u.sucursal].join(' ').toLowerCase().includes(text)
    );
  }, [usuarios, filtro]);

  return (
    <div>
      <h2 className="mb-4">Usuarios</h2>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <form onSubmit={guardarUsuario} className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Nombre</label>
              <input type="text" className="form-control" name="nombre" value={form.nombre} onChange={handleChange} required />
            </div>
            <div className="col-md-2">
              <label className="form-label">Usuario</label>
              <input type="text" className="form-control" name="usuarioLogin" value={form.usuarioLogin} onChange={handleChange} required />
            </div>
            <div className="col-md-2">
              <label className="form-label">Clave</label>
              <input
                type="password"
                className="form-control"
                name="clave"
                value={form.clave}
                onChange={handleChange}
                placeholder={editandoId ? 'Solo si cambia' : ''}
                required={!editandoId}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Rol</label>
              <select className="form-select" name="rol" value={form.rol} onChange={handleChange}>
                <option value="ADMIN">ADMIN</option>
                <option value="CAJERO">CAJERO</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Sucursal</label>
              <select className="form-select" name="id_Sucursal" value={form.id_Sucursal} onChange={handleChange}>
                <option value="">Sin sucursal</option>
                {sucursales.map((suc) => (
                  <option key={suc.id_Sucursal} value={suc.id_Sucursal}>{suc.nombre}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <div className="form-check">
                <input type="checkbox" className="form-check-input" name="activo" checked={form.activo} onChange={handleChange} />
                <label className="form-check-label">Activo</label>
              </div>
            </div>
            <div className="col-md-2">
              <button className="btn btn-dark w-100" type="submit">{editandoId ? 'Actualizar' : 'Guardar'}</button>
            </div>
            <div className="col-md-2">
              <button className="btn btn-outline-secondary w-100" type="button" onClick={limpiarFormulario}>Limpiar</button>
            </div>
          </form>
          {mensaje && <div className="alert alert-success mt-3 mb-0">{mensaje}</div>}
          {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <input
            type="text"
            className="form-control mb-3"
            style={{ maxWidth: 320 }}
            placeholder="Buscar usuario..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
          <table className="table table-bordered align-middle">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Nombre</th>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Sucursal</th>
                <th>Estado</th>
                <th style={{ width: 220 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {dataFiltrada.map((item) => (
                <tr key={item.id_Usuario}>
                  <td>{item.id_Usuario}</td>
                  <td>{item.nombre}</td>
                  <td>{item.usuario}</td>
                  <td>{item.rol}</td>
                  <td>{item.sucursal || '-'}</td>
                  <td>
                    <span className={`status-pill ${item.activo ? 'active' : 'inactive'}`}>
                      {item.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      <button className="btn btn-sm btn-outline-primary" onClick={() => editarUsuario(item)}>
                        Editar
                      </button>
                      <button
                        className={`btn btn-sm ${item.activo ? 'btn-outline-warning' : 'btn-outline-success'}`}
                        onClick={() => toggleUsuario(item)}
                      >
                        {item.activo ? 'Desactivar' : 'Reactivar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {dataFiltrada.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center">No hay usuarios para mostrar</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Usuarios;

