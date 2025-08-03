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
      backdropFilter: 'blur(8px)'
    }}>
      <div style={{
        backgroundColor: theme.colors.modal.background,
        borderRadius: '16px',
        border: `1px solid ${theme.colors.modal.border}`,
        padding: '0',
        minWidth: '500px',
        maxWidth: '600px',
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        position: 'relative',
        overflow: 'hidden'
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
            width: '80px',
            height: '80px',
            backgroundColor: theme.colors.success,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            position: 'relative',
            boxShadow: `0 0 0 8px ${theme.colors.success}20`
          }}>
            <FiCheckCircle size={40} color={theme.colors.successForeground} />
          </div>

          <h2 style={{ 
            margin: '0 0 12px 0', 
            fontSize: '28px',
            fontWeight: '700',
            color: theme.colors.text,
            lineHeight: '1.2'
          }}>
            Export Complete!
          </h2>

          <p style={{
            margin: '0 0 0 0',
            fontSize: '16px',
            color: theme.colors.textSecondary,
            lineHeight: '1.5',
            fontWeight: '400'
          }}>
            Your video with captions has been successfully exported.
          </p>
        </div>

        {/* File Info Section */}
        <div style={{ padding: '0 32px 32px' }}>
          <div style={{
            backgroundColor: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: theme.colors.primary,
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FiFolder size={16} color={theme.colors.primaryForeground} />
              </div>
              <h3 style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: '600',
                color: theme.colors.text
              }}>
                Export Details
              </h3>
            </div>
            
            <div style={{
              backgroundColor: theme.colors.background,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: '8px',
              padding: '16px'
            }}>
              <div style={{
                fontSize: '12px',
                color: theme.colors.textSecondary,
                marginBottom: '8px',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                File Name
              </div>
              <div style={{
                fontSize: '14px',
                color: theme.colors.text,
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                lineHeight: '1.4',
                marginBottom: '12px',
                fontWeight: '500'
              }}>
                {fileName}
              </div>
              
              <div style={{
                fontSize: '12px',
                color: theme.colors.textSecondary,
                marginBottom: '8px',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Location
              </div>
              <div style={{
                fontSize: '12px',
                color: theme.colors.textMuted,
                wordBreak: 'break-all',
                lineHeight: '1.4',
                fontFamily: 'monospace'
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
  );
};

export default SuccessModal;