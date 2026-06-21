import './IntegrityBadge.css';

type IntegrityStatus = 'verified' | 'tampered' | 'pending' | 'unavailable';
type IntegritySize = 'xs' | 'sm' | 'md' | 'lg';

interface IntegrityBadgeProps {
  status: IntegrityStatus;
  size?: IntegritySize;
  checkedAt?: Date;
  merkleRoot?: string;
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

const labelMap: Record<IntegrityStatus, string> = {
  verified: 'Verified',
  tampered: 'Tampered',
  pending: 'Pending',
  unavailable: 'N/A',
};

function DotIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function getIcon(status: IntegrityStatus) {
  switch (status) {
    case 'verified':
      return <CheckIcon />;
    case 'tampered':
      return <CloseIcon />;
    case 'pending':
      return <ClockIcon />;
    case 'unavailable':
      return <MinusIcon />;
  }
}

export function IntegrityBadge({
  status,
  size = 'md',
  showLabel = true,
  animated = false,
  className = '',
}: IntegrityBadgeProps) {
  const classes = [
    'integrity-badge',
    `integrity-${size}`,
    status,
    animated ? 'integrity-animated' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const icon = size !== 'xs' ? getIcon(status) : null;
  const label = showLabel && size !== 'xs' && size !== 'sm' ? labelMap[status] : null;

  return (
    <span className={classes}>
      {icon}
      {label}
    </span>
  );
}
