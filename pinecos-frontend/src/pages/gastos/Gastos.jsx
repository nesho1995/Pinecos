import { useEffect, useState } from 'react';
import api from '../../services/api';
import { getUsuario } from '../../utils/auth';

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

  const cargarGastos = async () => {
    try {
      const response = await api.get('/Gastos');
      setGastos(response.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al cargar gastos');
    }
  };

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const cargarCajaActual = async () => {
    try {
      const response = await api.get('/Dashboard/caja-actual');
      setCajaActual(response.data || null);
    } catch {
      setCajaActual(null);
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

      setForm({
        categoria_Gasto: '',
        descripcion: '',
        monto: ''
      });

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

  return (
    <div>
      <h2 className="mb-4">Gastos</h2>

      {!esAdmin && (
        <div className="alert alert-info">
          Vista de cajero: solo se muestran tus propios gastos.
        </div>
      )}

      <div className={`alert ${cajaActual?.abierta ? 'alert-success' : 'alert-warning'}`}>
        {cajaActual?.abierta
          ? `Caja abierta #${cajaActual.id_Caja}. Ya puedes registrar gastos.`
          : 'No hay caja abierta en tu sucursal. Abre caja para registrar gastos.'}
      </div>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
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
                disabled={!cajaActual?.abierta}
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
                disabled={!cajaActual?.abierta}
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
                disabled={!cajaActual?.abierta}
              />
            </div>

            <div className="col-md-2 d-flex align-items-end">
              <button className="btn btn-dark w-100" disabled={!cajaActual?.abierta}>Guardar</button>
            </div>
          </form>

          {mensaje && <div className="alert alert-success mt-3 mb-0">{mensaje}</div>}
          {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <table className="table table-bordered align-middle">
            <thead>
              <tr>
                <th>Codigo</th>
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
                  <td>{item.id_Gasto}</td>
                  <td>{new Date(item.fecha).toLocaleString('es-HN')}</td>
                  <td>{item.categoria_Gasto}</td>
                  <td>{item.descripcion}</td>
                  <td>L {Number(item.monto || 0).toFixed(2)}</td>
                  {esAdmin && <td>{item.usuario || item.id_Usuario}</td>}
                </tr>
              ))}
              {gastos.length === 0 && (
                <tr>
                  <td colSpan={esAdmin ? 6 : 5} className="text-center">
                    No hay gastos para mostrar
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Gastos;

