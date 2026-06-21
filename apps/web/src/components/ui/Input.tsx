import { type InputHTMLAttributes, type ReactNode, forwardRef } from 'react';
import './Input.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, leftIcon, rightIcon, required, className = '', ...rest }, ref) => {
    const inputClasses = [
      'input',
      error ? 'input-error' : '',
      leftIcon ? 'input-has-left' : '',
      rightIcon ? 'input-has-right' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={`input-group ${className}`}>
        {label && (
          <label className="input-label">
            {label}
            {required && <span className="input-required">*</span>}
          </label>
        )}
        <div className="input-wrapper">
          {leftIcon && <span className="input-icon input-icon-left">{leftIcon}</span>}
          <input ref={ref} className={inputClasses} required={required} {...rest} />
          {rightIcon && <span className="input-icon input-icon-right">{rightIcon}</span>}
        </div>
        {error && <span className="input-error-msg">{error}</span>}
        {helper && !error && <span className="input-helper">{helper}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
