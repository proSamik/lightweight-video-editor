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
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 0,
      position: 'relative',
      // Transparent background with glass blur
      background: `linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 50%, transparent 100%)`,
      backdropFilter: 'blur(12px)',
      padding: '20px'
    }}>
      {/* Floating background decorations */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '10%',
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
        bottom: '15%',
        right: '15%',
        width: '80px',
        height: '80px',
        background: `linear-gradient(135deg, ${theme.colors.primary}12, transparent)`,
        borderRadius: '50%',
        filter: 'blur(15px)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      {/* Video Container with Device-like Border */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: aspectRatio === '9:16' ? '350px' : '800px',
        maxHeight: aspectRatio === '9:16' ? '75vh' : '60vh',
        aspectRatio: aspectRatio === '9:16' ? '9/16' : '16/9',
        zIndex: 1,
        // Outer border (gray/white like mobile device)
        background: `linear-gradient(145deg, 
          rgba(255, 255, 255, 0.9) 0%, 
          rgba(248, 250, 252, 0.85) 50%, 
          rgba(229, 231, 235, 0.8) 100%
        )`,
        borderRadius: '24px',
        padding: '8px',
        boxShadow: `
          0 32px 64px rgba(0, 0, 0, 0.15),
          0 8px 32px rgba(0, 0, 0, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.6),
          inset 0 -1px 0 rgba(0, 0, 0, 0.1)
        `,
        backdropFilter: 'blur(20px)'
      }}>
        {/* Inner container with white border and rounded corners */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          background: '#ffffff',
          borderRadius: '16px',
          padding: '6px', // Increased and made uniform
          boxShadow: `
            inset 0 2px 4px rgba(0, 0, 0, 0.1),
            inset 0 -2px 4px rgba(0, 0, 0, 0.05)
          `,
          overflow: 'hidden',
          display: 'flex' // Added flex to ensure proper sizing
        }}>
          {/* Content container with final border radius */}
          <div style={{
            position: 'relative',
            width: '100%',
            height: '100%', // Added explicit height
            borderRadius: '10px',
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
    </div>
  );
};

export default GlassVideoWrapper;