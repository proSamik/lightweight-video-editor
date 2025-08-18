import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { LiquidModal } from './ui';
import { ExportVideoIcon } from './IconComponents';

interface ExportProcessingModalProps {
  isOpen: boolean;
  message?: string;
  progress?: number;
  elapsedTime?: number;
  onCancel?: () => void;
  onClose?: () => void;
}

/**
 * ExportProcessingModal
 * Displays a LiquidModal-based progress dialog during export operations.
 * This replaces the legacy full-screen loading screen with a modern, non-blocking overlay.
 */
const ExportProcessingModal: React.FC<ExportProcessingModalProps> = ({
  isOpen,
  message,
  progress,
  elapsedTime,
  onCancel,
  onClose
}) => {
  const { theme } = useTheme();

  return (
    <LiquidModal
      isOpen={isOpen}
      onClose={onClose || (() => {})}
      title="Exporting Video"
      subtitle={message || 'Processing export...'}
      icon={<ExportVideoIcon size={18} />}
      maxWidth="560px"
      showCloseButton={false}
    >
      <div style={{ padding: '20px' }}>
        {/* Progress Bar */}
        {progress !== undefined && (
          <div style={{ width: '100%', marginTop: '8px' }}>
            <div style={{
              width: '100%',
              height: '10px',
              backgroundColor: theme.colors.background,
              borderRadius: '6px',
              overflow: 'hidden',
              border: `1px solid ${theme.colors.border}`
            }}>
              <div style={{
                width: `${Math.max(0, Math.min(100, progress))}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${theme.colors.primary} 0%, #60a5fa 100%)`,
                transition: 'width 0.3s ease',
                borderRadius: '6px'
              }} />
            </div>
            <div style={{
              marginTop: '8px',
              fontSize: '13px',
              color: theme.colors.textSecondary,
              textAlign: 'right'
            }}>
              {isNaN(progress) ? '0' : Math.round(progress)}%
            </div>
          </div>
        )}

        {/* Elapsed Time */}
        {elapsedTime !== undefined && (
          <div style={{ marginTop: '12px', fontSize: '13px', color: theme.colors.textSecondary }}>
            Elapsed Time: {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
          </div>
        )}

        {/* Actions */}
        <div style={{
          marginTop: '20px',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px'
        }}>
          {onCancel && (
            <button
              onClick={onCancel}
              style={{
                padding: '10px 16px',
                backgroundColor: theme.colors.error,
                color: theme.colors.errorForeground,
                border: 'none',
                borderRadius: theme.radius.md,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600
              }}
            >
              Cancel Export
            </button>
          )}
        </div>
      </div>
    </LiquidModal>
  );
};

export default ExportProcessingModal;


