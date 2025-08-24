import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Activity, Clock, Zap } from 'lucide-react';

interface TranscriptionModalProps {
  transcriptionStatus: {
    isTranscribing: boolean;
    progress: number;
    message: string;
    speed?: string;
    eta?: string;
  };
}

const TranscriptionModal: React.FC<TranscriptionModalProps> = ({
  transcriptionStatus,
}) => {
  const { theme } = useTheme();

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      background: `linear-gradient(135deg, ${theme.colors.background} 0%, ${theme.colors.surface} 100%)`,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '10%',
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${theme.colors.primary}20, ${theme.colors.primary}10)`,
        filter: 'blur(20px)',
        animation: 'float 6s ease-in-out infinite'
      }} />
      
      <div style={{
        position: 'absolute',
        bottom: '30%',
        right: '15%',
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${theme.colors.primary}15, ${theme.colors.primary}05)`,
        filter: 'blur(15px)',
        animation: 'float 4s ease-in-out infinite reverse'
      }} />

      {/* Main content */}
      <div style={{
        background: `linear-gradient(145deg, ${theme.colors.modal.background}95, ${theme.colors.surface}90)`,
        backdropFilter: 'blur(20px)',
        border: `1px solid ${theme.colors.border}60`,
        borderRadius: theme.radius.xl,
        padding: '32px',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
        boxShadow: theme.colors.modal.shadow,
        position: 'relative',
        zIndex: 1
      }}>
        {/* Icon */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primaryHover})`,
          margin: '0 auto 24px',
          boxShadow: `0 8px 24px ${theme.colors.primary}40`
        }}>
          <Activity 
            size={28} 
            color={theme.colors.primaryForeground}
            style={{
              animation: 'pulse 2s infinite'
            }}
          />
        </div>

        {/* Title */}
        <h2 style={{
          margin: '0 0 8px 0',
          fontSize: '22px',
          fontWeight: '600',
          color: theme.colors.text,
          background: `linear-gradient(135deg, ${theme.colors.text}, ${theme.colors.textSecondary})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Transcribing Audio
        </h2>

        {/* Subtitle */}
        <p style={{
          margin: '0 0 24px 0',
          fontSize: '14px',
          color: theme.colors.textSecondary,
          lineHeight: '1.5'
        }}>
          Processing your video with AI to generate captions
        </p>

        {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: theme.colors.border,
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '16px',
          position: 'relative'
        }}>
          <div style={{
            width: `${transcriptionStatus.progress}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.primaryHover})`,
            borderRadius: '4px',
            transition: 'width 0.3s ease',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              animation: 'shimmer 2s infinite'
            }} />
          </div>
        </div>

        {/* Progress Text */}
        <div style={{
          fontSize: '14px',
          fontWeight: '500',
          color: theme.colors.text,
          marginBottom: '12px'
        }}>
          {Math.round(transcriptionStatus.progress)}% Complete
        </div>

        {/* Status Message */}
        <div style={{
          fontSize: '13px',
          color: theme.colors.textSecondary,
          marginBottom: '20px',
          minHeight: '18px'
        }}>
          {transcriptionStatus.message}
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '16px',
          paddingTop: '16px',
          borderTop: `1px solid ${theme.colors.border}40`
        }}>
          {transcriptionStatus.speed && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: theme.colors.textSecondary
            }}>
              <Zap size={14} />
              <span>{transcriptionStatus.speed}</span>
            </div>
          )}
          
          {transcriptionStatus.eta && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: theme.colors.textSecondary
            }}>
              <Clock size={14} />
              <span>{transcriptionStatus.eta}</span>
            </div>
          )}
        </div>
      </div>

      {/* CSS animations */}
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-10px) rotate(5deg); }
          }
          
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
          
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}
      </style>
    </div>
  );
};

export default TranscriptionModal;