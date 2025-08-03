import React, { useRef, useEffect, useState, useCallback } from 'react';
import { VideoFile, CaptionSegment } from '../../types';
import { useTheme } from '../contexts/ThemeContext';
import { FiEye } from 'react-icons/fi';

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
}) => {
  const { theme } = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [isTimelineDragging, setIsTimelineDragging] = useState(false);

  // Mouse interaction handlers for text box manipulation
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedSegmentId || !onCaptionUpdate) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    
    // Check if click is on the current caption
    const currentCaption = captions.find(c => c.id === selectedSegmentId);
    if (currentCaption && currentTime >= currentCaption.startTime && currentTime <= currentCaption.endTime) {
      setIsDragging(true);
      setDragStart({ x: mouseX, y: mouseY });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedSegmentId || !onCaptionUpdate) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    
    const deltaX = mouseX - dragStart.x;
    const deltaY = mouseY - dragStart.y;
    
    // Convert to percentage
    const deltaXPercent = (deltaX / canvas.width) * 100;
    const deltaYPercent = (deltaY / canvas.height) * 100;
    
    const currentCaption = captions.find(c => c.id === selectedSegmentId);
    if (currentCaption) {
      const newX = Math.max(0, Math.min(100, currentCaption.style.position.x + deltaXPercent));
      const newY = Math.max(0, Math.min(100, currentCaption.style.position.y + deltaYPercent));
      
      onCaptionUpdate(selectedSegmentId, {
        style: {
          ...currentCaption.style,
          position: {
            ...currentCaption.style.position,
            x: newX,
            y: newY
          }
        }
      });
      
      setDragStart({ x: mouseX, y: mouseY });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

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

  // Update canvas size when video loads
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video && canvas) {
      const handleLoadedMetadata = () => {
        // Set canvas size to match video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        setCanvasSize({ width: video.videoWidth, height: video.videoHeight });
      };
      
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    }
    return undefined;
  }, [videoFile]);

  // Render captions on canvas (same logic as export)
  const renderCaptionsOnCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get current caption
    const currentCaption = captions.find(
      caption => currentTime >= caption.startTime && currentTime <= caption.endTime
    );

    if (!currentCaption) return;

    // Calculate scale factor for font size
    // The canvas is scaled down by CSS, so we need to scale the font size accordingly
    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = canvasRect.width / canvas.width;
    const scaleY = canvasRect.height / canvas.height;
    const scaleFactor = Math.min(scaleX, scaleY); // Use the smaller scale to maintain aspect ratio

    // Render caption using the same logic as CanvasVideoRenderer
    renderCaptionOnCanvas(ctx, currentCaption, canvas.width, canvas.height, currentTime, scaleFactor);
  }, [captions, currentTime]);

  // Re-render when captions or time changes
  useEffect(() => {
    renderCaptionsOnCanvas();
  }, [renderCaptionsOnCanvas]);

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
          backgroundColor: isDragOver ? theme.colors.surface : theme.colors.background,
          margin: '20px',
          borderRadius: '8px',
          border: isDragOver ? `2px dashed ${theme.colors.primary}` : `2px dashed ${theme.colors.border}`,
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }} 
        onClick={onVideoSelect}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📹</div>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>
            Drop a video file here or click to select
          </div>
          <div style={{ fontSize: '14px', color: theme.colors.textSecondary }}>
            Supports MP4, MOV, AVI
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
        margin: '20px'
      }}
    >


      {/* Video Container with Canvas Overlay */}
      <div style={{ 
        flex: 1,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <video
          ref={videoRef}
          src={`file://${videoFile.path}`}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain'
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
            pointerEvents: 'none'
          }}
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
  
  // Apply rotation if z rotation is specified
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
  const baseFontSize = caption.style?.fontSize || 32;
  const scale = caption.style?.scale || 1;
  const fontSize = baseFontSize * scale;
  const textColor = parseColor(caption.style?.textColor || '#ffffff');
  const backgroundColor = parseColor(caption.style?.backgroundColor || '#80000000');
  const strokeColor = parseColor(caption.style?.strokeColor || '#000000');
  const strokeWidth = caption.style?.strokeWidth || 0;
  
  // Set font with actual font from caption style (matching VideoPanel exactly)
  const fontFamily = mapFontName(caption.style?.font || 'SF Pro Display Semibold');
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
  const baseFontSize = caption.style?.fontSize || 32;
  const scale = caption.style?.scale || 1;
  const fontSize = baseFontSize * scale;
  const textColor = parseColor(caption.style?.textColor || '#ffffff');
  const highlighterColor = parseColor(caption.style?.highlighterColor || '#ffff00');
  const backgroundColor = parseColor(caption.style?.backgroundColor || '#80000000');
  const strokeColor = parseColor(caption.style?.strokeColor || '#000000');
  const strokeWidth = caption.style?.strokeWidth || 0;
  
  // Set font with actual font from caption style (matching VideoPanel exactly)
  const fontFamily = mapFontName(caption.style?.font || 'SF Pro Display Semibold');
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
        // Set normal text color
        if (hasPassedWord) {
          // Passed word - slightly transparent
          ctx.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, 0.8)`;
        } else {
          // Normal word - original text color
          ctx.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, ${textColor.a})`;
        }
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
  // Use the actual font name from the caption style
  // For Canvas rendering, we'll use system fonts that are available
  switch (fontName) {
    case 'SF Pro Display Semibold':
    case 'SF Pro Display':
      return 'Arial'; // Fallback to Arial for consistency
    case 'Arial':
    case 'Helvetica':
      return 'Arial';
    case 'Times New Roman':
      return 'Times New Roman';
    case 'Georgia':
      return 'Georgia';
    case 'Montserrat':
      return 'Montserrat, Arial';
    default:
      return 'Arial'; // Default fallback
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
  const baseFontSize = caption.style?.fontSize || 32;
  const scale = caption.style?.scale || 1;
  const fontSize = baseFontSize * scale;
  const textColor = parseColor(caption.style?.textColor || '#ffffff');
  const highlighterColor = parseColor(caption.style?.highlighterColor || '#ffff00');
  const backgroundColor = parseColor(caption.style?.backgroundColor || '#80000000');
  const strokeColor = parseColor(caption.style?.strokeColor || '#000000');
  const strokeWidth = caption.style?.strokeWidth || 0;
  
  // Set font with actual font from caption style
  const fontFamily = mapFontName(caption.style?.font || 'SF Pro Display Semibold');
  ctx.font = `bold ${fontSize}px ${fontFamily}, Arial, sans-serif`;
  ctx.textAlign = 'center';
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
    
    // Calculate vertical position for the line
    const lineY = centerY - ((displayLine.length - 1) * lineHeight) / 2;
    
    // Draw each word in the line vertically
    displayLine.forEach((word, wordIndex) => {
      const wordY = lineY + (wordIndex * lineHeight);
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

export default VideoPanel;