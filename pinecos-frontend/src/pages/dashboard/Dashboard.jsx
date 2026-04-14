import { useEffect, useState } from 'react';
import api from '../../services/api';

function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const cargarResumen = async () => {
    try {
      const response = await api.get('/Dashboard/resumen');
      setData(response.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al cargar dashboard');
    }
  };

  useEffect(() => {
    cargarResumen();
  }, []);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return <div>Cargando dashboard...</div>;

  return (
    <div>
      <h2 className="mb-4">Dashboard</h2>

      <div className="row g-3">
        <div className="col-md-3">
          <div className="card shadow-sm"><div className="card-body">
            <h6>Ventas Hoy</h6>
            <h3>{data.ventasHoy}</h3>
          </div></div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm"><div className="card-body">
            <h6>Monto Vendido</h6>
            <h3>L {Number(data.montoVendidoHoy || 0).toFixed(2)}</h3>
          </div></div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm"><div className="card-body">
            <h6>Gastos Hoy</h6>
            <h3>L {Number(data.gastosHoy || 0).toFixed(2)}</h3>
          </div></div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm"><div className="card-body">
            <h6>Cajas Abiertas</h6>
            <h3>{data.cajasAbiertas}</h3>
          </div></div>
        </div>

        <div className="col-md-6">
          <div className="card shadow-sm"><div className="card-body">
            <h6>Utilidad Bruta Hoy</h6>
            <h3>L {Number(data.utilidadBrutaHoy || 0).toFixed(2)}</h3>
          </div></div>
        </div>

        <div className="col-md-6">
          <div className="card shadow-sm"><div className="card-body">
            <h6>Utilidad Neta Hoy</h6>
            <h3>L {Number(data.utilidadNetaHoy || 0).toFixed(2)}</h3>
          </div></div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;