import { motion } from 'framer-motion';

const users = [
  { initials: 'AS', name: 'Amine Salmi', role: 'Administrateur', date: '15 mai 2026', status: 'Actif', tone: 'blue' },
  { initials: 'FB', name: 'Fatima Berrada', role: 'Responsable formation', date: '14 mai 2026', status: 'Actif', tone: 'gold' },
  { initials: 'YT', name: 'Youssef Tazi', role: 'Formateur', date: '12 mai 2026', status: 'Actif', tone: 'green' },
  { initials: 'NR', name: 'Nora Rifi', role: 'Stagiaire', date: '10 mai 2026', status: 'En attente', tone: 'orange' },
];

export default function UserList() {
  return (
    <motion.section className="panel-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05, duration: 0.3 }}>
      <div className="panel-title">
        <h2>Utilisateurs récents</h2>
        <button type="button">Voir tout</button>
      </div>
      <div className="list-stack">
        {users.map((user, index) => (
          <motion.div className="user-row" key={user.name} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.16 + index * 0.05 }}>
            <span className={`list-avatar ${user.tone}`}>{user.initials}</span>
            <div><strong>{user.name}</strong><p>{user.role}</p></div>
            <time>{user.date}</time>
            <span className={`status-chip ${user.status === 'Actif' ? 'active' : 'pending'}`}>{user.status}</span>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
