import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
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

  const Tag = onClick ? motion.div : 'div';

  return (
    <Tag
      className={classes}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      whileHover={hoverable ? { y: -2, transition: { type: 'spring', stiffness: 300, damping: 20 } } : undefined}
    >
      {children}
    </Tag>
  );
}
