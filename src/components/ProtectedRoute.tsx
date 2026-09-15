import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DashboardSkeleton from './DashboardSkeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'moderator';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { currentUser, userRole, loading, isBlocked } = useAuth();

  // Show skeleton UI while checking authentication
  if (loading) {
    return <DashboardSkeleton />;
  }

  // Determine correct login page based on the route's required role
  const loginPath = requiredRole === 'moderator' ? '/moderator-login' : '/admin-login';

  // Not logged in - redirect to appropriate login page
  if (!currentUser) {
    return <Navigate to={loginPath} replace />;
  }

  // User is blocked
  if (isBlocked) {
    console.warn('ProtectedRoute: User is blocked');
    return <Navigate to={loginPath} replace />;
  }

  // User document doesn't exist in Firestore or invalid role
  if (!userRole) {
    console.error('ProtectedRoute: No user role found');
    return <Navigate to={loginPath} replace />;
  }

  // Role-based access control - strict check
  if (requiredRole && userRole !== requiredRole) {
    console.warn(`ProtectedRoute: Access denied. Required: ${requiredRole}, User has: ${userRole}`);
    
    // Redirect based on actual role
    if (userRole === 'admin') {
      return <Navigate to="/dashboard" replace />;
    } else if (userRole === 'moderator') {
      return <Navigate to="/moderator-dashboard" replace />;
    }
    
    // Regular users cannot access any dashboard
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
