import { useMemo, useState } from 'react';
import { Bell, LogOut, Search, UserCircle } from 'lucide-react';
import { logout as logoutRequest } from '../services/authService';
import { useLocation, useNavigate } from 'react-router-dom';

const titles = {
  '/': 'Vue générale',
  '/utilisateurs': 'Utilisateurs',
  '/formations': 'Formations',
  '/sessions': 'Sessions',
  '/email': 'Paramètres Email',
  '/rapports': 'Rapports',
};

export default function Topbar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const title = titles[location.pathname] || 'Tableau de bord';

  const notifications = useMemo(() => [
    'Nouveau plan de formation en attente de validation',
    'Session React JS confirmée pour cette semaine',
  ], []);

  const logout = async () => {
    await logoutRequest();
    navigate('/login', { replace: true });
  };

  return (
    <header className="topbar">
      <div className="breadcrumb">Administration / <strong>{title}</strong></div>
      <div className="topbar-actions">
        <div className={`topbar-search ${searchOpen ? 'open' : ''}`}>
          {searchOpen && (
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher dans la plateforme"
              autoFocus
            />
          )}
          <button type="button" className="icon-btn" onClick={() => setSearchOpen((value) => !value)} aria-label="Ouvrir la recherche">
            <Search size={16} />
          </button>
        </div>
        <div className="dropdown-wrap">
          <button type="button" className="icon-btn has-badge" onClick={() => setNotificationsOpen((value) => !value)} aria-label="Voir les notifications">
            <Bell size={16} />
            <span>{notifications.length}</span>
          </button>
          {notificationsOpen && (
            <div className="dropdown-panel notifications-panel">
              {notifications.map((notification) => <p key={notification}>{notification}</p>)}
            </div>
          )}
        </div>
        <div className="dropdown-wrap">
          <button type="button" className="avatar-btn" onClick={() => setProfileOpen((value) => !value)} aria-label="Ouvrir le profil">
            <UserCircle size={18} />
            SA
          </button>
          {profileOpen && (
            <div className="dropdown-panel profile-panel">
              <strong>System Admin</strong>
              <span>admin@ofppt.ma</span>
              <button type="button" className="btn btn-secondary full" onClick={logout}>
                <LogOut size={16} />
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}


