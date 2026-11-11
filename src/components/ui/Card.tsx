import React, { forwardRef, HTMLAttributes, ReactNode } from 'react';
import './Card.css';
import '../../../styles/motion.css';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /**
   * Media/image content for the card (typically a 16:9 image)
   */
  media?: ReactNode;
  
  /**
   * Title content for the card
   */
  title?: ReactNode;
  
  /**
   * Meta information (rating stars, time, min spend, etc.)
   */
  meta?: ReactNode;
  
  /**
   * Action buttons/links
   */
  actions?: ReactNode;
  
  /**
   * Body content for the card
   */
  children?: ReactNode;
  
  /**
   * Custom CSS class names
   */
  className?: string;
  
  /**
   * Disable hover effects
   * @default false
   */
  disableHover?: boolean;
  
  /**
   * Add padding to the card content
   * @default true
   */
  withPadding?: boolean;
}

/**
 * Card component for displaying content in a contained, styled box
 */
const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      media,
      title,
      meta,
      actions,
      children,
      className = '',
      disableHover = false,
      withPadding = true,
      ...props
    },
    ref
  ) => {
    const cardClasses = [
      'go7-card',
      disableHover ? '' : 'go7-card-hoverable',
      disableHover ? '' : 'card-motion',
      className
    ].filter(Boolean).join(' ');

    const contentClasses = [
      'go7-card-content',
      withPadding ? 'go7-card-content-padded' : ''
    ].filter(Boolean).join(' ');

    return (
      <div ref={ref} className={cardClasses} role="article" {...props}>
        {media && <div className="go7-card-media" role="img" aria-hidden={!title}>{media}</div>}
        
        <div className={contentClasses}>
          {title && <div className="go7-card-title" role="heading" aria-level={3}>{title}</div>}
          {meta && <div className="go7-card-meta" aria-label="Card metadata">{meta}</div>}
          {children && <div className="go7-card-body">{children}</div>}
          {actions && <div className="go7-card-actions" role="group" aria-label="Card actions">{actions}</div>}
        </div>
      </div>
    );
  }
);

Card.displayName = 'Card';

// Additional Card components for compatibility with vendor system
export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  className?: string;
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  className?: string;
}

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children?: ReactNode;
  className?: string;
}

export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  children?: ReactNode;
  className?: string;
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  className?: string;
}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className = '', children, ...props }, ref) => (
    <div ref={ref} className={`go7-card-content ${className}`} {...props}>
      {children}
    </div>
  )
);

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className = '', children, ...props }, ref) => (
    <div ref={ref} className={`go7-card-header ${className}`} {...props}>
      {children}
    </div>
  )
);

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className = '', children, ...props }, ref) => (
    <h3 ref={ref} className={`go7-card-title ${className}`} {...props}>
      {children}
    </h3>
  )
);

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className = '', children, ...props }, ref) => (
    <p ref={ref} className={`go7-card-description ${className}`} {...props}>
      {children}
    </p>
  )
);

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className = '', children, ...props }, ref) => (
    <div ref={ref} className={`go7-card-footer ${className}`} {...props}>
      {children}
    </div>
  )
);

CardContent.displayName = 'CardContent';
CardHeader.displayName = 'CardHeader';
CardTitle.displayName = 'CardTitle';
CardDescription.displayName = 'CardDescription';
CardFooter.displayName = 'CardFooter';

export { Card };
export default Card;