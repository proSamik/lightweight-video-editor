import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { AISubtitleData, SubtitleFrame, SubtitleStyle } from '../../types';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui';
import { 
  FiPlay, 
  FiPause, 
  FiSkipBack, 
  FiSkipForward, 
  FiRotateCcw, 
  FiRotateCw, 
  FiTrash2,
  FiMaximize2,
  FiCheck,
  FiSquare
} from 'react-icons/fi';


interface UnifiedTimelineProps {
  currentTime: number;
  onTimeSeek: (time: number) => void;
  videoFile?: { path: string; name: string; duration?: number } | null;
  onPlayPause?: () => void;
  isPlaying?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  replacementAudioPath?: string | null;
  onAudioPreviewToggle?: (enabled: boolean) => void;
  // AI Subtitle support - when available, use instead of captions
  aiSubtitleData?: AISubtitleData | null;
  selectedFrameId?: string | null;
  onFrameSelect?: (frameId: string) => void;
}

/**
 * UnifiedTimeline component - Clean architecture with proper parent-child relationship
 * Parent controls all scroll, zoom, and interaction behavior
 * Timeline component with scroll, zoom, and interaction controls
 */
const UnifiedTimeline: React.FC<UnifiedTimelineProps> = ({
  currentTime,
  onTimeSeek,
  videoFile,
  onPlayPause,
  isPlaying = false,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  replacementAudioPath,
  onAudioPreviewToggle,
  aiSubtitleData,
  selectedFrameId,
  onFrameSelect,
}) => {
  const { theme } = useTheme();
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAudioPreviewEnabled, setIsAudioPreviewEnabled] = useState(true); // Default to enabled when replacement audio is loaded

  const [contextMenu, setContextMenu] = useState<{x: number, y: number, segmentId: string} | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{segmentId: string, text: string} | null>(null);
  const [zoomLevel, setZoomLevel] = useState(0);

  // Convert AI subtitle frames to virtual caption segments for timeline display
  type DisplaySegment = { id: string; startTime: number; endTime: number; text: string; style: SubtitleStyle };
  const virtualCaptionsFromAI = useMemo((): DisplaySegment[] => {
    if (!aiSubtitleData) return [];
    
    const virtualCaptions: DisplaySegment[] = [];
    
    aiSubtitleData.frames.forEach(frame => {
      // Provide a safe fallback style
      const baseStyle = frame.style || {
        font: 'Segoe UI',
        fontSize: 85,
        textColor: '#ffffff',
        highlighterColor: '#ffff00',
        backgroundColor: 'transparent',
        strokeColor: '#000000',
        strokeWidth: 2,
        textTransform: 'none',
        position: { x: 50, y: 80, z: 0 },
        renderMode: 'horizontal',
        textAlign: 'center',
        scale: 1,
        emphasizeMode: true,
        burnInSubtitles: true,
      } as any;

      // Get visible words from the frame
      const visibleWords = frame.words.filter(word => 
        word.editState !== 'strikethrough' && 
        word.editState !== 'removedCaption' &&
        !word.isPause
      );

      if (visibleWords.length === 0) return; // Skip empty frames

      // Create virtual caption segment for timeline
      const virtualCaption: DisplaySegment = {
        id: frame.id,
        startTime: frame.startTime * 1000, // Convert seconds to milliseconds
        endTime: frame.endTime * 1000,
        text: visibleWords.map(w => w.word).join(' '),
        style: baseStyle
      };

      virtualCaptions.push(virtualCaption);
    });

    return virtualCaptions.sort((a, b) => a.startTime - b.startTime);
  }, [aiSubtitleData]);

  // Use AI-derived segments
  const effectiveCaptions = virtualCaptionsFromAI;
  const effectiveSelectedId = selectedFrameId || null;


  // Timeline dimensions
  const TIMELINE_HEIGHT = 160;
  const CAPTION_TRACK_HEIGHT = 140;

  // Use video duration if available, otherwise fallback to caption duration
  const actualDuration = videoFile?.duration 
    ? videoFile.duration * 1000 // Convert from seconds to milliseconds
    : effectiveCaptions.length > 0 
      ? Math.max(...effectiveCaptions.map(c => c.endTime))
      : 60000; // Default 1 minute

  /**
   * Calculate adaptive zoom multiplier based on video duration
   * Short videos (< 2 min): 1x multiplier (normal zoom range)
   * Medium videos (2-10 min): 2x multiplier 
   * Long videos (10-30 min): 5x multiplier
   * Very long videos (> 30 min): 10x multiplier
   */
  const getZoomMultiplier = (durationMs: number): number => {
    const durationMinutes = durationMs / (1000 * 60);
    
    if (durationMinutes < 2) {
      return 1; // Short videos: normal zoom range
    } else if (durationMinutes < 10) {
      return 2; // Medium videos: 2x zoom capability
    } else if (durationMinutes < 30) {
      return 5; // Long videos: 5x zoom capability  
    } else {
      return 10; // Very long videos: 10x zoom capability
    }
  };

  // Calculate the actual zoom multiplier for this video
  const zoomMultiplier = getZoomMultiplier(actualDuration);

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
    const seekTime = percentage * actualDuration; // Use actual duration for seeking
    
    setIsDragging(true);

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
    const seekTime = percentage * actualDuration; // Use actual duration for seeking
    
    onTimeSeek(seekTime);
  }, [isDragging, actualDuration, onTimeSeek]);

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
      if (e.key === ' ') {
        e.preventDefault();
        onPlayPause?.();
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) onRedo?.();
        } else {
          if (canUndo) onUndo?.();
        }
      }
    };

    const handleClick = (e: MouseEvent) => {
      // Close context menu on outside click
      if (contextMenu) {
        setContextMenu(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClick);
    };
  }, [onPlayPause, onUndo, onRedo, canUndo, canRedo, contextMenu]);

  /**
   * Update container width when timeline container changes
   */
  useEffect(() => {
    if (timelineContainerRef.current) {
      const updateWidth = () => {
        if (timelineContainerRef.current) {
          // setContainerWidth(timelineContainerRef.current.clientWidth);
        }
      };
      
      updateWidth(); // Initial update
      
      const resizeObserver = new ResizeObserver(updateWidth);
      resizeObserver.observe(timelineContainerRef.current);
      
      return () => resizeObserver.disconnect();
    }
    // No cleanup needed if no container
    return undefined;
  }, []);

  // Store the relative playhead position within viewport when zoom changes
  const [playheadViewportRatio, setPlayheadViewportRatio] = React.useState<number | null>(null);
  
  /**
   * Auto-scroll timeline to maintain playhead position during zoom
   */
  useEffect(() => {
    if (timelineContainerRef.current && timelineRef.current && zoomLevel > 0.1) {
      const container = timelineContainerRef.current;
      const timeline = timelineRef.current;
      const containerWidth = container.offsetWidth;
      
      // If we have a stored viewport ratio (from zoom change), use it to maintain position
      if (playheadViewportRatio !== null) {
        const newTimelineWidth = timeline.offsetWidth;
        const playheadPixelPosition = (currentTime / actualDuration) * newTimelineWidth;
        
        // Calculate target scroll to maintain the playhead in the same viewport position
        let targetScroll;
        if (newTimelineWidth <= containerWidth) {
          // Timeline fits in container, no scrolling needed
          targetScroll = 0;
        } else {
          // Calculate scroll to maintain viewport ratio
          targetScroll = playheadPixelPosition - (playheadViewportRatio * containerWidth);
          targetScroll = Math.max(0, Math.min(newTimelineWidth - containerWidth, targetScroll));
        }
        
        // Apply scroll immediately without any animation
        container.style.scrollBehavior = 'auto';
        container.scrollLeft = targetScroll;
        
        // Reset scroll behavior after a tick
        requestAnimationFrame(() => {
          container.style.scrollBehavior = '';
        });
        
        // Clear the stored ratio after applying
        setPlayheadViewportRatio(null);
        return;
      }
      
      // Normal auto-scroll behavior for playback (not zoom)
      if (zoomLevel > 1) {
        const playheadPosition = (currentTime / actualDuration) * timeline.offsetWidth;
        const scrollLeft = container.scrollLeft;
        const scrollRight = scrollLeft + containerWidth;
        
        // Check if playhead is outside visible area (only for playback, not zoom)
        const margin = containerWidth * 0.05; // Smaller margin to reduce unnecessary scrolling
        
        if (playheadPosition < scrollLeft + margin) {
          // Playhead is too far left, scroll left to show it
          const targetScroll = Math.max(0, playheadPosition - containerWidth * 0.2);
          container.scrollTo({
            left: targetScroll,
            behavior: 'smooth'
          });
        } else if (playheadPosition > scrollRight - margin) {
          // Playhead is too far right, scroll right to show it
          const targetScroll = playheadPosition - containerWidth * 0.8;
          container.scrollTo({
            left: targetScroll,
            behavior: 'smooth'
          });
        }
      }
    }
  }, [currentTime, actualDuration, zoomLevel, playheadViewportRatio]);

  /**
   * Store playhead viewport position before zoom changes
   */
  const handleZoomChange = (newZoomLevel: number) => {
    if (timelineContainerRef.current && timelineRef.current && Math.abs(newZoomLevel - zoomLevel) > 0.01) {
      const container = timelineContainerRef.current;
      const containerWidth = container.offsetWidth;
      const scrollLeft = container.scrollLeft;
      
      // Use current zoom level for accurate position calculation
      const currentTimelineWidth = timelineRef.current.offsetWidth;
      const playheadPixelPosition = (currentTime / actualDuration) * currentTimelineWidth;
      
      // Calculate where the playhead appears in the viewport (0 = left edge, 1 = right edge)
      let viewportRatio;
      if (currentTimelineWidth <= containerWidth) {
        // When timeline fits in container, playhead position relative to container
        viewportRatio = playheadPixelPosition / containerWidth;
      } else {
        // When timeline is scrolled, playhead position relative to visible area
        viewportRatio = Math.max(0, Math.min(1, (playheadPixelPosition - scrollLeft) / containerWidth));
      }
      
      // Store the ratio for the useEffect to use
      setPlayheadViewportRatio(viewportRatio);
    }
    
    // Always update zoom level immediately
    setZoomLevel(newZoomLevel);
  };

  /**
   * Handle segment double click to select and seek to middle
   */
  const handleSegmentDoubleClick = (segment: { id: string; startTime: number; endTime: number }) => {
    onFrameSelect?.(segment.id);
    const middleTime = segment.startTime + ((segment.endTime - segment.startTime) / 2);
    onTimeSeek(middleTime);
  };

  /**
   * Handle segment click to select
   */
  const handleSegmentClick = (segment: { id: string }) => {
    onFrameSelect?.(segment.id);
  };

  // Keep selected frame in view
  useEffect(() => {
    if (!timelineContainerRef.current || !timelineRef.current) return;
    const container = timelineContainerRef.current;
    const timeline = timelineRef.current;
    const selectedId = selectedFrameId;
    if (!selectedId) return;

    // Find the element for the selected segment by data attribute
    const el = timeline.querySelector(`[data-segment-id="${selectedId}"]`) as HTMLElement | null;
    if (!el) return;

    const elLeft = el.offsetLeft;
    const elRight = elLeft + el.offsetWidth;
    const viewLeft = container.scrollLeft;
    const viewRight = viewLeft + container.clientWidth;

    if (elLeft < viewLeft || elRight > viewRight) {
      container.scrollTo({ left: Math.max(0, elLeft - container.clientWidth * 0.2), behavior: 'smooth' });
    }
  }, [selectedFrameId]);

  // Update selected frame when playhead enters a new segment (if none selected or playhead left selected)
  useEffect(() => {
    if (!aiSubtitleData?.frames?.length || !onFrameSelect) return;
    const ms = currentTime;
    const within = virtualCaptionsFromAI.find(seg => ms >= seg.startTime && ms <= seg.endTime);
    if (within && within.id !== selectedFrameId) {
      onFrameSelect(within.id);
    }
  }, [currentTime, aiSubtitleData?.frames, onFrameSelect]);

  return (
    <div style={{ 
      width: '100%', 
      height: `${TIMELINE_HEIGHT}px`,
      background: theme.colors.background,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: '4px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: '10px'
    }}>
      {/* Timeline Controls */}
      <div style={{ 
        height: '32px',
        padding: '4px 8px',
        borderBottom: `1px solid ${theme.colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: theme.colors.surface
      }}>
        {/* Time Display */}
        <div style={{ 
          fontSize: '11px', 
          color: theme.colors.textSecondary,
          fontWeight: '500'
        }}>
          {formatTime(currentTime)} / {formatTime(actualDuration)}
        </div>

        {/* Audio Replacement Indicator */}
        {replacementAudioPath && (
          <div style={{ position: 'relative', zIndex: 10 }}>
            <Button
              variant="primary"
              size="sm"
              leftIcon={
                <div style={{
                  width: '12px',
                  height: '12px',
                  border: '1px solid white',
                  borderRadius: '2px',
                  backgroundColor: isAudioPreviewEnabled ? 'white' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {isAudioPreviewEnabled && <FiCheck size={8} color={theme.colors.primary} />}
                </div>
              }
              onClick={() => {
                const newState = !isAudioPreviewEnabled;
                setIsAudioPreviewEnabled(newState);
                onAudioPreviewToggle?.(newState);
                console.log('Audio preview toggled:', newState);
              }}
              style={{
                fontSize: '10px',
                fontWeight: '500',
                padding: '4px 8px',
                height: 'auto',
                minHeight: '20px'
              }}
            >
              Preview with new audio
            </Button>
          </div>
        )}

        {/* Control Buttons */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
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
            onClick={() => onTimeSeek(Math.min(actualDuration, currentTime + 5000))}
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
          {/* Zoom Control */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            fontSize: '11px',
            color: theme.colors.textSecondary
          }}>
            <span style={{ minWidth: '28px' }}>Zoom</span>
            <input
              type="range"
              min="0.25"
              max="100"
              step="0.1"
              value={zoomLevel}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              style={{
                width: '80px',
                height: '20px',
                background: theme.colors.surface,
                outline: 'none',
                cursor: 'pointer',
                borderRadius: '4px',
              }}
              title={`Zoom: ${Math.round((zoomLevel - 0.25) / (100 - 0.25) * 100)}/100 (${Math.round(zoomLevel * zoomMultiplier * 10)/10}x effective)`}
            />
            <span style={{ minWidth: '32px', fontSize: '10px' }}>
              {Math.round((zoomLevel - 0.25) / (100 - 0.25) * 100)}
            </span>
          </div>
          
          {/* Separator */}
          <div style={{
            width: '1px',
            height: '16px',
            backgroundColor: theme.colors.border,
            margin: '0 4px'
          }} />

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
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = canUndo ? theme.colors.textSecondary : theme.colors.textMuted;
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
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = canRedo ? theme.colors.textSecondary : theme.colors.textMuted;
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
              const videoPreviewContainer = document.querySelector('[data-video-preview]');
              const video = document.querySelector('video');
              
              if (videoPreviewContainer) {
                if (document.fullscreenElement) {
                  document.exitFullscreen();
                } else {
                  videoPreviewContainer.requestFullscreen();
                  
                  // Handle aspect ratio for videos
                  if (video) {
                    const handleFullscreenChange = () => {
                      if (document.fullscreenElement) {
                        const aspectRatio = video.videoWidth / video.videoHeight;
                        
                        // Get the video container div (the one with flex: 1)
                        const videoContainer = video.closest('div[style*="flex: 1"]');
                        const canvas = document.querySelector('canvas');
                        
                        // Check if video is 9:16 (portrait) or close to it
                        if (aspectRatio < 0.6) { // 9:16 = 0.5625, allowing some tolerance
                          // Apply styles for portrait video to use full height
                          video.style.maxWidth = 'none';
                          video.style.maxHeight = '100vh';
                          video.style.width = 'auto';
                          video.style.height = '100vh';
                          video.style.objectFit = 'contain';
                          
                          // Update container to remove constraints
                          if (videoContainer) {
                            (videoContainer as HTMLElement).style.maxHeight = '100vh';
                            (videoContainer as HTMLElement).style.height = '100vh';
                            (videoContainer as HTMLElement).style.padding = '0';
                          }
                          
                          // Also apply to canvas overlay
                          if (canvas) {
                            canvas.style.maxWidth = 'none';
                            canvas.style.maxHeight = '100vh';
                            canvas.style.width = 'auto';
                            canvas.style.height = '100vh';
                          }
                        } else {
                          // For landscape videos, use full width and height
                          video.style.maxWidth = '100vw';
                          video.style.maxHeight = '100vh';
                          video.style.width = '100vw';
                          video.style.height = '100vh';
                          video.style.objectFit = 'contain';
                          
                          // Update container for landscape videos
                          if (videoContainer) {
                            (videoContainer as HTMLElement).style.maxHeight = '100vh';
                            (videoContainer as HTMLElement).style.height = '100vh';
                            (videoContainer as HTMLElement).style.padding = '0';
                          }
                          
                          if (canvas) {
                            canvas.style.maxWidth = '100vw';
                            canvas.style.maxHeight = '100vh';
                            canvas.style.width = '100vw';
                            canvas.style.height = '100vh';
                          }
                        }
                      } else {
                        // Reset to original styles when exiting fullscreen
                        video.style.maxWidth = '100%';
                        video.style.maxHeight = '100%';
                        video.style.width = 'auto';
                        video.style.height = 'auto';
                        video.style.objectFit = 'contain';
                        
                        // Reset container styles
                        const videoContainer = video.closest('div[style*="flex: 1"]');
                        if (videoContainer) {
                          (videoContainer as HTMLElement).style.maxHeight = 'calc(100vh - 300px)';
                          (videoContainer as HTMLElement).style.height = '';
                          (videoContainer as HTMLElement).style.padding = '10px';
                        }
                        
                        const canvas = document.querySelector('canvas');
                        if (canvas) {
                          canvas.style.maxWidth = '100%';
                          canvas.style.maxHeight = '100%';
                          canvas.style.width = '';
                          canvas.style.height = '';
                        }
                      }
                    };
                    
                    // Listen for fullscreen changes
                    document.addEventListener('fullscreenchange', handleFullscreenChange);
                    
                    // Clean up listener when component unmounts or fullscreen exits
                    const cleanup = () => {
                      document.removeEventListener('fullscreenchange', handleFullscreenChange);
                    };
                    
                    // Store cleanup function for potential future use
                    (window as any).fullscreenCleanup = cleanup;
                  }
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
        ref={timelineContainerRef}
        style={{
          height: `${TIMELINE_HEIGHT - 32}px`,
          position: 'relative',
          background: theme.colors.background,
          overflowX: 'auto',
          overflowY: 'hidden',
        }}
      >
        <div 
          ref={timelineRef}
          style={{
            height: '95%',
            position: 'relative',
            cursor: isDragging ? 'grabbing' : 'pointer',
            background: theme.colors.background,
            width: `${Math.max(100 * (zoomLevel * zoomMultiplier), 100)}%`, // Minimum 100% width, scales with adaptive zoom
            minWidth: '100%',
            marginLeft: '10px',
          }}
          onMouseDown={handleTimelineMouseDown}
        >
          
          {/* Current Time Indicator */}
          <div
            style={{
              position: 'absolute',
              left: `${(currentTime / actualDuration) * 100}%`,
              top: 0,
              bottom: 0,
              width: '2px',
              backgroundColor: theme.colors.error,
              zIndex: 100,
              pointerEvents: 'none'
            }}
          />

          {/* Caption Segments */}
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: 0,
              right: 0,
              height: `${CAPTION_TRACK_HEIGHT}px`,
              zIndex: 10
            }}
          >
            {effectiveCaptions.map((segment, index) => {
              const left = (segment.startTime / actualDuration) * 100;
              const width = ((segment.endTime - segment.startTime) / actualDuration) * 100;
              const isSelected = segment.id === effectiveSelectedId;
              
              // Use consistent blue border color for all segments
              const segmentBorderColor = isSelected 
                ? theme.colors.primary 
                : theme.colors.secondary;
              
              const segmentBackgroundColor = isSelected 
                ? theme.colors.secondary 
                : theme.colors.surface;
              
              return (
                <div
                  key={segment.id}
                  data-segment-id={segment.id}
                  style={{
                    position: 'absolute',
                    left: `${left}%`,
                    width: `${width}%`,
                    top: 0,
                    height: '100%',
                    background: segmentBackgroundColor,
                    border: `2px solid ${segmentBorderColor}`,
                    borderRadius: '4px',
                    padding: '4px 6px',
                    fontSize: '11px',
                    color: isSelected ? theme.colors.primaryForeground : theme.colors.text,
                    cursor: 'pointer',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'all 0.2s ease',
                    minWidth: '2px'
                  }}
                  onClick={() => handleSegmentClick(segment)}
                  onDoubleClick={() => handleSegmentDoubleClick(segment)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      segmentId: segment.id
                    });
                  }}
                  title={segment.text}
                >
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '2px',
                    width: '100%',
                    maxWidth: '100%',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start'
                  }}>
                    {segment.text.split(' ').map((word, i) => (
                      <span key={i} style={{ 
                        whiteSpace: 'nowrap',
                        fontSize: '10px',
                        lineHeight: '1.2'
                      }}>{word}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            background: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: '4px',
            padding: '10px',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              color: theme.colors.error,
              fontSize: '12px',
              borderRadius: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onClick={() => setContextMenu(null)}
          >
            <FiTrash2 size={12} />
            Delete Segment
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
          }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            style={{
              background: theme.colors.background,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '400px',
              margin: '20px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0', color: theme.colors.text }}>
              Delete Caption Segment?
            </h3>
            <p style={{ margin: '0 0 20px 0', color: theme.colors.textSecondary }}>
              "{deleteConfirm.text}"
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  padding: '8px 16px',
                  background: theme.colors.surface,
                  color: theme.colors.text,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: theme.colors.error,
                  color: theme.colors.errorForeground,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
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