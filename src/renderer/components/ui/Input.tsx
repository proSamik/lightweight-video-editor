import React, { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  spacing, 
  input, 
  typography, 
  borderRadius, 
  createTransition,
  createShadow 
} from '../../design/tokens';

// =============================================================================
// INPUT VARIANTS & SIZES
// =============================================================================

export type InputSize = 'sm' | 'md' | 'lg';
export type InputVariant = 'default' | 'filled' | 'flushed';

// =============================================================================
// INPUT PROPS INTERFACE
// =============================================================================

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: InputSize;
  variant?: InputVariant;
  isInvalid?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  leftElement?: ReactNode;
  rightElement?: ReactNode;
}

// =============================================================================
// INPUT COMPONENT
// =============================================================================

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = 'md',
      variant = 'default',
      isInvalid = false,
      leftIcon,
      rightIcon,
      leftElement,
      rightElement,
      disabled,
      style,
      ...props
    },
    ref
  ) => {
    const { theme } = useTheme();
    const [isFocused, setIsFocused] = React.useState(false);

    // =============================================================================
    // SIZE STYLES
    // =============================================================================

    const getSizeStyles = () => {
      return {
        height: input.height[size],
        fontSize: size === 'sm' ? typography.fontSize.sm : 
                  size === 'lg' ? typography.fontSize.lg : 
                  typography.fontSize.base,
        paddingLeft: leftIcon || leftElement ? spacing['2xl'] : input.padding.horizontal,
        paddingRight: rightIcon || rightElement ? spacing['2xl'] : input.padding.horizontal,
        paddingTop: input.padding.vertical,
        paddingBottom: input.padding.vertical,
      };
    };

    // =============================================================================
    // VARIANT STYLES
    // =============================================================================

    const getVariantStyles = (): React.CSSProperties => {
      const base = {
        transition: createTransition('all', 'fast'),
        outline: 'none',
      };

      switch (variant) {
        case 'filled':
          return {
            ...base,
            backgroundColor: theme.colors.surface,
            border: `${input.borderWidth}px solid transparent`,
            borderRadius: input.borderRadius,
          };

        case 'flushed':
          return {
            ...base,
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: `${input.borderWidth}px solid ${theme.colors.border}`,
            borderRadius: 0,
            paddingLeft: 0,
            paddingRight: 0,
          };

        default: // 'default'
          return {
            ...base,
            backgroundColor: theme.colors.input.background,
            border: `${input.borderWidth}px solid ${theme.colors.border}`,
            borderRadius: input.borderRadius,
          };
      }
    };

    // =============================================================================
    // STATE STYLES
    // =============================================================================

    const getStateStyles = (): React.CSSProperties => {
      if (disabled) {
        return {
          opacity: 0.5,
          cursor: 'not-allowed',
          backgroundColor: theme.colors.surfaceActive,
        };
      }

      if (isInvalid) {
        return {
          borderColor: theme.colors.error,
          boxShadow: `0 0 0 1px ${theme.colors.error}`,
        };
      }

      if (isFocused) {
        return {
          borderColor: theme.colors.borderFocus,
          backgroundColor: theme.colors.input.backgroundFocus,
          boxShadow: `0 0 0 1px ${theme.colors.borderFocus}`,
        };
      }

      return {};
    };

    // =============================================================================
    // COMBINED STYLES
    // =============================================================================

    const inputStyles: React.CSSProperties = {
      // Base styles
      fontFamily: 'inherit',
      fontWeight: typography.fontWeight.normal,
      lineHeight: typography.lineHeight.normal,
      color: theme.colors.text,
      width: '100%',
      display: 'block',
      
      // Placeholder styles are handled by CSS
      
      // Size styles
      ...getSizeStyles(),
      
      // Variant styles
      ...getVariantStyles(),
      
      // State styles
      ...getStateStyles(),
      
      // Custom styles
      ...style,
    };

    // =============================================================================
    // ICON/ELEMENT STYLES
    // =============================================================================

    const getIconSize = () => {
      return size === 'sm' ? 16 : size === 'lg' ? 20 : 18;
    };

    const iconContainerStyles: React.CSSProperties = {
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      display: 'flex',
      alignItems: 'center',
      color: theme.colors.textSecondary,
      pointerEvents: 'none',
      zIndex: 1,
    };

    const leftIconStyles: React.CSSProperties = {
      ...iconContainerStyles,
      left: spacing.md,
    };

    const rightIconStyles: React.CSSProperties = {
      ...iconContainerStyles,
      right: spacing.md,
    };

    // =============================================================================
    // EVENT HANDLERS
    // =============================================================================

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      props.onBlur?.(e);
    };

    // =============================================================================
    // RENDER
    // =============================================================================

    const hasLeftContent = leftIcon || leftElement;
    const hasRightContent = rightIcon || rightElement;

    if (hasLeftContent || hasRightContent) {
      return (
        <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
          {hasLeftContent && (
            <div style={leftIconStyles}>
              {leftElement || (
                <span style={{ 
                  width: getIconSize(), 
                  height: getIconSize(), 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  {leftIcon}
                </span>
              )}
            </div>
          )}
          
          <input
            ref={ref}
            disabled={disabled}
            style={inputStyles}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />
          
          {hasRightContent && (
            <div style={rightIconStyles}>
              {rightElement || (
                <span style={{ 
                  width: getIconSize(), 
                  height: getIconSize(), 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  {rightIcon}
                </span>
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <input
        ref={ref}
        disabled={disabled}
        style={inputStyles}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

// =============================================================================
// TEXTAREA COMPONENT
// =============================================================================

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  size?: InputSize;
  variant?: InputVariant;
  isInvalid?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      size = 'md',
      variant = 'default',
      isInvalid = false,
      resize = 'vertical',
      disabled,
      style,
      ...props
    },
    ref
  ) => {
    const { theme } = useTheme();
    const [isFocused, setIsFocused] = React.useState(false);

    const getVariantStyles = (): React.CSSProperties => {
      const base = {
        transition: createTransition('all', 'fast'),
        outline: 'none',
        resize,
      };

      switch (variant) {
        case 'filled':
          return {
            ...base,
            backgroundColor: theme.colors.surface,
            border: `${input.borderWidth}px solid transparent`,
            borderRadius: input.borderRadius,
          };

        case 'flushed':
          return {
            ...base,
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: `${input.borderWidth}px solid ${theme.colors.border}`,
            borderRadius: 0,
          };

        default:
          return {
            ...base,
            backgroundColor: theme.colors.input.background,
            border: `${input.borderWidth}px solid ${theme.colors.border}`,
            borderRadius: input.borderRadius,
          };
      }
    };

    const getStateStyles = (): React.CSSProperties => {
      if (disabled) {
        return {
          opacity: 0.5,
          cursor: 'not-allowed',
          backgroundColor: theme.colors.surfaceActive,
        };
      }

      if (isInvalid) {
        return {
          borderColor: theme.colors.error,
          boxShadow: `0 0 0 1px ${theme.colors.error}`,
        };
      }

      if (isFocused) {
        return {
          borderColor: theme.colors.borderFocus,
          backgroundColor: theme.colors.input.backgroundFocus,
          boxShadow: `0 0 0 1px ${theme.colors.borderFocus}`,
        };
      }

      return {};
    };

    const textareaStyles: React.CSSProperties = {
      fontFamily: 'inherit',
      fontWeight: typography.fontWeight.normal,
      lineHeight: typography.lineHeight.normal,
      fontSize: size === 'sm' ? typography.fontSize.sm : 
                size === 'lg' ? typography.fontSize.lg : 
                typography.fontSize.base,
      color: theme.colors.text,
      width: '100%',
      minHeight: 80,
      padding: input.padding.horizontal,
      
      // Placeholder styles handled by CSS
      
      ...getVariantStyles(),
      ...getStateStyles(),
      ...style,
    };

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(false);
      props.onBlur?.(e);
    };

    return (
      <textarea
        ref={ref}
        disabled={disabled}
        style={textareaStyles}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

// =============================================================================
// SELECT COMPONENT
// =============================================================================

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: InputSize;
  variant?: InputVariant;
  isInvalid?: boolean;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      size = 'md',
      variant = 'default',
      isInvalid = false,
      placeholder,
      disabled,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const { theme } = useTheme();
    const [isFocused, setIsFocused] = React.useState(false);

    const getVariantStyles = (): React.CSSProperties => {
      const base = {
        transition: createTransition('all', 'fast'),
        outline: 'none',
        appearance: 'none' as any,
        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: `right ${spacing.md}px center`,
        backgroundSize: '16px',
        paddingRight: spacing['2xl'] + spacing.lg,
      };

      switch (variant) {
        case 'filled':
          return {
            ...base,
            backgroundColor: theme.colors.surface,
            border: `${input.borderWidth}px solid transparent`,
            borderRadius: input.borderRadius,
          };

        case 'flushed':
          return {
            ...base,
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: `${input.borderWidth}px solid ${theme.colors.border}`,
            borderRadius: 0,
            paddingLeft: 0,
          };

        default:
          return {
            ...base,
            backgroundColor: theme.colors.input.background,
            border: `${input.borderWidth}px solid ${theme.colors.border}`,
            borderRadius: input.borderRadius,
          };
      }
    };

    const getStateStyles = (): React.CSSProperties => {
      if (disabled) {
        return {
          opacity: 0.5,
          cursor: 'not-allowed',
          backgroundColor: theme.colors.surfaceActive,
        };
      }

      if (isInvalid) {
        return {
          borderColor: theme.colors.error,
          boxShadow: `0 0 0 1px ${theme.colors.error}`,
        };
      }

      if (isFocused) {
        return {
          borderColor: theme.colors.borderFocus,
          backgroundColor: theme.colors.input.backgroundFocus,
          boxShadow: `0 0 0 1px ${theme.colors.borderFocus}`,
        };
      }

      return {};
    };

    const selectStyles: React.CSSProperties = {
      fontFamily: 'inherit',
      fontWeight: typography.fontWeight.normal,
      lineHeight: typography.lineHeight.normal,
      fontSize: size === 'sm' ? typography.fontSize.sm : 
                size === 'lg' ? typography.fontSize.lg : 
                typography.fontSize.base,
      color: theme.colors.text,
      width: '100%',
      height: input.height[size],
      paddingLeft: input.padding.horizontal,
      paddingTop: input.padding.vertical,
      paddingBottom: input.padding.vertical,
      cursor: disabled ? 'not-allowed' : 'pointer',
      
      ...getVariantStyles(),
      ...getStateStyles(),
      ...style,
    };

    const handleFocus = (e: React.FocusEvent<HTMLSelectElement>) => {
      setIsFocused(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
      setIsFocused(false);
      props.onBlur?.(e);
    };

    return (
      <select
        ref={ref}
        disabled={disabled}
        style={selectStyles}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      >
        {placeholder && (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        )}
        {children}
      </select>
    );
  }
);

Select.displayName = 'Select';