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

// Light Theme - White & Blue (Trust & Clean)
const lightTheme: Theme = {
  mode: 'light',
  colors: {
    // Primary Blue Scale - Tailwind CSS Blue
    primary: '#3B82F6',           // Tailwind Blue-500
    primaryHover: '#2563EB',      // Tailwind Blue-600  
    primaryActive: '#1D4ED8',     // Tailwind Blue-700
    primaryForeground: '#FFFFFF', // White
    primarySubtle: '#EFF6FF',     // Tailwind Blue-50
    
    // Secondary Blue Scale - Softer Trust
    secondary: '#6B7280',         // Gray-500 with blue undertone
    secondaryHover: '#4B5563',    // Gray-600
    secondaryActive: '#374151',   // Gray-700
    secondaryForeground: '#FFFFFF',
    secondarySubtle: '#F8FAFC',   // Slate-50
    
    // Background System - Clean White Layers
    background: '#FFFFFF',        // Pure white
    backgroundSecondary: '#F8FAFC', // Slate-50
    backgroundTertiary: '#F1F5F9', // Slate-100
    surface: '#FFFFFF',
    surfaceHover: '#F8FAFC',
    surfaceActive: '#F1F5F9',
    surfaceElevated: '#FFFFFF',
    
    // Glass Effects - Tailwind CSS Blue
    glass: {
      background: 'rgba(255, 255, 255, 0.8)',
      border: 'rgba(59, 130, 246, 0.15)',    // Tailwind Blue-500 with opacity
      shadow: '0 8px 32px rgba(59, 130, 246, 0.12)', // Tailwind Blue shadow
    },
    
    // Text Hierarchy
    text: '#0F172A',              // Slate-900
    textSecondary: '#475569',     // Slate-600
    textMuted: '#94A3B8',         // Slate-400
    textInverse: '#FFFFFF',
    textOnPrimary: '#FFFFFF',
    
    // Border System
    border: '#E2E8F0',            // Slate-200
    borderHover: '#CBD5E1',       // Slate-300
    borderFocus: '#3B82F6',       // Blue-500
    borderSubtle: '#F1F5F9',      // Slate-100
    
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
    
    // Component-specific
    button: {
      ghost: 'transparent',
      ghostHover: '#F8FAFC',      // Slate-50
      outline: 'transparent',
      outlineHover: '#EFF6FF',    // Blue-50
      destructive: '#EF4444',     // Red-500
      destructiveHover: '#DC2626', // Red-600
    },
    
    input: {
      background: '#FFFFFF',
      backgroundFocus: '#FFFFFF',
      placeholder: '#94A3B8',     // Slate-400
      border: '#E2E8F0',          // Slate-200
      borderFocus: '#3B82F6',     // Blue-500
    },
    
    modal: {
      overlay: 'rgba(15, 23, 42, 0.5)', // Slate-900 with opacity
      background: '#FFFFFF',
      border: '#E2E8F0',          // Slate-200
      shadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
    },
    
    sidebar: {
      background: '#F8FAFC',      // Slate-50
      border: '#E2E8F0',          // Slate-200
      itemHover: '#EFF6FF',       // Blue-50
      itemActive: '#DBEAFE',      // Blue-100
    },
    
    timeline: {
      background: '#F8FAFC',      // Slate-50
      track: '#E2E8F0',           // Slate-200
      segment: '#3B82F6',         // Tailwind Blue-500
      segmentHover: '#2563EB',    // Tailwind Blue-600
      segmentActive: '#1D4ED8',   // Tailwind Blue-700
      playhead: '#EF4444',        // Red-500
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

// Dark Theme - Black & Blue (Professional & Trustworthy)
const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    // Primary Blue Scale - Tailwind CSS Blue for Dark Mode
    primary: '#60A5FA',           // Tailwind Blue-400 (vibrant for dark)
    primaryHover: '#3B82F6',      // Tailwind Blue-500
    primaryActive: '#2563EB',     // Tailwind Blue-600
    primaryForeground: '#0F172A', // Slate-900
    primarySubtle: '#1E3A8A',     // Tailwind Blue-900
    
    // Secondary Blue Scale
    secondary: '#64748B',         // Slate-500
    secondaryHover: '#94A3B8',    // Slate-400
    secondaryActive: '#CBD5E1',   // Slate-300
    secondaryForeground: '#0F172A',
    secondarySubtle: '#1E293B',   // Slate-800
    
    // Background System - Modern Blue-Tinted Dark
    background: '#0C1426',        // Deep blue-black (custom)
    backgroundSecondary: '#1E293B', // Blue-slate-800 
    backgroundTertiary: '#1E3A8A', // Tailwind Blue-900
    surface: '#172554',           // Tailwind Blue-950
    surfaceHover: '#1E3A8A',      // Tailwind Blue-900
    surfaceActive: '#1D4ED8',     // Tailwind Blue-700
    surfaceElevated: '#1E3A8A',   // Tailwind Blue-900
    
    // Glass Effects - Blue-Tinted Modern
    glass: {
      background: 'rgba(23, 37, 84, 0.8)',  // Blue-950 with opacity
      border: 'rgba(96, 165, 250, 0.3)',    // Tailwind Blue-400 with opacity
      shadow: '0 8px 32px rgba(96, 165, 250, 0.15)', // Enhanced blue glow
    },
    
    // Text Hierarchy
    text: '#F8FAFC',              // Slate-50
    textSecondary: '#CBD5E1',     // Slate-300
    textMuted: '#64748B',         // Slate-500
    textInverse: '#0F172A',       // Slate-900
    textOnPrimary: '#0F172A',     // Slate-900
    
    // Border System - Blue-Tinted
    border: '#1E3A8A',            // Tailwind Blue-900
    borderHover: '#1D4ED8',       // Tailwind Blue-700
    borderFocus: '#60A5FA',       // Tailwind Blue-400
    borderSubtle: '#172554',      // Tailwind Blue-950
    
    // Accent Colors - Tailwind CSS Blue
    accent: '#60A5FA',            // Tailwind Blue-400
    accentHover: '#3B82F6',       // Tailwind Blue-500
    accentForeground: '#0F172A',
    accentSubtle: '#1E3A8A',      // Tailwind Blue-900
    
    // State Colors
    success: '#34D399',           // Emerald-400
    successHover: '#10B981',      // Emerald-500
    successForeground: '#0F172A',
    successSubtle: '#064E3B',     // Emerald-900
    
    warning: '#FBBF24',           // Amber-400
    warningHover: '#F59E0B',      // Amber-500
    warningForeground: '#0F172A',
    warningSubtle: '#451A03',     // Amber-900
    
    error: '#F87171',             // Red-400
    errorHover: '#EF4444',        // Red-500
    errorForeground: '#0F172A',
    errorSubtle: '#450A0A',       // Red-900
    
    info: '#60A5FA',              // Tailwind Blue-400
    infoHover: '#3B82F6',         // Tailwind Blue-500
    infoForeground: '#0F172A',
    infoSubtle: '#1E3A8A',        // Tailwind Blue-900
    
    // Component-specific
    button: {
      ghost: 'transparent',
      ghostHover: '#1E293B',      // Slate-800
      outline: 'transparent',
      outlineHover: '#1E293B',    // Slate-800
      destructive: '#F87171',     // Red-400
      destructiveHover: '#EF4444', // Red-500
    },
    
    input: {
      background: '#172554',      // Tailwind Blue-950
      backgroundFocus: '#1E3A8A', // Tailwind Blue-900
      placeholder: '#64748B',     // Slate-500
      border: '#1E3A8A',          // Tailwind Blue-900
      borderFocus: '#60A5FA',     // Tailwind Blue-400
    },
    
    modal: {
      overlay: 'rgba(12, 20, 38, 0.9)', // Blue-tinted overlay
      background: '#172554',      // Tailwind Blue-950
      border: '#1E3A8A',          // Tailwind Blue-900
      shadow: '0 25px 50px -12px rgba(96, 165, 250, 0.3)', // Blue shadow
    },
    
    sidebar: {
      background: '#172554',      // Tailwind Blue-950
      border: '#1E3A8A',          // Tailwind Blue-900
      itemHover: '#1E3A8A',       // Tailwind Blue-900
      itemActive: '#1D4ED8',      // Tailwind Blue-700
    },
    
    timeline: {
      background: '#172554',      // Tailwind Blue-950
      track: '#1E3A8A',           // Tailwind Blue-900
      segment: '#60A5FA',         // Tailwind Blue-400
      segmentHover: '#3B82F6',    // Tailwind Blue-500
      segmentActive: '#2563EB',   // Tailwind Blue-600
      playhead: '#F87171',        // Red-400
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
    sm: '0 1px 2px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px rgba(0, 0, 0, 0.2)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.3)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.4)',
    glass: '0 8px 32px rgba(0, 0, 0, 0.3)',
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

// Theme context interface
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (mode: 'light' | 'dark') => void;
}

// Create context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme provider component
interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Try to get saved theme from localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme === 'light' ? lightTheme : darkTheme;
    }
    // Default to light theme (professional trust)
    return lightTheme;
  });

  // Function to set theme
  const setTheme = (mode: 'light' | 'dark') => {
    const newTheme = mode === 'light' ? lightTheme : darkTheme;
    setThemeState(newTheme);
    localStorage.setItem('theme', mode);
    
    // Apply theme to document body for global CSS variables
    document.body.setAttribute('data-theme', mode);
    
    // Set CSS custom properties for liquid design
    const root = document.documentElement;
    Object.entries(newTheme.colors).forEach(([key, value]) => {
      if (typeof value === 'string') {
        root.style.setProperty(`--color-${key}`, value);
      } else if (typeof value === 'object') {
        Object.entries(value).forEach(([subKey, subValue]) => {
          root.style.setProperty(`--color-${key}-${subKey}`, subValue);
        });
      }
    });
    
    // Set spacing variables
    Object.entries(newTheme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value);
    });
    
    // Set radius variables
    Object.entries(newTheme.radius).forEach(([key, value]) => {
      root.style.setProperty(`--radius-${key}`, value);
    });
    
    // Set shadow variables
    Object.entries(newTheme.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--shadow-${key}`, value);
    });
  };

  // Function to toggle theme
  const toggleTheme = () => {
    const newMode = theme.mode === 'light' ? 'dark' : 'light';
    setTheme(newMode);
  };

  // Apply theme to document on mount and theme change
  useEffect(() => {
    setTheme(theme.mode);
  }, [theme.mode]);

  const value: ThemeContextType = {
    theme,
    toggleTheme,
    setTheme,
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
export { lightTheme, darkTheme };