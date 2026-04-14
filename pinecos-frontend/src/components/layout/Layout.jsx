import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

function Layout() {
  return (
    <div className="d-flex min-vh-100 app-shell">
      <Sidebar />
      <div className="flex-grow-1 app-main">
        <Header />
        <main className="p-4 app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
