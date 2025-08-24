import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { ExportSettings, AISubtitleData, VideoClip } from '../../types';
import { LiquidModal } from './ui';
import { FiSettings, FiZap, FiMusic, FiFileText, FiVideo, FiScissors } from 'react-icons/fi';

interface ExportSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (settings: ExportSettings) => void;
  replacementAudioPath?: string | null;
  aiSubtitleData?: AISubtitleData | null;
  clips?: VideoClip[];
}

const ExportSettingsModal: React.FC<ExportSettingsProps> = ({
  isOpen,
  onClose,
  onConfirm,
  replacementAudioPath,
  aiSubtitleData,
  clips
}) => {
  const { theme } = useTheme();
  const quality = 'high'; // Always use high quality
  
  const hasSubtitles = Boolean(aiSubtitleData?.frames?.length);
  const hasReplacementAudio = Boolean(replacementAudioPath);
  const hasClips = Boolean(clips?.length); // Show clip export option for any clips, even single clips

  const [exportMode, setExportMode] = useState<'newAudio' | 'subtitlesOnly' | 'completeWithClips'>(() => {
    // Default to the first available option based on what content is available
    if (hasReplacementAudio) return 'newAudio';
    if (hasSubtitles) return 'subtitlesOnly';
    if (hasClips) return 'completeWithClips';
    return 'newAudio'; // fallback
  });

  const handleConfirm = () => {
    onConfirm({
      quality,
      exportMode
    });
  };

  return (
    <>
      <style>
        {`
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: ${theme.colors.primary};
            cursor: pointer;
            border: none;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
          
          input[type="range"]::-moz-range-thumb {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: ${theme.colors.primary};
            cursor: pointer;
            border: none;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
          
          input[type="range"]::-ms-thumb {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: ${theme.colors.primary};
            cursor: pointer;
            border: none;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
        `}
      </style>
    <LiquidModal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Settings"
      subtitle="Configure video export quality and settings"
      icon={<FiSettings size={24} color="white" />}
      maxWidth="500px"
    >
      <div style={{ padding: '20px' }}>

        {/* Export Mode Selection */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: '600',
            color: theme.colors.text
          }}>
            Export Mode
          </h3>
          <p style={{
            margin: '0 0 16px 0',
            fontSize: '14px',
            color: theme.colors.textSecondary,
            lineHeight: '1.5'
          }}>
            Choose what to include in your exported video.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              // Show Export Video with New Audio only if replacement audio is available
              ...(hasReplacementAudio ? [{ 
                value: 'newAudio', 
                label: 'Export Video with New Audio', 
                description: 'Export video with new audio only (no subtitles)', 
                icon: FiMusic 
              }] : []),
              // Show Export Video with Subtitles Only only if replacement audio AND subtitles are available
              ...(hasReplacementAudio && hasSubtitles ? [{ 
                value: 'subtitlesOnly', 
                label: 'Export Video with Subtitles Only', 
                description: 'Export video with original audio and subtitles', 
                icon: FiFileText 
              }] : []),
              // Show Export Complete Video with Clips if any clips exist (single or multiple)
              ...(hasClips ? [{ 
                value: 'completeWithClips', 
                label: 'Export Complete Video (Clipped)', 
                description: (() => {
                  if (hasReplacementAudio && hasSubtitles) {
                    return 'Export clipped video with new audio and subtitles';
                  } else if (hasReplacementAudio && !hasSubtitles) {
                    return 'Export clipped video with new audio only';
                  } else if (!hasReplacementAudio && hasSubtitles) {
                    return 'Export clipped video with original audio and subtitles';
                  } else {
                    return 'Export clipped video with original audio only';
                  }
                })(), 
                icon: FiScissors 
              }] : [])
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setExportMode(option.value as any)}
                style={{
                  padding: '12px 16px',
                  backgroundColor: exportMode === option.value 
                    ? theme.colors.primary 
                    : theme.colors.surface,
                  color: exportMode === option.value 
                    ? theme.colors.primaryForeground 
                    : theme.colors.text,
                  border: `1px solid ${exportMode === option.value 
                    ? theme.colors.primary 
                    : theme.colors.border}`,
                  borderRadius: theme.radius.md,
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => {
                  if (exportMode !== option.value) {
                    e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
                  }
                }}
                onMouseLeave={(e) => {
                  if (exportMode !== option.value) {
                    e.currentTarget.style.backgroundColor = theme.colors.surface;
                  }
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: exportMode === option.value ? theme.colors.primaryForeground : theme.colors.modal.background,
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <option.icon size={16} color={exportMode === option.value ? theme.colors.primary : theme.colors.text} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '3px' }}>
                    {option.label}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: exportMode === option.value ? theme.colors.primaryForeground : theme.colors.textSecondary,
                    lineHeight: '1.4',
                    opacity: 0.9
                  }}>
                    {option.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          borderTop: `1px solid ${theme.colors.border}`,
          paddingTop: '24px'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              backgroundColor: 'transparent',
              color: theme.colors.text,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.radius.md,
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            style={{
              padding: '12px 24px',
              backgroundColor: theme.colors.primary,
              color: theme.colors.primaryForeground,
              border: `1px solid ${theme.colors.primary}`,
              borderRadius: theme.radius.md,
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.primaryHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.primary;
            }}
          >
            <FiZap size={16} />
            Start Export
          </button>
        </div>
      </div>
    </LiquidModal>
    </>
  );
};

export default ExportSettingsModal;