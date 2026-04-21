import { NavLink } from 'react-router-dom';
import { getUserRole } from '../../utils/auth';

const sections = [
  {
    title: 'Operacion',
    items: [
      { to: '/caja', label: 'Caja', roles: ['ADMIN', 'CAJERO'] },
      { to: '/movimientos-caja', label: 'Movimientos Caja', roles: ['ADMIN', 'CAJERO'] },
      { to: '/ventas', label: 'POS Ventas', roles: ['ADMIN', 'CAJERO'] },
      { to: '/mesas', label: 'Mesas y Cuentas', roles: ['ADMIN', 'CAJERO'] },
      { to: '/gastos', label: 'Gastos', roles: ['ADMIN', 'CAJERO'] }
    ]
  },
  {
    title: 'Administracion',
    items: [
      { to: '/dashboard', label: 'Dashboard', roles: ['ADMIN'] },
      { to: '/reportes', label: 'Reportes', roles: ['ADMIN'] },
      { to: '/estado-cuenta', label: 'Estado de Cuenta', roles: ['ADMIN'] },
      { to: '/menu-sucursal', label: 'Precios por sucursal (POS)', roles: ['ADMIN'] },
      { to: '/mesas-admin', label: 'Mesas', roles: ['ADMIN'] },
      { to: '/proveedores', label: 'Proveedores', roles: ['ADMIN'] },
      { to: '/inventario', label: 'Inventario', roles: ['ADMIN'] },
      { to: '/productos', label: 'Productos', roles: ['ADMIN'] },
      {
        to: { pathname: '/productos', hash: 'importar-productos-excel' },
        label: 'Importar productos (Excel)',
        roles: ['ADMIN'],
        navKey: 'nav-importar-productos-excel'
      },
      { to: '/categorias', label: 'Categorias', roles: ['ADMIN'] },
      { to: '/presentaciones', label: 'Presentaciones', roles: ['ADMIN'] },
      { to: '/sucursales', label: 'Sucursales', roles: ['ADMIN'] },
      { to: '/usuarios', label: 'Usuarios', roles: ['ADMIN'] },
      { to: '/configuracion', label: 'Configuracion', roles: ['ADMIN'] },
      { to: '/bitacora', label: 'Bitacora', roles: ['ADMIN'] }
    ]
  }
];

function Sidebar({ onNavigate }) {
  const role = getUserRole();
  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => (item.roles || []).includes(role))
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
              <NavLink
                key={item.navKey || (typeof item.to === 'string' ? item.to : item.label)}
                to={item.to}
                className="sidebar-link"
                onClick={onNavigate}
              >
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
