import React, { useRef, useEffect, useState, useCallback } from 'react';
import { VideoFile, CaptionSegment } from '../../types';

interface VideoPanelProps {
  videoFile: VideoFile | null;
  captions: CaptionSegment[];
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  onVideoSelect: () => void;
  onVideoDropped?: (filePath: string) => void;
}

const VideoPanel: React.FC<VideoPanelProps> = ({
  videoFile,
  captions,
  currentTime,
  onTimeUpdate,
  onVideoSelect,
  onVideoDropped,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const handleTimeUpdate = () => {
        onTimeUpdate(video.currentTime * 1000);
      };
      
      video.addEventListener('timeupdate', handleTimeUpdate);
      return () => video.removeEventListener('timeupdate', handleTimeUpdate);
    }
    return undefined;
  }, [onTimeUpdate]);

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

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find(file => 
      file.type.startsWith('video/') || 
      /\.(mp4|mov|avi)$/i.test(file.name)
    );

    if (videoFile && onVideoDropped) {
      const filePath = (videoFile as any).path;
      if (filePath) {
        onVideoDropped(filePath);
      } else {
        console.warn('No file path available, falling back to file picker');
        onVideoSelect();
      }
    } else if (videoFile) {
      onVideoSelect();
    }
  };

  if (!videoFile) {
    return (
      <div 
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDragOver ? '#3a3a3a' : '#2a2a2a',
          margin: '20px',
          borderRadius: '8px',
          border: isDragOver ? '2px dashed #007acc' : '2px dashed #555',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }} 
        onClick={onVideoSelect}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📹</div>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>
            Drop a video file here or click to select
          </div>
          <div style={{ fontSize: '14px', color: '#888' }}>
            Supports MP4, MOV, AVI
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      flex: 1, 
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#000',
      margin: '20px'
    }}>
      {/* Canvas-based Preview Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 20px',
        backgroundColor: '#2a2a2a',
        borderBottom: '1px solid #333'
      }}>
        <div style={{ fontSize: '14px', color: '#fff' }}>
          🎨 Canvas-based Preview (Matches Export Exactly)
        </div>
        <div style={{ fontSize: '12px', color: '#888' }}>
          Font: Arial Bold | Position: {canvasSize.width}x{canvasSize.height}
        </div>
      </div>

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
          controls
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
      </div>

      {/* Canvas Info */}
      <div style={{
        padding: '10px 20px',
        backgroundColor: '#2a2a2a',
        borderTop: '1px solid #333',
        fontSize: '12px',
        color: '#888'
      }}>
        <div>💡 This preview uses the same Canvas rendering as your export - what you see is what you get!</div>
        <div>Real-time updates | Pixel-perfect matching | Unified rendering system</div>
      </div>
    </div>
  );
};

// Canvas rendering functions (matching CanvasVideoRenderer exactly)
function renderCaptionOnCanvas(
  ctx: CanvasRenderingContext2D,
  caption: CaptionSegment,
  canvasWidth: number,
  canvasHeight: number,
  currentTime: number,
  scaleFactor: number
) {
  // Calculate position (matching the VideoPanel exactly)
  // x: percentage from left (0-100)
  // y: percentage from top (0-100) - NOT from bottom!
  const x = (canvasWidth * caption.style.position.x) / 100;
  const y = (canvasHeight * caption.style.position.y) / 100;
  
  // Get text to render
  let text = caption.text;
  let words: any[] = [];
  
  if (caption.words && caption.words.length > 0) {
    words = caption.words;
  }
  
  // Draw text with word-level highlighting
  if (words.length > 0) {
    renderKaraokeTextOnCanvas(ctx, words, caption, currentTime, x, y, scaleFactor);
  } else {
    // Simple text without word-level timing
    renderSimpleTextOnCanvas(ctx, text, caption, x, y, scaleFactor);
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
  const fontSize = caption.style?.fontSize || 32;
  const textColor = parseColor(caption.style?.textColor || '#ffffff');
  const backgroundColor = parseColor(caption.style?.backgroundColor || '#80000000');
  
  // Set font with actual font from caption style (matching VideoPanel exactly)
  const fontFamily = mapFontName(caption.style?.font || 'SF Pro Display Semibold');
  ctx.font = `bold ${fontSize * scaleFactor}px ${fontFamily}, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  
  // Measure text for background box
  const textMetrics = ctx.measureText(text);
  const textWidth = textMetrics.width;
  const textHeight = fontSize * scaleFactor;
  
  // Calculate background box position and size (matching VideoPanel padding exactly)
  const boxX = x - (textWidth / 2) - 12; // 12px padding from VideoPanel
  const boxY = y - textHeight - 12;
  const boxWidth = textWidth + 24; // 12px padding on each side
  const boxHeight = textHeight + 24; // 12px padding top/bottom
  
  // Draw background box (matching VideoPanel's caption background exactly)
  ctx.fillStyle = `rgba(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b}, ${backgroundColor.a})`;
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
  
  // Add text shadow for better visibility (matching VideoPanel exactly)
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  // Draw text
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
  caption: CaptionSegment,
  frameTime: number,
  centerX: number,
  centerY: number,
  scaleFactor: number
) {
  const fontSize = caption.style?.fontSize || 32;
  const textColor = parseColor(caption.style?.textColor || '#ffffff');
  const highlighterColor = parseColor(caption.style?.highlighterColor || '#ffff00');
  const backgroundColor = parseColor(caption.style?.backgroundColor || '#80000000');
  
  // Set font with actual font from caption style (matching VideoPanel exactly)
  const fontFamily = mapFontName(caption.style?.font || 'SF Pro Display Semibold');
  ctx.font = `bold ${fontSize * scaleFactor}px ${fontFamily}, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  
  // Calculate total width including word spacing and padding (matching VideoPanel exactly)
  let totalWidth = 0;
  const wordSpacing = 4; // marginRight from VideoPanel
  const wordPadding = 4; // padding from VideoPanel
  
  for (const word of words) {
    ctx.font = `bold ${fontSize * scaleFactor}px ${fontFamily}, Arial, sans-serif`;
    const wordWidth = ctx.measureText(word.word).width;
    totalWidth += wordWidth + (wordPadding * 2) + wordSpacing; // word + padding + margin
  }
  totalWidth -= wordSpacing; // Remove last margin
  
  // Calculate background box for entire caption (matching VideoPanel exactly)
  const boxX = centerX - (totalWidth / 2);
  const boxY = centerY - fontSize * scaleFactor - 12;
  const boxWidth = totalWidth;
  const boxHeight = fontSize * scaleFactor + 24; // 12px padding top/bottom
  
  // Draw main background box (matching VideoPanel's caption background exactly)
  ctx.fillStyle = `rgba(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b}, ${backgroundColor.a})`;
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
  
  // Add text shadow for better visibility (matching VideoPanel exactly)
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  // Draw words with individual highlighting (matching VideoPanel exactly)
  let currentX = centerX - (totalWidth / 2) + wordPadding; // Start with padding
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const wordStart = word.start;
    const wordEnd = word.end;
    
    // Determine if this word should be highlighted (matching VideoPanel logic exactly)
    const isHighlighted = frameTime >= wordStart && frameTime <= wordEnd;
    const hasPassedWord = frameTime > wordEnd;
    
    // Measure word width
    const wordWidth = ctx.measureText(word.word).width;
    const wordBoxWidth = wordWidth + (wordPadding * 2);
    const wordBoxHeight = fontSize * scaleFactor + (wordPadding * 2);
    const wordBoxX = currentX - wordPadding;
    const wordBoxY = centerY - fontSize * scaleFactor - wordPadding;
    
    // Draw individual word background (matching VideoPanel's word-level styling exactly)
    if (isHighlighted) {
      // Highlighted word background
      ctx.fillStyle = `rgba(${highlighterColor.r}, ${highlighterColor.g}, ${highlighterColor.b}, ${highlighterColor.a})`;
      ctx.fillRect(wordBoxX, wordBoxY, wordBoxWidth, wordBoxHeight);
    }
    
    // Set text color based on highlighting (matching VideoPanel logic exactly)
    if (hasPassedWord) {
      // Passed word - slightly transparent
      ctx.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, 0.8)`;
    } else if (isHighlighted) {
      // Highlighted word - black text on highlight background
      ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    } else {
      // Normal word - white text
      ctx.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, ${textColor.a})`;
    }
    
    // Draw the word
    ctx.fillText(word.word, currentX + wordWidth/2, centerY);
    
    // Move to next word position
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
    default:
      return 'Arial'; // Default fallback
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
      const alpha = parseInt(hex.substr(0, 2), 16) / 255;
      const r = parseInt(hex.substr(2, 2), 16);
      const g = parseInt(hex.substr(4, 2), 16);
      const b = parseInt(hex.substr(6, 2), 16);
      return { r, g, b, a: alpha };
    } else if (hex.length === 6) {
      // 6-character hex without alpha
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return { r, g, b, a: 1 };
    }
  }
  
  // Default to white
  return { r: 255, g: 255, b: 255, a: 1 };
}

export default VideoPanel;