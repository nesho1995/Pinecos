import { NavLink } from 'react-router-dom';

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
      { to: '/estado-cuenta', label: 'Estado de Cuenta' }
    ]
  },
  {
    title: 'Administracion',
    items: [
      { to: '/menu-sucursal', label: 'Precios por Sucursal' },
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

function Sidebar() {
  return (
    <aside className="app-sidebar p-3">
      <div className="brand-block mb-3">
        <div className="brand-title">Pinecos</div>
        <div className="brand-subtitle">Sistema de cafeteria</div>
      </div>

      {sections.map((section) => (
        <div key={section.title} className="sidebar-section mb-3">
          <div className="sidebar-section-title">{section.title}</div>
          <nav className="nav flex-column gap-1">
            {section.items.map((item) => (
              <NavLink key={item.to} to={item.to} className="sidebar-link">
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
