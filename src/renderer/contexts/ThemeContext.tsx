import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Enhanced theme interface inspired by liquid design principles
interface Theme {
  mode: 'light' | 'dark';
  colors: {
    // Primary Blue Scale - Trust & Reliability
    primary: string;
    primaryHover: string;
    primaryActive: string;
    primaryForeground: string;
    primarySubtle: string;
    
    // Secondary Blue Scale
    secondary: string;
    secondaryHover: string;
    secondaryActive: string;
    secondaryForeground: string;
    secondarySubtle: string;
    
    // Background System - Liquid Layers
    background: string;
    backgroundSecondary: string;
    backgroundTertiary: string;
    surface: string;
    surfaceHover: string;
    surfaceActive: string;
    surfaceElevated: string;
    
    // Glass Effects - Inspired by Apple's Liquid Glass
    glass: {
      background: string;
      border: string;
      shadow: string;
    };
    
    // Text Hierarchy
    text: string;
    textSecondary: string;
    textMuted: string;
    textInverse: string;
    textOnPrimary: string;
    
    // Border System
    border: string;
    borderHover: string;
    borderFocus: string;
    borderSubtle: string;
    
    // Accent Colors - Contextual
    accent: string;
    accentHover: string;
    accentForeground: string;
    accentSubtle: string;
    
    // State Colors
    success: string;
    successHover: string;
    successForeground: string;
    successSubtle: string;
    
    warning: string;
    warningHover: string;
    warningForeground: string;
    warningSubtle: string;
    
    error: string;
    errorHover: string;
    errorForeground: string;
    errorSubtle: string;
    
    info: string;
    infoHover: string;
    infoForeground: string;
    infoSubtle: string;
    
    // Component-specific
    button: {
      ghost: string;
      ghostHover: string;
      outline: string;
      outlineHover: string;
      destructive: string;
      destructiveHover: string;
    };
    
    input: {
      background: string;
      backgroundFocus: string;
      placeholder: string;
      border: string;
      borderFocus: string;
    };
    
    modal: {
      overlay: string;
      background: string;
      border: string;
      shadow: string;
    };
    
    sidebar: {
      background: string;
      border: string;
      itemHover: string;
      itemActive: string;
    };
    
    timeline: {
      background: string;
      track: string;
      segment: string;
      segmentHover: string;
      segmentActive: string;
      playhead: string;
    };
  };
  
  // Spacing system inspired by liquid flow
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  
  // Radius system for liquid corners
  radius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  
  // Shadow system for depth
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    glass: string;
  };
  
  // Typography scale
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      xxl: string;
      xxxl: string;
    };
    fontWeight: {
      normal: string;
      medium: string;
      semibold: string;
      bold: string;
    };
    lineHeight: {
      tight: string;
      normal: string;
      relaxed: string;
    };
  };
}

// Eye-Friendly Light Theme - Warm Off-White & Blue
const lightTheme: Theme = {
  mode: 'light',
  colors: {
    // Primary Blue Scale - Tailwind CSS Blue (Trust & Professionalism)
    primary: '#3B82F6',           // Tailwind Blue-500
    primaryHover: '#2563EB',      // Tailwind Blue-600  
    primaryActive: '#1D4ED8',     // Tailwind Blue-700
    primaryForeground: '#FFFFFF', // White text on blue
    primarySubtle: '#EBF4FF',     // Warm blue-50 tint
    
    // Secondary Blue Scale - Muted Blue for secondary actions
    secondary: '#60A5FA',         // Tailwind Blue-400 (lighter)
    secondaryHover: '#3B82F6',    // Tailwind Blue-500
    secondaryActive: '#2563EB',   // Tailwind Blue-600
    secondaryForeground: '#FFFFFF', // White text
    secondarySubtle: '#DBEAFE',   // Blue-100 for subtle backgrounds
    
    // Background System - Gradient (Eye Strain Prevention)
    background: '#ECEAE8',        // Custom warm gray background
    backgroundSecondary: '#E8E5E3', // Slightly deeper warm gray
    backgroundTertiary: '#E3E0DE', // Deeper warm gray for panels
    surface: '#ECEAE8',           // Main surface color matches background
    surfaceHover: '#E8E5E3',      // Light warm hover
    surfaceActive: '#E3E0DE',     // Warm active state
    surfaceElevated: '#FFFFFF',   // Pure white only for modals/elevated elements
    
    // Glass Effects - Figma-Style Subtle Mist
    glass: {
      background: 'rgba(242, 240, 239, 0.95)', // Subtle Mist glass effect
      border: 'rgba(59, 130, 246, 0.15)',      // Soft blue border
      shadow: '0 8px 32px rgba(59, 130, 246, 0.08)', // Very soft blue shadow
    },
    
    // Text Hierarchy - Blue-Gray Palette (Canva-Inspired)
    text: '#1E293B',              // Dark blue-gray (professional, easy on eyes)
    textSecondary: '#475569',     // Medium blue-gray  
    textMuted: '#94A3B8',         // Light blue-gray
    textInverse: '#FAFBFC',       // Subtle off-white
    textOnPrimary: '#FFFFFF',     // White on blue
    
    // Border System - Blue-Gray Palette  
    border: '#E2E8F0',            // Light blue-gray border
    borderHover: '#CBD5E1',       // Medium blue-gray hover
    borderFocus: '#3B82F6',       // Blue focus (trust signal)
    borderSubtle: '#F1F5F9',      // Very light blue-gray
    
    // Accent Colors - Tailwind CSS Blue
    accent: '#3B82F6',            // Tailwind Blue-500
    accentHover: '#2563EB',       // Tailwind Blue-600
    accentForeground: '#FFFFFF',
    accentSubtle: '#EFF6FF',      // Tailwind Blue-50
    
    // State Colors
    success: '#10B981',           // Emerald-500
    successHover: '#059669',      // Emerald-600
    successForeground: '#FFFFFF',
    successSubtle: '#ECFDF5',     // Emerald-50
    
    warning: '#F59E0B',           // Amber-500
    warningHover: '#D97706',      // Amber-600
    warningForeground: '#FFFFFF',
    warningSubtle: '#FFFBEB',     // Amber-50
    
    error: '#EF4444',             // Red-500
    errorHover: '#DC2626',        // Red-600
    errorForeground: '#FFFFFF',
    errorSubtle: '#FEF2F2',       // Red-50
    
    info: '#3B82F6',              // Tailwind Blue-500
    infoHover: '#2563EB',         // Tailwind Blue-600
    infoForeground: '#FFFFFF',
    infoSubtle: '#EFF6FF',        // Tailwind Blue-50
    
    // Component-specific - Blue-Heavy Design (Canva-Inspired)
    button: {
      ghost: 'transparent',
      ghostHover: '#F0F4F8',      // Light blue-gray hover
      outline: 'transparent',
      outlineHover: '#DBEAFE',    // Blue-100 emphasis
      destructive: '#EF4444',     // Red-500
      destructiveHover: '#DC2626', // Red-600
    },
    
    input: {
      background: '#F2F0EF',      // Subtle Mist background
      backgroundFocus: '#EBF4FF', // Soft blue focus background
      placeholder: '#94A3B8',     // Blue-gray placeholder
      border: '#E2E8F0',          // Light blue-gray border
      borderFocus: '#3B82F6',     // Blue focus for trust
    },
    
    modal: {
      overlay: 'rgba(30, 41, 59, 0.6)', // Blue-gray overlay
      background: '#FFFFFF',      // Pure white for modals (highest contrast)
      border: '#E2E8F0',          // Blue-gray border
      shadow: '0 25px 50px -12px rgba(59, 130, 246, 0.15)', // Blue shadow
    },
    
    sidebar: {
      background: '#EDEAE8',      // Deeper Subtle Mist for styling panel
      border: '#E2E8F0',          // Blue-gray border
      itemHover: '#EBF4FF',       // Blue hover for emphasis
      itemActive: '#DBEAFE',      // Strong blue active state
    },
    
    timeline: {
      background: '#EDEAE8',      // Deeper Subtle Mist for timeline
      track: '#E7E3E1',           // Even deeper warm gray track
      segment: '#3B82F6',         // Primary blue segments
      segmentHover: '#2563EB',    // Darker blue hover
      segmentActive: '#1D4ED8',   // Active blue state
      playhead: '#EF4444',        // Red playhead for contrast
    },
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  
  radius: {
    none: '0px',
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  
  shadows: {
    sm: '0 1px 2px rgba(15, 23, 42, 0.05)',
    md: '0 4px 6px rgba(15, 23, 42, 0.1)',
    lg: '0 10px 15px rgba(15, 23, 42, 0.1)',
    xl: '0 20px 25px rgba(15, 23, 42, 0.1)',
    glass: '0 8px 32px rgba(59, 130, 246, 0.1)',
  },
  
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      xxl: '24px',
      xxxl: '32px',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },
};

// Single theme - no dark mode needed

// Theme context interface - Simplified for single theme
interface ThemeContextType {
  theme: Theme;
}

// Create context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme provider component
interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Always use the single light theme
  const theme = lightTheme;

  // Apply theme CSS variables on mount
  useEffect(() => {
    // Apply theme to document body
    document.body.setAttribute('data-theme', 'light');
    
    // Set CSS custom properties for liquid design
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      if (typeof value === 'string') {
        root.style.setProperty(`--color-${key}`, value);
      } else if (typeof value === 'object') {
        Object.entries(value).forEach(([subKey, subValue]) => {
          root.style.setProperty(`--color-${key}-${subKey}`, subValue);
        });
      }
    });
    
    // Set spacing variables
    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value);
    });
    
    // Set radius variables
    Object.entries(theme.radius).forEach(([key, value]) => {
      root.style.setProperty(`--radius-${key}`, value);
    });
    
    // Set shadow variables
    Object.entries(theme.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--shadow-${key}`, value);
    });
  }, []);

  const value: ThemeContextType = {
    theme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Export theme types and constants
export type { Theme };
export { lightTheme };