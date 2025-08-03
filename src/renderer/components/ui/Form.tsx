import React, { forwardRef, ReactNode } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, typography, borderRadius } from '../../design/tokens';

// =============================================================================
// FORM GROUP COMPONENT
// =============================================================================

export interface FormGroupProps {
  label?: string;
  labelFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  isInvalid?: boolean;
}

export const FormGroup: React.FC<FormGroupProps> = ({
  label,
  labelFor,
  error,
  hint,
  required = false,
  children,
  isInvalid = false,
}) => {
  const { theme } = useTheme();

  const formGroupStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  };

  const labelStyles: React.CSSProperties = {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: theme.colors.text,
    lineHeight: typography.lineHeight.normal,
    marginBottom: spacing.xs,
  };

  const errorStyles: React.CSSProperties = {
    fontSize: typography.fontSize.sm,
    color: theme.colors.error,
    marginTop: spacing.xs,
    lineHeight: typography.lineHeight.normal,
  };

  const hintStyles: React.CSSProperties = {
    fontSize: typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: typography.lineHeight.normal,
  };

  const requiredIndicatorStyles: React.CSSProperties = {
    color: theme.colors.error,
    marginLeft: spacing.xs,
  };

  return (
    <div style={formGroupStyles}>
      {label && (
        <label htmlFor={labelFor} style={labelStyles}>
          {label}
          {required && <span style={requiredIndicatorStyles}>*</span>}
        </label>
      )}
      
      {children}
      
      {error && isInvalid && (
        <span style={errorStyles}>{error}</span>
      )}
      
      {hint && !error && (
        <span style={hintStyles}>{hint}</span>
      )}
    </div>
  );
};

// =============================================================================
// FORM SECTION COMPONENT
// =============================================================================

export interface FormSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
}) => {
  const { theme } = useTheme();

  const sectionStyles: React.CSSProperties = {
    marginBottom: spacing['3xl'],
  };

  const titleStyles: React.CSSProperties = {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: spacing.sm,
    lineHeight: typography.lineHeight.tight,
  };

  const descriptionStyles: React.CSSProperties = {
    fontSize: typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: typography.lineHeight.normal,
  };

  const contentStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
  };

  return (
    <div style={sectionStyles}>
      {title && <h3 style={titleStyles}>{title}</h3>}
      {description && <p style={descriptionStyles}>{description}</p>}
      <div style={contentStyles}>{children}</div>
    </div>
  );
};

// =============================================================================
// FORM GRID COMPONENT
// =============================================================================

export interface FormGridProps {
  columns?: 1 | 2 | 3 | 4;
  gap?: keyof typeof spacing;
  children: ReactNode;
}

export const FormGrid: React.FC<FormGridProps> = ({
  columns = 2,
  gap = 'lg',
  children,
}) => {
  const gridStyles: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: spacing[gap],
    alignItems: 'start',
  };

  return <div style={gridStyles}>{children}</div>;
};

// =============================================================================
// FORM ROW COMPONENT
// =============================================================================

export interface FormRowProps {
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  gap?: keyof typeof spacing;
  wrap?: boolean;
  children: ReactNode;
}

export const FormRow: React.FC<FormRowProps> = ({
  align = 'center',
  justify = 'start',
  gap = 'md',
  wrap = false,
  children,
}) => {
  const getJustifyContent = () => {
    switch (justify) {
      case 'center': return 'center';
      case 'end': return 'flex-end';
      case 'between': return 'space-between';
      case 'around': return 'space-around';
      default: return 'flex-start';
    }
  };

  const getAlignItems = () => {
    switch (align) {
      case 'center': return 'center';
      case 'end': return 'flex-end';
      case 'stretch': return 'stretch';
      default: return 'flex-start';
    }
  };

  const rowStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: getAlignItems(),
    justifyContent: getJustifyContent(),
    gap: spacing[gap],
    flexWrap: wrap ? 'wrap' : 'nowrap',
  };

  return <div style={rowStyles}>{children}</div>;
};

// =============================================================================
// FORM ACTIONS COMPONENT
// =============================================================================

export interface FormActionsProps {
  align?: 'left' | 'center' | 'right';
  gap?: keyof typeof spacing;
  children: ReactNode;
}

export const FormActions: React.FC<FormActionsProps> = ({
  align = 'right',
  gap = 'md',
  children,
}) => {
  const { theme } = useTheme();

  const getJustifyContent = () => {
    switch (align) {
      case 'left': return 'flex-start';
      case 'center': return 'center';
      default: return 'flex-end';
    }
  };

  const actionsStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: getJustifyContent(),
    gap: spacing[gap],
    marginTop: spacing['2xl'],
    paddingTop: spacing.xl,
    borderTop: `1px solid ${theme.colors.border}`,
  };

  return <div style={actionsStyles}>{children}</div>;
};

// =============================================================================
// FORM CONTAINER COMPONENT
// =============================================================================

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: ReactNode;
  maxWidth?: number | string;
  padding?: keyof typeof spacing;
}

export const Form = forwardRef<HTMLFormElement, FormProps>(
  ({ children, maxWidth = 600, padding = '3xl', style, ...props }, ref) => {
    const { theme } = useTheme();

    const formStyles: React.CSSProperties = {
      backgroundColor: theme.colors.surface,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: borderRadius.xl,
      padding: spacing[padding],
      maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
      width: '100%',
      margin: '0 auto',
      ...style,
    };

    return (
      <form ref={ref} style={formStyles} {...props}>
        {children}
      </form>
    );
  }
);

Form.displayName = 'Form';

// =============================================================================
// FIELD SET COMPONENT
// =============================================================================

export interface FieldSetProps {
  legend?: string;
  disabled?: boolean;
  children: ReactNode;
}

export const FieldSet: React.FC<FieldSetProps> = ({
  legend,
  disabled = false,
  children,
}) => {
  const { theme } = useTheme();

  const fieldsetStyles: React.CSSProperties = {
    border: `1px solid ${theme.colors.border}`,
    borderRadius: borderRadius.md,
    padding: spacing.xl,
    margin: `${spacing.lg}px 0`,
    opacity: disabled ? 0.6 : 1,
  };

  const legendStyles: React.CSSProperties = {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: theme.colors.text,
    padding: `0 ${spacing.sm}px`,
    backgroundColor: theme.colors.surface,
  };

  return (
    <fieldset disabled={disabled} style={fieldsetStyles}>
      {legend && <legend style={legendStyles}>{legend}</legend>}
      {children}
    </fieldset>
  );
};

// =============================================================================
// CHECKBOX & RADIO COMPONENTS
// =============================================================================

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  isInvalid?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, isInvalid = false, disabled, style, ...props }, ref) => {
    const { theme } = useTheme();

    const containerStyles: React.CSSProperties = {
      display: 'flex',
      alignItems: 'flex-start',
      gap: spacing.md,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
    };

    const checkboxStyles: React.CSSProperties = {
      width: 16,
      height: 16,
      marginTop: 2, // Align with first line of text
      accentColor: theme.colors.primary,
      cursor: disabled ? 'not-allowed' : 'pointer',
      ...style,
    };

    const labelStyles: React.CSSProperties = {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.normal,
      color: theme.colors.text,
      lineHeight: typography.lineHeight.normal,
      cursor: disabled ? 'not-allowed' : 'pointer',
      userSelect: 'none',
    };

    const descriptionStyles: React.CSSProperties = {
      fontSize: typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: spacing.xs,
      lineHeight: typography.lineHeight.normal,
    };

    const contentStyles: React.CSSProperties = {
      flex: 1,
    };

    return (
      <label style={containerStyles}>
        <input
          ref={ref}
          type="checkbox"
          disabled={disabled}
          style={checkboxStyles}
          {...props}
        />
        {(label || description) && (
          <div style={contentStyles}>
            {label && <span style={labelStyles}>{label}</span>}
            {description && <div style={descriptionStyles}>{description}</div>}
          </div>
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  isInvalid?: boolean;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, description, isInvalid = false, disabled, style, ...props }, ref) => {
    const { theme } = useTheme();

    const containerStyles: React.CSSProperties = {
      display: 'flex',
      alignItems: 'flex-start',
      gap: spacing.md,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
    };

    const radioStyles: React.CSSProperties = {
      width: 16,
      height: 16,
      marginTop: 2,
      accentColor: theme.colors.primary,
      cursor: disabled ? 'not-allowed' : 'pointer',
      ...style,
    };

    const labelStyles: React.CSSProperties = {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.normal,
      color: theme.colors.text,
      lineHeight: typography.lineHeight.normal,
      cursor: disabled ? 'not-allowed' : 'pointer',
      userSelect: 'none',
    };

    const descriptionStyles: React.CSSProperties = {
      fontSize: typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: spacing.xs,
      lineHeight: typography.lineHeight.normal,
    };

    const contentStyles: React.CSSProperties = {
      flex: 1,
    };

    return (
      <label style={containerStyles}>
        <input
          ref={ref}
          type="radio"
          disabled={disabled}
          style={radioStyles}
          {...props}
        />
        {(label || description) && (
          <div style={contentStyles}>
            {label && <span style={labelStyles}>{label}</span>}
            {description && <div style={descriptionStyles}>{description}</div>}
          </div>
        )}
      </label>
    );
  }
);

Radio.displayName = 'Radio';