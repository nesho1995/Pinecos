import { useEffect, useState } from 'react';
import api from '../../services/api';

function MovimientosCaja() {
  const [cajaActual, setCajaActual] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [form, setForm] = useState({
    tipo: 'EGRESO',
    descripcion: '',
    monto: ''
  });
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargarCajaActual = async () => {
    const response = await api.get('/Dashboard/caja-actual');
    setCajaActual(response.data);
    return response.data;
  };

  const cargarMovimientos = async (idCaja) => {
    if (!idCaja) return;
    const response = await api.get(`/MovimientosCaja/caja/${idCaja}`);
    setMovimientos(response.data);
  };

  const init = async () => {
    try {
      const caja = await cargarCajaActual();
      if (caja?.abierta) {
        await cargarMovimientos(caja.id_Caja);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al cargar movimientos');
    }
  };

  useEffect(() => {
    init();
  }, []);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const guardarMovimiento = async (e) => {
    e.preventDefault();
    setMensaje('');
    setError('');

    try {
      await api.post('/MovimientosCaja', {
        id_Caja: cajaActual.id_Caja,
        tipo: form.tipo,
        descripcion: form.descripcion,
        monto: Number(form.monto)
      });

      setForm({
        tipo: 'EGRESO',
        descripcion: '',
        monto: ''
      });

      setMensaje('Movimiento registrado correctamente');
      cargarMovimientos(cajaActual.id_Caja);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al registrar movimiento');
    }
  };

  return (
    <div>
      <h2 className="mb-4">Movimientos de Caja</h2>

      {mensaje && <div className="alert alert-success">{mensaje}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {!cajaActual?.abierta ? (
        <div className="alert alert-warning">No hay caja abierta.</div>
      ) : (
        <>
          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <h5>Caja actual #{cajaActual.id_Caja}</h5>
              <form onSubmit={guardarMovimiento} className="row g-3 mt-1">
                <div className="col-md-3">
                  <label className="form-label">Tipo</label>
                  <select className="form-select" name="tipo" value={form.tipo} onChange={handleChange}>
                    <option value="INGRESO">INGRESO</option>
                    <option value="EGRESO">EGRESO</option>
                    <option value="AJUSTE">AJUSTE</option>
                  </select>
                </div>

                <div className="col-md-5">
                  <label className="form-label">Descripción</label>
                  <input
                    type="text"
                    className="form-control"
                    name="descripcion"
                    value={form.descripcion}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-2">
                  <label className="form-label">Monto</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    name="monto"
                    value={form.monto}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-2 d-flex align-items-end">
                  <button className="btn btn-dark w-100">Guardar</button>
                </div>
              </form>
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-body">
              <table className="table table-bordered align-middle">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Descripción</th>
                    <th>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((item) => (
                    <tr key={item.id_Movimiento_Caja}>
                      <td>{item.id_Movimiento_Caja}</td>
                      <td>{new Date(item.fecha).toLocaleString()}</td>
                      <td>{item.tipo}</td>
                      <td>{item.descripcion}</td>
                      <td>L {Number(item.monto || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default MovimientosCaja;