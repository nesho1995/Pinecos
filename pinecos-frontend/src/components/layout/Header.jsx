import { useLocation, useNavigate } from 'react-router-dom';
import { clearSession, getUsuario } from '../../utils/auth';

const routeTitles = {
  '/dashboard': 'Dashboard',
  '/caja': 'Caja',
  '/movimientos-caja': 'Movimientos de Caja',
  '/ventas': 'Punto de Venta',
  '/mesas': 'Mesas y Cuentas',
  '/mesas-admin': 'Administracion de Mesas',
  '/gastos': 'Gastos',
  '/reportes': 'Reportes',
  '/estado-cuenta': 'Estado de Cuenta',
  '/menu-sucursal': 'Precios por Sucursal',
  '/productos': 'Productos',
  '/categorias': 'Categorias',
  '/presentaciones': 'Presentaciones',
  '/sucursales': 'Sucursales',
  '/usuarios': 'Usuarios',
  '/configuracion': 'Configuracion',
  '/bitacora': 'Bitacora'
};

function Header({ onToggleSidebar }) {
  const navigate = useNavigate();
  const location = useLocation();
  const usuario = getUsuario();
  const titulo = routeTitles[location.pathname] || 'Pinecos';

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <header className="app-header px-4 py-3 d-flex justify-content-between align-items-center">
      <div className="d-flex align-items-center gap-2">
        <button className="btn btn-outline-secondary btn-sm d-lg-none" onClick={onToggleSidebar} type="button">
          Menu
        </button>
        <div>
        <div className="header-title">{titulo}</div>
        <div className="header-subtitle">Operacion del dia</div>
        </div>
      </div>

      <div className="d-flex align-items-center gap-3">
        <span className="user-pill">
          {usuario?.nombre || usuario?.Nombre || usuario?.usuarioLogin || usuario?.UsuarioLogin || 'Usuario'}
        </span>
        <button className="btn btn-outline-danger btn-sm" onClick={handleLogout}>
          Salir
        </button>
      </div>
    </header>
  );
}

export default Header;
