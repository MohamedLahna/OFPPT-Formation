import { useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { getSessions } from '../services/sessionService';
import Skeleton from '../components/ui/Skeleton';
import ErrorBar from '../components/ui/ErrorBar';

const statusOptions = [['tous', 'Tous'], ['planifiee', 'Planifiée'], ['en_cours', 'En cours'], ['terminee', 'Terminée'], ['annulee', 'Annulée']];
const statusLabel = (value) => ({ planifiee: 'Planifiée', en_cours: 'En cours', terminee: 'Terminée', annulee: 'Annulée' }[value] || value || '-');
const badgeClass = (value) => value === 'terminee' ? 'success' : value === 'en_cours' ? 'gold' : value === 'annulee' ? 'danger' : 'info';

export default function Sessions() {
  const { data, loading, error, refetch } = useFetch(() => getSessions(), []);
  const rows = data?.data || data || [];
  const [filter, setFilter] = useState('tous');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);

  const visible = useMemo(() => rows.filter((session) => {
    const text = `${session.plan || ''} ${session.formation || ''} ${session.animateur || ''} ${session.cdc || ''}`.toLowerCase();
    return (filter === 'tous' || session.statut === filter) && text.includes(search.toLowerCase());
  }), [rows, filter, search]);

  if (loading) return <Skeleton rows={7} />;
  if (error) return <ErrorBar message={error} onRetry={refetch} />;

  if (detail) {
    return (
      <div className="page-stack">
        <button className="btn btn-secondary" onClick={() => setDetail(null)}>Retour aux sessions</button>
        <section className="panel detail-panel">
          <div className="panel-head"><div><h1>{detail.formation || 'Session'}</h1><p>Plan: {detail.plan || '-'}</p></div><span className={`badge ${badgeClass(detail.statut)}`}>{statusLabel(detail.statut)}</span></div>
          <div className="detail-grid">
            <p><strong>Date session</strong><span>{detail.date_session || '-'}</span></p>
            <p><strong>CDC</strong><span>{detail.cdc || '-'}</span></p>
            <p><strong>Animateur</strong><span>{detail.animateur || '-'}</span></p>
            <p><strong>Responsable formation</strong><span>{detail.responsable_formation || '-'}</span></p>
            <p><strong>Participants</strong><span>{detail.nombre_participants ?? 0}</span></p>
            <p><strong>Absences</strong><span>{detail.nombre_absences ?? 0}</span></p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="page-title-row"><div><h1>Sessions</h1><p>Liste réelle issue du rapport Laravel des sessions autorisées.</p></div></section>
      <section className="panel">
        <div className="filter-bar"><div className="filter-buttons">{statusOptions.map(([value, label]) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une session" /></div>
        <div className="session-list-view">
          {visible.map((session) => (
            <div className={`session-line ${session.statut || ''}`} key={session.session_id}>
              <div><strong>{session.formation || '-'}</strong><span>{session.plan || '-'}</span></div>
              <span>{session.animateur || 'Animateur non défini'}</span>
              <span>{session.date_session || '-'}</span>
              <span className={`badge ${badgeClass(session.statut)}`}>{statusLabel(session.statut)}</span>
              <div className="actions-cell"><button className="btn btn-secondary small" onClick={() => setDetail(session)}><Eye size={15} /> Voir</button></div>
            </div>
          ))}
        </div>
        {visible.length === 0 && <div className="empty-state">Aucune session trouvée.</div>}
      </section>
    </div>
  );
}
