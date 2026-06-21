import { type ReactNode } from 'react';
import './Tooltip.css';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  mono?: boolean;
  maxWidth?: number;
  className?: string;
}

export function Tooltip({ content, children, mono = false, maxWidth, className = '' }: TooltipProps) {
  return (
    <span className={`tooltip-wrapper ${className}`}>
      {children}
      <span
        className={`tooltip ${mono ? 'tooltip-mono' : ''}`}
        style={maxWidth ? { maxWidth } : undefined}
      >
        {content}
      </span>
    </span>
  );
}
