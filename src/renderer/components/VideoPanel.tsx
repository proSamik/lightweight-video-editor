import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { VideoFile, AISubtitleData, SubtitleFrame, VideoClip } from '../../types';
import { useTheme } from '../contexts/ThemeContext';
import { Video, AlertTriangle } from 'lucide-react';
import CaptionStyleModal from './CaptionStyleModal';
import GlassVideoWrapper from './ui/GlassVideoWrapper';

interface VideoPanelProps {
  videoFile: VideoFile | null;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  onTimeSeek?: (time: number) => void;
  onVideoSelect: () => void;
  onPlayPause?: () => void;
  isPlaying?: boolean;
  replacementAudioPath?: string | null;
  isAudioPreviewEnabled?: boolean;
  dependenciesReady?: boolean;
  isCheckingDependencies?: boolean;
  // AI Subtitle support - when available, use instead of captions
  aiSubtitleData?: AISubtitleData | null;
  selectedFrameId?: string | null;
  onFrameSelect?: (frameId: string) => void;
  onAISubtitleUpdate?: (data: AISubtitleData | null) => void;
  // Clip support - sync only with clips mode
  clips?: VideoClip[];
}

const VideoPanel: React.FC<VideoPanelProps> = ({
  videoFile,
  currentTime,
  onTimeUpdate,
  onTimeSeek,
  onVideoSelect,
  onPlayPause,
  isPlaying,
  replacementAudioPath,
  isAudioPreviewEnabled = true,
  dependenciesReady = true,
  isCheckingDependencies = false,
  aiSubtitleData,
  selectedFrameId,
  onFrameSelect,
  onAISubtitleUpdate,
  clips = [],
}) => {
  const { theme } = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const replacementAudioRef = useRef<HTMLAudioElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isTimelineDragging, setIsTimelineDragging] = useState(false);
  const [showCaptionStyleModal, setShowCaptionStyleModal] = useState(false);
  const [selectedCaptionForStyling, setSelectedCaptionForStyling] = useState<any | null>(null);
  const [modalPosition, setModalPosition] = useState({ x: 100, y: 100 });
  const [scaleFactor, setScaleFactor] = useState(1);
  const [isHoveringCaption, setIsHoveringCaption] = useState(false);
  const [lastSkipTime, setLastSkipTime] = useState<number>(-1);
  const isSkippingRef = useRef<boolean>(false);

  /**
   * Convert effective time to original video time (always use clips as source of truth)
   */
  const effectiveToOriginalTime = useCallback((effectiveTime: number): number => {
    // Always use clips timeline if clips exist, regardless of mode
    if (clips.length === 0) return effectiveTime;

    const activeClips = clips.filter(clip => !clip.isRemoved);
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

    // If we reach here, return the last clip's end time
    return activeClips[activeClips.length - 1].endTime;
  }, [clips]);

  /**
   * Convert original video time to effective time (always use clips as source of truth)
   */
  const originalToEffectiveTime = useCallback((originalTime: number): number => {
    // Always use clips timeline if clips exist, regardless of mode
    if (clips.length === 0) return originalTime;

    const activeClips = clips.filter(clip => !clip.isRemoved);
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
  }, [clips]);
  const tempDragPositionRef = useRef<{ x: number; y: number } | null>(null);
  const [videoFileExists, setVideoFileExists] = useState<boolean | null>(null);
  const [videoLoadError, setVideoLoadError] = useState<boolean>(false);

  // Convert AI subtitle frames to virtual caption segments for rendering
  type DisplaySegment = { id: string; startTime: number; endTime: number; text: string; style: any; words?: { word: string; start: number; end: number }[] };
  const virtualCaptionsFromAI = useMemo((): DisplaySegment[] => {
    if (!aiSubtitleData) return [];
    const virtualCaptions: DisplaySegment[] = [];
    
    aiSubtitleData.frames.forEach(frame => {
      // Find the original caption segment for style reference
      // Provide a safe fallback style
      const baseStyle = frame.style || {
        font: 'Poppins',
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

      // Get visible words for preview (exclude removedCaption and pauses)
      const visibleWords = frame.words.filter(word => 
        word.editState !== 'removedCaption' &&
        !word.isPause
      );

      if (visibleWords.length === 0) return; // Skip frames with no visible words

      // Keep frame times as original times (VideoPanel now works with original time)
      const frameStartMs = frame.startTime * 1000;
      const frameEndMs = frame.endTime * 1000;

      // Create caption segment with original timing
      const virtualCaption: DisplaySegment = {
        id: frame.id,
        startTime: frameStartMs,
        endTime: frameEndMs,
        text: visibleWords.map((w: any) => w.word).join(' '),
        words: visibleWords.map((word: any) => {
          const wordStartMs = word.start * 1000;
          const wordEndMs = word.end * 1000;
          
          return {
            word: word.word,
            start: wordStartMs,
            end: wordEndMs,
            editState: word.editState // Include edit state for rendering decisions
          };
        }),
        style: baseStyle,
      };

      virtualCaptions.push(virtualCaption);
    });

    return virtualCaptions.sort((a, b) => a.startTime - b.startTime);
  }, [aiSubtitleData]);

  // Use AI-derived captions if available, otherwise use regular captions
  const effectiveCaptions = virtualCaptionsFromAI;
  
  // Determine effective selection - use frame selection for AI mode, segment selection for regular mode
  const effectiveSelectedId = selectedFrameId || null;



  // Check if current original time is within removed clips (for skip functionality only)
  const shouldSkip = useCallback((originalTimeMs: number): boolean => {
    // Always apply clip-based skipping when clips exist, regardless of mode
    if (clips.length === 0) return false;
    
    const activeClips = clips.filter(clip => !clip.isRemoved);
    if (activeClips.length === 0) return true; // All clips removed, skip everything
    
    // Check if time is within any active clip
    const isInActiveClip = activeClips.some(clip => 
      originalTimeMs >= clip.startTime && originalTimeMs <= clip.endTime
    );
    
    return !isInActiveClip; // Skip if NOT in active clip
  }, [clips]);

  // Find the next valid (active clip) time after the current time
  const findNextValidTime = useCallback((currentOriginalTimeMs: number): number | null => {
    if (clips.length === 0) return null;
    
    const activeClips = clips.filter(clip => !clip.isRemoved);
    if (activeClips.length === 0) return null;
    
    // Find the next active clip that starts after current time
    const nextClip = activeClips
      .filter(clip => clip.startTime > currentOriginalTimeMs)
      .sort((a, b) => a.startTime - b.startTime)[0];
    
    return nextClip ? nextClip.startTime : null;
  }, [clips]);

  // Auto-skip over deleted clips during playback
  const handleAutoSkip = useCallback((originalTimeMs: number) => {
    const video = videoRef.current;
    if (!video || clips.length === 0) return;
    
    // Check if we need to skip (in a deleted clip)
    const needsSkip = shouldSkip(originalTimeMs);
    if (!needsSkip) return;
    
    // Prevent multiple skips within 3000ms of the same position
    const timeDiff = Math.abs(originalTimeMs - lastSkipTime);
    if (timeDiff < 3000) return;
    
    const nextValidTime = findNextValidTime(originalTimeMs);
    if (nextValidTime === null) return;
    
    console.log(`Auto-skipping from ${originalTimeMs}ms to ${nextValidTime}ms`);
    
    // Track this skip
    setLastSkipTime(originalTimeMs);
    
    // Set skipping flag to prevent audio interruption
    isSkippingRef.current = true;
    
    // Temporarily disable pause event to prevent interruption
    const wasPlaying = !video.paused;
    
    // Perform the skip
    video.currentTime = nextValidTime / 1000;
    
    // Sync replacement audio during auto-skip (use same timeline as video)
    const replacementAudio = replacementAudioRef.current;
    if (replacementAudio && replacementAudioPath) {
      replacementAudio.currentTime = nextValidTime / 1000;
    }
    
    // Report original time to parent (parent will handle time conversion)
    onTimeUpdate(nextValidTime);
    
    // Ensure video continues playing after skip
    if (wasPlaying && video.paused) {
      // Small delay to ensure the time change has been processed
      setTimeout(() => {
        if (video.paused) {
          video.play().catch((error) => {
            console.error('Failed to resume playback after skip:', error);
          });
        }
        // Clear skipping flag after a delay
        setTimeout(() => {
          isSkippingRef.current = false;
        }, 500);
      }, 50);
    } else {
      // Clear skipping flag after a delay
      setTimeout(() => {
        isSkippingRef.current = false;
      }, 500);
    }
  }, [shouldSkip, findNextValidTime, originalToEffectiveTime, onTimeUpdate, clips.length, lastSkipTime, replacementAudioPath]);

  // Check if video file exists when videoFile changes
  useEffect(() => {
    if (!videoFile || !videoFile.path) {
      setVideoFileExists(null);
      return;
    }

    // Use IPC to check file existence in main process
    const checkFileExists = async () => {
      try {
        const exists = await (window as any).electronAPI.fileExists(videoFile.path);
        setVideoFileExists(exists);
        setVideoLoadError(false); // Reset error state when checking new file
      } catch (error) {
        console.error('Error checking video file existence:', error);
        setVideoFileExists(false);
      }
    };

    checkFileExists();
  }, [videoFile]);

  // Pause video when videoFile changes (project switching)
  useEffect(() => {
    const video = videoRef.current;
    if (video && !video.paused) {
      video.pause();
      // Notify parent that video has been paused
      if (onPlayPause && isPlaying) {
        onPlayPause();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoFile]); // Only depend on videoFile changes

  // Helper function to check if mouse click is on rendered caption text
  const isClickOnCaption = (mouseX: number, mouseY: number, caption: any): boolean => {
    const canvas = canvasRef.current;
    if (!canvas) return false;

    // Get the rendered position and size of the caption
    const x = (canvas.width * (caption.style.position?.x || 50)) / 100;
    const y = (canvas.height * (caption.style.position?.y || 50)) / 100;
    
    // Calculate font size with scale
    const baseFontSize = caption.style?.fontSize || 85;
    const scale = caption.style?.scale || 1;
    const fontSize = baseFontSize * scale;
    
    // Create a temporary canvas context to measure text
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    
    ctx.font = `bold ${fontSize}px ${caption.style?.font || 'Inter'}, Arial, sans-serif`;
    
    // Get text to measure
    let textToMeasure = caption.text;
    if (caption.words && caption.words.length > 0) {
      textToMeasure = caption.words.map((w: any) => w.word).join(' ');
    }
    
    const textMetrics = ctx.measureText(textToMeasure);
    const textWidth = textMetrics.width;
    const textHeight = fontSize;
    
    // Define hit box (with some padding for easier clicking)
    const padding = 20;
    const hitBoxLeft = x - (textWidth / 2) - padding;
    const hitBoxRight = x + (textWidth / 2) + padding;
    const hitBoxTop = y - (textHeight / 2) - padding;
    const hitBoxBottom = y + (textHeight / 2) + padding;
    
    // Check if mouse is within hit box
    return mouseX >= hitBoxLeft && mouseX <= hitBoxRight && 
           mouseY >= hitBoxTop && mouseY <= hitBoxBottom;
  };

  // Mouse interaction handlers for text box manipulation
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // Only handle left click for dragging
    if (!onFrameSelect) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    
    // Find captions that's currently visible - use original time
    const originalTimeMs = currentTime;
    
    const currentCaptions = effectiveCaptions.filter(
      caption => originalTimeMs >= caption.startTime && originalTimeMs <= caption.endTime
    );
    
    // Check if click is on any visible caption text
    let clickedCaption = null;
    for (const caption of currentCaptions) {
      if (isClickOnCaption(mouseX, mouseY, caption)) {
        clickedCaption = caption;
        break;
      }
    }
    
    if (clickedCaption) {
      // Select the frame if not already selected
      if (effectiveSelectedId !== clickedCaption.id) {
        onFrameSelect(clickedCaption.id);
      }
      
      setIsDragging(true);
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Mouse move handler to track hover state
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) return; // Don't change cursor while dragging
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    
    // Find captions that's currently visible - use original time
    const originalTimeMs = currentTime;
    
    const currentCaptions = effectiveCaptions.filter(
      caption => originalTimeMs >= caption.startTime && originalTimeMs <= caption.endTime
    );
    
    // Check if hovering over any caption
    let hoveringCaption = false;
    for (const caption of currentCaptions) {
      if (isClickOnCaption(mouseX, mouseY, caption)) {
        hoveringCaption = true;
        break;
      }
    }
    
    setIsHoveringCaption(hoveringCaption);
  };

  // Right-click context menu handler
  const handleCanvasRightClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    // Find caption at current time - use original time
    const originalTimeMs = currentTime;
    
    const currentCaption = effectiveCaptions.find(
      caption => originalTimeMs >= caption.startTime && originalTimeMs <= caption.endTime
    );
    
    if (currentCaption) {
      setSelectedCaptionForStyling(currentCaption);
      setModalPosition({ x: e.clientX, y: e.clientY });
      setShowCaptionStyleModal(true);
    }
  };

  // Global mouse move handler for dragging - real-time visual feedback
  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !effectiveSelectedId) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    
    // Calculate mouse position relative to canvas
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert to percentage of canvas dimensions
    const newXPercent = Math.max(0, Math.min(100, (mouseX / rect.width) * 100));
    const newYPercent = Math.max(0, Math.min(100, (mouseY / rect.height) * 100));
    
    // Store temporary position for immediate visual feedback
    tempDragPositionRef.current = { x: newXPercent, y: newYPercent };
    
    // Immediately re-render canvas with new position
    renderCaptionsOnCanvasWithTempPosition();
  }, [isDragging, effectiveSelectedId]);

  // Global mouse up handler
  const handleGlobalMouseUp = useCallback(() => {
    // Save the temporary position to actual subtitle data if we have one
    if (tempDragPositionRef.current && effectiveSelectedId && onAISubtitleUpdate && aiSubtitleData) {
      const newPosition = tempDragPositionRef.current;
      
      // Create updated AI subtitle data with the new position
      const updatedData: AISubtitleData = {
        ...aiSubtitleData,
        frames: aiSubtitleData.frames.map(frame => {
          if (frame.id === effectiveSelectedId) {
            return {
              ...frame,
              style: {
                ...frame.style,
                position: {
                  ...frame.style?.position,
                  x: newPosition.x,
                  y: newPosition.y
                }
              }
            } as SubtitleFrame;
          }
          return frame;
        }),
        lastModified: Date.now()
      };
      
      // Update the AI subtitle data
      onAISubtitleUpdate(updatedData);
    }
    
    // Clear temp position and stop dragging
    tempDragPositionRef.current = null;
    setIsDragging(false);
  }, [effectiveSelectedId, aiSubtitleData, onAISubtitleUpdate]);


    // Render captions on canvas (same logic as export)
    const renderCaptionsOnCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const video = videoRef.current;
      
      if (!canvas || !ctx || !video) return;
      
      // Don't render if canvas doesn't have valid dimensions yet
      if (canvas.width === 0 || canvas.height === 0) return;
  
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
  
      // Use original time for caption filtering (currentTime is now original time)
      const originalTimeMs = currentTime;
      
      // Render regular captions using Caption Styling
      const currentCaptions = effectiveCaptions.filter(
        caption => originalTimeMs >= caption.startTime && originalTimeMs <= caption.endTime
      );
  
      if (currentCaptions.length === 0) return;
  
      // Render all captions using cached scale factor - use original time for rendering
      currentCaptions.forEach(caption => {
        renderCaptionOnCanvas(ctx, caption, canvas.width, canvas.height, originalTimeMs, scaleFactor);
      });
    }, [effectiveCaptions, effectiveSelectedId, scaleFactor, currentTime]);

  // Set up global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, handleGlobalMouseMove, handleGlobalMouseUp]);

  // Close modal when clicking elsewhere or pressing ESC
  useEffect(() => {
    const handleClickOutside = () => {
      setShowCaptionStyleModal(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCaptionStyleModal(false);
      }
    };

    if (showCaptionStyleModal) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showCaptionStyleModal]);

  // Mini timeline handlers for fullscreen mode
  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    if (!onTimeSeek || !videoFile?.duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const seekTime = percentage * (videoFile.duration * 1000);
    
    setIsTimelineDragging(true);
    onTimeSeek(seekTime);
  };

  const handleTimelineMouseMove = useCallback((e: MouseEvent) => {
    if (!isTimelineDragging || !onTimeSeek || !videoFile?.duration) return;
    
    const target = e.target as HTMLElement;
    if (!target.classList.contains('mini-timeline')) return;
    
    const rect = target.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, mouseX / rect.width));
    const seekTime = percentage * (videoFile.duration * 1000);
    
    onTimeSeek(seekTime);
  }, [isTimelineDragging, onTimeSeek, videoFile?.duration]);

  const handleTimelineMouseUp = useCallback(() => {
    setIsTimelineDragging(false);
  }, []);

  // Set up timeline mouse event listeners
  useEffect(() => {
    if (isTimelineDragging) {
      document.addEventListener('mousemove', handleTimelineMouseMove);
      document.addEventListener('mouseup', handleTimelineMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleTimelineMouseMove);
      document.removeEventListener('mouseup', handleTimelineMouseUp);
    };
  }, [isTimelineDragging, handleTimelineMouseMove, handleTimelineMouseUp]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const handleTimeUpdate = () => {
        const originalTimeMs = video.currentTime * 1000;
        
        // Auto-skip over cut segments during playback (use original time for this check)
        handleAutoSkip(originalTimeMs);
        
        // Always report original time to parent - let parent handle time conversion
        onTimeUpdate(originalTimeMs);
        // Force canvas re-render will be handled by the renderCaptionsOnCanvas useEffect
      };
      
      // More frequent updates for better synchronization
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('seeked', handleTimeUpdate);
      video.addEventListener('loadedmetadata', handleTimeUpdate);
      
      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('seeked', handleTimeUpdate);
        video.removeEventListener('loadedmetadata', handleTimeUpdate);
      };
    }
    return undefined;
  }, [onTimeUpdate, handleAutoSkip, clips.length]);

  // Sync video time when currentTime prop changes (for seeking)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    // currentTime is now original time from parent, use directly
    const targetTimeMs = currentTime;
    
    // Use a smaller threshold for more responsive seeking
    if (Math.abs(video.currentTime * 1000 - targetTimeMs) > 100) {
      // Only seek if the difference is significant (> 100ms) to avoid loops
      video.currentTime = targetTimeMs / 1000;
    }
  }, [currentTime]);

  // Update canvas size when video loads and calculate scale factor
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Always set initial canvas dimensions from videoFile metadata if available
    if (canvas && videoFile && canvas.width === 0) {
      const initialWidth = videoFile.width || 1920;
      const initialHeight = videoFile.height || 1080;
      canvas.width = initialWidth;
      canvas.height = initialHeight;
      setCanvasSize({ width: initialWidth, height: initialHeight });
      
      // Calculate initial scale factor
      const canvasRect = canvas.getBoundingClientRect();
      const scaleX = canvasRect.width / canvas.width;
      const scaleY = canvasRect.height / canvas.height;
      const newScaleFactor = Math.min(scaleX, scaleY);
      setScaleFactor(newScaleFactor);
      
      console.log(`Canvas initialized with dimensions: ${initialWidth}x${initialHeight}`);
      
      // Force immediate re-render after initial canvas setup
      setTimeout(() => {
        renderCaptionsOnCanvas();
      }, 20);
    }
    
    if (video && canvas) {
      const handleLoadedMetadata = () => {
        // Update canvas size to match actual video dimensions
        const actualWidth = video.videoWidth;
        const actualHeight = video.videoHeight;
        
        // Only update if dimensions actually changed
        if (canvas.width !== actualWidth || canvas.height !== actualHeight) {
          canvas.width = actualWidth;
          canvas.height = actualHeight;
          setCanvasSize({ width: actualWidth, height: actualHeight });
          
          // Calculate and cache scale factor
          const canvasRect = canvas.getBoundingClientRect();
          const scaleX = canvasRect.width / canvas.width;
          const scaleY = canvasRect.height / canvas.height;
          const newScaleFactor = Math.min(scaleX, scaleY);
          setScaleFactor(newScaleFactor);
          
          console.log(`Canvas updated with video metadata: ${actualWidth}x${actualHeight}`);
          
          // Force immediate re-render after canvas dimension update
          setTimeout(() => {
            renderCaptionsOnCanvas();
          }, 20);
        }
      };
      
      // Set initial canvas size if video already has metadata
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        handleLoadedMetadata();
      }
      
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    } else if (canvas && videoLoadError && videoFile) {
      // Fallback canvas size when video fails to load
      const fallbackWidth = videoFile.width || 1920;
      const fallbackHeight = videoFile.height || 1080;
      canvas.width = fallbackWidth;
      canvas.height = fallbackHeight;
      setCanvasSize({ width: fallbackWidth, height: fallbackHeight });
      
      // Calculate scale factor for fallback
      const canvasRect = canvas.getBoundingClientRect();
      const scaleX = canvasRect.width / canvas.width;
      const scaleY = canvasRect.height / canvas.height;
      const newScaleFactor = Math.min(scaleX, scaleY);
      setScaleFactor(newScaleFactor);
      
      console.log(`Canvas fallback dimensions: ${fallbackWidth}x${fallbackHeight}`);
      
      // Force immediate re-render after fallback canvas setup
      setTimeout(() => {
        renderCaptionsOnCanvas();
      }, 20);
    }
    return undefined;
  }, [videoFile, videoLoadError, renderCaptionsOnCanvas]);

  // Update scale factor when canvas size changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && canvasSize.width > 0 && canvasSize.height > 0) {
      const canvasRect = canvas.getBoundingClientRect();
      const scaleX = canvasRect.width / canvas.width;
      const scaleY = canvasRect.height / canvas.height;
      const newScaleFactor = Math.min(scaleX, scaleY);
      setScaleFactor(newScaleFactor);
    }
  }, [canvasSize]);

  // Render captions on canvas with temporary drag position for real-time feedback
  const renderCaptionsOnCanvasWithTempPosition = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (!canvas || !ctx) return;
    
    // Don't render if canvas doesn't have valid dimensions yet
    if (canvas.width === 0 || canvas.height === 0) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Use original time for caption filtering (currentTime is now original time)
    const originalTimeMs = currentTime;

    // Get all current captions (for potential overlapping)
    const currentCaptions = effectiveCaptions.filter(
      caption => originalTimeMs >= caption.startTime && originalTimeMs <= caption.endTime
    );

    if (currentCaptions.length === 0) return;

    // Render all captions with temp position override for the selected one
    currentCaptions.forEach(caption => {
      let renderCaption = caption;
      
      // If this is the selected caption being dragged, use temp position
      if (caption.id === effectiveSelectedId && tempDragPositionRef.current) {
        renderCaption = {
          ...caption,
          style: {
            ...caption.style,
            position: {
              ...caption.style.position,
              x: tempDragPositionRef.current.x,
              y: tempDragPositionRef.current.y
            }
          }
        };
      }
      
      renderCaptionOnCanvas(ctx, renderCaption, canvas.width, canvas.height, originalTimeMs, scaleFactor);
    });
  }, [effectiveCaptions, effectiveSelectedId, scaleFactor, currentTime]);

  // Force re-render when caption styles change - optimized
  useEffect(() => {
    // Only re-render if not currently dragging to avoid constant updates during drag
    if (!isDragging) {
      renderCaptionsOnCanvas();
    }
  }, [effectiveCaptions.map(c => JSON.stringify(c.style)).join('|'), isDragging]); // Trigger when any style property changes

  // Re-render when captions or time changes - but not during dragging (throttled)
  useEffect(() => {
    if (!isDragging) {
      const timeoutId = setTimeout(() => {
        renderCaptionsOnCanvas();
      }, 16); // Throttle to ~60fps for smooth rendering
      
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [renderCaptionsOnCanvas, isDragging]);

  // CRITICAL: Force re-render when canvas dimensions change to fix font truncation
  useEffect(() => {
    if (canvasSize.width > 0 && canvasSize.height > 0 && !isDragging) {
      // Small delay to ensure canvas has been updated
      setTimeout(() => {
        renderCaptionsOnCanvas();
      }, 10);
    }
  }, [canvasSize, renderCaptionsOnCanvas, isDragging]);

  // VideoPanel responds to isPlaying prop changes from parent

  // Handle play/pause state from parent (UnifiedTimeline)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Don't try to play if video has ended - let it stay paused
    if (isPlaying && video.paused && !video.ended) {
      video.play().catch(console.error);
    } else if (!isPlaying && !video.paused && !video.ended) {
      video.pause();
    }
  }, [isPlaying]);

  // Sync video element state changes back to parent
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onPlayPause) return;

    const handlePlay = () => {
      // Video started playing - call onPlayPause only if parent thinks it's paused
      if (!isPlaying) {
        onPlayPause();
      }
    };
    
    const handlePause = () => {
      // Video paused - call onPlayPause only if parent thinks it's playing
      if (isPlaying && !video.ended) {
        onPlayPause();
      }
    };
    
    const handleEnded = () => {
      // Video ended - call onPlayPause only if parent thinks it's playing
      // Add additional check to prevent loop when video is already ended
      if (isPlaying) {
        onPlayPause();
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [isPlaying, onPlayPause]);

  // Initialize replacement audio when path is provided
  useEffect(() => {
    const replacementAudio = replacementAudioRef.current;
    if (!replacementAudioPath || !replacementAudio) {
      console.log('Skipping audio setup - no path or element:', { replacementAudioPath, hasElement: !!replacementAudio });
      return;
    }

    console.log('Loading replacement audio:', replacementAudioPath);
    replacementAudio.src = `file://${replacementAudioPath}`;
    replacementAudio.preload = 'auto';
    
    const handleCanPlayThrough = () => {
      console.log('Replacement audio ready to play');
    };
    
    const handleLoadError = (e: Event) => {
      console.error('Replacement audio load error:', e);
    };
    
    const handleLoadStart = () => {
      console.log('Replacement audio loading started');
    };
    
    replacementAudio.addEventListener('loadstart', handleLoadStart);
    replacementAudio.addEventListener('canplaythrough', handleCanPlayThrough);
    replacementAudio.addEventListener('error', handleLoadError);
    replacementAudio.load();
    
    return () => {
      replacementAudio.removeEventListener('loadstart', handleLoadStart);
      replacementAudio.removeEventListener('canplaythrough', handleCanPlayThrough);
      replacementAudio.removeEventListener('error', handleLoadError);
    };
  }, [replacementAudioPath]);

  // Separate effect to ensure audio is loaded when both path and element are ready
  useEffect(() => {
    // Small delay to ensure element is attached
    const timeout = setTimeout(() => {
      const replacementAudio = replacementAudioRef.current;
      console.log('Checking for delayed audio element:', {
        replacementAudioPath,
        hasElement: !!replacementAudio,
        readyState: replacementAudio?.readyState
      });
      
      if (replacementAudioPath && replacementAudio && replacementAudio.readyState === 0) {
        console.log('Loading replacement audio (delayed):', replacementAudioPath);
        replacementAudio.src = `file://${replacementAudioPath}`;
        replacementAudio.preload = 'auto';
        
        const handleCanPlayThrough = () => {
          console.log('Replacement audio ready to play (delayed)');
        };
        
        const handleLoadError = (e: Event) => {
          console.error('Replacement audio load error (delayed):', e);
        };
        
        const handleLoadStart = () => {
          console.log('Replacement audio loading started (delayed)');
        };
        
        replacementAudio.addEventListener('loadstart', handleLoadStart, { once: true });
        replacementAudio.addEventListener('canplaythrough', handleCanPlayThrough, { once: true });
        replacementAudio.addEventListener('error', handleLoadError, { once: true });
        replacementAudio.load();
      }
    }, 100);
    
    return () => clearTimeout(timeout);
  }, [replacementAudioPath]);

  // Audio control - DRY principle: single source of truth  
  useEffect(() => {
    const videoAudio = videoRef.current;
    const replacementAudio = replacementAudioRef.current;
    if (!videoAudio) return;

    console.log('Audio control update:', {
      replacementAudioPath,
      isAudioPreviewEnabled,
      isPlaying,
      videoPaused: videoAudio.paused,
      replacementAudioPaused: replacementAudio?.paused,
      replacementAudioReady: replacementAudio?.readyState
    });

    if (!replacementAudioPath || !replacementAudio) {
      // No replacement audio - use original video audio
      videoAudio.muted = false;
      videoAudio.volume = 1;
      return;
    }

    // Replacement audio exists - decide which to play
    if (isAudioPreviewEnabled) {
      // Use replacement audio - completely mute video
      console.log('Setting up replacement audio mode');
      videoAudio.muted = true;
      videoAudio.volume = 0;
      replacementAudio.volume = 1;
      
      // Ensure replacement audio matches video play state
      if (!videoAudio.paused && replacementAudio.paused) {
        // Video is playing but replacement audio is paused - start it
        if (replacementAudio.readyState >= 3) {
          console.log('Starting replacement audio playback (audio ready)');
          replacementAudio.currentTime = videoAudio.currentTime;
          replacementAudio.play().then(() => {
            console.log('Replacement audio started successfully');
          }).catch((error) => {
            console.error('Failed to start replacement audio:', error);
          });
        } else {
          console.log('Replacement audio not ready yet, readyState:', replacementAudio.readyState);
        }
      } else if (videoAudio.paused && !replacementAudio.paused) {
        // Video is paused but replacement audio is still playing - pause it
        console.log('Pausing replacement audio (video paused)');
        replacementAudio.pause();
      }
    } else {
      // Use original video audio - unmute video
      console.log('Setting up original video audio mode');
      videoAudio.muted = false;
      videoAudio.volume = 1;
      replacementAudio.volume = 0;
      
      // Pause replacement audio when not in use
      if (!replacementAudio.paused) {
        replacementAudio.pause();
      }
    }
  }, [replacementAudioPath, isAudioPreviewEnabled, isPlaying]);

  // Sync replacement audio with video timeline (JCut behavior)
  useEffect(() => {
    const videoAudio = videoRef.current;
    const replacementAudio = replacementAudioRef.current;
    
    if (!videoAudio || !replacementAudio || !replacementAudioPath) return;

    const syncAudio = () => {
      // Replacement audio should use original timeline (same as video)
      const targetTime = videoAudio.currentTime;
      
      // Sync if difference is significant
      if (Math.abs(replacementAudio.currentTime - targetTime) > 0.2) {
        replacementAudio.currentTime = targetTime;
      }

      // JCut behavior: mute replacement audio when video is in deleted clips
      if (isAudioPreviewEnabled) {
        const originalTimeMs = videoAudio.currentTime * 1000;
        const isInDeletedClip = shouldSkip(originalTimeMs);
        const targetVolume = isInDeletedClip ? 0 : 1;
        
        if (Math.abs(replacementAudio.volume - targetVolume) > 0.1) {
          replacementAudio.volume = targetVolume;
          console.log(`Replacement audio: time=${originalTimeMs.toFixed(1)}ms, deleted=${isInDeletedClip}, volume=${targetVolume}`);
        }
      }
    };

    const handleVideoPlay = () => {
      if (isAudioPreviewEnabled && !isSkippingRef.current) {
        // Sync to same original time as video
        replacementAudio.currentTime = videoAudio.currentTime;
        replacementAudio.play().catch(console.error);
      }
    };

    const handleVideoPause = () => {
      // Always pause replacement audio when video pauses
      if (isAudioPreviewEnabled && !replacementAudio.paused) {
        console.log('Pausing replacement audio');
        replacementAudio.pause();
      }
    };

    // Add event listeners
    videoAudio.addEventListener('timeupdate', syncAudio);
    videoAudio.addEventListener('play', handleVideoPlay);
    videoAudio.addEventListener('pause', handleVideoPause);
    videoAudio.addEventListener('seeked', syncAudio);

    return () => {
      videoAudio.removeEventListener('timeupdate', syncAudio);
      videoAudio.removeEventListener('play', handleVideoPlay);
      videoAudio.removeEventListener('pause', handleVideoPause);
      videoAudio.removeEventListener('seeked', syncAudio);
    };
  }, [replacementAudioPath, isAudioPreviewEnabled, clips, shouldSkip, originalToEffectiveTime]);




  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  // No video file selected
  if (!videoFile) {
    return (
      <GlassVideoWrapper>
        <div 
          data-drop-zone="video"
          className="video-drop-zone"
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDragOver ? `${theme.colors.primary}15` : `rgba(255, 255, 255, 0.95)`,
            borderRadius: '12px',
            border: isDragOver ? `2px dashed ${theme.colors.primary}` : `2px dashed ${theme.colors.primary}40`,
            cursor: dependenciesReady ? 'pointer' : 'not-allowed',
            opacity: dependenciesReady ? 1 : 0.6,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden'
          }} 
          onClick={dependenciesReady ? onVideoSelect : undefined}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {/* Subtle gradient background for depth */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(135deg, ${theme.colors.primary}10, rgba(255, 255, 255, 0.3))`,
            opacity: 0.4
          }} />
          
          <div style={{ 
            textAlign: 'center', 
            position: 'relative',
            zIndex: 1,
            padding: '40px'
          }}>
            {/* Video icon at the top */}
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: theme.colors.primary + '20',
              marginBottom: '24px',
              boxShadow: `0 8px 24px ${theme.colors.primary}30`,
              margin: '0 auto 24px auto', // Center the icon horizontally
            }}>
              <Video 
                size={40} 
                color={theme.colors.primary}
                style={{
                  filter: `drop-shadow(0 4px 8px ${theme.colors.primary}40)`
                }}
              />
            </div>
            
            <div style={{ 
              fontSize: '20px', 
              marginBottom: '12px',
              color: theme.colors.text,
              fontWeight: '600',
              fontFamily: theme.typography.fontFamily
            }}>
{isCheckingDependencies 
                ? 'Checking dependencies...' 
                : dependenciesReady 
                  ? 'Drop a video file here or click to select'
                  : 'Dependencies not ready'}
            </div>
            
            <div style={{ 
              fontSize: '15px', 
              color: theme.colors.textSecondary,
              marginBottom: '20px'
            }}>
{isCheckingDependencies 
                ? 'Please wait while we initialize...'
                : dependenciesReady 
                  ? 'Supports MP4, MOV, AVI'
                  : 'Please install missing dependencies'}
            </div>
            
            {/* Blue accent button for visual appeal */}
            <div style={{
              display: 'inline-block',
              padding: '8px 16px',
              backgroundColor: theme.colors.primary,
              color: theme.colors.primaryForeground,
              borderRadius: theme.radius.md,
              fontSize: '14px',
              fontWeight: '500',
              boxShadow: theme.shadows.sm,
              transition: 'all 0.2s ease'
            }}>
              Choose Video File
            </div>
          </div>
        </div>
      </GlassVideoWrapper>
    );
  }

  // Video file selected but doesn't exist
  if (videoFile && videoFileExists === false) {
    return (
      <GlassVideoWrapper>
        <div 
          style={{
            width: '100%',
            height: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            borderRadius: '12px',
            border: `2px solid ${theme.colors.error}40`,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Error gradient background */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(135deg, ${theme.colors.error}20, transparent)`,
            opacity: 0.6
          }} />
          
          <div style={{ 
            textAlign: 'center', 
            position: 'relative',
            zIndex: 1,
            padding: '40px'
          }}>
            {/* Warning icon */}
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: theme.colors.error + '20',
              marginBottom: '24px',
              boxShadow: `0 8px 24px ${theme.colors.error}30`,
              margin: '0 auto 24px auto',
            }}>
              <AlertTriangle 
                size={40} 
                color={theme.colors.error}
                style={{
                  filter: `drop-shadow(0 4px 8px ${theme.colors.error}40)`
                }}
              />
            </div>
            
            <div style={{ 
              fontSize: '20px', 
              marginBottom: '12px',
              color: theme.colors.text,
              fontWeight: '600',
              fontFamily: theme.typography.fontFamily
            }}>
              Video file not found
            </div>
            
            <div style={{ 
              fontSize: '15px', 
              color: theme.colors.textSecondary,
              marginBottom: '20px',
              maxWidth: '400px',
              lineHeight: '1.5'
            }}>
              The video file "{videoFile.name}" could not be found at:
              <br />
              <span style={{ 
                fontFamily: 'monospace', 
                backgroundColor: theme.colors.background,
                padding: '4px 8px',
                borderRadius: '4px',
                display: 'inline-block',
                marginTop: '8px',
                wordBreak: 'break-all'
              }}>
                {videoFile.path}
              </span>
            </div>
            
            {/* Select new video button */}
            <div 
              style={{
                display: 'inline-block',
                padding: '8px 16px',
                backgroundColor: theme.colors.primary,
                color: theme.colors.primaryForeground,
                borderRadius: theme.radius.md,
                fontSize: '14px',
                fontWeight: '500',
                boxShadow: theme.shadows.sm,
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
              onClick={onVideoSelect}
            >
              Select New Video File
            </div>
          </div>
        </div>
      </GlassVideoWrapper>
    );
  }

  // Loading state while checking file existence
  if (videoFile && videoFileExists === null) {
    return (
      <GlassVideoWrapper>
        <div 
          style={{
            width: '100%',
            height: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            borderRadius: '12px',
            border: `1px solid ${theme.colors.border}`,
          }}
        >
          <div style={{ 
            textAlign: 'center',
            color: theme.colors.textSecondary
          }}>
            Checking video file...
          </div>
        </div>
      </GlassVideoWrapper>
    );
  }

  // Determine aspect ratio for wrapper
  const aspectRatio = videoFile && videoFile.width && videoFile.height 
    ? videoFile.height / videoFile.width > 1.5 ? '9:16' : '16:9'
    : '16:9';

  return (
    <div 
      data-video-preview
      style={{ 
        flex: 1, 
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(135deg, ${theme.colors.primary}20 0%, ${theme.colors.primary}10 50%, ${theme.colors.primary}05 100%)`,
        padding: '1px',
        border: `1px solid ${theme.colors.border}`,
        borderRadius: '2px',
        position: 'relative',
        minHeight: 0,
        overflow: 'hidden'
      }}
    >
      <GlassVideoWrapper aspectRatio={aspectRatio}>
        {/* Video Container with Canvas Overlay */}
        <div style={{ 
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden'
        }}>
        <video
          ref={videoRef}
          src={`file://${videoFile.path}`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: videoLoadError ? 'none' : 'block'
          }}
          onTimeUpdate={() => {
            // This is handled by the useEffect timeupdate listener above
            // Removing redundant call to prevent double rendering
          }}
          onSeeking={() => {
            // Force canvas re-render on seeking
            setTimeout(() => renderCaptionsOnCanvas(), 50);
          }}
          onSeeked={() => {
            // Force canvas re-render when seek is complete
            setTimeout(() => renderCaptionsOnCanvas(), 50);
          }}
          onError={(e) => {
            console.error('Video load error:', e);
            setVideoLoadError(true);
          }}
          onLoadStart={() => {
            setVideoLoadError(false);
          }}
        />

        {/* Video load error fallback */}
        {videoLoadError && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: theme.colors.textSecondary,
            backgroundColor: theme.colors.background,
            padding: '20px',
            borderRadius: theme.radius.md,
            border: `1px solid ${theme.colors.border}`,
            zIndex: 5
          }}>
            <AlertTriangle size={24} color={theme.colors.error} style={{ marginBottom: '8px' }} />
            <div>Unable to load video</div>
            <div style={{ fontSize: '14px', marginTop: '4px' }}>
              Subtitle preview may still work
            </div>
          </div>
        )}

        {/* Replacement Audio Element - Always render so ref is available */}
        <audio
          ref={replacementAudioRef}
          preload="auto"
          style={{ display: 'none' }}
        />
        
        {/* Canvas Overlay - Renders captions exactly like export */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            pointerEvents: (() => {
              const originalTimeMs = currentTime;
              return effectiveCaptions.some(c => originalTimeMs >= c.startTime && originalTimeMs <= c.endTime) ? 'auto' : 'none';
            })(),
            cursor: isDragging ? 'grabbing' : (isHoveringCaption ? 'grab' : 'default'),
            zIndex: 10,
            // Show canvas background when video fails to load
            backgroundColor: videoLoadError ? theme.colors.backgroundSecondary : 'transparent',
            border: videoLoadError ? `1px solid ${theme.colors.border}` : 'none'
          }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onContextMenu={handleCanvasRightClick}
        />

        {/* Mini Timeline for Fullscreen Mode */}
        {document.fullscreenElement && videoFile && videoFile.duration && onTimeSeek && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '300px',
            height: '40px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '20px',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div
              className="mini-timeline"
              style={{
                width: '100%',
                height: '24px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                position: 'relative',
                cursor: 'pointer'
              }}
              onMouseDown={handleTimelineMouseDown}
            >
              {/* Progress bar */}
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${(currentTime / (videoFile.duration * 1000)) * 100}%`,
                backgroundColor: theme.colors.primary,
                borderRadius: '12px',
                transition: 'width 0.1s ease'
              }} />
              
              {/* Playhead */}
              <div style={{
                position: 'absolute',
                left: `${(currentTime / (videoFile.duration * 1000)) * 100}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '8px',
                height: '8px',
                backgroundColor: theme.colors.primary,
                borderRadius: '50%',
                border: '2px solid white',
                boxShadow: '0 0 4px rgba(0,0,0,0.5)'
              }} />
            </div>
          </div>
        )}


        {/* Caption Style Modal */}
        <CaptionStyleModal
          isOpen={showCaptionStyleModal}
          onClose={() => setShowCaptionStyleModal(false)}
          caption={selectedCaptionForStyling}
          onUpdate={({ style }) => {
            if (!selectedCaptionForStyling || !aiSubtitleData || !onAISubtitleUpdate) return;
            
            // Update the specific frame's style in aiSubtitleData
            const updatedFrames = aiSubtitleData.frames.map(frame => {
              if (frame.id !== selectedCaptionForStyling.id) return frame;
              const safeStyle = {
                font: style.font || 'Poppins',
                fontSize: style.fontSize ?? 85,
                textColor: style.textColor || '#ffffff',
                textColorOpacity: style.textColorOpacity !== undefined ? style.textColorOpacity : 100,
                highlighterColor: style.highlighterColor || '#00ff00',
                highlighterColorOpacity: style.highlighterColorOpacity !== undefined ? style.highlighterColorOpacity : 100,
                backgroundColor: style.backgroundColor ?? '#000000',
                backgroundColorOpacity: style.backgroundColorOpacity !== undefined ? style.backgroundColorOpacity : 100,
                strokeColor: style.strokeColor,
                strokeColorOpacity: style.strokeColorOpacity !== undefined ? style.strokeColorOpacity : 100,
                position: style.position || { x: 50, y: 80 },
                strokeWidth: style.strokeWidth,
                textTransform: style.textTransform,
                scale: style.scale,
                emphasizeMode: style.emphasizeMode,
                renderMode: style.renderMode,
                textAlign: style.textAlign,
                burnInSubtitles: style.burnInSubtitles,
              };
              return { ...frame, style: safeStyle };
            });

            onAISubtitleUpdate({
              ...aiSubtitleData,
              frames: updatedFrames,
              lastModified: Date.now()
            });
            
            // Update the local selection state
            setSelectedCaptionForStyling({
              ...selectedCaptionForStyling,
              style
            });
          }}
          position={modalPosition}
        />
        </div>
      </GlassVideoWrapper>
    </div>
  );
};

// Helper function to apply text transformation to words
function applyTextTransform(text: string, transform?: string): string {
  if (!transform) return text;
  
  switch (transform) {
    case 'uppercase':
      return text.toUpperCase();
    case 'lowercase':
      return text.toLowerCase();
    case 'capitalize':
      return text.replace(/\b\w/g, l => l.toUpperCase());
    default:
      return text;
  }
}

// Canvas rendering functions (matching CanvasVideoRenderer exactly)
function renderCaptionOnCanvas(
  ctx: CanvasRenderingContext2D,
  caption: any,
  canvasWidth: number,
  canvasHeight: number,
  currentTime: number,
  scaleFactor: number
) {
  // Skip rendering if burn-in subtitles is disabled
  if (caption.style.burnInSubtitles === false) {
    return;
  }
  
  // Calculate position (matching the VideoPanel exactly)
  // x: percentage from left (0-100)
  // y: percentage from top (0-100) - NOT from bottom!
  const x = (canvasWidth * caption.style.position.x) / 100;
  const y = (canvasHeight * caption.style.position.y) / 100;
  
  // Apply z-axis rotation if specified
  if (caption.style.position.z && caption.style.position.z !== 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((caption.style.position.z * Math.PI) / 180);
    ctx.translate(-x, -y);
  }
  
  // Get text to render and apply text transformation
  let text = caption.text;
  if (caption.style.textTransform) {
    switch (caption.style.textTransform) {
      case 'uppercase':
        text = text.toUpperCase();
        break; 
      case 'lowercase':
        text = text.toLowerCase();
        break;
      case 'capitalize':
        text = text.replace(/\b\w/g, (l: string) => l.toUpperCase());
        break;
    }
  }
  let words: any[] = [];
  
  if (caption.words && caption.words.length > 0) {
    words = caption.words;
  }
  
  // Draw text with word-level highlighting
  if (words.length > 0) {
    if (caption.style.renderMode === 'progressive') {
      renderProgressiveTextOnCanvas(ctx, words, caption, currentTime, x, y, scaleFactor);
    } else {
      renderKaraokeTextOnCanvas(ctx, words, caption, currentTime, x, y, scaleFactor);
    }
  } else {
    // Simple text without word-level timing
    renderSimpleTextOnCanvas(ctx, text, caption, x, y, scaleFactor);
  }
  
  // Restore context if rotation was applied
  if (caption.style.position.z && caption.style.position.z !== 0) {
    ctx.restore();
  }
}

function renderSimpleTextOnCanvas(
  ctx: CanvasRenderingContext2D,
  text: string,
  caption: any,
  x: number,
  y: number,
  scaleFactor: number
) {
  // Apply text transformation
  if (caption.style.textTransform) {
    switch (caption.style.textTransform) {
      case 'uppercase':
        text = text.toUpperCase();
        break; 
      case 'lowercase':
        text = text.toLowerCase();
        break;
      case 'capitalize':
        text = text.replace(/\b\w/g, l => l.toUpperCase());
        break;
    }
  }
  const baseFontSize = caption.style?.fontSize || 85;
  const scale = caption.style?.scale || 1;
  const fontSize = baseFontSize * scale;
  console.log('VideoPanel simple text font debug:', {
    baseFontSize,
    scale,
    fontSize,
    scaleFactor,
    captionText: text.substring(0, 20)
  });
  const textColor = parseColor(caption.style?.textColor || '#ffffff', caption.style?.textColorOpacity);
  const backgroundColor = parseColor(caption.style?.backgroundColor || '#80000000', caption.style?.backgroundColorOpacity);
  const strokeColor = parseColor(caption.style?.strokeColor || '#000000', caption.style?.strokeColorOpacity);
  const strokeWidth = caption.style?.strokeWidth || 0;
  
  // Set font with actual font from caption style (matching export system exactly)
  const fontFamily = mapFontName(caption.style?.font || 'Poppins');
  ctx.font = `bold ${fontSize}px ${fontFamily}, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Measure text for background box
  const textMetrics = ctx.measureText(text);
  const textWidth = textMetrics.width;
  const textHeight = fontSize;
  
  // Calculate background box position and size (matching export system exactly)
  const boxX = x - (textWidth / 2) - 12; // 12px padding
  const boxY = y - (textHeight / 2) - 12; // Center-based positioning to match 'middle' baseline
  const boxWidth = textWidth + 24; // 12px padding on each side
  const boxHeight = textHeight + 24; // 12px padding top/bottom
  
  // Draw background box (matching VideoPanel's caption background exactly) - only if not transparent
  if (backgroundColor.a > 0) {
    ctx.fillStyle = `rgba(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b}, ${backgroundColor.a})`;
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
  }
  
  // Clear shadow for stroke (stroke should not have shadow)
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  
  // Draw stroke if specified (must be drawn before fill)
  if (strokeWidth > 0) {
    ctx.strokeStyle = `rgba(${strokeColor.r}, ${strokeColor.g}, ${strokeColor.b}, ${strokeColor.a})`;
    ctx.lineWidth = strokeWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeText(text, x, y);
  }
  
  // Add text shadow for text fill only
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  // Draw text fill
  ctx.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, ${textColor.a})`;
  ctx.fillText(text, x, y);
  
  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

function renderKaraokeTextOnCanvas(
  ctx: CanvasRenderingContext2D,
  words: any[],
  caption: any,
  frameTime: number,
  centerX: number,
  centerY: number,
  scaleFactor: number
) {
  const baseFontSize = caption.style?.fontSize || 85;
  const scale = caption.style?.scale || 1;
  const fontSize = baseFontSize * scale;
  const textColor = parseColor(caption.style?.textColor || '#ffffff', caption.style?.textColorOpacity);
  const highlighterColor = parseColor(caption.style?.highlighterColor || '#ffff00', caption.style?.highlighterColorOpacity);
  const backgroundColor = parseColor(caption.style?.backgroundColor || '#80000000', caption.style?.backgroundColorOpacity);
  const strokeColor = parseColor(caption.style?.strokeColor || '#000000', caption.style?.strokeColorOpacity);
  const strokeWidth = caption.style?.strokeWidth || 0;
  
  // Set font with actual font from caption style (matching VideoPanel exactly)
  const fontFamily = mapFontName(caption.style?.font || 'Poppins');
  ctx.font = `bold ${fontSize}px ${fontFamily}, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle'; // Changed to middle for better centering
  
  // Since we enforce one line per frame and removed width functionality, 
  // we render all words in a single line
  const wordSpacing = 12 * scale; // Scaled uniform spacing between words
  const wordPadding = 4 * scale; // Scaled padding
  
  // Calculate total width for single line
  let totalWidth = 0;
  for (const word of words) {
    const transformedWord = applyTextTransform(word.word, caption.style.textTransform);
    const wordWidth = ctx.measureText(transformedWord).width;
    totalWidth += wordWidth + (wordPadding * 2) + wordSpacing;
  }
  totalWidth -= wordSpacing; // Remove last margin
  
  // Calculate background box for single line caption (adjusted for middle baseline)
  const boxX = centerX - (totalWidth / 2) - 12;
  const boxY = centerY - (fontSize / 2) - 12;
  const boxWidth = totalWidth + 24;
  const boxHeight = fontSize + 24;
  
  // Draw main background box - only if not transparent
  if (backgroundColor.a > 0) {
    ctx.fillStyle = `rgba(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b}, ${backgroundColor.a})`;
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
  }
  
  // Add text shadow for better visibility
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  // Draw words in single line
  let currentX = centerX - (totalWidth / 2) + wordPadding; // Start with padding
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const wordStart = word.start;
    const wordEnd = word.end;
    
    // Determine if this word should be highlighted (matching VideoPanel logic exactly)
    const isHighlighted = frameTime >= wordStart && frameTime <= wordEnd;
    const hasPassedWord = frameTime > wordEnd;
    
    // Apply text transformation and measure word width
    const transformedWord = applyTextTransform(word.word, caption.style.textTransform);
    const wordWidth = ctx.measureText(transformedWord).width;
    const wordBoxWidth = wordWidth + (wordPadding * 2);
    const wordBoxHeight = fontSize + (wordPadding * 2);
    const wordBoxX = currentX - wordPadding;
    const wordBoxY = centerY - (fontSize / 2) - wordPadding;
      
      // Handle emphasis mode vs background highlighting
      if (isHighlighted) {
        if (caption.style.emphasizeMode) {
          // Emphasis mode: increase font size by 5% and use highlighter color as text color
          const emphasizedFontSize = fontSize * 1.05;
          ctx.font = `bold ${emphasizedFontSize}px ${fontFamily}, Arial, sans-serif`;
          ctx.fillStyle = `rgba(${highlighterColor.r}, ${highlighterColor.g}, ${highlighterColor.b}, ${highlighterColor.a})`;
        } else {
          // Background highlighting mode
          ctx.fillStyle = `rgba(${highlighterColor.r}, ${highlighterColor.g}, ${highlighterColor.b}, ${highlighterColor.a})`;
          ctx.fillRect(wordBoxX, wordBoxY, wordBoxWidth, wordBoxHeight);
          ctx.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, ${textColor.a})`;
        }
      } else {
        // Set normal text color - in horizontal karaoke mode, all words should have full opacity
        ctx.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, ${textColor.a})`;
      }
      
    // Clear shadow for stroke
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Draw stroke if specified (must be drawn before fill)
    if (strokeWidth > 0) {
      ctx.strokeStyle = `rgba(${strokeColor.r}, ${strokeColor.g}, ${strokeColor.b}, ${strokeColor.a})`;
      ctx.lineWidth = strokeWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeText(transformedWord, currentX + wordWidth/2, centerY);
    }
    
    // Add shadow for text fill
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Draw the word
    ctx.fillText(transformedWord, currentX + wordWidth/2, centerY);
    
    // Reset font size if it was changed for emphasis
    if (isHighlighted && caption.style.emphasizeMode) {
      ctx.font = `bold ${fontSize}px ${fontFamily}, Arial, sans-serif`;
    }
    
    // Move to next word position with uniform spacing
    currentX += wordWidth + (wordPadding * 2) + wordSpacing;
  }
  
  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

// Font mapping function (matching CanvasVideoRenderer)
function mapFontName(fontName: string): string {
  switch (fontName) {
    case 'Inter':
      return 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    case 'Roboto':
      return 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    case 'Open Sans':
      return '"Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    case 'Source Sans Pro':
      return '"Source Sans Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    case 'Noto Sans':
      return '"Noto Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    case 'SF Pro Display':
      return '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif';
    case 'Segoe UI':
      return '"Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif';
    case 'Ubuntu':
      return 'Ubuntu, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    case 'Montserrat':
      return 'Montserrat, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    case 'Poppins':
      return 'Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    case 'Raleway':
      return 'Raleway, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    case 'Lato':
      return 'Lato, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    case 'Nunito':
      return 'Nunito, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    case 'Quicksand':
      return 'Quicksand, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    case 'Arial':
      return 'Arial, sans-serif';
    case 'Helvetica':
      return 'Helvetica, Arial, sans-serif';
    default:
      return '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'; // Default to system fonts
  }
}

// Progressive text reveal rendering (vertical line-by-line)
function renderProgressiveTextOnCanvas(
  ctx: CanvasRenderingContext2D,
  words: any[],
  caption: any,
  frameTime: number,
  centerX: number,
  centerY: number,
  scaleFactor: number
) {
  const baseFontSize = caption.style?.fontSize || 85;
  const scale = caption.style?.scale || 1;
  const fontSize = baseFontSize * scale;
  const textColor = parseColor(caption.style?.textColor || '#ffffff', caption.style?.textColorOpacity);
  const highlighterColor = parseColor(caption.style?.highlighterColor || '#ffff00', caption.style?.highlighterColorOpacity);
  const backgroundColor = parseColor(caption.style?.backgroundColor || '#80000000', caption.style?.backgroundColorOpacity);
  const strokeColor = parseColor(caption.style?.strokeColor || '#000000', caption.style?.strokeColorOpacity);
  const strokeWidth = caption.style?.strokeWidth || 0;
  
  // Set font with actual font from caption style
  const fontFamily = mapFontName(caption.style?.font || 'Poppins');
  const textAlign = caption.style?.textAlign || 'center';
  ctx.font = `bold ${fontSize}px ${fontFamily}, Arial, sans-serif`;
  ctx.textAlign = textAlign;
  ctx.textBaseline = 'middle';
  
  // Find words that should be visible up to current time
  const visibleWords: any[] = [];
  let currentLineWords: any[] = [];
  
  for (const word of words) {
    if (frameTime >= word.start) {
      visibleWords.push(word);
      currentLineWords.push(word);
    }
  }
  
  if (visibleWords.length === 0) return;
  
  // Group words into lines - each word becomes a new line
  const lines: any[][] = [];
  for (let i = 0; i < visibleWords.length; i++) {
    // Each line contains all words up to current word (cumulative)
    lines.push(visibleWords.slice(0, i + 1));
  }
  
  // Show only the line that corresponds to the currently highlighted word
  const currentWord = words.find(word => frameTime >= word.start && frameTime <= word.end);
  const currentWordIndex = currentWord ? words.indexOf(currentWord) : visibleWords.length - 1;
  const displayLineIndex = Math.min(currentWordIndex, lines.length - 1);
  
  if (displayLineIndex >= 0 && lines[displayLineIndex]) {
    const displayLine = lines[displayLineIndex];
    const lineHeight = fontSize + 8; // Add some padding between lines
    
    // FIXED: First word stays at centerY, subsequent words appear below
    // Don't center the entire line - keep first word fixed at centerY
    const firstWordY = centerY;
    
    // Draw each word in the line vertically
    displayLine.forEach((word: any, wordIndex: number) => {
      // First word (index 0) stays at centerY, others appear below
      const wordY = firstWordY + (wordIndex * lineHeight);
      const isHighlighted = frameTime >= word.start && frameTime <= word.end;
      
      // Apply text transformation and measure word for background
      const transformedWord = applyTextTransform(word.word, caption.style.textTransform);
      const wordWidth = ctx.measureText(transformedWord).width;
      const boxX = centerX - (wordWidth / 2) - 8;
      const boxY = wordY - (fontSize / 2) - 8; // Center-based positioning to match 'middle' baseline
      const boxWidth = wordWidth + 16;
      const boxHeight = fontSize + 16;
      
      // Draw background for each word if not transparent
      if (backgroundColor.a > 0) {
        ctx.fillStyle = `rgba(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b}, ${backgroundColor.a})`;
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
      }
      
      // Handle highlighting
      if (isHighlighted) {
        if (caption.style.emphasizeMode) {
          // Emphasis mode
          const emphasizedFontSize = fontSize * 1.05;
          ctx.font = `bold ${emphasizedFontSize}px ${fontFamily}, Arial, sans-serif`;
          ctx.fillStyle = `rgba(${highlighterColor.r}, ${highlighterColor.g}, ${highlighterColor.b}, ${highlighterColor.a})`;
        } else {
          // Background highlighting
          ctx.fillStyle = `rgba(${highlighterColor.r}, ${highlighterColor.g}, ${highlighterColor.b}, ${highlighterColor.a})`;
          ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
          ctx.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, ${textColor.a})`;
        }
      } else {
        // Normal text color - all revealed words should have full opacity
        ctx.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, ${textColor.a})`;
      }
      
      // Clear shadow for stroke
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      // Draw stroke if specified (must be drawn before fill)
      if (strokeWidth > 0) {
        ctx.strokeStyle = `rgba(${strokeColor.r}, ${strokeColor.g}, ${strokeColor.b}, ${strokeColor.a})`;
        ctx.lineWidth = strokeWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeText(transformedWord, centerX, wordY);
      }
      
      // Add text shadow for fill
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      
      // Draw the word
      ctx.fillText(transformedWord, centerX, wordY);
      
      // Reset font size if changed
      if (isHighlighted && caption.style.emphasizeMode) {
        ctx.font = `bold ${fontSize}px ${fontFamily}, Arial, sans-serif`;
      }
    });
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
}

// Color parsing function (matching CanvasVideoRenderer)
function parseColor(colorStr: string, opacity?: number): { r: number, g: number, b: number, a: number } {
  if (colorStr === 'transparent') {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  
  let baseAlpha = 1;
  let r = 255, g = 255, b = 255;
  
  // Handle hex colors
  if (colorStr.startsWith('#')) {
    const hex = colorStr.replace('#', '');
    
    if (hex.length === 8) {
      // 8-character hex with alpha
      baseAlpha = parseInt(hex.substring(0, 2), 16) / 255;
      r = parseInt(hex.substring(2, 4), 16);
      g = parseInt(hex.substring(4, 6), 16);
      b = parseInt(hex.substring(6, 8), 16);
    } else if (hex.length === 6) {
      // 6-character hex without alpha
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
      baseAlpha = 1;
    }
  }
  
  // Apply opacity if provided (convert percentage to decimal)
  const finalAlpha = opacity !== undefined ? (baseAlpha * (opacity / 100)) : baseAlpha;
  
  return { r, g, b, a: finalAlpha };
}

// Expose rendering functions globally for PresetPreview
if (typeof window !== 'undefined') {
  (window as any).renderCaptionOnCanvas = renderCaptionOnCanvas;
  (window as any).parseColor = parseColor;
  (window as any).mapFontName = mapFontName;
  (window as any).renderSimpleTextOnCanvas = renderSimpleTextOnCanvas;
  (window as any).renderKaraokeTextOnCanvas = renderKaraokeTextOnCanvas;
  (window as any).renderProgressiveTextOnCanvas = renderProgressiveTextOnCanvas;
}

export default VideoPanel;