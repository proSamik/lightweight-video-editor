import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface TranscriptionSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (settings: { maxCharsPerLine: number; maxWordsPerLine: number }) => void;
}

const TranscriptionSettings: React.FC<TranscriptionSettingsProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  const { theme } = useTheme();
  const [maxCharsPerLine, setMaxCharsPerLine] = useState(16);
  const [maxWordsPerLine, setMaxWordsPerLine] = useState(5);

  if (!isOpen) return null;

  const handleConfirm = () => {
    // Validate inputs before confirming
    if (maxCharsPerLine < 12) {
      alert('Maximum characters per line must be at least 12');
      return;
    }
    if (maxWordsPerLine <= 0) {
      alert('Maximum words per line must be greater than 0');
      return;
    }
    
    onConfirm({ maxCharsPerLine, maxWordsPerLine });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.modal.overlay,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)'
    }}>
      <div style={{
        backgroundColor: theme.colors.modal.background,
        padding: '32px',
        borderRadius: theme.radius.xl,
        minWidth: '480px',
        border: theme.colors.modal.border,
        boxShadow: theme.colors.modal.shadow,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Blue gradient header */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: `linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
        }} />
        
        <h3 style={{ 
          margin: '0 0 24px 0', 
          fontSize: theme.typography.fontSize.xxl, 
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.text,
          fontFamily: theme.typography.fontFamily
        }}>
          Transcription Settings
        </h3>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '12px', 
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.medium,
            color: theme.colors.text,
            fontFamily: theme.typography.fontFamily
          }}>
            Maximum Characters per Line: <span style={{ color: theme.colors.primary, fontWeight: theme.typography.fontWeight.bold }}>{maxCharsPerLine}</span>
          </label>
          
          {/* Blue-themed range slider container */}
          <div style={{
            padding: theme.spacing.md,
            backgroundColor: theme.colors.primarySubtle,
            borderRadius: theme.radius.lg,
            border: `1px solid ${theme.colors.primary}20`,
            marginBottom: theme.spacing.sm
          }}>
            <input
              type="range"
              min="12"
              max="200"
              step="1"
              value={maxCharsPerLine}
              onChange={(e) => setMaxCharsPerLine(parseInt(e.target.value))}
              style={{
                width: '100%',
                height: '8px',
                borderRadius: '4px',
                background: `linear-gradient(to right, ${theme.colors.primary} 0%, ${theme.colors.primary} ${((maxCharsPerLine - 12) / (200 - 12)) * 100}%, ${theme.colors.border} ${((maxCharsPerLine - 12) / (200 - 12)) * 100}%, ${theme.colors.border} 100%)`,
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: theme.typography.fontSize.xs, color: theme.colors.primary, fontWeight: theme.typography.fontWeight.medium }}>
              <span>12</span>
              <span>200</span>
            </div>
          </div>
          
          <div style={{ 
            fontSize: theme.typography.fontSize.sm, 
            color: theme.colors.textSecondary,
            fontStyle: 'italic'
          }}>
            Text will wrap when this limit is reached
          </div>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '12px', 
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.medium,
            color: theme.colors.text,
            fontFamily: theme.typography.fontFamily
          }}>
            Maximum Words per Line: <span style={{ color: theme.colors.primary, fontWeight: theme.typography.fontWeight.bold }}>{maxWordsPerLine}</span>
          </label>
          
          {/* Blue-themed range slider container */}
          <div style={{
            padding: theme.spacing.md,
            backgroundColor: theme.colors.primarySubtle,
            borderRadius: theme.radius.lg,
            border: `1px solid ${theme.colors.primary}20`,
            marginBottom: theme.spacing.sm
          }}>
            <input
              type="range"
              min="3"
              max="20"
              step="1"
              value={maxWordsPerLine}
              onChange={(e) => setMaxWordsPerLine(parseInt(e.target.value))}
              style={{
                width: '100%',
                height: '8px',
                borderRadius: '4px',
                background: `linear-gradient(to right, ${theme.colors.primary} 0%, ${theme.colors.primary} ${((maxWordsPerLine - 3) / (20 - 3)) * 100}%, ${theme.colors.border} ${((maxWordsPerLine - 3) / (20 - 3)) * 100}%, ${theme.colors.border} 100%)`,
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: theme.typography.fontSize.xs, color: theme.colors.primary, fontWeight: theme.typography.fontWeight.medium }}>
              <span>3</span>
              <span>20</span>
            </div>
          </div>
          
          <div style={{ 
            fontSize: theme.typography.fontSize.sm, 
            color: theme.colors.textSecondary,
            fontStyle: 'italic'
          }}>
            Text will wrap after this many words
          </div>
        </div>

        <div style={{ 
          display: 'flex', 
          gap: theme.spacing.md, 
          justifyContent: 'flex-end',
          paddingTop: theme.spacing.lg,
          borderTop: `1px solid ${theme.colors.border}`
        }}>
          <button
            onClick={onClose}
            style={{
              padding: `${theme.spacing.md}px ${theme.spacing.xl}px`,
              backgroundColor: theme.colors.button.ghost,
              color: theme.colors.textSecondary,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.radius.md,
              cursor: 'pointer',
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.medium,
              fontFamily: theme.typography.fontFamily,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.button.ghostHover;
              e.currentTarget.style.borderColor = theme.colors.borderHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.button.ghost;
              e.currentTarget.style.borderColor = theme.colors.border;
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            style={{
              padding: `${theme.spacing.md}px ${theme.spacing.xl}px`,
              backgroundColor: theme.colors.primary,
              color: theme.colors.primaryForeground,
              border: 'none',
              borderRadius: theme.radius.md,
              cursor: 'pointer',
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.semibold,
              fontFamily: theme.typography.fontFamily,
              transition: 'all 0.2s ease',
              boxShadow: `0 2px 8px ${theme.colors.primary}30`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.primaryHover;
              e.currentTarget.style.boxShadow = `0 4px 12px ${theme.colors.primary}40`;
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.primary;
              e.currentTarget.style.boxShadow = `0 2px 8px ${theme.colors.primary}30`;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Start Transcription
          </button>
        </div>
      </div>
    </div>
  );
};

export default TranscriptionSettings; 