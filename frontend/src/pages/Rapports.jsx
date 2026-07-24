import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download } from 'lucide-react';
import { getDashboardStats } from '../services/userService';
import { getPlanReport, getReportOptions } from '../services/reportService';
import DateRangePicker from '../components/forms/DateRangePicker';
import Skeleton from '../components/ui/Skeleton';
import ErrorBar from '../components/ui/ErrorBar';

const monthKey = (value) => value ? new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(value)) : 'Sans date';

export default function Rapports() {
  const [tab, setTab] = useState('Aperçu');
  const [options, setOptions] = useState({ plans: [], formations: [], cdcs: [], animateurs: [], responsables_formation: [] });
  const [filters, setFilters] = useState({ plan_id: '', formation_id: '', cdc_id: '', animateur_id: '', responsable_formation_id: '', date_from: '', date_to: '', statut: '' });
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const params = () => Object.fromEntries(Object.entries(filters).filter(([, value]) => value));

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [optionsResponse, reportResponse, statsResponse] = await Promise.all([getReportOptions(), getPlanReport(params()), getDashboardStats()]);
      setOptions(optionsResponse.data || {});
      setRows(reportResponse.data?.data || []);
      setStats(statsResponse.data || {});
    } catch (err) {
      setError(err.response?.data?.message || 'Chargement des rapports impossible.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const sessionsByMonth = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => map.set(monthKey(row.date_session), (map.get(monthKey(row.date_session)) || 0) + 1));
    return [...map.entries()].map(([month, sessions]) => ({ month, sessions }));
  }, [rows]);

  const usersByRole = useMemo(() => Object.entries(stats?.utilisateurs_par_role || {}).map(([role, total]) => ({ role, total })), [stats]);
  const sessionsByPlan = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => map.set(row.plan || 'Sans plan', (map.get(row.plan || 'Sans plan') || 0) + 1));
    return [...map.entries()].map(([name, sessions]) => ({ name, sessions }));
  }, [rows]);

  const exportCsv = () => {
    const headers = ['Plan', 'Formation', 'CDC', 'Animateur', 'Responsable formation', 'Participants', 'Absences', 'Statut', 'Date session'];
    const csvRows = rows.map((row) => [row.plan, row.formation, row.cdc, row.animateur, row.responsable_formation, row.nombre_participants, row.nombre_absences, row.statut, row.date_session]);
    const csv = [headers, ...csvRows].map((line) => line.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapport_ofppt_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <Skeleton rows={7} />;
  if (error) return <ErrorBar message={error} onRetry={load} />;

  return (
    <div className="page-stack">
      <section className="page-title-row"><div><h1>Rapports</h1><p>Rapports générés depuis les endpoints Laravel `/reports/options` et `/reports/plans`.</p></div><button className="btn btn-primary" onClick={exportCsv} disabled={!rows.length}><Download size={16} /> Exporter en CSV</button></section>

      <section className="panel form-panel">
        <div className="form-grid">
          <label>Plan<select value={filters.plan_id} onChange={(event) => setFilters({ ...filters, plan_id: event.target.value })}><option value="">Tous</option>{(options.plans || []).map((plan) => <option key={plan.id} value={plan.id}>{plan.titre}</option>)}</select></label>
          <label>Formation<select value={filters.formation_id} onChange={(event) => setFilters({ ...filters, formation_id: event.target.value })}><option value="">Toutes</option>{(options.formations || []).map((formation) => <option key={formation.id} value={formation.id}>{formation.titre}</option>)}</select></label>
          <label>CDC<select value={filters.cdc_id} onChange={(event) => setFilters({ ...filters, cdc_id: event.target.value })}><option value="">Tous</option>{(options.cdcs || []).map((user) => <option key={user.id} value={user.id}>{user.prenom} {user.nom}</option>)}</select></label>
          <label>Animateur<select value={filters.animateur_id} onChange={(event) => setFilters({ ...filters, animateur_id: event.target.value })}><option value="">Tous</option>{(options.animateurs || []).map((user) => <option key={user.id} value={user.id}>{user.prenom} {user.nom}</option>)}</select></label>
          <DateRangePicker
            label="Période du rapport"
            startDate={filters.date_from}
            endDate={filters.date_to}
            onChange={({ startDate, endDate }) => setFilters({ ...filters, date_from: startDate, date_to: endDate })}
          />
        </div>
        <div className="button-row"><button className="btn btn-primary" onClick={load}>Appliquer les filtres</button><button className="btn btn-secondary" onClick={() => setFilters({ plan_id: '', formation_id: '', cdc_id: '', animateur_id: '', responsable_formation_id: '', date_from: '', date_to: '', statut: '' })}>Réinitialiser</button></div>
      </section>

      <div className="tabs">{['Aperçu', 'Utilisateurs', 'Sessions'].map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>)}</div>
      {tab === 'Aperçu' && <section className="page-stack"><div className="mini-stat-row"><div className="mini-stat"><span>Total utilisateurs</span><strong>{stats?.total_utilisateurs ?? 0}</strong></div><div className="mini-stat"><span>Sessions filtrées</span><strong>{rows.length}</strong></div><div className="mini-stat"><span>Absences filtrées</span><strong>{rows.reduce((sum, row) => sum + Number(row.nombre_absences || 0), 0)}</strong></div></div><div className="panel"><div className="panel-head"><h2>Sessions par mois</h2></div>{sessionsByMonth.length ? <ResponsiveContainer width="100%" height={300}><BarChart data={sessionsByMonth}><CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} /><XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 12 }} /><YAxis allowDecimals={false} tick={{ fill: '#94A3B8', fontSize: 12 }} /><Tooltip contentStyle={{ background: '#111F38', border: '1px solid rgba(255,255,255,0.12)', color: '#E2E8F0' }} /><Bar dataKey="sessions" fill="#2563EB" /></BarChart></ResponsiveContainer> : <div className="empty-state">Aucune session dans ce filtre.</div>}</div></section>}
      {tab === 'Utilisateurs' && <section className="page-stack"><div className="panel"><div className="panel-head"><h2>Utilisateurs par rôle</h2></div>{usersByRole.length ? <ResponsiveContainer width="100%" height={300}><LineChart data={usersByRole}><CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} /><XAxis dataKey="role" tick={{ fill: '#94A3B8', fontSize: 12 }} /><YAxis allowDecimals={false} tick={{ fill: '#94A3B8', fontSize: 12 }} /><Tooltip contentStyle={{ background: '#111F38', border: '1px solid rgba(255,255,255,0.12)', color: '#E2E8F0' }} /><Line dataKey="total" stroke="#C9A84C" strokeWidth={2} /></LineChart></ResponsiveContainer> : <div className="empty-state">Aucune donnée utilisateur.</div>}</div><div className="panel"><table className="data-table"><thead><tr><th>Rôle</th><th>Total</th></tr></thead><tbody>{usersByRole.map((row) => <tr key={row.role}><td>{row.role}</td><td>{row.total}</td></tr>)}</tbody></table></div></section>}
      {tab === 'Sessions' && <section className="page-stack"><div className="panel"><div className="panel-head"><h2>Sessions par plan de formation</h2></div>{sessionsByPlan.length ? <ResponsiveContainer width="100%" height={300}><BarChart layout="vertical" data={sessionsByPlan}><CartesianGrid stroke="rgba(255,255,255,0.07)" horizontal={false} /><XAxis type="number" allowDecimals={false} tick={{ fill: '#94A3B8', fontSize: 12 }} /><YAxis type="category" dataKey="name" width={160} tick={{ fill: '#94A3B8', fontSize: 12 }} /><Tooltip contentStyle={{ background: '#111F38', border: '1px solid rgba(255,255,255,0.12)', color: '#E2E8F0' }} /><Bar dataKey="sessions" fill="#2563EB" /></BarChart></ResponsiveContainer> : <div className="empty-state">Aucune session.</div>}</div><div className="panel"><table className="data-table"><thead><tr><th>Plan</th><th>Formation</th><th>Animateur</th><th>Participants</th><th>Absences</th><th>Date</th></tr></thead><tbody>{rows.map((row) => <tr key={row.session_id}><td>{row.plan || '-'}</td><td>{row.formation || '-'}</td><td>{row.animateur || '-'}</td><td>{row.nombre_participants ?? 0}</td><td>{row.nombre_absences ?? 0}</td><td>{row.date_session || '-'}</td></tr>)}</tbody></table></div></section>}
    </div>
  );
}
