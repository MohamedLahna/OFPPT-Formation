import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { logout as logoutRequest } from '../services/authService';
import { BarChart3, BookOpen, CalendarDays, LogOut, Mail, Settings2, Users } from 'lucide-react';
import { OfpptLogo } from './OfpptLogo';

const principal = [
  { label: 'Vue générale', path: '/', icon: BarChart3 },
  { label: 'Utilisateurs', path: '/utilisateurs', icon: Users },
  { label: 'Formations', path: '/formations', icon: BookOpen },
  { label: 'Sessions', path: '/sessions', icon: CalendarDays },
];

const configuration = [
  { label: 'Paramètres Email', path: '/email', icon: Mail },
  { label: 'Rapports', path: '/rapports', icon: Settings2 },
];

function NavGroup({ title, items }) {
  return (
    <div className="nav-group">
      <p>{title}</p>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink key={item.path} to={item.path} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Icon size={16} />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </div>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const logout = async () => {
    await logoutRequest();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="sidebar">
      <div className="brand-block">
        <OfpptLogo className="brand-logo" />
        <div>
          <strong>OFPPT</strong>
          <span>Gestion administrative</span>
        </div>
      </div>
      <div className="separator" />
      <NavGroup title="PRINCIPAL" items={principal} currentPath={location.pathname} />
      <div className="separator" />
      <NavGroup title="CONFIGURATION" items={configuration} currentPath={location.pathname} />
      <div className="sidebar-bottom">
        <div className="profile-card">
          <div className="profile-avatar">SA</div>
          <div>
            <strong>System Admin</strong>
            <span>Administrateur général</span>
          </div>
        </div>
        <button type="button" className="btn btn-secondary full" onClick={logout}>
          <LogOut size={16} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}

