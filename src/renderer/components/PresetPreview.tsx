import React, { useEffect, useRef, useState } from 'react';
import { CaptionPreset } from '../../types';
import { useTheme } from '../contexts/ThemeContext';

interface PresetPreviewProps {
  preset: CaptionPreset;
  isSelected?: boolean;
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large';
}

export const PresetPreview: React.FC<PresetPreviewProps> = ({
  preset,
  isSelected = false,
  onClick,
  size = 'medium'
}) => {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [isAnimating, setIsAnimating] = useState(false);

  const sizeConfig = {
    small: { width: 220, height: 130, fontSize: 18 },
    medium: { width: 280, height: 160, fontSize: 20 },
    large: { width: 400, height: 240, fontSize: 28 }
  };

  const config = sizeConfig[size];
  const demoText = ['PREVIEW', 'YOUR'];
  const words = demoText;

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

    let currentWordIndex = 0;
    let animationStartTime = Date.now();
    const wordDelay = preset.style.animation?.delay || 100;
    const animationDuration = preset.style.animation?.duration || 300;

    const drawFrame = () => {
      // Clear canvas with checkered background
      ctx.clearRect(0, 0, config.width, config.height);
      
      // Draw checkered background to show transparency
      const checkSize = 8;
      for (let x = 0; x < config.width; x += checkSize) {
        for (let y = 0; y < config.height; y += checkSize) {
          const isEven = (Math.floor(x / checkSize) + Math.floor(y / checkSize)) % 2 === 0;
          ctx.fillStyle = isEven ? '#f0f0f0' : '#e0e0e0';
          ctx.fillRect(x, y, checkSize, checkSize);
        }
      }

      // Set up text styling
      const fontSize = Math.max(config.fontSize, 14);
      ctx.font = `${preset.style.textTransform === 'uppercase' ? 'bold' : 'normal'} ${fontSize}px ${preset.style.font}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const centerX = config.width / 2;
      const centerY = config.height / 2;
      const currentTime = Date.now();
      const elapsed = currentTime - animationStartTime;

      // Draw each word with animation
      words.forEach((word, index) => {
        const wordStartTime = index * wordDelay;
        const wordElapsed = elapsed - wordStartTime;
        
        if (wordElapsed < 0) return; // Word hasn't started yet

        // Determine if this word should be highlighted
        const isCurrentWord = index === currentWordIndex;
        const shouldHighlight = wordElapsed < animationDuration;

        // Calculate animation progress (0 to 1)
        const animProgress = Math.min(wordElapsed / animationDuration, 1);
        
        // Apply animation effects based on preset type
        let scale = 1;
        let alpha = 1;
        let offsetX = 0;
        let offsetY = 0;
        let rotation = 0;

        if (shouldHighlight && preset.style.animation) {
          const intensity = preset.style.animation.intensity || 0.5;
          
          switch (preset.style.animation.type) {
            case 'bounce':
              scale = 1 + (Math.sin(animProgress * Math.PI) * 0.3 * intensity);
              break;
              
            case 'fade':
              alpha = animProgress;
              break;
              
            case 'slide':
              const direction = preset.style.animation.direction || 'up';
              const distance = 20 * intensity;
              if (direction === 'up') offsetY = (1 - animProgress) * distance;
              else if (direction === 'down') offsetY = -(1 - animProgress) * distance;
              else if (direction === 'left') offsetX = (1 - animProgress) * distance;
              else if (direction === 'right') offsetX = -(1 - animProgress) * distance;
              break;
              
            case 'zoom':
              scale = 0.5 + (animProgress * 0.5) + (Math.sin(animProgress * Math.PI) * 0.2 * intensity);
              break;
              
            case 'glow':
              // Glow effect will be simulated with color brightness
              break;
              
            case 'wave':
              offsetY = Math.sin(animProgress * Math.PI * 2) * 5 * intensity;
              break;
              
            case 'shake':
              offsetX = (Math.random() - 0.5) * 4 * intensity;
              offsetY = (Math.random() - 0.5) * 4 * intensity;
              break;
              
            case 'typewriter':
              // For typewriter, we'll just show the word when it's time
              alpha = animProgress > 0.5 ? 1 : 0;
              break;
          }
        }

        // Calculate word position with proper spacing
        ctx.font = `${preset.style.textTransform === 'uppercase' ? 'bold' : 'normal'} ${fontSize}px ${preset.style.font}`;
        
        // Measure all words to calculate proper spacing
        const wordWidths = words.map(word => {
          let displayWord = word;
          switch (preset.style.textTransform) {
            case 'uppercase': displayWord = word.toUpperCase(); break;
            case 'lowercase': displayWord = word.toLowerCase(); break;
            case 'capitalize': displayWord = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(); break;
          }
          return ctx.measureText(displayWord).width;
        });
        
        const wordGap = fontSize * 1.2; // Space between words - significantly increased to prevent overlap
        const totalWidth = wordWidths.reduce((sum, width) => sum + width, 0) + (wordGap * (words.length - 1));
        
        let currentX = centerX - totalWidth / 2;
        const wordX = currentX + wordWidths.slice(0, index).reduce((sum, width) => sum + width + wordGap, 0) + (wordWidths[index] / 2) + offsetX;
        const wordY = centerY + offsetY;

        // Save context for transformations
        ctx.save();
        
        // Apply transformations
        ctx.translate(wordX, wordY);
        ctx.scale(scale, scale);
        ctx.rotate(rotation);
        ctx.globalAlpha = alpha;

        // Draw background if specified
        if (preset.style.backgroundColor !== 'transparent' && (isCurrentWord || !preset.style.emphasizeMode)) {
          const bgColor = isCurrentWord && preset.style.emphasizeMode 
            ? preset.style.highlighterColor 
            : preset.style.backgroundColor;
          
          ctx.fillStyle = bgColor;
          const metrics = ctx.measureText(word);
          const bgWidth = metrics.width + 8;
          const bgHeight = fontSize + 4;
          ctx.fillRect(-bgWidth/2, -bgHeight/2, bgWidth, bgHeight);
        }

        // Draw stroke if specified
        if (preset.style.strokeWidth && preset.style.strokeColor !== 'transparent') {
          ctx.strokeStyle = preset.style.strokeColor || '#000000';
          ctx.lineWidth = preset.style.strokeWidth;
          ctx.strokeText(word, 0, 0);
        }

        // Draw text
        const textColor = isCurrentWord && preset.style.emphasizeMode 
          ? preset.style.highlighterColor 
          : preset.style.textColor;
        
        ctx.fillStyle = textColor;
        
        // Apply text transform
        let displayWord = word;
        switch (preset.style.textTransform) {
          case 'uppercase': displayWord = word.toUpperCase(); break;
          case 'lowercase': displayWord = word.toLowerCase(); break;
          case 'capitalize': displayWord = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(); break;
        }
        
        ctx.fillText(displayWord, 0, 0);

        ctx.restore();
      });

      // Continue animation
      if (isAnimating) {
        // Move to next word if current animation is done
        if (elapsed > (currentWordIndex + 1) * wordDelay + animationDuration) {
          currentWordIndex = (currentWordIndex + 1) % words.length;
          if (currentWordIndex === 0) {
            // Reset animation immediately
            animationStartTime = Date.now();
          }
        }
        
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
    padding: '8px 12px',
    backgroundColor: theme.colors.background,
    borderTop: `1px solid ${theme.colors.border}`,
    fontSize: '14px',
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
          height: config.height - 40, // Leave space for label
        }}
      />
      <div style={labelStyle}>
        {preset.name}
      </div>
    </div>
  );
};

export default PresetPreview;