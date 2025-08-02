import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { CelebrationIcon, ShowInFinderIcon } from './IconComponents';

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
  const { theme } = useTheme();
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
        backgroundColor: theme.colors.surface,
        borderRadius: '12px',
        padding: '32px',
        minWidth: '400px',
        maxWidth: '500px',
        border: `1px solid ${theme.colors.border}`,
        textAlign: 'center'
      }}>
        {/* Success Icon */}
        <div style={{
          width: '80px',
          height: '80px',
          backgroundColor: theme.colors.success,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          color: theme.colors.text
        }}>
          <CelebrationIcon size={40} />
        </div>

        <h2 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '24px',
          color: theme.colors.text
        }}>
          Export Complete!
        </h2>

        <p style={{
          margin: '0 0 24px 0',
          fontSize: '16px',
          color: theme.colors.textSecondary,
          lineHeight: '1.5'
        }}>
          Your video with captions has been successfully exported.
        </p>

        {/* File Info */}
        <div style={{
          backgroundColor: theme.colors.background,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
          textAlign: 'left'
        }}>
          <div style={{
            fontSize: '12px',
            color: theme.colors.textSecondary,
            marginBottom: '4px'
          }}>
            File saved as:
          </div>
          <div style={{
            fontSize: '14px',
            color: theme.colors.text,
            fontFamily: 'monospace',
            wordBreak: 'break-all',
            lineHeight: '1.4'
          }}>
            {fileName}
          </div>
          <div style={{
            fontSize: '11px',
            color: theme.colors.textSecondary,
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
              backgroundColor: theme.colors.primary,
              color: theme.colors.text,
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
            <ShowInFinderIcon size={16} />
            Show in Finder
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              backgroundColor: theme.colors.surface,
              color: theme.colors.text,
              border: `1px solid ${theme.colors.border}`,
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
          animation: 'celebration 2s ease-in-out infinite',
          color: theme.colors.text
        }}>
          <CelebrationIcon size={24} />
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