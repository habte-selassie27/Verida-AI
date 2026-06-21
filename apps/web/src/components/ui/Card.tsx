import type { ReactNode } from 'react';
import './Card.css';

type CardVariant = 'default' | 'raised' | 'danger' | 'metric';

interface CardProps {
  variant?: CardVariant;
  hoverable?: boolean;
  selected?: boolean;
  accent?: boolean;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}

export function Card({
  variant = 'default',
  hoverable = false,
  selected = false,
  accent = false,
  className = '',
  children,
  onClick,
}: CardProps) {
  const classes = [
    'card',
    variant !== 'default' ? `card-${variant}` : '',
    hoverable ? 'card-hoverable' : '',
    selected ? 'card-selected' : '',
    accent ? 'card-accent' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      {children}
    </div>
  );
}
