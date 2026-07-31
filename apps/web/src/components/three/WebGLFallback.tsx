export default function WebGLFallback() {
  return (
    <div className="home-3d-fallback">
      <div className="home-3d-fallback-grid" />
      <div className="home-3d-fallback-nodes">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="home-3d-fallback-node"
            style={{
              '--delay': `${i * 0.8}s`,
              '--x': `${15 + Math.cos(i * 1.05) * 35 + 35}%`,
              '--y': `${15 + Math.sin(i * 1.05) * 35 + 35}%`,
            } as React.CSSProperties}
          />
        ))}
      </div>
      <span className="home-3d-fallback-label">3D visualization unavailable</span>
    </div>
  );
}
