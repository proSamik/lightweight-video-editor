import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface LoadingScreenProps {
  message: string;
  progress?: number; // Progress percentage (0-100)
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message, progress }) => {
  const { theme } = useTheme();
  return (
    <div style={{
      height: '100vh',
      backgroundColor: theme.colors.background,
      color: theme.colors.text,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      textAlign: 'center'
    }}>
      <div style={{
        width: '60px',
        height: '60px',
        border: `4px solid ${theme.colors.border}`,
        borderTop: `4px solid ${theme.colors.primary}`,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '20px'
      }} />
      
      <h2 style={{ 
        margin: '0 0 10px 0', 
        fontSize: '24px',
        fontWeight: 'normal'
      }}>
        Processing...
      </h2>
      
      <p style={{ 
        margin: '0 0 20px 0', 
        fontSize: '16px',
        color: theme.colors.textSecondary,
        maxWidth: '400px',
        lineHeight: '1.4'
      }}>
        {message}
      </p>
      
      {progress !== undefined && (
        <div style={{ width: '300px', marginTop: '10px' }}>
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: theme.colors.background,
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${Math.max(0, Math.min(100, progress))}%`,
              height: '100%',
              backgroundColor: theme.colors.primary,
              transition: 'width 0.3s ease',
              borderRadius: '4px'
            }} />
          </div>
          <div style={{
            marginTop: '8px',
            fontSize: '14px',
            color: theme.colors.textSecondary,
            textAlign: 'center'
          }}>
            {Math.round(progress)}%
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;