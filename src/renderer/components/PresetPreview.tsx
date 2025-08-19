import React, { useEffect, useRef, useState } from 'react';
import { CaptionPreset, CaptionSegment } from '../../types';
import { useTheme } from '../contexts/ThemeContext';

interface PresetPreviewProps {
  preset: CaptionPreset;
  isSelected?: boolean;
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large';
}

// Import the same rendering functions from VideoPanel
declare function renderCaptionOnCanvas(
  ctx: CanvasRenderingContext2D,
  caption: CaptionSegment,
  canvasWidth: number,
  canvasHeight: number,
  currentTime: number,
  scaleFactor: number
): void;

declare function parseColor(colorString: string): { r: number; g: number; b: number; a: number };
declare function mapFontName(fontName: string): string;
declare function renderSimpleTextOnCanvas(
  ctx: CanvasRenderingContext2D,
  text: string,
  caption: CaptionSegment,
  x: number,
  y: number,
  scaleFactor: number
): void;
declare function renderKaraokeTextOnCanvas(
  ctx: CanvasRenderingContext2D,
  words: any[],
  caption: CaptionSegment,
  frameTime: number,
  centerX: number,
  centerY: number,
  scaleFactor: number
): void;
declare function renderProgressiveTextOnCanvas(
  ctx: CanvasRenderingContext2D,
  words: any[],
  caption: CaptionSegment,
  frameTime: number,
  centerX: number,
  centerY: number,
  scaleFactor: number
): void;

export const PresetPreview: React.FC<PresetPreviewProps> = ({
  preset,
  isSelected = false,
  onClick,
  size = 'medium'
}) => {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  const sizeConfig = {
    small: { width: 220, height: 100, fontSize: 18 },
    medium: { width: 280, height: 120, fontSize: 20 },
    large: { width: 400, height: 160, fontSize: 28 }
  };

  const config = sizeConfig[size];

  // Apply text transform exactly like VideoPanel
  const applyTextTransform = (text: string, transform?: string): string => {
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
  };

  // Create a mock caption segment from the preset
  const createMockCaption = (timeOffset: number = 0): CaptionSegment => {
    const demoText = ['PREVIEW', 'YOUR', 'STYLE'];
    
    // Apply text transform to demo text first
    const transformedDemoText = demoText.map(word => 
      applyTextTransform(word, preset.style.textTransform)
    );
    
    // Create word timestamps for animation
    const words = transformedDemoText.map((word, index) => ({
      word,
      start: index * 500 + timeOffset, // 500ms per word
      end: (index + 1) * 500 + timeOffset
    }));

    return {
      id: 'preview',
      startTime: timeOffset,
      endTime: timeOffset + (demoText.length * 500),
      text: transformedDemoText.join(' '),
      words,
      style: {
        ...preset.style,
        // Adjust font size for preview to fit in small cards
        fontSize: Math.max(Math.round(preset.style.fontSize * 0.25), 8)
      }
    };
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = config.width * dpr;
    canvas.height = config.height * dpr;
    canvas.style.width = `${config.width}px`;
    canvas.style.height = `${config.height}px`;
    ctx.scale(dpr, dpr);

    let animationStart = Date.now();
    const animationDuration = 3000; // 3 seconds total loop

    const drawFrame = () => {
      const now = Date.now();
      const elapsed = (now - animationStart) % animationDuration;
      
      // Clear canvas and set background to match Style Presets section
      ctx.clearRect(0, 0, config.width, config.height);
      
      // Draw solid background matching the Style Presets section
      ctx.fillStyle = theme.colors.background;
      ctx.fillRect(0, 0, config.width, config.height);

      // Create mock caption with current time
      const mockCaption = createMockCaption(0);
      
      try {
        // Use the same rendering function as VideoPanel
        if (typeof (window as any).renderCaptionOnCanvas === 'function') {
          (window as any).renderCaptionOnCanvas(
            ctx,
            mockCaption,
            config.width,
            config.height,
            elapsed,
            1.0 // scaleFactor
          );
        } else {
          // Fallback rendering if the function isn't available
          renderFallbackCaption(ctx, mockCaption, elapsed);
        }
      } catch (error) {
        console.error('Error rendering caption preview:', error);
        // Fallback to simple text rendering
        renderFallbackCaption(ctx, mockCaption, elapsed);
      }

      if (isAnimating) {
        animationRef.current = requestAnimationFrame(drawFrame);
      }
    };

    // Start animation
    setIsAnimating(true);
    drawFrame();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setIsAnimating(false);
    };
  }, [preset, config, isAnimating]);

  // Fallback rendering function that matches VideoPanel spacing exactly
  const renderFallbackCaption = (ctx: CanvasRenderingContext2D, caption: CaptionSegment, currentTime: number) => {
    const { width, height } = config;
    const x = (width * caption.style.position.x) / 100;
    const y = (height * caption.style.position.y) / 100;
    
    // Set font with center baseline for preview cards
    const fontSize = caption.style.fontSize;
    const scale = caption.style.scale || 1;
    ctx.font = `bold ${fontSize}px ${caption.style.font}, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle'; // Use middle for centered preview

    if (caption.style.renderMode === 'progressive' && caption.words) {
      // Progressive rendering - stack words vertically (matching VideoPanel progressive logic)
      const visibleWords = caption.words.filter(word => currentTime >= word.start);
      const lineHeight = fontSize * 1.4; // Match VideoPanel line height
      
      // Center the progressive text block properly
      const totalHeight = visibleWords.length * lineHeight;
      const startY = y - (totalHeight / 2) + (lineHeight / 2);

      visibleWords.forEach((word, index) => {
        const wordY = startY + (index * lineHeight);
        const isLastWord = index === visibleWords.length - 1;
        const isCurrentWord = currentTime >= word.start && currentTime <= word.end;
        
        // Apply styling exactly like VideoPanel progressive mode
        if (isLastWord) {
          // Last word in progressive mode gets larger and highlighted
          ctx.font = `bold ${Math.round(fontSize * 1.2)}px ${caption.style.font}, Arial, sans-serif`;
          ctx.fillStyle = caption.style.highlighterColor;
        } else if (isCurrentWord && caption.style.emphasizeMode) {
          ctx.font = `bold ${Math.round(fontSize * 1.05)}px ${caption.style.font}, Arial, sans-serif`;
          ctx.fillStyle = caption.style.highlighterColor;
        } else {
          ctx.font = `bold ${fontSize}px ${caption.style.font}, Arial, sans-serif`;
          ctx.fillStyle = caption.style.textColor;
        }

        // Word is already transformed in createMockCaption
        ctx.fillText(word.word, x, wordY);
      });
    } else {
      // Horizontal rendering with exact VideoPanel spacing
      if (caption.words) {
        const wordSpacing = 12 * scale; // Exact VideoPanel spacing
        const wordPadding = 4 * scale;  // Exact VideoPanel padding
        
        // Calculate total width exactly like VideoPanel
        let totalWidth = 0;
        for (const word of caption.words) {
          const wordWidth = ctx.measureText(word.word).width;
          totalWidth += wordWidth + (wordPadding * 2) + wordSpacing;
        }
        totalWidth -= wordSpacing; // Remove last spacing
        
        let currentX = x - (totalWidth / 2) + wordPadding; // Start with padding
        
        caption.words.forEach((word, index) => {
          const isCurrentWord = currentTime >= word.start && currentTime <= word.end;
          const wordWidth = ctx.measureText(word.word).width;
          
          // Apply styling exactly like VideoPanel
          if (isCurrentWord && caption.style.emphasizeMode) {
            // Emphasis mode: 5% larger font and highlighter color
            ctx.font = `bold ${Math.round(fontSize * 1.05)}px ${caption.style.font}, Arial, sans-serif`;
            ctx.fillStyle = caption.style.highlighterColor;
          } else {
            ctx.font = `bold ${fontSize}px ${caption.style.font}, Arial, sans-serif`;
            ctx.fillStyle = caption.style.textColor;
          }

          // Draw background box if not in emphasis mode and highlighted
          if (isCurrentWord && !caption.style.emphasizeMode && caption.style.backgroundColor !== 'transparent') {
            const boxWidth = wordWidth + (wordPadding * 2);
            const boxHeight = fontSize + (wordPadding * 2);
            const boxX = currentX - wordPadding;
            const boxY = y - fontSize/2 - wordPadding; // Center the box
            
            ctx.fillStyle = caption.style.highlighterColor;
            ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
            ctx.fillStyle = caption.style.textColor; // Reset for text
          }

          // Word is already transformed in createMockCaption
          ctx.fillText(word.word, currentX + wordWidth / 2, y);
          currentX += wordWidth + (wordPadding * 2) + wordSpacing;
        });
      } else {
        // Simple text
        ctx.fillStyle = caption.style.textColor;
        ctx.fillText(caption.text, x, y);
      }
    }
  };

  const containerStyle: React.CSSProperties = {
    width: config.width,
    height: config.height,
    border: `2px solid ${isSelected ? theme.colors.primary : theme.colors.border}`,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    backgroundColor: theme.colors.surface,
    boxShadow: isSelected 
      ? `0 4px 20px ${theme.colors.primary}30`
      : '0 2px 8px rgba(0, 0, 0, 0.1)',
    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
  };

  const labelStyle: React.CSSProperties = {
    padding: '6px 8px',
    backgroundColor: theme.colors.background,
    borderTop: `1px solid ${theme.colors.border}`,
    fontSize: '12px',
    fontWeight: '500',
    color: theme.colors.text,
    textAlign: 'center',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    overflow: 'hidden'
  };

  return (
    <div style={containerStyle} onClick={onClick}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: config.height - 32, // Leave space for smaller label
        }}
      />
      <div style={labelStyle}>
        {preset.name}
      </div>
    </div>
  );
};

export default PresetPreview;