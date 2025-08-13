import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { IconButton } from './Button';
import { FiX } from 'react-icons/fi';

interface LiquidModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
  showCloseButton?: boolean;
}

/**
 * LiquidModal - A reusable modal component with liquid design principles
 * Features glassmorphism, gradient backgrounds, and smooth animations
 */
const LiquidModal: React.FC<LiquidModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  maxWidth = '600px',
  showCloseButton = true,
}) => {
  const { theme } = useTheme();

  if (!isOpen) return null;

  return (
    <>
      {/* CSS Animations */}
      <style>
        {`
          @keyframes liquidFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes liquidSlideUp {
            from { 
              opacity: 0; 
              transform: translateY(32px) scale(0.96);
            }
            to { 
              opacity: 1; 
              transform: translateY(0) scale(1);
            }
          }
        `}
      </style>
      
      {/* Modal Backdrop */}
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
        animation: 'liquidFadeIn 0.3s ease-out',
        padding: '20px'
      }} onClick={(e) => e.target === e.currentTarget && onClose()}>
        
        {/* Modal Container */}
        <div style={{
          background: `linear-gradient(145deg, ${theme.colors.modal.background} 0%, rgba(255, 255, 255, 0.95) 100%)`,
          borderRadius: '24px',
          border: `1px solid rgba(255, 255, 255, 0.2)`,
          padding: '0',
          width: '100%',
          maxWidth,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: `
            0 32px 64px rgba(0, 0, 0, 0.12),
            0 8px 32px rgba(59, 130, 246, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.4)
          `,
          position: 'relative',
          overflow: 'hidden',
          backdropFilter: 'blur(20px)',
          animation: 'liquidSlideUp 0.4s ease-out',
          color: theme.colors.text
        }}>
          
          {/* Modal Header */}
          <div style={{
            padding: '24px 32px',
            borderBottom: `1px solid rgba(255, 255, 255, 0.1)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: `linear-gradient(145deg, ${theme.colors.modal.background} 0%, rgba(255, 255, 255, 0.9) 100%)`,
            position: 'relative'
          }}>
            
            {/* Title Section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
              {icon && (
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: `linear-gradient(135deg, ${theme.colors.primary} 0%, #2563eb 100%)`,
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `
                    0 8px 32px rgba(59, 130, 246, 0.25),
                    inset 0 2px 4px rgba(255, 255, 255, 0.3)
                  `,
                  flexShrink: 0
                }}>
                  {icon}
                </div>
              )}
              
              <div style={{ flex: 1 }}>
                <h2 style={{
                  margin: '0 0 4px 0',
                  fontSize: '24px',
                  fontWeight: '800',
                  background: `linear-gradient(135deg, ${theme.colors.text} 0%, #374151 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  lineHeight: '1.2',
                  letterSpacing: '-0.5px'
                }}>
                  {title}
                </h2>
                
                {subtitle && (
                  <p style={{
                    margin: 0,
                    fontSize: '14px',
                    color: theme.colors.textSecondary,
                    lineHeight: '1.5',
                    fontWeight: '500',
                    opacity: 0.9
                  }}>
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            
            {/* Close Button */}
            {showCloseButton && (
              <div style={{ flexShrink: 0, marginLeft: '16px' }}>
                <IconButton
                  icon={<FiX size={18} />}
                  onClick={onClose}
                  variant="ghost"
                  size="sm"
                  aria-label="Close modal"
                />
              </div>
            )}
          </div>
          
          {/* Modal Content */}
          <div style={{
            background: `linear-gradient(145deg, ${theme.colors.modal.background} 0%, rgba(255, 255, 255, 0.95) 100%)`,
            flex: 1,
            overflow: 'auto'
          }}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

export default LiquidModal; 
