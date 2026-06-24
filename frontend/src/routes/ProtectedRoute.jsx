import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../components/common/LoadingScreen';
import AdminLayout from '../layouts/AdminLayout';
import SellerLayout from '../layouts/SellerLayout';

export function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/seller'} replace />;
  }
  return children;
}

export function AdminRoute() {
  return (
    <ProtectedRoute roles={['admin']}>
      <AdminLayout>
        <Outlet />
      </AdminLayout>
    </ProtectedRoute>
  );
}

export function SellerRoute() {
  return (
    <ProtectedRoute roles={['seller', 'admin']}>
      <SellerLayout>
        <Outlet />
      </SellerLayout>
    </ProtectedRoute>
  );
}

export function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/seller'} replace />;
  }
  return children;
}
