import { motion } from 'framer-motion';

const veils = [
  {
    className: 'aurora-veil aurora-veil-a',
    initial: { x: '0vw', y: '0vh', rotate: -10, scale: 1.03, opacity: 0.1 },
    animate: {
      x: ['0vw', '-16vw', '-9vw'],
      y: ['0vh', '9vh', '4vh'],
      rotate: [-10, -5, -9],
      scale: [1.03, 1.09, 1.04],
      opacity: [0.09, 0.12, 0.09],
    },
    transition: { duration: 28, ease: 'easeInOut', repeat: Infinity },
  },
  {
    className: 'aurora-veil aurora-veil-b',
    initial: { x: '0vw', y: '0vh', rotate: 12, scale: 1.07, opacity: 0.08 },
    animate: {
      x: ['0vw', '10vw', '4vw'],
      y: ['0vh', '-18vh', '-10vh'],
      rotate: [12, 6, 10],
      scale: [1.07, 1.13, 1.08],
      opacity: [0.07, 0.1, 0.07],
    },
    transition: { duration: 34, ease: 'easeInOut', repeat: Infinity },
  },
  {
    className: 'aurora-veil aurora-veil-c',
    initial: { x: '0vw', y: '0vh', rotate: -5, scale: 1.01, opacity: 0.05 },
    animate: {
      x: ['0vw', '6vw', '-3vw'],
      y: ['0vh', '-4vh', '3vh'],
      rotate: [-5, -2, -6],
      scale: [1.01, 1.12, 1.02],
      opacity: [0.04, 0.08, 0.04],
    },
    transition: { duration: 42, ease: 'easeInOut', repeat: Infinity },
  },
];

export default function GlobalAnimatedBackground() {
  return (
    <div className="global-animated-background fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div className="aurora-base-layer" />
      {veils.map((veil) => (
        <motion.div
          key={veil.className}
          className={veil.className}
          initial={veil.initial}
          animate={veil.animate}
          transition={veil.transition}
        />
      ))}
      <div className="aurora-vignette" />
    </div>
  );
}
