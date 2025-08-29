import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface GlassVideoWrapperProps {
  children: React.ReactNode;
  aspectRatio?: string; // e.g., '16:9', '9:16', '1:1'
}

/**
 * GlassVideoWrapper - A liquid modal-inspired wrapper for video content
 * Features glassmorphism, gradient backgrounds, and device-like border styling
 */
const GlassVideoWrapper: React.FC<GlassVideoWrapperProps> = ({
  children,
  aspectRatio = '16:9'
}) => {
  const { theme } = useTheme();

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 0,
      padding: '20px',
      minHeight: 0,
      boxSizing: 'border-box'
    }}>
      {/* Floating background decorations */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '15%',
        width: '120px',
        height: '120px',
        background: `linear-gradient(135deg, ${theme.colors.primary}15, transparent)`,
        borderRadius: '50%',
        filter: 'blur(20px)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />
      
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '15%',
        width: '80px',
        height: '80px',
        background: `linear-gradient(135deg, ${theme.colors.primary}12, transparent)`,
        borderRadius: '50%',
        filter: 'blur(15px)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      {/* Video Container with Clean Device-like Border */}
      <div style={{
        position: 'relative',
        width: aspectRatio === '9:16' ? 'auto' : '100%',
        height: aspectRatio === '9:16' ? '100%' : 'auto',
        maxWidth: '100%',
        maxHeight: '100%',
        aspectRatio: aspectRatio === '9:16' ? '9/16' : '16/9',
        zIndex: 1,
        // Clean device border - white/light gray like modern phones
        background: '#f8fafc',
        border: '8px solid #e2e8f0',
        borderRadius: '20px',
        boxShadow: `
          0 20px 25px -5px rgba(0, 0, 0, 0.1),
          0 10px 10px -5px rgba(0, 0, 0, 0.04),
          inset 0 1px 0 rgba(255, 255, 255, 0.8)
        `,
        boxSizing: 'border-box',
        padding: '4px'
      }}>
        {/* Content container */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: '12px',
          overflow: 'hidden',
          backgroundColor: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default GlassVideoWrapper;