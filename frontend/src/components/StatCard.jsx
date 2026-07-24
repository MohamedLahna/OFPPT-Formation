import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';

function useCountUp(target) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame;
    const start = performance.now();
    const duration = 1150;
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return value;
}

export default function StatCard({ icon: Icon, label, value, trend, tone, direction = 'up', progress = 78, delay = 0 }) {
  const count = useCountUp(value);
  const TrendIcon = useMemo(() => {
    if (direction === 'down') return ArrowDownRight;
    if (direction === 'neutral') return ArrowRight;
    return ArrowUpRight;
  }, [direction]);

  return (
    <motion.article
      className={`stat-card tone-${tone}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
    >
      <span className="stat-glow" />
      <div className="stat-head">
        <div className="stat-icon">
          <Icon size={24} />
        </div>
        <span className={`trend ${direction}`}>
          <TrendIcon size={14} />
          {trend}
        </span>
      </div>
      <strong className="stat-number">{count}</strong>
      <p>{label}</p>
      <div className="stat-progress">
        <motion.span
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ delay: delay + 0.2, duration: 1.1, ease: 'easeOut' }}
        />
      </div>
    </motion.article>
  );
}
