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
  onSegmentSelect?: (segmentId: string) => void;
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
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextMenuSegmentId, setContextMenuSegmentId] = useState<string | null>(null);

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
    
    // Find any caption that's currently visible (not just selected)
    const currentCaptions = captions.filter(
      caption => currentTime >= caption.startTime && currentTime <= caption.endTime
    );
    
    if (currentCaptions.length > 0) {
      // If no segment is selected, select the first visible one
      let targetCaption = selectedSegmentId 
        ? currentCaptions.find(c => c.id === selectedSegmentId)
        : currentCaptions[0];
      
      // If selected segment is not visible, use the first visible one
      if (!targetCaption && currentCaptions.length > 0) {
        targetCaption = currentCaptions[0];
      }
      
      if (targetCaption) {
        // Select the caption if not already selected
        if (selectedSegmentId !== targetCaption.id && onSegmentSelect) {
          onSegmentSelect(targetCaption.id);
        }
        
        setIsDragging(true);
        setDragStart({ x: mouseX, y: mouseY });
        e.preventDefault();
        e.stopPropagation();
      }
    }
  };

  // Right-click context menu handler
  const handleCanvasRightClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    // Find caption at current time
    const currentCaption = captions.find(
      caption => currentTime >= caption.startTime && currentTime <= caption.endTime
    );
    
    if (currentCaption) {
      setContextMenuPosition({ x: e.clientX, y: e.clientY });
      setContextMenuSegmentId(currentCaption.id);
      setShowContextMenu(true);
    }
  };


  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  // Global mouse move handler for dragging
  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !selectedSegmentId || !onCaptionUpdate) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    
    // Calculate mouse position relative to canvas
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert to percentage of canvas dimensions
    const newXPercent = Math.max(0, Math.min(100, (mouseX / rect.width) * 100));
    const newYPercent = Math.max(0, Math.min(100, (mouseY / rect.height) * 100));
    
    const currentCaption = captions.find(c => c.id === selectedSegmentId);
    if (currentCaption) {
      onCaptionUpdate(selectedSegmentId, {
        style: {
          ...currentCaption.style,
          position: {
            ...currentCaption.style.position,
            x: newXPercent,
            y: newYPercent
          }
        }
      });
    }
  }, [isDragging, selectedSegmentId, onCaptionUpdate, captions]);

  // Global mouse up handler
  const handleGlobalMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

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

  // Close context menu when clicking elsewhere or pressing ESC
  useEffect(() => {
    const handleClickOutside = () => {
      setShowContextMenu(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowContextMenu(false);
      }
    };

    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showContextMenu]);

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

    // Get all current captions (for potential overlapping)
    const currentCaptions = captions.filter(
      caption => currentTime >= caption.startTime && currentTime <= caption.endTime
    );

    if (currentCaptions.length === 0) return;

    // Calculate scale factor for font size
    // The canvas is scaled down by CSS, so we need to scale the font size accordingly
    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = canvasRect.width / canvas.width;
    const scaleY = canvasRect.height / canvas.height;
    const scaleFactor = Math.min(scaleX, scaleY); // Use the smaller scale to maintain aspect ratio

    // Render all captions
    currentCaptions.forEach(caption => {
      renderCaptionOnCanvas(ctx, caption, canvas.width, canvas.height, currentTime, scaleFactor);
    });
  }, [captions, currentTime, selectedSegmentId]);

  // Force re-render when caption styles change
  useEffect(() => {
    // Check if fonts are loaded and force a re-render
    const checkFontsAndRender = async () => {
      // Wait for fonts to be available
      if ('fonts' in document) {
        try {
          await document.fonts.ready;
        } catch (e) {
          console.log('Font loading check failed, continuing anyway');
        }
      }
      
      // Add a small delay to ensure font changes are applied
      setTimeout(() => {
        renderCaptionsOnCanvas();
      }, 100);
    };
    
    checkFontsAndRender();
  }, [captions.map(c => JSON.stringify(c.style)).join('|')]); // Trigger when any style property changes

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
        minHeight: 0
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
            pointerEvents: captions.some(c => currentTime >= c.startTime && currentTime <= c.endTime) ? 'auto' : 'none',
            cursor: isDragging ? 'grabbing' : (captions.some(c => currentTime >= c.startTime && currentTime <= c.endTime) ? 'grab' : 'default'),
            zIndex: 10
          }}
          onMouseDown={handleCanvasMouseDown}
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


        {/* Enhanced Context Menu for Caption Styling */}
        {showContextMenu && contextMenuSegmentId && (() => {
          const currentCaption = captions.find(c => c.id === contextMenuSegmentId);
          if (!currentCaption) return null;

          const updateCaptionStyle = (updates: Partial<typeof currentCaption.style>) => {
            if (onCaptionUpdate && contextMenuSegmentId) {
              onCaptionUpdate(contextMenuSegmentId, {
                style: { ...currentCaption.style, ...updates }
              });
            }
          };

          // Smart positioning to avoid overflow
          const menuWidth = 320;
          const menuHeight = 500; // Approximate height
          const windowWidth = window.innerWidth;
          const windowHeight = window.innerHeight;
          
          let left = contextMenuPosition.x;
          let top = contextMenuPosition.y;
          
          // Adjust horizontal position if menu would overflow right edge
          if (left + menuWidth > windowWidth) {
            left = contextMenuPosition.x - menuWidth;
          }
          
          // Adjust vertical position if menu would overflow bottom edge
          if (top + menuHeight > windowHeight) {
            top = contextMenuPosition.y - menuHeight;
          }
          
          // Ensure menu doesn't go above top edge
          if (top < 10) {
            top = 10;
          }
          
          // Ensure menu doesn't go beyond left edge
          if (left < 10) {
            left = 10;
          }

          return (
            <div
              style={{
                position: 'fixed',
                left: `${left}px`,
                top: `${top}px`,
                backgroundColor: '#2a2a2a',
                border: '1px solid #444',
                borderRadius: '6px',
                padding: '12px',
                minWidth: '280px',
                maxWidth: '320px',
                maxHeight: '80vh',
                overflowY: 'auto',
                zIndex: 10000,
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                fontSize: '13px'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ marginBottom: '12px', color: '#ccc', fontSize: '14px', fontWeight: 'bold' }}>
                Caption Settings
              </div>

              {/* Z-Axis Rotation Slider */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ color: '#fff', fontSize: '12px' }}>Z-Axis Rotation</label>
                  <span style={{ color: '#aaa', fontSize: '11px' }}>{currentCaption.style.position.z || 0}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={currentCaption.style.position.z || 0}
                  onChange={(e) => {
                    updateCaptionStyle({
                      position: { ...currentCaption.style.position, z: parseInt(e.target.value) }
                    });
                  }}
                  style={{
                    width: '100%',
                    height: '4px',
                    background: '#444',
                    outline: 'none',
                    borderRadius: '2px'
                  }}
                />
              </div>

              {/* Render Mode */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#fff', fontSize: '12px', display: 'block', marginBottom: '8px' }}>Render Mode</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['horizontal', 'progressive'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => updateCaptionStyle({ renderMode: mode as 'horizontal' | 'progressive' })}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        backgroundColor: currentCaption.style.renderMode === mode ? '#0066cc' : '#404040',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        textTransform: 'capitalize'
                      }}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Alignment (only for progressive mode) */}
              {currentCaption.style.renderMode === 'progressive' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ color: '#fff', fontSize: '12px', display: 'block', marginBottom: '8px' }}>Text Alignment</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {['left', 'center', 'right'].map(align => (
                      <button
                        key={align}
                        onClick={() => updateCaptionStyle({ textAlign: align as 'left' | 'center' | 'right' })}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          backgroundColor: currentCaption.style.textAlign === align ? '#0066cc' : '#404040',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          textTransform: 'capitalize'
                        }}
                      >
                        {align}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Font Family */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#fff', fontSize: '12px', display: 'block', marginBottom: '8px' }}>Font Family</label>
                <select
                  value={currentCaption.style.font}
                  onChange={(e) => updateCaptionStyle({ font: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    backgroundColor: '#404040',
                    color: '#fff',
                    border: '1px solid #555',
                    borderRadius: '4px',
                    fontSize: '11px'
                  }}
                >
                  <option value="Segoe UI">Segoe UI (Microsoft System)</option>
                  <option value="Inter">Inter (Modern & Readable)</option>
                  <option value="Roboto">Roboto (Google System)</option>
                  <option value="Open Sans">Open Sans (Clean & Friendly)</option>
                  <option value="Source Sans Pro">Source Sans Pro (Adobe)</option>
                  <option value="Noto Sans">Noto Sans (Universal)</option>
                  <option value="SF Pro Display">SF Pro Display (Apple)</option>
                  <option value="Ubuntu">Ubuntu (Modern)</option>
                  <option value="Arial">Arial (Classic)</option>
                  <option value="Helvetica">Helvetica (Classic)</option>
                </select>
              </div>

              {/* Color Pickers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ color: '#fff', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Text Color</label>
                  <input
                    type="color"
                    value={currentCaption.style.textColor}
                    onChange={(e) => updateCaptionStyle({ textColor: e.target.value })}
                    style={{ width: '100%', height: '32px', border: 'none', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ color: '#fff', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Highlight Color</label>
                  <input
                    type="color"
                    value={currentCaption.style.highlighterColor}
                    onChange={(e) => updateCaptionStyle({ highlighterColor: e.target.value })}
                    style={{ width: '100%', height: '32px', border: 'none', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ color: '#fff', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Background Color</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={currentCaption.style.backgroundColor === 'transparent' ? '#000000' : currentCaption.style.backgroundColor}
                    onChange={(e) => updateCaptionStyle({ backgroundColor: e.target.value })}
                    style={{ flex: 1, height: '32px', border: 'none', borderRadius: '4px' }}
                  />
                  <button
                    onClick={() => updateCaptionStyle({ backgroundColor: 'transparent' })}
                    style={{
                      padding: '6px 10px',
                      backgroundColor: currentCaption.style.backgroundColor === 'transparent' ? '#0066cc' : '#404040',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '10px'
                    }}
                  >
                    Transparent
                  </button>
                </div>
              </div>

              {/* Stroke Controls */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ color: '#fff', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Stroke Color</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={currentCaption.style.strokeColor || '#000000'}
                      onChange={(e) => updateCaptionStyle({ strokeColor: e.target.value })}
                      style={{ flex: 1, height: '32px', border: 'none', borderRadius: '4px' }}
                    />
                    <button
                      onClick={() => updateCaptionStyle({ strokeColor: 'transparent' })}
                      style={{
                        padding: '6px 10px',
                        backgroundColor: (currentCaption.style.strokeColor || '#000000') === 'transparent' ? '#0066cc' : '#404040',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '10px'
                      }}
                    >
                      Transparent
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ color: '#fff', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Stroke Width</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={currentCaption.style.strokeWidth || 0}
                      onChange={(e) => updateCaptionStyle({ strokeWidth: parseFloat(e.target.value) })}
                      style={{
                        flex: 1,
                        height: '4px',
                        background: '#444',
                        outline: 'none',
                        borderRadius: '2px'
                      }}
                    />
                    <span style={{ color: '#aaa', fontSize: '11px', minWidth: '30px' }}>
                      {currentCaption.style.strokeWidth || 0}px
                    </span>
                  </div>
                </div>
              </div>

              {/* Text Transform */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#fff', fontSize: '12px', display: 'block', marginBottom: '8px' }}>Text Transform</label>
                <select
                  value={currentCaption.style.textTransform || 'none'}
                  onChange={(e) => updateCaptionStyle({ textTransform: e.target.value as 'none' | 'capitalize' | 'uppercase' | 'lowercase' })}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    backgroundColor: '#404040',
                    color: '#fff',
                    border: '1px solid #555',
                    borderRadius: '4px',
                    fontSize: '11px'
                  }}
                >
                  <option value="none">None</option>
                  <option value="capitalize">Capitalize</option>
                  <option value="uppercase">Uppercase</option>
                  <option value="lowercase">Lowercase</option>
                </select>
              </div>

              {/* Close Button */}
              <div style={{ marginTop: '16px', textAlign: 'right' }}>
                <button
                  onClick={() => setShowContextMenu(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#666',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          );
        })()}
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
  const baseFontSize = caption.style?.fontSize || 32;
  const scale = caption.style?.scale || 1;
  const fontSize = baseFontSize * scale;
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
  const baseFontSize = caption.style?.fontSize || 32;
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
  const baseFontSize = caption.style?.fontSize || 32;
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

export default VideoPanel;