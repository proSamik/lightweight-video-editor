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

// Monochromatic theme with only white/zinc colors
const lightTheme: Theme = {
  mode: 'light',
  colors: {
    // Base colors - all using zinc scale
    primary: '#18181b',           // zinc-900
    primaryHover: '#27272a',      // zinc-800
    primaryActive: '#3f3f46',     // zinc-700
    primaryForeground: '#ffffff', // white
    
    secondary: '#71717a',         // zinc-500
    secondaryHover: '#52525b',    // zinc-600
    secondaryActive: '#3f3f46',   // zinc-700
    secondaryForeground: '#ffffff',
    
    // Background variants
    background: '#ffffff',        // white
    backgroundSecondary: '#fafafa', // zinc-50
    surface: '#f4f4f5',          // zinc-100
    surfaceHover: '#e4e4e7',     // zinc-200
    surfaceActive: '#d4d4d8',    // zinc-300
    
    // Text colors
    text: '#18181b',             // zinc-900
    textSecondary: '#71717a',    // zinc-500
    textMuted: '#a1a1aa',        // zinc-400
    textInverse: '#ffffff',      // white
    
    // Border colors
    border: '#e4e4e7',           // zinc-200
    borderHover: '#d4d4d8',      // zinc-300
    borderFocus: '#18181b',      // zinc-900
    
    // State colors - using zinc instead of colors
    accent: '#27272a',           // zinc-800
    accentHover: '#18181b',      // zinc-900
    accentForeground: '#ffffff',
    
    success: '#52525b',          // zinc-600
    successHover: '#3f3f46',     // zinc-700
    successForeground: '#ffffff',
    
    warning: '#71717a',          // zinc-500
    warningHover: '#52525b',     // zinc-600
    warningForeground: '#ffffff',
    
    error: '#18181b',            // zinc-900
    errorHover: '#000000',       // black
    errorForeground: '#ffffff',
    
    info: '#71717a',             // zinc-500
    infoHover: '#52525b',        // zinc-600
    infoForeground: '#ffffff',
    
    // Component-specific colors
    button: {
      ghost: 'transparent',
      ghostHover: '#f4f4f5',     // zinc-100
      outline: 'transparent',
      outlineHover: '#fafafa',   // zinc-50
    },
    
    input: {
      background: '#ffffff',
      backgroundFocus: '#ffffff',
      placeholder: '#a1a1aa',    // zinc-400
    },
    
    modal: {
      overlay: 'rgba(0, 0, 0, 0.5)',
      background: '#ffffff',
      border: '#e4e4e7',         // zinc-200
    },
  },
};

const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    // Base colors - monochromatic zinc scale
    primary: '#fafafa',           // zinc-50
    primaryHover: '#f4f4f5',      // zinc-100
    primaryActive: '#e4e4e7',     // zinc-200
    primaryForeground: '#18181b', // zinc-900
    
    secondary: '#a1a1aa',         // zinc-400
    secondaryHover: '#d4d4d8',    // zinc-300
    secondaryActive: '#e4e4e7',   // zinc-200
    secondaryForeground: '#18181b',
    
    // Background variants
    background: '#09090b',        // zinc-950
    backgroundSecondary: '#18181b', // zinc-900
    surface: '#27272a',          // zinc-800
    surfaceHover: '#3f3f46',     // zinc-700
    surfaceActive: '#52525b',    // zinc-600
    
    // Text colors
    text: '#fafafa',             // zinc-50
    textSecondary: '#a1a1aa',    // zinc-400
    textMuted: '#71717a',        // zinc-500
    textInverse: '#18181b',      // zinc-900
    
    // Border colors
    border: '#3f3f46',           // zinc-700
    borderHover: '#52525b',      // zinc-600
    borderFocus: '#fafafa',      // zinc-50
    
    // State colors - using zinc instead of colors
    accent: '#e4e4e7',           // zinc-200
    accentHover: '#f4f4f5',      // zinc-100
    accentForeground: '#18181b',
    
    success: '#a1a1aa',          // zinc-400
    successHover: '#d4d4d8',     // zinc-300
    successForeground: '#18181b',
    
    warning: '#71717a',          // zinc-500
    warningHover: '#a1a1aa',     // zinc-400
    warningForeground: '#18181b',
    
    error: '#fafafa',            // zinc-50
    errorHover: '#ffffff',       // white
    errorForeground: '#18181b',
    
    info: '#a1a1aa',             // zinc-400
    infoHover: '#d4d4d8',        // zinc-300
    infoForeground: '#18181b',
    
    // Component-specific colors
    button: {
      ghost: 'transparent',
      ghostHover: '#27272a',     // zinc-800
      outline: 'transparent',
      outlineHover: '#3f3f46',   // zinc-700
    },
    
    input: {
      background: '#18181b',     // zinc-900
      backgroundFocus: '#27272a', // zinc-800
      placeholder: '#71717a',    // zinc-500
    },
    
    modal: {
      overlay: 'rgba(0, 0, 0, 0.8)',
      background: '#18181b',     // zinc-900
      border: '#3f3f46',         // zinc-700
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