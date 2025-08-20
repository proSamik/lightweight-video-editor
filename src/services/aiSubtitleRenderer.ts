import { Canvas, CanvasRenderingContext2D, createCanvas, registerFont } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { 
  SubtitleFrame, 
  WordSegment, 
  CaptionStyle, 
  WordEditState,
  AISubtitleData 
} from '../types';

export class AISubtitleRenderer {
  private static instance: AISubtitleRenderer;
  private canvas: Canvas | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  private constructor() {}

  public static getInstance(): AISubtitleRenderer {
    if (!AISubtitleRenderer.instance) {
      AISubtitleRenderer.instance = new AISubtitleRenderer();
    }
    return AISubtitleRenderer.instance;
  }

  /**
   * Initialize canvas for rendering subtitles
   */
  public initializeCanvas(width: number, height: number): void {
    this.canvas = createCanvas(width, height);
    this.ctx = this.canvas.getContext('2d');
  }

  /**
   * Render a single subtitle frame with per-word styling
   */
  public renderFrame(
    frame: SubtitleFrame,
    currentTime: number,
    baseStyle: CaptionStyle,
    canvasWidth: number,
    canvasHeight: number
  ): Canvas {
    if (!this.canvas || !this.ctx) {
      this.initializeCanvas(canvasWidth, canvasHeight);
    }

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Filter out words that should not be rendered
    const visibleWords = frame.words.filter(word => 
      word.editState !== 'strikethrough' && 
      word.editState !== 'removedCaption' &&
      !word.isPause
    );

    if (visibleWords.length === 0) {
      return canvas;
    }

    // Calculate text layout
    const layout = this.calculateTextLayout(visibleWords, baseStyle, ctx, canvasWidth, canvasHeight);

    // Render each word with appropriate styling
    visibleWords.forEach((word, index) => {
      const wordLayout = layout.words[index];
      if (!wordLayout) return;

      const isHighlighted = currentTime >= word.start && currentTime <= word.end;
      const wordStyle = this.getWordStyle(word, baseStyle, isHighlighted);
      
      this.renderWord(ctx, word, wordLayout, wordStyle, isHighlighted);
    });

    return canvas;
  }

  /**
   * Calculate text layout for all words in a frame
   */
  private calculateTextLayout(
    words: WordSegment[],
    baseStyle: CaptionStyle,
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number
  ): { words: Array<{ x: number; y: number; width: number; height: number }> } {
    const wordLayouts: Array<{ x: number; y: number; width: number; height: number }> = [];
    
    // Set font for measurement
    const fontSize = baseStyle.fontSize * (baseStyle.scale || 1);
    ctx.font = `${fontSize}px ${baseStyle.font}`;
    
    const lineHeight = fontSize * 1.2;
    const padding = 20;
    const maxWidth = canvasWidth - (padding * 2);
    
    let currentX = padding;
    let currentY = canvasHeight - (canvasHeight * 0.15); // Position near bottom
    
    // Adjust Y position based on style position
    if (baseStyle.position.y !== undefined) {
      currentY = (baseStyle.position.y / 100) * canvasHeight;
    }

    words.forEach((word, index) => {
      const wordStyle = this.getWordStyle(word, baseStyle, false);
      
      // Apply word-specific font size if different
      if (wordStyle.fontSize && wordStyle.fontSize !== fontSize) {
        ctx.font = `${wordStyle.fontSize}px ${baseStyle.font}`;
      }
      
      const metrics = ctx.measureText(word.word);
      const wordWidth = metrics.width + 8; // Add some padding
      const wordHeight = lineHeight;
      
      // Check if word fits on current line
      if (currentX + wordWidth > canvasWidth - padding && index > 0) {
        // Move to next line
        currentX = padding;
        currentY += lineHeight;
      }
      
      wordLayouts.push({
        x: currentX,
        y: currentY,
        width: wordWidth,
        height: wordHeight
      });
      
      currentX += wordWidth + 4; // Space between words
      
      // Reset font if changed
      ctx.font = `${fontSize}px ${baseStyle.font}`;
    });

    return { words: wordLayouts };
  }

  /**
   * Get computed style for a word based on its state and customizations
   */
  private getWordStyle(word: WordSegment, baseStyle: CaptionStyle, isHighlighted: boolean): CaptionStyle {
    const style = { ...baseStyle };

    // Apply custom word style if present
    if (word.customStyle) {
      Object.assign(style, word.customStyle);
    }

    // Apply edit state styling
    switch (word.editState) {
      case 'censored':
        style.textColor = '#888888';
        style.backgroundColor = '#ffff0040';
        break;
      case 'editing':
        style.backgroundColor = '#0066ff40';
        break;
    }

    // Apply keyword highlighting
    if (word.isKeyword) {
      style.textColor = '#ffaa00';
      style.backgroundColor = isHighlighted ? '#ffaa0040' : '#ffaa0020';
      if (baseStyle.emphasizeMode) {
        style.fontSize = (style.fontSize || baseStyle.fontSize) * 1.1;
      }
    }

    // Apply highlight effect
    if (isHighlighted && !word.isKeyword) {
      if (baseStyle.emphasizeMode) {
        style.fontSize = (style.fontSize || baseStyle.fontSize) * 1.05;
      } else {
        style.backgroundColor = style.highlighterColor;
      }
    }

    return style;
  }

  /**
   * Render a single word with styling
   */
  private renderWord(
    ctx: CanvasRenderingContext2D,
    word: WordSegment,
    layout: { x: number; y: number; width: number; height: number },
    style: CaptionStyle,
    isHighlighted: boolean
  ): void {
    const fontSize = style.fontSize * (style.scale || 1);
    
    // Set font
    ctx.font = `${fontSize}px ${style.font}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Draw background if specified
    if (style.backgroundColor && style.backgroundColor !== 'transparent') {
      ctx.fillStyle = style.backgroundColor;
      ctx.fillRect(
        layout.x - 2,
        layout.y - layout.height / 2,
        layout.width,
        layout.height
      );
    }

    // Draw text stroke if specified
    if (style.strokeColor && style.strokeWidth) {
      ctx.strokeStyle = style.strokeColor;
      ctx.lineWidth = style.strokeWidth;
      ctx.strokeText(word.word, layout.x, layout.y);
    }

    // Draw text
    ctx.fillStyle = style.textColor;
    ctx.fillText(word.word, layout.x, layout.y);

    // Apply text decoration
    if (style.textTransform) {
      // This would need to be handled at the word level before rendering
    }
  }

  /**
   * Generate overlay images for all frames in AI subtitle data
   */
  public async generateFrameOverlays(
    aiSubtitleData: AISubtitleData,
    baseStyle: CaptionStyle,
    videoWidth: number,
    videoHeight: number,
    outputDir: string
  ): Promise<Array<{ imagePath: string; startTime: number; endTime: number }>> {
    const overlays: Array<{ imagePath: string; startTime: number; endTime: number }> = [];

    for (let i = 0; i < aiSubtitleData.frames.length; i++) {
      const frame = aiSubtitleData.frames[i];
      
      // Create multiple overlay images for this frame to handle word-by-word highlighting
      const frameOverlays = await this.generateFrameWordOverlays(
        frame,
        baseStyle,
        videoWidth,
        videoHeight,
        outputDir,
        i
      );
      
      overlays.push(...frameOverlays);
    }

    return overlays;
  }

  /**
   * Generate word-by-word overlay images for a single frame
   */
  private async generateFrameWordOverlays(
    frame: SubtitleFrame,
    baseStyle: CaptionStyle,
    videoWidth: number,
    videoHeight: number,
    outputDir: string,
    frameIndex: number
  ): Promise<Array<{ imagePath: string; startTime: number; endTime: number }>> {
    const overlays: Array<{ imagePath: string; startTime: number; endTime: number }> = [];
    
    // Get visible words (excluding strikethrough, removed, and pauses)
    const visibleWords = frame.words.filter(word => 
      word.editState !== 'strikethrough' && 
      word.editState !== 'removedCaption' &&
      !word.isPause
    );

    if (visibleWords.length === 0) {
      return overlays;
    }

    // Generate overlay for each word timing
    for (let wordIndex = 0; wordIndex < visibleWords.length; wordIndex++) {
      const currentWord = visibleWords[wordIndex];
      
      // Render frame with current word highlighted
      const canvas = this.renderFrame(
        frame,
        currentWord.start + 0.01, // Slight offset to ensure highlighting
        baseStyle,
        videoWidth,
        videoHeight
      );

      // Save canvas as PNG
      const imagePath = path.join(outputDir, `frame_${frameIndex}_word_${wordIndex}.png`);
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(imagePath, buffer);

      overlays.push({
        imagePath,
        startTime: currentWord.start,
        endTime: currentWord.end
      });
    }

    return overlays;
  }

  /**
   * Create subtitle overlay for video preview (real-time rendering)
   */
  public renderPreviewFrame(
    frames: SubtitleFrame[],
    currentTime: number,
    baseStyle: CaptionStyle,
    canvasWidth: number,
    canvasHeight: number
  ): Canvas | null {
    // Find the current frame
    const currentFrame = frames.find(frame => 
      currentTime >= frame.startTime && currentTime <= frame.endTime
    );

    if (!currentFrame) {
      return null;
    }

    return this.renderFrame(currentFrame, currentTime, baseStyle, canvasWidth, canvasHeight);
  }

  /**
   * Export frame data for external rendering systems
   */
  public exportFrameData(
    aiSubtitleData: AISubtitleData,
    baseStyle: CaptionStyle
  ): Array<{
    startTime: number;
    endTime: number;
    words: Array<{
      text: string;
      startTime: number;
      endTime: number;
      style: CaptionStyle;
      isVisible: boolean;
    }>;
  }> {
    return aiSubtitleData.frames.map(frame => ({
      startTime: frame.startTime,
      endTime: frame.endTime,
      words: frame.words.map(word => ({
        text: word.word,
        startTime: word.start,
        endTime: word.end,
        style: this.getWordStyle(word, baseStyle, false),
        isVisible: word.editState !== 'strikethrough' && 
                  word.editState !== 'removedCaption' &&
                  !word.isPause
      }))
    }));
  }
}

export default AISubtitleRenderer;