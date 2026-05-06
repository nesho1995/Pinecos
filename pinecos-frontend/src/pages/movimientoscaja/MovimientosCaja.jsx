import { useEffect, useState } from 'react';
import api from '../../services/api';
import { exportToExcelCsv } from '../../utils/excelExport';
import { formatCurrencyHNL, formatDateTimeHN } from '../../utils/formatters';

const toLocalInput = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

function tipoBadge(tipo) {
  const t = String(tipo || '').toUpperCase();
  if (t === 'INGRESO') return <span className="badge caja-tipo-ingreso">{tipo}</span>;
  if (t === 'EGRESO')  return <span className="badge caja-tipo-egreso">{tipo}</span>;
  return <span className="badge caja-tipo-ajuste">{tipo}</span>;
}

function MovimientosCaja() {
  const [cajaActual, setCajaActual] = useState(null);
  const [cargandoCaja, setCargandoCaja] = useState(true);
  const [cargandoMovimientos, setCargandoMovimientos] = useState(false);
  const [movimientos, setMovimientos] = useState([]);
  const [resumen, setResumen] = useState({ ingresos: 0, egresos: 0 });
  const [paginacion, setPaginacion] = useState({ total: 0, page: 1, pageSize: 50 });
  const [filtro, setFiltro] = useState({
    desde: toLocalInput(new Date(new Date().setHours(0, 0, 0, 0))),
    hasta: toLocalInput(new Date()),
    tipo: ''
  });
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

  const cargarMovimientos = async (idCaja, page = paginacion.page) => {
    if (!idCaja) return;
    setCargandoMovimientos(true);
    try {
      const response = await api.get(`/MovimientosCaja/caja/${idCaja}`, {
        params: {
          page,
          pageSize: paginacion.pageSize,
          desde: filtro.desde || undefined,
          hasta: filtro.hasta || undefined,
          tipo: filtro.tipo || undefined
        }
      });
      setMovimientos(response.data?.data || []);
      setResumen(response.data?.resumen || { ingresos: 0, egresos: 0 });
      setPaginacion((prev) => ({
        ...prev,
        total: Number(response.data?.total || 0),
        page: Number(response.data?.page || page),
        pageSize: Number(response.data?.pageSize || prev.pageSize)
      }));
    } finally {
      setCargandoMovimientos(false);
    }
  };

  const init = async () => {
    try {
      const caja = await cargarCajaActual();
      if (caja?.abierta) await cargarMovimientos(caja.id_Caja);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al cargar movimientos');
    }
  };

  useEffect(() => {
    init();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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
      setForm({ tipo: 'EGRESO', descripcion: '', monto: '' });
      setMensaje('Movimiento registrado correctamente');
      cargarMovimientos(cajaActual.id_Caja, 1);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al registrar movimiento');
    }
  };

  const exportarExcel = () => {
    if (!movimientos.length) return;
    exportToExcelCsv(
      `movimientos-caja-${cajaActual?.id_Caja || 'actual'}.csv`,
      ['No.', 'Fecha', 'Tipo', 'Descripcion', 'Monto'],
      movimientos.map((x) => [
        x.id_Movimiento_Caja,
        x.fecha ? new Date(x.fecha).toLocaleString('es-HN') : '',
        x.tipo,
        x.descripcion,
        Number(x.monto || 0).toFixed(2)
      ])
    );
  };

  const aplicarFiltros = async () => {
    if (!cajaActual?.id_Caja) return;
    await cargarMovimientos(cajaActual.id_Caja, 1);
  };

  return (
    <div>
      <div className="caja-page-header mb-4">
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <div>
            <h4 className="mb-0 fw-bold">Movimientos de Caja</h4>
            <div className="small text-muted">Ingresos, egresos y ajustes del turno</div>
          </div>
          <span className={`badge ms-auto caja-status-badge ${cargandoCaja ? 'bg-secondary' : cajaActual?.abierta ? 'caja-status-abierta' : 'caja-status-cerrada'}`}>
            {cargandoCaja ? '...' : cajaActual?.abierta ? `● Caja #${cajaActual.id_Caja}` : '○ Sin caja'}
          </span>
        </div>
      </div>

      {mensaje && <div className="alert alert-success">{mensaje}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {cargandoCaja ? (
        <div className="card shadow-sm">
          <div className="card-body placeholder-glow">
            <span className="placeholder col-4 mb-3 d-block"></span>
            <span className="placeholder col-12 mb-2 d-block"></span>
            <span className="placeholder col-12 mb-2 d-block"></span>
            <span className="placeholder col-10 mb-2 d-block"></span>
            <span className="placeholder col-8 d-block"></span>
          </div>
        </div>
      ) : !cajaActual?.abierta ? (
        <div className="alert alert-warning">No hay caja abierta. Abre caja para registrar movimientos.</div>
      ) : (
        <>
          {cajaActual?.abierta && (
            <div className="caja-resumen-strip mb-4">
              <div className="caja-resumen-item ingreso">
                <div className="caja-resumen-label">Ingresos</div>
                <div className="caja-resumen-monto">{formatCurrencyHNL(resumen.ingresos)}</div>
              </div>
              <div className="caja-resumen-divider" />
              <div className="caja-resumen-item egreso">
                <div className="caja-resumen-label">Egresos</div>
                <div className="caja-resumen-monto">{formatCurrencyHNL(resumen.egresos)}</div>
              </div>
              <div className="caja-resumen-divider" />
              <div className="caja-resumen-item neto">
                <div className="caja-resumen-label">Neto</div>
                <div className="caja-resumen-monto">{formatCurrencyHNL(resumen.ingresos - resumen.egresos)}</div>
              </div>
            </div>
          )}

          <div className="card shadow-sm caja-form-card mb-4">
            <div className="card-body">
              <div className="caja-section-label mb-3">Registrar movimiento</div>
              <form onSubmit={guardarMovimiento} className="row g-3">
                <div className="col-md-3">
                  <label className="form-label">Tipo</label>
                  <select className="form-select" name="tipo" value={form.tipo} onChange={handleChange}>
                    <option value="INGRESO">INGRESO</option>
                    <option value="EGRESO">EGRESO</option>
                    <option value="AJUSTE">AJUSTE</option>
                  </select>
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
              <div className="caja-section-label mb-3">Historial</div>
              <div className="row g-2 mb-3">
                <div className="col-md-3">
                  <label className="form-label small">Desde</label>
                  <input type="datetime-local" className="form-control form-control-sm" value={filtro.desde} onChange={(e) => setFiltro((p) => ({ ...p, desde: e.target.value }))} />
                </div>
                <div className="col-md-3">
                  <label className="form-label small">Hasta</label>
                  <input type="datetime-local" className="form-control form-control-sm" value={filtro.hasta} onChange={(e) => setFiltro((p) => ({ ...p, hasta: e.target.value }))} />
                </div>
                <div className="col-md-2">
                  <label className="form-label small">Tipo</label>
                  <select className="form-select form-select-sm" value={filtro.tipo} onChange={(e) => setFiltro((p) => ({ ...p, tipo: e.target.value }))}>
                    <option value="">Todos</option>
                    <option value="INGRESO">INGRESO</option>
                    <option value="EGRESO">EGRESO</option>
                    <option value="AJUSTE">AJUSTE</option>
                  </select>
                </div>
                <div className="col-md-4 d-flex align-items-end gap-2">
                  <button className="btn btn-sm btn-dark" onClick={aplicarFiltros}>Filtrar</button>
                  <button className="btn btn-outline-success btn-sm" onClick={exportarExcel} disabled={!movimientos.length}>
                    Exportar Excel
                  </button>
                </div>
              </div>

              <div className="compact-table-wrap">
                {cargandoMovimientos && (
                  <div className="alert alert-secondary py-2 small">Cargando movimientos...</div>
                )}
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>No.</th>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Descripcion</th>
                      <th>Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.map((item) => (
                      <tr key={item.id_Movimiento_Caja}>
                        <td className="text-muted small">{item.id_Movimiento_Caja}</td>
                        <td className="small">{formatDateTimeHN(item.fecha)}</td>
                        <td>{tipoBadge(item.tipo)}</td>
                        <td>{item.descripcion}</td>
                        <td className="fw-semibold">{formatCurrencyHNL(item.monto)}</td>
                      </tr>
                    ))}
                    {movimientos.length === 0 && !cargandoMovimientos && (
                      <tr>
                        <td colSpan={5} className="text-center text-muted py-4">No hay movimientos en el rango seleccionado</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="d-flex justify-content-between align-items-center mt-3">
                <small className="text-muted">Mostrando {movimientos.length} de {paginacion.total} movimientos</small>
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    disabled={paginacion.page <= 1}
                    onClick={() => cargarMovimientos(cajaActual.id_Caja, paginacion.page - 1)}
                  >
                    Anterior
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    disabled={paginacion.page * paginacion.pageSize >= paginacion.total}
                    onClick={() => cargarMovimientos(cajaActual.id_Caja, paginacion.page + 1)}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default MovimientosCaja;
