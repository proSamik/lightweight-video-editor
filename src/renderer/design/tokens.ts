/**
 * Design Tokens - Comprehensive design system constants
 * Based on shadcn/ui principles with 4px spacing scale
 */

// =============================================================================
// SPACING SCALE (4px base)
// =============================================================================
export const spacing = {
  none: 0,
  xs: 4,     // 0.25rem
  sm: 8,     // 0.5rem
  md: 12,    // 0.75rem
  lg: 16,    // 1rem
  xl: 20,    // 1.25rem
  '2xl': 24, // 1.5rem
  '3xl': 32, // 2rem
  '4xl': 40, // 2.5rem
  '5xl': 48, // 3rem
  '6xl': 64, // 4rem
  '8xl': 96, // 6rem
} as const;

// =============================================================================
// TYPOGRAPHY SCALE
// =============================================================================
export const typography = {
  fontSize: {
    xs: 11,    // 0.6875rem
    sm: 12,    // 0.75rem
    base: 14,  // 0.875rem (default)
    lg: 16,    // 1rem
    xl: 18,    // 1.125rem
    '2xl': 20, // 1.25rem
    '3xl': 24, // 1.5rem
    '4xl': 28, // 1.75rem
    '5xl': 32, // 2rem
    '6xl': 40, // 2.5rem
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
  letterSpacing: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
  },
} as const;

// =============================================================================
// BORDER RADIUS
// =============================================================================
export const borderRadius = {
  none: 0,
  sm: 2,
  md: 4,
  lg: 6,
  xl: 8,
  '2xl': 12,
  '3xl': 16,
  full: 9999,
} as const;

// =============================================================================
// ELEVATION/SHADOWS
// =============================================================================
export const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
} as const;

// =============================================================================
// Z-INDEX SCALE
// =============================================================================
export const zIndex = {
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1020,
  banner: 1030,
  overlay: 1040,
  modal: 1050,
  popover: 1060,
  skipLink: 1070,
  toast: 1080,
  tooltip: 1090,
} as const;

// =============================================================================
// TRANSITIONS/ANIMATIONS
// =============================================================================
export const transitions = {
  duration: {
    fast: '100ms',
    normal: '150ms',
    slow: '200ms',
    slower: '300ms',
  },
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// =============================================================================
// COMPONENT-SPECIFIC TOKENS
// =============================================================================

// Button tokens
export const button = {
  height: {
    sm: 32,
    md: 36,
    lg: 40,
    xl: 44,
  },
  padding: {
    sm: { horizontal: spacing.md, vertical: spacing.xs },
    md: { horizontal: spacing.lg, vertical: spacing.sm },
    lg: { horizontal: spacing.xl, vertical: spacing.md },
    xl: { horizontal: spacing['2xl'], vertical: spacing.lg },
  },
  fontSize: {
    sm: typography.fontSize.sm,
    md: typography.fontSize.base,
    lg: typography.fontSize.lg,
    xl: typography.fontSize.xl,
  },
  borderRadius: borderRadius.md,
  fontWeight: typography.fontWeight.medium,
} as const;

// Input tokens
export const input = {
  height: {
    sm: 32,
    md: 36,
    lg: 40,
  },
  padding: {
    horizontal: spacing.md,
    vertical: spacing.sm,
  },
  fontSize: typography.fontSize.base,
  borderRadius: borderRadius.md,
  borderWidth: 1,
} as const;

// Modal tokens
export const modal = {
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
  },
  content: {
    borderRadius: borderRadius.xl,
    padding: spacing['3xl'],
    maxWidth: 500,
    minWidth: 320,
  },
  header: {
    padding: spacing['2xl'],
    borderRadius: `${borderRadius.xl}px ${borderRadius.xl}px 0 0`,
  },
} as const;

// Panel tokens
export const panel = {
  padding: spacing['2xl'],
  borderRadius: borderRadius.lg,
  gap: spacing.lg,
} as const;

// =============================================================================
// RESPONSIVE BREAKPOINTS
// =============================================================================
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create consistent spacing using the design token scale
 */
export const getSpacing = (size: keyof typeof spacing): number => spacing[size];

/**
 * Create consistent transitions
 */
export const createTransition = (
  property: string = 'all',
  duration: keyof typeof transitions.duration = 'normal',
  easing: keyof typeof transitions.easing = 'easeInOut'
): string => {
  return `${property} ${transitions.duration[duration]} ${transitions.easing[easing]}`;
};

/**
 * Create consistent shadows with theme-aware opacity
 */
export const createShadow = (
  level: keyof typeof shadows,
  isDark: boolean = false
): string => {
  if (level === 'none') return shadows.none;
  
  const shadow = shadows[level];
  if (isDark) {
    // Increase shadow opacity for dark themes
    return shadow.replace(/rgba\(0, 0, 0, ([\d.]+)\)/g, (match, opacity) => {
      const newOpacity = Math.min(parseFloat(opacity) * 1.5, 1);
      return `rgba(0, 0, 0, ${newOpacity})`;
    });
  }
  return shadow;
};

/**
 * Get responsive value based on screen size
 */
export const getResponsiveValue = <T>(
  values: Partial<Record<keyof typeof breakpoints | 'base', T>>,
  screenWidth: number
): T => {
  if (values.base !== undefined && screenWidth < breakpoints.sm) return values.base;
  if (values.sm !== undefined && screenWidth < breakpoints.md) return values.sm;
  if (values.md !== undefined && screenWidth < breakpoints.lg) return values.md;
  if (values.lg !== undefined && screenWidth < breakpoints.xl) return values.lg;
  if (values.xl !== undefined && screenWidth < breakpoints['2xl']) return values.xl;
  if (values['2xl'] !== undefined) return values['2xl'];
  
  // Fallback to the largest available value
  const available = Object.keys(values) as Array<keyof typeof values>;
  return values[available[available.length - 1]]!;
};

// =============================================================================
// TYPE EXPORTS
// =============================================================================
export type SpacingKey = keyof typeof spacing;
export type TypographySize = keyof typeof typography.fontSize;
export type BorderRadiusKey = keyof typeof borderRadius;
export type ShadowKey = keyof typeof shadows;
export type ZIndexKey = keyof typeof zIndex;
export type TransitionDuration = keyof typeof transitions.duration;
export type TransitionEasing = keyof typeof transitions.easing;