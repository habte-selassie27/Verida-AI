import { type ReactNode, type MouseEventHandler } from 'react';
import { motion } from 'framer-motion';
import './Button.css';

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'teal-outline' | 'icon';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  children?: ReactNode;
}

const springTap = { type: 'spring' as const, stiffness: 400, damping: 17 };

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  children,
  onClick,
  className = '',
  type = 'button',
  fullWidth,
}: ButtonProps) {
  const classes = [
    'btn',
    `btn-${variant}`,
    size !== 'md' ? `btn-${size}` : '',
    fullWidth ? 'btn-full' : '',
    loading ? 'btn-loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const hoverProps = (!disabled && !loading) ? { whileHover: { scale: 1.02 }, whileTap: { scale: 0.97 } } : {};
  return (
    <motion.button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      transition={springTap}
      {...hoverProps}
    >
      {loading ? null : icon}
      {children && <span className={loading ? 'btn-label' : ''}>{children}</span>}
    </motion.button>
  );
}
