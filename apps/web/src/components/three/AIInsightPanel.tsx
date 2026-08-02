import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Metric {
  label: string;
  value: number;
  display: string;
  color: string;
}

const METRICS: Metric[] = [
  { label: 'Quality Score', value: 0.97, display: '97%', color: 'var(--pink)' },
  { label: 'Duplicates', value: 0.02, display: '2%', color: 'var(--cyan)' },
  { label: 'Bias', value: 0.15, display: 'Low', color: 'var(--success-400)' },
  { label: 'Embeddings', value: 1.0, display: 'Ready', color: 'var(--purple)' },
];

function AnimatedBar({ value, color, delay }: { value: number; color: string; delay: number }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(value * 100), 1200 + delay * 300);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return (
    <div className="ai-bar-track">
      <motion.div
        className="ai-bar-fill"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${width}%` }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}

export default function AIInsightPanel() {
  return (
    <motion.div
      className="ai-insight-panel"
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="ai-insight-header">
        <span className="ai-insight-dot" />
        <span className="ai-insight-title">AI Analysis</span>
      </div>
      <div className="ai-insight-metrics">
        {METRICS.map((m, i) => (
          <div key={m.label} className="ai-metric">
            <div className="ai-metric-row">
              <span className="ai-metric-label">{m.label}</span>
              <span className="ai-metric-value" style={{ color: m.color }}>{m.display}</span>
            </div>
            <AnimatedBar value={m.value} color={m.color} delay={i} />
          </div>
        ))}
      </div>
    </motion.div>
  );
}
