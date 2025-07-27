import React from 'react';

interface LoadingScreenProps {
  message: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message }) => {
  return (
    <div style={{
      height: '100vh',
      backgroundColor: '#1a1a1a',
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      textAlign: 'center'
    }}>
      <div style={{
        width: '60px',
        height: '60px',
        border: '4px solid #333',
        borderTop: '4px solid #007acc',
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
        margin: 0, 
        fontSize: '16px',
        color: '#ccc',
        maxWidth: '400px',
        lineHeight: '1.4'
      }}>
        {message}
      </p>
      
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