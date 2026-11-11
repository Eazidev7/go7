import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import './Button.css';
import '../../../styles/motion.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * The visual style variant of the button
   * @default "primary"
   */
  variant?: 'primary' | 'secondary' | 'ghost';
  
  /**
   * The size of the button
   * @default "md"
   */
  size?: 'md' | 'lg';
  
  /**
   * Optional icon to display before the button text
   */
  startIcon?: React.ReactNode;
  
  /**
   * Optional icon to display after the button text
   */
  endIcon?: React.ReactNode;
  
  /**
   * Makes the button take the full width of its container
   * @default false
   */
  fullWidth?: boolean;
  
  /**
   * Optional additional className
   */
  className?: string;
}

/**
 * Go7 Button component with different variants and sizes
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
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
      'btn-motion',
      'focus-motion',
      className,
    ].filter(Boolean).join(' ');

    return (
      <button
        ref={ref}
        type={type}
        className={buttonClasses}
        disabled={disabled}
        aria-disabled={disabled}
        {...props}
      >
        {startIcon && <span className="go7-button-start-icon" aria-hidden="true">{startIcon}</span>}
        <span className="go7-button-text">{children}</span>
        {endIcon && <span className="go7-button-end-icon" aria-hidden="true">{endIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
export default Button;