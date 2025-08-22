import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { AISubtitleData, SubtitleFrame, SubtitleStyle, VideoClip, ClipTimelineData } from '../../types';
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
  FiSquare,
  FiScissors,
  FiX
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
  // New: Clip editing support
  clips?: VideoClip[];
  onClipsChange?: (clips: VideoClip[]) => void;
  onClipModeChange?: (isClipMode: boolean) => void;
  isClipMode?: boolean;
  // Shared zoom state
  zoomLevel?: number;
  onZoomChange?: (level: number) => void;
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
  clips = [],
  onClipsChange,
  onClipModeChange,
  isClipMode = false,
  zoomLevel = 0,
  onZoomChange,
}) => {
  // Early return if data is not ready to prevent initialization errors
  if (!aiSubtitleData?.frames || !Array.isArray(aiSubtitleData.frames)) {
    return null;
  }

  const { theme } = useTheme();
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAudioPreviewEnabled, setIsAudioPreviewEnabled] = useState(true); // Default to enabled when replacement audio is loaded

  const [contextMenu, setContextMenu] = useState<{x: number, y: number, segmentId: string} | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{segmentId: string, text: string} | null>(null);

  // Clip editing state
  const [localClipMode, setLocalClipMode] = useState(isClipMode);
  const [localClips, setLocalClips] = useState<VideoClip[]>(clips);

  // Update local state when props change
  useEffect(() => {
    setLocalClipMode(isClipMode);
  }, [isClipMode]);

  useEffect(() => {
    setLocalClips(clips);
  }, [clips]);

  /**
   * Initialize clips if none exist and we're in clip mode
   */
  const initializeClips = useCallback(() => {
    if (localClips.length === 0 && videoFile?.duration) {
      const initialClip: VideoClip = {
        id: 'clip-1',
        startTime: 0,
        endTime: videoFile.duration * 1000, // Convert to milliseconds
        isRemoved: false
      };
      const newClips = [initialClip];
      setLocalClips(newClips);
      onClipsChange?.(newClips);
    }
  }, [localClips.length, videoFile?.duration, onClipsChange]);

  /**
   * Calculate effective duration (excluding removed clips) - always use clips as source of truth
   */
  const effectiveDuration = useMemo(() => {
    // Always use clips timeline if clips exist, regardless of mode
    if (localClips.length === 0) {
      return videoFile?.duration ? videoFile.duration * 1000 : 60000;
    }

    const activeClips = localClips.filter(clip => !clip.isRemoved);
    if (activeClips.length === 0) return 0;

    return activeClips.reduce((total, clip) => total + (clip.endTime - clip.startTime), 0);
  }, [localClips, videoFile?.duration]);

  /**
   * Convert effective time to original video time
   */
  const effectiveToOriginalTime = useCallback((effectiveTime: number): number => {
    // Always use clips timeline if clips exist, regardless of mode
    if (localClips.length === 0) return effectiveTime;

    const activeClips = localClips.filter(clip => !clip.isRemoved);
    if (activeClips.length === 0) return 0;

    let accumulatedTime = 0;
    for (const clip of activeClips) {
      const clipDuration = clip.endTime - clip.startTime;
      if (effectiveTime <= accumulatedTime + clipDuration) {
        // Time falls within this clip
        const timeWithinClip = effectiveTime - accumulatedTime;
        return clip.startTime + timeWithinClip;
      }
      accumulatedTime += clipDuration;
    }

    return activeClips[activeClips.length - 1]?.endTime || 0;
  }, [localClips]);

  /**
   * Convert original video time to effective time
   */
  const originalToEffectiveTime = useCallback((originalTime: number): number => {
    // Always use clips timeline if clips exist, regardless of mode
    if (localClips.length === 0) return originalTime;

    const activeClips = localClips.filter(clip => !clip.isRemoved);
    if (activeClips.length === 0) return 0;

    let effectiveTime = 0;
    for (const clip of activeClips) {
      if (originalTime >= clip.startTime && originalTime <= clip.endTime) {
        // Time falls within this clip
        return effectiveTime + (originalTime - clip.startTime);
      }
      effectiveTime += clip.endTime - clip.startTime;
    }

    return effectiveTime;
  }, [localClips]);

  /**
   * Handle clip mode toggle
   */
  const handleClipModeToggle = useCallback(() => {
    // Capture current playhead viewport ratio so we can restore scroll after toggle
    if (timelineContainerRef.current && timelineRef.current) {
      const container = timelineContainerRef.current;
      const containerWidth = container.offsetWidth;
      const scrollLeft = container.scrollLeft;
      const currentTimelineWidth = timelineRef.current.offsetWidth;

      // Calculate actual duration for this calculation
      const currentActualDuration = localClipMode ? effectiveDuration : (
        videoFile?.duration 
          ? videoFile.duration * 1000
          : 60000
      );

      // Determine displayed timeline time base depending on current mode
      const displayedTime = localClipMode
        ? originalToEffectiveTime(currentTime) // currently in clips -> timeline uses effective time
        : currentTime; // in subtitles -> timeline uses original time

      const playheadPixelPosition = (displayedTime / currentActualDuration) * currentTimelineWidth;

      let viewportRatioLocal: number;
      if (currentTimelineWidth <= containerWidth) {
        viewportRatioLocal = playheadPixelPosition / containerWidth;
      } else {
        viewportRatioLocal = Math.max(0, Math.min(1, (playheadPixelPosition - scrollLeft) / containerWidth));
      }
      setPlayheadViewportRatio(viewportRatioLocal);
    }

    const newClipMode = !localClipMode;
    setLocalClipMode(newClipMode);
    onClipModeChange?.(newClipMode);
    
    if (newClipMode) {
      initializeClips();
    }
  }, [localClipMode, onClipModeChange, initializeClips, currentTime, originalToEffectiveTime, effectiveDuration, videoFile?.duration]);

  /**
   * Split clip at current playhead position
   */
  const handleSplitClip = useCallback(() => {
    if (!localClipMode || localClips.length === 0) return;

    const currentTimeMs = currentTime;
    const clipToSplit = localClips.find(clip => 
      currentTimeMs >= clip.startTime && currentTimeMs <= clip.endTime && !clip.isRemoved
    );

    if (!clipToSplit) return;

    const newClips: VideoClip[] = [];
    
    for (const clip of localClips) {
      if (clip.id === clipToSplit.id) {
        // Split this clip into two parts
        if (currentTimeMs > clip.startTime) {
          // First part
          newClips.push({
            ...clip,
            endTime: currentTimeMs
          });
        }
        
        if (currentTimeMs < clip.endTime) {
          // Second part
          newClips.push({
            ...clip,
            id: `clip-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            startTime: currentTimeMs
          });
        }
      } else {
        newClips.push(clip);
      }
    }

    setLocalClips(newClips);
    onClipsChange?.(newClips);
  }, [localClipMode, localClips, currentTime, onClipsChange]);

  /**
   * Delete clip at current playhead position
   */
  const handleDeleteClip = useCallback(() => {
    if (!localClipMode || localClips.length === 0) return;

    const currentTimeMs = currentTime;
    const clipToDelete = localClips.find(clip => 
      currentTimeMs >= clip.startTime && currentTimeMs <= clip.endTime && !clip.isRemoved
    );

    if (!clipToDelete) return;

    const newClips = localClips.map(clip => 
      clip.id === clipToDelete.id 
        ? { ...clip, isRemoved: true }
        : clip
    );

    setLocalClips(newClips);
    onClipsChange?.(newClips);

    // Find the previous non-removed clip in the original order
    const clipIndex = localClips.findIndex(clip => clip.id === clipToDelete.id);
    let previousClipEnd = 0;
    
    // Look backwards from the deleted clip to find the previous non-removed clip
    for (let i = clipIndex - 1; i >= 0; i--) {
      if (!localClips[i].isRemoved) {
        previousClipEnd = localClips[i].endTime;
        break;
      }
    }
    
    // Move playhead to the previous clip's end
    onTimeSeek?.(previousClipEnd);
  }, [localClipMode, localClips, currentTime, onClipsChange, onTimeSeek]);

  // Convert AI subtitle frames to virtual caption segments for timeline display
  type DisplaySegment = { id: string; startTime: number; endTime: number; text: string; style: SubtitleStyle };
  
  // Simple function to avoid temporal dead zone errors
  const getVirtualCaptionsFromAI = (): DisplaySegment[] => {
    // Type-safe early returns
    if (!aiSubtitleData?.frames || !Array.isArray(aiSubtitleData.frames)) {
      return [];
    }
    
    const virtualCaptions: DisplaySegment[] = [];
    
    // Helper function to check if a frame overlaps with deleted clips
    const isFrameInDeletedClip = (frameStartMs: number, frameEndMs: number): boolean => {
      if (!localClipMode || !localClips?.length) return false;
      
      const deletedClips = localClips.filter(clip => clip?.isRemoved);
      return deletedClips.some(clip => {
        if (!clip || typeof clip.startTime !== 'number' || typeof clip.endTime !== 'number') return false;
        return frameStartMs < clip.endTime && frameEndMs > clip.startTime;
      });
    };

    // Process each frame safely
    const frames = aiSubtitleData.frames;
    
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      if (!frame || typeof frame !== 'object' || !frame.id) continue;
      
      // Type-safe style creation
      const defaultStyle = {
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
        burnInSubtitles: true
      };
      
      // Merge with frame style if it exists and is valid
      const frameStyle = (frame.style && typeof frame.style === 'object') ? frame.style : {};
      const baseStyle = Object.assign({}, defaultStyle, frameStyle);

      // Type-safe word filtering
      const words = Array.isArray(frame.words) ? frame.words : [];
      const visibleWords = words.filter(word => 
        word && 
        typeof word === 'object' && 
        word.editState !== 'removedCaption' &&
        !word.isPause
      );

      if (visibleWords.length === 0) continue;

      // Type-safe time validation
      const frameStartTime = typeof frame.startTime === 'number' ? frame.startTime : 0;
      const frameEndTime = typeof frame.endTime === 'number' ? frame.endTime : 0;
      const frameStartMs = frameStartTime * 1000;
      const frameEndMs = frameEndTime * 1000;
      
      if (isFrameInDeletedClip(frameStartMs, frameEndMs)) {
        continue;
      }

      // Create display segment with type safety
      const text = visibleWords.map(w => (w && typeof w.word === 'string') ? w.word : '').join(' ');
      
      const virtualCaption: DisplaySegment = {
        id: frame.id,
        startTime: frameStartMs,
        endTime: frameEndMs,
        text: text,
        style: baseStyle as SubtitleStyle
      };

      virtualCaptions.push(virtualCaption);
    }

    return virtualCaptions.sort((a, b) => a.startTime - b.startTime);
  };

  const virtualCaptionsFromAI = getVirtualCaptionsFromAI();

  // Use AI-derived segments
  const effectiveCaptions = virtualCaptionsFromAI;
  const effectiveSelectedId = selectedFrameId || null;

  /**
   * Assign tracks to segments to avoid overlaps and utilize vertical space
   */
  const assignTracks = (segments: Array<{startTime: number, endTime: number, id: string}>): Array<{segment: any, track: number}> => {
    const tracks: Array<Array<{startTime: number, endTime: number}>> = [];
    const result: Array<{segment: any, track: number}> = [];

    // Sort segments by start time
    const sortedSegments = [...segments].sort((a, b) => a.startTime - b.startTime);

    sortedSegments.forEach(segment => {
      // Find the first track where this segment fits
      let assignedTrack = -1;

      for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
        const track = tracks[trackIndex];
        const lastSegmentInTrack = track[track.length - 1];

        // Check if this segment can fit in this track (no overlap)
        if (!lastSegmentInTrack || segment.startTime >= lastSegmentInTrack.endTime) {
          track.push(segment);
          assignedTrack = trackIndex;
          break;
        }
      }

      // If no existing track can accommodate this segment, create a new track
      if (assignedTrack === -1) {
        tracks.push([segment]);
        assignedTrack = tracks.length - 1;
      }

      result.push({ segment, track: assignedTrack });
    });

    return result;
  };

  // Timeline dimensions - dynamic based on content
  const CONTROL_HEIGHT = 40;
  const RULER_HEIGHT = 30;
  const CAPTION_TRACK_HEIGHT = 45; // Height per track/row
  const MIN_TIMELINE_HEIGHT = 200;
  const MAX_TIMELINE_HEIGHT = 600;
  
  // Calculate timeline height (moved to useMemo to ensure proper dependency tracking)
  const TIMELINE_HEIGHT = useMemo(() => {
    if (localClipMode) {
      // In clip mode, use simple layout for now
      return Math.min(Math.max(2 * CAPTION_TRACK_HEIGHT + 100, MIN_TIMELINE_HEIGHT), MAX_TIMELINE_HEIGHT);
    } else {
      // In subtitle mode, calculate based on actual track assignment
      const activeClips = localClips.filter(clip => !clip.isRemoved);
      const visibleSegments = effectiveCaptions.filter(segment => {
        if (activeClips.length === 0) return true;
        return activeClips.some(clip => 
          segment.startTime < clip.endTime && segment.endTime > clip.startTime
        );
      });
      
      if (visibleSegments.length === 0) {
        return MIN_TIMELINE_HEIGHT;
      }
      
      const segmentsWithTracks = assignTracks(visibleSegments);
      const maxTrack = Math.max(...segmentsWithTracks.map(s => s.track), 0);
      const tracksNeeded = maxTrack + 1;
      
      return Math.min(Math.max(tracksNeeded * (CAPTION_TRACK_HEIGHT + 5) + 50, MIN_TIMELINE_HEIGHT), MAX_TIMELINE_HEIGHT);
    }
  }, [localClipMode, localClips, effectiveCaptions]);
  
  const TIMELINE_CONTENT_HEIGHT = TIMELINE_HEIGHT - CONTROL_HEIGHT - RULER_HEIGHT;

  // Always use effective duration when clips exist, regardless of mode
  const actualDuration = localClips.length > 0 ? effectiveDuration : (
    videoFile?.duration 
      ? videoFile.duration * 1000 // Convert from seconds to milliseconds
      : effectiveCaptions.length > 0 
        ? Math.max(...effectiveCaptions.map(c => c.endTime))
        : 60000 // Default 1 minute
  );

  // Always use actualDuration (which includes effective duration when clips exist)
  const displayDuration = actualDuration;

  // Force re-render of time display when mode changes
  useEffect(() => {
    // This effect ensures the time display updates immediately when mode changes
  }, [localClipMode, currentTime, actualDuration]);

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

  // Use consistent zoom multiplier based on original video duration only
  // This ensures zoom behavior is the same regardless of clip mode
  const baselineDuration = videoFile?.duration ? videoFile.duration * 1000 : 60000;
  const zoomMultiplier = getZoomMultiplier(baselineDuration);

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
   * Format time for ruler display (simplified)
   */
  const formatRulerTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  };

  /**
   * Generate time markers for the ruler
   */
  const generateTimeMarkers = (): Array<{time: number, label: string, isMajor: boolean}> => {
    const markers: Array<{time: number, label: string, isMajor: boolean}> = [];
    const duration = displayDuration;
    
    // Determine marker interval based on zoom and duration
    let majorInterval: number; // in milliseconds
    let minorInterval: number;
    
    if (duration <= 30000) { // 30 seconds or less
      majorInterval = 5000; // 5 seconds
      minorInterval = 1000; // 1 second
    } else if (duration <= 300000) { // 5 minutes or less
      majorInterval = 30000; // 30 seconds
      minorInterval = 5000; // 5 seconds
    } else if (duration <= 1800000) { // 30 minutes or less
      majorInterval = 60000; // 1 minute
      minorInterval = 15000; // 15 seconds
    } else {
      majorInterval = 300000; // 5 minutes
      minorInterval = 60000; // 1 minute
    }

    // Generate markers
    for (let time = 0; time <= duration; time += minorInterval) {
      const isMajor = time % majorInterval === 0;
      markers.push({
        time,
        label: isMajor ? formatRulerTime(time) : '',
        isMajor
      });
    }

    return markers;
  };

  /**
   * Handle timeline click/drag for seeking
   */
  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    
    let seekTime: number;
    
    if (localClipMode && localClips.length > 0) {
      // In clip mode: convert effective timeline position to original video time
      const effectiveTime = percentage * actualDuration;
      seekTime = effectiveToOriginalTime(effectiveTime);
    } else {
      // In subtitle mode: direct conversion since timeline shows original time
      seekTime = percentage * actualDuration;
    }
    
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
    
    let seekTime: number;
    
    if (localClipMode && localClips.length > 0) {
      // In clip mode: convert effective timeline position to original video time
      const effectiveTime = percentage * actualDuration;
      seekTime = effectiveToOriginalTime(effectiveTime);
    } else {
      // In subtitle mode: direct conversion since timeline shows original time
      seekTime = percentage * actualDuration;
    }
    
    onTimeSeek(seekTime);
  }, [isDragging, actualDuration, onTimeSeek, localClipMode, localClips, effectiveToOriginalTime]);

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

      // Clip editing shortcuts - only active in clip mode
      if (localClipMode) {
        if ((e.metaKey || e.ctrlKey) && e.key === 's') {
          e.preventDefault();
          handleSplitClip();
        }

        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          handleDeleteClip();
        }
      }
    };

    const handleClick = (_e: MouseEvent) => {
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
  }, [onPlayPause, onUndo, onRedo, canUndo, canRedo, contextMenu, localClipMode, handleSplitClip, handleDeleteClip]);

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
        // Use appropriate time based on mode
        const timeForPosition = localClipMode && localClips.length > 0 
          ? originalToEffectiveTime(currentTime) 
          : currentTime;
        const playheadPosition = (timeForPosition / actualDuration) * timeline.offsetWidth;
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
  }, [currentTime, actualDuration, zoomLevel, playheadViewportRatio, localClipMode, originalToEffectiveTime]);

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
      // Use appropriate time based on mode
      const timeForPosition = localClipMode && localClips.length > 0 
        ? originalToEffectiveTime(currentTime) 
        : currentTime;
      const playheadPixelPosition = (timeForPosition / actualDuration) * currentTimelineWidth;
      
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
    
    // Always update zoom level immediately via prop callback
    onZoomChange?.(newZoomLevel);
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

  // Update selected frame when playhead enters a new segment (debounced to prevent race conditions)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (localClipMode) {
        // In clip mode, find the clip at current time
        if (!localClips.length || !onFrameSelect) return;
        const currentTimeMs = currentTime;
        const clipAtTime = localClips.find(clip => 
          currentTimeMs >= clip.startTime && currentTimeMs <= clip.endTime && !clip.isRemoved
        );
        if (clipAtTime && clipAtTime.id !== selectedFrameId) {
          onFrameSelect(clipAtTime.id);
        }
      } else {
        // In subtitle mode, find the subtitle frame at current time
        if (!aiSubtitleData?.frames?.length || !onFrameSelect) return;
        const ms = currentTime;
        const within = virtualCaptionsFromAI.find(seg => ms >= seg.startTime && ms <= seg.endTime);
        if (within && within.id !== selectedFrameId) {
          onFrameSelect(within.id);
        }
      }
    }, 100); // 100ms debounce to prevent rapid-fire selection changes

    return () => clearTimeout(timeoutId);
  }, [currentTime, aiSubtitleData?.frames, onFrameSelect, localClipMode, localClips, selectedFrameId, virtualCaptionsFromAI]);

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
        height: '40px',
        padding: '4px 8px',
        borderBottom: `1px solid ${theme.colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: theme.colors.surface
      }}>
        {/* Time Display */}
        <div 
          key={`time-display-${localClipMode}`}
          style={{ 
            fontSize: '11px', 
            color: theme.colors.textSecondary,
            fontWeight: '500'
          }}
        >
          {localClipMode && localClips.length > 0 
            ? `${formatTime(originalToEffectiveTime(currentTime))} / ${formatTime(displayDuration)}`
            : `${formatTime(currentTime)} / ${formatTime(displayDuration)}`
          }
        </div>

        {/* Mode Toggle: Subtitle | Clips */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '2px',
          background: theme.colors.surface,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: '4px',
          padding: '2px'
        }}>
          <button
            onClick={() => handleClipModeToggle()}
            style={{
              padding: '4px 8px',
              fontSize: '10px',
              fontWeight: '500',
              backgroundColor: !localClipMode ? theme.colors.primary : 'transparent',
              color: !localClipMode ? theme.colors.primaryForeground : theme.colors.textSecondary,
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minWidth: '60px'
            }}
            title="Subtitle Mode"
          >
            Subtitle
          </button>
          <button
            onClick={() => handleClipModeToggle()}
            style={{
              padding: '4px 8px',
              fontSize: '10px',
              fontWeight: '500',
              backgroundColor: localClipMode ? theme.colors.primary : 'transparent',
              color: localClipMode ? theme.colors.primaryForeground : theme.colors.textSecondary,
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minWidth: '60px'
            }}
            title="Clip Mode"
          >
            Clips
          </button>
        </div>

        {/* Clip Editing Controls - Only show in clip mode */}
        {localClipMode && (
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {/* Split Clip Button */}
            <button
              onClick={handleSplitClip}
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
              title="Split Clip at Playhead (Ctrl+S)"
            >
              <FiScissors size={14} />
            </button>

            {/* Delete Clip Button */}
            <button
              onClick={handleDeleteClip}
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
                e.currentTarget.style.color = theme.colors.error;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = theme.colors.textSecondary;
              }}
              title="Delete Clip at Playhead (Delete)"
            >
              <FiTrash2 size={14} />
            </button>
          </div>
        )}

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
              Replace Audio
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

      {/* Timeline Ruler */}
      <div style={{
        height: `${RULER_HEIGHT}px`,
        borderBottom: `1px solid ${theme.colors.border}`,
        background: theme.colors.surface,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${Math.max(100 * (zoomLevel * zoomMultiplier), 100)}%`,
          height: '100%',
          position: 'relative',
          marginLeft: '10px',
        }}>
          {generateTimeMarkers().map((marker, index) => (
            <div
              key={index}
              style={{
                position: 'absolute',
                left: `${(marker.time / displayDuration) * 100}%`,
                top: 0,
                height: '100%',
                borderLeft: `1px solid ${marker.isMajor ? theme.colors.border : theme.colors.surfaceHover}`,
                fontSize: '10px',
                color: theme.colors.textSecondary,
                paddingLeft: '2px',
                paddingTop: '2px',
                pointerEvents: 'none',
                zIndex: 1
              }}
            >
              {marker.label}
            </div>
          ))}
        </div>
      </div>

      {/* Main Timeline Area */}
      <div 
        ref={timelineContainerRef}
        style={{
          height: `${TIMELINE_CONTENT_HEIGHT}px`,
          position: 'relative',
          background: theme.colors.background,
          overflowX: 'auto',
          overflowY: 'auto', // Enable Y-scrolling
        }}
      >
        <div 
          ref={timelineRef}
          style={{
            minHeight: `${TIMELINE_CONTENT_HEIGHT - 20}px`,
            height: localClipMode ? 'auto' : `${Math.max(effectiveCaptions.length * 15 + 100, TIMELINE_CONTENT_HEIGHT - 20)}px`, // Dynamic height for many segments
            position: 'relative',
            cursor: isDragging ? 'grabbing' : 'pointer',
            background: theme.colors.background,
            width: `${Math.max(100 * (zoomLevel * zoomMultiplier), 100)}%`, // Consistent zoom scaling based on original duration
            minWidth: '100%',
            marginLeft: '10px',
          }}
          onMouseDown={handleTimelineMouseDown}
        >
          
          {/* Current Time Indicator */}
          <div
            style={{
              position: 'absolute',
              left: `${(localClipMode && localClips.length > 0 ? (originalToEffectiveTime(currentTime) / actualDuration) : (currentTime / actualDuration)) * 100}%`,
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
              bottom: '8px', // Use full height instead of fixed height
              zIndex: 10
            }}
          >
            {localClipMode ? (
              localClips.map((clip, index) => {
                // Calculate effective position for clips
                const effectiveStartTime = originalToEffectiveTime(clip.startTime);
                const effectiveEndTime = originalToEffectiveTime(clip.endTime);
                const left = (effectiveStartTime / actualDuration) * 100;
                const width = ((effectiveEndTime - effectiveStartTime) / actualDuration) * 100;
                const isSelected = clip.id === selectedFrameId;
                
                // Use consistent blue border color for all segments
                const segmentBorderColor = isSelected 
                  ? theme.colors.primary 
                  : clip.isRemoved 
                    ? theme.colors.error 
                    : theme.colors.secondary;
                
                const segmentBackgroundColor = isSelected 
                  ? theme.colors.secondary 
                  : clip.isRemoved 
                    ? theme.colors.error + '20' // Semi-transparent error color
                    : theme.colors.surface;
                
                return (
                  <div
                    key={clip.id}
                    data-segment-id={clip.id}
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
                      minWidth: '2px',
                      opacity: clip.isRemoved ? 0.6 : 1,
                      textDecoration: clip.isRemoved ? 'line-through' : 'none'
                    }}
                    onClick={() => handleSegmentClick(clip)}
                    onDoubleClick={() => handleSegmentDoubleClick(clip)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        segmentId: clip.id
                      });
                    }}
                    title={`Clip ${index + 1}: ${formatTime(clip.startTime)} - ${formatTime(clip.endTime)}${clip.isRemoved ? ' (Removed)' : ''}`}
                  >
                    <div style={{
                      width: '100%',
                      height: '100%',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '10px',
                      lineHeight: '1.2',
                      justifyContent: 'center'
                    }}>
                      <div style={{
                        textAlign: 'center',
                        width: '100%'
                      }}>
                        Clip {index + 1}
                        {clip.isRemoved && <span style={{ color: theme.colors.error }}> (×)</span>}
                      </div>
                    </div>
                  </div>
                );
              }).filter(Boolean)
            ) : (
              (() => {
                // In subtitle mode with clips, filter segments that are within active clips
                const activeClips = localClips.filter(clip => !clip.isRemoved);
                
                const visibleSegments = effectiveCaptions.filter(segment => {
                  // Check if segment overlaps with any active clip
                  const segmentOverlapsActiveClip = activeClips.some(clip => 
                    segment.startTime < clip.endTime && segment.endTime > clip.startTime
                  );
                  
                  // Skip segments that don't overlap with any active clips when clips exist
                  return activeClips.length === 0 || segmentOverlapsActiveClip;
                });

                // Assign tracks to avoid overlaps
                const segmentsWithTracks = assignTracks(visibleSegments);

                return segmentsWithTracks.map(({ segment, track }) => {
                  // Calculate position based on compressed timeline when clips exist
                  let left: number, width: number;
                  
                  if (activeClips.length > 0) {
                    // Use compressed timeline - convert original times to effective times
                    const effectiveStartTime = originalToEffectiveTime(segment.startTime);
                    const effectiveEndTime = originalToEffectiveTime(segment.endTime);
                    left = (effectiveStartTime / actualDuration) * 100;
                    width = ((effectiveEndTime - effectiveStartTime) / actualDuration) * 100;
                  } else {
                    // No clips - use original timeline
                    left = (segment.startTime / actualDuration) * 100;
                    width = ((segment.endTime - segment.startTime) / actualDuration) * 100;
                  }
                  
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
                      top: `${track * (CAPTION_TRACK_HEIGHT + 5)}px`, // Use track for Y positioning
                      height: `${CAPTION_TRACK_HEIGHT}px`, // Fixed track height
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
                      width: '100%',
                      height: '100%',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '10px',
                      lineHeight: '1.2',
                      textDecoration: segment.style?.burnInSubtitles === false ? 'line-through' : 'none',
                      opacity: segment.style?.burnInSubtitles === false ? 0.6 : 1
                    }}>
                      <div style={{
                        wordBreak: 'break-word',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        width: '100%'
                      }}>
                        {segment.text}
                      </div>
                    </div>
                  </div>
                );
              });
              })()
            )}
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