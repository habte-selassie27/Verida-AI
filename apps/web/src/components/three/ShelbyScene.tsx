import { useRef, useMemo, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sphere, Line, Trail, Billboard, Text } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import SceneErrorBoundary from './SceneErrorBoundary';

// ─── Color Palette ─────────────────────────────────────────────────
const TEAL = '#00F5D4';
const BLUE = '#4CC9F0';
const PURPLE = '#7B61FF';
const GREEN = '#00FF88';
const PINK = '#FF006E';

// ─── Shelby Network Nodes ──────────────────────────────────────────
const NODE_COUNT = 16;
const RADIUS = 3.2;

function generateNodePositions(count: number, radius: number) {
  const positions: [number, number, number][] = [];
  for (let i = 0; i < count; i++) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    positions.push([
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta) * 0.4,
      radius * Math.cos(phi),
    ]);
  }
  return positions;
}

function NetworkNode({
  position,
  index,
  onHover,
}: {
  position: [number, number, number];
  index: number;
  onHover: (idx: number | null) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2 + index * 0.5) * 0.15;
      meshRef.current.scale.setScalar(scale);
    }
    if (glowRef.current) {
      const opacity = 0.15 + Math.sin(state.clock.elapsedTime * 1.5 + index * 0.7) * 0.1;
      glowRef.current.scale.setScalar(2.5 + Math.sin(state.clock.elapsedTime + index) * 0.3);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
    }
  });

  return (
    <group position={position}>
      <Sphere
        ref={meshRef}
        args={[0.08, 16, 16]}
        onPointerEnter={() => onHover(index)}
        onPointerLeave={() => onHover(null)}
      >
        <meshBasicMaterial color={TEAL} />
      </Sphere>
      <Sphere ref={glowRef} args={[0.2, 16, 16]}>
        <meshBasicMaterial color={TEAL} transparent opacity={0.15} />
      </Sphere>
    </group>
  );
}

function NetworkConnections({ positions }: { positions: [number, number, number][] }) {
  const lines = useMemo(() => {
    const result: { start: [number, number, number]; end: [number, number, number] }[] = [];
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dist = new THREE.Vector3(...positions[i]).distanceTo(new THREE.Vector3(...positions[j]));
        if (dist < 3.0) {
          result.push({ start: positions[i], end: positions[j] });
        }
      }
    }
    return result;
  }, [positions]);

  return (
    <>
      {lines.map((line, i) => (
        <Line
          key={i}
          points={[line.start, line.end]}
          color={TEAL}
          lineWidth={0.5}
          transparent
          opacity={0.12}
        />
      ))}
    </>
  );
}

// ─── Data Particles ────────────────────────────────────────────────
function DataParticle({
  startPos,
  endPos,
  delay,
  color,
}: {
  startPos: [number, number, number];
  endPos: [number, number, number];
  delay: number;
  color: string;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const progress = useRef(0);

  useFrame((state) => {
    if (!ref.current) return;
    const t = ((state.clock.elapsedTime + delay) % 4) / 4;
    progress.current = t;

    const start = new THREE.Vector3(...startPos);
    const end = new THREE.Vector3(...endPos);
    const mid = new THREE.Vector3()
      .addVectors(start, end)
      .multiplyScalar(0.5)
      .add(new THREE.Vector3(0, 0.5, 0));

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const point = curve.getPoint(t);
    ref.current.position.copy(point);

    const scale = Math.sin(t * Math.PI) * 0.04 + 0.02;
    ref.current.scale.setScalar(scale);
  });

  return (
    <Sphere ref={ref} args={[1, 8, 8]}>
      <meshBasicMaterial color={color} />
    </Sphere>
  );
}

// ─── Verification Pulse Ring ───────────────────────────────────────
function VerificationPulse() {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ringRef.current) return;
    const t = (state.clock.elapsedTime % 5) / 5;
    const scale = t * 5;
    ringRef.current.scale.setScalar(scale);
    (ringRef.current.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.3;
  });

  return (
    <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.95, 1, 64]} />
      <meshBasicMaterial color={GREEN} transparent opacity={0.3} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ─── Orbiting Ring (AI Analytics) ──────────────────────────────────
function OrbitingRing() {
  const ringRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.1;
      ringRef.current.rotation.x = Math.PI / 3;
    }
  });

  return (
    <group ref={ringRef}>
      <mesh>
        <torusGeometry args={[4.2, 0.005, 8, 128]} />
        <meshBasicMaterial color={PURPLE} transparent opacity={0.25} />
      </mesh>
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * 4.2, Math.sin(angle) * 4.2, 0]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshBasicMaterial color={PURPLE} />
          </mesh>
        );
      })}
    </group>
  );
}

// ─── Floating AI Labels ────────────────────────────────────────────
function AILabels() {
  const labels = [
    { text: 'AI', pos: [0, 3.8, 0] as [number, number, number], color: BLUE },
    { text: 'Embeddings', pos: [3.6, 2, 0] as [number, number, number], color: PURPLE },
    { text: 'Quality', pos: [-3.6, 2, 0] as [number, number, number], color: GREEN },
    { text: 'Inference', pos: [3.6, -2, 0] as [number, number, number], color: PINK },
    { text: 'Training', pos: [-3.6, -2, 0] as [number, number, number], color: TEAL },
    { text: 'Verify', pos: [0, -3.8, 0] as [number, number, number], color: GREEN },
  ];

  return (
    <>
      {labels.map((l) => (
        <Billboard key={l.text} position={l.pos}>
          <Text
            fontSize={0.18}
            color={l.color}
            anchorX="center"
            anchorY="middle"
            font={undefined}
            outlineWidth={0}
          >
            {l.text}
          </Text>
        </Billboard>
      ))}
    </>
  );
}

// ─── Blockchain Anchor (Bottom) ────────────────────────────────────
function BlockchainAnchor() {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
  });

  return (
    <group ref={ref} position={[0, -4, 0]}>
      <mesh>
        <boxGeometry args={[0.3, 0.1, 0.15]} />
        <meshBasicMaterial color={PURPLE} transparent opacity={0.6} />
      </mesh>
      <mesh position={[0.4, 0, 0]}>
        <boxGeometry args={[0.3, 0.1, 0.15]} />
        <meshBasicMaterial color={PURPLE} transparent opacity={0.5} />
      </mesh>
      <mesh position={[-0.4, 0, 0]}>
        <boxGeometry args={[0.3, 0.1, 0.15]} />
        <meshBasicMaterial color={PURPLE} transparent opacity={0.5} />
      </mesh>
      <Billboard position={[0, -0.3, 0]}>
        <Text fontSize={0.12} color={PURPLE} anchorX="center">
          Aptos L1
        </Text>
      </Billboard>
    </group>
  );
}

// ─── Main Scene ────────────────────────────────────────────────────
function Scene() {
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const groupRef = useRef<THREE.Group>(null);

  const nodePositions = useMemo(() => generateNodePositions(NODE_COUNT, RADIUS), []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  const particleColors = [TEAL, BLUE, PURPLE, GREEN, PINK];

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />

      <group ref={groupRef}>
        {/* Network nodes */}
        {nodePositions.map((pos, i) => (
          <NetworkNode
            key={i}
            position={pos}
            index={i}
            onHover={setHoveredNode}
          />
        ))}

        {/* Connections */}
        <NetworkConnections positions={nodePositions} />

        {/* Data particles */}
        {nodePositions.slice(0, 8).map((pos, i) => (
          <DataParticle
            key={`particle-${i}`}
            startPos={[0, 0, 0]}
            endPos={pos}
            delay={i * 0.5}
            color={particleColors[i % particleColors.length]}
          />
        ))}

        {/* Verification pulse */}
        <VerificationPulse />

        {/* Orbiting ring */}
        <OrbitingRing />

        {/* AI Labels */}
        <AILabels />

        {/* Blockchain anchor */}
        <BlockchainAnchor />
      </group>

      {/* Post-processing */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={0.8}
        />
      </EffectComposer>
    </>
  );
}

// ─── Exported Canvas Wrapper ───────────────────────────────────────
export default function ShelbyScene() {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleContextLost = useCallback((e: Event) => {
    e.preventDefault();
    console.warn('[ShelbyScene] WebGL context lost');
  }, []);

  const containerRefCallback = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      node.addEventListener('webglcontextlost', handleContextLost);
    }
    (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
  }, [handleContextLost]);

  return (
    <div ref={containerRefCallback} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <SceneErrorBoundary>
        <Canvas
          camera={{ position: [0, 2, 8], fov: 50 }}
          style={{ background: 'transparent' }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
        >
          <Scene />
        </Canvas>
      </SceneErrorBoundary>
    </div>
  );
}
