import React, { useState, useMemo } from 'react';
import { AISubtitleData, SubtitleFrame } from '../../../types';
import { useTheme } from '../../contexts/ThemeContext';
import TimelineApplyModal from '../TimelineApplyModal';

// Import UI components
import {
  Stack,
  HStack,
  Button,
  spacing,
  typography,
  borderRadius,
} from '../ui';

// Import sub-components
import { TranscriptionStatus } from './TranscriptionStatus';
import { StyleControls } from './StyleControls';
import { PresetSelector } from './PresetSelector';

interface StylingPanelProps {
  onTimeSeek?: (time: number) => void;
  transcriptionStatus?: {
    isTranscribing: boolean;
    progress: number;
    message: string;
    speed?: string;
    eta?: string;
  };
  // AI Subtitle support - now the only data source
  aiSubtitleData?: AISubtitleData | null;
  selectedFrameId?: string | null;
  onAISubtitleUpdate?: (data: AISubtitleData) => void;
}

const StylingPanel: React.FC<StylingPanelProps> = ({
  transcriptionStatus,
  aiSubtitleData,
  selectedFrameId,
  onAISubtitleUpdate,
}) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  const [selectedPresetId, setSelectedPresetId] = useState<string>();
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);

  // Get the selected frame directly from AI subtitle data
  const selectedFrame = useMemo((): SubtitleFrame | null => {
    if (!aiSubtitleData || !selectedFrameId) return null;
    return aiSubtitleData.frames.find(f => f.id === selectedFrameId) || null;
  }, [aiSubtitleData, selectedFrameId]);

  // Handle style updates directly on AI subtitle frames
  const handleStyleUpdate = (styleUpdates: any) => {
    if (!selectedFrame || !aiSubtitleData || !onAISubtitleUpdate) return;

    // For now, we'll store style info in the frame itself
    // Later we might want a more sophisticated style management system
    const updatedFrames: SubtitleFrame[] = aiSubtitleData.frames.map(frame => {
      if (frame.id !== selectedFrame.id) return frame;
      const mergedStyle = { ...frame.style, ...styleUpdates } as any;
      const safeStyle = {
        font: mergedStyle.font || 'Poppins',
        fontSize: mergedStyle.fontSize ?? 85,
        textColor: mergedStyle.textColor || '#ffffff',
        highlighterColor: mergedStyle.highlighterColor || '#00ff00',
        backgroundColor: mergedStyle.backgroundColor ?? '#000000',
        position: mergedStyle.position || { x: 50, y: 80 },
        strokeColor: mergedStyle.strokeColor,
        strokeWidth: mergedStyle.strokeWidth,
        textTransform: mergedStyle.textTransform,
        scale: mergedStyle.scale,
        emphasizeMode: mergedStyle.emphasizeMode,
        renderMode: mergedStyle.renderMode,
        textAlign: mergedStyle.textAlign,
        burnInSubtitles: mergedStyle.burnInSubtitles,
      } as any;
      return { ...frame, style: safeStyle } as SubtitleFrame;
    });

    onAISubtitleUpdate({
      ...aiSubtitleData,
      frames: updatedFrames,
      lastModified: Date.now()
    });
  };

  // Handle preset selection
  const handlePresetSelect = (preset: any) => {
    setSelectedPresetId(preset.id);
    if (selectedFrame) {
      // Extract animation from style before applying
      const { animation, ...styleWithoutAnimation } = preset.style;
      handleStyleUpdate(styleWithoutAnimation);
    }
  };

  // Handle timeline apply
  const handleTimelineApply = (startTime: number, endTime: number) => {
    if (selectedFrame && aiSubtitleData && onAISubtitleUpdate) {
      // Apply style to all frames in the time range
      const updatedFrames: SubtitleFrame[] = aiSubtitleData.frames.map(frame => {
        // Check if frame overlaps with the selected time range (convert to seconds)
        const frameOverlaps = (frame.startTime < endTime / 1000) && (frame.endTime > startTime / 1000);
        
        if (!frameOverlaps) return frame;
        const mergedStyle = { ...frame.style, ...selectedFrame.style } as any;
        const safeStyle = {
          font: mergedStyle.font || 'Poppins',
          fontSize: mergedStyle.fontSize ?? 85,
          textColor: mergedStyle.textColor || '#ffffff',
          highlighterColor: mergedStyle.highlighterColor || '#00ff00',
          backgroundColor: mergedStyle.backgroundColor ?? '#000000',
          position: mergedStyle.position || { x: 50, y: 80 },
          strokeColor: mergedStyle.strokeColor,
          strokeWidth: mergedStyle.strokeWidth,
          textTransform: mergedStyle.textTransform,
          scale: mergedStyle.scale,
          emphasizeMode: mergedStyle.emphasizeMode,
          renderMode: mergedStyle.renderMode,
          textAlign: mergedStyle.textAlign,
          burnInSubtitles: mergedStyle.burnInSubtitles,
        } as any;
        return { ...frame, style: safeStyle } as SubtitleFrame;
      });

      onAISubtitleUpdate({
        ...aiSubtitleData,
        frames: updatedFrames,
        lastModified: Date.now()
      });
    }
  };

  // Main panel styles
  const panelStyles: React.CSSProperties = {
    height: '100%',
    backgroundColor: theme.colors.sidebar.background,
    borderRadius: borderRadius.lg,
    border: `1px solid ${theme.colors.borderFocus}20`,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: theme.shadows.sm,
  };

  const headerStyles: React.CSSProperties = {
    padding: '6px 8px',
    borderBottom: `1px solid ${theme.colors.border}`,
    backgroundColor: theme.colors.background,
  };

  const contentStyles: React.CSSProperties = {
    flex: 1,
    padding: '0',
    overflowY: 'auto',
    backgroundColor: theme.colors.sidebar.background,
  };

  const emptyStateStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    textAlign: 'center',
    color: theme.colors.textSecondary,
    gap: spacing.lg,
  };

  // Empty state when no frame is selected
  if (!selectedFrame) {
    return (
      <div style={panelStyles}>
        <div style={headerStyles}>
          <h3 style={{ 
            margin: 0, 
            fontSize: typography.fontSize.xl, 
            fontWeight: typography.fontWeight.semibold,
            color: theme.colors.text 
          }}>
            Styling Controls
          </h3>
        </div>
        
        <div style={contentStyles}>
          <TranscriptionStatus transcriptionStatus={transcriptionStatus} />
          
          <div style={emptyStateStyles}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: theme.colors.surface,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.md,
            }}>
              <div style={{
                fontSize: '24px',
                color: theme.colors.textSecondary
              }}>
                🎨
              </div>
            </div>
            
            <div style={{
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.semibold,
              color: theme.colors.text,
              marginBottom: spacing.sm,
            }}>
              Select an AI subtitle frame to style
            </div>
            
            <div style={{
              fontSize: typography.fontSize.sm,
              color: theme.colors.primary,
              fontWeight: typography.fontWeight.medium,
            }}>
              💡 Click any frame in the AI Subtitles tab to begin styling
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={panelStyles}>
        <div style={headerStyles}>
          <HStack justify="between" align="center" style={{ marginBottom: '8px' }}>
            <div>
              <h3 style={{ 
                margin: 0, 
                fontSize: '14px', 
                fontWeight: '600',
                color: theme.colors.text 
              }}>
                Subtitle Styling
              </h3>
              <p style={{
                margin: '2px 0 0 0',
                fontSize: '11px',
                color: theme.colors.textSecondary
              }}>
                Frames: {selectedFrame.startTime.toFixed(2)}s - {selectedFrame.endTime.toFixed(2)}s
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsTimelineModalOpen(true)}
            >
              Apply to Selected Timeline 
            </Button>
          </HStack>
          
          {/* Tab Navigation */}
          <div style={{
            display: 'flex',
            gap: '4px',
            backgroundColor: theme.colors.surface,
            padding: '4px',
            borderRadius: borderRadius.lg,
            border: `1px solid ${theme.colors.border}`,
          }}>
            <button
              onClick={() => setActiveTab('presets')}
              style={{
                flex: 1,
                padding: '6px 8px',
                backgroundColor: activeTab === 'presets' ? theme.colors.primary : 'transparent',
                color: activeTab === 'presets' ? theme.colors.primaryForeground : theme.colors.text,
                border: 'none',
                borderRadius: borderRadius.md,
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
            >
              Presets
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              style={{
                flex: 1,
                padding: '6px 8px',
                backgroundColor: activeTab === 'custom' ? theme.colors.primary : 'transparent',
                color: activeTab === 'custom' ? theme.colors.primaryForeground : theme.colors.text,
                border: 'none',
                borderRadius: borderRadius.md,
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
            >
              Custom Controls
            </button>
          </div>
        </div>
        
        <div style={contentStyles}>
          <Stack gap="xl">
            <TranscriptionStatus transcriptionStatus={transcriptionStatus} />
            
            {/* Tab Content */}
            {activeTab === 'presets' ? (
              <PresetSelector
                selectedPresetId={selectedPresetId}
                onPresetSelect={handlePresetSelect}
                onStyleUpdate={handleStyleUpdate}
                selectedFrameText={selectedFrame.words.length > 0 ? selectedFrame.words.map(w => w.word).join(' ') : 'Sample Text'}
              />
            ) : (
              <StyleControls
                style={selectedFrame.style || {
                  font: 'Poppins',
                  fontSize: 85,
                  textColor: '#ffffff',
                  highlighterColor: '#00ff00',
                  backgroundColor: '#000000',
                  position: { x: 50, y: 80 },
                }}
                onStyleUpdate={handleStyleUpdate}
              />
            )}
          </Stack>
        </div>
      </div>

      {/* Timeline Apply Modal */}
      {isTimelineModalOpen && (
        <TimelineApplyModal
          isOpen={isTimelineModalOpen}
          onClose={() => setIsTimelineModalOpen(false)}
          onApply={handleTimelineApply}
          currentStyle={selectedFrame?.style || {
            font: 'Poppins',
            fontSize: 85,
            textColor: '#ffffff',
            highlighterColor: '#00ff00',
            backgroundColor: '#000000',
            position: { x: 50, y: 80 },
          }}
          captions={aiSubtitleData?.frames.map(f => ({ id: f.id, startTime: f.startTime * 1000, endTime: f.endTime * 1000 })) || []}
          selectedSegmentId={selectedFrame?.id || null}
        />
      )}
    </>
  );
};

export default StylingPanel;