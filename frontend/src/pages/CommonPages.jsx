import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bell, MailOpen } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import SmartGreetingBar from '../components/dashboard/SmartGreetingBar';
import DateRangePicker from '../components/forms/DateRangePicker';
import { Badge, Button, Card, Field, inputClass, PageTitle, Table } from '../components/ui';
import { roles, roleLabels } from '../utils/roles';
import { moroccanRegions } from '../utils/regions';

const useLoad = (url, fallback) => { const [data,setData]=useState(fallback); const [loading,setLoading]=useState(true); useEffect(()=>{api.get(url).then(r=>setData(r.data.data||r.data)).finally(()=>setLoading(false));},[url]); return [data,loading,setData]; };
const responseError = (err, fallback) => err.response?.data?.message || Object.values(err.response?.data?.errors || {})?.[0]?.[0] || fallback;
export function Unauthorized(){return <div className="min-h-screen grid place-items-center"><Card><h1 className="text-2xl font-black">Acces non autorise</h1><Link to="/login" className="text-[#008a94] font-bold">Retour</Link></Card></div>}
const timelineMonths = [
  ['janvier', 'Jan'], ['fevrier', 'Fév'], ['mars', 'Mar'], ['avril', 'Avr'],
  ['mai', 'Mai'], ['juin', 'Juin'], ['juillet', 'Juil'], ['aout', 'Août'],
  ['septembre', 'Sep'], ['octobre', 'Oct'], ['novembre', 'Nov'], ['decembre', 'Déc'],
];

const parsePlanMonth = (value) => {
  if (!value) return null;
  const normalized = String(value).trim();
  const date = new Date(normalized);
  if (!Number.isNaN(date.getTime())) return date.getMonth();
  const lower = normalized.toLowerCase();
  const explicit = timelineMonths.findIndex(([name, short]) => lower.includes(name) || lower.includes(short.toLowerCase()));
  if (explicit >= 0) return explicit;
  const numeric = lower.match(/\b(0?[1-9]|1[0-2])\b/);
  return numeric ? Number(numeric[1]) - 1 : null;
};

function workloadFor(count) {
  if (!count) return { label: 'Vide', className: 'empty' };
  if (count <= 2) return { label: 'Faible', className: 'low' };
  if (count === 3) return { label: 'Moyen', className: 'medium' };
  return { label: 'Chargé', className: 'high' };
}

function balanceLevel(activeMonths, total, busiestCount) {
  if (!total) return { label: 'À construire', className: 'empty' };
  if (activeMonths <= 1 || busiestCount / total >= 0.72) return { label: 'Faible équilibre', className: 'weak' };
  if (activeMonths <= 4 || busiestCount / total >= 0.45) return { label: 'Équilibre moyen', className: 'medium' };
  return { label: 'Bon équilibre', className: 'good' };
}

function buildStrategicInsights({ total, activeMonths, busiest, emptyMonths, balance, withoutPeriod }) {
  if (!total) {
    return [
      'Aucune formation datée n’est encore disponible dans la planification annuelle.',
      'Ajoutez une période souhaitée aux lignes de formation pour obtenir une lecture stratégique fiable.',
    ];
  }

  const concentration = Math.round((busiest.count / total) * 100);
  const insights = [
    `${concentration}% des formations prévues sont concentrées en ${busiest.name}.`,
  ];

  if (activeMonths === 1) {
    insights.push('Aucun autre mois n’est encore exploité dans la planification actuelle.');
  } else if (activeMonths <= 4) {
    insights.push(`La charge est répartie sur ${activeMonths} mois, ce qui laisse une marge d’optimisation annuelle.`);
  } else {
    insights.push(`La planification couvre ${activeMonths} mois, ce qui soutient une meilleure continuité pédagogique.`);
  }

  if (balance.className === 'weak') {
    insights.push('Une meilleure distribution réduirait le risque de surcharge et améliorerait l’équilibre global.');
  } else if (balance.className === 'medium') {
    insights.push('La répartition est exploitable, mais certains pics de charge peuvent encore être lissés.');
  } else {
    insights.push('La répartition actuelle limite les pics de charge et facilite le suivi opérationnel.');
  }

  if (emptyMonths >= 8) {
    insights.push(`${emptyMonths} mois restent sans formation prévue, ce qui révèle une planification encore très concentrée.`);
  }

  if (withoutPeriod > 0) {
    insights.push(`${withoutPeriod} ligne(s) n’ont pas encore de période souhaitée et ne sont pas incluses dans cette analyse.`);
  }

  return insights.slice(0, 4);
}

function buildPlanningAnalysis(plans) {
  const counts = Array.from({ length: 12 }, () => 0);
  let withoutPeriod = 0;
  (plans || []).forEach((plan) => {
    (plan.lignes || []).forEach((line) => {
      const month = parsePlanMonth(line.periode_souhaitee);
      if (month === null || month < 0 || month > 11) {
        withoutPeriod += 1;
        return;
      }
      counts[month] += 1;
    });
  });

  const total = counts.reduce((sum, value) => sum + value, 0);
  const activeMonths = counts.filter(Boolean).length;
  const emptyMonths = 12 - activeMonths;
  const max = Math.max(1, ...counts);
  const months = timelineMonths.map(([name, short], index) => {
    const count = counts[index];
    return {
      name,
      short,
      count,
      height: Math.max(count ? 18 : 6, Math.round((count / max) * 100)),
      workload: workloadFor(count),
    };
  });
  const busiest = months.reduce((best, month) => month.count > best.count ? month : best, months[0]);
  const balance = balanceLevel(activeMonths, total, busiest.count);
  const insights = buildStrategicInsights({ total, activeMonths, busiest, emptyMonths, balance, withoutPeriod });
  const concentration = total ? Math.round((busiest.count / total) * 100) : 0;

  return { months, total, activeMonths, emptyMonths, busiest, balance, insights, withoutPeriod, concentration };
}

function metricTotal(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return Object.values(value).reduce((sum, item) => sum + Number(item || 0), 0);
  return value ?? 0;
}

function CountUpValue({ value }) {
  const numeric = Number(value);
  const [display, setDisplay] = useState(Number.isFinite(numeric) ? 0 : value);
  useEffect(() => {
    if (!Number.isFinite(numeric)) {
      setDisplay(value ?? '-');
      return undefined;
    }
    let frame = 0;
    const totalFrames = 22;
    const timer = setInterval(() => {
      frame += 1;
      const progress = 1 - Math.pow(1 - frame / totalFrames, 3);
      setDisplay(Math.round(numeric * progress));
      if (frame >= totalFrames) clearInterval(timer);
    }, 22);
    return () => clearInterval(timer);
  }, [numeric, value]);
  return <>{display}</>;
}

function UnifiedMetricsBoard({ labels = {}, data = {} }) {
  const entries = Object.entries(labels);
  return <section className="dashboard-metrics-board">
    <div className="dashboard-metrics-head">
      <div>
        <p className="eyebrow">Pilotage</p>
        <h2>Indicateurs clés</h2>
      </div>
      <span>{entries.length} indicateurs actifs</span>
    </div>
    <div className="dashboard-metrics-grid">
      {entries.map(([key, label], index) => {
        const metricValue = metricTotal(data[key]);
        const isTextValue = !Number.isFinite(Number(metricValue));
        const isRegionMetric = key === 'region';
        const textValue = typeof metricValue === 'string' && isRegionMetric
          ? metricValue.replace(/-/g, ' - ')
          : metricValue;
        return <div key={key} className="dashboard-metric-cell" style={{ animationDelay: `${index * 55}ms` }}>
        <span>{label}</span>
        <strong className={`${isTextValue ? 'is-text-value' : ''} ${isRegionMetric ? 'is-region-value' : ''}`.trim()}>
          <CountUpValue value={textValue} />
        </strong>
      </div>;
      })}
    </div>
  </section>;
}

function CdcAnnualPlanning({ analysis }) {
  const [hoveredMonth, setHoveredMonth] = useState(null);
  return <section className="cdc-planning-module">
    <div className="cdc-planning-header">
      <div>
        <p className="eyebrow">Vue stratégique</p>
        <h2>Planification annuelle</h2>
        <p>Répartition réelle des formations prévues sur l’année.</p>
      </div>
      <span className={`cdc-balance-badge cdc-balance-${analysis.balance.className}`}>{analysis.balance.label}</span>
    </div>

    <div className="cdc-planning-mini-kpis">
      <div><small>Formations</small><strong>{analysis.total}</strong></div>
      <div><small>Mois clé</small><strong>{analysis.total ? analysis.busiest.short : '-'}</strong></div>
      <div><small>Couverture</small><strong>{analysis.activeMonths}/12</strong></div>
    </div>

    <div className="cdc-planning-chart compact" aria-label="Répartition mensuelle des formations prévues">
      <div className="cdc-planning-bars">
        {analysis.months.map((month, index) => <button
          type="button"
          key={month.name}
          className={`cdc-planning-month cdc-planning-${month.workload.className} ${month.count === analysis.busiest.count && month.count > 0 ? 'is-peak' : ''}`}
          onMouseEnter={() => setHoveredMonth(month)}
          onMouseLeave={() => setHoveredMonth(null)}
          aria-label={`${month.name}: ${month.count} formation(s), charge ${month.workload.label}`}
        >
          <div className="cdc-planning-bar-shell">
            <i style={{ height: `${month.height}%`, animationDelay: `${index * 55}ms` }} />
          </div>
          <strong>{month.short}</strong>
          <span>{month.count}</span>
        </button>)}
      </div>
      {hoveredMonth && <div className={`cdc-planning-tooltip cdc-planning-tooltip-${hoveredMonth.workload.className}`}>
        <strong>{hoveredMonth.name.charAt(0).toUpperCase() + hoveredMonth.name.slice(1)}</strong>
        <span>{hoveredMonth.count} formation(s)</span>
        <small>Charge : {hoveredMonth.workload.label}</small>
      </div>}
    </div>

    <div className="cdc-planning-insight-list connected">
      {analysis.insights.slice(0, 3).map((insight, index) => <p key={insight} style={{ animationDelay: `${index * 90}ms` }}>{insight}</p>)}
    </div>
  </section>;
}

function CdcRecentActivity({ plans }) {
  const activities = (plans || []).slice(0, 5).map((plan) => {
    const statusText = {
      brouillon: 'Plan en brouillon',
      en_attente_validation: 'Plan soumis pour validation',
      valide: 'Plan validé',
      a_corriger: 'Plan à corriger',
      refuse: 'Plan refusé',
    }[plan.statut] || 'Plan mis à jour';
    return {
      id: plan.id,
      title: statusText,
      detail: plan.titre,
      meta: plan.date_soumission ? new Date(plan.date_soumission).toLocaleDateString('fr-FR') : `Année ${plan.annee || '-'}`,
      status: plan.statut,
    };
  });

  return <section className="dashboard-soft-module activity-module">
    <div className="module-title-row">
      <div><p className="eyebrow">Flux CDC</p><h3>Activité récente</h3></div>
      <span>{activities.length}</span>
    </div>
    <div className="activity-timeline">
      {!activities.length && <p className="module-empty">Aucune activité récente disponible.</p>}
      {activities.map((activity, index) => <div key={activity.id || index} className="activity-item" style={{ animationDelay: `${index * 70}ms` }}>
        <i />
        <div>
          <strong>{activity.title}</strong>
          <span>{activity.detail}</span>
          <small>{activity.meta}</small>
        </div>
        <Badge value={activity.status} />
      </div>)}
    </div>
  </section>;
}

function CdcAssistant({ analysis, dashboardData }) {
  const recommendations = [];
  if (analysis.balance.className === 'weak') recommendations.push('Répartir les formations sur plusieurs mois pour réduire le risque de surcharge opérationnelle.');
  if (analysis.withoutPeriod > 0) recommendations.push('Compléter les périodes souhaitées manquantes afin de fiabiliser la lecture annuelle.');
  if (Number(dashboardData.plans_a_corriger || 0) > 0) recommendations.push('Prioriser les plans à corriger pour accélérer leur retour dans le circuit de validation.');
  if (!recommendations.length) recommendations.push('La structure actuelle est stable. Continuez à surveiller l’équilibre mensuel et les validations.');

  return <section className="dashboard-soft-module assistant-module">
    <div className="module-title-row">
      <div><p className="eyebrow">Assistant stratégique CDC</p><h3>Lecture assistée</h3></div>
      <span>{analysis.concentration}%</span>
    </div>
    <p className="assistant-summary">Concentration du mois clé : <b>{analysis.total ? analysis.busiest.name : 'aucune donnée'}</b>.</p>
    <div className="assistant-recommendations">
      {recommendations.map((item, index) => <p key={item} style={{ animationDelay: `${index * 80}ms` }}>{item}</p>)}
    </div>
  </section>;
}

function CdcSmartAlerts({ analysis, dashboardData }) {
  const alerts = [];
  if (Number(dashboardData.plans_a_corriger || 0) > 0) alerts.push({ level: 'warning', text: `${dashboardData.plans_a_corriger} plan(s) nécessitent une correction.` });
  if (Number(dashboardData.plans_brouillon || 0) > 0) alerts.push({ level: 'info', text: `${dashboardData.plans_brouillon} plan(s) sont encore en brouillon.` });
  if (analysis.balance.className === 'weak') alerts.push({ level: 'danger', text: 'La planification est trop concentrée sur peu de mois.' });
  if (analysis.withoutPeriod > 0) alerts.push({ level: 'warning', text: `${analysis.withoutPeriod} ligne(s) sans période souhaitée.` });
  if (Number(dashboardData.absences || 0) > 0) alerts.push({ level: 'info', text: `${dashboardData.absences} absence(s) constatée(s) dans les formations CDC.` });
  if (!alerts.length) alerts.push({ level: 'success', text: 'Aucune alerte critique détectée pour le moment.' });

  return <section className="dashboard-soft-module alerts-module">
    <div className="module-title-row">
      <div><p className="eyebrow">Surveillance</p><h3>Alertes intelligentes</h3></div>
      <span>{alerts.length}</span>
    </div>
    <div className="alerts-list">
      {alerts.map((alert, index) => <p key={alert.text} className={`alert-pill alert-${alert.level}`} style={{ animationDelay: `${index * 75}ms` }}>{alert.text}</p>)}
    </div>
  </section>;
}

function CdcDashboardWorkspace({ dashboardData }) {
  const [plans] = useLoad('/cdc/plans', []);
  const analysis = useMemo(() => buildPlanningAnalysis(plans), [plans]);
  return <section className="cdc-dashboard-workspace">
    <div className="cdc-workspace-left">
      <CdcAnnualPlanning analysis={analysis} />
      <CdcRecentActivity plans={plans} />
    </div>
    <div className="cdc-workspace-right">
      <CdcAssistant analysis={analysis} dashboardData={dashboardData} />
      <CdcSmartAlerts analysis={analysis} dashboardData={dashboardData} />
    </div>
  </section>;
}

const getSessionDateValue = (session) => {
  const raw = session?.date_session || session?.date_debut || session?.date || session?.created_at;
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const sessionTitle = (session) => session?.formation?.titre || session?.formation || session?.titre || `Session #${session?.id || '-'}`;

const attendanceStatus = (value) => String(value || '').toLowerCase();

function buildParticipantAnalysis(sessions, absences) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalSessions = sessions.length;
  const finishedSessions = sessions.filter((session) => session.statut === 'terminee' || session.is_finished).length;
  const upcomingSessions = sessions.filter((session) => {
    const date = getSessionDateValue(session);
    return date && date >= today && !['terminee', 'annulee'].includes(session.statut);
  }).length;
  const evaluationsPending = sessions.filter((session) => {
    const participation = session.current_participation;
    return (session.statut === 'terminee' || session.is_finished) && participation && !participation.evaluation;
  }).length;

  const presentRecords = absences.filter((row) => attendanceStatus(row.statut) === 'present').length;
  const lateRecords = absences.filter((row) => attendanceStatus(row.statut) === 'retard').length;
  const justifiedRecords = absences.filter((row) => attendanceStatus(row.statut) === 'justifie').length;
  const absentRecords = absences.filter((row) => attendanceStatus(row.statut) === 'absent').length;
  const knownPresence = presentRecords + lateRecords + justifiedRecords + absentRecords;
  const positivePresence = presentRecords + lateRecords + justifiedRecords;
  const attendanceRate = knownPresence ? Math.round((positivePresence / knownPresence) * 100) : null;

  const nextSession = [...sessions]
    .filter((session) => {
      const date = getSessionDateValue(session);
      return date && date >= today;
    })
    .sort((a, b) => getSessionDateValue(a) - getSessionDateValue(b))[0];

  const statusCounts = sessions.reduce((counts, session) => {
    const key = session.statut || 'non_renseigne';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});

  const insights = [];
  if (!totalSessions) {
    insights.push('Aucune session n’est encore associée à votre compte.');
  } else {
    insights.push(`${totalSessions} session(s) sont associées à votre parcours de formation.`);
    if (attendanceRate === null) insights.push('Aucune présence n’est encore enregistrée pour calculer un taux fiable.');
    else if (attendanceRate >= 90) insights.push(`Votre présence confirmée est excellente avec un taux de ${attendanceRate}%.`);
    else if (attendanceRate >= 70) insights.push(`Votre présence confirmée est correcte, mais peut encore progresser (${attendanceRate}%).`);
    else insights.push(`Votre taux de présence confirmé est faible (${attendanceRate}%). Vérifiez les sessions manquées.`);
    if (upcomingSessions > 0) insights.push(`${upcomingSessions} session(s) à venir demandent votre préparation.`);
    if (evaluationsPending > 0) insights.push(`${evaluationsPending} évaluation(s) restent à compléter après session.`);
  }

  return {
    totalSessions,
    finishedSessions,
    upcomingSessions,
    evaluationsPending,
    presentRecords,
    lateRecords,
    justifiedRecords,
    absentRecords,
    knownPresence,
    attendanceRate,
    nextSession,
    statusCounts,
    insights,
  };
}

function ParticipantAnalyticsSection() {
  const [sessions, setSessions] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    Promise.all([
      api.get('/participant/sessions'),
      api.get('/participant/absences').catch(() => ({ data: [] })),
    ]).then(([sessionsResponse, absencesResponse]) => {
      if (!mounted) return;
      setSessions(sessionsResponse.data.data || sessionsResponse.data || []);
      setAbsences(absencesResponse.data.data || absencesResponse.data || []);
    }).catch((err) => {
      if (!mounted) return;
      setError(responseError(err, 'Chargement de l’analyse participant impossible.'));
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const analysis = useMemo(() => buildParticipantAnalysis(sessions, absences), [sessions, absences]);
  const attendanceWidth = analysis.attendanceRate === null ? 0 : analysis.attendanceRate;
  const attendanceLabel = `${analysis.attendanceRate ?? 0}%`;
  const presenceBreakdown = [
    { label: 'Présences', value: analysis.presentRecords, className: 'present' },
    { label: 'Retards', value: analysis.lateRecords, className: 'late' },
    { label: 'Justifiées', value: analysis.justifiedRecords, className: 'justified' },
    { label: 'Absences', value: analysis.absentRecords, className: 'absent' },
  ];

  return <section className="participant-analysis-module">
    <div className="participant-analysis-head">
      <div>
        <p className="eyebrow">Analyse personnelle</p>
        <h2>Mes sessions & ma présence</h2>
        <p>Lecture automatique de vos sessions inscrites, présences confirmées, absences et évaluations restantes.</p>
      </div>
      <span>{attendanceLabel}</span>
    </div>

    {loading && <p className="module-empty">Chargement de votre analyse...</p>}
    {error && <p className="alert-pill alert-danger">{error}</p>}

    {!loading && !error && <>
      <div className="participant-analysis-grid">
        <div className="participant-score-card">
          <small>Taux de présence confirmé</small>
          <strong>{attendanceLabel}</strong>
          <div className="participant-score-track">
            <i style={{ width: `${attendanceWidth}%` }} />
          </div>
          <p>{analysis.knownPresence ? `${analysis.knownPresence} présence(s) vérifiée(s)` : 'Aucune présence encore vérifiée'}</p>
        </div>

        <div className="participant-kpi-list">
          <div><small>Sessions totales</small><strong>{analysis.totalSessions}</strong></div>
          <div><small>À venir</small><strong>{analysis.upcomingSessions}</strong></div>
          <div><small>Terminées</small><strong>{analysis.finishedSessions}</strong></div>
          <div><small>Évaluations</small><strong>{analysis.evaluationsPending}</strong></div>
        </div>
      </div>

      <div className="participant-presence-breakdown">
        {presenceBreakdown.map((item) => <div key={item.label} className={`participant-presence-item ${item.className}`}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>)}
      </div>

      <div className="participant-analysis-bottom">
        <div className="participant-next-session">
          <p className="eyebrow">Prochaine session</p>
          {analysis.nextSession ? <>
            <h3>{sessionTitle(analysis.nextSession)}</h3>
            <span>{analysis.nextSession.date_session || '-'} · {analysis.nextSession.ville || analysis.nextSession.region || 'Lieu non renseigné'}</span>
            <Link to={`/participant/sessions/${analysis.nextSession.id}`}><Button variant="secondary">Voir détails / QR</Button></Link>
          </> : <p className="module-empty">Aucune prochaine session planifiée.</p>}
        </div>

        <div className="participant-insights">
          <p className="eyebrow">Lecture intelligente</p>
          {analysis.insights.map((insight, index) => <p key={insight} style={{ animationDelay: `${index * 80}ms` }}>{insight}</p>)}
        </div>
      </div>
    </>}
  </section>;
}

function ParticipantMessageCenter() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const unread = messages.filter((item) => !item.is_read).length;

  const load = () => {
    setLoading(true);
    setError('');
    api.get('/participant/messages')
      .then(({ data }) => setMessages(data.data || data || []))
      .catch((err) => setError(responseError(err, 'Chargement des messages impossible.')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markRead = async (message) => {
    if (message.is_read) return;
    try {
      const { data } = await api.patch(`/participant/messages/${message.id}/read`);
      const updated = data.data || data;
      setMessages((current) => current.map((item) => item.id === message.id ? updated : item));
    } catch {
      // The message remains readable even if the read marker fails.
    }
  };

  return <section className="participant-message-center">
    <button type="button" className="participant-message-trigger" onClick={() => setOpen((current) => !current)}>
      <span className="participant-message-icon"><Bell size={19}/>{unread > 0 && <i>{unread}</i>}</span>
      <span className="sr-only">Messages d’absence</span>
    </button>

    {open && <div className="participant-message-panel">
      <div className="module-title-row">
        <div><p className="eyebrow">Centre de messages</p><h3>Messages de vos animateurs</h3></div>
        <span>{messages.length}</span>
      </div>
      {loading && <p className="module-empty">Chargement des messages...</p>}
      {error && <p className="alert-pill alert-danger">{error}</p>}
      {!loading && !error && !messages.length && <p className="module-empty">Aucun message pour le moment.</p>}
      {!loading && !error && messages.map((message) => <article key={message.id} className={`participant-message-item ${message.is_read ? 'is-read' : ''}`} onClick={() => markRead(message)}>
        <div className="participant-message-item-head">
          <MailOpen size={16}/>
          <strong>{message.subject || 'Message concernant votre absence'}</strong>
          {!message.is_read && <span>Nouveau</span>}
        </div>
        <p>{message.message}</p>
        <small>{message.session?.formation?.titre || 'Session'} · {message.session?.date_session || message.absence?.date_absence || '-'} · {message.animateur?.nom_complet || 'Animateur'}</small>
      </article>)}
    </div>}
  </section>;
}

const anomalyTypeLabel = {
  info: 'Info',
  warning: 'Alerte',
  critical: 'Critique',
};

const anomalyTypeClass = {
  info: 'badge-info',
  warning: 'badge-warning',
  critical: 'badge-critical',
};

function AuditTimeline({ logs = [], loading }) {
  return <section className="dashboard-soft-module admin-audit-module">
    <div className="module-title-row">
      <div>
        <p className="eyebrow">Supervision</p>
        <h3>Journal d audit</h3>
      </div>
      <Link to="/admin/audit-logs"><Button variant="secondary">Voir tout</Button></Link>
    </div>
    {loading && <p className="module-empty">Chargement du journal...</p>}
    {!loading && !logs.length && <p className="module-empty">Aucune action auditee pour le moment.</p>}
    {!loading && logs.length > 0 && <div className="admin-audit-timeline">
      {logs.map((log) => <article key={log.id} className="admin-audit-item">
        <div className="admin-audit-meta">
          <span className="admin-audit-action">{log.action}</span>
          <span>{log.module}</span>
          <span>{log.actor_name || 'Systeme'}</span>
          <span>{log.created_at ? new Date(log.created_at).toLocaleString('fr-FR') : '-'}</span>
        </div>
        <p>{log.description}</p>
      </article>)}
    </div>}
  </section>;
}

function SystemAnomaliesPanel({ anomalies = [], loading }) {
  return <section className="dashboard-soft-module admin-anomaly-module">
    <div className="module-title-row">
      <div>
        <p className="eyebrow">Integrite</p>
        <h3>Anomalies detectees</h3>
      </div>
      <span>{anomalies.length}</span>
    </div>
    {loading && <p className="module-empty">Analyse des anomalies en cours...</p>}
    {!loading && !anomalies.length && <p className="module-empty">Aucune anomalie detectee. Etat systeme stable.</p>}
    {!loading && anomalies.length > 0 && <div className="admin-anomaly-grid">
      {anomalies.map((anomaly, index) => <article key={`${anomaly.module}-${anomaly.title}-${index}`} className="admin-anomaly-card">
        <div className="admin-anomaly-head">
          <span>{anomaly.module}</span>
          <b className={anomalyTypeClass[anomaly.type] || anomalyTypeClass.info}>{anomalyTypeLabel[anomaly.type] || 'Info'}</b>
        </div>
        <h4>{anomaly.title}</h4>
        <strong>{anomaly.count}</strong>
        <p>{anomaly.message}</p>
      </article>)}
    </div>}
  </section>;
}

function AdminControlCenter() {
  const [auditLogs, auditLoading] = useLoad('/admin/audit-logs?limit=8', []);
  const [anomalies, anomalyLoading] = useLoad('/admin/system-anomalies', []);
  return <div className="admin-control-center">
    <AuditTimeline logs={auditLogs} loading={auditLoading} />
    <SystemAnomaliesPanel anomalies={anomalies} loading={anomalyLoading} />
  </div>;
}

export function Dashboard({ endpoint, labels }) {
  const [data] = useLoad(endpoint, {});
  const { user } = useAuth();
  const isCdc = endpoint === '/cdc/dashboard';
  const isParticipant = endpoint === '/participant/dashboard';
  const isAdmin = endpoint === '/admin/dashboard';

  return <div className="dashboard-composition">
    <SmartGreetingBar user={user} action={isParticipant ? <ParticipantMessageCenter /> : null} />
    <UnifiedMetricsBoard labels={labels} data={data} />
    {isAdmin && <AdminControlCenter />}
    {isCdc && <CdcDashboardWorkspace dashboardData={data} />}
    {isParticipant && <ParticipantAnalyticsSection />}
  </div>;
}

export function AdminUsers(){ const [users]=useLoad('/admin/users',[]); return <><PageTitle title="Utilisateurs" subtitle="Comptes et activation Gmail" action={<Link to="/admin/users/create"><Button>Ajouter un utilisateur</Button></Link>}/><Table columns={[{key:'nom_complet',label:'Nom complet'},{key:'email',label:'Email',render:r=>r.email||'Non renseigne'},{key:'role',label:'Role',render:r=>roleLabels[r.role]},{key:'region',label:'Region',render:r=>r.region||'-'},{key:'statut',label:'Statut',render:r=><Badge value={r.statut}/>},{key:'actif',label:'Actif',render:r=>r.actif?'Oui':'Non'},{key:'must_change_password',label:'Activation',render:r=>r.must_change_password?'A activer':'Valide'}]} rows={users} renderActions={u=><div className="flex flex-wrap gap-2"><Link className="rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-[#08235a]" to={`/admin/users/${u.id}/details`}>Details</Link><Link className="rounded-full bg-[#008a94] px-3 py-2 text-xs font-black text-white" to={`/admin/users/${u.id}/edit`}>Modifier</Link></div>}/></>}
export function AdminCreateUser(){ const nav=useNavigate(); const [form,setForm]=useState({nom:'',prenom:'',email:'',role:'formateur_participant',region:''}); const [result,setResult]=useState(null); const [error,setError]=useState(''); const submit=async(e)=>{e.preventDefault(); setError(''); try{const payload={...form}; if(payload.role!=='responsable_dr') payload.region=''; const {data}=await api.post('/admin/users',payload); setResult(data);}catch(err){setError(err.response?.data?.message||Object.values(err.response?.data?.errors||{})?.[0]?.[0]||'Creation impossible.');}}; return <><PageTitle title="Creer un compte" subtitle="L'utilisateur recevra un compte en attente et choisira son Gmail final pendant l'activation."/>{error&&<Card className="mb-4 text-red-700">{error}</Card>}{result&&<Card className="mb-4 bg-emerald-50"><p className="font-black">Compte en attente d'activation.</p><p>Email initial: <b>{result.user.email}</b></p><p>Mot de passe temporaire: <b>{result.temporary_password}</b></p><p>L'utilisateur se connecte avec cet email initial et ce mot de passe temporaire.</p><Button className="mt-3" onClick={()=>nav('/admin/users')}>Retour liste</Button></Card>}<Card><form onSubmit={submit} className="grid gap-4 md:grid-cols-2"><Field label="Nom"><input required className={inputClass} value={form.nom} onChange={e=>setForm({...form,nom:e.target.value})}/></Field><Field label="Prenom"><input required className={inputClass} value={form.prenom} onChange={e=>setForm({...form,prenom:e.target.value})}/></Field><Field label="Email initial"><input required className={inputClass} type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></Field><Field label="Role"><select required className={inputClass} value={form.role} onChange={e=>setForm({...form,role:e.target.value,region:e.target.value==='responsable_dr'?form.region:''})}>{roles.filter(r=>r!=='administrateur').map(r=><option key={r} value={r}>{roleLabels[r]}</option>)}</select></Field>{form.role==='responsable_dr'&&<Field label="Region DR"><select required className={inputClass} value={form.region} onChange={e=>setForm({...form,region:e.target.value})}><option value="">Choisir une region</option>{moroccanRegions.map(r=><option key={r} value={r}>{r}</option>)}</select></Field>}<Button>Creer le compte</Button></form></Card></>}
export function AdminUserDetails(){ const {id}=useParams(); const [u]=useLoad(`/admin/users/${id}`,null); const [temporary,setTemporary]=useState(''); const [error,setError]=useState(''); const action=async(path)=>{setError(''); try{await api.patch(`/admin/users/${id}/${path}`); location.reload();}catch(err){setError(responseError(err,'Action impossible.'));}}; const reset=async()=>{setError(''); try{const {data}=await api.post(`/admin/users/${id}/reset-password`); setTemporary(data.temporary_password);}catch(err){setError(responseError(err,'Reinitialisation impossible.'));}}; if(!u)return null; return <><PageTitle title="Details utilisateur"/>{error&&<Card className="mb-4 bg-red-50 text-red-700">{error}</Card>}{temporary&&<Card className="mb-4 bg-amber-50"><b>Nouveau mot de passe temporaire:</b> {temporary}</Card>}<Card><div className="grid gap-3"><p><b>{u.prenom} {u.nom}</b></p><p>Email: {u.email||'Non renseigne'}</p><p>Role: {roleLabels[u.role]}</p><Badge value={u.statut}/><div className="flex flex-wrap gap-3"><Link to={`/admin/users/${id}/edit`}><Button>Modifier</Button></Link><Button variant="danger" onClick={()=>action('suspend')}>Suspendre</Button><Button onClick={()=>action('reactivate')}>Reactiver</Button><Button variant="secondary" onClick={reset}>Reinitialiser mot de passe</Button></div></div></Card></>}

export function AdminUserEdit(){
  const {id}=useParams();
  const nav=useNavigate();
  const [form,setForm]=useState({nom:'',prenom:'',email:'',role:'formateur_participant',region:'',statut:'en_attente_activation'});
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  useEffect(()=>{setLoading(true); api.get(`/admin/users/${id}`).then(({data})=>{const user=data.data||data; setForm({nom:user.nom||'',prenom:user.prenom||'',email:user.email||'',role:user.role||'formateur_participant',region:user.region||'',statut:user.statut||'en_attente_activation'});}).catch(err=>setError(responseError(err,'Utilisateur introuvable.'))).finally(()=>setLoading(false));},[id]);
  const update=(key,value)=>setForm(current=>({...current,[key]:value}));
  const submit=async(e)=>{e.preventDefault(); setSaving(true); setError(''); setSuccess(''); try{await api.put(`/admin/users/${id}`,form); setSuccess('Compte utilisateur modifie avec succes.'); setTimeout(()=>nav(`/admin/users/${id}/details`),500);}catch(err){setError(responseError(err,'Modification impossible.'));}finally{setSaving(false);}};
  if(loading)return <><PageTitle title="Modifier utilisateur"/><Card>Chargement...</Card></>;
  return <><PageTitle title="Modifier utilisateur" subtitle="Mettez a jour les informations du compte sans changer son historique."/>
    {error&&<Card className="mb-4 bg-red-50 text-red-700">{error}</Card>}
    {success&&<Card className="mb-4 bg-emerald-50 text-emerald-700">{success}</Card>}
    <Card><form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      <Field label="Nom"><input required className={inputClass} value={form.nom} onChange={e=>update('nom',e.target.value)}/></Field>
      <Field label="Prenom"><input required className={inputClass} value={form.prenom} onChange={e=>update('prenom',e.target.value)}/></Field>
      <Field label="Email"><input required type="email" className={inputClass} value={form.email} onChange={e=>update('email',e.target.value)}/></Field>
      <Field label="Role"><select required className={inputClass} value={form.role} onChange={e=>setForm(current=>({...current,role:e.target.value,region:e.target.value==='responsable_dr'?current.region:''}))}>{roles.map(r=><option key={r} value={r}>{roleLabels[r]}</option>)}</select></Field>
      {form.role==='responsable_dr'&&<Field label="Region DR"><select required className={inputClass} value={form.region} onChange={e=>update('region',e.target.value)}><option value="">Choisir une region</option>{moroccanRegions.map(r=><option key={r} value={r}>{r}</option>)}</select></Field>}
      <Field label="Statut"><select required className={inputClass} value={form.statut} onChange={e=>update('statut',e.target.value)}><option value="en_attente_activation">En attente activation</option><option value="actif">Actif</option><option value="suspendu">Suspendu</option></select></Field>
      <div className="flex flex-wrap gap-3 md:col-span-2"><Button disabled={saving}>{saving?'Enregistrement...':'Enregistrer les modifications'}</Button><Button type="button" variant="secondary" onClick={()=>nav('/admin/users')}>Annuler</Button></div>
    </form></Card></>;
}

export function MailSettingsPage(){
  const [form,setForm]=useState({sender_name:'OFPPT Formation',sender_email:'ilyassbouhida6@gmail.com',app_password:'',is_active:false});
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  useEffect(()=>{api.get('/admin/mail-settings').then(({data})=>setForm({sender_name:data.sender_name||'OFPPT Formation',sender_email:data.sender_email||'ilyassbouhida6@gmail.com',app_password:'',is_active:!!data.is_active})).catch(err=>setError(responseError(err,'Chargement impossible.'))).finally(()=>setLoading(false));},[]);
  const update=(key,value)=>setForm(current=>({...current,[key]:value}));
  const submit=async(e)=>{e.preventDefault(); setSaving(true); setError(''); setSuccess(''); try{const payload={...form}; if(!payload.app_password) delete payload.app_password; const {data}=await api.put('/admin/mail-settings',payload); setSuccess(data.message||'Parametres email enregistres.'); setForm(current=>({...current,app_password:''}));}catch(err){setError(responseError(err,'Enregistrement impossible.'));}finally{setSaving(false);}};
  if(loading)return <><PageTitle title="Parametres Email"/><Card>Chargement...</Card></>;
  return <><PageTitle title="Parametres Email" subtitle="Configuration Gmail utilisee pour envoyer les codes d'activation."/>
    {error&&<Card className="mb-4 bg-red-50 text-red-700">{error}</Card>}
    {success&&<Card className="mb-4 bg-emerald-50 text-emerald-700">{success}</Card>}
    <Card><form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      <Field label="Nom expediteur"><input required className={inputClass} value={form.sender_name} onChange={e=>update('sender_name',e.target.value)}/></Field>
      <Field label="Email expediteur Gmail"><input required type="email" className={inputClass} value={form.sender_email} onChange={e=>update('sender_email',e.target.value)} placeholder="ilyassbouhida6@gmail.com"/></Field>
      <Field label="Gmail App Password"><input className={inputClass} type="password" value={form.app_password} onChange={e=>update('app_password',e.target.value)} placeholder="********"/></Field>
      <Field label="Activer l'envoi SMTP"><select className={inputClass} value={form.is_active?'1':'0'} onChange={e=>update('is_active',e.target.value==='1')}><option value="0">Non, utiliser le log local</option><option value="1">Oui, utiliser Gmail SMTP</option></select></Field>
      <div className="md:col-span-2"><Button disabled={saving}>{saving?'Enregistrement...':'Enregistrer les parametres'}</Button></div>
    </form></Card>
    <Card className="mt-4 text-sm text-slate-600">Le mot de passe d'application est chiffre en base et n'est jamais affiche en clair. En mode local sans SMTP actif, le code est journalise dans les logs Laravel.</Card>
  </>;
}

export function AdminAuditLogsPage() {
  const initialFilters = {
    search: '',
    action: '',
    module: '',
    role: '',
    user_id: '',
    date_debut: '',
    date_fin: '',
  };
  const [filters, setFilters] = useState(initialFilters);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (nextFilters) => {
    setLoading(true);
    setError('');
    try {
      const params = Object.fromEntries(Object.entries(nextFilters).filter(([, value]) => String(value || '').trim() !== ''));
      const { data } = await api.get('/admin/audit-logs', { params });
      setLogs(data || []);
    } catch (err) {
      setError(responseError(err, 'Chargement des logs impossible.'));
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(filters);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  const submit = (event) => {
    event.preventDefault();
    load(filters);
  };

  const reset = () => {
    setFilters(initialFilters);
    load(initialFilters);
  };

  const rows = logs.map((log) => ({
    ...log,
    id: log.id,
    created_label: log.created_at ? new Date(log.created_at).toLocaleString('fr-FR') : '-',
    actor_label: log.actor_name || 'Systeme',
    role_label: log.actor_role || '-',
    user_label: log.user?.nom_complet || (log.user_id ? `User #${log.user_id}` : '-'),
  }));

  return <>
    <PageTitle title="Journal d audit" subtitle="Trace complete des actions sensibles et operations systeme." />
    <Card className="mb-4">
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-4">
        <Field label="Recherche"><input className={inputClass} value={filters.search} onChange={(e) => update('search', e.target.value)} placeholder="Action, module, acteur..." /></Field>
        <Field label="Action"><input className={inputClass} value={filters.action} onChange={(e) => update('action', e.target.value)} placeholder="ex: user_created" /></Field>
        <Field label="Module"><input className={inputClass} value={filters.module} onChange={(e) => update('module', e.target.value)} placeholder="ex: Utilisateurs" /></Field>
        <Field label="Role acteur"><input className={inputClass} value={filters.role} onChange={(e) => update('role', e.target.value)} placeholder="ex: administrateur" /></Field>
        <Field label="User cible (ID)"><input className={inputClass} value={filters.user_id} onChange={(e) => update('user_id', e.target.value)} placeholder="ex: 15" /></Field>
        <Field label="Date debut"><input type="date" className={inputClass} value={filters.date_debut} onChange={(e) => update('date_debut', e.target.value)} /></Field>
        <Field label="Date fin"><input type="date" className={inputClass} value={filters.date_fin} onChange={(e) => update('date_fin', e.target.value)} /></Field>
        <div className="md:col-span-4 flex flex-wrap gap-3">
          <Button disabled={loading}>{loading ? 'Chargement...' : 'Appliquer filtres'}</Button>
          <Button type="button" variant="secondary" onClick={reset}>Reinitialiser</Button>
        </div>
      </form>
    </Card>
    {error && <Card className="mb-4 bg-red-50 text-red-700">{error}</Card>}
    {loading ? <Card>Chargement du journal...</Card> : <Table
      columns={[
        { key: 'created_label', label: 'Date' },
        { key: 'action', label: 'Action' },
        { key: 'module', label: 'Module' },
        { key: 'actor_label', label: 'Acteur' },
        { key: 'role_label', label: 'Role' },
        { key: 'user_label', label: 'User cible' },
        { key: 'description', label: 'Description' },
      ]}
      rows={rows}
    />}
  </>;
}

const isObjectValue = (value) => value !== null && typeof value === 'object';

const flattenValues = (value, depth = 0) => {
  if (value === null || value === undefined || depth > 2) return [];
  if (Array.isArray(value)) return value.flatMap((item) => flattenValues(item, depth + 1));
  if (isObjectValue(value)) return Object.values(value).flatMap((item) => flattenValues(item, depth + 1));
  return [String(value)];
};

const extractDateFromRow = (row) => {
  const raw = row?.date_session || row?.date_soumission || row?.created_at || row?.updated_at;
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeStatus = (value) => String(value || '').trim().toLowerCase();

export function SimpleList({ endpoint,title,subtitle,columns,renderActions,action }) {
  const [rows] = useLoad(endpoint, []);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [page, setPage] = useState(1);
  const perPage = 5;
  const enhancedList = /\/(plans|sessions)(\/|$)/.test(endpoint);

  const statusOptions = useMemo(() => {
    const options = [...new Set(rows.map((row) => normalizeStatus(row?.statut)).filter(Boolean))];
    return options.sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (!enhancedList) return rows;

    const query = search.trim().toLowerCase();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last30Start = new Date(todayStart);
    last30Start.setDate(last30Start.getDate() - 30);
    const last90Start = new Date(todayStart);
    last90Start.setDate(last90Start.getDate() - 90);

    return rows.filter((row) => {
      const statusOk = statusFilter === 'all' || normalizeStatus(row?.statut) === statusFilter;

      let periodOk = true;
      if (periodFilter !== 'all') {
        const date = extractDateFromRow(row);
        if (!date) periodOk = false;
        else if (periodFilter === '30d') periodOk = date >= last30Start && date <= now;
        else if (periodFilter === '90d') periodOk = date >= last90Start && date <= now;
        else if (periodFilter === 'year') periodOk = date.getFullYear() === now.getFullYear();
      }

      let searchOk = true;
      if (query) {
        const haystack = flattenValues(row).join(' ').toLowerCase();
        searchOk = haystack.includes(query);
      }

      return statusOk && periodOk && searchOk;
    });
  }, [rows, enhancedList, search, statusFilter, periodFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    if (!enhancedList) return filteredRows;
    const start = (currentPage - 1) * perPage;
    return filteredRows.slice(start, start + perPage);
  }, [filteredRows, enhancedList, currentPage]);

  const startRow = filteredRows.length ? (currentPage - 1) * perPage + 1 : 0;
  const endRow = Math.min(currentPage * perPage, filteredRows.length);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, periodFilter, endpoint]);

  useEffect(() => {
    if (currentPage !== page) setPage(currentPage);
  }, [currentPage, page]);

  const compactStatusLabel = (status) => status.replaceAll('_', ' ');
  const pageWindowStart = Math.max(1, currentPage - 2);
  const pageWindowEnd = Math.min(totalPages, pageWindowStart + 4);
  const visiblePages = Array.from({ length: pageWindowEnd - pageWindowStart + 1 }, (_, index) => pageWindowStart + index);

  return <>
    <PageTitle title={title} subtitle={subtitle} action={action}/>

    {enhancedList && <Card className="list-toolbar-card mb-4">
      <div className="list-toolbar-grid">
        <div className="list-toolbar-search-wrap">
          <input
            className={`${inputClass} list-toolbar-search`}
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Field label="Periode">
          <select className={inputClass} value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}>
            <option value="all">Toutes les dates</option>
            <option value="30d">30 derniers jours</option>
            <option value="90d">90 derniers jours</option>
            <option value="year">Annee en cours</option>
          </select>
        </Field>

        <Field label="Statut">
          <select className={inputClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Tous</option>
            {statusOptions.map((status) => <option key={status} value={status}>{compactStatusLabel(status)}</option>)}
          </select>
        </Field>
      </div>
    </Card>}

    <Table columns={columns} rows={enhancedList ? pagedRows : filteredRows} renderActions={renderActions}/>

    {enhancedList && <Card className="list-pagination-card mt-3">
      <div className="list-pagination-row">
        <p>{`Affichage ${startRow}-${endRow} sur ${filteredRows.length}`}</p>
        <div className="list-pagination-controls">
          <button type="button" className="list-page-btn" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>‹</button>
          {visiblePages.map((pageNumber) => <button key={pageNumber} type="button" className={`list-page-btn ${pageNumber === currentPage ? 'is-active' : ''}`} onClick={() => setPage(pageNumber)}>{pageNumber}</button>)}
          <button type="button" className="list-page-btn" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>›</button>
        </div>
      </div>
    </Card>}
  </>;
}
export function DownloadDocumentButton({ doc }) {
  const [error, setError] = useState('');
  const download = async () => {
    setError('');
    try {
      const response = await api.get(`/participant/documents/${doc.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data]));
      const a = window.document.createElement('a');
      a.href = url;
      a.download = doc.file_path?.split('/').pop() || `${doc.titre || 'document'}.pdf`;
      window.document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || 'Telechargement impossible.');
    }
  };
  return <div className="flex flex-col gap-1"><Button onClick={download}>Telecharger</Button>{error&&<span className="text-xs font-bold text-red-600">{error}</span>}</div>;
}
export function ReportPage({ title }) {
  const { user } = useAuth();
  const [options, setOptions] = useState({ plans: [], formations: [], cdcs: [], animateurs: [], responsables_formation: [] });
  const [filters, setFilters] = useState({ plan_id: '', formation_id: '', cdc_id: '', animateur_id: '', responsable_formation_id: '', date_from: '', date_to: '', statut: '' });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const visibleFormations = filters.plan_id ? options.formations.filter((f) => (options.plan_formations || []).some((x) => String(x.plan_id) === String(filters.plan_id) && Number(x.formation_id) === Number(f.id))) : options.formations;
  const params = () => Object.fromEntries(Object.entries(filters).filter(([,v]) => v !== ''));
  const load = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await api.get('/reports/plans', { params: params() });
      setRows(data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || Object.values(err.response?.data?.errors || {})?.[0]?.[0] || 'Generation du rapport impossible.');
    } finally { setLoading(false); }
  };
  useEffect(() => { api.get('/reports/options').then((r) => setOptions(r.data)); load(); }, []);
  const update = (key, value) => setFilters((current) => ({ ...current, [key]: value, ...(key === 'plan_id' ? { formation_id: '' } : {}) }));

  const reportSummary = useMemo(() => {
    const sessions = rows.length;
    const participants = rows.reduce((sum, row) => sum + Number(row.nombre_participants || 0), 0);
    const absences = rows.reduce((sum, row) => sum + Number(row.nombre_absences || 0), 0);
    const documents = rows.reduce((sum, row) => sum + Number(row.documents || 0), 0);
    const evaluations = rows.reduce((sum, row) => sum + Number(row.evaluations || 0), 0);
    const absenceRate = participants ? Math.round((absences / participants) * 1000) / 10 : 0;
    const plans = new Set(rows.map((row) => row.plan).filter(Boolean)).size;
    const formations = new Set(rows.map((row) => row.formation).filter(Boolean)).size;
    return { sessions, participants, absences, documents, evaluations, absenceRate, plans, formations };
  }, [rows]);

  const statusLabel = (value) => ({ planifiee: 'Planifiee', en_cours: 'En cours', terminee: 'Terminee', annulee: 'Annulee' }[value] || value || '-');
  const selectedLabel = (list, id, fallback) => id ? (list.find((item) => String(item.id) === String(id))?.titre || list.find((item) => String(item.id) === String(id))?.nom_complet || fallback) : fallback;
  const personLabel = (list, id, fallback) => id ? (list.find((item) => String(item.id) === String(id)) ? `${list.find((item) => String(item.id) === String(id)).prenom} ${list.find((item) => String(item.id) === String(id)).nom}` : fallback) : fallback;
  const escapeHtml = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const excelDate = () => new Date().toLocaleString('fr-FR');

  const exportDesignedExcel = () => {
    const reportColumns = [
      ['session_id', 'ID session'], ['plan', 'Plan'], ['annee_plan', 'Année'], ['statut_plan', 'Statut plan'], ['periode_plan', 'Période plan'],
      ['formation', 'Formation'], ['theme', 'Thématique'], ['niveau', 'Niveau'], ['duree_formation', 'Durée'], ['priorite', 'Priorité'], ['public_cible', 'Public cible'],
      ['cdc', 'Responsable CDC'], ['responsable_formation', 'Responsable formation'], ['animateur', 'Animateur'],
      ['type_session', 'Type'], ['date_session', 'Date session'], ['region', 'Région'], ['ville', 'Ville'], ['lieu', 'Lieu'], ['salle', 'Salle'],
      ['nombre_participants', 'Participants'], ['nombre_absences', 'Absences'], ['taux_absence', 'Taux absence %'], ['evaluations', 'Évaluations'],
      ['documents', 'Documents'], ['hebergements', 'Hébergements'], ['plateforme', 'Plateforme'], ['statut', 'Statut session'],
    ];
    const colSpan = reportColumns.length;
    const filterRows = [
      ['Plan', selectedLabel(options.plans, filters.plan_id, 'Tous les plans')],
      ['Formation', selectedLabel(options.formations, filters.formation_id, 'Toutes les formations')],
      ['CDC', personLabel(options.cdcs, filters.cdc_id, 'Tous')],
      ['Animateur', personLabel(options.animateurs, filters.animateur_id, 'Tous')],
      ['Responsable formation', personLabel(options.responsables_formation, filters.responsable_formation_id, 'Tous')],
      ['Statut', statusLabel(filters.statut) || 'Tous'],
      ['Periode', `${filters.date_from || 'Debut'} - ${filters.date_to || 'Fin'}`],
    ];
    const summaryRows = [
      ['Sessions analysées', reportSummary.sessions],
      ['Plans concernés', reportSummary.plans],
      ['Formations distinctes', reportSummary.formations],
      ['Participants attendus', reportSummary.participants],
      ['Absences constatées', reportSummary.absences],
      ['Taux d’absence', `${reportSummary.absenceRate}%`],
      ['Documents liés', reportSummary.documents],
      ['Évaluations reçues', reportSummary.evaluations],
    ];
    const insightRows = [
      reportSummary.sessions
        ? `Le rapport couvre ${reportSummary.sessions} session(s), ${reportSummary.plans} plan(s) et ${reportSummary.formations} formation(s).`
        : 'Aucune session ne correspond aux filtres sélectionnés.',
      reportSummary.absenceRate > 20
        ? `Le taux d’absence est élevé (${reportSummary.absenceRate}%). Une action de suivi est recommandée.`
        : `Le taux d’absence reste maîtrisé (${reportSummary.absenceRate}%).`,
      reportSummary.documents < reportSummary.sessions
        ? 'Certaines sessions ne disposent pas encore de documents associés.'
        : 'La couverture documentaire est cohérente avec le volume de sessions.',
      reportSummary.evaluations < reportSummary.participants
        ? 'Toutes les évaluations attendues ne sont pas encore enregistrées.'
        : 'Les évaluations couvrent l’ensemble des participants déclarés.',
    ];
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"><style>
        body{font-family:Inter,Arial,sans-serif;background:#ffffff;color:#172033;}
        table{border-collapse:collapse;width:100%;}
        th{background:#2563eb;color:#ffffff;font-weight:800;text-align:left;border:1px solid #1d4ed8;padding:9px;font-size:12px;}
        td{border:1px solid #dbe3f0;padding:8px;vertical-align:top;font-size:12px;}
        .cover{background:#ffffff;border:0;}
        .brand{background:#eef2ff;color:#4f46e5;font-weight:900;font-size:11px;letter-spacing:2px;text-transform:uppercase;border:0;padding:10px 14px;}
        .title{background:#ffffff;color:#111827;font-size:26px;font-weight:900;padding:16px 14px;border:0;border-bottom:3px solid #2563eb;}
        .subtitle{background:#ffffff;color:#64748b;font-size:12px;padding:8px 14px;border:0;}
        .section{background:#f5f7ff;color:#4c1d95;font-weight:900;font-size:14px;border:1px solid #c7d2fe;padding:10px;}
        .metric-label{background:#ffffff;color:#64748b;font-weight:800;border:1px solid #c7d2fe;text-transform:uppercase;font-size:10px;}
        .metric-value{background:#eff6ff;color:#1d4ed8;font-weight:900;text-align:center;border:1px solid #bfdbfe;font-size:16px;}
        .filter-label{background:#f8fafc;color:#475569;font-weight:800;width:220px;}
        .filter-value{background:#ffffff;color:#111827;}
        .insight-index{background:#7c3aed;color:#ffffff;font-weight:900;text-align:center;width:42px;}
        .insight-text{background:#faf5ff;color:#3b0764;font-weight:700;}
        .group{background:#ede9fe;color:#4c1d95;text-align:center;font-weight:900;border:1px solid #c4b5fd;}
        .status-planifiee{background:#dbeafe;color:#1e40af;font-weight:800;}
        .status-en_cours{background:#dcfce7;color:#166534;font-weight:800;}
        .status-terminee{background:#f1f5f9;color:#475569;font-weight:800;}
        .status-annulee{background:#fee2e2;color:#991b1b;font-weight:800;}
        .danger{background:#fee2e2;color:#991b1b;font-weight:900;}
        .ok{background:#ecfdf5;color:#047857;font-weight:900;}
        .empty{background:#f8fafc;color:#94a3b8;}
        .number{text-align:center;font-weight:800;}
      </style></head><body>
      <table>
        <tr><td colspan="${colSpan}" class="brand">OFPPT FORMATION · RAPPORT OPÉRATIONNEL</td></tr>
        <tr><td colspan="${colSpan}" class="title">${escapeHtml(title)}</td></tr>
        <tr><td colspan="${colSpan}" class="subtitle">Généré le ${escapeHtml(excelDate())} · Responsable: ${escapeHtml(user?.prenom || '')} ${escapeHtml(user?.nom || '')} · Rôle: ${escapeHtml(roleLabels[user?.role] || user?.role || '-')}</td></tr>
        <tr><td colspan="${colSpan}"></td></tr>
        <tr><td colspan="${colSpan}" class="section">1. Synthèse exécutive</td></tr>
        <tr>${summaryRows.map(([label]) => `<td class="metric-label">${escapeHtml(label)}</td>`).join('')}</tr>
        <tr>${summaryRows.map(([,value]) => `<td class="metric-value">${escapeHtml(value)}</td>`).join('')}</tr>
        <tr><td colspan="${colSpan}"></td></tr>
        <tr><td colspan="${colSpan}" class="section">2. Lecture logique du rapport</td></tr>
        ${insightRows.map((insight, index) => `<tr><td class="insight-index">${index + 1}</td><td colspan="${colSpan - 1}" class="insight-text">${escapeHtml(insight)}</td></tr>`).join('')}
        <tr><td colspan="${colSpan}"></td></tr>
        <tr><td colspan="${colSpan}" class="section">3. Filtres appliqués</td></tr>
        ${filterRows.map(([label, value]) => `<tr><td class="filter-label">${escapeHtml(label)}</td><td colspan="${colSpan - 1}" class="filter-value">${escapeHtml(value)}</td></tr>`).join('')}
        <tr><td colspan="${colSpan}"></td></tr>
        <tr><td colspan="${colSpan}" class="section">4. Détail opérationnel des sessions</td></tr>
        <tr>
          <td colspan="5" class="group">Identification du plan</td>
          <td colspan="6" class="group">Formation</td>
          <td colspan="3" class="group">Responsables</td>
          <td colspan="6" class="group">Session</td>
          <td colspan="4" class="group">Présence & qualité</td>
          <td colspan="3" class="group">Ressources</td>
          <td colspan="1" class="group">Suivi</td>
        </tr>
        <tr>${reportColumns.map(([,label]) => `<th>${escapeHtml(label)}</th>`).join('')}</tr>
        ${rows.map((row) => `<tr>${reportColumns.map(([key]) => {
          const value = key === 'statut' ? statusLabel(row[key]) : row[key];
          const cls = key === 'statut' ? `status-${row.statut || ''}` : key === 'taux_absence' && Number(row[key]) > 20 ? 'danger number' : key === 'taux_absence' ? 'ok number' : ['nombre_participants','nombre_absences','evaluations','documents','hebergements','annee_plan','session_id'].includes(key) ? 'number' : value ? '' : 'empty';
          return `<td class="${cls}">${escapeHtml(value ?? '-')}</td>`;
        }).join('')}</tr>`).join('')}
      </table></body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport_ofppt_design_${new Date().toISOString().slice(0,10)}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const columns = [
    { key: 'plan', label: 'Plan' },
    { key: 'formation', label: 'Formation' },
    { key: 'theme', label: 'Theme' },
    { key: 'type_session', label: 'Type' },
    { key: 'ville', label: 'Ville', render: (r) => r.ville || '-' },
    { key: 'animateur', label: 'Animateur' },
    { key: 'nombre_participants', label: 'Participants' },
    { key: 'nombre_absences', label: 'Absences' },
    { key: 'taux_absence', label: 'Taux abs.', render: (r) => `${r.taux_absence ?? 0}%` },
    { key: 'documents', label: 'Docs' },
    { key: 'statut', label: 'Statut', render: (r) => <Badge value={r.statut} /> },
    { key: 'date_session', label: 'Date session' },
  ];
  return <div className="report-page"><PageTitle title={title} subtitle="Rapport analytique filtrable des plans, formations, sessions, presences et ressources." />
    {error && <Card className="mb-4 bg-red-50 text-red-700">{error}</Card>}
    <Card className="report-filter-card mb-4"><div className="grid gap-4 md:grid-cols-3">
      <Field label="Plan"><select className={inputClass} value={filters.plan_id} onChange={(e) => update('plan_id', e.target.value)}><option value="">Tous les plans</option>{options.plans.map((p) => <option key={p.id} value={p.id}>{p.titre}</option>)}</select></Field>
      <Field label="Formation"><select className={inputClass} value={filters.formation_id} onChange={(e) => update('formation_id', e.target.value)} disabled={!visibleFormations.length}><option value="">{visibleFormations.length ? 'Toutes les formations' : 'Aucune formation trouvee'}</option>{visibleFormations.map((f) => <option key={f.id} value={f.id}>{f.titre}</option>)}</select></Field>
      <Field label="CDC"><select className={inputClass} value={filters.cdc_id} onChange={(e) => update('cdc_id', e.target.value)}><option value="">Tous</option>{options.cdcs.map((u) => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}</select></Field>
      <Field label="Animateur"><select className={inputClass} value={filters.animateur_id} onChange={(e) => update('animateur_id', e.target.value)}><option value="">Tous</option>{options.animateurs.map((u) => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}</select></Field>
      <Field label="Responsable formation"><select className={inputClass} value={filters.responsable_formation_id} onChange={(e) => update('responsable_formation_id', e.target.value)}><option value="">Tous</option>{options.responsables_formation.map((u) => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}</select></Field>
      <Field label="Statut session"><select className={inputClass} value={filters.statut} onChange={(e) => update('statut', e.target.value)}><option value="">Tous</option><option value="planifiee">Planifiee</option><option value="en_cours">En cours</option><option value="terminee">Terminee</option><option value="annulee">Annulee</option></select></Field>
      <DateRangePicker className="md:col-span-2" label="Periode du rapport" startDate={filters.date_from} endDate={filters.date_to} onChange={({ startDate, endDate }) => setFilters((current) => ({ ...current, date_from: startDate, date_to: endDate }))} />
      <div className="flex flex-wrap items-end gap-2"><Button disabled={loading} onClick={load}>{loading ? 'Chargement...' : 'Generer'}</Button><Button type="button" variant="secondary" onClick={exportDesignedExcel} disabled={!rows.length}>Exporter Excel design</Button></div>
    </div></Card>
    <div className="report-summary-grid">
      <Card><span>Sessions</span><strong>{reportSummary.sessions}</strong></Card>
      <Card><span>Participants</span><strong>{reportSummary.participants}</strong></Card>
      <Card><span>Absences</span><strong>{reportSummary.absences}</strong><small>{reportSummary.absenceRate}%</small></Card>
      <Card><span>Documents</span><strong>{reportSummary.documents}</strong></Card>
      <Card><span>Evaluations</span><strong>{reportSummary.evaluations}</strong></Card>
    </div>
    <Table columns={columns} rows={rows} />
  </div>;
}
function chartPoints(series, key, maxValue, width = 720, height = 260, pad = 34) {
  if (!series.length) return [];
  const usableWidth = width - pad * 2;
  const usableHeight = height - pad * 2;
  return series.map((row, index) => {
    const x = series.length === 1 ? width / 2 : pad + (index * usableWidth) / (series.length - 1);
    const y = height - pad - (Number(row[key] || 0) / maxValue) * usableHeight;
    return { x, y, value: Number(row[key] || 0), date: row.date };
  });
}

function pathFromPoints(points) {
  if (!points.length) return '';
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
}

function areaFromPoints(points, width = 720, height = 260, pad = 34) {
  if (!points.length) return '';
  return `${pathFromPoints(points)} L ${points[points.length - 1].x.toFixed(2)} ${height - pad} L ${points[0].x.toFixed(2)} ${height - pad} Z`;
}

function MiniMetric({ label, value, tone = 'orange' }) {
  const colors = tone === 'cyan' ? 'from-cyan-400 to-teal-300' : 'from-orange-400 to-amber-300';
  return <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
    <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
    <p className={`mt-2 bg-gradient-to-r ${colors} bg-clip-text text-4xl font-black text-transparent`}>{value ?? 0}</p>
  </div>;
}

function DrDateChart({ data }) {
  const series = data.series || [];
  const maxValue = Math.max(1, data.max_daily_value || 1);
  const sessions = chartPoints(series, 'sessions', maxValue);
  const absences = chartPoints(series, 'absences', maxValue);

  return <Card className="overflow-hidden bg-[#07161b] p-0 text-white shadow-2xl shadow-slate-300/80">
    <div className="grid gap-0 lg:grid-cols-[1fr_320px]">
      <div className="p-6">
        <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-orange-300">Analyse regionale</p>
            <h2 className="mt-2 text-3xl font-black">Sessions & absences par date</h2>
            <p className="text-sm text-slate-400">Region: {data.region || '-'}</p>
          </div>
          <div className="rounded-full border border-orange-400/30 bg-orange-400/10 px-4 py-2 text-sm font-black text-orange-200">
            {data.date_from} - {data.date_to}
          </div>
        </div>

        <svg viewBox="0 0 720 260" className="h-[300px] w-full">
          <defs>
            <linearGradient id="sessionArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="absenceArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.38" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.02" />
            </linearGradient>
            <filter id="glowOrange">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {[0, 1, 2, 3, 4, 5].map((i) => <line key={i} x1={34 + i * 130} x2={34 + i * 130} y1="22" y2="226" stroke="#21343b" strokeWidth="1" />)}
          {[0, 1, 2, 3].map((i) => <line key={i} x1="34" x2="686" y1={34 + i * 55} y2={34 + i * 55} stroke="#16272e" strokeWidth="1" />)}
          <path d={areaFromPoints(absences)} fill="url(#absenceArea)" />
          <path d={areaFromPoints(sessions)} fill="url(#sessionArea)" />
          <path d={pathFromPoints(absences)} fill="none" stroke="#22d3ee" strokeWidth="3" opacity="0.75" />
          <path d={pathFromPoints(sessions)} fill="none" stroke="#fb923c" strokeWidth="4" filter="url(#glowOrange)" />
          {sessions.map((point, index) => <g key={point.date}>
            <circle cx={point.x} cy={point.y} r="5" fill="#fb923c" />
            <text x={point.x} y="248" textAnchor="middle" fontSize="12" fill="#94a3b8">{series[index]?.date?.slice(5)}</text>
          </g>)}
          {absences.map((point) => <circle key={`a-${point.date}`} cx={point.x} cy={point.y} r="4" fill="#22d3ee" />)}
        </svg>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="flex items-center gap-2 text-sm text-slate-300"><span className="h-3 w-8 rounded-full bg-orange-400 shadow-lg shadow-orange-500/50" /> Sessions actives par jour</div>
          <div className="flex items-center gap-2 text-sm text-slate-300"><span className="h-3 w-8 rounded-full bg-cyan-400 shadow-lg shadow-cyan-500/40" /> Absences enregistrees par jour</div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-white/[0.03] p-6 lg:border-l lg:border-t-0">
        <div className="grid gap-4">
          <MiniMetric label="Sessions sur la periode" value={data.total_sessions} />
          <MiniMetric label="Absences sur la periode" value={data.total_absences} tone="cyan" />
          <MiniMetric label="Participants region" value={data.participants} />
        </div>
      </div>
    </div>
  </Card>;
}

export function DrStatisticsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [filters, setFilters] = useState({ date_from: firstDay, date_to: today });
  const [data, setData] = useState({ series: [], total_sessions: 0, total_absences: 0, participants: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    try {
      const response = await api.get('/dr/statistiques', { params: filters });
      setData(response.data);
    } catch (err) {
      setError(responseError(err, 'Chargement des statistiques impossible.'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);
  return <><PageTitle title="Statistiques DR" subtitle="Choisissez une periode pour afficher le nombre de sessions et d'absences dans votre region."/>
    {error&&<Card className="mb-4 bg-red-50 text-red-700">{error}</Card>}
    <Card className="mb-5"><div className="grid gap-4 md:grid-cols-3">
      <DateRangePicker className="md:col-span-2" label="Periode d'analyse" startDate={filters.date_from} endDate={filters.date_to} onChange={({ startDate, endDate }) => setFilters({ ...filters, date_from: startDate, date_to: endDate })} />
      <div className="flex items-end"><Button disabled={loading} onClick={load}>{loading?'Chargement...':'Afficher statistiques'}</Button></div>
    </div></Card>
    <DrDateChart data={data}/>
    <Card className="mt-5">
      <h3 className="mb-4 text-xl font-black text-[#08235a]">Detail par jour</h3>
      <Table columns={[{key:'date',label:'Date'},{key:'sessions',label:'Sessions'},{key:'absences',label:'Absences'}]} rows={(data.series||[]).map((row,index)=>({...row,id:row.date||index}))}/>
    </Card>
  </>;
}
export const planColumns=[{key:'titre',label:'Titre'},{key:'annee',label:'Annee'},{key:'statut',label:'Statut',render:r=><Badge value={r.statut}/>}];
export const sessionColumns=[{key:'formation',label:'Formation',render:r=>r.formation?.titre||r.formation_id},{key:'ville',label:'Ville',render:r=>r.ville||'-'},{key:'region',label:'Region',render:r=>r.region||'-'},{key:'date_session',label:'Date session',render:r=>r.date_session},{key:'type_session',label:'Type'},{key:'statut',label:'Statut',render:r=><Badge value={r.statut}/>}];
export const absenceColumns=[{key:'session',label:'Session',render:r=>r.session?.formation?.titre||r.session_formation_id},{key:'participant',label:'Participant',render:r=>r.participant?.nom_complet||r.participant_id},{key:'date_absence',label:'Date'},{key:'statut',label:'Statut'}];
export const documentColumns=[{key:'titre',label:'Titre'},{key:'type',label:'Type'},{key:'file_path',label:'Fichier'}];
export const participantColumns=[{key:'nom_complet',label:'Participant'},{key:'email',label:'Email'},{key:'statut',label:'Statut',render:r=><Badge value={r.statut}/>}];


