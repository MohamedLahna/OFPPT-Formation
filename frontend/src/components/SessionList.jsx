import { motion } from 'framer-motion';

const sessions = [
  { name: 'Laravel API avancé', date: '20 mai 2026', trainees: 24, tone: 'gold' },
  { name: 'React JS', date: '22 mai 2026', trainees: 18, tone: 'blue' },
  { name: 'Cybersécurité', date: '25 mai 2026', trainees: 16, tone: 'green' },
  { name: 'Pédagogie active', date: '28 mai 2026', trainees: 31, tone: 'purple' },
  { name: 'MySQL avancé', date: '31 mai 2026', trainees: 12, tone: 'teal' },
];

export default function SessionList() {
  return (
    <motion.section className="panel-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.18, duration: 0.3 }}>
      <div className="panel-title">
        <h2>Sessions de formation</h2>
        <button type="button">Planifier</button>
      </div>
      <div className="session-stack">
        {sessions.map((session, index) => (
          <motion.div className="session-row" key={session.name} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.26 + index * 0.05 }}>
            <span className={`session-dot ${session.tone}`} />
            <div><strong>{session.name}</strong><p>{session.date}</p></div>
            <span className="trainee-badge">{session.trainees} participants</span>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
