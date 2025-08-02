import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Theme interface
interface Theme {
  mode: 'light' | 'dark';
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
}

// Default themes
const lightTheme: Theme = {
  mode: 'light',
  colors: {
    primary: '#3b82f6', // Blue
    secondary: '#6b7280', // Gray
    background: '#ffffff',
    surface: '#f9fafb',
    text: '#111827',
    textSecondary: '#6b7280',
    border: '#d1d5db',
    accent: '#8b5cf6', // Purple
    success: '#10b981', // Green
    warning: '#f59e0b', // Amber
    error: '#ef4444', // Red
    info: '#06b6d4', // Cyan
  },
};

const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    primary: '#3b82f6', // Blue
    secondary: '#71717a', // Zinc
    background: '#18181b', // Zinc 900
    surface: '#27272a', // Zinc 800
    text: '#fafafa', // Zinc 50
    textSecondary: '#a1a1aa', // Zinc 400
    border: '#3f3f46', // Zinc 700
    accent: '#8b5cf6', // Purple
    success: '#10b981', // Green
    warning: '#f59e0b', // Amber
    error: '#ef4444', // Red
    info: '#06b6d4', // Cyan
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