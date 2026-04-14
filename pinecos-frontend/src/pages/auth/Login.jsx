import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginRequest } from '../../services/authService';
import { setSession } from '../../utils/auth';

function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    usuario: '',
    clave: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      const data = await loginRequest(form.usuario, form.clave);
      setSession(data.token, data.usuario);
      navigate('/dashboard');
        } catch (err) {
      const responseData = err?.response?.data;
      const backendMessage =
        typeof responseData === 'string'
          ? responseData
          : responseData?.message;

      setError(backendMessage || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card shadow-sm" style={{ width: '420px' }}>
        <div className="card-body p-4">
          <h3 className="text-center mb-4">Pinecos</h3>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Usuario</label>
              <input
                type="text"
                className="form-control"
                name="usuario"
                value={form.usuario}
                onChange={handleChange}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Clave</label>
              <input
                type="password"
                className="form-control"
                name="clave"
                value={form.clave}
                onChange={handleChange}
                required
              />
            </div>

            {error && <div className="alert alert-danger py-2">{error}</div>}

            <button type="submit" className="btn btn-dark w-100" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
