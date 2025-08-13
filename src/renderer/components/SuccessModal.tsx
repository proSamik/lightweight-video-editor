import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Button, IconButton } from './ui';
import { FiCheckCircle, FiFolder, FiX } from 'react-icons/fi';

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
    <>
      {/* CSS Animations */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes slideUpFade {
            from { 
              opacity: 0; 
              transform: translateY(32px) scale(0.96);
            }
            to { 
              opacity: 1; 
              transform: translateY(0) scale(1);
            }
          }
          
          @keyframes pulse {
            0%, 100% { 
              transform: scale(1);
              box-shadow: 
                0 20px 40px rgba(34, 197, 94, 0.25),
                0 8px 16px rgba(34, 197, 94, 0.15),
                inset 0 2px 4px rgba(255, 255, 255, 0.3),
                0 0 0 12px rgba(34, 197, 94, 0.08);
            }
            50% { 
              transform: scale(1.05);
              box-shadow: 
                0 24px 48px rgba(34, 197, 94, 0.3),
                0 12px 20px rgba(34, 197, 94, 0.2),
                inset 0 2px 4px rgba(255, 255, 255, 0.4),
                0 0 0 16px rgba(34, 197, 94, 0.12);
            }
          }
        `}
      </style>
      
      <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <div style={{
        background: `linear-gradient(145deg, ${theme.colors.modal.background} 0%, rgba(255, 255, 255, 0.95) 100%)`,
        borderRadius: '24px',
        border: `1px solid rgba(255, 255, 255, 0.2)`,
        padding: '0',
        minWidth: '520px',
        maxWidth: '620px',
        textAlign: 'center',
        boxShadow: `
          0 32px 64px rgba(0, 0, 0, 0.12),
          0 8px 32px rgba(59, 130, 246, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.4)
        `,
        position: 'relative',
        overflow: 'hidden',
        backdropFilter: 'blur(20px)',
        animation: 'slideUpFade 0.4s ease-out'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '32px 32px 24px',
          position: 'relative'
        }}>
          {/* Close Button */}
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px'
          }}>
            <IconButton
              icon={<FiX size={18} />}
              onClick={onClose}
              variant="ghost"
              size="sm"
              aria-label="Close modal"
            />
          </div>

          {/* Success Icon */}
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
            animation: 'pulse 2s ease-in-out infinite'
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

          <h2 style={{ 
            margin: '0 0 16px 0', 
            fontSize: '32px',
            fontWeight: '800',
            background: `linear-gradient(135deg, ${theme.colors.text} 0%, #374151 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: '1.2',
            letterSpacing: '-0.5px'
          }}>
            Export Complete!
          </h2>

          <p style={{
            margin: '0 0 0 0',
            fontSize: '18px',
            color: theme.colors.textSecondary,
            lineHeight: '1.6',
            fontWeight: '500',
            opacity: 0.9
          }}>
            Your video with captions has been successfully exported.
          </p>
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

      </div>
    </div>
    </>
  );
};

export default SuccessModal;