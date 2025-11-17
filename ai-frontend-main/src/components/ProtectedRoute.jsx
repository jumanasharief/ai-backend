import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

/**
 * ProtectedRoute Component
 * Wrapper component that protects routes from unauthenticated access
 * 
 * Features:
 * - Checks if user is authenticated via UserContext
 * - Shows loading state while checking authentication
 * - Redirects to /signup if not authenticated
 * - Renders children if authenticated
 * 
 * Usage:
 * <ProtectedRoute>
 *   <YourProtectedComponent />
 * </ProtectedRoute>
 */
const ProtectedRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useUser();

  // Show loading state while checking authentication
  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  // If user is not authenticated, redirect to signup page
  if (!isAuthenticated || !user) {
    return <Navigate to="/signup" replace />;
  }

  // If authenticated, render the protected content
  return children;
};

export default ProtectedRoute;

