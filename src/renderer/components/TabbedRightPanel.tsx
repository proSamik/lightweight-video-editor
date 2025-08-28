import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { AISubtitleData, VideoClip } from '../../types';
import { PresetSelector } from './StylingPanel/PresetSelector';
import { StyleControls } from './StylingPanel/StyleControls';
import AISubtitlesPanel from './AISubtitlesPanel';
import TranscriptionModal from './TranscriptionModal';
import { Palette, Brain, Settings } from 'lucide-react';

interface TabbedRightPanelProps {
  onTimeSeek: (time: number) => void;
  transcriptionStatus: {
    isTranscribing: boolean;
    progress: number;
    message: string;
    speed?: string;
    eta?: string;
  };
  currentTime: number;
  aiSubtitleData?: AISubtitleData | null;
  onAISubtitleUpdate?: (data: AISubtitleData | null) => void;
  selectedFrameId?: string | null;
  onFrameSelect?: (frameId: string) => void;
  videoPath?: string | null;
  audioPath?: string | null;
  // New: Clip editing support
  clips?: VideoClip[];
}

type TabType = 'presets' | 'advanced' | 'aiSubtitles';

const TabbedRightPanel: React.FC<TabbedRightPanelProps> = ({
  onTimeSeek,
  transcriptionStatus,
  currentTime,
  aiSubtitleData,
  onAISubtitleUpdate,
  selectedFrameId,
  onFrameSelect,
  videoPath,
  audioPath,
  clips = [],
}) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('presets');
  
  // Get the selected frame directly from AI subtitle data
  const selectedFrame = React.useMemo(() => {
    if (!aiSubtitleData || !selectedFrameId) return null;
    return aiSubtitleData.frames.find(f => f.id === selectedFrameId) || null;
  }, [aiSubtitleData, selectedFrameId]);

  // Handle style updates directly on AI subtitle frames
  const handleStyleUpdate = React.useCallback((styleUpdates: any) => {
    if (!selectedFrame || !aiSubtitleData || !onAISubtitleUpdate) return;

    const updatedFrames = aiSubtitleData.frames.map(frame => {
      if (frame.id !== selectedFrame.id) return frame;
      const mergedStyle = { ...frame.style, ...styleUpdates };
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
      };
      return { ...frame, style: safeStyle };
    });

    onAISubtitleUpdate({
      ...aiSubtitleData,
      frames: updatedFrames,
      lastModified: Date.now()
    });
  }, [selectedFrame, aiSubtitleData, onAISubtitleUpdate]);

  // Handle preset selection
  const handlePresetSelect = React.useCallback((preset: any) => {
    if (selectedFrame) {
      // Extract animation from style before applying
      const { animation, ...styleWithoutAnimation } = preset.style;
      handleStyleUpdate(styleWithoutAnimation);
    }
  }, [selectedFrame, handleStyleUpdate]);

  // Handle timeline apply
  const handleTimelineApply = React.useCallback(() => {
    // For now, just apply current style to selected frame
    // In the future, this could open a modal for time range selection
    if (selectedFrame && aiSubtitleData && onAISubtitleUpdate) {
      // Apply style to all frames in the time range
      const updatedFrames = aiSubtitleData.frames.map(frame => {
        const mergedStyle = { ...frame.style, ...selectedFrame.style };
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
        };
        return { ...frame, style: safeStyle };
      });

      onAISubtitleUpdate({
        ...aiSubtitleData,
        frames: updatedFrames,
        lastModified: Date.now()
      });
    }
  }, [selectedFrame, aiSubtitleData, onAISubtitleUpdate]);

  const tabStyle = (isActive: boolean) => ({
    flex: 1,
    padding: '8px 12px',
    backgroundColor: 'transparent',
    color: isActive ? theme.colors.text : theme.colors.textSecondary,
    border: 'none',
    borderBottom: isActive ? `2px solid ${theme.colors.primary}` : `2px solid transparent`,
    cursor: transcriptionStatus.isTranscribing ? 'not-allowed' : 'pointer',
    fontSize: '12px',
    fontWeight: isActive ? '600' : '500',
    transition: 'all 0.15s ease',
    borderRadius: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    opacity: transcriptionStatus.isTranscribing && !isActive ? 0.5 : 1
  });

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: theme.colors.surface
    }}>
      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: `1px solid ${theme.colors.border}`,
        backgroundColor: theme.colors.background
      }}>
        <button
          onClick={() => !transcriptionStatus.isTranscribing && setActiveTab('presets')}
          style={tabStyle(activeTab === 'presets')}
        >
          <Palette size={12} />
          Style Presets
        </button>
        <button
          onClick={() => !transcriptionStatus.isTranscribing && setActiveTab('advanced')}
          style={tabStyle(activeTab === 'advanced')}
        >
          <Settings size={12} />
          Advanced Styles
        </button>
        <button
          onClick={() => !transcriptionStatus.isTranscribing && setActiveTab('aiSubtitles')}
          style={tabStyle(activeTab === 'aiSubtitles')}
        >
          <Brain size={12} />
          AI Subtitles
        </button>
      </div>

      {/* Tab Content */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        position: 'relative'
      }}>
        {transcriptionStatus.isTranscribing ? (
          <TranscriptionModal transcriptionStatus={transcriptionStatus} />
        ) : activeTab === 'presets' ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <PresetSelector
                onPresetSelect={handlePresetSelect}
                onStyleUpdate={handleStyleUpdate}
                selectedFrameText={selectedFrame?.words && selectedFrame.words.length > 0 ? selectedFrame.words.map(w => w.word).join(' ') : 'Sample Text'}
              />
            </div>
            
            {/* Apply to Timeline Button for Presets */}
            <div style={{ 
              padding: '16px', 
              borderTop: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.surface
            }}>
              <button
                onClick={handleTimelineApply}
                disabled={!selectedFrame}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: selectedFrame ? theme.colors.primary : theme.colors.textSecondary,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: selectedFrame ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  opacity: selectedFrame ? 1 : 0.5
                }}
              >
                Apply to Selected Timeline
              </button>
            </div>
          </div>
        ) : activeTab === 'advanced' ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <StyleControls
                style={selectedFrame?.style || {
                  font: 'Poppins',
                  fontSize: 85,
                  textColor: '#ffffff',
                  highlighterColor: '#00ff00',
                  backgroundColor: '#000000',
                  position: { x: 50, y: 80 },
                }}
                onStyleUpdate={handleStyleUpdate}
              />
            </div>
            
            {/* Apply to Timeline Button for Advanced */}
            <div style={{ 
              padding: '16px', 
              borderTop: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.surface
            }}>
              <button
                onClick={handleTimelineApply}
                disabled={!selectedFrame}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: selectedFrame ? theme.colors.primary : theme.colors.textSecondary,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: selectedFrame ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  opacity: selectedFrame ? 1 : 0.5
                }}
              >
                Apply to Selected Timeline
              </button>
            </div>
          </div>
        ) : (
          <AISubtitlesPanel
            currentTime={currentTime}
            onTimeSeek={onTimeSeek}
            aiSubtitleData={aiSubtitleData}
            selectedFrameId={selectedFrameId}
            onFrameSelect={onFrameSelect}
            onAISubtitleUpdate={onAISubtitleUpdate}
            videoPath={videoPath}
            audioPath={audioPath}
            clips={clips}
          />
        )}
      </div>
    </div>
  );
};

export default TabbedRightPanel;