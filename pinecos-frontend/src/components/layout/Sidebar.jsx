import { NavLink } from 'react-router-dom';
import { isAdmin } from '../../utils/auth';

const sections = [
  {
    title: 'Operacion',
    items: [
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/caja', label: 'Caja' },
      { to: '/movimientos-caja', label: 'Movimientos Caja' },
      { to: '/ventas', label: 'POS Ventas' },
      { to: '/mesas', label: 'Mesas y Cuentas' },
      { to: '/gastos', label: 'Gastos' },
      { to: '/reportes', label: 'Reportes' },
      { to: '/reportes-cliente', label: 'Panel Cliente' },
      { to: '/estado-cuenta', label: 'Estado de Cuenta' }
    ]
  },
  {
    title: 'Administracion',
    items: [
      { to: '/menu-sucursal', label: 'Precios por Sucursal' },
      { to: '/mesas-admin', label: 'Mesas' },
      { to: '/proveedores', label: 'Proveedores' },
      { to: '/inventario', label: 'Inventario' },
      { to: '/productos', label: 'Productos' },
      { to: '/categorias', label: 'Categorias' },
      { to: '/presentaciones', label: 'Presentaciones' },
      { to: '/sucursales', label: 'Sucursales' },
      { to: '/usuarios', label: 'Usuarios' },
      { to: '/configuracion', label: 'Configuracion' },
      { to: '/bitacora', label: 'Bitacora' }
    ]
  }
];

function Sidebar({ onNavigate }) {
  const admin = isAdmin();
  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (admin) return true;
        if (item.to === '/reportes' || item.to === '/estado-cuenta' || item.to === '/reportes-cliente') return false;
        if (section.title === 'Administracion') return false;
        return true;
      })
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside className="app-sidebar p-3">
      <div className="brand-block mb-3">
        <div className="brand-logo-wrap mb-2">
          <img src="/PinecosCafe.jpeg" alt="Cafe Pinecos" className="brand-logo" />
        </div>
        <div className="brand-title">Pinecos</div>
        <div className="brand-subtitle">Sistema de cafeteria</div>
      </div>

      {visibleSections.map((section) => (
        <div key={section.title} className="sidebar-section mb-3">
          <div className="sidebar-section-title">{section.title}</div>
          <nav className="nav flex-column gap-1">
            {section.items.map((item) => (
              <NavLink key={item.to} to={item.to} className="sidebar-link" onClick={onNavigate}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      ))}
    </aside>
  );
}

export default Sidebar;
