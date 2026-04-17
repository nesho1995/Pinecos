import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { exportToExcelCsv } from '../../utils/excelExport';

function ReportesCliente() {
  const [sucursales, setSucursales] = useState([]);
  const [idSucursal, setIdSucursal] = useState('');
  const [panel, setPanel] = useState(null);
  const [topProductosMes, setTopProductosMes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const cargarSucursales = async () => {
      try {
        const res = await api.get('/Sucursales', { params: { incluirInactivas: false } });
        const data = res.data || [];
        setSucursales(data);
        if (data.length > 0) setIdSucursal(String(data[0].id_Sucursal));
      } catch {
        setSucursales([]);
      }
    };
    cargarSucursales();
  }, []);

  const cargarPanel = async () => {
    if (!idSucursal) return;
    setLoading(true);
    setError('');
    try {
      const ahora = new Date();
      const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0);
      const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59);

      const [resPanel, resProductos] = await Promise.all([
        api.get('/Reportes/panel-negocio', { params: { idSucursal: Number(idSucursal) } }),
        api.get('/Reportes/productos-mas-vendidos', {
          params: {
            idSucursal: Number(idSucursal),
            desde: inicioMes.toISOString(),
            hasta: finMes.toISOString()
          }
        })
      ]);

      setPanel(resPanel.data || null);
      setTopProductosMes(resProductos.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo cargar el panel cliente');
      setPanel(null);
      setTopProductosMes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPanel();
  }, [idSucursal]); // eslint-disable-line react-hooks/exhaustive-deps

  const tendencia = panel?.tendencia7Dias || [];
  const maxTendencia = useMemo(() => {
    const maxValue = Math.max(0, ...tendencia.map((x) => Number(x.total || 0)));
    return maxValue <= 0 ? 1 : maxValue;
  }, [tendencia]);

  const exportarTendencia = () => {
    exportToExcelCsv(
      'panel_cliente_tendencia_7_dias.csv',
      ['Fecha', 'Ventas', 'Total'],
      tendencia.map((x) => [String(x.fecha).slice(0, 10), Number(x.ventas || 0), Number(x.total || 0).toFixed(2)])
    );
  };

  const exportarTopProductos = () => {
    exportToExcelCsv(
      'panel_cliente_top_productos.csv',
      ['Producto', 'Cantidad', 'Monto'],
      topProductosMes.map((x) => [
        x.producto,
        Number(x.cantidadVendida || 0),
        Number(x.montoVendido || 0).toFixed(2)
      ])
    );
  };

  return (
    <div>
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Panel Cliente</h2>
        <div className="d-flex gap-2">
          <select className="form-select" style={{ minWidth: 220 }} value={idSucursal} onChange={(e) => setIdSucursal(e.target.value)}>
            {sucursales.map((s) => (
              <option key={s.id_Sucursal} value={s.id_Sucursal}>{s.nombre}</option>
            ))}
          </select>
          <button type="button" className="btn btn-dark" onClick={cargarPanel} disabled={loading || !idSucursal}>
            {loading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3 mb-3">
        <div className="col-md-3">
          <div className="card shadow-sm panel-kpi-card">
            <div className="card-body">
              <div className="panel-kpi-label">Ventas de hoy</div>
              <div className="panel-kpi-value">L {Number(panel?.hoy?.ventas?.total || 0).toFixed(2)}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm panel-kpi-card">
            <div className="card-body">
              <div className="panel-kpi-label">Tickets de hoy</div>
              <div className="panel-kpi-value">{Number(panel?.hoy?.ventas?.cantidad || 0)}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm panel-kpi-card">
            <div className="card-body">
              <div className="panel-kpi-label">Ventas del mes</div>
              <div className="panel-kpi-value">L {Number(panel?.mesActual?.ventas?.total || 0).toFixed(2)}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm panel-kpi-card">
            <div className="card-body">
              <div className="panel-kpi-label">Utilidad neta mes</div>
              <div className="panel-kpi-value">L {Number(panel?.mesActual?.costos?.utilidadNeta || 0).toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-7">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h5 className="mb-0">Tendencia ultimos 7 dias</h5>
                <button className="btn btn-outline-success btn-sm" onClick={exportarTendencia}>Excel</button>
              </div>
              {tendencia.length === 0 ? (
                <div className="text-muted">No hay datos de tendencia.</div>
              ) : (
                <div className="panel-bars-wrap">
                  {tendencia.map((d, idx) => {
                    const total = Number(d.total || 0);
                    const width = Math.max(4, (total / maxTendencia) * 100);
                    return (
                      <div className="panel-bar-row" key={`trend-${idx}`}>
                        <div className="panel-bar-label">{String(d.fecha).slice(5, 10)}</div>
                        <div className="panel-bar-track">
                          <div className="panel-bar-fill" style={{ width: `${width}%` }} />
                        </div>
                        <div className="panel-bar-value">L {total.toFixed(2)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h5 className="mb-0">Top productos del mes</h5>
                <button className="btn btn-outline-success btn-sm" onClick={exportarTopProductos}>Excel</button>
              </div>
              <div className="table-responsive">
                <table className="table table-bordered align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProductosMes.map((p, idx) => (
                      <tr key={`tp-${idx}`}>
                        <td>{p.producto}</td>
                        <td>{Number(p.cantidadVendida || 0)}</td>
                        <td>L {Number(p.montoVendido || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                    {topProductosMes.length === 0 && (
                      <tr>
                        <td colSpan="3" className="text-center">Sin datos</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportesCliente;
