import './ShelbyScene.css';

const NODES = [
  { x: 50, y: 12, size: 'sm', delay: 0 },
  { x: 78, y: 25, size: 'md', delay: 0.3 },
  { x: 85, y: 50, size: 'sm', delay: 0.6 },
  { x: 75, y: 72, size: 'lg', delay: 0.9 },
  { x: 55, y: 85, size: 'sm', delay: 1.2 },
  { x: 35, y: 82, size: 'md', delay: 1.5 },
  { x: 18, y: 68, size: 'sm', delay: 0.4 },
  { x: 12, y: 45, size: 'lg', delay: 0.7 },
  { x: 20, y: 25, size: 'sm', delay: 1.0 },
  { x: 40, y: 15, size: 'md', delay: 1.3 },
  { x: 62, y: 40, size: 'sm', delay: 0.2 },
  { x: 38, y: 55, size: 'lg', delay: 0.5 },
  { x: 50, y: 50, size: 'xl', delay: 0 },
  { x: 68, y: 58, size: 'sm', delay: 0.8 },
  { x: 30, y: 38, size: 'sm', delay: 1.1 },
  { x: 45, y: 68, size: 'md', delay: 1.4 },
];

const CONNECTIONS: [number, number][] = [
  [12, 0], [12, 1], [12, 2], [12, 3], [12, 4], [12, 5],
  [12, 6], [12, 7], [12, 8], [12, 9], [12, 10], [12, 11],
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6],
  [6, 7], [7, 8], [8, 9], [9, 0],
  [10, 1], [10, 3], [11, 5], [11, 7], [14, 8], [14, 9],
  [13, 2], [13, 3], [15, 4], [15, 5],
];

const LABELS = [
  { text: 'AI', x: 50, y: 5, color: 'var(--cyan)' },
  { text: 'Embeddings', x: 88, y: 35, color: 'var(--purple)' },
  { text: 'Quality', x: 8, y: 35, color: 'var(--success-400)' },
  { text: 'Inference', x: 88, y: 65, color: 'var(--pink-lt)' },
  { text: 'Training', x: 8, y: 65, color: 'var(--pink)' },
  { text: 'Verify', x: 50, y: 95, color: 'var(--success-400)' },
];

const PARTICLE_COLORS = [
  'var(--pink)',
  'var(--cyan)',
  'var(--purple)',
  'var(--success-400)',
  'var(--pink-lt)',
];

export default function ShelbyScene() {
  return (
    <div className="css-network">
      <div className="css-network-rotate">
        <svg className="css-network-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--pink)" stopOpacity="0.6" />
              <stop offset="50%" stopColor="var(--purple)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0.6" />
            </linearGradient>
          </defs>

          {/* Depth reference rings */}
          <circle cx="50" cy="50" r="42" className="css-depth-ring" />
          <circle cx="50" cy="50" r="30" className="css-depth-ring" style={{ animationDuration: '50s' }} />
          <circle cx="50" cy="50" r="18" className="css-orbital-ring" />

          {/* Connections */}
          {CONNECTIONS.map(([a, b], i) => {
            const nodeA = NODES[a];
            const nodeB = NODES[b];
            if (!nodeA || !nodeB) return null;
            return (
              <line
                key={`c-${i}`}
                x1={nodeA.x}
                y1={nodeA.y}
                x2={nodeB.x}
                y2={nodeB.y}
                className="css-network-line"
                style={{ animationDelay: `${i * 0.12}s` }}
              />
            );
          })}

          {/* Nodes with glow halos */}
          {NODES.map((node, i) => (
            <g key={`n-${i}`}>
              <circle
                cx={node.x}
                cy={node.y}
                className={`css-network-glow css-network-glow--${node.size}`}
                style={{ animationDelay: `${node.delay}s` }}
              />
              <circle
                cx={node.x}
                cy={node.y}
                className={`css-network-node css-network-node--${node.size}`}
                style={{ animationDelay: `${node.delay}s` }}
              />
            </g>
          ))}

          {/* Data particles */}
          {CONNECTIONS.filter((_, i) => i % 4 === 0).map(([a, b], i) => {
            const nodeA = NODES[a];
            const nodeB = NODES[b];
            if (!nodeA || !nodeB) return null;
            return (
              <circle
                key={`p-${i}`}
                r="0.55"
                className="css-network-particle"
                fill={PARTICLE_COLORS[i % PARTICLE_COLORS.length]}
                style={{
                  offsetPath: `path("M${nodeA.x},${nodeA.y} L${nodeB.x},${nodeB.y}")`,
                  animationDelay: `${i * 0.9}s`,
                }}
              />
            );
          })}

          {/* Pulse rings */}
          <circle cx="50" cy="50" r="18" className="css-pulse-ring" />
          <circle cx="50" cy="50" r="18" className="css-pulse-ring css-pulse-ring--delayed" />
        </svg>

        {/* Floating labels */}
        {LABELS.map((label) => (
          <span
            key={label.text}
            className="css-network-label"
            style={{
              left: `${label.x}%`,
              top: `${label.y}%`,
              color: label.color,
            }}
          >
            {label.text}
          </span>
        ))}
      </div>

      {/* Blockchain anchor */}
      <div className="css-blockchain-anchor">
        <div className="css-blockchain-block" />
        <div className="css-blockchain-block css-blockchain-block--mid" />
        <div className="css-blockchain-block" />
        <span className="css-blockchain-label">Aptos L1</span>
      </div>
    </div>
  );
}
