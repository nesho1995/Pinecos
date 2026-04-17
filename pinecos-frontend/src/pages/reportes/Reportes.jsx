import { useEffect, useState } from 'react';
import api from '../../services/api';
import { exportToExcelCsv } from '../../utils/excelExport';

const toLocalInput = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const now = new Date();
const inicioHoy = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
const finHoy = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 0);

function Reportes() {
  const [sucursales, setSucursales] = useState([]);
  const [form, setForm] = useState({
    desde: toLocalInput(inicioHoy),
    hasta: toLocalInput(finHoy),
    idSucursal: ''
  });

  const [panel, setPanel] = useState(null);
  const [dashboardAvanzado, setDashboardAvanzado] = useState(null);
  const [intervaloSerie, setIntervaloSerie] = useState('DIA');
  const [ventasResumen, setVentasResumen] = useState(null);
  const [gastosResumen, setGastosResumen] = useState(null);
  const [utilidad, setUtilidad] = useState(null);
  const [ventasMetodoPago, setVentasMetodoPago] = useState([]);
  const [ventasTipoServicio, setVentasTipoServicio] = useState([]);
  const [ventasDetalle, setVentasDetalle] = useState([]);
  const [ventasCategoria, setVentasCategoria] = useState([]);
  const [gastosCategoria, setGastosCategoria] = useState([]);
  const [productosMasVendidos, setProductosMasVendidos] = useState([]);
  const [error, setError] = useState('');
  const [tabActiva, setTabActiva] = useState('metodos');
  const [loading, setLoading] = useState(false);

  const exportarResumenGeneral = () => {
    if (!ventasResumen) return;
    const rows = [
      ['Ventas', ventasResumen.cantidadVentas || 0],
      ['Total ventas', Number(ventasResumen.total || 0).toFixed(2)],
      ['Descuento', Number(ventasResumen.descuento || 0).toFixed(2)],
      ['Impuesto', Number(ventasResumen.impuesto || 0).toFixed(2)],
      ['Gastos', Number(gastosResumen?.totalGastos || 0).toFixed(2)],
      ['Utilidad neta', Number(utilidad?.utilidadNeta || 0).toFixed(2)]
    ];
    exportToExcelCsv('reporte_resumen_general.csv', ['Concepto', 'Valor'], rows);
  };

  const exportarVentasMetodo = () =>
    exportToExcelCsv(
      'reporte_ventas_metodo_pago.csv',
      ['Metodo', 'Cantidad', 'Total'],
      ventasMetodoPago.map((x) => [x.metodoPago, x.cantidad, Number(x.total || 0).toFixed(2)])
    );

  const exportarVentasTipoServicio = () =>
    exportToExcelCsv(
      'reporte_ventas_tipo_servicio.csv',
      ['Tipo servicio', 'Cantidad', 'Total'],
      ventasTipoServicio.map((x) => [x.tipoServicio, x.cantidad, Number(x.total || 0).toFixed(2)])
    );

  const exportarVentasDetalle = () =>
    exportToExcelCsv(
      'reporte_ventas_detalle_atendio_cobro.csv',
      ['Fecha', 'Venta', 'Sucursal', 'Servicio', 'Atendio', 'Cobro', 'Metodo', 'Total'],
      ventasDetalle.map((x) => [
        x.fecha ? new Date(x.fecha).toLocaleString('es-HN') : '',
        x.id_Venta,
        x.sucursal,
        x.tipoServicio,
        x.atendio,
        x.cobro,
        x.metodo_Pago,
        Number(x.total || 0).toFixed(2)
      ])
    );

  const exportarProductos = () =>
    exportToExcelCsv(
      'reporte_productos_mas_vendidos.csv',
      ['Producto', 'Cantidad', 'Monto'],
      productosMasVendidos.map((x) => [x.producto, x.cantidadVendida, Number(x.montoVendido || 0).toFixed(2)])
    );

  const exportarTendencia = () =>
    exportToExcelCsv(
      'reporte_tendencia_7_dias.csv',
      ['Fecha', 'Ventas', 'Total'],
      (panel?.tendencia7Dias || []).map((x) => [String(x.fecha).slice(0, 10), x.ventas, Number(x.total || 0).toFixed(2)])
    );

  const exportarVentasCategoria = () =>
    exportToExcelCsv(
      'reporte_ventas_categoria.csv',
      ['Categoria', 'Cantidad', 'Monto'],
      ventasCategoria.map((x) => [x.categoria, x.cantidadVendida, Number(x.montoVendido || 0).toFixed(2)])
    );

  const exportarGastosCategoria = () =>
    exportToExcelCsv(
      'reporte_gastos_categoria.csv',
      ['Categoria', 'Cantidad', 'Total'],
      gastosCategoria.map((x) => [x.categoriaGasto, x.cantidad, Number(x.total || 0).toFixed(2)])
    );

  const exportarMovimientosHoy = () =>
    exportToExcelCsv(
      'reporte_movimientos_caja_hoy.csv',
      ['Hora', 'Caja', 'Tipo', 'Descripcion', 'Monto'],
      (panel?.movimientosHoy || []).map((x) => [
        x.fecha ? new Date(x.fecha).toLocaleTimeString('es-HN') : '',
        x.id_Caja,
        x.tipo,
        x.descripcion,
        Number(x.monto || 0).toFixed(2)
      ])
    );

  useEffect(() => {
    const cargarSucursales = async () => {
      try {
        const response = await api.get('/Sucursales', { params: { incluirInactivas: false } });
        setSucursales(response.data || []);
      } catch {
        setSucursales([]);
      }
    };
    cargarSucursales();
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const setRangeHoy = () => {
    setForm((prev) => ({
      ...prev,
      desde: toLocalInput(inicioHoy),
      hasta: toLocalInput(finHoy)
    }));
  };

  const setRangeMes = () => {
    const d = new Date();
    const inicio = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0);
    const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 0);
    setForm((prev) => ({
      ...prev,
      desde: toLocalInput(inicio),
      hasta: toLocalInput(fin)
    }));
  };

  const setRangeAnio = () => {
    const d = new Date();
    const inicio = new Date(d.getFullYear(), 0, 1, 0, 0, 0);
    const fin = new Date(d.getFullYear(), 11, 31, 23, 59, 0);
    setForm((prev) => ({
      ...prev,
      desde: toLocalInput(inicio),
      hasta: toLocalInput(fin)
    }));
  };

  const setRangeTrimestre = () => {
    const d = new Date();
    const q = Math.floor(d.getMonth() / 3);
    const inicioMes = q * 3;
    const inicio = new Date(d.getFullYear(), inicioMes, 1, 0, 0, 0);
    const fin = new Date(d.getFullYear(), inicioMes + 3, 0, 23, 59, 0);
    setForm((prev) => ({
      ...prev,
      desde: toLocalInput(inicio),
      hasta: toLocalInput(fin)
    }));
  };

  const buildParams = () => {
    const params = {};
    if (form.desde) params.desde = form.desde;
    if (form.hasta) params.hasta = form.hasta;
    if (form.idSucursal) params.idSucursal = form.idSucursal;
    return params;
  };

  const cargarReportes = async () => {
    setError('');
    setLoading(true);
    try {
      const params = buildParams();
      const panelParams = {};
      if (params.idSucursal) panelParams.idSucursal = params.idSucursal;

      const cargarVentasDetalleCompat = async () => {
        const rutas = [
          '/Reportes/ventas-detalle',
          '/Reportes/detalle-ventas',
          '/Reportes/ventas-detalle-atendio-cobro',
          '/Reportes/ventas/detalle'
        ];

        let ultimoError = null;
        for (let i = 0; i < rutas.length; i += 1) {
          const ruta = rutas[i];
          try {
            return await api.get(ruta, { params });
          } catch (err) {
            const status = err?.response?.status;
            if (status !== 404) throw err;
            ultimoError = err;
          }
        }

        throw ultimoError || new Error('No existe endpoint de detalle de ventas');
      };

      const requests = [
        { key: 'panel', label: 'Panel negocio', request: api.get('/Reportes/panel-negocio', { params: panelParams }) },
        { key: 'dashAv', label: 'Dashboard avanzado', request: api.get('/Reportes/dashboard-avanzado', { params: { ...panelParams, intervalo: intervaloSerie } }) },
        { key: 'ventas', label: 'Ventas resumen', request: api.get('/Reportes/ventas-resumen', { params }) },
        { key: 'gastos', label: 'Gastos resumen', request: api.get('/Reportes/gastos-resumen', { params }) },
        { key: 'utilidad', label: 'Utilidad', request: api.get('/Reportes/utilidad', { params }) },
        { key: 'metodos', label: 'Ventas por metodo', request: api.get('/Reportes/ventas-por-metodo-pago', { params }) },
        { key: 'servicio', label: 'Ventas por servicio', request: api.get('/Reportes/ventas-por-tipo-servicio', { params }) },
        { key: 'detalle', label: 'Detalle de ventas', request: cargarVentasDetalleCompat() },
        { key: 'ventasCat', label: 'Ventas por categoria', request: api.get('/Reportes/ventas-por-categoria', { params }) },
        { key: 'gastosCat', label: 'Gastos por categoria', request: api.get('/Reportes/gastos-por-categoria', { params }) },
        { key: 'productos', label: 'Productos mas vendidos', request: api.get('/Reportes/productos-mas-vendidos', { params }) }
      ];

      const results = await Promise.allSettled(requests.map((x) => x.request));
      const fallos = [];
      const data = {};

      const describirError = (reason) => {
        const status = reason?.response?.status;
        const dataError = reason?.response?.data;
        const msgApi = typeof dataError === 'string'
          ? dataError
          : dataError?.message || dataError?.title || '';
        const msgBase = msgApi || reason?.message || 'sin detalle';
        return status ? `HTTP ${status}: ${msgBase}` : msgBase;
      };

      results.forEach((r, idx) => {
        const req = requests[idx];
        if (r.status === 'fulfilled') {
          data[req.key] = r.value?.data;
          return;
        }
        data[req.key] = null;
        fallos.push(`${req.label} (${describirError(r.reason)})`);
      });

      setPanel(data.panel || null);
      setDashboardAvanzado(data.dashAv || null);
      setVentasResumen(data.ventas || null);
      setGastosResumen(data.gastos || null);
      setUtilidad(data.utilidad || null);
      setVentasMetodoPago(data.metodos || []);
      setVentasTipoServicio(data.servicio || []);
      setVentasDetalle(data.detalle || []);
      setVentasCategoria(data.ventasCat || []);
      setGastosCategoria(data.gastosCat || []);
      setProductosMasVendidos(data.productos || []);

      if (fallos.length > 0) {
        setError(`Algunos bloques no cargaron: ${fallos.join(', ')}`);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al cargar reportes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarReportes();
  }, [intervaloSerie]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <h2 className="mb-4">Reportes de negocio</h2>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Desde</label>
              <input type="datetime-local" className="form-control" name="desde" value={form.desde} onChange={handleChange} />
            </div>
            <div className="col-md-3">
              <label className="form-label">Hasta</label>
              <input type="datetime-local" className="form-control" name="hasta" value={form.hasta} onChange={handleChange} />
            </div>
            <div className="col-md-3">
              <label className="form-label">Sucursal</label>
              <select className="form-select" name="idSucursal" value={form.idSucursal} onChange={handleChange}>
                <option value="">Todas</option>
                {sucursales.map((s) => <option key={s.id_Sucursal} value={s.id_Sucursal}>{s.nombre}</option>)}
              </select>
            </div>
            <div className="col-md-3 d-flex align-items-end gap-2">
              <button type="button" className="btn btn-outline-secondary" onClick={setRangeHoy}>Hoy</button>
              <button type="button" className="btn btn-outline-secondary" onClick={setRangeMes}>Mes</button>
              <button type="button" className="btn btn-outline-secondary" onClick={setRangeTrimestre}>Trimestre</button>
              <button type="button" className="btn btn-outline-secondary" onClick={setRangeAnio}>Anio</button>
              <button type="button" className="btn btn-dark flex-grow-1" onClick={cargarReportes} disabled={loading}>
                {loading ? 'Consultando...' : 'Consultar'}
              </button>
            </div>
          </div>
          {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}
        </div>
      </div>

      {panel && (
        <div className="row g-3 mb-4">
          <div className="col-md-3"><div className="card shadow-sm"><div className="card-body"><h6>Hoy ventas</h6><h4>L {Number(panel?.hoy?.ventas?.total || 0).toFixed(2)}</h4></div></div></div>
          <div className="col-md-3"><div className="card shadow-sm"><div className="card-body"><h6>Hoy ticket prom.</h6><h4>L {Number(panel?.hoy?.ventas?.ticketPromedio || 0).toFixed(2)}</h4></div></div></div>
          <div className="col-md-3"><div className="card shadow-sm"><div className="card-body"><h6>Mes ventas</h6><h4>L {Number(panel?.mesActual?.ventas?.total || 0).toFixed(2)}</h4></div></div></div>
          <div className="col-md-3"><div className="card shadow-sm"><div className="card-body"><h6>Mes utilidad neta</h6><h4>L {Number(panel?.mesActual?.costos?.utilidadNeta || 0).toFixed(2)}</h4></div></div></div>
        </div>
      )}

      {dashboardAvanzado && (
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="mb-0">Dashboard avanzado</h5>
              <select className="form-select" style={{ maxWidth: 170 }} value={intervaloSerie} onChange={(e) => setIntervaloSerie(e.target.value)}>
                <option value="DIA">Serie por dia</option>
                <option value="MES">Serie por mes</option>
                <option value="TRIMESTRE">Serie por trimestre</option>
                <option value="ANIO">Serie por anio</option>
              </select>
            </div>
            <div className="table-responsive">
              <table className="table table-bordered mb-0">
                <thead><tr><th>Periodo</th><th>Ventas</th><th>Total</th></tr></thead>
                <tbody>
                  {(dashboardAvanzado.serie || []).map((x, idx) => (
                    <tr key={`ds-${idx}`}>
                      <td>{x.periodo}</td>
                      <td>{x.ventas}</td>
                      <td>L {Number(x.total || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                  {!(dashboardAvanzado.serie || []).length && <tr><td colSpan="3" className="text-center">Sin datos</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {ventasResumen && (
        <>
          <div className="row g-3 mb-4">
            <div className="col-md-2"><div className="card shadow-sm"><div className="card-body"><h6>Ventas</h6><h4>{ventasResumen.cantidadVentas}</h4></div></div></div>
            <div className="col-md-2"><div className="card shadow-sm"><div className="card-body"><h6>Total</h6><h4>L {Number(ventasResumen.total || 0).toFixed(2)}</h4></div></div></div>
            <div className="col-md-2"><div className="card shadow-sm"><div className="card-body"><h6>Descuento</h6><h4>L {Number(ventasResumen.descuento || 0).toFixed(2)}</h4></div></div></div>
            <div className="col-md-2"><div className="card shadow-sm"><div className="card-body"><h6>Impuesto</h6><h4>L {Number(ventasResumen.impuesto || 0).toFixed(2)}</h4></div></div></div>
            <div className="col-md-2"><div className="card shadow-sm"><div className="card-body"><h6>Gastos</h6><h4>L {Number(gastosResumen?.totalGastos || 0).toFixed(2)}</h4></div></div></div>
            <div className="col-md-2"><div className="card shadow-sm"><div className="card-body"><h6>Utilidad neta</h6><h4>L {Number(utilidad?.utilidadNeta || 0).toFixed(2)}</h4></div></div></div>
          </div>
          <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
            <div className="reports-tabs">
              <button type="button" className={`btn btn-sm ${tabActiva === 'metodos' ? 'btn-dark' : 'btn-outline-secondary'}`} onClick={() => setTabActiva('metodos')}>Metodos</button>
              <button type="button" className={`btn btn-sm ${tabActiva === 'servicio' ? 'btn-dark' : 'btn-outline-secondary'}`} onClick={() => setTabActiva('servicio')}>Servicio</button>
              <button type="button" className={`btn btn-sm ${tabActiva === 'detalle' ? 'btn-dark' : 'btn-outline-secondary'}`} onClick={() => setTabActiva('detalle')}>Detalle</button>
              <button type="button" className={`btn btn-sm ${tabActiva === 'productos' ? 'btn-dark' : 'btn-outline-secondary'}`} onClick={() => setTabActiva('productos')}>Productos</button>
              <button type="button" className={`btn btn-sm ${tabActiva === 'tendencia' ? 'btn-dark' : 'btn-outline-secondary'}`} onClick={() => setTabActiva('tendencia')}>Tendencia</button>
              <button type="button" className={`btn btn-sm ${tabActiva === 'ventas_categoria' ? 'btn-dark' : 'btn-outline-secondary'}`} onClick={() => setTabActiva('ventas_categoria')}>Cat. ventas</button>
              <button type="button" className={`btn btn-sm ${tabActiva === 'gastos_categoria' ? 'btn-dark' : 'btn-outline-secondary'}`} onClick={() => setTabActiva('gastos_categoria')}>Cat. gastos</button>
              <button type="button" className={`btn btn-sm ${tabActiva === 'movimientos' ? 'btn-dark' : 'btn-outline-secondary'}`} onClick={() => setTabActiva('movimientos')}>Movimientos</button>
            </div>
            <button className="btn btn-outline-success btn-sm" onClick={exportarResumenGeneral}>Excel resumen</button>
          </div>

          {tabActiva === 'metodos' && (
            <div className="card shadow-sm">
              <div className="card-body reports-card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h5 className="mb-0">Ventas por metodo de pago</h5>
                  <button className="btn btn-outline-success btn-sm" onClick={exportarVentasMetodo}>Excel</button>
                </div>
                <div className="compact-table-wrap">
                  <table className="table table-bordered mb-0">
                    <thead><tr><th>Metodo</th><th>Cantidad</th><th>Total</th></tr></thead>
                    <tbody>
                      {ventasMetodoPago.map((item, idx) => (
                        <tr key={idx}><td>{item.metodoPago}</td><td>{item.cantidad}</td><td>L {Number(item.total || 0).toFixed(2)}</td></tr>
                      ))}
                      {ventasMetodoPago.length === 0 && <tr><td colSpan="3" className="text-center">Sin datos</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tabActiva === 'servicio' && (
            <div className="card shadow-sm">
              <div className="card-body reports-card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h5 className="mb-0">Ventas por tipo de servicio</h5>
                  <button className="btn btn-outline-success btn-sm" onClick={exportarVentasTipoServicio}>Excel</button>
                </div>
                <div className="compact-table-wrap">
                  <table className="table table-bordered mb-0">
                    <thead><tr><th>Tipo</th><th>Cantidad</th><th>Total</th></tr></thead>
                    <tbody>
                      {ventasTipoServicio.map((item, idx) => (
                        <tr key={idx}><td>{item.tipoServicio}</td><td>{item.cantidad}</td><td>L {Number(item.total || 0).toFixed(2)}</td></tr>
                      ))}
                      {ventasTipoServicio.length === 0 && <tr><td colSpan="3" className="text-center">Sin datos</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tabActiva === 'detalle' && (
            <div className="card shadow-sm">
              <div className="card-body reports-card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h5 className="mb-0">Detalle de ventas (atendio y cobro)</h5>
                  <button className="btn btn-outline-success btn-sm" onClick={exportarVentasDetalle}>Excel</button>
                </div>
                <div className="compact-table-wrap">
                  <table className="table table-bordered mb-0">
                    <thead><tr><th>Fecha</th><th>Venta</th><th>Sucursal</th><th>Servicio</th><th>Atendio</th><th>Cobro</th><th>Metodo</th><th>Total</th></tr></thead>
                    <tbody>
                      {ventasDetalle.map((item) => (
                        <tr key={item.id_Venta}>
                          <td>{item.fecha ? new Date(item.fecha).toLocaleString('es-HN') : '-'}</td>
                          <td>#{item.id_Venta}</td>
                          <td>{item.sucursal}</td>
                          <td>{item.tipoServicio}</td>
                          <td>{item.atendio}</td>
                          <td>{item.cobro}</td>
                          <td>{item.metodo_Pago}</td>
                          <td>L {Number(item.total || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                      {ventasDetalle.length === 0 && (
                        <tr><td colSpan="8" className="text-center">Sin ventas en el rango seleccionado</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tabActiva === 'productos' && (
            <div className="card shadow-sm">
              <div className="card-body reports-card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h5 className="mb-0">Productos mas vendidos</h5>
                  <button className="btn btn-outline-success btn-sm" onClick={exportarProductos}>Excel</button>
                </div>
                <div className="compact-table-wrap">
                  <table className="table table-bordered mb-0">
                    <thead><tr><th>Producto</th><th>Cantidad</th><th>Monto</th></tr></thead>
                    <tbody>
                      {productosMasVendidos.map((item, idx) => (
                        <tr key={idx}><td>{item.producto}</td><td>{item.cantidadVendida}</td><td>L {Number(item.montoVendido || 0).toFixed(2)}</td></tr>
                      ))}
                      {productosMasVendidos.length === 0 && <tr><td colSpan="3" className="text-center">Sin datos</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tabActiva === 'tendencia' && (
            <div className="card shadow-sm">
              <div className="card-body reports-card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h5 className="mb-0">Tendencia ultimos 7 dias</h5>
                  <button className="btn btn-outline-success btn-sm" onClick={exportarTendencia}>Excel</button>
                </div>
                <div className="compact-table-wrap">
                  <table className="table table-bordered mb-0">
                    <thead><tr><th>Fecha</th><th>Ventas</th><th>Total</th></tr></thead>
                    <tbody>
                      {(panel?.tendencia7Dias || []).map((item, idx) => (
                        <tr key={idx}><td>{String(item.fecha).slice(0, 10)}</td><td>{item.ventas}</td><td>L {Number(item.total || 0).toFixed(2)}</td></tr>
                      ))}
                      {(panel?.tendencia7Dias || []).length === 0 && <tr><td colSpan="3" className="text-center">Sin datos</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tabActiva === 'ventas_categoria' && (
            <div className="card shadow-sm">
              <div className="card-body reports-card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h5 className="mb-0">Ventas por categoria</h5>
                  <button className="btn btn-outline-success btn-sm" onClick={exportarVentasCategoria}>Excel</button>
                </div>
                <div className="compact-table-wrap">
                  <table className="table table-bordered mb-0">
                    <thead><tr><th>Categoria</th><th>Cantidad</th><th>Monto</th></tr></thead>
                    <tbody>
                      {ventasCategoria.map((item, idx) => (
                        <tr key={idx}><td>{item.categoria}</td><td>{item.cantidadVendida}</td><td>L {Number(item.montoVendido || 0).toFixed(2)}</td></tr>
                      ))}
                      {ventasCategoria.length === 0 && <tr><td colSpan="3" className="text-center">Sin datos</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tabActiva === 'gastos_categoria' && (
            <div className="card shadow-sm">
              <div className="card-body reports-card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h5 className="mb-0">Gastos por categoria</h5>
                  <button className="btn btn-outline-success btn-sm" onClick={exportarGastosCategoria}>Excel</button>
                </div>
                <div className="compact-table-wrap">
                  <table className="table table-bordered mb-0">
                    <thead><tr><th>Categoria</th><th>Cantidad</th><th>Total</th></tr></thead>
                    <tbody>
                      {gastosCategoria.map((item, idx) => (
                        <tr key={idx}><td>{item.categoriaGasto}</td><td>{item.cantidad}</td><td>L {Number(item.total || 0).toFixed(2)}</td></tr>
                      ))}
                      {gastosCategoria.length === 0 && <tr><td colSpan="3" className="text-center">Sin datos</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tabActiva === 'movimientos' && (
            <div className="card shadow-sm">
              <div className="card-body reports-card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h5 className="mb-0">Movimientos de caja de hoy</h5>
                  <button className="btn btn-outline-success btn-sm" onClick={exportarMovimientosHoy}>Excel</button>
                </div>
                <div className="compact-table-wrap">
                  <table className="table table-bordered mb-0">
                    <thead><tr><th>Hora</th><th>Caja</th><th>Tipo</th><th>Descripcion</th><th>Monto</th></tr></thead>
                    <tbody>
                      {(panel?.movimientosHoy || []).map((item) => (
                        <tr key={item.id_Movimiento_Caja}>
                          <td>{new Date(item.fecha).toLocaleTimeString('es-HN')}</td>
                          <td>{item.id_Caja}</td>
                          <td>{item.tipo}</td>
                          <td>{item.descripcion}</td>
                          <td>L {Number(item.monto || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                      {(panel?.movimientosHoy || []).length === 0 && (
                        <tr><td colSpan="5" className="text-center">Sin movimientos hoy</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Reportes;
