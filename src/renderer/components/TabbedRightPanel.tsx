import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { AISubtitleData, VideoClip } from '../../types';
import StylingPanel from './StylingPanel';
import AISubtitlesPanel from './AISubtitlesPanel';
import TranscriptionModal from './TranscriptionModal';
import { Palette, Brain } from 'lucide-react';

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

type TabType = 'styling' | 'aiSubtitles';

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
  const [activeTab, setActiveTab] = useState<TabType>('aiSubtitles');

  const tabStyle = (isActive: boolean) => ({
    flex: 1,
    padding: '12px 16px',
    backgroundColor: 'transparent',
    color: isActive ? theme.colors.text : theme.colors.textSecondary,
    border: 'none',
    borderBottom: isActive ? `2px solid ${theme.colors.primary}` : `2px solid transparent`,
    cursor: transcriptionStatus.isTranscribing ? 'not-allowed' : 'pointer',
    fontSize: '14px',
    fontWeight: isActive ? '500' : '400',
    transition: 'all 0.15s ease',
    borderRadius: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
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
          onClick={() => !transcriptionStatus.isTranscribing && setActiveTab('styling')}
          style={tabStyle(activeTab === 'styling')}
        >
          <Palette size={14} />
          Styling
        </button>
        <button
          onClick={() => !transcriptionStatus.isTranscribing && setActiveTab('aiSubtitles')}
          style={tabStyle(activeTab === 'aiSubtitles')}
        >
          <Brain size={14} />
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
        ) : activeTab === 'styling' ? (
          <StylingPanel
            onTimeSeek={onTimeSeek}
            transcriptionStatus={transcriptionStatus}
            aiSubtitleData={aiSubtitleData}
            selectedFrameId={selectedFrameId}
            onAISubtitleUpdate={onAISubtitleUpdate}
          />
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