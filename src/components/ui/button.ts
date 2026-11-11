import { createElement, ButtonHTMLAttributes, forwardRef } from 'react';
import './Button.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'lg';
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
}

// Create Button component without JSX syntax
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      startIcon,
      endIcon,
      fullWidth = false,
      className = '',
      children,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const buttonClasses = [
      'go7-button',
      `go7-button-${variant}`,
      `go7-button-${size}`,
      fullWidth ? 'go7-button-full-width' : '',
      className,
    ].filter(Boolean).join(' ');

    // Use createElement instead of JSX
    return createElement(
      'button',
      {
        ref,
        type,
        className: buttonClasses,
        disabled,
        ...props
      },
      startIcon && createElement('span', { className: 'go7-button-start-icon' }, startIcon),
      createElement('span', { className: 'go7-button-text' }, children),
      endIcon && createElement('span', { className: 'go7-button-end-icon' }, endIcon)
    );
  }
);

Button.displayName = 'Button';