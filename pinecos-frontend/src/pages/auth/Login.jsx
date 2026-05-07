import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginRequest, meRequest, seleccionarSucursalRequest } from '../../services/authService';
import { clearSession, getDefaultRouteByRole, isAuthenticated, setSession } from '../../utils/auth';

function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ usuario: '', clave: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estado para seleccion de sucursal
  const [selectionToken, setSelectionToken] = useState(null);
  const [sucursalesOpciones, setSucursalesOpciones] = useState([]);

  useEffect(() => {
    let activo = true;
    const validarSesionExistente = async () => {
      if (!isAuthenticated()) return;
      try {
        await meRequest();
        if (activo) navigate(getDefaultRouteByRole(), { replace: true });
      } catch {
        clearSession();
      }
    };
    validarSesionExistente();
    return () => { activo = false; };
  }, [navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      const data = await loginRequest(form.usuario, form.clave);

      if (data.requiresSucursalSelection) {
        setSelectionToken(data.selectionToken);
        setSucursalesOpciones(data.sucursales);
        return;
      }

      setSession(data.token, data.usuario);
      navigate(getDefaultRouteByRole(), { replace: true });
    } catch (err) {
      const responseData = err?.response?.data;
      const backendMessage = typeof responseData === 'string' ? responseData : responseData?.message;
      setError(backendMessage || 'Error al iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  const handleSeleccionarSucursal = async (idSucursal) => {
    setError('');
    try {
      setLoading(true);
      const data = await seleccionarSucursalRequest(selectionToken, idSucursal);
      setSession(data.token, data.usuario);
      navigate(getDefaultRouteByRole(), { replace: true });
    } catch (err) {
      const responseData = err?.response?.data;
      const backendMessage = typeof responseData === 'string' ? responseData : responseData?.message;
      setError(backendMessage || 'Error al seleccionar sucursal');
    } finally {
      setLoading(false);
    }
  };

  const handleVolverLogin = () => {
    setSelectionToken(null);
    setSucursalesOpciones([]);
    setError('');
  };

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card shadow-sm" style={{ width: '420px' }}>
        <div className="card-body p-4">
          <div className="text-center mb-2">
            <img src="/PinecosCafe.jpeg" alt="Cafe Pinecos" className="auth-logo" />
          </div>
          <h3 className="text-center mb-4">Pinecos</h3>

          {selectionToken ? (
            <>
              <p className="text-center text-muted mb-3">Selecciona la sucursal en la que vas a trabajar</p>
              <div className="d-grid gap-2">
                {sucursalesOpciones.map((suc) => (
                  <button
                    key={suc.id_Sucursal}
                    type="button"
                    className="btn btn-outline-dark"
                    disabled={loading}
                    onClick={() => handleSeleccionarSucursal(suc.id_Sucursal)}
                  >
                    {suc.nombre}
                  </button>
                ))}
              </div>
              {error && <div className="alert alert-danger mt-3 py-2">{error}</div>}
              <button
                type="button"
                className="btn btn-link w-100 mt-2 text-muted"
                onClick={handleVolverLogin}
                disabled={loading}
              >
                Volver
              </button>
            </>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
