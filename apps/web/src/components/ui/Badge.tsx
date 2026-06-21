import type { ReactNode } from 'react';
import './Badge.css';

type BadgeVariant = 'verified' | 'tampered' | 'pending' | 'free' | 'paid' | 'subscription' | 'version' | 'network';

interface BadgeProps {
  variant: BadgeVariant;
  children?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function Badge({ variant, children, icon, className = '' }: BadgeProps) {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {icon}
      {children}
    </span>
  );
}
