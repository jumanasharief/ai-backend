import { useUser } from '../../context/UserContext';
import SignIn from './SignIn';
import HomeDashboard from './HomeDashboard';

function HomePage() {
  const { user, isAuthenticated, loading } = useUser();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (isAuthenticated && user) {
    return <HomeDashboard />;
  }

  return <SignIn />;
}

export default HomePage;
