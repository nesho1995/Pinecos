import { NavLink } from 'react-router-dom';
import { getUserRole } from '../../utils/auth';

/** Orden: flujo diario primero; admin agrupado por area (menos scroll, mas claro). */
const sections = [
  {
    id: 'mostrador',
    title: 'Mostrador',
    titleClass: 'sidebar-section-title--primary',
    items: [
      { to: '/ventas', label: 'Punto de venta (POS)', roles: ['ADMIN', 'CAJERO', 'SUPERVISOR'] },
      { to: '/productos-pendientes', label: 'Productos faltantes', roles: ['ADMIN', 'CAJERO', 'SUPERVISOR'] },
      { to: '/mesas', label: 'Mesas y cuentas', roles: ['ADMIN', 'CAJERO', 'SUPERVISOR'] },
      { to: '/caja', label: 'Caja', roles: ['ADMIN', 'CAJERO', 'SUPERVISOR'] },
      { to: '/movimientos-caja', label: 'Movimientos de caja', roles: ['ADMIN', 'CAJERO', 'SUPERVISOR'] },
      { to: '/gastos', label: 'Gastos', roles: ['ADMIN', 'CAJERO', 'SUPERVISOR'] }
    ]
  },
  {
    id: 'resumen',
    title: 'Resumen',
    items: [
      { to: '/dashboard', label: 'Dashboard', roles: ['ADMIN'] },
      { to: '/reportes', label: 'Reportes', roles: ['ADMIN'] },
      { to: '/gestion-ventas', label: 'Gestion de ventas', roles: ['ADMIN'] },
      { to: '/estado-cuenta', label: 'Estado de cuenta', roles: ['ADMIN'] }
    ]
  },
  {
    id: 'menu-catalogo',
    title: 'Menu y catalogo',
    items: [
      { to: '/menu-sucursal', label: 'Precios por sucursal', roles: ['ADMIN'] },
      { to: '/productos', label: 'Productos', roles: ['ADMIN'] },
      {
        to: { pathname: '/productos', hash: 'importar-productos-excel' },
        label: 'Importar desde Excel',
        roles: ['ADMIN'],
        navKey: 'nav-importar-productos-excel'
      },
      { to: '/categorias', label: 'Categorias', roles: ['ADMIN'] },
      { to: '/presentaciones', label: 'Presentaciones', roles: ['ADMIN'] }
    ]
  },
  {
    id: 'locales',
    title: 'Locales',
    items: [
      { to: '/sucursales', label: 'Sucursales', roles: ['ADMIN'] },
      { to: '/mesas-admin', label: 'Mesas (configuracion)', roles: ['ADMIN'] }
    ]
  },
  {
    id: 'inventario',
    title: 'Inventario y compras',
    items: [
      { to: '/inventario', label: 'Inventario', roles: ['ADMIN'] },
      { to: '/proveedores', label: 'Proveedores', roles: ['ADMIN'] }
    ]
  },
  {
    id: 'sistema',
    title: 'Administracion',
    items: [
      { to: '/usuarios', label: 'Usuarios', roles: ['ADMIN'] },
      { to: '/configuracion', label: 'Configuracion', roles: ['ADMIN'] },
      { to: '/bitacora', label: 'Bitacora', roles: ['ADMIN'] }
    ]
  }
];

function Sidebar({ onNavigate, pendientesFiscales = 0 }) {
  const role = getUserRole();
  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => (item.roles || []).includes(role))
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside className="app-sidebar">
      <div className="app-sidebar-inner">
        <div className="brand-block mb-3">
          <div className="brand-logo-wrap mb-2">
            <img src="/PinecosCafe.jpeg" alt="Cafe Pinecos" className="brand-logo" />
          </div>
          <div className="brand-title">Pinecos</div>
          <div className="brand-subtitle">Punto de venta y gestion</div>
        </div>

        <div className="sidebar-nav-groups">
          {visibleSections.map((section, idx) => (
            <div
              key={section.id}
              className={`sidebar-section${idx > 0 ? ' sidebar-section--divider' : ''}`}
            >
              <div
                className={`sidebar-section-title ${section.titleClass || 'sidebar-section-title--sub'}`}
              >
                {section.title}
              </div>
              <nav className="nav flex-column sidebar-nav-list" aria-label={section.title}>
                {section.items.map((item) => (
                  <NavLink
                    key={item.navKey || (typeof item.to === 'string' ? item.to : item.label)}
                    to={item.to}
                    className="sidebar-link"
                    onClick={onNavigate}
                  >
                    <span>{item.label}</span>
                    {item.to === '/configuracion' && pendientesFiscales > 0 && (
                      <span className="badge rounded-pill text-bg-danger ms-2" title="Pendientes fiscales por revisar">
                        {pendientesFiscales}
                      </span>
                    )}
                  </NavLink>
                ))}
              </nav>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
