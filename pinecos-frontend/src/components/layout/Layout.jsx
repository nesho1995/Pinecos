import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import api from '../../services/api';
import { getUserRole } from '../../utils/auth';

function Layout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [pendientesFiscales, setPendientesFiscales] = useState(0);
  const location = useLocation();
  const role = getUserRole();

  const toggleSidebar = () => setMobileSidebarOpen((prev) => !prev);
  const closeSidebar = () => setMobileSidebarOpen(false);

  // Evita que el sidebar movil quede abierto/al estado raro al navegar entre modulos.
  useEffect(() => {
    closeSidebar();
  }, [location.pathname]);

  useEffect(() => {
    if (role !== 'ADMIN') return;
    const cargarPendientesFiscales = async () => {
      try {
        const res = await api.get('/FacturacionSar/resumen-operativo');
        setPendientesFiscales(Number(res.data?.pendientes || 0));
      } catch {
        setPendientesFiscales(0);
      }
    };

    cargarPendientesFiscales();
  }, [role, location.pathname]);

  return (
    <div className="d-flex app-shell">
      <div className={`sidebar-mobile-overlay ${mobileSidebarOpen ? 'show' : ''}`} onClick={closeSidebar} />
      <div className={`sidebar-mobile-wrapper ${mobileSidebarOpen ? 'show' : ''}`}>
        <Sidebar onNavigate={closeSidebar} pendientesFiscales={pendientesFiscales} />
      </div>
      <div className="flex-grow-1 app-main d-flex flex-column">
        <Header onToggleSidebar={toggleSidebar} />
        <main className="app-content">
          <div className="app-content-inner">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default Layout;
