import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Button, LiquidModal } from './ui';
import { FiCheckCircle, FiFolder, FiSettings } from 'react-icons/fi';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string;
  onShowInFinder: () => void;
  elapsedSeconds?: number;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  filePath,
  onShowInFinder,
  elapsedSeconds
}) => {
  const { theme } = useTheme();
  if (!isOpen) return null;

  const fileName = filePath.split('/').pop() || 'video';

  return (
    <LiquidModal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Complete!"
      subtitle="Your video with captions has been successfully exported."
      icon={<FiSettings size={24} color="white" />}
      maxWidth="620px"
    >
      {/* Success Icon */}
      <div style={{ padding: '32px 32px 24px', textAlign: 'center' }}>
        <div style={{
          width: '96px',
          height: '96px',
          background: `
            linear-gradient(135deg, 
              ${theme.colors.success} 0%, 
              #22c55e 50%, 
              #16a34a 100%
            )
          `,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 32px',
          position: 'relative',
          boxShadow: `
            0 20px 40px rgba(34, 197, 94, 0.25),
            0 8px 16px rgba(34, 197, 94, 0.15),
            inset 0 2px 4px rgba(255, 255, 255, 0.3),
            0 0 0 12px rgba(34, 197, 94, 0.08)
          `,
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '50%',
            padding: '8px',
            backdropFilter: 'blur(4px)'
          }}>
            <FiCheckCircle size={48} color={theme.colors.successForeground} />
          </div>
        </div>
      </div>

      {/* File Info Section */}
      <div style={{ padding: '0 32px 32px' }}>
          <div style={{
            background: `
              linear-gradient(145deg, 
                rgba(255, 255, 255, 0.6) 0%, 
                rgba(255, 255, 255, 0.3) 100%
              )
            `,
            border: `1px solid rgba(255, 255, 255, 0.3)`,
            borderRadius: '20px',
            padding: '24px',
            marginBottom: '32px',
            textAlign: 'left',
            backdropFilter: 'blur(12px)',
            boxShadow: `
              0 8px 32px rgba(59, 130, 246, 0.06),
              inset 0 1px 0 rgba(255, 255, 255, 0.5)
            `
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: `linear-gradient(135deg, ${theme.colors.primary} 0%, #2563eb 100%)`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `
                  0 4px 16px rgba(59, 130, 246, 0.2),
                  inset 0 1px 0 rgba(255, 255, 255, 0.3)
                `
              }}>
                <FiFolder size={20} color={theme.colors.primaryForeground} />
              </div>
              <h3 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '700',
                color: theme.colors.text,
                letterSpacing: '-0.2px'
              }}>
                Export Details
              </h3>
            </div>
            
            <div style={{
              background: `
                linear-gradient(145deg, 
                  rgba(255, 255, 255, 0.8) 0%, 
                  rgba(249, 250, 251, 0.9) 100%
                )
              `,
              border: `1px solid rgba(255, 255, 255, 0.4)`,
              borderRadius: '16px',
              padding: '20px',
              backdropFilter: 'blur(8px)',
              boxShadow: `
                0 4px 16px rgba(0, 0, 0, 0.04),
                inset 0 1px 0 rgba(255, 255, 255, 0.6)
              `
            }}>
              <div style={{
                fontSize: '13px',
                color: theme.colors.textSecondary,
                marginBottom: '10px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                opacity: 0.8
              }}>
                File Name
              </div>
              <div style={{
                fontSize: '16px',
                color: theme.colors.text,
                fontFamily: 'ui-monospace, "SF Mono", "Monaco", "Cascadia Code", "Roboto Mono", monospace',
                wordBreak: 'break-all',
                lineHeight: '1.5',
                marginBottom: '20px',
                fontWeight: '600',
                background: `linear-gradient(135deg, ${theme.colors.text} 0%, #4b5563 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                {fileName}
              </div>

              {typeof elapsedSeconds === 'number' && (
                <>
                  <div style={{
                    fontSize: '13px',
                    color: theme.colors.textSecondary,
                    margin: '20px 0 10px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    opacity: 0.8
                  }}>
                    Time Taken
                  </div>
                  <div style={{
                    fontSize: '16px',
                    color: theme.colors.text,
                    fontFamily: 'ui-monospace, "SF Mono", "Monaco", "Cascadia Code", "Roboto Mono", monospace',
                    lineHeight: '1.5',
                    fontWeight: '600'
                  }}>
                    {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
                  </div>
                </>
              )}
              
              <div style={{
                fontSize: '13px',
                color: theme.colors.textSecondary,
                marginBottom: '10px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                opacity: 0.8
              }}>
                Location
              </div>
              <div style={{
                fontSize: '13px',
                color: theme.colors.textMuted,
                wordBreak: 'break-all',
                lineHeight: '1.6',
                fontFamily: 'ui-monospace, "SF Mono", "Monaco", "Cascadia Code", "Roboto Mono", monospace',
                opacity: 0.9,
                fontWeight: '500'
              }}>
                {filePath}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center'
          }}>
            <Button
              onClick={onShowInFinder}
              variant="primary"
              size="lg"
              leftIcon={<FiFolder size={16} />}
            >
              Show in Finder
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              size="lg"
            >
              Close
            </Button>
          </div>
        </div>
    </LiquidModal>
  );
};

export default SuccessModal;