import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { roleLabels } from '../../utils/roles';

const actionWords = ['Planifier', 'Organiser', 'Suivre', 'Analyser', 'Améliorer'];

const roleMessages = {
  administrateur: 'Surveillez les comptes, les accès et les paramètres système.',
  responsable_cdc: 'Planifiez les besoins et structurez vos plans de formation.',
  responsable_formation: 'Validez les plans, préparez les sessions et suivez les présences.',
  formateur_animateur: 'Consultez vos sessions et validez les présences des participants.',
  formateur_participant: 'Consultez vos sessions, documents et QR codes.',
  responsable_dr: 'Suivez les indicateurs, les sessions et les statistiques globales.',
};

function getTimeGreeting(hour) {
  if (hour >= 5 && hour < 12) {
    return {
      title: 'Bonjour',
      icon: '👋',
      subtitle: 'Prêt à organiser vos formations aujourd’hui ?',
    };
  }

  if (hour >= 12 && hour < 18) {
    return {
      title: 'Bon après-midi',
      icon: '☀️',
      subtitle: 'Continuez à suivre vos activités de formation.',
    };
  }

  if (hour >= 18 && hour < 22) {
    return {
      title: 'Bonsoir',
      icon: '🌙',
      subtitle: 'Voici un aperçu de votre journée.',
    };
  }

  return {
    title: 'Bonne soirée',
    icon: '✨',
    subtitle: 'Gardez le contrôle sur vos formations.',
  };
}

export default function SmartGreetingBar({ user, action }) {
  const [wordIndex, setWordIndex] = useState(0);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const wordTimer = setInterval(() => {
      setWordIndex((current) => (current + 1) % actionWords.length);
    }, 1800);

    const clockTimer = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => {
      clearInterval(wordTimer);
      clearInterval(clockTimer);
    };
  }, []);

  const greeting = useMemo(() => getTimeGreeting(now.getHours()), [now]);
  const firstName = user?.prenom?.trim() || 'Bienvenue';
  const displayName = user?.prenom?.trim() ? `${greeting.title} ${firstName}` : firstName;
  const displayNameChars = useMemo(() => Array.from(displayName), [displayName]);
  const roleLabel = roleLabels[user?.role] || 'OFPPT Formation';
  const roleMessage = roleMessages[user?.role] || 'Gardez une vision claire sur vos activités de formation.';
  const dateLabel = now.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <motion.section
      className="smart-greeting-bar"
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      aria-label="Message de bienvenue intelligent"
    >
      <motion.div
        className="smart-greeting-glow"
        animate={{ x: ['-10%', '8%', '-6%'], y: ['0%', '7%', '0%'] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      {action && <div className="smart-greeting-action">{action}</div>}

      <div className="smart-greeting-main">
        <motion.p
          className="eyebrow"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
        >
          Tableau de bord vivant
        </motion.p>

        <motion.h2
          aria-label={displayName}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.16 }}
        >
          <span aria-hidden="true">
            {displayNameChars.map((character, index) => (
              <motion.span
                key={`${character}-${index}`}
                style={{ display: 'inline-block', whiteSpace: 'pre' }}
                initial={{ opacity: 0, x: -8, filter: 'blur(6px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                transition={{
                  duration: 0.3,
                  delay: 0.2 + index * 0.035,
                  ease: 'easeOut',
                }}
              >
                {character === ' ' ? '\u00A0' : character}
              </motion.span>
            ))}
          </span>{' '}
          <motion.span
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.28,
              delay: 0.28 + displayNameChars.length * 0.035,
              ease: 'easeOut',
            }}
          >
            {greeting.icon}
          </motion.span>
        </motion.h2>

        <motion.p
          className="smart-greeting-subtitle"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: 0.24 }}
        >
          {greeting.subtitle}
        </motion.p>

        <motion.div
          className="smart-greeting-sentence"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: 0.32 }}
        >
          <span>Aujourd’hui, vous pouvez</span>
          <span className="smart-greeting-word-wrap" aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.strong
                key={actionWords[wordIndex]}
                initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -12, filter: 'blur(6px)' }}
                transition={{ duration: 0.32, ease: 'easeOut' }}
              >
                {actionWords[wordIndex]}
              </motion.strong>
            </AnimatePresence>
          </span>
          <span>vos formations efficacement.</span>
        </motion.div>
      </div>

      <motion.aside
        className="smart-greeting-side"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.34, delay: 0.34 }}
      >
        <div className="smart-greeting-role">{roleLabel}</div>
        <div className="smart-greeting-date">{dateLabel}</div>
        <p>{roleMessage}</p>
      </motion.aside>
    </motion.section>
  );
}
