import { useEffect, useState } from 'react';
import api from '../../services/api';

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
  const [ventasResumen, setVentasResumen] = useState(null);
  const [gastosResumen, setGastosResumen] = useState(null);
  const [utilidad, setUtilidad] = useState(null);
  const [ventasMetodoPago, setVentasMetodoPago] = useState([]);
  const [ventasTipoServicio, setVentasTipoServicio] = useState([]);
  const [ventasCategoria, setVentasCategoria] = useState([]);
  const [gastosCategoria, setGastosCategoria] = useState([]);
  const [productosMasVendidos, setProductosMasVendidos] = useState([]);
  const [error, setError] = useState('');

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

  const buildParams = () => {
    const params = {};
    if (form.desde) params.desde = form.desde;
    if (form.hasta) params.hasta = form.hasta;
    if (form.idSucursal) params.idSucursal = form.idSucursal;
    return params;
  };

  const cargarReportes = async () => {
    setError('');
    try {
      const params = buildParams();
      const [panelRes, ventasRes, gastosRes, utilidadRes, metodoPagoRes, tipoServicioRes, ventasCatRes, gastosCatRes, productosRes] =
        await Promise.all([
          api.get('/Reportes/panel-negocio', { params: { idSucursal: params.idSucursal } }),
          api.get('/Reportes/ventas-resumen', { params }),
          api.get('/Reportes/gastos-resumen', { params }),
          api.get('/Reportes/utilidad', { params }),
          api.get('/Reportes/ventas-por-metodo-pago', { params }),
          api.get('/Reportes/ventas-por-tipo-servicio', { params }),
          api.get('/Reportes/ventas-por-categoria', { params }),
          api.get('/Reportes/gastos-por-categoria', { params }),
          api.get('/Reportes/productos-mas-vendidos', { params })
        ]);

      setPanel(panelRes.data);
      setVentasResumen(ventasRes.data);
      setGastosResumen(gastosRes.data);
      setUtilidad(utilidadRes.data);
      setVentasMetodoPago(metodoPagoRes.data || []);
      setVentasTipoServicio(tipoServicioRes.data || []);
      setVentasCategoria(ventasCatRes.data || []);
      setGastosCategoria(gastosCatRes.data || []);
      setProductosMasVendidos(productosRes.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al cargar reportes');
    }
  };

  useEffect(() => {
    cargarReportes();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
              <button className="btn btn-outline-secondary" onClick={setRangeHoy}>Hoy</button>
              <button className="btn btn-outline-secondary" onClick={setRangeMes}>Mes</button>
              <button className="btn btn-dark flex-grow-1" onClick={cargarReportes}>Consultar</button>
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

          <div className="row g-4">
            <div className="col-md-6">
              <div className="card shadow-sm"><div className="card-body">
                <h5>Ventas por metodo de pago</h5>
                <table className="table table-bordered">
                  <thead><tr><th>Metodo</th><th>Cantidad</th><th>Total</th></tr></thead>
                  <tbody>
                    {ventasMetodoPago.map((item, idx) => (
                      <tr key={idx}><td>{item.metodoPago}</td><td>{item.cantidad}</td><td>L {Number(item.total || 0).toFixed(2)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div></div>
            </div>

            <div className="col-md-6">
              <div className="card shadow-sm"><div className="card-body">
                <h5>Ventas por tipo de servicio</h5>
                <table className="table table-bordered">
                  <thead><tr><th>Tipo</th><th>Cantidad</th><th>Total</th></tr></thead>
                  <tbody>
                    {ventasTipoServicio.map((item, idx) => (
                      <tr key={idx}><td>{item.tipoServicio}</td><td>{item.cantidad}</td><td>L {Number(item.total || 0).toFixed(2)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div></div>
            </div>

            <div className="col-md-6">
              <div className="card shadow-sm"><div className="card-body">
                <h5>Productos mas vendidos</h5>
                <table className="table table-bordered">
                  <thead><tr><th>Producto</th><th>Cantidad</th><th>Monto</th></tr></thead>
                  <tbody>
                    {productosMasVendidos.map((item, idx) => (
                      <tr key={idx}><td>{item.producto}</td><td>{item.cantidadVendida}</td><td>L {Number(item.montoVendido || 0).toFixed(2)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div></div>
            </div>

            <div className="col-md-6">
              <div className="card shadow-sm"><div className="card-body">
                <h5>Tendencia ultimos 7 dias</h5>
                <table className="table table-bordered">
                  <thead><tr><th>Fecha</th><th>Ventas</th><th>Total</th></tr></thead>
                  <tbody>
                    {(panel?.tendencia7Dias || []).map((item, idx) => (
                      <tr key={idx}><td>{String(item.fecha).slice(0, 10)}</td><td>{item.ventas}</td><td>L {Number(item.total || 0).toFixed(2)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div></div>
            </div>

            <div className="col-md-6">
              <div className="card shadow-sm"><div className="card-body">
                <h5>Ventas por categoria</h5>
                <table className="table table-bordered">
                  <thead><tr><th>Categoria</th><th>Cantidad</th><th>Monto</th></tr></thead>
                  <tbody>
                    {ventasCategoria.map((item, idx) => (
                      <tr key={idx}><td>{item.categoria}</td><td>{item.cantidadVendida}</td><td>L {Number(item.montoVendido || 0).toFixed(2)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div></div>
            </div>

            <div className="col-md-6">
              <div className="card shadow-sm"><div className="card-body">
                <h5>Gastos por categoria</h5>
                <table className="table table-bordered">
                  <thead><tr><th>Categoria</th><th>Cantidad</th><th>Total</th></tr></thead>
                  <tbody>
                    {gastosCategoria.map((item, idx) => (
                      <tr key={idx}><td>{item.categoriaGasto}</td><td>{item.cantidad}</td><td>L {Number(item.total || 0).toFixed(2)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div></div>
            </div>

            <div className="col-12">
              <div className="card shadow-sm"><div className="card-body">
                <h5>Movimientos de caja de hoy</h5>
                <table className="table table-bordered">
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
              </div></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Reportes;
