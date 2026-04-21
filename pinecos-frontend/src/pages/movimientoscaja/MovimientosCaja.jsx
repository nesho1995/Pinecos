import { useEffect, useState } from 'react';
import api from '../../services/api';
import { exportToExcelCsv } from '../../utils/excelExport';

function MovimientosCaja() {
  const [cajaActual, setCajaActual] = useState(null);
  const [cargandoCaja, setCargandoCaja] = useState(true);
  const [movimientos, setMovimientos] = useState([]);
  const [form, setForm] = useState({
    tipo: 'EGRESO',
    descripcion: '',
    monto: ''
  });
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargarCajaActual = async () => {
    try {
      setCargandoCaja(true);
      const response = await api.get('/Dashboard/caja-actual');
      const data = response.data || { abierta: false };
      setCajaActual(data);
      return data;
    } finally {
      setCargandoCaja(false);
    }
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

  const exportarExcel = () => {
    if (!movimientos.length) return;
    exportToExcelCsv(
      `movimientos_caja_${cajaActual?.id_Caja || 'actual'}.csv`,
      ['Codigo', 'Fecha', 'Tipo', 'Descripcion', 'Monto'],
      movimientos.map((x) => [
        x.id_Movimiento_Caja,
        x.fecha ? new Date(x.fecha).toLocaleString('es-HN') : '',
        x.tipo,
        x.descripcion,
        Number(x.monto || 0).toFixed(2)
      ])
    );
  };

  return (
    <div>
      <h2 className="mb-4">Movimientos de Caja</h2>

      {mensaje && <div className="alert alert-success">{mensaje}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {cargandoCaja ? (
        <div className="alert alert-secondary">Validando caja de la sucursal...</div>
      ) : !cajaActual?.abierta ? (
        <div className="alert alert-warning">No hay caja abierta.</div>
      ) : (
        <>
          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <h5>Caja #{cajaActual.id_Caja}</h5>
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
              <div className="d-flex justify-content-end mb-2">
                <button className="btn btn-outline-success btn-sm" onClick={exportarExcel} disabled={!movimientos.length}>
                  Excel
                </button>
              </div>
              <div className="compact-table-wrap">
                <table className="table table-bordered align-middle mb-0">
                <thead>
                  <tr>
                    <th>Codigo</th>
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
          </div>
        </>
      )}
    </div>
  );
}

export default MovimientosCaja;
