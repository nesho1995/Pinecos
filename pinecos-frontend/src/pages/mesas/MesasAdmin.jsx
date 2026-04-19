import { useEffect, useState } from 'react';
import api from '../../services/api';

const mesaFormInicial = {
  nombre: '',
  capacidad: 2,
  forma: 'RECTANGULAR',
  pos_X: 30,
  pos_Y: 30,
  ancho: 120,
  alto: 70,
  activo: true
};

function MesasAdmin() {
  const [sucursales, setSucursales] = useState([]);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState('');
  const [mesas, setMesas] = useState([]);
  const [mesaForm, setMesaForm] = useState(mesaFormInicial);
  const [mesaEditandoId, setMesaEditandoId] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const limpiarMensajes = () => {
    setMensaje('');
    setError('');
  };

  const cargarSucursales = async () => {
    const response = await api.get('/Sucursales', { params: { incluirInactivas: true } });
    const data = response.data || [];
    setSucursales(data);
    if (!sucursalSeleccionada && data.length > 0) setSucursalSeleccionada(String(data[0].id_Sucursal));
  };

  const cargarMesas = async (idSucursal) => {
    if (!idSucursal) return;
    const response = await api.get(`/Mesas/sucursal/${idSucursal}`, { params: { incluirInactivas: true } });
    setMesas(response.data || []);
  };

  useEffect(() => {
    cargarSucursales().catch((err) => setError(err?.response?.data?.message || 'Error al cargar sucursales'));
  }, []);

  useEffect(() => {
    cargarMesas(sucursalSeleccionada).catch((err) => setError(err?.response?.data?.message || 'Error al cargar mesas'));
  }, [sucursalSeleccionada]);

  const seSobreponen = (a, b, margen = 14) =>
    !(
      a.x + a.w + margen <= b.x ||
      b.x + b.w + margen <= a.x ||
      a.y + a.h + margen <= b.y ||
      b.y + b.h + margen <= a.y
    );

  const calcularPosicionLibre = (anchoMesa, altoMesa, idMesaEdicion = null) => {
    const anchoLienzo = 920;
    const altoLienzo = 520;
    const pasoX = 28;
    const pasoY = 24;
    const inicioX = 20;
    const inicioY = 20;

    const ocupadas = mesas
      .filter((m) => m.activo && m.id_Mesa !== idMesaEdicion)
      .map((m) => ({
        x: Number(m.pos_X || 0),
        y: Number(m.pos_Y || 0),
        w: Number(m.ancho || 120),
        h: Number(m.alto || 70)
      }));

    for (let y = inicioY; y <= altoLienzo - altoMesa - 10; y += pasoY) {
      for (let x = inicioX; x <= anchoLienzo - anchoMesa - 10; x += pasoX) {
        const candidata = { x, y, w: anchoMesa, h: altoMesa };
        if (!ocupadas.some((o) => seSobreponen(candidata, o))) return { x, y };
      }
    }

    return { x: inicioX, y: inicioY };
  };

  const handleMesaFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setMesaForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const guardarMesa = async (e) => {
    e.preventDefault();
    limpiarMensajes();

    if (!sucursalSeleccionada) return setError('Selecciona una sucursal');
    if (!mesaForm.nombre.trim()) return setError('Nombre de mesa requerido');

    try {
      const payload = {
        id_Sucursal: Number(sucursalSeleccionada),
        nombre: mesaForm.nombre.trim(),
        capacidad: Number(mesaForm.capacidad || 0),
        forma: mesaForm.forma,
        pos_X: Number(mesaForm.pos_X || 0),
        pos_Y: Number(mesaForm.pos_Y || 0),
        ancho: Number(mesaForm.ancho || 120),
        alto: Number(mesaForm.alto || 70),
        activo: mesaForm.activo
      };

      if (mesaEditandoId) {
        const posicion = calcularPosicionLibre(payload.ancho, payload.alto, mesaEditandoId);
        payload.pos_X = posicion.x;
        payload.pos_Y = posicion.y;
        await api.put(`/Mesas/${mesaEditandoId}`, payload);
        setMensaje('Mesa actualizada correctamente (reubicada para evitar choques)');
      } else {
        const posicion = calcularPosicionLibre(payload.ancho, payload.alto);
        payload.pos_X = posicion.x;
        payload.pos_Y = posicion.y;
        await api.post('/Mesas', payload);
        setMensaje(`Mesa creada correctamente en X:${payload.pos_X} Y:${payload.pos_Y}`);
      }

      setMesaForm(mesaFormInicial);
      setMesaEditandoId(null);
      await cargarMesas(sucursalSeleccionada);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al guardar mesa');
    }
  };

  const editarMesa = (mesa) => {
    limpiarMensajes();
    setMesaEditandoId(mesa.id_Mesa);
    setMesaForm({
      nombre: mesa.nombre || '',
      capacidad: mesa.capacidad || 2,
      forma: mesa.forma || 'RECTANGULAR',
      pos_X: mesa.pos_X || 0,
      pos_Y: mesa.pos_Y || 0,
      ancho: mesa.ancho || 120,
      alto: mesa.alto || 70,
      activo: mesa.activo ?? true
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <h2 className="mb-4">Administracion de Mesas</h2>
      {mensaje && <div className="alert alert-success">{mensaje}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label className="form-label">Sucursal</label>
              <select className="form-select" value={sucursalSeleccionada} onChange={(e) => setSucursalSeleccionada(e.target.value)}>
                {sucursales.map((s) => <option key={s.id_Sucursal} value={s.id_Sucursal}>{s.nombre}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {sucursalSeleccionada && (
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h5 className="mb-3">{mesaEditandoId ? `Editar mesa #${mesaEditandoId}` : 'Agregar mesa a sucursal'}</h5>
            <form onSubmit={guardarMesa} className="row g-2">
              <div className="col-md-2">
                <input className="form-control" name="nombre" value={mesaForm.nombre} onChange={handleMesaFormChange} placeholder="Nombre" />
              </div>
              <div className="col-md-1">
                <input className="form-control" type="number" name="capacidad" value={mesaForm.capacidad} onChange={handleMesaFormChange} placeholder="Cap." />
              </div>
              <div className="col-md-2">
                <select className="form-select" name="forma" value={mesaForm.forma} onChange={handleMesaFormChange}>
                  <option value="RECTANGULAR">RECTANGULAR</option>
                  <option value="CIRCULAR">CIRCULAR</option>
                </select>
              </div>
              <div className="col-md-1">
                <input className="form-control" type="number" name="ancho" value={mesaForm.ancho} onChange={handleMesaFormChange} placeholder="Ancho" />
              </div>
              <div className="col-md-1">
                <input className="form-control" type="number" name="alto" value={mesaForm.alto} onChange={handleMesaFormChange} placeholder="Alto" />
              </div>
              <div className="col-md-2 d-flex align-items-center">
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" name="activo" checked={!!mesaForm.activo} onChange={handleMesaFormChange} />
                  <label className="form-check-label">Activa</label>
                </div>
              </div>
              <div className="col-md-3 d-flex gap-2">
                <button className="btn btn-dark w-100" type="submit">{mesaEditandoId ? 'Actualizar' : 'Crear'}</button>
                <button className="btn btn-outline-secondary w-100" type="button" onClick={() => { setMesaForm(mesaFormInicial); setMesaEditandoId(null); }}>
                  Limpiar
                </button>
              </div>
            </form>

            <div className="table-responsive mt-3">
              <table className="table table-bordered align-middle">
                <thead>
                  <tr>
                    <th>Codigo</th><th>Nombre</th><th>Cap.</th><th>Forma</th><th>Posicion</th><th>Tamano</th><th>Estado</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {mesas.map((m) => (
                    <tr key={m.id_Mesa}>
                      <td>{m.id_Mesa}</td>
                      <td>{m.nombre}</td>
                      <td>{m.capacidad}</td>
                      <td>{m.forma}</td>
                      <td>({m.pos_X},{m.pos_Y})</td>
                      <td>{m.ancho}x{m.alto}</td>
                      <td><span className={`status-pill ${m.activo ? 'active' : 'inactive'}`}>{m.activo ? 'Activa' : 'Inactiva'}</span></td>
                      <td>
                        <div className="d-flex gap-2">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => editarMesa(m)}>Editar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MesasAdmin;
