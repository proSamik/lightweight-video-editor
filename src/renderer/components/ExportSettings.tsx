import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { ExportSettings } from '../../types';
import { Button, LiquidModal } from './ui';
import { FiSettings, FiZap, FiTarget, FiStar, FiMusic, FiFileText, FiVideo } from 'react-icons/fi';

interface ExportSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (settings: ExportSettings) => void;
  replacementAudioPath?: string | null;
}

const ExportSettingsModal: React.FC<ExportSettingsProps> = ({
  isOpen,
  onClose,
  onConfirm,
  replacementAudioPath
}) => {
  const { theme } = useTheme();
  const [framerate, setFramerate] = useState<30 | 60>(30);
  const [exportMode, setExportMode] = useState<'complete' | 'newAudio' | 'subtitlesOnly'>('complete');
  const quality = 'high'; // Always use high quality

  const handleConfirm = () => {
    onConfirm({
      framerate,
      quality,
      exportMode
    });
  };

  return (
    <LiquidModal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Settings"
      subtitle="Configure video export quality and framerate"
      icon={<FiSettings size={24} color="white" />}
      maxWidth="650px"
    >
      {/* Modal Content */}
      <div style={{ padding: '24px 32px' }}>

        {/* Framerate Selection */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              backgroundColor: theme.colors.accent,
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FiZap size={16} color={theme.colors.accentForeground} />
            </div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: theme.colors.text }}>
              Frame Rate
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Button
              onClick={() => setFramerate(30)}
              variant={framerate === 30 ? 'primary' : 'outline'}
              size="lg"
              fullWidth
              style={{
                justifyContent: 'flex-start',
                textAlign: 'left',
                padding: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <FiTarget size={16} />
                <span style={{ fontSize: '15px', fontWeight: '600' }}>30 FPS</span>
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: framerate === 30 ? theme.colors.primaryForeground : theme.colors.textSecondary,
                lineHeight: '1.4',
                opacity: 0.9
              }}>
                Standard quality, faster rendering
              </div>
            </Button>
            <Button
              onClick={() => setFramerate(60)}
              variant={framerate === 60 ? 'primary' : 'outline'}
              size="lg"
              fullWidth
              style={{
                justifyContent: 'flex-start',
                textAlign: 'left',
                padding: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <FiStar size={16} />
                <span style={{ fontSize: '15px', fontWeight: '600' }}>60 FPS</span>
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: framerate === 60 ? theme.colors.primaryForeground : theme.colors.textSecondary,
                lineHeight: '1.4',
                opacity: 0.9
              }}>
                Smooth motion, longer rendering
              </div>
            </Button>
          </div>
        </div>

        {/* Export Mode Selection */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              backgroundColor: theme.colors.success,
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FiVideo size={16} color={theme.colors.successForeground} />
            </div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: theme.colors.text }}>
              Export Mode
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              // Always show Export Complete Video
              { 
                value: 'complete', 
                label: 'Export Complete Video', 
                description: replacementAudioPath 
                  ? 'Export video with new audio and subtitles' 
                  : 'Export video with original audio and subtitles', 
                icon: FiVideo 
              },
              // Show Export Video with New Audio only if replacement audio is available
              ...(replacementAudioPath ? [{ 
                value: 'newAudio', 
                label: 'Export Video with New Audio', 
                description: 'Export video with new audio only (no subtitles)', 
                icon: FiMusic 
              }] : []),
              // Show Export Video with Subtitles Only if replacement audio is available
              ...(replacementAudioPath ? [{ 
                value: 'subtitlesOnly', 
                label: 'Export Video with Subtitles Only', 
                description: 'Export video with original audio and subtitles', 
                icon: FiFileText 
              }] : [])
            ].map(option => (
              <Button
                key={option.value}
                onClick={() => setExportMode(option.value as any)}
                variant={exportMode === option.value ? 'primary' : 'outline'}
                size="lg"
                fullWidth
                style={{
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
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
              </Button>
            ))}
          </div>
        </div>

        </div>

        {/* Action Buttons */}
        <div style={{
          padding: '16px 24px',
          borderTop: `1px solid ${theme.colors.border}`,
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          background: theme.colors.modal.background
        }}>
          <Button
            onClick={onClose}
            variant="outline"
            size="md"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            variant="primary"
            size="md"
            leftIcon={<FiZap size={16} />}
          >
            Start Export
          </Button>
        </div>
    </LiquidModal>
  );
};

export default ExportSettingsModal;