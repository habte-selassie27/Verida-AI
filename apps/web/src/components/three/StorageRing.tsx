import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function StorageRing() {
  const [progress, setProgress] = useState(0);
  const percentage = 62;
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setProgress(percentage), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      className="storage-ring-container"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <svg viewBox="0 0 100 100" className="storage-ring-svg">
        {/* Background ring */}
        <circle
          cx="50" cy="50" r="40"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="6"
        />
        {/* Progress ring */}
        <circle
          cx="50" cy="50" r="40"
          fill="none"
          stroke="url(#storageGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
        <defs>
          <linearGradient id="storageGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--neon-teal)" />
            <stop offset="100%" stopColor="var(--neon-blue)" />
          </linearGradient>
        </defs>
        {/* Center text */}
        <text x="50" y="46" textAnchor="middle" className="storage-ring-pct">
          {percentage}%
        </text>
        <text x="50" y="58" textAnchor="middle" className="storage-ring-label">
          Network Used
        </text>
      </svg>
    </motion.div>
  );
}
