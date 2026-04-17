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
import MesasAdmin from '../pages/mesas/MesasAdmin';
import Reportes from '../pages/reportes/Reportes';
import Bitacora from '../pages/bitacora/Bitacora';
import EstadoCuenta from '../pages/estadocuenta/EstadoCuenta';
import Proveedores from '../pages/proveedores/Proveedores';
import Inventario from '../pages/inventario/Inventario';
import Layout from '../components/layout/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import RoleRoute from '../components/RoleRoute';

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
          <Route path="categorias" element={<RoleRoute allowedRoles={['ADMIN']}><Categorias /></RoleRoute>} />
          <Route path="productos" element={<RoleRoute allowedRoles={['ADMIN']}><Productos /></RoleRoute>} />
          <Route path="presentaciones" element={<RoleRoute allowedRoles={['ADMIN']}><Presentaciones /></RoleRoute>} />
          <Route path="menu-sucursal" element={<RoleRoute allowedRoles={['ADMIN']}><MenuSucursal /></RoleRoute>} />
          <Route path="sucursales" element={<RoleRoute allowedRoles={['ADMIN']}><Sucursales /></RoleRoute>} />
          <Route path="usuarios" element={<RoleRoute allowedRoles={['ADMIN']}><Usuarios /></RoleRoute>} />
          <Route path="configuracion" element={<RoleRoute allowedRoles={['ADMIN']}><Configuracion /></RoleRoute>} />
          <Route path="caja" element={<Caja />} />
          <Route path="movimientos-caja" element={<MovimientosCaja />} />
          <Route path="gastos" element={<Gastos />} />
          <Route path="ventas" element={<VentasPOS />} />
          <Route path="mesas" element={<Mesas />} />
          <Route path="mesas-admin" element={<RoleRoute allowedRoles={['ADMIN']}><MesasAdmin /></RoleRoute>} />
          <Route path="reportes" element={<RoleRoute allowedRoles={['ADMIN']}><Reportes /></RoleRoute>} />
          <Route path="estado-cuenta" element={<RoleRoute allowedRoles={['ADMIN']}><EstadoCuenta /></RoleRoute>} />
          <Route path="proveedores" element={<RoleRoute allowedRoles={['ADMIN']}><Proveedores /></RoleRoute>} />
          <Route path="inventario" element={<RoleRoute allowedRoles={['ADMIN']}><Inventario /></RoleRoute>} />
          <Route path="bitacora" element={<RoleRoute allowedRoles={['ADMIN']}><Bitacora /></RoleRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
