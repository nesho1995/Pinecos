import { useState } from 'react';
import api from '../../services/api';

function Bitacora() {
  const [form, setForm] = useState({
    desde: '',
    hasta: '',
    modulo: ''
  });

  const [registros, setRegistros] = useState([]);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const cargarBitacora = async () => {
    setError('');

    try {
      const params = {};
      if (form.desde) params.desde = form.desde;
      if (form.hasta) params.hasta = form.hasta;
      if (form.modulo) params.modulo = form.modulo;

      const response = await api.get('/Bitacora', { params });
      setRegistros(response.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al cargar bitácora');
    }
  };

  return (
    <div>
      <h2 className="mb-4">Bitácora</h2>

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

            <div className="col-md-4">
              <label className="form-label">Módulo</label>
              <input type="text" className="form-control" name="modulo" value={form.modulo} onChange={handleChange} placeholder="Ej: VENTAS" />
            </div>

            <div className="col-md-2 d-flex align-items-end">
              <button className="btn btn-dark w-100" onClick={cargarBitacora}>
                Consultar
              </button>
            </div>
          </div>

          {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <table className="table table-bordered align-middle">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Módulo</th>
                <th>Acción</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((item) => (
                <tr key={item.id_Bitacora}>
                  <td>{new Date(item.fecha).toLocaleString('es-HN')}</td>
                  <td>{item.id_Usuario || '-'}</td>
                  <td>{item.modulo}</td>
                  <td>{item.accion}</td>
                  <td>{item.detalle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Bitacora;