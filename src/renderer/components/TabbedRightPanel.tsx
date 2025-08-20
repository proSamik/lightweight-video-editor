import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { CaptionSegment, AISubtitleData } from '../../types';
import StylingPanel from './StylingPanel';
import AISubtitlesPanel from './AISubtitlesPanel';
import { Palette, Brain } from 'lucide-react';

interface TabbedRightPanelProps {
  selectedSegment: CaptionSegment | null;
  onSegmentUpdate: (segmentId: string, updates: Partial<CaptionSegment>) => void;
  captions: CaptionSegment[];
  onApplyToAll: (styleUpdates: Partial<CaptionSegment['style']>) => void;
  onApplyToTimeline?: (startTime: number, endTime: number, styleUpdates: Partial<CaptionSegment['style']>) => void;
  onTimeSeek: (time: number) => void;
  transcriptionStatus: {
    isTranscribing: boolean;
    progress: number;
    message: string;
    speed?: string;
    eta?: string;
  };
  selectedSegmentId: string | null;
  onSegmentSelect: (segmentId: string) => void;
  onSegmentDelete: (segmentId: string) => void;
  currentTime: number;
  aiSubtitleData?: AISubtitleData | null;
  onAISubtitleUpdate?: (data: AISubtitleData | null) => void;
  selectedFrameId?: string | null;
  onFrameSelect?: (frameId: string) => void;
  onCaptionsSync?: (updatedCaptions: CaptionSegment[]) => void;
}

type TabType = 'styling' | 'aiSubtitles';

const TabbedRightPanel: React.FC<TabbedRightPanelProps> = ({
  selectedSegment,
  onSegmentUpdate,
  captions,
  onApplyToAll,
  onApplyToTimeline,
  onTimeSeek,
  transcriptionStatus,
  selectedSegmentId,
  onSegmentSelect,
  onSegmentDelete,
  currentTime,
  aiSubtitleData,
  onAISubtitleUpdate,
  selectedFrameId,
  onFrameSelect,
  onCaptionsSync,
}) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('styling');

  const tabStyle = (isActive: boolean) => ({
    flex: 1,
    padding: '12px 16px',
    backgroundColor: 'transparent',
    color: isActive ? theme.colors.text : theme.colors.textSecondary,
    border: 'none',
    borderBottom: isActive ? `2px solid ${theme.colors.primary}` : `2px solid transparent`,
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: isActive ? '500' : '400',
    transition: 'all 0.15s ease',
    borderRadius: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
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
          onClick={() => setActiveTab('styling')}
          style={tabStyle(activeTab === 'styling')}
        >
          <Palette size={14} />
          Styling
        </button>
        <button
          onClick={() => setActiveTab('aiSubtitles')}
          style={tabStyle(activeTab === 'aiSubtitles')}
        >
          <Brain size={14} />
          AI Subtitles
        </button>
      </div>

      {/* Tab Content */}
      <div style={{
        flex: 1,
        overflow: 'hidden'
      }}>
        {activeTab === 'styling' ? (
          <StylingPanel
            selectedSegment={selectedSegment}
            onSegmentUpdate={onSegmentUpdate}
            onApplyToAll={onApplyToAll}
            onApplyToTimeline={onApplyToTimeline}
            onTimeSeek={onTimeSeek}
            captions={captions}
            currentTime={currentTime}
            transcriptionStatus={transcriptionStatus}
          />
        ) : (
          <AISubtitlesPanel
            captions={captions}
            currentTime={currentTime}
            onTimeSeek={onTimeSeek}
            onCaptionUpdate={onSegmentUpdate}
            onSegmentDelete={onSegmentDelete}
            aiSubtitleData={aiSubtitleData}
            onAISubtitleUpdate={onAISubtitleUpdate}
            selectedFrameId={selectedFrameId}
            onFrameSelect={onFrameSelect}
            onCaptionsSync={onCaptionsSync}
          />
        )}
      </div>
    </div>
  );
};

export default TabbedRightPanel;