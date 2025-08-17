import React, { useRef, useEffect, useState, useCallback } from 'react';
import { VideoFile, CaptionSegment } from '../../types';
import { useTheme } from '../contexts/ThemeContext';
import { FiEye } from 'react-icons/fi';
import { Video } from 'lucide-react';
import CaptionStyleModal from './CaptionStyleModal';

interface VideoPanelProps {
  videoFile: VideoFile | null;
  captions: CaptionSegment[];
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  onTimeSeek?: (time: number) => void;
  onVideoSelect: () => void;
  onVideoDropped?: (filePath: string) => void;
  selectedSegmentId?: string | null;
  onCaptionUpdate?: (segmentId: string, updates: Partial<CaptionSegment>) => void;
  onPlayPause?: () => void;
  isPlaying?: boolean;
  onSegmentSelect?: (segmentId: string) => void;
  replacementAudioPath?: string | null;
  isAudioPreviewEnabled?: boolean;
}

const VideoPanel: React.FC<VideoPanelProps> = ({
  videoFile,
  captions,
  currentTime,
  onTimeUpdate,
  onTimeSeek,
  onVideoSelect,
  onVideoDropped,
  selectedSegmentId,
  onCaptionUpdate,
  onPlayPause,
  isPlaying,
  onSegmentSelect,
  replacementAudioPath,
  isAudioPreviewEnabled = true,
}) => {
  const { theme } = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const replacementAudioRef = useRef<HTMLAudioElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isTimelineDragging, setIsTimelineDragging] = useState(false);
  const [showCaptionStyleModal, setShowCaptionStyleModal] = useState(false);
  const [selectedCaptionForStyling, setSelectedCaptionForStyling] = useState<CaptionSegment | null>(null);
  const [modalPosition, setModalPosition] = useState({ x: 100, y: 100 });
  const [scaleFactor, setScaleFactor] = useState(1);
  const lastUpdateTimeRef = useRef<number>(0);
  const [isHoveringCaption, setIsHoveringCaption] = useState(false);
  const tempDragPositionRef = useRef<{ x: number; y: number } | null>(null);

  // Helper function to check if mouse click is on rendered caption text
  const isClickOnCaption = (mouseX: number, mouseY: number, caption: CaptionSegment): boolean => {
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
      textToMeasure = caption.words.map(w => w.word).join(' ');
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
    if (!onCaptionUpdate) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    
    // Find captions that's currently visible
    const currentCaptions = captions.filter(
      caption => currentTime >= caption.startTime && currentTime <= caption.endTime
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
      // Select the caption if not already selected
      if (selectedSegmentId !== clickedCaption.id && onSegmentSelect) {
        onSegmentSelect(clickedCaption.id);
      }
      
      setIsDragging(true);
      setDragStart({ x: mouseX, y: mouseY });
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
    
    // Find captions that's currently visible
    const currentCaptions = captions.filter(
      caption => currentTime >= caption.startTime && currentTime <= caption.endTime
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
    
    // Find caption at current time
    const currentCaption = captions.find(
      caption => currentTime >= caption.startTime && currentTime <= caption.endTime
    );
    
    if (currentCaption) {
      setSelectedCaptionForStyling(currentCaption);
      setModalPosition({ x: e.clientX, y: e.clientY });
      setShowCaptionStyleModal(true);
    }
  };


  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  // Global mouse move handler for dragging - real-time visual feedback
  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !selectedSegmentId) return;
    
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
  }, [isDragging, selectedSegmentId]);

  // Global mouse up handler
  const handleGlobalMouseUp = useCallback(() => {
    // Save the temporary position to actual caption data if we have one
    if (tempDragPositionRef.current && selectedSegmentId && onCaptionUpdate) {
      const currentCaption = captions.find(c => c.id === selectedSegmentId);
      if (currentCaption) {
        onCaptionUpdate(selectedSegmentId, {
          style: {
            ...currentCaption.style,
            position: {
              ...currentCaption.style.position,
              x: tempDragPositionRef.current.x,
              y: tempDragPositionRef.current.y
            }
          }
        });
      }
    }
    
    // Clear temp position and stop dragging
    tempDragPositionRef.current = null;
    setIsDragging(false);
  }, [selectedSegmentId, onCaptionUpdate, captions]);

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
        const currentTimeMs = video.currentTime * 1000;
        onTimeUpdate(currentTimeMs);
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
  }, [onTimeUpdate]);

  // Sync video time when currentTime prop changes (for seeking)
  useEffect(() => {
    const video = videoRef.current;
    if (video && Math.abs(video.currentTime * 1000 - currentTime) > 100) {
      // Only seek if the difference is significant (> 100ms) to avoid loops
      video.currentTime = currentTime / 1000;
    }
  }, [currentTime]);

  // Update canvas size when video loads and calculate scale factor
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video && canvas) {
      const handleLoadedMetadata = () => {
        // Set canvas size to match video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        setCanvasSize({ width: video.videoWidth, height: video.videoHeight });
        
        // Calculate and cache scale factor
        const canvasRect = canvas.getBoundingClientRect();
        const scaleX = canvasRect.width / canvas.width;
        const scaleY = canvasRect.height / canvas.height;
        const newScaleFactor = Math.min(scaleX, scaleY);
        setScaleFactor(newScaleFactor);
      };
      
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    }
    return undefined;
  }, [videoFile]);

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

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get all current captions (for potential overlapping)
    const currentCaptions = captions.filter(
      caption => currentTime >= caption.startTime && currentTime <= caption.endTime
    );

    if (currentCaptions.length === 0) return;

    // Render all captions with temp position override for the selected one
    currentCaptions.forEach(caption => {
      let renderCaption = caption;
      
      // If this is the selected caption being dragged, use temp position
      if (caption.id === selectedSegmentId && tempDragPositionRef.current) {
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
      
      renderCaptionOnCanvas(ctx, renderCaption, canvas.width, canvas.height, currentTime, scaleFactor);
    });
  }, [captions, currentTime, selectedSegmentId, scaleFactor]);

  // Render captions on canvas (same logic as export)
  const renderCaptionsOnCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get all current captions (for potential overlapping)
    const currentCaptions = captions.filter(
      caption => currentTime >= caption.startTime && currentTime <= caption.endTime
    );

    if (currentCaptions.length === 0) return;

    // Render all captions using cached scale factor
    currentCaptions.forEach(caption => {
      renderCaptionOnCanvas(ctx, caption, canvas.width, canvas.height, currentTime, scaleFactor);
    });
  }, [captions, currentTime, selectedSegmentId, scaleFactor]);

  // Force re-render when caption styles change - optimized
  useEffect(() => {
    // Only re-render if not currently dragging to avoid constant updates during drag
    if (!isDragging) {
      renderCaptionsOnCanvas();
    }
  }, [captions.map(c => JSON.stringify(c.style)).join('|'), isDragging]); // Trigger when any style property changes

  // Re-render when captions or time changes - but not during dragging
  useEffect(() => {
    if (!isDragging) {
      renderCaptionsOnCanvas();
    }
  }, [renderCaptionsOnCanvas, isDragging]);

  // Handle play/pause functionality
  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(console.error);
    } else {
      video.pause();
    }
  }, []);

  // Track video play state and sync with parent
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      let playbackInterval: NodeJS.Timeout | null = null;
      
      const handlePlay = () => {
        // Update parent's isPlaying state
        if ((window as any).setVideoPlaying) {
          (window as any).setVideoPlaying(true);
        }
        
        // Start frequent time updates during playback
        playbackInterval = setInterval(() => {
          if (!video.paused && !video.ended) {
            const currentTimeMs = video.currentTime * 1000;
            onTimeUpdate(currentTimeMs);
            renderCaptionsOnCanvas();
          } else {
            if (playbackInterval) {
              clearInterval(playbackInterval);
              playbackInterval = null;
            }
          }
        }, 100); // Update every 100ms for smooth timeline
      };
      
      const handlePause = () => {
        // Update parent's isPlaying state
        if ((window as any).setVideoPlaying) {
          (window as any).setVideoPlaying(false);
        }
        
        // Clear the playback interval
        if (playbackInterval) {
          clearInterval(playbackInterval);
          playbackInterval = null;
        }
      };

      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      video.addEventListener('ended', handlePause);

      return () => {
        if (playbackInterval) {
          clearInterval(playbackInterval);
        }
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('ended', handlePause);
      };
    }
    return undefined;
  }, [onTimeUpdate, renderCaptionsOnCanvas]);

  // Expose play/pause to parent component
  useEffect(() => {
    if (onPlayPause) {
      // This is a bit of a hack, but we need to pass the video control function up
      (window as any).videoPlayPause = handlePlayPause;
    }
  }, [handlePlayPause, onPlayPause]);

  // Ensure video audio is always enabled when no replacement audio
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!replacementAudioPath) {
      // No replacement audio - ensure video audio is on
      video.volume = 1;
      console.log('No replacement audio - video volume set to 1');
    }
  }, [replacementAudioPath]);

  // Handle replacement audio setup (only when audio path changes)
  useEffect(() => {
    const video = videoRef.current;
    const replacementAudio = replacementAudioRef.current;

    if (!replacementAudioPath || !replacementAudio || !video) return;

    // Set up replacement audio
    replacementAudio.src = `file://${replacementAudioPath}`;
    replacementAudio.preload = 'auto';
    
    // Load the audio and set initial volume states
    replacementAudio.load();
    
    // Set initial volumes based on current state
    if (isAudioPreviewEnabled) {
      video.volume = 0;
      replacementAudio.volume = 1;
    } else {
      video.volume = 1;
      replacementAudio.volume = 0;
    }

    console.log('Audio setup:', {
      replacementAudioPath,
      isAudioPreviewEnabled,
      videoVolume: video.volume,
      audioVolume: replacementAudio.volume
    });

  }, [replacementAudioPath, isAudioPreviewEnabled]);

  // Handle video-audio synchronization with current state access
  useEffect(() => {
    const video = videoRef.current;
    const replacementAudio = replacementAudioRef.current;

    if (!video) return;

    let syncTimeoutId: NodeJS.Timeout | null = null;

    // Debounced sync to avoid frequent corrections
    const syncAudio = () => {
      if (!replacementAudio || !replacementAudioPath || !isAudioPreviewEnabled) return;
      
      if (syncTimeoutId) return; // Skip if already syncing
      
      syncTimeoutId = setTimeout(() => {
        if (replacementAudio && Math.abs(replacementAudio.currentTime - video.currentTime) > 0.2) {
          replacementAudio.currentTime = video.currentTime;
        }
        syncTimeoutId = null;
      }, 100);
    };

    const handleVideoPlay = () => {
      console.log('Video play event:', { isAudioPreviewEnabled, replacementAudioPath });
      if (replacementAudio && isAudioPreviewEnabled && replacementAudioPath) {
        replacementAudio.currentTime = video.currentTime;
        replacementAudio.play().catch((error) => {
          console.error('Failed to play replacement audio on video play:', error);
        });
      }
    };

    const handleVideoPause = () => {
      if (replacementAudio) {
        replacementAudio.pause();
      }
    };

    const handleVideoSeeked = () => {
      if (replacementAudio && replacementAudioPath) {
        replacementAudio.currentTime = video.currentTime;
      }
    };

    // Add event listeners
    video.addEventListener('play', handleVideoPlay);
    video.addEventListener('pause', handleVideoPause);
    video.addEventListener('seeked', handleVideoSeeked);
    video.addEventListener('timeupdate', syncAudio);

    return () => {
      video.removeEventListener('play', handleVideoPlay);
      video.removeEventListener('pause', handleVideoPause);
      video.removeEventListener('seeked', handleVideoSeeked);
      video.removeEventListener('timeupdate', syncAudio);
      if (syncTimeoutId) {
        clearTimeout(syncTimeoutId);
      }
    };
  }, [isAudioPreviewEnabled, replacementAudioPath]); // Include dependencies for current state access

  // Handle audio preview toggle - simplified for debugging
  useEffect(() => {
    const video = videoRef.current;
    const replacementAudio = replacementAudioRef.current;

    if (!video || !replacementAudio || !replacementAudioPath) return;

    console.log('Audio toggle:', {
      isAudioPreviewEnabled,
      videoPaused: video.paused,
      audioReadyState: replacementAudio.readyState
    });

    if (isAudioPreviewEnabled) {
      // Use replacement audio
      video.volume = 0;
      replacementAudio.volume = 1;
      
      // Sync and play if video is playing
      if (!video.paused) {
        replacementAudio.currentTime = video.currentTime;
        replacementAudio.play().catch((error) => {
          console.error('Failed to play replacement audio:', error);
        });
      }
    } else {
      // Use original video audio
      video.volume = 1;
      replacementAudio.volume = 0;
      replacementAudio.pause();
    }
  }, [isAudioPreviewEnabled, replacementAudioPath]);

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

  if (!videoFile) {
    return (
      <div 
        data-drop-zone="video"
        className="video-drop-zone"
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDragOver ? theme.colors.primarySubtle : theme.colors.backgroundSecondary,
          margin: '20px',
          borderRadius: theme.radius.lg,
          border: isDragOver ? `2px dashed ${theme.colors.primary}` : `2px dashed ${theme.colors.primary}40`,
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isDragOver ? theme.shadows.lg : theme.shadows.sm,
          position: 'relative',
          overflow: 'hidden'
        }} 
        onClick={onVideoSelect}
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
          background: `linear-gradient(135deg, ${theme.colors.primarySubtle}40, ${theme.colors.backgroundSecondary})`,
          opacity: 0.6
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
            Drop a video file here or click to select
          </div>
          
          <div style={{ 
            fontSize: '15px', 
            color: theme.colors.textSecondary,
            marginBottom: '20px'
          }}>
            Supports MP4, MOV, AVI
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
    );
  }

  return (
    <div 
      data-video-preview
      style={{ 
        flex: 1, 
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.colors.background,
        padding: '1px',
        border: `1px solid ${theme.colors.border}`,
        borderRadius: '2px'
      }}
    >


      {/* Video Container with Canvas Overlay */}
      <div style={{ 
        flex: 1,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 0,
        maxHeight: 'calc(100vh - 300px)', // Constrain to viewport height minus space for UI
        overflow: 'hidden',
        padding: '10px'
      }}>
        <video
          ref={videoRef}
          src={`file://${videoFile.path}`}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            display: 'block'
          }}
          onTimeUpdate={(e) => {
            const video = e.currentTarget;
            const currentTimeMs = video.currentTime * 1000;
            onTimeUpdate(currentTimeMs);
            renderCaptionsOnCanvas();
          }}
          onSeeking={() => {
            // Force canvas re-render on seeking
            setTimeout(() => renderCaptionsOnCanvas(), 50);
          }}
          onSeeked={() => {
            // Force canvas re-render when seek is complete
            setTimeout(() => renderCaptionsOnCanvas(), 50);
          }}
        />

        {/* Replacement Audio Element */}
        {replacementAudioPath && (
          <audio
            ref={replacementAudioRef}
            preload="auto"
            style={{ display: 'none' }}
          />
        )}
        
        {/* Canvas Overlay - Renders captions exactly like export */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            pointerEvents: captions.some(c => currentTime >= c.startTime && currentTime <= c.endTime) ? 'auto' : 'none',
            cursor: isDragging ? 'grabbing' : (isHoveringCaption ? 'grab' : 'default'),
            zIndex: 10
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
          onUpdate={(updates) => {
            if (onCaptionUpdate && selectedCaptionForStyling) {
              onCaptionUpdate(selectedCaptionForStyling.id, updates);
            }
          }}
          position={modalPosition}
        />
      </div>


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
  caption: CaptionSegment,
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
        text = text.replace(/\b\w/g, l => l.toUpperCase());
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
  caption: CaptionSegment,
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
  const textColor = parseColor(caption.style?.textColor || '#ffffff');
  const backgroundColor = parseColor(caption.style?.backgroundColor || '#80000000');
  const strokeColor = parseColor(caption.style?.strokeColor || '#000000');
  const strokeWidth = caption.style?.strokeWidth || 0;
  
  // Set font with actual font from caption style (matching VideoPanel exactly)
  const fontFamily = mapFontName(caption.style?.font || 'Segoe UI');
  ctx.font = `bold ${fontSize}px ${fontFamily}, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  
  // Measure text for background box
  const textMetrics = ctx.measureText(text);
  const textWidth = textMetrics.width;
  const textHeight = fontSize;
  
  // Calculate background box position and size (matching VideoPanel padding exactly)
  const boxX = x - (textWidth / 2) - 12; // 12px padding from VideoPanel
  const boxY = y - textHeight - 12;
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

function wrapTextToWidth(
  ctx: CanvasRenderingContext2D,
  words: any[],
  maxWidth: number,
  wordPadding: number,
  wordSpacing: number
): any[][] {
  const lines: any[][] = [];
  let currentLine: any[] = [];
  let currentLineWidth = 0;
  
  for (const word of words) {
    const wordWidth = ctx.measureText(word.word).width;
    const wordFullWidth = wordWidth + (wordPadding * 2) + wordSpacing;
    
    // Check if adding this word would exceed the max width
    if (currentLine.length > 0 && currentLineWidth + wordFullWidth > maxWidth) {
      // Start new line
      lines.push(currentLine);
      currentLine = [word];
      currentLineWidth = wordFullWidth;
    } else {
      // Add to current line
      currentLine.push(word);
      currentLineWidth += wordFullWidth;
    }
  }
  
  // Add the last line if it has words
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }
  
  return lines;
}

function renderKaraokeTextOnCanvas(
  ctx: CanvasRenderingContext2D,
  words: any[],
  caption: CaptionSegment,
  frameTime: number,
  centerX: number,
  centerY: number,
  scaleFactor: number
) {
  const baseFontSize = caption.style?.fontSize || 85;
  const scale = caption.style?.scale || 1;
  const fontSize = baseFontSize * scale;
  const textColor = parseColor(caption.style?.textColor || '#ffffff');
  const highlighterColor = parseColor(caption.style?.highlighterColor || '#ffff00');
  const backgroundColor = parseColor(caption.style?.backgroundColor || '#80000000');
  const strokeColor = parseColor(caption.style?.strokeColor || '#000000');
  const strokeWidth = caption.style?.strokeWidth || 0;
  
  // Set font with actual font from caption style (matching VideoPanel exactly)
  const fontFamily = mapFontName(caption.style?.font || 'Segoe UI');
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
  caption: CaptionSegment,
  frameTime: number,
  centerX: number,
  centerY: number,
  scaleFactor: number
) {
  const baseFontSize = caption.style?.fontSize || 85;
  const scale = caption.style?.scale || 1;
  const fontSize = baseFontSize * scale;
  const textColor = parseColor(caption.style?.textColor || '#ffffff');
  const highlighterColor = parseColor(caption.style?.highlighterColor || '#ffff00');
  const backgroundColor = parseColor(caption.style?.backgroundColor || '#80000000');
  const strokeColor = parseColor(caption.style?.strokeColor || '#000000');
  const strokeWidth = caption.style?.strokeWidth || 0;
  
  // Set font with actual font from caption style
  const fontFamily = mapFontName(caption.style?.font || 'Segoe UI');
  const textAlign = caption.style?.textAlign || 'center';
  ctx.font = `bold ${fontSize}px ${fontFamily}, Arial, sans-serif`;
  ctx.textAlign = textAlign;
  ctx.textBaseline = 'bottom';
  
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
    displayLine.forEach((word, wordIndex) => {
      // First word (index 0) stays at centerY, others appear below
      const wordY = firstWordY + (wordIndex * lineHeight);
      const isHighlighted = frameTime >= word.start && frameTime <= word.end;
      
      // Apply text transformation and measure word for background
      const transformedWord = applyTextTransform(word.word, caption.style.textTransform);
      const wordWidth = ctx.measureText(transformedWord).width;
      const boxX = centerX - (wordWidth / 2) - 8;
      const boxY = wordY - fontSize - 8;
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
function parseColor(colorStr: string): { r: number, g: number, b: number, a: number } {
  if (colorStr === 'transparent') {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  
  // Handle hex colors
  if (colorStr.startsWith('#')) {
    const hex = colorStr.replace('#', '');
    
    if (hex.length === 8) {
      // 8-character hex with alpha
      const alpha = parseInt(hex.substring(0, 2), 16) / 255;
      const r = parseInt(hex.substring(2, 4), 16);
      const g = parseInt(hex.substring(4, 6), 16);
      const b = parseInt(hex.substring(6, 8), 16);
      return { r, g, b, a: alpha };
    } else if (hex.length === 6) {
      // 6-character hex without alpha
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return { r, g, b, a: 1 };
    }
  }
  
  // Default to white
  return { r: 255, g: 255, b: 255, a: 1 };
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