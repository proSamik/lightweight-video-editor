import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Stack, HStack, spacing, typography, borderRadius } from '../ui';
import { FiMic } from 'react-icons/fi';

interface TranscriptionStatusProps {
  transcriptionStatus?: {
    isTranscribing: boolean;
    progress: number;
    message: string;
    speed?: string;
    eta?: string;
  };
}

export const TranscriptionStatus: React.FC<TranscriptionStatusProps> = ({
  transcriptionStatus,
}) => {
  const { theme } = useTheme();

  if (!transcriptionStatus?.isTranscribing) {
    return null;
  }

  const containerStyles: React.CSSProperties = {
    backgroundColor: theme.colors.backgroundSecondary,
    border: `1px solid ${theme.colors.success}`,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  };

  const headerStyles: React.CSSProperties = {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: theme.colors.text,
    margin: 0,
  };

  const progressValueStyles: React.CSSProperties = {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: theme.colors.success,
  };

  const progressBarContainerStyles: React.CSSProperties = {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.sm,
    height: 8,
    overflow: 'hidden',
    position: 'relative',
  };

  const progressBarStyles: React.CSSProperties = {
    backgroundColor: theme.colors.success,
    height: '100%',
    width: `${transcriptionStatus.progress}%`,
    transition: 'width 0.3s ease',
    borderRadius: borderRadius.sm,
  };

  const messageStyles: React.CSSProperties = {
    fontSize: typography.fontSize.sm,
    color: theme.colors.textSecondary,
    margin: 0,
    lineHeight: typography.lineHeight.normal,
  };

  return (
    <div style={containerStyles}>
      <Stack gap="md">
        <HStack justify="between" align="center">
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <FiMic size={16} color={theme.colors.textSecondary} />
            <h4 style={headerStyles}>Transcribing Audio...</h4>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <span style={progressValueStyles}>
              {Math.round(transcriptionStatus.progress)}%
            </span>
          </div>
        </HStack>
        
        <div style={progressBarContainerStyles}>
          <div style={progressBarStyles} />
        </div>
        
        <HStack justify="between" align="center">
          <p style={messageStyles}>
            {transcriptionStatus.message}
          </p>
          {transcriptionStatus.eta && (
            <span style={{
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              color: theme.colors.success,
              backgroundColor: theme.colors.backgroundSecondary,
              padding: `${spacing.xs}px ${spacing.sm}px`,
              borderRadius: borderRadius.sm,
              border: `1px solid ${theme.colors.success}20`,
            }}>
              ETA: {transcriptionStatus.eta}
            </span>
          )}
        </HStack>
      </Stack>
    </div>
  );
};