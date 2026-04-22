import { useEffect, useState } from 'react';
import api from '../../services/api';
import { exportToExcelCsv } from '../../utils/excelExport';
import { formatCurrencyHNL, formatDateTimeHN } from '../../utils/formatters';

const toLocalInput = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

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
      <h2 className="mb-4">Movimientos de Caja</h2>

      {mensaje && <div className="alert alert-success">{mensaje}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {cargandoCaja ? (
        <div className="card shadow-sm">
          <div className="card-body placeholder-glow">
            <span className="placeholder col-4 mb-3"></span>
            <span className="placeholder col-12 mb-2"></span>
            <span className="placeholder col-12 mb-2"></span>
            <span className="placeholder col-10 mb-2"></span>
            <span className="placeholder col-8"></span>
          </div>
        </div>
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
              <div className="row g-2 mb-2">
                <div className="col-md-3">
                  <label className="form-label">Desde</label>
                  <input type="datetime-local" className="form-control form-control-sm" value={filtro.desde} onChange={(e) => setFiltro((p) => ({ ...p, desde: e.target.value }))} />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Hasta</label>
                  <input type="datetime-local" className="form-control form-control-sm" value={filtro.hasta} onChange={(e) => setFiltro((p) => ({ ...p, hasta: e.target.value }))} />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Tipo</label>
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
                    Excel
                  </button>
                </div>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="small">
                  <strong>Ingresos:</strong> {formatCurrencyHNL(resumen.ingresos)} |{' '}
                  <strong>Egresos:</strong> {formatCurrencyHNL(resumen.egresos)}
                </div>
              </div>
              <div className="compact-table-wrap">
                {cargandoMovimientos && (
                  <div className="alert alert-secondary py-2">
                    Cargando movimientos...
                  </div>
                )}
                <table className="table table-bordered align-middle mb-0">
                <thead>
                  <tr>
                    <th>No.</th>
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
                      <td>{formatDateTimeHN(item.fecha)}</td>
                      <td>{item.tipo}</td>
                      <td>{item.descripcion}</td>
                      <td>{formatCurrencyHNL(item.monto)}</td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
              <div className="d-flex justify-content-between align-items-center mt-2">
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
