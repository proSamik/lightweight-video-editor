import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CaptionSegment } from '../../types';
import { useTheme } from '../contexts/ThemeContext';
import { 
  FiPlay, 
  FiPause, 
  FiSkipBack, 
  FiSkipForward, 
  FiRotateCcw, 
  FiRotateCw, 
  FiTrash2,
  FiMaximize2
} from 'react-icons/fi';
import WaveSurfer from 'wavesurfer.js';

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
  onPlayPause?: () => void;
  isPlaying?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

/**
 * UnifiedTimeline component - A comprehensive timeline interface for video editing
 * Features: audio waveform visualization, caption segments, playback controls, and timeline scrubbing
 */
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
  onPlayPause,
  isPlaying = false,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}) => {
  const { theme } = useTheme();
  const timelineRef = useRef<HTMLDivElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [hoveredSegmentId, setHoveredSegmentId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, segmentId: string} | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{segmentId: string, text: string} | null>(null);
  const [isWaveformLoading, setIsWaveformLoading] = useState(false);

  // Timeline dimensions
  const TIMELINE_HEIGHT = 180;
const WAVEFORM_HEIGHT = 100;
  const CAPTION_TRACK_HEIGHT = 40;
  const SCRUBBER_HEIGHT = 20;

  // Use video duration if available, otherwise fallback to caption duration
  const totalDuration = videoFile?.duration 
    ? videoFile.duration * 1000 // Convert from seconds to milliseconds
    : captions.length > 0 
      ? Math.max(...captions.map(c => c.endTime))
      : 60000; // Default 1 minute

  /**
   * Format time display in MM:SS.ms format
   */
  const formatTime = (ms: number) => {
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  /**
   * Handle timeline click/drag for seeking
   */
  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const seekTime = percentage * totalDuration;
    
    setIsDragging(true);
    setDragStartX(clickX);
    onTimeSeek(seekTime);
  };

  /**
   * Handle timeline mouse movement for dragging
   */
  const handleTimelineMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, mouseX / rect.width));
    const seekTime = percentage * totalDuration;
    
    onTimeSeek(seekTime);
  }, [isDragging, totalDuration, onTimeSeek]);

  /**
   * Handle timeline mouse up to stop dragging
   */
  const handleTimelineMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Set up mouse event listeners for dragging
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

  /**
   * Handle keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input field
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true';
      
      if (isInputField) {
        return;
      }

      if (e.key === 'Escape') {
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
      } else if (e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        if (onUndo && canUndo) {
          onUndo();
        }
      } else if (e.key === 'z' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        if (onRedo && canRedo) {
          onRedo();
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
  }, [selectedSegmentId, onSegmentDelete, onPlayPause, onUndo, onRedo, canUndo, canRedo]);

  /**
   * Initialize WaveSurfer for audio waveform generation
   */
  useEffect(() => {
    // Clean up existing WaveSurfer instance if videoFile changes
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }

    if (videoFile && waveformRef.current) {
      setIsWaveformLoading(true);
      
      // Initialize WaveSurfer
      const wavesurfer = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: theme.colors.primary,
        progressColor: theme.colors.accent,
        cursorColor: 'transparent',
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: WAVEFORM_HEIGHT,
        normalize: true,
        fillParent: true,
        hideScrollbar: true,
        interact: false, // Disable interaction since we handle timeline scrubbing
      });

      wavesurferRef.current = wavesurfer;

      // Load audio from video file
      wavesurfer.load(`file://${videoFile.path}`);

      // Handle waveform ready event
      wavesurfer.on('ready', () => {
        setIsWaveformLoading(false);
      });

      // Handle errors
      wavesurfer.on('error', (err) => {
        setIsWaveformLoading(false);
        // No fallback - just log the error
      });

      return () => {
        if (wavesurferRef.current) {
          wavesurferRef.current.destroy();
          wavesurferRef.current = null;
        }
        setIsWaveformLoading(false);
      };
    }
    
    // Return empty cleanup function if conditions are not met
    return () => {};
  }, [videoFile?.path]); // Only depend on video file path, not theme colors

  /**
   * Update WaveSurfer colors when theme changes (without re-initializing)
   */
  useEffect(() => {
    if (wavesurferRef.current) {
      // Update colors without re-initializing
      wavesurferRef.current.setOptions({
        waveColor: theme.colors.primary,
        progressColor: theme.colors.accent,
      });
    }
  }, [theme.colors.primary, theme.colors.accent]);

  /**
   * Update waveform progress based on current time
   */
  useEffect(() => {
    if (wavesurferRef.current && totalDuration > 0) {
      const progress = currentTime / totalDuration;
      wavesurferRef.current.setTime(progress * wavesurferRef.current.getDuration());
    }
  }, [currentTime, totalDuration]);

  /**
   * Handle segment double click to select and seek
   */
  const handleSegmentDoubleClick = (segment: CaptionSegment) => {
    onSegmentSelect(segment.id);
    onTimeSeek(segment.startTime);
  };



  return (
    <div style={{
      height: `${TIMELINE_HEIGHT}px`,
      backgroundColor: theme.colors.background,
      borderTop: `1px solid ${theme.colors.border}`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      {/* Timeline Header with Controls */}
      <div style={{
        height: '32px',
        backgroundColor: theme.colors.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        fontSize: '12px',
        color: theme.colors.textSecondary,
        borderBottom: `1px solid ${theme.colors.border}`
      }}>
        {/* Left side - Time Display */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ color: theme.colors.textSecondary, fontFamily: 'monospace' }}>
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </span>
        </div>

        {/* Center - Playback Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Skip Backward */}
          <button
            onClick={() => onTimeSeek(Math.max(0, currentTime - 5000))}
            style={{
              padding: '4px',
              backgroundColor: 'transparent',
              color: theme.colors.textSecondary,
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
              e.currentTarget.style.color = theme.colors.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = theme.colors.textSecondary;
            }}
            title="Skip Backward 5s"
          >
            <FiSkipBack size={14} />
          </button>

          {/* Play/Pause Button */}
          {onPlayPause && (
            <button
              onClick={onPlayPause}
              style={{
                padding: '6px',
                backgroundColor: isPlaying ? theme.colors.success : theme.colors.primary,
                color: theme.colors.primaryForeground,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                minWidth: '32px',
                minHeight: '32px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isPlaying ? theme.colors.successHover : theme.colors.primaryHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isPlaying ? theme.colors.success : theme.colors.primary;
              }}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <FiPause size={16} /> : <FiPlay size={16} />}
            </button>
          )}

          {/* Skip Forward */}
          <button
            onClick={() => onTimeSeek(Math.min(totalDuration, currentTime + 5000))}
            style={{
              padding: '4px',
              backgroundColor: 'transparent',
              color: theme.colors.textSecondary,
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
              e.currentTarget.style.color = theme.colors.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = theme.colors.textSecondary;
            }}
            title="Skip Forward 5s"
          >
            <FiSkipForward size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingRight: '8px' }}>
          {/* Undo/Redo Controls */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            style={{
              padding: '4px',
              backgroundColor: 'transparent',
              color: canUndo ? theme.colors.textSecondary : theme.colors.textMuted,
              border: 'none',
              borderRadius: '3px',
              cursor: canUndo ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (canUndo) {
                e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
                e.currentTarget.style.color = theme.colors.text;
              }
            }}
            onMouseLeave={(e) => {
              if (canUndo) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = theme.colors.textSecondary;
              }
            }}
            title="Undo (Ctrl+Z)"
          >
            <FiRotateCcw size={14} />
          </button>

          <button
            onClick={onRedo}
            disabled={!canRedo}
            style={{
              padding: '4px',
              backgroundColor: 'transparent',
              color: canRedo ? theme.colors.textSecondary : theme.colors.textMuted,
              border: 'none',
              borderRadius: '3px',
              cursor: canRedo ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (canRedo) {
                e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
                e.currentTarget.style.color = theme.colors.text;
              }
            }}
            onMouseLeave={(e) => {
              if (canRedo) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = theme.colors.textSecondary;
              }
            }}
            title="Redo (Ctrl+Shift+Z)"
          >
            <FiRotateCw size={14} />
          </button>

          {/* Separator */}
          <div style={{
            width: '1px',
            height: '16px',
            backgroundColor: theme.colors.border,
            margin: '0 4px'
          }} />

          {/* Fullscreen Button */}
          <button
            onClick={() => {
              // Request fullscreen for the video preview container
              const videoPreviewContainer = document.querySelector('[data-video-preview]');
              if (videoPreviewContainer) {
                if (document.fullscreenElement) {
                  document.exitFullscreen();
                } else {
                  videoPreviewContainer.requestFullscreen();
                }
              }
            }}
            style={{
              padding: '4px',
              backgroundColor: 'transparent',
              color: theme.colors.textSecondary,
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
              e.currentTarget.style.color = theme.colors.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = theme.colors.textSecondary;
            }}
            title="Toggle Fullscreen"
          >
            <FiMaximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Main Timeline Area */}
      <div 
        ref={timelineRef}
        style={{
          height: `${TIMELINE_HEIGHT - 32}px`,
          position: 'relative',
          cursor: isDragging ? 'grabbing' : 'pointer',
          backgroundColor: theme.colors.background,
          overflow: 'hidden',
          paddingBottom: '8px',
          marginLeft: '10px',
        }}
        onMouseDown={handleTimelineMouseDown}
      >
        {/* Waveform Background - Only show when video file is available */}
        {videoFile && (
          <div 
            ref={waveformRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: `${WAVEFORM_HEIGHT}px`,
              backgroundColor: theme.colors.background
            }}
          />
        )}
        
        {/* Loading indicator overlay */}
        {videoFile && isWaveformLoading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: `${WAVEFORM_HEIGHT}px`,
            backgroundColor: theme.colors.background,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: theme.colors.textSecondary,
              fontSize: '12px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                border: `2px solid ${theme.colors.border}`,
                borderTop: `2px solid ${theme.colors.primary}`,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <span>Generating waveform...</span>
            </div>
          </div>
        )}

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
              (e.target as HTMLElement).style.backgroundColor = theme.colors.surfaceHover;
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'transparent';
            }}
          >
            <FiTrash2 size={14} />
            Delete Segment
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedTimeline;