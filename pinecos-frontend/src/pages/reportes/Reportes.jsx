import { useEffect, useState } from 'react';
import api from '../../services/api';

function Reportes() {
  const [sucursales, setSucursales] = useState([]);
  const [form, setForm] = useState({
    desde: '',
    hasta: '',
    idSucursal: ''
  });

  const [ventasResumen, setVentasResumen] = useState(null);
  const [gastosResumen, setGastosResumen] = useState(null);
  const [utilidad, setUtilidad] = useState(null);
  const [ventasMetodoPago, setVentasMetodoPago] = useState([]);
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
      const [ventasRes, gastosRes, utilidadRes, metodoPagoRes, ventasCatRes, gastosCatRes, productosRes] =
        await Promise.all([
          api.get('/Reportes/ventas-resumen', { params }),
          api.get('/Reportes/gastos-resumen', { params }),
          api.get('/Reportes/utilidad', { params }),
          api.get('/Reportes/ventas-por-metodo-pago', { params }),
          api.get('/Reportes/ventas-por-categoria', { params }),
          api.get('/Reportes/gastos-por-categoria', { params }),
          api.get('/Reportes/productos-mas-vendidos', { params })
        ]);

      setVentasResumen(ventasRes.data);
      setGastosResumen(gastosRes.data);
      setUtilidad(utilidadRes.data);
      setVentasMetodoPago(metodoPagoRes.data || []);
      setVentasCategoria(ventasCatRes.data || []);
      setGastosCategoria(gastosCatRes.data || []);
      setProductosMasVendidos(productosRes.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al cargar reportes');
    }
  };

  return (
    <div>
      <h2 className="mb-4">Reportes</h2>

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
            <div className="col-md-3 d-flex align-items-end">
              <button className="btn btn-dark w-100" onClick={cargarReportes}>Consultar</button>
            </div>
          </div>
          {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}
        </div>
      </div>

      {ventasResumen && (
        <>
          <div className="row g-3 mb-4">
            <div className="col-md-2"><div className="card shadow-sm"><div className="card-body"><h6>Ventas</h6><h4>{ventasResumen.cantidadVentas}</h4></div></div></div>
            <div className="col-md-2"><div className="card shadow-sm"><div className="card-body"><h6>Subtotal</h6><h4>L {Number(ventasResumen.subtotal || 0).toFixed(2)}</h4></div></div></div>
            <div className="col-md-2"><div className="card shadow-sm"><div className="card-body"><h6>Descuento</h6><h4>L {Number(ventasResumen.descuento || 0).toFixed(2)}</h4></div></div></div>
            <div className="col-md-2"><div className="card shadow-sm"><div className="card-body"><h6>Impuesto</h6><h4>L {Number(ventasResumen.impuesto || 0).toFixed(2)}</h4></div></div></div>
            <div className="col-md-2"><div className="card shadow-sm"><div className="card-body"><h6>Total</h6><h4>L {Number(ventasResumen.total || 0).toFixed(2)}</h4></div></div></div>
            <div className="col-md-2"><div className="card shadow-sm"><div className="card-body"><h6>Costo</h6><h4>L {Number(ventasResumen.costoTotal || 0).toFixed(2)}</h4></div></div></div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-4"><div className="card shadow-sm"><div className="card-body"><h6>Utilidad bruta</h6><h4>L {Number(ventasResumen.utilidadBruta || 0).toFixed(2)}</h4></div></div></div>
            <div className="col-md-4"><div className="card shadow-sm"><div className="card-body"><h6>Gastos</h6><h4>L {Number(gastosResumen?.totalGastos || 0).toFixed(2)}</h4></div></div></div>
            <div className="col-md-4"><div className="card shadow-sm"><div className="card-body"><h6>Utilidad neta</h6><h4>L {Number(utilidad?.utilidadNeta || 0).toFixed(2)}</h4></div></div></div>
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
          </div>
        </>
      )}
    </div>
  );
}

export default Reportes;
