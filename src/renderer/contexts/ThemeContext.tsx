import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Enhanced theme interface with component-specific tokens
interface Theme {
  mode: 'light' | 'dark';
  colors: {
    // Base colors
    primary: string;
    primaryHover: string;
    primaryActive: string;
    primaryForeground: string;
    
    secondary: string;
    secondaryHover: string;
    secondaryActive: string;
    secondaryForeground: string;
    
    // Background variants
    background: string;
    backgroundSecondary: string;
    surface: string;
    surfaceHover: string;
    surfaceActive: string;
    
    // Text colors
    text: string;
    textSecondary: string;
    textMuted: string;
    textInverse: string;
    
    // Border colors
    border: string;
    borderHover: string;
    borderFocus: string;
    
    // State colors
    accent: string;
    accentHover: string;
    accentForeground: string;
    
    success: string;
    successHover: string;
    successForeground: string;
    
    warning: string;
    warningHover: string;
    warningForeground: string;
    
    error: string;
    errorHover: string;
    errorForeground: string;
    
    info: string;
    infoHover: string;
    infoForeground: string;
    
    // Component-specific colors
    button: {
      ghost: string;
      ghostHover: string;
      outline: string;
      outlineHover: string;
    };
    
    input: {
      background: string;
      backgroundFocus: string;
      placeholder: string;
    };
    
    modal: {
      overlay: string;
      background: string;
      border: string;
    };
  };
}

// Monochromatic theme with stone-700 colors
const lightTheme: Theme = {
  mode: 'light',
  colors: {
    // Base colors - all using stone scale
    primary: '#44403c',           // stone-700
    primaryHover: '#57534e',      // stone-600
    primaryActive: '#6b7280',     // stone-500
    primaryForeground: '#ffffff', // white
    
    secondary: '#a8a29e',         // stone-400
    secondaryHover: '#78716c',    // stone-500
    secondaryActive: '#57534e',   // stone-600
    secondaryForeground: '#ffffff',
    
    // Background variants
    background: '#ffffff',        // white
    backgroundSecondary: '#fafaf9', // stone-50
    surface: '#f5f5f4',          // stone-100
    surfaceHover: '#e7e5e4',     // stone-200
    surfaceActive: '#d6d3d1',    // stone-300
    
    // Text colors
    text: '#44403c',             // stone-700
    textSecondary: '#a8a29e',    // stone-400
    textMuted: '#78716c',        // stone-500
    textInverse: '#ffffff',      // white
    
    // Border colors
    border: '#e7e5e4',           // stone-200
    borderHover: '#d6d3d1',      // stone-300
    borderFocus: '#44403c',      // stone-700
    
    // State colors - using stone instead of colors
    accent: '#57534e',           // stone-600
    accentHover: '#44403c',      // stone-700
    accentForeground: '#ffffff',
    
    success: '#78716c',          // stone-500
    successHover: '#57534e',     // stone-600
    successForeground: '#ffffff',
    
    warning: '#a8a29e',          // stone-400
    warningHover: '#78716c',     // stone-500
    warningForeground: '#ffffff',
    
    error: '#44403c',            // stone-700
    errorHover: '#292524',       // stone-800
    errorForeground: '#ffffff',
    
    info: '#a8a29e',             // stone-400
    infoHover: '#78716c',        // stone-500
    infoForeground: '#ffffff',
    
    // Component-specific colors
    button: {
      ghost: 'transparent',
      ghostHover: '#f5f5f4',     // stone-100
      outline: 'transparent',
      outlineHover: '#fafaf9',   // stone-50
    },
    
    input: {
      background: '#ffffff',
      backgroundFocus: '#ffffff',
      placeholder: '#a8a29e',    // stone-400
    },
    
    modal: {
      overlay: 'rgba(0, 0, 0, 0.5)',
      background: '#ffffff',
      border: '#e7e5e4',         // stone-200
    },
  },
};

const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    // Base colors - monochromatic stone scale
    primary: '#fafaf9',           // stone-50
    primaryHover: '#f5f5f4',      // stone-100
    primaryActive: '#e7e5e4',     // stone-200
    primaryForeground: '#44403c', // stone-700
    
    secondary: '#a8a29e',         // stone-400
    secondaryHover: '#d6d3d1',    // stone-300
    secondaryActive: '#e7e5e4',   // stone-200
    secondaryForeground: '#44403c',
    
    // Background variants
    background: '#1c1917',        // stone-900
    backgroundSecondary: '#292524', // stone-800
    surface: '#44403c',          // stone-700
    surfaceHover: '#57534e',     // stone-600
    surfaceActive: '#78716c',    // stone-500
    
    // Text colors
    text: '#fafaf9',             // stone-50
    textSecondary: '#a8a29e',    // stone-400
    textMuted: '#78716c',        // stone-500
    textInverse: '#44403c',      // stone-700
    
    // Border colors
    border: '#57534e',           // stone-600
    borderHover: '#78716c',      // stone-500
    borderFocus: '#fafaf9',      // stone-50
    
    // State colors - using stone instead of colors
    accent: '#e7e5e4',           // stone-200
    accentHover: '#f5f5f4',      // stone-100
    accentForeground: '#44403c',
    
    success: '#a8a29e',          // stone-400
    successHover: '#d6d3d1',     // stone-300
    successForeground: '#44403c',
    
    warning: '#78716c',          // stone-500
    warningHover: '#a8a29e',     // stone-400
    warningForeground: '#44403c',
    
    error: '#fafaf9',            // stone-50
    errorHover: '#ffffff',       // white
    errorForeground: '#44403c',
    
    info: '#a8a29e',             // stone-400
    infoHover: '#d6d3d1',        // stone-300
    infoForeground: '#44403c',
    
    // Component-specific colors
    button: {
      ghost: 'transparent',
      ghostHover: '#44403c',     // stone-700
      outline: 'transparent',
      outlineHover: '#57534e',   // stone-600
    },
    
    input: {
      background: '#292524',     // stone-800
      backgroundFocus: '#44403c', // stone-700
      placeholder: '#78716c',    // stone-500
    },
    
    modal: {
      overlay: 'rgba(0, 0, 0, 0.8)',
      background: '#292524',     // stone-800
      border: '#57534e',         // stone-600
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
    // Default to dark theme
    return darkTheme;
  });

  // Function to set theme
  const setTheme = (mode: 'light' | 'dark') => {
    const newTheme = mode === 'light' ? lightTheme : darkTheme;
    setThemeState(newTheme);
    localStorage.setItem('theme', mode);
    
    // Apply theme to document body for global CSS variables
    document.body.setAttribute('data-theme', mode);
  };

  // Function to toggle theme
  const toggleTheme = () => {
    const newMode = theme.mode === 'light' ? 'dark' : 'light';
    setTheme(newMode);
  };

  // Apply theme to document on mount and theme change
  useEffect(() => {
    document.body.setAttribute('data-theme', theme.mode);
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