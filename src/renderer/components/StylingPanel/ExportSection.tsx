import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  FormSection,
  Stack,
  HStack,
  Button,
  spacing,
  typography,
} from '../ui';
import { ExportSettings, CaptionSegment } from '../../../types';
import { ExportSrtIcon, ExportVideoWithNewAudioIcon } from '../IconComponents';

interface ExportSectionProps {
  videoFile?: { path: string; name: string } | null;
  captions?: CaptionSegment[];
  onExport?: (settings: ExportSettings) => void;
  onShowExportSettings: () => void;
  onVideoWithNewAudioExport?: () => void;
  replacementAudioPath?: string | null;
}

export const ExportSection: React.FC<ExportSectionProps> = ({
  videoFile,
  captions,
  onExport,
  onShowExportSettings,
  onVideoWithNewAudioExport,
  replacementAudioPath,
}) => {
  const { theme } = useTheme();

  const hasVideo = Boolean(videoFile?.path);
  const hasCaptions = Boolean(captions?.length);
  const hasReplacementAudio = Boolean(replacementAudioPath);
  const canExport = hasVideo && (hasCaptions || hasReplacementAudio) && onExport;

  // Export to SRT file
  const handleSrtExport = () => {
    if (!captions || captions.length === 0) return;

    try {
      // Generate SRT content
      let srtContent = '';
      captions.forEach((caption, index) => {
        const startTime = formatSrtTime(caption.startTime);
        const endTime = formatSrtTime(caption.endTime);
        srtContent += `${index + 1}\n${startTime} --> ${endTime}\n${caption.text}\n\n`;
      });

      // Create and download file
      const blob = new Blob([srtContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${videoFile?.name || 'captions'}.srt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export SRT:', error);
    }
  };

  // Format time for SRT format (HH:MM:SS,mmm)
  const formatSrtTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const ms = Math.floor(milliseconds % 1000);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const hours = Math.floor(totalSeconds / 3600);

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${ms
      .toString()
      .padStart(3, '0')}`;
  };

  // Icons
  const VideoIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path 
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );

  const SettingsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path 
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );

  // Status indicator
  const StatusIndicator: React.FC<{ 
    isAvailable: boolean; 
    label: string; 
  }> = ({ isAvailable, label }) => {
    const indicatorStyles: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: spacing.xs,
      fontSize: typography.fontSize.sm,
      color: isAvailable ? theme.colors.success : theme.colors.textMuted,
    };

    const dotStyles: React.CSSProperties = {
      width: 8,
      height: 8,
      borderRadius: '50%',
      backgroundColor: isAvailable ? theme.colors.success : theme.colors.textMuted,
    };

    return (
      <div style={indicatorStyles}>
        <div style={dotStyles} />
        <span>{label}</span>
      </div>
    );
  };

  return (
    <FormSection
      title="Export Options"
      description="Export your video with captions or generate subtitle files"
    >
      <Stack gap="lg">
        {/* Status indicators */}
        <Stack gap="sm">
          <StatusIndicator isAvailable={hasVideo} label="Video loaded" />
          <StatusIndicator isAvailable={hasCaptions} label="Captions available" />
          {hasReplacementAudio && (
            <StatusIndicator isAvailable={hasReplacementAudio} label="Replacement audio loaded" />
          )}
        </Stack>

        {/* Export buttons */}
        <Stack gap="md">
          {/* Export Video with Captions */}
          <Button
            variant="primary"
            size="lg"
            leftIcon={<VideoIcon />}
            onClick={onShowExportSettings}
            disabled={!canExport}
            fullWidth
          >
            {hasCaptions ? 'Export Video with Captions' : 'Export Video with Audio'}
          </Button>

          {/* Export SRT - only show if captions exist */}
          {hasCaptions && (
            <Button
              variant="outline"
              size="md"
              leftIcon={<ExportSrtIcon />}
              onClick={handleSrtExport}
              fullWidth
            >
              Export SRT Subtitle File
            </Button>
          )}

          {/* Export Video with New Audio (only show if replacement audio is loaded) */}
          {replacementAudioPath && (
            <Button
              variant="outline"
              size="md"
              leftIcon={<ExportVideoWithNewAudioIcon />}
              onClick={onVideoWithNewAudioExport}
              disabled={!hasVideo}
              fullWidth
            >
              Export Video with New Audio
            </Button>
          )}
        </Stack>

        {/* Help text */}
        {!canExport && (
          <div style={{
            padding: spacing.lg,
            backgroundColor: theme.colors.backgroundSecondary,
            borderRadius: spacing.sm,
            border: `1px solid ${theme.colors.border}`,
          }}>
            <Stack gap="sm">
              <h4 style={{
                margin: 0,
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.medium,
                color: theme.colors.text,
              }}>
                Ready to Export?
              </h4>
              <p style={{
                margin: 0,
                fontSize: typography.fontSize.sm,
                color: theme.colors.textSecondary,
                lineHeight: typography.lineHeight.relaxed,
              }}>
                {!hasVideo && !hasCaptions && !hasReplacementAudio
                  ? 'Load a video and generate captions or add replacement audio to start exporting.'
                  : !hasVideo 
                  ? 'Load a video file to export.'
                  : 'Generate captions or add replacement audio to enable export options.'
                }
              </p>
            </Stack>
          </div>
        )}
      </Stack>
    </FormSection>
  );
};