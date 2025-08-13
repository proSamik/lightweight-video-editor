import React, { ReactNode } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

// Card Component with Glass Effect
export interface CardProps {
  children: ReactNode;
  variant?: 'default' | 'glass' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  variant = 'default',
  padding = 'md',
  className = '',
  style = {},
  onClick,
  onDragOver,
  onDragLeave,
  onDrop,
  ...props
}) => {
  const { theme } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'glass':
        return {
          backgroundColor: theme.colors.glass.background,
          border: `1px solid ${theme.colors.glass.border}`,
          boxShadow: theme.colors.glass.shadow,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        };
      case 'elevated':
        return {
          backgroundColor: theme.colors.surfaceElevated,
          border: `1px solid ${theme.colors.border}`,
          boxShadow: theme.shadows.lg,
        };
      default:
        return {
          backgroundColor: theme.colors.surface,
          border: `1px solid ${theme.colors.border}`,
          boxShadow: theme.shadows.sm,
        };
    }
  };

  const getPaddingStyles = () => {
    switch (padding) {
      case 'none':
        return { padding: '0' };
      case 'sm':
        return { padding: theme.spacing.sm };
      case 'md':
        return { padding: theme.spacing.md };
      case 'lg':
        return { padding: theme.spacing.lg };
      default:
        return { padding: theme.spacing.md };
    }
  };

  const cardStyle: React.CSSProperties = {
    borderRadius: theme.radius.lg,
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: onClick ? 'pointer' : 'default',
    ...getVariantStyles(),
    ...getPaddingStyles(),
    ...style,
  };

  const hoverStyle = onClick ? {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows.xl,
  } : {};

  return (
    <div
      className={className}
      style={cardStyle}
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onMouseEnter={(e) => {
        if (onClick) {
          Object.assign(e.currentTarget.style, hoverStyle);
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          Object.assign(e.currentTarget.style, {
            transform: 'none',
            boxShadow: getVariantStyles().boxShadow,
          });
        }
      }}
      {...props}
    >
      {children}
    </div>
  );
};