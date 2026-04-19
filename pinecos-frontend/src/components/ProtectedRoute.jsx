import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { clearSession, isAuthenticated } from '../utils/auth';
import { meRequest } from '../services/authService';

function ProtectedRoute({ children }) {
  const [validando, setValidando] = useState(true);
  const [autorizado, setAutorizado] = useState(() => isAuthenticated());

  useEffect(() => {
    let activo = true;

    const validarSesion = async () => {
      if (!isAuthenticated()) {
        if (!activo) return;
        setAutorizado(false);
        setValidando(false);
        return;
      }

      try {
        await meRequest();
        if (!activo) return;
        setAutorizado(true);
      } catch {
        clearSession();
        if (!activo) return;
        setAutorizado(false);
      } finally {
        if (activo) setValidando(false);
      }
    };

    validarSesion();

    const revalidarEnEvento = () => {
      validarSesion();
    };

    const revalidarAlVolverVisible = () => {
      if (document.visibilityState === 'visible') validarSesion();
    };

    window.addEventListener('pageshow', revalidarEnEvento);
    window.addEventListener('popstate', revalidarEnEvento);
    window.addEventListener('focus', revalidarEnEvento);
    document.addEventListener('visibilitychange', revalidarAlVolverVisible);

    return () => {
      activo = false;
      window.removeEventListener('pageshow', revalidarEnEvento);
      window.removeEventListener('popstate', revalidarEnEvento);
      window.removeEventListener('focus', revalidarEnEvento);
      document.removeEventListener('visibilitychange', revalidarAlVolverVisible);
    };
  }, []);

  if (validando) {
    return <div className="p-4 text-muted">Validando sesion...</div>;
  }

  if (!autorizado) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
