const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  vision: { bg: '#3b0764', text: '#d8b4fe' },
  nlp: { bg: '#064e3b', text: '#6ee7b7' },
  audio: { bg: '#1e3a5f', text: '#93c5fd' },
  medical: { bg: '#4c0519', text: '#f9a8d4' },
  finance: { bg: '#4e1d00', text: '#fdba74' },
  tabular: { bg: '#1e293b', text: '#94a3b8' },
  code: { bg: '#3b0764', text: '#c4b5fd' },
  climate: { bg: '#0c4a6e', text: '#7dd3fc' },
  gaming: { bg: '#3b0764', text: '#c4b5fd' },
  robotics: { bg: '#1e1b4b', text: '#a5b4fc' },
  education: { bg: '#3b3b00', text: '#fde047' },
  energy: { bg: '#1a3a1a', text: '#86efac' },
  geospatial: { bg: '#1e293b', text: '#a78bfa' },
  government: { bg: '#292524', text: '#d6d3d1' },
  legal: { bg: '#27272a', text: '#a1a1aa' },
  science: { bg: '#172554', text: '#818cf8' },
  synthetic: { bg: '#3b0764', text: '#e879f9' },
  time_series: { bg: '#164e63', text: '#67e8f9' },
  web: { bg: '#3b3b00', text: '#facc15' },
  other: { bg: '#292524', text: '#a8a29e' },
};

interface TagBadgeProps {
  tag: string;
}

export function TagBadge({ tag }: TagBadgeProps) {
  const colors = TAG_COLORS[tag];
  return (
    <span
      style={{
        display: 'inline-flex',
        fontFamily: 'var(--font-sans)',
        fontSize: 10,
        fontWeight: 500,
        padding: '2px 8px',
        borderRadius: 'var(--r-full)',
        background: colors?.bg ?? 'var(--bg-raised)',
        color: colors?.text ?? 'var(--text-tertiary)',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {tag.replace(/_/g, ' ')}
    </span>
  );
}
