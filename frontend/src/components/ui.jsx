import { useCallback, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { roleLabels } from '../utils/roles';
import IntroScreen from './IntroScreen';
import OFPPTLogo from './OFPPTLogo';
import ProfileAvatar from './profile/ProfileAvatar';
import ParticipantAdvisorWidget from './participant/ParticipantAdvisorWidget';

export function Field({ label, error, children }) { return <label className="form-group"><span className="form-label">{label}</span>{children}{error && <span className="form-error">{error}</span>}</label>; }
export const inputClass = 'form-input';
export function Button({ children, variant='primary', ...props }) { const cls = variant==='secondary' ? 'btn-secondary' : variant==='danger' ? 'btn-danger' : variant==='success' ? 'btn-success' : 'btn-primary'; return <button {...props} className={`btn ${cls} ${props.className||''}`}>{children}</button>; }
export function Card({ children, className='' }) { return <section className={`card ${className}`}>{children}</section>; }
export function Badge({ value }) { return <span className={`badge badge-${value}`}>{value || '-'}</span>; }
export function StatCard({ label, value }) { const isObject=value&&typeof value==='object'&&!Array.isArray(value); const total=isObject?Object.values(value).reduce((sum,item)=>sum+Number(item||0),0):(value??0); return <section className="stat-card"><p className="stat-label">{label}</p><p className="stat-number">{total}</p>{isObject&&<div className="relative mt-3 space-y-1 text-xs text-[var(--text-muted)]">{Object.entries(value).map(([k,v])=><p key={k} className="flex justify-between gap-3"><span>{k}</span><b>{v}</b></p>)}</div>}</section>; }

const menus = {
  administrateur:[['/admin/dashboard','Vue generale'],['/admin/users','Utilisateurs'],['/admin/audit-logs','Journal audit'],['/admin/mail-settings','Parametres Email'],['/admin/rapports','Rapports']],
  responsable_cdc:[['/cdc/dashboard','Vue generale'],['/cdc/plans','Plans'],['/cdc/absences','Absences'],['/cdc/rapports','Rapports']],
  responsable_formation:[['/responsable-formation/dashboard','Vue generale'],['/responsable-formation/plans','Plans'],['/responsable-formation/sessions','Sessions'],['/responsable-formation/rapports','Rapports']],
  formateur_animateur:[['/animateur/dashboard','Vue generale'],['/animateur/sessions','Mes sessions'],['/animateur/qr-scan','Scanner QR'],['/animateur/rapports','Rapports']],
  formateur_participant:[['/participant/dashboard','Vue generale'],['/participant/sessions','Mes sessions'],['/participant/documents','Documents'],['/participant/absences','Absences']],
  responsable_dr:[['/dr/dashboard','Vue generale'],['/dr/plans','Plans'],['/dr/sessions','Sessions'],['/dr/participants','Participants'],['/dr/absences','Absences'],['/dr/statistiques','Statistiques'],['/dr/rapports','Rapports']],
};
export function AppLayout() {
  const { user, logout } = useAuth();
  const [showIntro, setShowIntro] = useState(() => (
    sessionStorage.getItem('ofppt_intro_pending') === '1'
    && sessionStorage.getItem('ofppt_intro_v3') !== '1'
  ));
  const items = menus[user?.role] || [];
  const splitAt = Math.min(3, Math.max(1, items.length));
  const primaryItems = items.slice(0, splitAt);
  const secondaryItems = items.slice(splitAt);
  const role = roleLabels[user?.role] || 'OFPPT';
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const renderNav = (navItems) => navItems.map(([to, label]) => (
    <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
      <span className="nav-dot" />
      <span>{label}</span>
    </NavLink>
  ));
  const finishIntro = useCallback(() => {
    sessionStorage.removeItem('ofppt_intro_pending');
    sessionStorage.setItem('ofppt_intro_v3', '1');
    setShowIntro(false);
  }, []);

  return (
    <div className="ofppt-shell">
      {showIntro && <IntroScreen onComplete={finishIntro} />}
      <aside className="ofppt-sidebar">
        <div className="ofppt-brand">
          <OFPPTLogo compact className="ofppt-brand-logo" />
          <div>
            <strong>OFPPT Formation</strong>
            <span>Gestion des formations</span>
          </div>
        </div>

        <NavLink to="/mon-compte" className={({ isActive }) => `ofppt-user ofppt-user-link ${isActive ? 'active' : ''}`}>
          <div className="ofppt-avatar-wrap">
            <ProfileAvatar user={user} size="md" />
            <span className="ofppt-online" />
          </div>
          <div className="ofppt-user-info">
            <div className="ofppt-user-name">{user?.prenom} {user?.nom}</div>
            <div className="ofppt-user-role">{role}</div>
            <div className="ofppt-user-account">Mon compte</div>
          </div>
        </NavLink>

        <p className="nav-section">Principal</p>
        <nav className="nav-list">{renderNav(primaryItems)}</nav>

        {secondaryItems.length > 0 && (
          <>
            <p className="nav-section">Configuration</p>
            <nav className="nav-list">{renderNav(secondaryItems)}</nav>
          </>
        )}

        <div className="ofppt-sidebar-footer">
          <Button variant="secondary" onClick={logout} className="full">Deconnexion</Button>
          <span>v1.0 · OFPPT</span>
        </div>
      </aside>

      <div className="ofppt-main">
        <header className="ofppt-topbar">
          <div className="topbar-title">
            <strong>{role}</strong>
            <span>OFPPT › {today}</span>
          </div>
          <div className="topbar-actions">
            <Button variant="secondary" onClick={logout}>Deconnexion</Button>
          </div>
        </header>
        <main className="ofppt-content">
          <div className="page-wrapper mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
        {user?.role === 'formateur_participant' && <ParticipantAdvisorWidget />}
      </div>
    </div>
  );
}
export function PageTitle({ eyebrow='OFPPT', title, subtitle, action }) { return <div className="page-title"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</div>{action&&<div className="shrink-0">{action}</div>}</div>; }
export function Table({ columns, rows, renderActions }) { return <Card className="overflow-hidden p-0"><div className="overflow-x-auto"><table className="data-table"><thead><tr>{columns.map(c=><th key={c.key}>{c.label}</th>)}{renderActions&&<th>Actions</th>}</tr></thead><tbody>{!rows?.length&&<tr><td className="py-8 text-center" colSpan={columns.length+(renderActions?1:0)}>Aucune donnee trouvee.</td></tr>}{rows?.map((r,i)=><tr key={r.id||r.session_id||i}>{columns.map(c=><td key={c.key}>{c.render?c.render(r):r[c.key]}</td>)}{renderActions&&<td>{renderActions(r)}</td>}</tr>)}</tbody></table></div></Card>; }
export function Drawer({ open, title, subtitle, onClose, children }) {
  if (!open) return null;
  return <div className="drawer-overlay">
    <button aria-label="Fermer" className="absolute inset-0" onClick={onClose} />
    <aside className="drawer-panel">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Ajout rapide</p>
          <h2 className="text-2xl font-black text-[var(--text-primary)]">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>}
        </div>
        <Button variant="secondary" onClick={onClose}>Fermer</Button>
      </div>
      {children}
    </aside>
  </div>;
}

