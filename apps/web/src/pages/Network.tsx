import { useState, useEffect, useRef } from 'react';
import { Globe, ShieldCheck, Lightning, ArrowRight, Clock, WifiHigh, Database, ChartLineUp } from '@phosphor-icons/react';
import './Network.css';

/* ─── Data ──────────────────────────────────────────────────────────── */

const NODES = [
  { id: 1, region: 'US East', city: 'Virginia', status: 'active', latency: 12, storage: 2.4, x: 22, y: 35, connections: [2, 3, 5] },
  { id: 2, region: 'US West', city: 'Oregon', status: 'active', latency: 18, storage: 2.1, x: 12, y: 32, connections: [1, 4] },
  { id: 3, region: 'EU West', city: 'London', status: 'active', latency: 24, storage: 1.9, x: 45, y: 28, connections: [1, 4, 6] },
  { id: 4, region: 'EU Central', city: 'Frankfurt', status: 'active', latency: 22, storage: 2.0, x: 50, y: 30, connections: [3, 6] },
  { id: 5, region: 'Asia Pacific', city: 'Tokyo', status: 'active', latency: 45, storage: 1.8, x: 82, y: 32, connections: [6, 1] },
  { id: 6, region: 'Asia Pacific', city: 'Singapore', status: 'active', latency: 38, storage: 1.7, x: 75, y: 45, connections: [5, 3, 4] },
  { id: 7, region: 'South America', city: 'São Paulo', status: 'active', latency: 52, storage: 1.2, x: 28, y: 58, connections: [1, 2] },
  { id: 8, region: 'Oceania', city: 'Sydney', status: 'syncing', latency: 68, storage: 0.9, x: 85, y: 62, connections: [5, 6] },
];

const METRICS = [
  { label: 'Active Nodes', value: '16', icon: <Globe size={16} />, trend: '+2 this month' },
  { label: 'Total Storage', value: '32.4 TB', icon: <Database size={16} />, trend: '+1.2 TB' },
  { label: 'Transactions', value: '1.2M', icon: <ChartLineUp size={16} />, trend: '+12.4%' },
  { label: 'Uptime', value: '99.98%', icon: <Lightning size={16} />, trend: '30 day avg' },
];

const EVENTS = [
  { type: 'sync', node: 'Sydney', detail: 'Syncing dataset index...', time: 'now' },
  { type: 'verify', node: 'Virginia', detail: 'Verified 847 records', time: '12s ago' },
  { type: 'heartbeat', node: 'London', detail: 'Health check passed', time: '18s ago' },
  { type: 'transfer', node: 'Tokyo', detail: 'Received 2.4 GB from Oregon', time: '24s ago' },
  { type: 'verify', node: 'Frankfurt', detail: 'Verified 1,204 records', time: '30s ago' },
  { type: 'heartbeat', node: 'Singapore', detail: 'Health check passed', time: '36s ago' },
];

/* ─── Live Network Map ──────────────────────────────────────────────── */

function NetworkMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * 2;
      canvas.height = h * 2;
      ctx.scale(2, 2);
    };
    resize();
    window.addEventListener('resize', resize);

    let time = 0;

    const draw = () => {
      time += 0.008;
      ctx.clearRect(0, 0, w, h);

      const px = (pct: number) => (pct / 100) * w;
      const py = (pct: number) => (pct / 100) * h;

      // Grid dots
      ctx.fillStyle = 'rgba(255,255,255,0.025)';
      for (let gx = 0; gx < w; gx += 30) {
        for (let gy = 0; gy < h; gy += 30) {
          ctx.beginPath();
          ctx.arc(gx, gy, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Connections with flowing particles
      NODES.forEach((node) => {
        node.connections.forEach((targetId) => {
          const target = NODES.find((n) => n.id === targetId);
          if (!target) return;
          const nx = px(node.x);
          const ny = py(node.y);
          const tx = px(target.x);
          const ty = py(target.y);

          // Connection line
          const grad = ctx.createLinearGradient(nx, ny, tx, ty);
          grad.addColorStop(0, 'rgba(255,0,127,0.15)');
          grad.addColorStop(0.5, 'rgba(139,92,246,0.1)');
          grad.addColorStop(1, 'rgba(0,229,255,0.15)');
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(nx, ny);
          ctx.lineTo(tx, ty);
          ctx.stroke();

          // Flowing particle
          const t = ((time * 0.5 + node.id * 0.3 + targetId * 0.2) % 1);
          const px2 = nx + (tx - nx) * t;
          const py2 = ny + (ty - ny) * t;
          ctx.fillStyle = 'rgba(255,0,127,0.6)';
          ctx.beginPath();
          ctx.arc(px2, py2, 1.5, 0, Math.PI * 2);
          ctx.fill();

          // Trail
          const trailLen = 0.08;
          const t2 = Math.max(0, t - trailLen);
          const trailX = nx + (tx - nx) * t2;
          const trailY = ny + (ty - ny) * t2;
          const trailGrad = ctx.createLinearGradient(trailX, trailY, px2, py2);
          trailGrad.addColorStop(0, 'rgba(255,0,127,0)');
          trailGrad.addColorStop(1, 'rgba(255,0,127,0.4)');
          ctx.strokeStyle = trailGrad;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(trailX, trailY);
          ctx.lineTo(px2, py2);
          ctx.stroke();
        });
      });

      // Nodes
      NODES.forEach((node) => {
        const nx = px(node.x);
        const ny = py(node.y);
        const isHovered = hoveredNode === node.id;
        const pulse = Math.sin(time * 3 + node.id) * 0.5 + 0.5;
        const baseR = isHovered ? 8 : 5;
        const glowR = baseR + 12 + pulse * 6;

        // Glow
        const glowGrad = ctx.createRadialGradient(nx, ny, 0, nx, ny, glowR);
        if (node.status === 'syncing') {
          glowGrad.addColorStop(0, 'rgba(251,191,36,0.25)');
          glowGrad.addColorStop(1, 'rgba(251,191,36,0)');
        } else {
          glowGrad.addColorStop(0, 'rgba(255,0,127,0.25)');
          glowGrad.addColorStop(1, 'rgba(255,0,127,0)');
        }
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(nx, ny, glowR, 0, Math.PI * 2);
        ctx.fill();

        // Ring
        ctx.strokeStyle = node.status === 'syncing' ? 'rgba(251,191,36,0.4)' : 'rgba(255,0,127,0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(nx, ny, baseR + 3 + pulse * 2, 0, Math.PI * 2);
        ctx.stroke();

        // Core
        const coreGrad = ctx.createRadialGradient(nx, ny, 0, nx, ny, baseR);
        if (node.status === 'syncing') {
          coreGrad.addColorStop(0, '#fbbf24');
          coreGrad.addColorStop(1, '#f59e0b');
        } else {
          coreGrad.addColorStop(0, '#f55ab2');
          coreGrad.addColorStop(1, '#ff007f');
        }
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(nx, ny, baseR, 0, Math.PI * 2);
        ctx.fill();

        // Label
        if (isHovered) {
          ctx.fillStyle = 'rgba(9,7,19,0.85)';
          const labelW = ctx.measureText(node.city).width + 16;
          const labelH = 22;
          const lx = nx - labelW / 2;
          const ly = ny - baseR - 30;
          ctx.beginPath();
          ctx.roundRect(lx, ly, labelW, labelH, 6);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,0,127,0.3)';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = '#f6f6f8';
          ctx.font = '600 11px "Space Grotesk", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(node.city, nx, ly + 14);
        }
      });

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [hoveredNode]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * 100;
    const my = ((e.clientY - rect.top) / rect.height) * 100;
    const found = NODES.find((n) => Math.hypot(n.x - mx, n.y - my) < 5);
    setHoveredNode(found?.id ?? null);
  };

  return (
    <div className="net-map-wrap">
      <canvas ref={canvasRef} className="net-map-canvas" onMouseMove={handleMouseMove} onMouseLeave={() => setHoveredNode(null)} />
      <div className="net-map-legend">
        <span className="net-map-legend-item"><span className="net-dot active" /> Active</span>
        <span className="net-map-legend-item"><span className="net-dot syncing" /> Syncing</span>
        <span className="net-map-legend-item"><span className="net-dot-line" /> Data Flow</span>
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */

export default function NetworkPage() {
  const [liveTime, setLiveTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="net-page">
      {/* ─── Hero ──────────────────────────────────────────────────── */}
      <section className="net-hero">
        <div className="net-hero-glow" />
        <div className="net-hero-grid" />
        <div className="container net-hero-inner">
          <div className="net-hero-badge">
            <Lightning size={12} />
            <span>Live</span>
            <span className="net-hero-live-dot" />
          </div>
          <h1 className="net-hero-title">
            Network<span className="net-hero-sparkle">&#10022;</span>
          </h1>
          <p className="net-hero-sub">
            Decentralized storage and verification across 16 nodes worldwide.
          </p>
        </div>
      </section>

      {/* ─── Metrics ───────────────────────────────────────────────── */}
      <section className="net-section">
        <div className="container">
          <div className="net-metrics-grid">
            {METRICS.map((m) => (
              <div key={m.label} className="net-metric-card">
                <div className="net-metric-icon">{m.icon}</div>
                <span className="net-metric-value">{m.value}</span>
                <span className="net-metric-label">{m.label}</span>
                <span className="net-metric-trend">{m.trend}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Live Map ──────────────────────────────────────────────── */}
      <section className="net-section">
        <div className="container">
          <div className="net-map-card">
            <div className="net-map-header">
              <div className="net-map-header-left">
                <Globe size={16} className="net-map-header-icon" />
                <span className="net-map-header-title">Network Topology</span>
              </div>
              <div className="net-map-header-right">
                <Clock size={12} />
                <span>{liveTime.toLocaleTimeString()} UTC</span>
              </div>
            </div>
            <NetworkMap />
          </div>
        </div>
      </section>

      {/* ─── Node Grid ─────────────────────────────────────────────── */}
      <section className="net-section">
        <div className="container">
          <div className="section-label"><WifiHigh size={13} /> Storage Nodes</div>
          <h2 className="net-section-title">All nodes</h2>
          <div className="net-nodes-grid">
            {NODES.map((n) => (
              <div key={n.id} className={`net-node-card ${n.status}`}>
                <div className="net-node-top">
                  <div className="net-node-status">
                    <span className={`net-node-dot ${n.status}`} />
                    <span className="net-node-status-text">{n.status}</span>
                  </div>
                  <span className="net-node-region">{n.region}</span>
                </div>
                <span className="net-node-city">{n.city}</span>
                <div className="net-node-bar-wrap">
                  <div className="net-node-bar" style={{ width: `${(n.storage / 3) * 100}%` }} />
                </div>
                <div className="net-node-footer">
                  <span><Lightning size={10} /> {n.latency}ms</span>
                  <span><Database size={10} /> {n.storage} TB</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Activity Feed ─────────────────────────────────────────── */}
      <section className="net-section">
        <div className="container">
          <div className="section-label"><Lightning size={13} /> Activity Feed</div>
          <h2 className="net-section-title">Live events</h2>
          <div className="net-events-list">
            {EVENTS.map((ev, i) => (
              <div key={i} className="net-event-row">
                <span className={`net-event-dot ${ev.type}`} />
                <div className="net-event-info">
                  <span className="net-event-node">{ev.node}</span>
                  <span className="net-event-detail">{ev.detail}</span>
                </div>
                <span className="net-event-time">{ev.time}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────────────── */}
      <section className="net-section">
        <div className="container">
          <div className="net-cta-card">
            <h2 className="net-cta-title">Run a Storage Node</h2>
            <p className="net-cta-desc">Help decentralize AI data infrastructure. Earn rewards for storing and verifying datasets.</p>
            <div className="net-cta-actions">
              <a href="#" className="btn btn-primary"><ShieldCheck size={14} /> Node Guide</a>
              <a href="#" className="btn btn-ghost">Documentation <ArrowRight size={13} /></a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
