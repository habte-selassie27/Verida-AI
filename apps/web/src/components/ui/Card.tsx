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

  if (onClick) {
    return (
      <motion.div
        className={classes}
        onClick={onClick}
        role="button"
        tabIndex={0}
        whileHover={hoverable ? { y: -2, transition: { type: 'spring', stiffness: 300, damping: 20 } } : undefined}
      >
        {children}
      </motion.div>
    );
  }

  return <div className={classes}>{children}</div>;
}
