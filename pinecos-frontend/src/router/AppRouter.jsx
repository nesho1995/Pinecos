import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/auth/Login';
import Dashboard from '../pages/dashboard/Dashboard';
import VentasPOS from '../pages/ventas/VentasPOS';
import Categorias from '../pages/categorias/Categorias';
import Productos from '../pages/productos/Productos';
import Sucursales from '../pages/sucursales/Sucursales';
import Usuarios from '../pages/usuarios/Usuarios';
import Presentaciones from '../pages/presentaciones/Presentaciones';
import Configuracion from '../pages/configuracion/Configuracion';
import MenuSucursal from '../pages/menu/MenuSucursal';
import Caja from '../pages/caja/Caja';
import Gastos from '../pages/gastos/Gastos';
import MovimientosCaja from '../pages/movimientoscaja/MovimientosCaja';
import Mesas from '../pages/mesas/Mesas';
import Reportes from '../pages/reportes/Reportes';
import Bitacora from '../pages/bitacora/Bitacora';
import EstadoCuenta from '../pages/estadocuenta/EstadoCuenta';
import Layout from '../components/layout/Layout';
import ProtectedRoute from '../components/ProtectedRoute';

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="categorias" element={<Categorias />} />
          <Route path="productos" element={<Productos />} />
          <Route path="presentaciones" element={<Presentaciones />} />
          <Route path="menu-sucursal" element={<MenuSucursal />} />
          <Route path="sucursales" element={<Sucursales />} />
          <Route path="usuarios" element={<Usuarios />} />
          <Route path="configuracion" element={<Configuracion />} />
          <Route path="caja" element={<Caja />} />
          <Route path="movimientos-caja" element={<MovimientosCaja />} />
          <Route path="gastos" element={<Gastos />} />
          <Route path="ventas" element={<VentasPOS />} />
          <Route path="mesas" element={<Mesas />} />
          <Route path="reportes" element={<Reportes />} />
          <Route path="estado-cuenta" element={<EstadoCuenta />} />
          <Route path="bitacora" element={<Bitacora />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
