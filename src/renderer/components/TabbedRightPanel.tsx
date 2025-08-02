import React, { useState } from 'react';
import { CaptionSegment, VideoFile, ExportSettings } from '../../types';
import StylingPanel from './StylingPanel';
import SubtitlePanel from './SubtitlePanel';

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
  const [activeTab, setActiveTab] = useState<TabType>('styling');

  const tabStyle = (isActive: boolean) => ({
    flex: 1,
    padding: '10px 16px',
    backgroundColor: isActive ? '#007acc' : '#444',
    color: '#fff',
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
      backgroundColor: '#2a2a2a'
    }}>
      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #555',
        backgroundColor: '#333'
      }}>
        <button
          onClick={() => setActiveTab('styling')}
          style={tabStyle(activeTab === 'styling')}
        >
          🎨 Styling
        </button>
        <button
          onClick={() => setActiveTab('subtitles')}
          style={tabStyle(activeTab === 'subtitles')}
        >
          📝 Subtitles
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