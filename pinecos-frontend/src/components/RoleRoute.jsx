import { Navigate } from 'react-router-dom';
import { getDefaultRouteByRole, getUserRole } from '../utils/auth';

function RoleRoute({ allowedRoles = [], children }) {
  const role = getUserRole();
  const normalized = (allowedRoles || []).map((x) => String(x).toUpperCase());

  if (normalized.length > 0 && !normalized.includes(role)) {
    return <Navigate to={getDefaultRouteByRole()} replace />;
  }

  return children;
}

export default RoleRoute;
