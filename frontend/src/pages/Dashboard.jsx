import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BookOpen, CalendarCheck, Pencil, UserCheck, Users } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { getDashboardStats, getUsers, updateUser } from '../services/userService';
import Skeleton from '../components/ui/Skeleton';
import ErrorBar from '../components/ui/ErrorBar';
import Modal from '../components/ui/Modal';
import { ToastContainer, useToast } from '../components/ui/Toast';

const roleLabels = {
  administrateur: 'Administrateur',
  responsable_cdc: 'Responsable CDC',
  responsable_formation: 'Responsable formation',
  responsable_dr: 'Responsable DR',
  formateur_animateur: 'Formateur animateur',
  formateur_participant: 'Formateur participant',
};

const statusLabel = (value) => ({ actif: 'Actif', en_attente_activation: 'En attente', suspendu: 'Suspendu' }[value] || value || '-');
const dateLabel = (value) => value ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value)) : '-';
const fieldError = (errors, field) => errors?.[field]?.[0] ? <small className="field-error">{errors[field][0]}</small> : null;

function KpiCard({ label, value, icon: Icon, index }) {
  const path = '0,18 12,12 24,14 36,6 48,10 60,4';
  return (
    <motion.article className="kpi-card card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }}>
      <div className="kpi-top"><span>{label}</span><Icon size={16} /></div>
      <strong>{value ?? 0}</strong>
      <svg width="60" height="24" viewBox="0 0 60 24" aria-hidden="true"><path d={`M${path}`} fill="none" stroke="var(--gold)" strokeWidth="1.5" /></svg>
    </motion.article>
  );
}

export default function Dashboard() {
  const statsFetch = useFetch(getDashboardStats, []);
  const usersFetch = useFetch(getUsers, []);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', role: '', region: '', statut: '' });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const date = useMemo(() => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()), []);
  const stats = statsFetch.data || {};
  const users = usersFetch.data || [];
  const recentUsers = users.slice(0, 4);

  const roleChart = Object.entries(stats.utilisateurs_par_role || {}).map(([role, total]) => ({ role: roleLabels[role] || role, total }));
  const accountSplit = [
    { name: 'Actifs', value: stats.comptes_actifs || 0, color: '#2563EB' },
    { name: 'En attente', value: stats.comptes_en_attente_activation || 0, color: '#C9A84C' },
    { name: 'Suspendus', value: stats.comptes_suspendus || 0, color: '#EF4444' },
  ].filter((row) => row.value > 0);

  const openEdit = (user) => {
    setEditing(user);
    setForm({ nom: user.nom || '', prenom: user.prenom || '', email: user.email || '', role: user.role || '', region: user.region || '', statut: user.statut || 'actif' });
    setFormErrors({});
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormErrors({});
    try {
      await updateUser(editing.id, form);
      toast.success('Utilisateur modifié avec succès.');
      setEditing(null);
      usersFetch.refetch();
      statsFetch.refetch();
    } catch (err) {
      setFormErrors(err.response?.data?.errors || {});
      toast.error(err.response?.data?.message || 'Modification impossible.');
    } finally {
      setSaving(false);
    }
  };

  if (statsFetch.loading || usersFetch.loading) return <Skeleton rows={7} />;
  if (statsFetch.error) return <ErrorBar message={statsFetch.error} onRetry={statsFetch.refetch} />;
  if (usersFetch.error) return <ErrorBar message={usersFetch.error} onRetry={usersFetch.refetch} />;

  return (
    <div className="page-stack">
      <ToastContainer toasts={toast.toasts} onRemove={toast.remove} />
      <section className="hero-text">
        <h1>Tableau de bord</h1>
        <p>Bienvenue, System Admin — {date}</p>
        <span className="system-status"><i /> Données synchronisées avec Laravel</span>
      </section>

      <section className="kpi-row">
        <KpiCard label="Utilisateurs totaux" value={stats.total_utilisateurs} icon={Users} index={0} />
        <KpiCard label="Comptes actifs" value={stats.comptes_actifs} icon={UserCheck} index={1} />
        <KpiCard label="Plans de formation" value={stats.plans_formation} icon={BookOpen} index={2} />
        <KpiCard label="Sessions" value={stats.sessions} icon={CalendarCheck} index={3} />
      </section>

      <section className="charts-row">
        <div className="panel chart-large">
          <div className="panel-head"><h2>Utilisateurs par rôle</h2></div>
          {roleChart.length ? <ResponsiveContainer width="100%" height={280}>
            <BarChart data={roleChart}>
              <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
              <XAxis dataKey="role" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#111F38', border: '1px solid rgba(255,255,255,0.12)', color: '#E2E8F0' }} />
              <Bar dataKey="total" fill="#2563EB" />
            </BarChart>
          </ResponsiveContainer> : <div className="empty-state">Aucune statistique disponible.</div>}
        </div>
        <div className="panel chart-small">
          <div className="panel-head"><h2>Répartition des comptes</h2></div>
          {accountSplit.length ? <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Tooltip contentStyle={{ background: '#111F38', border: '1px solid rgba(255,255,255,0.12)', color: '#E2E8F0' }} />
              <Pie data={accountSplit} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3}>
                {accountSplit.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer> : <div className="empty-state">Aucun compte à afficher.</div>}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Utilisateurs récents</h2></div>
        <table className="data-table">
          <thead><tr><th>Nom complet</th><th>Rôle</th><th>Statut</th><th>Date de création</th><th>Actions</th></tr></thead>
          <tbody>
            {recentUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.nom_complet || `${user.prenom || ''} ${user.nom || ''}`}</td>
                <td>{roleLabels[user.role] || user.role}</td>
                <td><span className={`badge ${user.statut === 'actif' ? 'success' : user.statut === 'suspendu' ? 'danger' : 'warn'}`}>{statusLabel(user.statut)}</span></td>
                <td>{dateLabel(user.created_at)}</td>
                <td className="actions-cell"><button className="table-action" onClick={() => openEdit(user)} aria-label="Modifier"><Pencil size={15} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!recentUsers.length && <div className="empty-state">Aucun utilisateur trouvé.</div>}
      </section>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Modifier un utilisateur">
        <form onSubmit={saveEdit} className="form-grid">
          <label>Nom<input value={form.nom} onChange={(event) => setForm({ ...form, nom: event.target.value })} />{fieldError(formErrors, 'nom')}</label>
          <label>Prénom<input value={form.prenom} onChange={(event) => setForm({ ...form, prenom: event.target.value })} />{fieldError(formErrors, 'prenom')}</label>
          <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />{fieldError(formErrors, 'email')}</label>
          <label>Rôle<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="administrateur">Administrateur</option><option value="responsable_cdc">Responsable CDC</option><option value="responsable_formation">Responsable formation</option><option value="responsable_dr">Responsable DR</option><option value="formateur_animateur">Formateur animateur</option><option value="formateur_participant">Formateur participant</option></select>{fieldError(formErrors, 'role')}</label>
          <label>Région<input value={form.region || ''} onChange={(event) => setForm({ ...form, region: event.target.value })} />{fieldError(formErrors, 'region')}</label>
          <label>Statut<select value={form.statut} onChange={(event) => setForm({ ...form, statut: event.target.value })}><option value="actif">Actif</option><option value="en_attente_activation">En attente</option><option value="suspendu">Suspendu</option></select>{fieldError(formErrors, 'statut')}</label>
          <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Annuler</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button></div>
        </form>
      </Modal>
    </div>
  );
}
