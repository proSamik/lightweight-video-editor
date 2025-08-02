import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { CaptionSegment, VideoFile, ExportSettings } from '../../types';
import StylingPanel from './StylingPanel';
import SubtitlePanel from './SubtitlePanel';
import { Palette, FileText } from 'lucide-react';

interface TabbedRightPanelProps {
  selectedSegment: CaptionSegment | null;
  onSegmentUpdate: (segmentId: string, updates: Partial<CaptionSegment>) => void;
  videoFile: VideoFile | null;
  captions: CaptionSegment[];
  onExport: (settings: ExportSettings) => void;
  onApplyToAll: (styleUpdates: Partial<CaptionSegment['style']>) => void;
  onTimeSeek: (time: number) => void;
  transcriptionStatus: {
    isTranscribing: boolean;
    progress: number;
    message: string;
  };
  selectedSegmentId: string | null;
  onSegmentSelect: (segmentId: string) => void;
  onSegmentDelete: (segmentId: string) => void;
  currentTime: number;
}

type TabType = 'styling' | 'subtitles';

const TabbedRightPanel: React.FC<TabbedRightPanelProps> = ({
  selectedSegment,
  onSegmentUpdate,
  videoFile,
  captions,
  onExport,
  onApplyToAll,
  onTimeSeek,
  transcriptionStatus,
  selectedSegmentId,
  onSegmentSelect,
  onSegmentDelete,
  currentTime,
}) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('styling');

  const tabStyle = (isActive: boolean) => ({
    flex: 1,
    padding: '10px 16px',
    backgroundColor: isActive ? theme.colors.primary : theme.colors.surface,
    color: theme.colors.text,
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    borderRadius: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px'
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
          onClick={() => setActiveTab('subtitles')}
          style={tabStyle(activeTab === 'subtitles')}
        >
          <FileText size={14} />
          Subtitles
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
            videoFile={videoFile}
            captions={captions}
            onExport={onExport}
            onApplyToAll={onApplyToAll}
            onTimeSeek={onTimeSeek}
            transcriptionStatus={transcriptionStatus}
          />
        ) : (
          <SubtitlePanel
            captions={captions}
            selectedSegmentId={selectedSegmentId}
            onSegmentSelect={onSegmentSelect}
            onCaptionUpdate={onSegmentUpdate}
            onSegmentDelete={onSegmentDelete}
            onTimeSeek={onTimeSeek}
            currentTime={currentTime}
          />
        )}
      </div>
    </div>
  );
};

export default TabbedRightPanel;