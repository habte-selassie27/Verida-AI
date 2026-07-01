import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import './Button.css';

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'teal-outline' | 'icon';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const springTap = { type: 'spring', stiffness: 400, damping: 17 };

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
  ...rest
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

  return (
    <motion.button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      whileHover={!disabled && !loading ? { scale: 1.02 } : undefined}
      whileTap={!disabled && !loading ? { scale: 0.97 } : undefined}
      transition={springTap}
      {...rest}
    >
      {loading ? null : icon}
      {children && <span className={loading ? 'btn-label' : ''}>{children}</span>}
    </motion.button>
  );
}
