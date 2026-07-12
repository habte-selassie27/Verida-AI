import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface StatCard {
  label: string;
  value: string;
  color: string;
  icon: string;
}

const CARDS: StatCard[] = [
  { label: 'Active Datasets', value: '15,284', color: 'var(--neon-teal)', icon: '◆' },
  { label: 'Shelby Nodes', value: '16', color: 'var(--neon-blue)', icon: '●' },
  { label: 'Proven Uploads', value: '2.4M', color: 'var(--neon-purple)', icon: '▲' },
  { label: 'AI Requests Today', value: '94,201', color: 'var(--neon-green)', icon: '✦' },
];

function CountUpValue({ target }: { target: string }) {
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    const numericPart = target.replace(/[^0-9.]/g, '');
    const suffix = target.replace(/[0-9.,]/g, '');
    const targetNum = parseFloat(numericPart.replace(/,/g, ''));
    const duration = 2000;
    const start = performance.now();

    function animate(now: number) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(targetNum * eased);

      if (targetNum >= 1000) {
        setDisplay(current.toLocaleString() + suffix);
      } else {
        setDisplay(current + suffix);
      }

      if (t < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }, [target]);

  return <>{display}</>;
}

export default function FloatingCards() {
  return (
    <div className="floating-cards-grid">
      {CARDS.map((card, i) => (
        <motion.div
          key={card.label}
          className="floating-card-centered"
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{
            delay: 0.8 + i * 0.15,
            duration: 0.6,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <span className="floating-card-icon" style={{ color: card.color }}>{card.icon}</span>
          <span className="floating-card-value" style={{ color: card.color }}>
            <CountUpValue target={card.value} />
          </span>
          <span className="floating-card-label">{card.label}</span>
        </motion.div>
      ))}
    </div>
  );
}
