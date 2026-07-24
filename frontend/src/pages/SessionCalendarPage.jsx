import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { Badge, Button, Card, Field, PageTitle, Table, inputClass } from '../components/ui';

const dayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const monthLabel = (date) => date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
const isoDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const sameDay = (a, b) => isoDate(a) === isoDate(b);
const getSessionDate = (session) => session.date_session || session.date_debut || session.date || session.created_at?.slice(0, 10);
const sessionTitle = (session) => session.formation?.titre || session.formation_titre || `Session #${session.id}`;
const sessionPlace = (session) => session.type_session === 'distance'
  ? (session.plateforme || 'A distance')
  : [session.lieu, session.salle].filter(Boolean).join(' - ') || session.ville || 'Lieu non renseigne';

function getMonthDays(currentDate) {
  const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const last = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const start = new Date(first);
  const startOffset = (first.getDay() + 6) % 7;
  start.setDate(first.getDate() - startOffset);
  const end = new Date(last);
  const endOffset = 6 - ((last.getDay() + 6) % 7);
  end.setDate(last.getDate() + endOffset);
  const days = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function getWeekDays(currentDate) {
  const start = new Date(currentDate);
  start.setDate(currentDate.getDate() - ((currentDate.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function SessionCalendarView({ sessions, loading, error, role }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('mois');
  const [selected, setSelected] = useState(null);

  const sessionsByDate = useMemo(() => sessions.reduce((map, session) => {
    const date = getSessionDate(session);
    if (!date) return map;
    map[date] = [...(map[date] || []), session];
    return map;
  }, {}), [sessions]);

  const visibleDays = view === 'semaine' ? getWeekDays(currentDate) : getMonthDays(currentDate);
  const today = new Date();
  const selectedDate = selected ? getSessionDate(selected) : null;

  const move = (amount) => {
    setCurrentDate((date) => {
      const next = new Date(date);
      if (view === 'semaine') next.setDate(next.getDate() + amount * 7);
      else next.setMonth(next.getMonth() + amount);
      return next;
    });
  };

  return <>
    <section className="session-calendar-shell">
      <div className="session-calendar-head">
        <div className="calendar-period-controls">
          <button type="button" onClick={() => move(-1)} aria-label="Periode precedente">‹</button>
          <div>
            <strong>{monthLabel(currentDate)}</strong>
            <span>{view === 'semaine' ? 'Vue semaine' : 'Vue mois'}</span>
          </div>
          <button type="button" onClick={() => move(1)} aria-label="Periode suivante">›</button>
        </div>
        <div className="calendar-view-switch">
          <button type="button" className={view === 'semaine' ? 'active' : ''} onClick={() => setView('semaine')}>Semaine</button>
          <button type="button" className={view === 'mois' ? 'active' : ''} onClick={() => setView('mois')}>Mois</button>
        </div>
      </div>

      {error && <div className="alert alert-error m-4">{error}</div>}
      {loading ? <Card className="m-4">Chargement du calendrier...</Card> : <div className={`calendar-grid ${view === 'semaine' ? 'week-view' : ''}`}>
        {dayLabels.map((label) => <div key={label} className="calendar-day-label">{label}</div>)}
        {visibleDays.map((day) => {
          const key = isoDate(day);
          const daySessions = sessionsByDate[key] || [];
          const muted = day.getMonth() !== currentDate.getMonth() && view === 'mois';
          return <div key={key} className={`calendar-day ${muted ? 'muted' : ''} ${sameDay(day, today) ? 'today' : ''} ${selectedDate === key ? 'selected' : ''}`}>
            <div className="calendar-day-number">
              <span>{day.getDate()}</span>
              {daySessions.length > 0 && <b>{daySessions.length}</b>}
            </div>
            <div className="calendar-events">
              {daySessions.map((session) => <button key={session.id} type="button" className="calendar-event" onClick={() => setSelected(session)}>
                <span>{sessionTitle(session)}</span>
                <small>{session.type_session} · {session.statut}</small>
              </button>)}
            </div>
          </div>;
        })}
      </div>}
    </section>

    <section className="calendar-detail-panel">
      {selected ? <Card>
        <div className="calendar-detail-head">
          <div>
            <p className="eyebrow">Session selectionnee</p>
            <h2>{sessionTitle(selected)}</h2>
          </div>
          <Badge value={selected.statut} />
        </div>
        <div className="calendar-detail-grid">
          <p><b>Date:</b> {getSessionDate(selected) || '-'}</p>
          <p><b>Type:</b> {selected.type_session || '-'}</p>
          <p><b>Lieu:</b> {sessionPlace(selected)}</p>
          <p><b>Region:</b> {selected.region || '-'}</p>
          <p><b>Ville:</b> {selected.ville || '-'}</p>
          <p><b>Participants:</b> {selected.participations_count || selected.participations?.length || '-'}</p>
        </div>
        <div className="calendar-detail-actions">
          <Link to={role === 'animateur' ? `/animateur/sessions/${selected.id}` : `/participant/sessions/${selected.id}`}><Button>Voir details</Button></Link>
          {role === 'animateur' && <Link to={`/animateur/sessions/${selected.id}/absences`}><Button variant="secondary">Absences</Button></Link>}
          {role === 'animateur' && <Link to={`/animateur/sessions/${selected.id}/documents`}><Button variant="secondary">Documents</Button></Link>}
          {role === 'participant' && <Link to={`/participant/sessions/${selected.id}`}><Button variant="secondary">QR / Documents</Button></Link>}
        </div>
      </Card> : <Card className="calendar-empty-detail">
        <p className="eyebrow">Details</p>
        <h2>Selectionnez une session</h2>
        <p>Cliquez sur une session dans le calendrier pour afficher ses informations. La liste complete reste disponible dessous.</p>
      </Card>}
    </section>
  </>;
}

export function SessionsWithCalendar({ endpoint, title, subtitle, role, columns, renderActions }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const perPage = 5;

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get(endpoint)
      .then((response) => setSessions(response.data.data || response.data || []))
      .catch((err) => setError(err.response?.data?.message || 'Chargement des sessions impossible.'))
      .finally(() => setLoading(false));
  }, [endpoint]);

  const statusOptions = useMemo(
    () => [...new Set(sessions.map((session) => String(session?.statut || '').toLowerCase()).filter(Boolean))].sort(),
    [sessions]
  );

  const typeOptions = useMemo(
    () => [...new Set(sessions.map((session) => String(session?.type_session || '').toLowerCase()).filter(Boolean))].sort(),
    [sessions]
  );

  const filteredSessions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sessions.filter((session) => {
      const statusOk = statusFilter === 'all' || String(session?.statut || '').toLowerCase() === statusFilter;
      const typeOk = typeFilter === 'all' || String(session?.type_session || '').toLowerCase() === typeFilter;
      if (!query) return statusOk && typeOk;
      const searchable = [
        sessionTitle(session),
        session?.ville,
        session?.region,
        session?.type_session,
        session?.statut,
        getSessionDate(session),
      ].filter(Boolean).join(' ').toLowerCase();
      return statusOk && typeOk && searchable.includes(query);
    });
  }, [sessions, search, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const pagedSessions = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filteredSessions.slice(start, start + perPage);
  }, [filteredSessions, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, typeFilter, endpoint]);

  useEffect(() => {
    if (page !== currentPage) setPage(currentPage);
  }, [currentPage, page]);

  const visiblePages = useMemo(() => {
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [currentPage, totalPages]);

  const startRow = filteredSessions.length ? (currentPage - 1) * perPage + 1 : 0;
  const endRow = Math.min(currentPage * perPage, filteredSessions.length);

  return <>
    <PageTitle title={title} subtitle={subtitle} />
    <SessionCalendarView sessions={sessions} loading={loading} error={error} role={role} />

    {!loading && <Card className="list-toolbar-card mt-5">
      <div className="list-toolbar-grid">
        <div className="list-toolbar-search-wrap">
          <input className={`${inputClass} list-toolbar-search`} placeholder="Rechercher session..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Field label="Type">
          <select className={inputClass} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">Tous les types</option>
            {typeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </Field>
        <Field label="Statut">
          <select className={inputClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Tous</option>
            {statusOptions.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
          </select>
        </Field>
      </div>
    </Card>}

    <div className="mt-5">
      {loading ? <Card>Chargement de la liste des sessions...</Card> : <Table columns={columns} rows={pagedSessions} renderActions={renderActions} />}
    </div>
    {!loading && <Card className="list-pagination-card mt-3">
      <div className="list-pagination-row">
        <p>{`Affichage ${startRow}-${endRow} sur ${filteredSessions.length}`}</p>
        <div className="list-pagination-controls">
          <button type="button" className="list-page-btn" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>‹</button>
          {visiblePages.map((pageNumber) => <button key={pageNumber} type="button" className={`list-page-btn ${pageNumber === currentPage ? 'is-active' : ''}`} onClick={() => setPage(pageNumber)}>{pageNumber}</button>)}
          <button type="button" className="list-page-btn" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>›</button>
        </div>
      </div>
    </Card>}
  </>;
}

export default function SessionCalendarPage(props) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get(props.endpoint)
      .then((response) => setSessions(response.data.data || response.data || []))
      .catch((err) => setError(err.response?.data?.message || 'Chargement du calendrier impossible.'))
      .finally(() => setLoading(false));
  }, [props.endpoint]);

  return <>
    <PageTitle title={props.title} subtitle={props.subtitle} />
    <SessionCalendarView sessions={sessions} loading={loading} error={error} role={props.role} />
  </>;
}
