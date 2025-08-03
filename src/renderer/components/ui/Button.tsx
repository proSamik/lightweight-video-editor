import React, { forwardRef, ButtonHTMLAttributes } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  spacing, 
  button, 
  typography, 
  borderRadius, 
  createTransition, 
  createShadow 
} from '../../design/tokens';

// =============================================================================
// BUTTON VARIANTS & SIZES
// =============================================================================

export type ButtonVariant = 
  | 'primary' 
  | 'secondary' 
  | 'ghost' 
  | 'outline' 
  | 'destructive' 
  | 'success' 
  | 'warning' 
  | 'info';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

// =============================================================================
// BUTTON PROPS INTERFACE
// =============================================================================

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
}

// =============================================================================
// BUTTON COMPONENT
// =============================================================================

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const { theme } = useTheme();
    const isDisabled = disabled || isLoading;

    // =============================================================================
    // VARIANT STYLES
    // =============================================================================

    const getVariantStyles = (): React.CSSProperties => {
      const base = {
        border: '1px solid transparent',
        transition: createTransition('all', 'fast'),
      };

      switch (variant) {
        case 'primary':
          return {
            ...base,
            backgroundColor: theme.colors.primary,
            color: theme.colors.primaryForeground,
            borderColor: theme.colors.primary,
            boxShadow: createShadow('sm', theme.mode === 'dark'),
          };

        case 'secondary':
          return {
            ...base,
            backgroundColor: theme.colors.secondary,
            color: theme.colors.secondaryForeground,
            borderColor: theme.colors.secondary,
            boxShadow: createShadow('sm', theme.mode === 'dark'),
          };

        case 'ghost':
          return {
            ...base,
            backgroundColor: theme.colors.button.ghost,
            color: theme.colors.text,
            borderColor: 'transparent',
          };

        case 'outline':
          return {
            ...base,
            backgroundColor: theme.colors.button.outline,
            color: theme.colors.text,
            borderColor: theme.colors.border,
          };

        case 'destructive':
          return {
            ...base,
            backgroundColor: theme.colors.error,
            color: theme.colors.errorForeground,
            borderColor: theme.colors.error,
            boxShadow: createShadow('sm', theme.mode === 'dark'),
          };

        case 'success':
          return {
            ...base,
            backgroundColor: theme.colors.success,
            color: theme.colors.successForeground,
            borderColor: theme.colors.success,
            boxShadow: createShadow('sm', theme.mode === 'dark'),
          };

        case 'warning':
          return {
            ...base,
            backgroundColor: theme.colors.warning,
            color: theme.colors.warningForeground,
            borderColor: theme.colors.warning,
            boxShadow: createShadow('sm', theme.mode === 'dark'),
          };

        case 'info':
          return {
            ...base,
            backgroundColor: theme.colors.info,
            color: theme.colors.infoForeground,
            borderColor: theme.colors.info,
            boxShadow: createShadow('sm', theme.mode === 'dark'),
          };

        default:
          return base;
      }
    };

    // =============================================================================
    // HOVER STYLES
    // =============================================================================

    const getHoverStyles = (): React.CSSProperties => {
      if (isDisabled) return {};

      switch (variant) {
        case 'primary':
          return {
            backgroundColor: theme.colors.primaryHover,
            borderColor: theme.colors.primaryHover,
            transform: 'translateY(-1px)',
            boxShadow: createShadow('md', theme.mode === 'dark'),
          };

        case 'secondary':
          return {
            backgroundColor: theme.colors.secondaryHover,
            borderColor: theme.colors.secondaryHover,
            transform: 'translateY(-1px)',
            boxShadow: createShadow('md', theme.mode === 'dark'),
          };

        case 'ghost':
          return {
            backgroundColor: theme.colors.button.ghostHover,
          };

        case 'outline':
          return {
            backgroundColor: theme.colors.button.outlineHover,
            borderColor: theme.colors.borderHover,
          };

        case 'destructive':
          return {
            backgroundColor: theme.colors.errorHover,
            borderColor: theme.colors.errorHover,
            transform: 'translateY(-1px)',
            boxShadow: createShadow('md', theme.mode === 'dark'),
          };

        case 'success':
          return {
            backgroundColor: theme.colors.successHover,
            borderColor: theme.colors.successHover,
            transform: 'translateY(-1px)',
            boxShadow: createShadow('md', theme.mode === 'dark'),
          };

        case 'warning':
          return {
            backgroundColor: theme.colors.warningHover,
            borderColor: theme.colors.warningHover,
            transform: 'translateY(-1px)',
            boxShadow: createShadow('md', theme.mode === 'dark'),
          };

        case 'info':
          return {
            backgroundColor: theme.colors.infoHover,
            borderColor: theme.colors.infoHover,
            transform: 'translateY(-1px)',
            boxShadow: createShadow('md', theme.mode === 'dark'),
          };

        default:
          return {};
      }
    };

    // =============================================================================
    // ACTIVE STYLES
    // =============================================================================

    const getActiveStyles = (): React.CSSProperties => {
      if (isDisabled) return {};

      const base = {
        transform: 'translateY(0)',
        boxShadow: createShadow('sm', theme.mode === 'dark'),
      };

      switch (variant) {
        case 'primary':
          return {
            ...base,
            backgroundColor: theme.colors.primaryActive,
            borderColor: theme.colors.primaryActive,
          };

        case 'secondary':
          return {
            ...base,
            backgroundColor: theme.colors.secondaryActive,
            borderColor: theme.colors.secondaryActive,
          };

        default:
          return base;
      }
    };

    // =============================================================================
    // SIZE STYLES
    // =============================================================================

    const getSizeStyles = (): React.CSSProperties => {
      return {
        height: button.height[size],
        paddingLeft: button.padding[size].horizontal,
        paddingRight: button.padding[size].horizontal,
        paddingTop: button.padding[size].vertical,
        paddingBottom: button.padding[size].vertical,
        fontSize: button.fontSize[size],
      };
    };

    // =============================================================================
    // DISABLED STYLES
    // =============================================================================

    const getDisabledStyles = (): React.CSSProperties => {
      if (!isDisabled) return {};

      return {
        opacity: 0.5,
        cursor: 'not-allowed',
        transform: 'none',
        boxShadow: 'none',
      };
    };

    // =============================================================================
    // COMBINED STYLES
    // =============================================================================

    const buttonStyles: React.CSSProperties = {
      // Base styles
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      fontFamily: 'inherit',
      fontWeight: button.fontWeight,
      borderRadius: button.borderRadius,
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      outline: 'none',
      textDecoration: 'none',
      userSelect: 'none',
      whiteSpace: 'nowrap',
      width: fullWidth ? '100%' : 'auto',
      
      // Variant styles
      ...getVariantStyles(),
      
      // Size styles
      ...getSizeStyles(),
      
      // Disabled styles
      ...getDisabledStyles(),
      
      // Focus styles are handled by CSS class
      
      // Custom styles
      ...style,
    };

    // =============================================================================
    // LOADING SPINNER COMPONENT
    // =============================================================================

    const LoadingSpinner = () => (
      <div
        style={{
          width: 16,
          height: 16,
          border: `2px solid transparent`,
          borderTop: `2px solid currentColor`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
    );

    // =============================================================================
    // EVENT HANDLERS
    // =============================================================================

    const [isHovered, setIsHovered] = React.useState(false);
    const [isActive, setIsActive] = React.useState(false);

    const handleMouseEnter = () => {
      if (!isDisabled) {
        setIsHovered(true);
      }
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
      setIsActive(false);
    };

    const handleMouseDown = () => {
      if (!isDisabled) {
        setIsActive(true);
      }
    };

    const handleMouseUp = () => {
      setIsActive(false);
    };

    // Apply hover and active styles
    const dynamicStyles = {
      ...buttonStyles,
      ...(isHovered ? getHoverStyles() : {}),
      ...(isActive ? getActiveStyles() : {}),
    };

    // =============================================================================
    // RENDER
    // =============================================================================

    return (
      <>
        {/* Add keyframe animation for loading spinner */}
        <style>
          {`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}
        </style>
        
        <button
          ref={ref}
          disabled={isDisabled}
          style={dynamicStyles}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          {...props}
        >
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            leftIcon && <span style={{ display: 'flex', alignItems: 'center' }}>{leftIcon}</span>
          )}
          
          {children}
          
          {!isLoading && rightIcon && (
            <span style={{ display: 'flex', alignItems: 'center' }}>{rightIcon}</span>
          )}
        </button>
      </>
    );
  }
);

Button.displayName = 'Button';

// =============================================================================
// ICON BUTTON COMPONENT
// =============================================================================

export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'leftIcon' | 'rightIcon'> {
  icon: React.ReactNode;
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = 'md', ...props }, ref) => {
    const iconSizes = {
      sm: 16,
      md: 20,
      lg: 24,
      xl: 28,
    };

    return (
      <Button
        ref={ref}
        size={size}
        style={{
          padding: spacing.sm,
          minWidth: button.height[size],
          ...props.style,
        }}
        {...props}
      >
        <span 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: iconSizes[size],
            height: iconSizes[size],
          }}
        >
          {icon}
        </span>
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';