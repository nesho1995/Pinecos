import { useEffect, useState } from 'react';
import api from '../../services/api';
import { getUsuario } from '../../utils/auth';
import { exportToExcelCsv } from '../../utils/excelExport';

function Gastos() {
  const usuario = getUsuario();
  const esAdmin = String(usuario?.rol || usuario?.Rol || '').toUpperCase() === 'ADMIN';

  const [gastos, setGastos] = useState([]);
  const [form, setForm] = useState({
    categoria_Gasto: '',
    descripcion: '',
    monto: ''
  });
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cajaActual, setCajaActual] = useState(null);
  const [cargandoCaja, setCargandoCaja] = useState(true);

  const cargarGastos = async () => {
    try {
      const response = await api.get('/Gastos');
      setGastos(response.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al cargar gastos');
    }
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const cargarCajaActual = async () => {
    try {
      setCargandoCaja(true);
      const response = await api.get('/Dashboard/caja-actual');
      setCajaActual(response.data || null);
    } catch {
      setCajaActual(null);
    } finally {
      setCargandoCaja(false);
    }
  };

  const crearGasto = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    try {
      await api.post('/Gastos', {
        categoria_Gasto: form.categoria_Gasto,
        descripcion: form.descripcion,
        monto: Number(form.monto)
      });
      setForm({ categoria_Gasto: '', descripcion: '', monto: '' });
      setMensaje('Gasto registrado correctamente');
      await cargarGastos();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al registrar gasto');
    }
  };

  useEffect(() => {
    cargarGastos();
    cargarCajaActual();
  }, []);

  const exportarExcel = () => {
    if (!gastos.length) return;
    exportToExcelCsv(
      'gastos.csv',
      esAdmin ? ['No.', 'Fecha', 'Categoria', 'Descripcion', 'Monto', 'Usuario'] : ['No.', 'Fecha', 'Categoria', 'Descripcion', 'Monto'],
      gastos.map((x) => (
        esAdmin
          ? [x.id_Gasto, x.fecha ? new Date(x.fecha).toLocaleString('es-HN') : '', x.categoria_Gasto, x.descripcion, Number(x.monto || 0).toFixed(2), x.usuario || 'Sin dato']
          : [x.id_Gasto, x.fecha ? new Date(x.fecha).toLocaleString('es-HN') : '', x.categoria_Gasto, x.descripcion, Number(x.monto || 0).toFixed(2)]
      ))
    );
  };

  const totalGastos = gastos.reduce((acc, x) => acc + Number(x.monto || 0), 0);

  return (
    <div>
      <div className="caja-page-header mb-4">
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <div>
            <h4 className="mb-0 fw-bold">Gastos</h4>
            <div className="small text-muted">Registro de egresos del dia</div>
          </div>
          <span className={`badge ms-auto caja-status-badge ${cargandoCaja ? 'bg-secondary' : cajaActual?.abierta ? 'caja-status-abierta' : 'caja-status-cerrada'}`}>
            {cargandoCaja ? '...' : cajaActual?.abierta ? `● Caja #${cajaActual.id_Caja}` : '○ Sin caja'}
          </span>
        </div>
      </div>

      {!esAdmin && (
        <div className="alert alert-info small">Vista de cajero: solo se muestran tus propios gastos.</div>
      )}

      <div className="card shadow-sm caja-form-card mb-4">
        <div className="card-body">
          <div className="caja-section-label mb-3">Registrar gasto</div>
          <form onSubmit={crearGasto} className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Categoria</label>
              <input
                type="text"
                className="form-control"
                name="categoria_Gasto"
                value={form.categoria_Gasto}
                onChange={handleChange}
                placeholder="Ej: Insumos"
                required
                disabled={cargandoCaja || !cajaActual?.abierta}
              />
            </div>
            <div className="col-md-5">
              <label className="form-label">Descripcion</label>
              <input
                type="text"
                className="form-control"
                name="descripcion"
                value={form.descripcion}
                onChange={handleChange}
                required
                disabled={cargandoCaja || !cajaActual?.abierta}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Monto</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="form-control"
                name="monto"
                value={form.monto}
                onChange={handleChange}
                required
                disabled={cargandoCaja || !cajaActual?.abierta}
              />
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button className="btn btn-dark w-100" disabled={cargandoCaja || !cajaActual?.abierta}>Guardar</button>
            </div>
          </form>
          {mensaje && <div className="alert alert-success mt-3 mb-0">{mensaje}</div>}
          {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
            <div className="caja-section-label mb-0">
              Historial
              {gastos.length > 0 && (
                <span className="caja-total-inline ms-2">
                  Total: <strong>L {totalGastos.toFixed(2)}</strong>
                </span>
              )}
            </div>
            <button className="btn btn-outline-success btn-sm" onClick={exportarExcel} disabled={!gastos.length}>
              Exportar Excel
            </button>
          </div>
          <div className="compact-table-wrap">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>No.</th>
                  <th>Fecha</th>
                  <th>Categoria</th>
                  <th>Descripcion</th>
                  <th>Monto</th>
                  {esAdmin && <th>Usuario</th>}
                </tr>
              </thead>
              <tbody>
                {gastos.map((item) => (
                  <tr key={item.id_Gasto}>
                    <td className="text-muted small">{item.id_Gasto}</td>
                    <td className="small">{new Date(item.fecha).toLocaleString('es-HN')}</td>
                    <td>
                      <span className="badge caja-categoria-badge">{item.categoria_Gasto}</span>
                    </td>
                    <td>{item.descripcion}</td>
                    <td className="fw-semibold text-danger">L {Number(item.monto || 0).toFixed(2)}</td>
                    {esAdmin && <td className="small text-muted">{item.usuario || 'Sin dato'}</td>}
                  </tr>
                ))}
                {gastos.length === 0 && (
                  <tr>
                    <td colSpan={esAdmin ? 6 : 5} className="text-center text-muted py-4">
                      No hay gastos registrados
                    </td>
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

export default Gastos;
