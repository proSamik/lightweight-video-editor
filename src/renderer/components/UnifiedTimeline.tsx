import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { AISubtitleData, SubtitleStyle, VideoClip } from '../../types';
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
  FiScissors,
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
  onAISubtitleUpdate?: (data: AISubtitleData) => void;
  selectedFrameId?: string | null;
  onFrameSelect?: (frameId: string) => void;
  // New: Clip editing support
  clips?: VideoClip[];
  onClipsChange?: (clips: VideoClip[]) => void;
  // Shared zoom state
  zoomLevel?: number;
  onZoomChange?: (level: number) => void;
  // Transcription status
  transcriptionStatus?: {
    isTranscribing: boolean;
    progress: number;
    message: string;
    speed?: string;
    eta?: string;
  };
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
  onAISubtitleUpdate,
  selectedFrameId,
  onFrameSelect,
  clips = [],
  onClipsChange,
  zoomLevel = 0,
  onZoomChange,
  transcriptionStatus,
}) => {
  // Show timeline if we have a video, even during transcription
  if (!videoFile) {
    return null;
  }

  const { theme } = useTheme();
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAudioPreviewEnabled, setIsAudioPreviewEnabled] = useState(true); // Default to enabled when replacement audio is loaded

  const [contextMenu, setContextMenu] = useState<{x: number, y: number, segmentId: string} | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{segmentId: string, text: string} | null>(null);

  // Clip editing state
  const [localClips, setLocalClips] = useState<VideoClip[]>(clips);

  // Update local state when props change
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

  // Always initialize clips if none exist - ensure we always show unified timeline
  useEffect(() => {
    if (localClips.length === 0 && videoFile?.duration) {
      initializeClips();
    }
  }, [localClips.length, videoFile?.duration, initializeClips]);

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

    // Clamp effective time to valid range to prevent seeking beyond clips
    const maxEffectiveTime = activeClips.reduce((total, clip) => total + (clip.endTime - clip.startTime), 0);
    const clampedEffectiveTime = Math.max(0, Math.min(effectiveTime, maxEffectiveTime));

    let accumulatedTime = 0;
    for (const clip of activeClips) {
      const clipDuration = clip.endTime - clip.startTime;
      if (clampedEffectiveTime <= accumulatedTime + clipDuration) {
        // Time falls within this clip
        const timeWithinClip = clampedEffectiveTime - accumulatedTime;
        return clip.startTime + timeWithinClip;
      }
      accumulatedTime += clipDuration;
    }

    // If we reach here, return the start of the last clip (safer than end)
    return activeClips[activeClips.length - 1]?.startTime || 0;
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
   * Handle subtitle frame splitting when clips are split
   * Similar to AI Subtitle Editor's handleFrameSplit but triggered by clip splitting
   */
  const handleSubtitleFrameSplitting = useCallback((splitTimeMs: number) => {
    if (!aiSubtitleData || !onAISubtitleUpdate) return;
    
    const splitTimeSeconds = splitTimeMs / 1000;
    
    // Find frames that span the split point
    const framesToSplit = aiSubtitleData.frames.filter(frame => {
      return frame.startTime < splitTimeSeconds && frame.endTime > splitTimeSeconds;
    });
    
    if (framesToSplit.length === 0) return;
    
    const updatedFrames = [...aiSubtitleData.frames];
    
    for (const frameToSplit of framesToSplit) {
      const frameIndex = updatedFrames.findIndex(f => f.id === frameToSplit.id);
      if (frameIndex === -1) continue;
      
      // Find the word that corresponds to the split time
      const wordsBeforeSplit = frameToSplit.words.filter(word => word.end <= splitTimeSeconds);
      const wordsAfterSplit = frameToSplit.words.filter(word => word.start >= splitTimeSeconds);
      
      // Handle overlap: if no words clearly fall after split, find the word that spans the split
      let wordsAfterSplitAdjusted = wordsAfterSplit;
      if (wordsAfterSplit.length === 0) {
        // Find the word that spans the split point
        const spanningWord = frameToSplit.words.find(word => 
          word.start < splitTimeSeconds && word.end > splitTimeSeconds
        );
        if (spanningWord) {
          // Include the spanning word in both halves (overlap behavior)
          wordsBeforeSplit.push(spanningWord);
          wordsAfterSplitAdjusted = [spanningWord, ...frameToSplit.words.filter(word => word.start > splitTimeSeconds)];
        }
      } else {
        // Check if there's a word that should be duplicated for natural flow
        const lastWordBefore = wordsBeforeSplit[wordsBeforeSplit.length - 1];
        const firstWordAfter = wordsAfterSplit[0];
        
        // If there's a gap, find a word to bridge it (like "not" in "application and not only")
        const bridgeWord = frameToSplit.words.find(word =>
          word.start >= (lastWordBefore?.end || 0) && word.end <= (firstWordAfter?.start || Infinity)
        );
        
        if (bridgeWord && !wordsAfterSplit.includes(bridgeWord)) {
          wordsAfterSplitAdjusted = [bridgeWord, ...wordsAfterSplit];
        }
      }
      
      if (wordsBeforeSplit.length === 0 || wordsAfterSplitAdjusted.length === 0) continue;
      
      // Create updated first frame
      const updatedFirstFrame = {
        ...frameToSplit,
        endTime: wordsBeforeSplit[wordsBeforeSplit.length - 1].end,
        words: wordsBeforeSplit,
        isCustomBreak: true
      };
      
      // Create new second frame
      const generateUniqueId = (baseId: string): string => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `${baseId}-split-${timestamp}-${random}`;
      };
      
      const newSecondFrame = {
        ...frameToSplit,
        id: generateUniqueId(frameToSplit.id),
        startTime: wordsAfterSplitAdjusted[0].start,
        endTime: wordsAfterSplitAdjusted[wordsAfterSplitAdjusted.length - 1].end,
        words: wordsAfterSplitAdjusted,
        isCustomBreak: true
      };
      
      // Replace the original frame with the two new frames
      updatedFrames.splice(frameIndex, 1, updatedFirstFrame, newSecondFrame);
    }
    
    // Update the AI subtitle data
    const newAIData = {
      ...aiSubtitleData,
      frames: updatedFrames.sort((a, b) => a.startTime - b.startTime),
      lastModified: Date.now()
    };
    
    onAISubtitleUpdate(newAIData);
  }, [aiSubtitleData, onAISubtitleUpdate]);

  /**
   * Split clip at current playhead position
   */
  const handleSplitClip = useCallback(() => {
    if (localClips.length === 0) return;

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
    
    // Also split any subtitle frames that span the clip split point
    handleSubtitleFrameSplitting(currentTimeMs);
  }, [localClips, currentTime, onClipsChange, handleSubtitleFrameSplitting]);

  /**
   * Delete clip at current playhead position
   */
  const handleDeleteClip = useCallback(() => {
    if (localClips.length === 0) return;

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
  }, [localClips, currentTime, onClipsChange, onTimeSeek]);

  // Convert AI subtitle frames to virtual caption segments for timeline display
  type DisplaySegment = { id: string; startTime: number; endTime: number; text: string; style: SubtitleStyle };
  
  // Memoized function to convert AI subtitle frames to virtual caption segments
  const virtualCaptionsFromAI = useMemo((): DisplaySegment[] => {
    // Type-safe early returns
    if (!aiSubtitleData?.frames || !Array.isArray(aiSubtitleData.frames)) {
      return [];
    }
    
    const virtualCaptions: DisplaySegment[] = [];
    
    // Helper function to check if a frame is ENTIRELY within deleted clips
    const isFrameEntirelyInDeletedClip = (frameStartMs: number, frameEndMs: number): boolean => {
      if (!localClips?.length) return false;
      
      // Check if there are any active clips
      const activeClips = localClips.filter(clip => !clip?.isRemoved);
      if (activeClips.length === 0) return true; // All clips removed
      
      // Check if the frame has ANY overlap with active clips
      const hasOverlapWithActiveClip = activeClips.some(clip => {
        if (!clip || typeof clip.startTime !== 'number' || typeof clip.endTime !== 'number') return false;
        return frameStartMs < clip.endTime && frameEndMs > clip.startTime;
      });
      
      // If frame has no overlap with any active clip, it's entirely in deleted area
      return !hasOverlapWithActiveClip;
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
      
      if (isFrameEntirelyInDeletedClip(frameStartMs, frameEndMs)) {
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
  }, [aiSubtitleData?.frames, localClips]);

  // Use AI-derived segments
  const effectiveCaptions = virtualCaptionsFromAI;
  const effectiveSelectedId = selectedFrameId || null;

  /**
   * Process subtitles to handle clipping: show subtitles that overlap with active clips
   */
  const processSubtitlesForClips = useCallback((subtitles: DisplaySegment[], clips: VideoClip[]): DisplaySegment[] => {
    const activeClips = clips.filter(clip => !clip.isRemoved);
    
    if (subtitles.length === 0) {
      return [];
    }
    
    if (activeClips.length === 0) {
      // No active clips - show all subtitles
      return subtitles;
    }
    
    // Simply show subtitles that overlap with active clips
    // The AI Subtitle Editor handles the actual frame splitting via custom breaks
    return subtitles.filter(segment => {
      return activeClips.some(clip => 
        segment.startTime < clip.endTime && segment.endTime > clip.startTime
      );
    });
  }, []);

  /**
   * Assign tracks to segments to avoid overlaps and utilize vertical space
   */
  const assignTracks = useCallback((segments: Array<{startTime: number, endTime: number, id: string}>): Array<{segment: any, track: number}> => {
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
  }, []);

  // Timeline dimensions - dynamic based on content
  const CONTROL_HEIGHT = 40; // Increased to accommodate controls properly
  const RULER_HEIGHT = 25; // Reduced to minimize whitespace
  const CAPTION_TRACK_HEIGHT = 25; // Reduced height per track/row for better compactness
  const MIN_TIMELINE_HEIGHT = 150; // Reduced minimum height
  const MAX_TIMELINE_HEIGHT = 300; // Reduced maximum height
  
  // Calculate timeline height for unified layout
  const TIMELINE_HEIGHT = useMemo(() => {
    // Process subtitles using the helper function
    const processedSubtitles = processSubtitlesForClips(effectiveCaptions, localClips);
    
    const segmentsWithTracks = assignTracks(processedSubtitles);
    const subtitleTracks = Math.max(...segmentsWithTracks.map(s => s.track), 0) + 1;
    
    // Clips always use 1 track, subtitles use their calculated tracks
    const totalTracks = subtitleTracks + 1; // Always reserve space for clips
    const totalHeight = totalTracks * (CAPTION_TRACK_HEIGHT + 1); // Minimal spacing
    
    return Math.min(Math.max(totalHeight, MIN_TIMELINE_HEIGHT), MAX_TIMELINE_HEIGHT);
  }, [localClips, effectiveCaptions, processSubtitlesForClips, assignTracks]);
  
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
  }, [localClips, currentTime, actualDuration]);

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

  // Use zoom multiplier based on actual timeline duration (clips or original video)
  // This ensures zoom behavior adapts to the actual content being displayed
  const timelineDuration = localClips.length > 0 ? effectiveDuration : (videoFile?.duration ? videoFile.duration * 1000 : 60000);
  const zoomMultiplier = getZoomMultiplier(timelineDuration);

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
    
    let seekTime: number;
    
    if (localClips.length > 0) {
      // In clip mode: convert effective timeline position to original video time
      const effectiveTime = percentage * actualDuration;
      seekTime = effectiveToOriginalTime(effectiveTime);
      
      // Additional safety: ensure seekTime is within an active clip
      const activeClips = localClips.filter(clip => !clip.isRemoved);
      const isInActiveClip = activeClips.some(clip => 
        seekTime >= clip.startTime && seekTime <= clip.endTime
      );
      
      if (!isInActiveClip && activeClips.length > 0) {
        // Find the closest active clip
        const closestClip = activeClips.reduce((closest, clip) => {
          const currentDistance = Math.min(
            Math.abs(seekTime - clip.startTime),
            Math.abs(seekTime - clip.endTime)
          );
          const closestDistance = Math.min(
            Math.abs(seekTime - closest.startTime),
            Math.abs(seekTime - closest.endTime)
          );
          return currentDistance < closestDistance ? clip : closest;
        });
        
        // Seek to the closest point within the closest clip
        if (seekTime < closestClip.startTime) {
          seekTime = closestClip.startTime;
        } else if (seekTime > closestClip.endTime) {
          seekTime = closestClip.endTime;
        }
      }
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
    
    if (localClips.length > 0) {
      // In clip mode: convert effective timeline position to original video time
      const effectiveTime = percentage * actualDuration;
      seekTime = effectiveToOriginalTime(effectiveTime);
      
      // Additional safety: ensure seekTime is within an active clip
      const activeClips = localClips.filter(clip => !clip.isRemoved);
      const isInActiveClip = activeClips.some(clip => 
        seekTime >= clip.startTime && seekTime <= clip.endTime
      );
      
      if (!isInActiveClip && activeClips.length > 0) {
        // Find the closest active clip
        const closestClip = activeClips.reduce((closest, clip) => {
          const currentDistance = Math.min(
            Math.abs(seekTime - clip.startTime),
            Math.abs(seekTime - clip.endTime)
          );
          const closestDistance = Math.min(
            Math.abs(seekTime - closest.startTime),
            Math.abs(seekTime - closest.endTime)
          );
          return currentDistance < closestDistance ? clip : closest;
        });
        
        // Seek to the closest point within the closest clip
        if (seekTime < closestClip.startTime) {
          seekTime = closestClip.startTime;
        } else if (seekTime > closestClip.endTime) {
          seekTime = closestClip.endTime;
        }
      }
    } else {
      // In subtitle mode: direct conversion since timeline shows original time
      seekTime = percentage * actualDuration;
    }
    
    onTimeSeek(seekTime);
  }, [isDragging, actualDuration, onTimeSeek, localClips, effectiveToOriginalTime]);

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
      if (localClips.length > 0) {
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
  }, [onPlayPause, onUndo, onRedo, canUndo, canRedo, contextMenu, localClips, handleSplitClip, handleDeleteClip]);

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
  const [preventAutoScroll, setPreventAutoScroll] = React.useState(false);
  
  // Prevent auto-scroll temporarily when clips change
  useEffect(() => {
    setPreventAutoScroll(true);
    const timer = setTimeout(() => setPreventAutoScroll(false), 100);
    return () => clearTimeout(timer);
  }, [localClips]);
  
  /**
   * Auto-scroll timeline to maintain playhead position during zoom
   */
  useEffect(() => {
    if (timelineContainerRef.current && timelineRef.current && zoomLevel > 0.1 && !preventAutoScroll) {
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
        // Use appropriate time based on clips
        const timeForPosition = localClips.length > 0 
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
  }, [currentTime, actualDuration, zoomLevel, playheadViewportRatio, localClips, preventAutoScroll]);

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
      // Use appropriate time based on clips
      const timeForPosition = localClips.length > 0 
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
    const now = Date.now();
    setIsManualSelection(true); // Mark as manual selection
    setManualSelectionTime(now); // Track when manual selection occurred
    onFrameSelect?.(segment.id);
    const middleTime = segment.startTime + ((segment.endTime - segment.startTime) / 2);
    onTimeSeek(middleTime);
  };

  /**
   * Handle segment click to select
   */
  const handleSegmentClick = (segment: { id: string }) => {
    const now = Date.now();
    setIsManualSelection(true); // Mark as manual selection
    setManualSelectionTime(now); // Track when manual selection occurred
    onFrameSelect?.(segment.id);
  };

  // Track manual selection vs automatic selection from playhead movement
  const [isManualSelection, setIsManualSelection] = React.useState(false);
  const [manualSelectionTime, setManualSelectionTime] = React.useState(0);
  
  // Keep selected frame in view (only for manual selections)
  useEffect(() => {
    // DISABLED: Don't auto-scroll on manual selections to prevent UI jumping
    // The user can see what they clicked on without the timeline moving
    // This prevents the jarring experience of timeline jumping to clip start
    
    // Reset manual selection flag
    if (isManualSelection) {
      setIsManualSelection(false);
    }
  }, [selectedFrameId, isManualSelection]);

  // Update selected frame when playhead enters a new segment (debounced to prevent race conditions)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!onFrameSelect) return;
      
      // Don't auto-select if there was a recent manual selection (within 500ms)
      const timeSinceManualSelection = Date.now() - manualSelectionTime;
      if (timeSinceManualSelection < 500) {
        return; // Skip automatic selection to preserve manual selection
      }
      
      const currentTimeMs = currentTime;
      let targetSelection: string | null = null;
      
      // Priority 1: Always try to find subtitle segment first (for styling control)
      if (aiSubtitleData?.frames?.length) {
        const subtitleAtTime = virtualCaptionsFromAI.find(seg => {
          // Check if subtitle is at current time
          if (currentTimeMs < seg.startTime || currentTimeMs > seg.endTime) return false;
          
          // If clips exist, ensure subtitle is fully within an active clip
          if (localClips.length > 0) {
            const activeClips = localClips.filter(clip => !clip.isRemoved);
            return activeClips.some(clip => 
              seg.startTime >= clip.startTime && seg.endTime <= clip.endTime
            );
          }
          
          return true; // No clips - any subtitle is valid
        });
        
        if (subtitleAtTime) {
          targetSelection = subtitleAtTime.id;
        }
      }
      
      // Priority 2: If no subtitle found, fall back to clip selection
      if (!targetSelection && localClips.length > 0) {
        const clipAtTime = localClips.find(clip => 
          currentTimeMs >= clip.startTime && currentTimeMs <= clip.endTime && !clip.isRemoved
        );
        if (clipAtTime) {
          targetSelection = clipAtTime.id;
        }
      }
      
      // Update selection if it changed
      if (targetSelection && targetSelection !== selectedFrameId) {
        onFrameSelect(targetSelection);
      }
    }, 100); // 100ms debounce to prevent rapid-fire selection changes

    return () => clearTimeout(timeoutId);
  }, [currentTime, aiSubtitleData?.frames, onFrameSelect, localClips, selectedFrameId, virtualCaptionsFromAI, manualSelectionTime]);

  return (
    <div style={{ 
      width: '100%', 
      height: `${TIMELINE_HEIGHT}px`,
      background: theme.colors.background,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: '4px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* CSS-in-JS Animation for Spinner */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      {/* Timeline Controls */}
      <div style={{ 
        height: `${CONTROL_HEIGHT}px`,
        padding: '6px 8px',
        borderBottom: `1px solid ${theme.colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: theme.colors.surface
      }}>
        {/* Time Display */}
        <div 
          key={`time-display-${localClips.length > 0}`}
          style={{ 
            fontSize: '11px', 
            color: theme.colors.textSecondary,
            fontWeight: '500'
          }}
        >
          {localClips.length > 0 
            ? `${formatTime(originalToEffectiveTime(currentTime))} / ${formatTime(displayDuration)}`
            : `${formatTime(currentTime)} / ${formatTime(displayDuration)}`
          }
        </div>

        {/* Unified Timeline Controls */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '4px',
          background: theme.colors.surface,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: '4px',
          padding: '4px 8px',
          fontSize: '10px',
          color: theme.colors.textSecondary
        }}>
          <span>Unified Timeline</span>
          {localClips.length > 0 && (
            <span style={{ color: theme.colors.primary }}>
              • {localClips.filter(c => !c.isRemoved).length} Active Clips
            </span>
          )}
        </div>

        {/* Clip Editing Controls - Only show when clips exist */}
        {localClips.length > 0 && (
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

      {/* Time Ruler */}
      <div 
        ref={rulerRef}
        style={{
          height: `${RULER_HEIGHT}px`,
          position: 'relative',
          background: `linear-gradient(180deg, ${theme.colors.surface} 0%, ${theme.colors.background} 100%)`,
          borderBottom: `1px solid ${theme.colors.border}`,
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE/Edge
        }}
        onScroll={(e) => {
          // Sync scroll with main timeline
          if (timelineContainerRef.current && timelineContainerRef.current.scrollLeft !== e.currentTarget.scrollLeft) {
            timelineContainerRef.current.scrollLeft = e.currentTarget.scrollLeft;
          }
        }}
      >
        <div
          style={{
            width: `${Math.max(100 * (zoomLevel * zoomMultiplier), 100)}%`,
            minWidth: '100%',
            height: '100%',
            position: 'relative',
            marginLeft: '10px',
          }}
        >
          {(() => {
            // Calculate time intervals based on zoom level and prevent overlapping
            const getTimeInterval = (containerWidth: number, timelineWidth: number): number => {
              // Adjust minimum width based on duration format
              const minLabelWidth = actualDuration < 60000 ? 40 : // "30s" format
                                   actualDuration < 3600000 ? 60 : // "5:30" format  
                                   80; // "1:23:45" format
              
              // Calculate the actual timeline width considering zoom
              const effectiveTimelineWidth = timelineWidth || containerWidth;
              
              // Calculate how much space we have per millisecond of duration
              const pixelsPerMs = effectiveTimelineWidth / duration;
              
              // Calculate minimum interval needed to prevent overlapping
              const minIntervalMs = minLabelWidth / pixelsPerMs;
              
              // Define nice intervals in milliseconds
              const niceIntervals = [250, 500, 1000, 2000, 5000, 10000, 15000, 30000, 60000, 120000, 300000, 600000];
              
              // For very short durations, use fixed intervals to prevent repetition
              if (duration < 10000) {
                // For videos under 10 seconds, use fixed intervals based on duration
                if (duration <= 5000) {
                  return 1000; // 1 second intervals for videos under 5 seconds
                } else if (duration <= 10000) {
                  return 2000; // 2 second intervals for videos 5-10 seconds
                }
              }
              
              // Find the smallest nice interval that's larger than our minimum
              let selectedInterval = niceIntervals.find(interval => interval >= minIntervalMs);
              
              // If no interval works, use the largest one
              if (!selectedInterval) {
                selectedInterval = niceIntervals[niceIntervals.length - 1];
              }
              
              return selectedInterval;
            };

            const containerWidth = timelineContainerRef.current?.offsetWidth || 1000;
            const timelineWidth = timelineRef.current?.offsetWidth || containerWidth;
            const duration = localClips.length > 0 
              ? localClips.filter(clip => !clip.isRemoved).reduce((total, clip) => total + (clip.endTime - clip.startTime), 0)
              : actualDuration;
              
            const interval = getTimeInterval(containerWidth, timelineWidth);
            
            // Use the calculated interval directly - no artificial limits
            const effectiveInterval = interval;
            const ticks = [];

            // Generate time ticks for the entire duration - no artificial limits
            const maxTicks = Math.floor(duration / effectiveInterval) + 1;
            
            for (let i = 0; i < maxTicks; i++) {
              const time = i * effectiveInterval;
              if (time > duration) break;
              
              const percentage = (time / duration) * 100;
              
              // Always include the final tick at the end of the video
              if (i === maxTicks - 1 && time < duration) {
                const finalTime = duration;
                const finalPercentage = (finalTime / duration) * 100;
                
                ticks.push(
                  <div key={`final-${finalTime}`} style={{ position: 'absolute', left: `${finalPercentage}%`, bottom: 0, height: '100%' }}>
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        width: '1px',
                        height: '50%',
                        backgroundColor: theme.colors.textSecondary,
                        opacity: 0.7,
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: actualDuration < 60000 ? '-15px' : // "30s" format
                              actualDuration < 3600000 ? '-25px' : // "5:30" format
                              '-35px', // "1:23:45" format
                        width: actualDuration < 60000 ? '30px' : // "30s" format
                               actualDuration < 3600000 ? '50px' : // "5:30" format  
                               '70px', // "1:23:45" format
                        fontSize: '10px',
                        color: theme.colors.textSecondary,
                        textAlign: 'center',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        fontWeight: '400',
                        whiteSpace: 'nowrap',
                        userSelect: 'none',
                      }}
                    >
                      {(() => {
                        if (actualDuration < 60000) {
                          return `${Math.floor(finalTime / 1000)}s`;
                        } else if (actualDuration < 3600000) {
                          const minutes = Math.floor(finalTime / 60000);
                          const seconds = Math.floor((finalTime % 60000) / 1000);
                          return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                        } else {
                          return formatTime(finalTime);
                        }
                      })()}
                    </div>
                  </div>
                );
              }
              
              ticks.push(
                <div key={time} style={{ position: 'absolute', left: `${percentage}%`, bottom: 0, height: '100%' }}>
                  {/* Tick mark - aligned to bottom like reference */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      width: '1px',
                      height: '50%',
                      backgroundColor: theme.colors.textSecondary,
                      opacity: 0.7,
                    }}
                  />
                  {/* Time label for all ticks */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      left: actualDuration < 60000 ? '-15px' : // "30s" format
                            actualDuration < 3600000 ? '-25px' : // "5:30" format
                            '-35px', // "1:23:45" format
                      width: actualDuration < 60000 ? '30px' : // "30s" format
                             actualDuration < 3600000 ? '50px' : // "5:30" format  
                             '70px', // "1:23:45" format
                      fontSize: '10px',
                      color: theme.colors.textSecondary,
                      textAlign: 'center',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      fontWeight: '400',
                      whiteSpace: 'nowrap',
                      userSelect: 'none', // Prevent text selection during dragging
                    }}
                  >
                        {(() => {
                          // Use shorter format for smaller durations to save space
                          if (actualDuration < 60000) {
                            // Under 1 minute: show "0s", "5s", "10s"
                            return `${Math.floor(time / 1000)}s`;
                          } else if (actualDuration < 3600000) {
                            // Under 1 hour: show "0:05", "0:10", "1:30"
                            const minutes = Math.floor(time / 60000);
                            const seconds = Math.floor((time % 60000) / 1000);
                            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                          } else {
                            // Full format: "0:05:30", "1:23:45"
                            return formatTime(time);
                          }
                        })()}
                  </div>
                </div>
              );
            }

            return ticks;
          })()}
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
          overflowY: 'hidden', // Disable Y-scrolling to fit content
        }}
        onScroll={(e) => {
          // Sync scroll with ruler
          if (rulerRef.current && rulerRef.current.scrollLeft !== e.currentTarget.scrollLeft) {
            rulerRef.current.scrollLeft = e.currentTarget.scrollLeft;
          }
        }}
      >
        <div 
          ref={timelineRef}
          style={{
            height: `${TIMELINE_CONTENT_HEIGHT}px`, // Use calculated timeline height
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
              left: localClips.length > 0 
                ? `${(originalToEffectiveTime(currentTime) / actualDuration) * 100}%`
                : `${(currentTime / actualDuration) * 100}%`,
              top: '2px',
              bottom: '2px',
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
              top: '0px', // Minimal top margin
              left: 0,
              right: 0,
              bottom: '0px', // Minimal bottom margin
              zIndex: 10
            }}
          >
            {/* Unified Timeline: Clips and Subtitles together */}
            {(() => {
              const allSegments: Array<{type: 'clip', data: VideoClip, index: number} | {type: 'subtitle', data: any, track: number}> = [];
              
              // Add only active clips as segments (always on track 0)
              const activeClipsForDisplay = localClips.filter(clip => !clip.isRemoved);
              activeClipsForDisplay.forEach((clip) => {
                // Find original index in full clips array for display purposes
                const originalIndex = localClips.findIndex(c => c.id === clip.id);
                allSegments.push({ type: 'clip', data: clip, index: originalIndex });
              });
              
                             // Add subtitle segments with proper track assignment
              // Process subtitles to handle clipping using the helper function
              const processedSubtitles = processSubtitlesForClips(effectiveCaptions, localClips);
              
              const segmentsWithTracks = assignTracks(processedSubtitles);
              segmentsWithTracks.forEach(({ segment, track }) => {
                allSegments.push({ type: 'subtitle', data: segment, track: track + 1 }); // Offset by 1 to leave space for clips
              });
              
              return allSegments.map((segment) => {
                if (segment.type === 'clip') {
                  const clip = segment.data;
                  const index = segment.index;
                  
                  // Calculate effective position for clips
                  const effectiveStartTime = originalToEffectiveTime(clip.startTime);
                  const effectiveEndTime = originalToEffectiveTime(clip.endTime);
                  const left = (effectiveStartTime / actualDuration) * 100;
                  const width = ((effectiveEndTime - effectiveStartTime) / actualDuration) * 100;
                  // Clip is selected if:
                  // 1. Its own ID is selected, OR  
                  // 2. A subtitle segment within this clip is selected
                  let isSelected = clip.id === selectedFrameId;
                  
                  // Check if selected item is a subtitle within this clip
                  if (!isSelected && selectedFrameId && effectiveCaptions.length > 0) {
                    const selectedSubtitle = effectiveCaptions.find(seg => seg.id === selectedFrameId);
                    if (selectedSubtitle) {
                      // Check if this subtitle is fully within this clip
                      isSelected = selectedSubtitle.startTime >= clip.startTime && 
                                  selectedSubtitle.endTime <= clip.endTime;
                    }
                  }
                  
                  // Use consistent blue border color for all segments (removed clips not shown)
                  const segmentBorderColor = isSelected 
                    ? theme.colors.primary 
                    : theme.colors.secondary;
                  
                  const segmentBackgroundColor = isSelected 
                    ? theme.colors.secondary 
                    : theme.colors.surface;
                  
                  return (
                    <div
                      key={`clip-${clip.id}`}
                      data-segment-id={clip.id}
                      style={{
                        position: 'absolute',
                        left: `${left}%`,
                        width: `${width}%`,
                        top: '0px', // Align clips to the top of the segment area
                        height: `${CAPTION_TRACK_HEIGHT}px`,
                        background: segmentBackgroundColor,
                        border: `2px solid ${segmentBorderColor}`,
                        borderRadius: '4px',
                        padding: '2px 4px',
                        fontSize: '10px',
                        color: isSelected ? theme.colors.primaryForeground : theme.colors.text,
                        cursor: 'pointer',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'all 0.2s ease',
                        minWidth: '2px',
                        zIndex: 20 // Clips on top
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
                      title={`Clip ${index + 1}: ${formatTime(clip.startTime)} - ${formatTime(clip.endTime)}`}
                    >
                      <div style={{
                        width: '100%',
                        height: '100%',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '9px',
                        lineHeight: '1.2',
                        justifyContent: 'center'
                      }}>
                        <div style={{
                          textAlign: 'center',
                          width: '100%'
                        }}>
                          Clip {index + 1}
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  // Subtitle segment
                  const subtitle = segment.data;
                  const track = segment.track;
                  
                  // Calculate position based on compressed timeline when clips exist
                  let left: number, width: number;
                  
                  // Always use effective time positioning when clips exist
                  if (localClips.length > 0) {
                    // Use compressed timeline - convert original times to effective times
                    const effectiveStartTime = originalToEffectiveTime(subtitle.startTime);
                    const effectiveEndTime = originalToEffectiveTime(subtitle.endTime);
                    left = (effectiveStartTime / actualDuration) * 100;
                    width = ((effectiveEndTime - effectiveStartTime) / actualDuration) * 100;
                  } else {
                    // No clips - use original timeline
                    left = (subtitle.startTime / actualDuration) * 100;
                    width = ((subtitle.endTime - subtitle.startTime) / actualDuration) * 100;
                  }
                  
                  const isSelected = subtitle.id === effectiveSelectedId;
                  
                  // Use consistent blue border color for all segments
                  const segmentBorderColor = isSelected 
                    ? theme.colors.primary 
                    : theme.colors.secondary;
                  
                  const segmentBackgroundColor = isSelected 
                    ? theme.colors.secondary 
                    : theme.colors.surface;
                  
                  return (
                    <div
                      key={`subtitle-${subtitle.id}`}
                      data-segment-id={subtitle.id}
                      style={{
                        position: 'absolute',
                        left: `${left}%`,
                        width: `${width}%`,
                        top: `${4 + track * (CAPTION_TRACK_HEIGHT)}px`, // Use track for Y positioning, offset by clip position
                        height: `${CAPTION_TRACK_HEIGHT}px`, // Fixed track height
                        background: segmentBackgroundColor,
                        border: `2px solid ${segmentBorderColor}`,
                        borderRadius: '4px',
                        padding: '2px 4px',
                        fontSize: '10px',
                        color: isSelected ? theme.colors.primaryForeground : theme.colors.text,
                        cursor: 'pointer',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'all 0.2s ease',
                        minWidth: '2px',
                        zIndex: 10 // Subtitles below clips
                      }}
                      onClick={() => handleSegmentClick(subtitle)}
                      onDoubleClick={() => handleSegmentDoubleClick(subtitle)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          segmentId: subtitle.id
                        });
                      }}
                      title={subtitle.text}
                    >
                      <div style={{
                        width: '100%',
                        height: '100%',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '9px',
                        lineHeight: '1.2',
                        textDecoration: subtitle.style?.burnInSubtitles === false ? 'line-through' : 'none',
                        opacity: subtitle.style?.burnInSubtitles === false ? 0.6 : 1
                      }}>
                        <div style={{
                          wordBreak: 'break-word',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          width: '100%'
                        }}>
                          {subtitle.text}
                        </div>
                      </div>
                    </div>
                  );
                }
              });
            })()}

            {/* Transcription Status - Show when no subtitles are available but transcription is in progress */}
            {effectiveCaptions.length === 0 && transcriptionStatus?.isTranscribing && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: theme.colors.surface,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: '8px',
                  padding: '16px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  zIndex: 20
                }}
              >
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    border: `2px solid ${theme.colors.primary}40`,
                    borderTop: `2px solid ${theme.colors.primary}`,
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}
                />
                <div>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    color: theme.colors.text,
                    marginBottom: '4px'
                  }}>
                    {transcriptionStatus.message}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: theme.colors.textSecondary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div style={{ 
                      width: '60px', 
                      height: '4px', 
                      backgroundColor: theme.colors.surface,
                      borderRadius: '2px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${transcriptionStatus.progress}%`,
                        height: '100%',
                        backgroundColor: theme.colors.primary,
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                    <span>{Math.round(transcriptionStatus.progress)}%</span>
                    {transcriptionStatus.eta && (
                      <span>ETA: {transcriptionStatus.eta}</span>
                    )}
                  </div>
                </div>
              </div>
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