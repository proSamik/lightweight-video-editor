import React from 'react';
import { CaptionSegment } from '../../types';

interface TimelinePanelProps {
  captions: CaptionSegment[];
  currentTime: number;
  selectedSegmentId: string | null;
  onSegmentSelect: (segmentId: string) => void;
  onTimeSeek: (time: number) => void;
  onSegmentDelete: (segmentId: string) => void;
  videoFile?: { path: string; name: string; duration?: number } | null;
}

const TimelinePanel: React.FC<TimelinePanelProps> = ({
  captions,
  currentTime,
  selectedSegmentId,
  onSegmentSelect,
  onTimeSeek,
  onSegmentDelete,
  videoFile,
}) => {
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Use video duration if available, otherwise fallback to caption duration
  const totalDuration = videoFile?.duration 
    ? videoFile.duration * 1000 // Convert from seconds to milliseconds
    : captions.length > 0 
      ? Math.max(...captions.map(c => c.endTime))
      : 60000; // Default 1 minute

  return (
    <div style={{
      height: '200px',
      backgroundColor: '#2a2a2a',
      borderTop: '1px solid #333',
      padding: '20px',
      overflow: 'hidden'
    }}>
      <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Caption Timeline</h3>
      
      {/* Timeline Ruler */}
      <div style={{
        height: '30px',
        position: 'relative',
        backgroundColor: '#333',
        borderRadius: '4px',
        marginBottom: '15px',
        cursor: 'pointer'
      }} onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        const seekTime = percentage * totalDuration;
        onTimeSeek(seekTime);
      }}>
        {/* Current Time Indicator */}
        <div style={{
          position: 'absolute',
          left: `${(currentTime / totalDuration) * 100}%`,
          top: 0,
          bottom: 0,
          width: '2px',
          backgroundColor: '#ff6b6b',
          zIndex: 2
        }} />
        
        {/* Time Markers */}
        {Array.from({ length: 11 }, (_, i) => {
          const time = (i / 10) * totalDuration;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${i * 10}%`,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '10px',
                color: '#888',
                whiteSpace: 'nowrap'
              }}
            >
              {formatTime(time)}
            </div>
          );
        })}
      </div>

      {/* Caption Segments */}
      <div style={{
        height: '120px',
        overflowY: 'auto',
        overflowX: 'hidden'
      }}>
        {captions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#888',
            marginTop: '40px'
          }}>
            No captions loaded. Import a video to generate captions.
          </div>
        ) : (
          captions.map((caption) => (
            <div
              key={caption.id}
              style={{
                padding: '8px 12px',
                marginBottom: '8px',
                backgroundColor: selectedSegmentId === caption.id ? '#444' : '#363636',
                borderRadius: '4px',
                cursor: 'pointer',
                border: selectedSegmentId === caption.id ? '1px solid #666' : '1px solid transparent',
                transition: 'all 0.2s ease'
              }}
              onClick={() => onSegmentSelect(caption.id)}
              onDoubleClick={() => {
                // Select the segment and seek to its start time
                onSegmentSelect(caption.id);
                onTimeSeek(caption.endTime);
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <span style={{ fontSize: '12px', color: '#888' }}>
                  {formatTime(caption.startTime)} - {formatTime(caption.endTime)}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#888' }}>
                    {Math.round((caption.endTime - caption.startTime) / 1000)}s
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent segment selection
                      onSegmentDelete(caption.id);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ff6b6b',
                      cursor: 'pointer',
                      fontSize: '16px',
                      padding: '2px',
                      borderRadius: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Delete this caption segment"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <div style={{
                fontSize: '14px',
                lineHeight: '1.4',
                color: selectedSegmentId === caption.id ? '#fff' : '#ccc'
              }}>
                {caption.text}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TimelinePanel;