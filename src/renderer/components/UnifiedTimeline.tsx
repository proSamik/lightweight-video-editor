import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CaptionSegment } from '../../types';
import { useTheme } from '../contexts/ThemeContext';

interface UnifiedTimelineProps {
  captions: CaptionSegment[];
  currentTime: number;
  selectedSegmentId: string | null;
  onSegmentSelect: (segmentId: string) => void;
  onTimeSeek: (time: number) => void;
  onSegmentDelete: (segmentId: string) => void;
  onCaptionUpdate: (segmentId: string, updates: Partial<CaptionSegment>) => void;
  videoFile?: { path: string; name: string; duration?: number } | null;
  onReTranscribeSegment?: (startTime: number, endTime: number) => void;
  onSplitSegment?: (segmentId: string, splitTime: number) => void;
  onPlayPause?: () => void;
  isPlaying?: boolean;
}

const UnifiedTimeline: React.FC<UnifiedTimelineProps> = ({
  captions,
  currentTime,
  selectedSegmentId,
  onSegmentSelect,
  onTimeSeek,
  onSegmentDelete,
  onCaptionUpdate,
  videoFile,
  onReTranscribeSegment,
  onSplitSegment,
  onPlayPause,
  isPlaying = false,
}) => {
  const { theme } = useTheme();
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [hoveredSegmentId, setHoveredSegmentId] = useState<string | null>(null);
  const [splitPreviewTime, setSplitPreviewTime] = useState<number | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, segmentId: string} | null>(null);
  const [splitMode, setSplitMode] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{segmentId: string, text: string} | null>(null);

  // Calculate timeline dimensions
  const TIMELINE_HEIGHT = 120;
  const WAVEFORM_HEIGHT = 60;
  const CAPTION_TRACK_HEIGHT = 40;
  const SCRUBBER_HEIGHT = 20;

  // Use video duration if available, otherwise fallback to caption duration
  const totalDuration = videoFile?.duration 
    ? videoFile.duration * 1000 // Convert from seconds to milliseconds
    : captions.length > 0 
      ? Math.max(...captions.map(c => c.endTime))
      : 60000; // Default 1 minute

  // Format time display
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Handle timeline click/drag
  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const seekTime = percentage * totalDuration;
    
    // If in split mode and clicked on a segment, split it
    if (splitMode) {
      const clickedSegment = captions.find(segment => 
        seekTime >= segment.startTime && seekTime <= segment.endTime
      );
      if (clickedSegment && onSplitSegment) {
        onSplitSegment(clickedSegment.id, seekTime);
        setSplitMode(false);
        return;
      }
    }
    
    setIsDragging(true);
    setDragStartX(clickX);
    onTimeSeek(seekTime);
  };

  const handleTimelineMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, mouseX / rect.width));
    const seekTime = percentage * totalDuration;
    
    onTimeSeek(seekTime);
  }, [isDragging, totalDuration, onTimeSeek]);

  const handleTimelineMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Set up mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleTimelineMouseMove);
      document.addEventListener('mouseup', handleTimelineMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleTimelineMouseMove);
      document.removeEventListener('mouseup', handleTimelineMouseUp);
    };
  }, [isDragging, handleTimelineMouseMove, handleTimelineMouseUp]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input field
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true';
      
      if (isInputField) {
        return; // Let the input field handle the keypress
      }

      if (e.key === 's' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setSplitMode(!splitMode);
      } else if (e.key === 'Escape') {
        setSplitMode(false);
        setContextMenu(null);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedSegmentId) {
          const segment = captions.find(c => c.id === selectedSegmentId);
          if (segment) {
            setDeleteConfirm({
              segmentId: selectedSegmentId,
              text: segment.text
            });
          }
        }
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (onPlayPause) {
          onPlayPause();
        }
      }
    };

    const handleClick = () => {
      setContextMenu(null);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClick);
    };
  }, [splitMode, selectedSegmentId, onSegmentDelete]);

  // Generate simple waveform (placeholder)
  useEffect(() => {
    if (videoFile) {
      // Generate a simple waveform simulation
      const points = 200;
      const data = Array.from({ length: points }, (_, i) => {
        return Math.sin(i * 0.1) * 0.5 + Math.random() * 0.3 + 0.2;
      });
      setWaveformData(data);
    }
  }, [videoFile]);

  // Handle segment operations
  const handleSegmentDoubleClick = (segment: CaptionSegment) => {
    onSegmentSelect(segment.id);
    onTimeSeek(segment.startTime);
  };

  const handleSegmentSplit = (segmentId: string, splitTime: number) => {
    if (onSplitSegment) {
      onSplitSegment(segmentId, splitTime);
    }
  };

  return (
    <div style={{
      height: `${TIMELINE_HEIGHT}px`,
      backgroundColor: '#2a2a2a',
      borderTop: '1px solid #444',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Timeline Header */}
      <div style={{
        height: '24px',
        backgroundColor: '#333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        fontSize: '12px',
        color: '#ccc',
        borderBottom: '1px solid #444'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Play/Pause Button */}
          {onPlayPause && (
            <button
              onClick={onPlayPause}
              style={{
                padding: '4px 8px',
                backgroundColor: isPlaying ? theme.colors.success : theme.colors.secondary,
                color: theme.colors.text,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                minWidth: '60px',
                justifyContent: 'center'
              }}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? '⏸️ Pause' : '▶️ Play'}
            </button>
          )}
          <span>Timeline</span>
          <span style={{ color: '#888' }}>{formatTime(currentTime)} / {formatTime(totalDuration)}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setSplitMode(!splitMode)}
            style={{
              padding: '4px 8px',
              backgroundColor: splitMode ? theme.colors.primary : theme.colors.surface,
              color: theme.colors.text,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '10px'
            }}
            title="Split Mode (S)"
          >
            ✂️ {splitMode ? 'Split ON' : 'Split'}
          </button>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: theme.colors.success
          }} />
          <span style={{ fontSize: '11px' }}>Live</span>
        </div>
      </div>

      {/* Main Timeline Area */}
      <div 
        ref={timelineRef}
        style={{
          height: `${TIMELINE_HEIGHT - 24}px`,
          position: 'relative',
          cursor: isDragging ? 'grabbing' : 'pointer',
          backgroundColor: theme.colors.background
        }}
        onMouseDown={handleTimelineMouseDown}
        onMouseMove={(e) => {
          if (!timelineRef.current) return;
          const rect = timelineRef.current.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const percentage = mouseX / rect.width;
          const hoverTime = percentage * totalDuration;
          setSplitPreviewTime(hoverTime);
        }}
        onMouseLeave={() => setSplitPreviewTime(null)}
      >
        {/* Waveform Background */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: `${WAVEFORM_HEIGHT}px`,
          display: 'flex',
          alignItems: 'flex-end',
          backgroundColor: theme.colors.background
        }}>
          {waveformData.map((amplitude, index) => (
            <div
              key={index}
              style={{
                width: `${100 / waveformData.length}%`,
                height: `${amplitude * WAVEFORM_HEIGHT}px`,
                backgroundColor: theme.colors.surface,
                marginRight: '1px'
              }}
            />
          ))}
        </div>

        {/* Caption Segments Track */}
        <div style={{
          position: 'absolute',
          top: `${WAVEFORM_HEIGHT}px`,
          left: 0,
          right: 0,
          height: `${CAPTION_TRACK_HEIGHT}px`,
          backgroundColor: theme.colors.background
        }}>
          {captions.map((segment) => {
            const startPercent = (segment.startTime / totalDuration) * 100;
            const widthPercent = ((segment.endTime - segment.startTime) / totalDuration) * 100;
            const isSelected = selectedSegmentId === segment.id;
            const isHovered = hoveredSegmentId === segment.id;

            return (
              <div
                key={segment.id}
                style={{
                  position: 'absolute',
                  left: `${startPercent}%`,
                  width: `${widthPercent}%`,
                  height: '100%',
                  backgroundColor: isSelected ? theme.colors.primary : isHovered ? theme.colors.surface : theme.colors.background,
                  border: isSelected ? `2px solid ${theme.colors.primary}` : `1px solid ${theme.colors.border}`,
                  borderRadius: '2px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  color: theme.colors.text,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  padding: '0 4px',
                  transition: 'all 0.2s ease'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSegmentSelect(segment.id);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  handleSegmentDoubleClick(segment);
                }}
                onMouseEnter={() => setHoveredSegmentId(segment.id)}
                onMouseLeave={() => setHoveredSegmentId(null)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    segmentId: segment.id
                  });
                }}
                title={`${segment.text.substring(0, 50)}${segment.text.length > 50 ? '...' : ''}`}
              >
                {segment.text.length > 20 ? segment.text.substring(0, 20) + '...' : segment.text}
              </div>
            );
          })}
        </div>

        {/* Scrubber/Playhead */}
        <div style={{
          position: 'absolute',
          left: `${(currentTime / totalDuration) * 100}%`,
          top: 0,
          bottom: 0,
          width: '2px',
          backgroundColor: theme.colors.error,
          zIndex: 10,
          pointerEvents: 'none',
          boxShadow: '0 0 4px rgba(255, 68, 68, 0.5)'
        }}>
          {/* Playhead handle */}
          <div style={{
            position: 'absolute',
            top: '-4px',
            left: '-6px',
            width: '14px',
            height: '14px',
            backgroundColor: theme.colors.error,
            border: `2px solid ${theme.colors.text}`,
            borderRadius: '50%',
            cursor: 'grab'
          }} />
        </div>

        {/* Split Preview Line */}
        {splitPreviewTime !== null && (
          <div style={{
            position: 'absolute',
            left: `${(splitPreviewTime / totalDuration) * 100}%`,
            top: `${WAVEFORM_HEIGHT}px`,
            height: `${CAPTION_TRACK_HEIGHT}px`,
            width: '1px',
            backgroundColor: theme.colors.primary,
            zIndex: 5,
            pointerEvents: 'none'
          }} />
        )}

        {/* Time markers */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${SCRUBBER_HEIGHT}px`,
          backgroundColor: '#333'
        }}>
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
                  fontSize: '9px',
                  color: theme.colors.textSecondary,
                  whiteSpace: 'nowrap'
                }}
              >
                {formatTime(time)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            backgroundColor: theme.colors.background,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: '4px',
            padding: '4px 0',
            zIndex: 1000,
            minWidth: '120px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '12px',
              color: theme.colors.text,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onClick={() => {
              if (onSplitSegment) {
                onSplitSegment(contextMenu.segmentId, currentTime);
              }
              setContextMenu(null);
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = theme.colors.surface;
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'transparent';
            }}
          >
            ✂️ Split at Current Time
          </div>
          <div
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '12px',
              color: theme.colors.error,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onClick={() => {
              const segment = captions.find(c => c.id === contextMenu.segmentId);
              if (segment) {
                setDeleteConfirm({
                  segmentId: contextMenu.segmentId,
                  text: segment.text
                });
              }
              setContextMenu(null);
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = theme.colors.surface;
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'transparent';
            }}
          >
            🗑️ Delete Segment
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme.colors.background,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: theme.colors.background,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: theme.colors.text,
              fontSize: '16px'
            }}>
              Delete Caption Segment?
            </h3>
            <p style={{
              margin: '0 0 16px 0',
              color: theme.colors.textSecondary,
              fontSize: '14px',
              lineHeight: '1.4'
            }}>
              Are you sure you want to delete this caption segment?
            </p>
            <div style={{
              backgroundColor: theme.colors.background,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: '4px',
              padding: '12px',
              margin: '0 0 20px 0',
              fontSize: '12px',
                color: theme.colors.textSecondary,
              maxHeight: '80px',
              overflowY: 'auto'
            }}>
              "{deleteConfirm.text}"
            </div>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: theme.colors.secondary,
                  color: theme.colors.text,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onSegmentDelete(deleteConfirm.segmentId);
                  setDeleteConfirm(null);
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: theme.colors.error,
                  color: theme.colors.text,
                  border: `1px solid ${theme.colors.error}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedTimeline;