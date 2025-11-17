import HomeDashboard from './HomeDashboard';

/**
 * HomePage Component
 * Displays the authenticated user's home dashboard
 * This component is protected by ProtectedRoute in App.jsx
 * so it will only be accessible to authenticated users
 */
function HomePage() {
  return <HomeDashboard />;
}

export default HomePage;
