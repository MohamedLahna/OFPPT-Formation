import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated } from '../services/authService';

export default function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(localStorage.getItem('ofppt_user') || '{}');
    const needsActivation = user?.statut === 'en_attente_activation' || user?.must_change_password || user?.actif === false;
    if (needsActivation && location.pathname !== '/activation') {
      return <Navigate to="/activation" replace />;
    }
  } catch {
    // If the local user cache is corrupted, the backend remains the source of truth.
  }

  return children;
}
