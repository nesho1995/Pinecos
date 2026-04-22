import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { exportToExcelCsv } from '../../utils/excelExport';

function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({
    nombre: '',
    rtn: '',
    telefono: '',
    email: '',
    contacto: '',
    direccion: '',
    activo: true
  });
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const limpiarMensajes = () => {
    setMensaje('');
    setError('');
  };

  const limpiarFormulario = () => {
    setForm({
      nombre: '',
      rtn: '',
      telefono: '',
      email: '',
      contacto: '',
      direccion: '',
      activo: true
    });
    setEditandoId(null);
  };

  const cargarProveedores = async () => {
    try {
      const res = await api.get('/Proveedores', { params: { incluirInactivos: mostrarInactivos } });
      setProveedores(res.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al cargar proveedores');
    }
  };

  useEffect(() => {
    cargarProveedores();
  }, [mostrarInactivos]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const guardarProveedor = async (e) => {
    e.preventDefault();
    limpiarMensajes();

    if (!form.nombre.trim()) return setError('Nombre requerido');
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return setError('Correo electronico invalido');
    }
    if (form.telefono.trim() && form.telefono.trim().length < 6) {
      return setError('Telefono invalido');
    }

    const payload = {
      nombre: form.nombre.trim(),
      rtn: form.rtn.trim(),
      telefono: form.telefono.trim(),
      email: form.email.trim(),
      contacto: form.contacto.trim(),
      direccion: form.direccion.trim(),
      activo: !!form.activo
    };

    try {
      if (editandoId) {
        await api.put(`/Proveedores/${editandoId}`, payload);
        setMensaje('Proveedor actualizado correctamente');
      } else {
        await api.post('/Proveedores', payload);
        setMensaje('Proveedor creado correctamente');
      }
      limpiarFormulario();
      await cargarProveedores();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al guardar proveedor');
    }
  };

  const editarProveedor = (item) => {
    limpiarMensajes();
    setEditandoId(item.id_Proveedor);
    setForm({
      nombre: item.nombre || '',
      rtn: item.rtn || '',
      telefono: item.telefono || '',
      email: item.email || '',
      contacto: item.contacto || '',
      direccion: item.direccion || '',
      activo: item.activo ?? true
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const inactivarProveedor = async (item) => {
    if (!window.confirm('Se inactivara este proveedor. Continuar?')) return;
    limpiarMensajes();
    try {
      await api.delete(`/Proveedores/${item.id_Proveedor}`);
      setMensaje('Proveedor inactivado correctamente');
      if (editandoId === item.id_Proveedor) limpiarFormulario();
      await cargarProveedores();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al inactivar proveedor');
    }
  };

  const reactivarProveedor = async (item) => {
    limpiarMensajes();
    try {
      await api.post(`/Proveedores/${item.id_Proveedor}/reactivar`);
      setMensaje('Proveedor reactivado correctamente');
      await cargarProveedores();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al reactivar proveedor');
    }
  };

  const dataFiltrada = useMemo(() => {
    const text = filtro.toLowerCase().trim();
    if (!text) return proveedores;
    return proveedores.filter((p) => [p.nombre, p.contacto, p.telefono, p.email, p.rtn].join(' ').toLowerCase().includes(text));
  }, [proveedores, filtro]);

  const resumen = useMemo(() => {
    const total = proveedores.length;
    const activos = proveedores.filter((x) => !!x.activo).length;
    const inactivos = total - activos;
    return { total, activos, inactivos };
  }, [proveedores]);

  const exportarCsv = () => {
    exportToExcelCsv(
      'proveedores.csv',
      ['Id', 'Nombre', 'Contacto', 'Telefono', 'Email', 'RTN', 'Direccion', 'Estado'],
      dataFiltrada.map((p) => [
        p.id_Proveedor,
        p.nombre,
        p.contacto,
        p.telefono,
        p.email,
        p.rtn,
        p.direccion,
        p.activo ? 'ACTIVO' : 'INACTIVO'
      ])
    );
  };

  return (
    <div className="prov-page">
      <h2 className="mb-4">Proveedores</h2>

      <details className="card shadow-sm mb-4 inventario-guia border border-secondary border-opacity-25">
        <summary className="px-3 py-3 fw-semibold user-select-none bg-light rounded-top">
          Para que sirve esta pantalla (tocar para ver u ocultar)
        </summary>
        <div className="card-body border-top py-3 small">
          <p className="mb-2">
            Los proveedores se eligen al registrar <strong>compras</strong> y <strong>ordenes de compra</strong> en Inventario. Usa nombre comercial reconocible y datos de contacto para reclamos.
          </p>
          <p className="text-muted mb-0">
            Inactivar un proveedor no borra compras ya registradas; solo evita usarlo en compras nuevas.
          </p>
        </div>
      </details>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <form onSubmit={guardarProveedor} className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Nombre</label>
              <input className="form-control" name="nombre" value={form.nombre} onChange={handleChange} required />
            </div>
            <div className="col-md-3">
              <label className="form-label">Contacto</label>
              <input className="form-control" name="contacto" value={form.contacto} onChange={handleChange} />
            </div>
            <div className="col-md-2">
              <label className="form-label">Telefono</label>
              <input className="form-control" name="telefono" value={form.telefono} onChange={handleChange} />
            </div>
            <div className="col-md-3">
              <label className="form-label">Email</label>
              <input className="form-control" name="email" value={form.email} onChange={handleChange} />
            </div>
            <div className="col-md-3">
              <label className="form-label">RTN</label>
              <input className="form-control" name="rtn" value={form.rtn} onChange={handleChange} />
            </div>
            <div className="col-md-7">
              <label className="form-label">Direccion</label>
              <input className="form-control" name="direccion" value={form.direccion} onChange={handleChange} />
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <div className="form-check">
                <input className="form-check-input" type="checkbox" name="activo" checked={!!form.activo} onChange={handleChange} />
                <label className="form-check-label">Activo</label>
              </div>
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button className="btn btn-dark w-100 prov-save-btn py-2" type="submit">{editandoId ? 'Actualizar' : 'Guardar'}</button>
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
          <div className="module-filters-bar mb-3">
            <div className="module-filters-main d-flex align-items-center">
              <input
                type="text"
                className="form-control module-filter-input"
                placeholder="Buscar proveedor..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              />
              <button type="button" className="btn btn-outline-success" onClick={exportarCsv}>Excel</button>
            </div>
            <div className="d-flex flex-wrap gap-3 align-items-center module-filter-check">
              <span className="badge text-bg-light border">Total: {resumen.total}</span>
              <span className="badge text-bg-success-subtle border">Activos: {resumen.activos}</span>
              <span className="badge text-bg-danger-subtle border">Inactivos: {resumen.inactivos}</span>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="verInactivosProveedores"
                  checked={mostrarInactivos}
                  onChange={(e) => setMostrarInactivos(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="verInactivosProveedores">Ver inactivos</label>
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-bordered align-middle">
              <thead>
                <tr>
                  <th>Id</th>
                  <th>Nombre</th>
                  <th>Contacto</th>
                  <th>Telefono</th>
                  <th>Email</th>
                  <th>RTN</th>
                  <th>Estado</th>
                  <th style={{ width: 280 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {dataFiltrada.map((item) => (
                  <tr key={item.id_Proveedor}>
                    <td>{item.id_Proveedor}</td>
                    <td>{item.nombre}</td>
                    <td>{item.contacto}</td>
                    <td>{item.telefono}</td>
                    <td>{item.email}</td>
                    <td>{item.rtn}</td>
                    <td>
                      <span className={`status-pill ${item.activo ? 'active' : 'inactive'}`}>{item.activo ? 'Activo' : 'Inactivo'}</span>
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-outline-primary" onClick={() => editarProveedor(item)}>Editar</button>
                        {item.activo ? (
                          <button className="btn btn-sm btn-outline-warning" onClick={() => inactivarProveedor(item)}>Inactivar</button>
                        ) : (
                          <button className="btn btn-sm btn-outline-success" onClick={() => reactivarProveedor(item)}>Reactivar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {dataFiltrada.length === 0 && (
                  <tr>
                    <td colSpan="8" className="text-center">No hay proveedores para mostrar</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Proveedores;
