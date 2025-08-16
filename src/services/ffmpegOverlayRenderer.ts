import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import ffmpeg = require('fluent-ffmpeg');
import { Canvas, CanvasRenderingContext2D } from 'canvas';

/**
 * FFmpeg Overlay-based video renderer using pre-rendered text overlays
 * This approach renders text designs to transparent PNGs using node-canvas
 * and uses FFmpeg's overlay filter to composite onto video without frame extraction
 */
export class FFmpegOverlayRenderer {
  private static instance: FFmpegOverlayRenderer;
  private isCancelled: boolean = false;
  private activeFFmpegProcesses: Set<any> = new Set();
  private currentTempDir: string | null = null;

  private constructor() {
    console.log('FFmpeg Overlay Renderer initialized');
  }

  public static getInstance(): FFmpegOverlayRenderer {
    if (!FFmpegOverlayRenderer.instance) {
      FFmpegOverlayRenderer.instance = new FFmpegOverlayRenderer();
    }
    return FFmpegOverlayRenderer.instance;
  }

  /**
   * Cancel the current rendering operation
   */
  public cancelRendering(): void {
    console.log('[FFmpegOverlayRenderer] Cancellation requested');
    this.isCancelled = true;
    
    // Kill all active FFmpeg processes
    for (const ffmpegCommand of this.activeFFmpegProcesses) {
      try {
        if (ffmpegCommand && typeof ffmpegCommand.kill === 'function') {
          console.log('[FFmpegOverlayRenderer] Killing FFmpeg command');
          ffmpegCommand.kill('SIGTERM');
        }
      } catch (error) {
        console.error('[FFmpegOverlayRenderer] Error killing FFmpeg command:', error);
      }
    }
    this.activeFFmpegProcesses.clear();
    
    // Clean up temporary files
    if (this.currentTempDir) {
      this.cleanupTempFiles(this.currentTempDir);
      this.currentTempDir = null;
    }
  }

  /**
   * Main method to render video with captions using FFmpeg overlay approach
   */
  public async renderVideoWithCaptions(
    videoPath: string,
    captions: any[],
    outputPath: string,
    onProgress?: (progress: number) => void,
    exportSettings?: { framerate: number; quality: string }
  ): Promise<string> {
    try {
      // Reset cancellation state for new render
      this.isCancelled = false;
      
      console.log('=== FFMPEG OVERLAY RENDERER DEBUG START ===');
      console.log('Input video path:', videoPath);
      console.log('Output path:', outputPath);
      console.log('Captions count:', captions?.length || 0);
      console.log('Export settings:', exportSettings);
      
      // Check if cancelled before starting
      if (this.isCancelled) {
        throw new Error('Rendering cancelled');
      }
      
      // Validate inputs
      await this.validateInputs(videoPath, captions, outputPath);
      
      if (!captions || captions.length === 0) {
        console.log('No captions provided, copying original video');
        return await this.copyVideo(videoPath, outputPath);
      }
      
      // Get video metadata
      const metadata = await this.getVideoMetadata(videoPath);
      console.log('Video metadata:', metadata);
      
      // Create temporary directory for overlay PNGs
      const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'ffmpeg-overlay-'));
      this.currentTempDir = tempDir;
      console.log('Temp directory created:', tempDir);
      
      try {
        // Step 1: Generate text overlay PNGs
        console.log('Generating text overlay PNGs...');
        const overlayFiles = await this.generateTextOverlays(captions, metadata, tempDir, onProgress, exportSettings);
        
        // Check if cancelled before FFmpeg processing
        if (this.isCancelled) {
          throw new Error('Rendering cancelled before FFmpeg processing');
        }
        
        // Step 2: Use FFmpeg overlay filter to composite overlays onto video
        console.log('Starting FFmpeg overlay processing...');
        const result = await this.applyOverlaysWithFFmpeg(
          videoPath, 
          overlayFiles, 
          outputPath, 
          metadata, 
          onProgress, 
          exportSettings
        );
        
        // Validate output
        await this.validateOutput(result, videoPath);
        
        console.log('=== FFMPEG OVERLAY RENDERER DEBUG END - SUCCESS ===');
        return result;
      } finally {
        // Clean up temporary files
        await this.cleanupTempFiles(tempDir);
        this.currentTempDir = null;
      }
    } catch (error) {
      // Check if this is a cancellation (expected behavior)
      if (error instanceof Error && (error.message.includes('cancelled') || this.isCancelled)) {
        console.log('=== FFMPEG OVERLAY RENDERER CANCELLED ===');
        throw error; // Re-throw cancellation errors without fallback
      }
      
      console.error('=== FFMPEG OVERLAY RENDERER DEBUG END - ERROR ===');
      console.error('FFmpeg overlay rendering failed:', error);
      if (error instanceof Error) {
        console.error('Error stack:', error.stack);
      }
      
      // Fallback to copying original video
      return await this.copyVideo(videoPath, outputPath);
    }
  }

  /**
   * Generate optimized PNG overlays - one image per word highlight state per caption
   */
  private async generateTextOverlays(
    captions: any[],
    metadata: any,
    tempDir: string,
    onProgress?: (progress: number) => void,
    exportSettings?: { framerate: number; quality: string }
  ): Promise<Array<{ file: string; startTime: number; endTime: number }>> {
    const overlayFiles: Array<{ file: string; startTime: number; endTime: number }> = [];
    
    console.log(`Generating optimized word highlight overlays for ${captions.length} captions...`);
    
    let totalImages = 0;
    let processedImages = 0;
    
    // Count total images needed (one per word in each caption)
    for (const caption of captions) {
      if (caption.words && caption.words.length > 0) {
        totalImages += caption.words.length;
      } else {
        totalImages += 1; // Simple text caption
      }
    }
    
    for (let captionIndex = 0; captionIndex < captions.length; captionIndex++) {
      if (this.isCancelled) {
        throw new Error('Overlay generation cancelled');
      }
      
      const caption = captions[captionIndex];
      const captionStart = caption.startTime !== undefined ? caption.startTime : caption.start;
      const captionEnd = caption.endTime !== undefined ? caption.endTime : caption.end;
      
      // Skip captions with invalid timing
      if (captionStart === undefined || captionEnd === undefined || captionStart >= captionEnd) {
        console.warn('Skipping caption with invalid timing:', caption);
        continue;
      }
      
      // Check if subtitles should be burned in (default: true)
      const shouldBurnIn = caption.style?.burnInSubtitles !== false;
      if (!shouldBurnIn) {
        continue; // Skip this caption if burnInSubtitles is false
      }
      
      if (caption.words && caption.words.length > 0) {
        // Generate ONE image per word highlight state for this caption
        for (let wordIndex = 0; wordIndex < caption.words.length; wordIndex++) {
          const word = caption.words[wordIndex];
          const wordStart = word.start;
          const wordEnd = word.end;
          
          if (wordStart === undefined || wordEnd === undefined) {
            console.warn('Skipping word with invalid timing:', word);
            continue;
          }
          
          // Generate one image showing this word highlighted
          const overlayFileName = `caption_${String(captionIndex).padStart(3, '0')}_highlight_${String(wordIndex).padStart(3, '0')}.png`;
          const overlayPath = path.join(tempDir, overlayFileName);
          
          // Create PNG with this specific word highlighted
          await this.renderWordHighlightToTransparentPNG(
            caption,
            wordIndex,
            metadata.width,
            metadata.height,
            overlayPath
          );
          
          // CRITICAL: MICROSECOND-PRECISE timing for seamless fluid transitions
          const startTimeSeconds = wordStart / 1000;
          const endTimeSeconds = wordEnd / 1000;
          
          let adjustedEndTime = endTimeSeconds;
          
          // Check if next word starts immediately after this one
          if (wordIndex < caption.words.length - 1) {
            const nextWordStart = caption.words[wordIndex + 1].start / 1000;
            // If next word starts exactly when this ends, reduce by 1 microsecond for perfect boundary
            if (Math.abs(endTimeSeconds - nextWordStart) < 0.01) { // Within 10ms = adjacent words
              adjustedEndTime = nextWordStart - 0.000001; // 1 microsecond before next word
            }
          }
          
          // Check for seamless transitions with words from other captions
          for (const existingOverlay of overlayFiles) {
            // If this word starts exactly when another ends, perfect alignment
            if (Math.abs(startTimeSeconds - existingOverlay.endTime) < 0.01) {
              // Already perfectly aligned, no adjustment needed
              break;
            }
            // If this would create a tiny overlap, make microsecond adjustment
            if (startTimeSeconds < existingOverlay.endTime && endTimeSeconds > existingOverlay.startTime) {
              adjustedEndTime = existingOverlay.startTime - 0.000001;
            }
          }
          
          overlayFiles.push({
            file: overlayPath,
            startTime: startTimeSeconds,
            endTime: adjustedEndTime
          });
          
          // Debug timing with microsecond precision
          const gap = overlayFiles.length > 0 ? startTimeSeconds - overlayFiles[overlayFiles.length - 1].endTime : 0;
          const gapMicroseconds = Math.round(gap * 1000000);
          console.log(`Word "${word.word}": ${startTimeSeconds.toFixed(6)}s - ${adjustedEndTime.toFixed(6)}s (original: ${endTimeSeconds.toFixed(6)}s) [Gap: ${gapMicroseconds}μs]`);
          
          processedImages++;
          
          // Report progress (overlay generation is 50% of total progress)
          if (onProgress) {
            onProgress((processedImages / totalImages) * 50);
          }
        }
      } else {
        // Simple text caption (no word timing) - just one static image
        const overlayFileName = `caption_${String(captionIndex).padStart(3, '0')}_static.png`;
        const overlayPath = path.join(tempDir, overlayFileName);
        
        // Generate static PNG overlay for this caption
        await this.renderCaptionToTransparentPNG(
          caption,
          metadata.width,
          metadata.height,
          overlayPath
        );
        
        overlayFiles.push({
          file: overlayPath,
          startTime: captionStart / 1000, // Convert to seconds for FFmpeg
          endTime: captionEnd / 1000
        });
        
        processedImages++;
        
        // Report progress (overlay generation is 50% of total progress)
        if (onProgress) {
          onProgress((processedImages / totalImages) * 50);
        }
      }
      
      // Log progress every 10 captions
      if ((captionIndex + 1) % 10 === 0) {
        console.log(`Processed ${captionIndex + 1}/${captions.length} captions (${processedImages} images)`);
      }
    }
    
    console.log(`Generated ${overlayFiles.length} optimized overlay images (one per word highlight)`);
    return overlayFiles;
  }

  /**
   * Render word highlight overlay to transparent PNG (karaoke mode)
   */
  private async renderWordHighlightToTransparentPNG(
    caption: any,
    highlightedWordIndex: number,
    videoWidth: number,
    videoHeight: number,
    outputPath: string
  ): Promise<void> {
    // Create canvas with video dimensions
    const canvas = new Canvas(videoWidth, videoHeight);
    const ctx = canvas.getContext('2d');
    
    // Set transparent background
    ctx.clearRect(0, 0, videoWidth, videoHeight);
    
    // Render caption with specific word highlighted
    if (caption.style.renderMode === 'progressive') {
      await this.renderProgressiveWordHighlight(ctx, caption.words, caption, highlightedWordIndex, videoWidth, videoHeight);
    } else {
      await this.renderKaraokeWordHighlight(ctx, caption.words, caption, highlightedWordIndex, videoWidth, videoHeight);
    }
    
    // Save as PNG with transparency
    const buffer = canvas.toBuffer('image/png');
    await fs.promises.writeFile(outputPath, buffer);
  }

  /**
   * Render a single caption to a transparent PNG using node-canvas
   */
  private async renderCaptionToTransparentPNG(
    caption: any,
    videoWidth: number,
    videoHeight: number,
    outputPath: string
  ): Promise<void> {
    // Create canvas with video dimensions
    const canvas = new Canvas(videoWidth, videoHeight);
    const ctx = canvas.getContext('2d');
    
    // Set transparent background
    ctx.clearRect(0, 0, videoWidth, videoHeight);
    
    // Render caption on transparent canvas
    if (caption.words && caption.words.length > 0) {
      if (caption.style.renderMode === 'progressive') {
        await this.renderProgressiveTextOverlay(ctx, caption.words, caption, videoWidth, videoHeight);
      } else {
        await this.renderKaraokeTextOverlay(ctx, caption.words, caption, videoWidth, videoHeight);
      }
    } else {
      await this.renderSimpleTextOverlay(ctx, caption.text, caption, videoWidth, videoHeight);
    }
    
    // Save as PNG with transparency
    const buffer = canvas.toBuffer('image/png');
    await fs.promises.writeFile(outputPath, buffer);
  }

  /**
   * Render simple text overlay on transparent canvas
   */
  private async renderSimpleTextOverlay(
    ctx: CanvasRenderingContext2D,
    text: string,
    caption: any,
    canvasWidth: number,
    canvasHeight: number
  ): Promise<void> {
    const baseFontSize = caption.style?.fontSize || 32;
    const scale = caption.style?.scale || 1;
    const fontSize = baseFontSize * scale;
    const fontFamily = this.mapFontName(caption.style?.font || 'Arial');
    const textColor = this.parseColor(caption.style?.textColor || '#ffffff');
    const backgroundColor = this.parseColor(caption.style?.backgroundColor || 'transparent');
    const strokeColor = this.parseColor(caption.style?.strokeColor || 'transparent');
    const strokeWidth = caption.style?.strokeWidth || 0;
    
    // Apply text transformation
    const displayText = this.applyTextTransform(text, caption.style?.textTransform || 'none');
    
    // Set font
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Calculate position
    const x = (canvasWidth * caption.style.position.x) / 100;
    const y = (canvasHeight * caption.style.position.y) / 100;
    
    // Measure text for background box
    const textMetrics = ctx.measureText(displayText);
    const textWidth = textMetrics.width;
    const textHeight = fontSize;
    
    // Calculate background box
    const boxX = x - (textWidth / 2) - 12;
    const boxY = y - (textHeight / 2) - 12;
    const boxWidth = textWidth + 24;
    const boxHeight = textHeight + 24;
    
    // Draw background box if not transparent
    if (backgroundColor.a > 0) {
      ctx.fillStyle = `rgba(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b}, ${backgroundColor.a})`;
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    }
    
    // Add text shadow for better visibility
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Draw stroke if specified
    if (strokeWidth > 0 && strokeColor.a > 0) {
      ctx.strokeStyle = `rgba(${strokeColor.r}, ${strokeColor.g}, ${strokeColor.b}, ${strokeColor.a})`;
      ctx.lineWidth = strokeWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeText(displayText, x, y);
    }
    
    // Draw text
    ctx.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, ${textColor.a})`;
    ctx.fillText(displayText, x, y);
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  /**
   * Render karaoke word highlight (specific word highlighted)
   */
  private async renderKaraokeWordHighlight(
    ctx: CanvasRenderingContext2D,
    words: any[],
    caption: any,
    highlightedWordIndex: number,
    canvasWidth: number,
    canvasHeight: number
  ): Promise<void> {
    const baseFontSize = caption.style?.fontSize || 32;
    const scale = caption.style?.scale || 1;
    const fontSize = baseFontSize * scale;
    const fontFamily = this.mapFontName(caption.style?.font || 'Arial');
    const textColor = this.parseColor(caption.style?.textColor || '#ffffff');
    const highlighterColor = this.parseColor(caption.style?.highlighterColor || '#ffff00');
    const backgroundColor = this.parseColor(caption.style?.backgroundColor || 'transparent');
    const strokeColor = this.parseColor(caption.style?.strokeColor || 'transparent');
    const strokeWidth = caption.style?.strokeWidth || 0;
    const textTransform = caption.style?.textTransform || 'none';
    
    // Set font
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const x = (canvasWidth * caption.style.position.x) / 100;
    const y = (canvasHeight * caption.style.position.y) / 100;
    
    // Calculate total width using BASE font size for consistent positioning
    const wordSpacing = 12 * scale;
    const wordPadding = 4 * scale;
    
    // IMPORTANT: Always use base font size for layout calculations
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    
    let totalWidth = 0;
    const wordWidths: number[] = [];
    
    for (const word of words) {
      const transformedWord = this.applyTextTransform(word.word, textTransform);
      const wordWidth = ctx.measureText(transformedWord).width;
      wordWidths.push(wordWidth);
      totalWidth += wordWidth + (wordPadding * 2) + wordSpacing;
    }
    totalWidth -= wordSpacing;
    
    // Calculate background box using consistent dimensions
    const boxX = x - (totalWidth / 2) - 12;
    const boxY = y - (fontSize / 2) - 12;
    const boxWidth = totalWidth + 24;
    const boxHeight = fontSize + 24;
    
    // Draw main background box ONLY if not transparent AND not in emphasis mode
    if (backgroundColor.a > 0 && !caption.style.emphasizeMode) {
      ctx.fillStyle = `rgba(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b}, ${backgroundColor.a})`;
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    }
    
    // Add text shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // EMPHASIS MODE: Show ONLY the currently highlighted word (discrete word-by-word)
    // This completely eliminates cross-caption bleeding
    if (caption.style.emphasizeMode) {
      // In emphasis mode, show ONLY the highlighted word
      const word = words[highlightedWordIndex];
      const displayWord = this.applyTextTransform(word.word, textTransform);
      const wordWidth = wordWidths[highlightedWordIndex];
      
      // Position the single word in center
      const singleWordX = x;
      const singleWordY = y;
      
      // Set emphasized font and color
      const emphasizedFontSize = fontSize * 1.05;
      ctx.font = `bold ${emphasizedFontSize}px ${fontFamily}`;
      ctx.fillStyle = `rgba(${highlighterColor.r}, ${highlighterColor.g}, ${highlighterColor.b}, ${highlighterColor.a})`;
      
      // Add text shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      
      // Draw only this single word
      ctx.fillText(displayWord, singleWordX, singleWordY);
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      return; // Exit early - only show the single highlighted word
    }
    
    // BACKGROUND MODE: Show progressive reveal (original behavior)
    // Draw words in single line with specific word highlighted
    let currentX = x - (totalWidth / 2) + wordPadding;
    
    for (let i = 0; i <= highlightedWordIndex; i++) {
      const word = words[i];
      const displayWord = this.applyTextTransform(word.word, textTransform);
      const wordWidth = wordWidths[i];
      const isHighlighted = i === highlightedWordIndex;
      
      const wordBoxWidth = wordWidth + (wordPadding * 2);
      const wordBoxHeight = fontSize + (wordPadding * 2);
      const wordBoxX = currentX - wordPadding;
      const wordBoxY = y - (fontSize / 2) - wordPadding;
      
      // Handle highlighting for the specific word
      if (isHighlighted) {
        if (caption.style.emphasizeMode) {
          // EMPHASIS MODE: ONLY font size and color change - NO BACKGROUNDS AT ALL
          const emphasizedFontSize = fontSize * 1.05;
          ctx.font = `bold ${emphasizedFontSize}px ${fontFamily}`;
          ctx.fillStyle = `rgba(${highlighterColor.r}, ${highlighterColor.g}, ${highlighterColor.b}, ${highlighterColor.a})`;
          // ABSOLUTELY NO background rectangles in emphasis mode
        } else {
          // BACKGROUND HIGHLIGHT MODE: Traditional sliding highlight effect
          ctx.fillStyle = `rgba(${highlighterColor.r}, ${highlighterColor.g}, ${highlighterColor.b}, ${highlighterColor.a})`;
          ctx.fillRect(wordBoxX, wordBoxY, wordBoxWidth, wordBoxHeight);
          ctx.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, ${textColor.a})`;
        }
      } else {
        // NON-HIGHLIGHTED words: Always normal appearance regardless of mode
        ctx.font = `bold ${fontSize}px ${fontFamily}`;
        ctx.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, ${textColor.a})`;
      }
      
      // Clear shadow for stroke
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      // Draw stroke if enabled
      if (strokeWidth > 0 && strokeColor.a > 0) {
        ctx.strokeStyle = `rgba(${strokeColor.r}, ${strokeColor.g}, ${strokeColor.b}, ${strokeColor.a})`;
        ctx.lineWidth = strokeWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeText(displayWord, currentX + wordWidth/2, y);
      }
      
      // Add shadow for text fill
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      
      // Draw the word
      ctx.fillText(displayWord, currentX + wordWidth/2, y);
      
      // Reset font size if changed
      if (isHighlighted && caption.style.emphasizeMode) {
        ctx.font = `bold ${fontSize}px ${fontFamily}`;
      }
      
      // Move to next word position
      currentX += wordWidth + (wordPadding * 2) + wordSpacing;
    }
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  /**
   * Render progressive word highlight (words revealed progressively with specific word highlighted)
   */
  private async renderProgressiveWordHighlight(
    ctx: CanvasRenderingContext2D,
    words: any[],
    caption: any,
    highlightedWordIndex: number,
    canvasWidth: number,
    canvasHeight: number
  ): Promise<void> {
    const baseFontSize = caption.style?.fontSize || 32;
    const scale = caption.style?.scale || 1;
    const fontSize = baseFontSize * scale;
    const fontFamily = this.mapFontName(caption.style?.font || 'Arial');
    const textColor = this.parseColor(caption.style?.textColor || '#ffffff');
    const highlighterColor = this.parseColor(caption.style?.highlighterColor || '#ffff00');
    const backgroundColor = this.parseColor(caption.style?.backgroundColor || 'transparent');
    
    // Set font and calculate consistent positioning
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    ctx.textAlign = caption.style?.textAlign || 'center';
    ctx.textBaseline = 'bottom';
    
    const x = (canvasWidth * caption.style.position.x) / 100;
    const y = (canvasHeight * caption.style.position.y) / 100;
    
    // IMPORTANT: Pre-calculate word widths using base font for consistent positioning
    const wordWidths: number[] = [];
    for (const word of words) {
      const transformedWord = this.applyTextTransform(word.word, caption.style?.textTransform || 'none');
      ctx.font = `bold ${fontSize}px ${fontFamily}`; // Always use base font for measurements
      const wordWidth = ctx.measureText(transformedWord).width;
      wordWidths.push(wordWidth);
    }
    
    // In emphasis mode: show ALL words from caption, highlight only current one
    // In background mode: show words progressively up to current word
    const visibleWords = caption.style.emphasizeMode ? words : words.slice(0, highlightedWordIndex + 1);
    const lineHeight = fontSize + 8;
    const firstWordY = y;
    
    // Draw each word vertically (progressive mode)
    for (let wordIndex = 0; wordIndex < visibleWords.length; wordIndex++) {
      const word = visibleWords[wordIndex];
      const wordY = firstWordY + (wordIndex * lineHeight);
      const isHighlighted = wordIndex === highlightedWordIndex;
      
      const displayWord = this.applyTextTransform(word.word, caption.style?.textTransform || 'none');
      
      // Use pre-calculated width for consistent positioning
      const wordWidth = wordWidths[wordIndex];
      const boxX = x - (wordWidth / 2) - 8;
      const boxY = wordY - fontSize - 8;
      const boxWidth = wordWidth + 16;
      const boxHeight = fontSize + 16;
      
      // Draw background for each word ONLY if not transparent AND not in emphasis mode
      if (backgroundColor.a > 0 && !caption.style.emphasizeMode) {
        ctx.fillStyle = `rgba(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b}, ${backgroundColor.a})`;
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
      }
      
      // Handle highlighting with precise timing
      if (isHighlighted) {
        if (caption.style.emphasizeMode) {
          // EMPHASIS MODE: ONLY font size and color change - ZERO backgrounds
          const emphasizedFontSize = fontSize * 1.05;
          ctx.font = `bold ${emphasizedFontSize}px ${fontFamily}`;
          ctx.fillStyle = `rgba(${highlighterColor.r}, ${highlighterColor.g}, ${highlighterColor.b}, ${highlighterColor.a})`;
          // NO background rectangle whatsoever in emphasis mode
        } else {
          // BACKGROUND HIGHLIGHT MODE: Traditional sliding highlight with background
          ctx.fillStyle = `rgba(${highlighterColor.r}, ${highlighterColor.g}, ${highlighterColor.b}, ${highlighterColor.a})`;
          ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
          ctx.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, ${textColor.a})`;
        }
      } else {
        // NON-HIGHLIGHTED words: Always normal regardless of mode
        ctx.font = `bold ${fontSize}px ${fontFamily}`;
        ctx.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, ${textColor.a})`;
      }
      
      // Add text shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      
      // Draw the word
      ctx.fillText(displayWord, x, wordY);
      
      // Reset font size if changed
      if (isHighlighted && caption.style.emphasizeMode) {
        ctx.font = `bold ${fontSize}px ${fontFamily}`;
      }
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
  }

  /**
   * Render karaoke text overlay (all words visible, no timing-based highlighting for static overlay)
   */
  private async renderKaraokeTextOverlay(
    ctx: CanvasRenderingContext2D,
    words: any[],
    caption: any,
    canvasWidth: number,
    canvasHeight: number
  ): Promise<void> {
    const baseFontSize = caption.style?.fontSize || 32;
    const scale = caption.style?.scale || 1;
    const fontSize = baseFontSize * scale;
    const fontFamily = this.mapFontName(caption.style?.font || 'Arial');
    const textColor = this.parseColor(caption.style?.textColor || '#ffffff');
    const backgroundColor = this.parseColor(caption.style?.backgroundColor || 'transparent');
    const strokeColor = this.parseColor(caption.style?.strokeColor || 'transparent');
    const strokeWidth = caption.style?.strokeWidth || 0;
    const textTransform = caption.style?.textTransform || 'none';
    
    // Set font
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const x = (canvasWidth * caption.style.position.x) / 100;
    const y = (canvasHeight * caption.style.position.y) / 100;
    
    // Calculate total width for single line
    const wordSpacing = 12 * scale;
    const wordPadding = 4 * scale;
    
    let totalWidth = 0;
    for (const word of words) {
      const transformedWord = this.applyTextTransform(word.word, textTransform);
      const wordWidth = ctx.measureText(transformedWord).width;
      totalWidth += wordWidth + (wordPadding * 2) + wordSpacing;
    }
    totalWidth -= wordSpacing;
    
    // Calculate background box
    const boxX = x - (totalWidth / 2) - 12;
    const boxY = y - (fontSize / 2) - 12;
    const boxWidth = totalWidth + 24;
    const boxHeight = fontSize + 24;
    
    // Draw main background box if not transparent
    if (backgroundColor.a > 0) {
      ctx.fillStyle = `rgba(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b}, ${backgroundColor.a})`;
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    }
    
    // Add text shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Draw words in single line (all words visible in static overlay)
    let currentX = x - (totalWidth / 2) + wordPadding;
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const displayWord = this.applyTextTransform(word.word, textTransform);
      const wordWidth = ctx.measureText(displayWord).width;
      
      // Set normal text color (no highlighting in static overlay)
      ctx.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, ${textColor.a})`;
      
      // Clear shadow for stroke
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      // Draw stroke if enabled
      if (strokeWidth > 0 && strokeColor.a > 0) {
        ctx.strokeStyle = `rgba(${strokeColor.r}, ${strokeColor.g}, ${strokeColor.b}, ${strokeColor.a})`;
        ctx.lineWidth = strokeWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeText(displayWord, currentX + wordWidth/2, y);
      }
      
      // Add shadow for text fill
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      
      // Draw the word
      ctx.fillText(displayWord, currentX + wordWidth/2, y);
      
      // Move to next word position
      currentX += wordWidth + (wordPadding * 2) + wordSpacing;
    }
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  /**
   * Render progressive text overlay (all revealed words visible in static overlay)
   */
  private async renderProgressiveTextOverlay(
    ctx: CanvasRenderingContext2D,
    words: any[],
    caption: any,
    canvasWidth: number,
    canvasHeight: number
  ): Promise<void> {
    const baseFontSize = caption.style?.fontSize || 32;
    const scale = caption.style?.scale || 1;
    const fontSize = baseFontSize * scale;
    const fontFamily = this.mapFontName(caption.style?.font || 'Arial');
    const textColor = this.parseColor(caption.style?.textColor || '#ffffff');
    const backgroundColor = this.parseColor(caption.style?.backgroundColor || 'transparent');
    
    // Set font
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    ctx.textAlign = caption.style?.textAlign || 'center';
    ctx.textBaseline = 'bottom';
    
    const x = (canvasWidth * caption.style.position.x) / 100;
    const y = (canvasHeight * caption.style.position.y) / 100;
    
    // For static overlay, show all words vertically (progressive layout)
    const lineHeight = fontSize + 8;
    const firstWordY = y;
    
    // Draw each word vertically
    for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
      const word = words[wordIndex];
      const wordY = firstWordY + (wordIndex * lineHeight);
      
      const displayWord = this.applyTextTransform(word.word, caption.style?.textTransform || 'none');
      
      // Measure word for background
      const wordWidth = ctx.measureText(displayWord).width;
      const boxX = x - (wordWidth / 2) - 8;
      const boxY = wordY - fontSize - 8;
      const boxWidth = wordWidth + 16;
      const boxHeight = fontSize + 16;
      
      // Draw background for each word ONLY if not transparent AND not in emphasis mode
      if (backgroundColor.a > 0 && !caption.style.emphasizeMode) {
        ctx.fillStyle = `rgba(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b}, ${backgroundColor.a})`;
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
      }
      
      // Set normal text color (no highlighting in static overlay)
      ctx.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, ${textColor.a})`;
      
      // Add text shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      
      // Draw the word
      ctx.fillText(displayWord, x, wordY);
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
  }

  /**
   * Apply overlays to video using FFmpeg overlay filter
   */
  private async applyOverlaysWithFFmpeg(
    videoPath: string,
    overlayFiles: Array<{ file: string; startTime: number; endTime: number }>,
    outputPath: string,
    metadata: any,
    onProgress?: (progress: number) => void,
    exportSettings?: { framerate: number; quality: string }
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      if (overlayFiles.length === 0) {
        // No overlays to apply, just copy the video
        this.copyVideo(videoPath, outputPath).then(resolve).catch(reject);
        return;
      }
      
      const fps = exportSettings?.framerate || metadata.fps;
      const quality = exportSettings?.quality || 'high';
      
      console.log(`Applying ${overlayFiles.length} overlays with FFmpeg...`);
      
      // Check if we have too many overlays for FFmpeg to handle efficiently
      if (overlayFiles.length > 100) {
        console.warn(`Large number of overlays (${overlayFiles.length}). Consider optimizing.`);
      }
      
      // Build FFmpeg command with overlay filters
      let command = ffmpeg()
        .input(videoPath);
      
      // Add all overlay images as inputs
      overlayFiles.forEach(overlay => {
        command = command.input(overlay.file);
      });
      
      // Build filter chain for overlays
      let filterComplex = '';
      let currentInput = '[0:v]'; // Start with main video
      
      overlayFiles.forEach((overlay, index) => {
        const inputIndex = index + 1; // Overlay inputs start at index 1
        const outputLabel = index === overlayFiles.length - 1 ? '[outv]' : `[tmp${index}]`;
        
        // Create overlay filter with MICROSECOND precision for seamless transitions
        const overlayFilter = `${currentInput}[${inputIndex}:v]overlay=enable='between(t,${overlay.startTime.toFixed(6)},${overlay.endTime.toFixed(6)})'${outputLabel}`;
        
        if (filterComplex) {
          filterComplex += ';';
        }
        filterComplex += overlayFilter;
        
        // Update current input for next iteration
        currentInput = outputLabel;
      });
      
      console.log('Filter complex (first 500 chars):', filterComplex.substring(0, 500) + '...');
      
      // Apply filter complex
      command = command
        .complexFilter(filterComplex)
        .outputOptions([
          '-map', '[outv]',     // Map the video output from filter
          '-map', '0:a?',       // Map audio from original video (if it exists)
        ])
        .audioCodec('copy')     // Copy original audio without re-encoding
        .fps(fps);
      
      // Set video codec and quality
      if (quality === 'high') {
        command = command.videoCodec('libx264').outputOptions(['-crf', '18']);
      } else if (quality === 'medium') {
        command = command.videoCodec('libx264').outputOptions(['-crf', '23']);
      } else {
        command = command.videoCodec('libx264').outputOptions(['-crf', '28']);
      }
      
      // Add compatibility options
      command = command.outputOptions([
        '-movflags', '+faststart',
        '-pix_fmt', 'yuv420p',
        '-profile:v', 'baseline',
        '-level', '3.0'
      ]);
      
      command
        .output(outputPath)
        .on('start', (commandLine: string) => {
          console.log('FFmpeg overlay command:', commandLine);
          this.activeFFmpegProcesses.add(command);
        })
        .on('progress', (progress: any) => {
          console.log('FFmpeg overlay progress:', progress);
          if (onProgress) {
            // Overlay generation was 50%, FFmpeg processing is remaining 50%
            const ffmpegProgress = (progress.percent || 0) * 0.5 + 50;
            onProgress(ffmpegProgress);
          }
        })
        .on('end', () => {
          console.log('FFmpeg overlay processing completed successfully');
          this.activeFFmpegProcesses.delete(command);
          resolve(outputPath);
        })
        .on('error', (err: any) => {
          console.error('FFmpeg overlay processing failed:', err);
          this.activeFFmpegProcesses.delete(command);
          
          // Check if it's a cancellation
          if (this.isCancelled) {
            reject(new Error('FFmpeg overlay processing cancelled'));
          } else {
            reject(new Error(`FFmpeg overlay processing failed: ${err.message}`));
          }
        })
        .run();
    });
  }

  // Helper methods (similar to existing canvas renderers)
  private async validateInputs(videoPath: string, captions: any[], outputPath: string): Promise<void> {
    if (!videoPath || !fs.existsSync(videoPath)) {
      throw new Error('Invalid video path');
    }
    if (!outputPath) {
      throw new Error('Invalid output path');
    }
  }

  private async getVideoMetadata(videoPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err: any, metadata: any) => {
        if (err) {
          reject(err);
        } else {
          const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
          resolve({
            width: videoStream.width,
            height: videoStream.height,
            fps: eval(videoStream.r_frame_rate),
            duration: metadata.format.duration
          });
        }
      });
    });
  }

  private async copyVideo(videoPath: string, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const command = ffmpeg(videoPath)
        .videoCodec('copy')
        .audioCodec('copy')
        .output(outputPath)
        .on('start', () => {
          this.activeFFmpegProcesses.add(command);
        })
        .on('end', () => {
          this.activeFFmpegProcesses.delete(command);
          resolve(outputPath);
        })
        .on('error', (err: any) => {
          this.activeFFmpegProcesses.delete(command);
          reject(err);
        });
      
      command.run();
    });
  }

  private async validateOutput(outputPath: string, originalPath: string): Promise<void> {
    if (!fs.existsSync(outputPath)) {
      throw new Error('Output file was not created');
    }
  }

  private async cleanupTempFiles(tempDir: string): Promise<void> {
    try {
      if (await fs.promises.access(tempDir).then(() => true).catch(() => false)) {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
        if (!this.isCancelled) {
          console.log('Temporary overlay files cleaned up successfully');
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup temporary overlay files:', error);
    }
  }

  private mapFontName(fontName: string): string {
    // Map font names to available system fonts
    switch (fontName) {
      case 'Inter':
      case 'Roboto':
      case 'Open Sans':
      case 'Source Sans Pro':
      case 'Noto Sans':
      case 'Ubuntu':
      case 'Montserrat':
      case 'Poppins':
      case 'Raleway':
      case 'Lato':
      case 'Nunito':
      case 'Quicksand':
        return `${fontName}, Arial, sans-serif`;
      case 'SF Pro Display':
      case 'Segoe UI':
        return 'Arial, sans-serif';
      case 'Arial':
        return 'Arial, sans-serif';
      case 'Helvetica':
        return 'Helvetica, Arial, sans-serif';
      default:
        return 'Arial, sans-serif';
    }
  }

  private parseColor(color: string): { r: number; g: number; b: number; a: number } {
    if (color === 'transparent') {
      return { r: 0, g: 0, b: 0, a: 0 };
    }
    
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const a = hex.length === 8 ? parseInt(hex.substr(6, 2), 16) / 255 : 1;
    
    return { r, g, b, a };
  }

  private applyTextTransform(text: string, transform?: string): string {
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
}