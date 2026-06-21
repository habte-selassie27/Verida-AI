import type { ReactNode } from 'react';
import './TagPill.css';

interface TagPillProps {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}

export function TagPill({ active = false, onClick, children, className = '' }: TagPillProps) {
  return (
    <span
      className={`tag-pill ${active ? 'tag-pill-active' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </span>
  );
}
