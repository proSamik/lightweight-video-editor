import React from 'react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string;
  onShowInFinder: () => void;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  filePath,
  onShowInFinder
}) => {
  if (!isOpen) return null;

  const fileName = filePath.split('/').pop() || 'video';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#2a2a2a',
        borderRadius: '12px',
        padding: '32px',
        minWidth: '400px',
        maxWidth: '500px',
        border: '1px solid #444',
        textAlign: 'center'
      }}>
        {/* Success Icon */}
        <div style={{
          width: '80px',
          height: '80px',
          backgroundColor: '#28a745',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: '40px'
        }}>
          ✅
        </div>

        <h2 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '24px',
          color: '#fff'
        }}>
          Export Complete!
        </h2>

        <p style={{
          margin: '0 0 24px 0',
          fontSize: '16px',
          color: '#ccc',
          lineHeight: '1.5'
        }}>
          Your video with captions has been successfully exported.
        </p>

        {/* File Info */}
        <div style={{
          backgroundColor: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
          textAlign: 'left'
        }}>
          <div style={{
            fontSize: '12px',
            color: '#888',
            marginBottom: '4px'
          }}>
            File saved as:
          </div>
          <div style={{
            fontSize: '14px',
            color: '#fff',
            fontFamily: 'monospace',
            wordBreak: 'break-all',
            lineHeight: '1.4'
          }}>
            {fileName}
          </div>
          <div style={{
            fontSize: '11px',
            color: '#666',
            marginTop: '8px',
            wordBreak: 'break-all'
          }}>
            {filePath}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center'
        }}>
          <button
            onClick={onShowInFinder}
            style={{
              padding: '12px 24px',
              backgroundColor: '#007acc',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            📁 Show in Finder
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              backgroundColor: '#444',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Close
          </button>
        </div>

        {/* Celebration animation */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '24px',
          animation: 'celebration 2s ease-in-out infinite'
        }}>
          🎉
        </div>

        <style>{`
          @keyframes celebration {
            0%, 100% { transform: translateX(-50%) translateY(0px) rotate(0deg); }
            25% { transform: translateX(-50%) translateY(-10px) rotate(-15deg); }
            75% { transform: translateX(-50%) translateY(-5px) rotate(15deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default SuccessModal;