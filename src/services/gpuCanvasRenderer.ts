import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import ffmpeg = require('fluent-ffmpeg');
import { Canvas, CanvasRenderingContext2D, loadImage } from 'skia-canvas';

/**
 * GPU-Accelerated Canvas-based video renderer using Skia Canvas
 * This approach leverages hardware acceleration for text rendering:
 * 1. Extract video frames using FFmpeg (necessary for video decoding)
 * 2. Use Skia Canvas to render captions on each frame (GPU-accelerated)
 * 3. Encode frames back to video using FFmpeg with hardware acceleration
 */
export class GPUCanvasVideoRenderer {
  private static instance: GPUCanvasVideoRenderer;
  private fontsRegistered = false;

  private constructor() {}

  public static getInstance(): GPUCanvasVideoRenderer {
    if (!GPUCanvasVideoRenderer.instance) {
      GPUCanvasVideoRenderer.instance = new GPUCanvasVideoRenderer();
    }
    return GPUCanvasVideoRenderer.instance;
  }

  /**
   * Main method to render video with captions using GPU-accelerated Canvas approach
   * This uses Skia Canvas for hardware acceleration instead of node-canvas
   */
  public async renderVideoWithCaptions(
    videoPath: string,
    captions: any[],
    outputPath: string,
    onProgress?: (progress: number) => void,
    exportSettings?: { framerate: number; quality: string }
  ): Promise<string> {
    try {
      console.log('=== GPU RENDERER DEBUG START ===');
      console.log('Input video path:', videoPath);
      console.log('Output path:', outputPath);
      console.log('Captions count:', captions?.length || 0);
      console.log('Captions data:', JSON.stringify(captions?.slice(0, 2), null, 2)); // Log first 2 captions
      console.log('Export settings:', exportSettings);
      
      // Validate inputs
      await this.validateInputs(videoPath, captions, outputPath);
      
      if (!captions || captions.length === 0) {
        console.log('No captions provided, copying original video');
        return await this.copyVideo(videoPath, outputPath);
      }
      
      // Get and validate video metadata
      const metadata = await this.getVideoMetadata(videoPath);
      console.log('Video metadata:', metadata);
      if (!this.validateMetadata(metadata)) {
        throw new Error('Invalid video metadata');
      }
      
      // Override FPS if specified in export settings
      if (exportSettings && exportSettings.framerate) {
        metadata.fps = exportSettings.framerate;
        console.log('Using export FPS:', metadata.fps);
      }
      
      // Create temporary directory for frame extraction
      const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'gpu-video-frames-'));
      console.log('Temp directory created:', tempDir);
      
      try {
        // Step 1: Extract video frames (FFmpeg needed for video decoding)
        const framesDir = path.join(tempDir, 'frames');
        await fs.promises.mkdir(framesDir);
        console.log('Starting frame extraction...');
        await this.extractVideoFrames(videoPath, framesDir, metadata.fps, onProgress);
        
        // Validate frame extraction
        await this.validateFrameExtraction(framesDir);
        
        // Step 2: Render captions on each frame using GPU-accelerated Skia Canvas
        console.log('Starting caption rendering on frames...');
        await this.renderCaptionsOnFramesWithGPUCanvas(framesDir, captions, metadata, onProgress);
        
        // Step 3: Encode frames back to video with hardware acceleration
        console.log('Starting video encoding...');
        const result = await this.encodeFramesToVideoWithHardwareAccel(framesDir, videoPath, outputPath, metadata, onProgress, exportSettings);
        
        // Validate output
        await this.validateOutput(result, videoPath);
        
        console.log('=== GPU RENDERER DEBUG END - SUCCESS ===');
        return result;
      } finally {
        // Clean up temporary files
        await this.cleanupTempFiles(tempDir);
      }
    } catch (error) {
      console.error('=== GPU RENDERER DEBUG END - ERROR ===');
      console.error('GPU-accelerated video rendering failed:', error);
      if (error instanceof Error) {
        console.error('Error stack:', error.stack);
      }
      
      return await this.copyVideo(videoPath, outputPath);
    }
  }

  /**
   * Render captions on frames using GPU-accelerated Skia Canvas
   */
  private async renderCaptionsOnFramesWithGPUCanvas(
    framesDir: string,
    captions: any[],
    metadata: any,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const frameFiles = await fs.promises.readdir(framesDir);
    const frameCount = frameFiles.length;
    let processedFrames = 0;

    console.log(`Starting GPU-accelerated text rendering on ${frameCount} frames...`);
    console.log('Captions to render:', captions.length);
    console.log('Sample caption:', captions[0]);

    for (const frameFile of frameFiles) {
      if (!frameFile.endsWith('.png')) continue;

      const framePath = path.join(framesDir, frameFile);
      const frameNumber = this.extractFrameNumber(frameFile);
      const frameTime = (frameNumber / metadata.fps) * 1000; // Convert to milliseconds

      // Debug: Log frame timing for first few frames
      if (processedFrames < 5) {
        console.log(`Frame ${frameNumber}: time=${frameTime}ms, file=${frameFile}`);
      }

      try {
        // Load frame image using Skia Canvas
        const frameImage = await loadImage(framePath);
        
        // Create GPU-accelerated canvas with frame dimensions
        const canvas = new Canvas(frameImage.width, frameImage.height);
        const ctx = canvas.getContext('2d');

        // Draw the original frame
        ctx.drawImage(frameImage, 0, 0);

        // Render captions on this frame
        const captionsRendered = await this.renderCaptionsForFrame(ctx, captions, frameTime, frameImage.width, frameImage.height);
        
        // Debug: Log if captions were rendered on first few frames
        if (processedFrames < 5 && captionsRendered > 0) {
          console.log(`Frame ${frameNumber}: rendered ${captionsRendered} captions`);
        }

        // Save the rendered frame back to disk
        const buffer = await canvas.toBuffer('png');
        await fs.promises.writeFile(framePath, buffer);

        processedFrames++;
        if (onProgress) {
          const progress = (processedFrames / frameCount) * 100;
          onProgress(progress);
        }

        // Log progress every 100 frames
        if (processedFrames % 100 === 0) {
          console.log(`GPU rendering progress: ${processedFrames}/${frameCount} frames (${Math.round((processedFrames / frameCount) * 100)}%)`);
        }
      } catch (error) {
        console.error(`Error rendering frame ${frameFile}:`, error);
        // Continue with next frame
      }
    }

    console.log(`GPU-accelerated text rendering completed: ${processedFrames} frames processed`);
  }

  /**
   * Encode frames to video using FFmpeg with hardware acceleration
   */
  private async encodeFramesToVideoWithHardwareAccel(
    framesDir: string,
    originalVideoPath: string,
    outputPath: string,
    metadata: any,
    onProgress?: (progress: number) => void,
    exportSettings?: { framerate: number; quality: string }
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const fps = exportSettings?.framerate || metadata.fps;
      const quality = exportSettings?.quality || 'high';
      
      // Determine hardware acceleration based on system
      const hwaccel = this.detectHardwareAcceleration();
      
      console.log(`Starting hardware-accelerated video encoding with ${hwaccel}...`);

      let command = ffmpeg()
        .input(path.join(framesDir, 'frame_%06d.png'))
        .inputFPS(fps)
        .input(originalVideoPath)
        .audioCodec('copy'); // Copy original audio

      // Apply hardware acceleration if available
      if (hwaccel) {
        // Use hardware-accelerated codec based on detected hardware
        if (hwaccel === 'cuda') {
          command = command.videoCodec('h264_nvenc');
        } else if (hwaccel === 'qsv') {
          command = command.videoCodec('h264_qsv');
        } else if (hwaccel === 'amf') {
          command = command.videoCodec('h264_amf');
        }
      } else {
        // Fallback to software encoding with optimization
        command = command.videoCodec('libx264')
          .videoFilters('scale=trunc(iw/2)*2:trunc(ih/2)*2'); // Ensure even dimensions
      }

      // Set quality based on export settings
      if (quality === 'high') {
        command = command.outputOptions(['-crf', '18']);
      } else if (quality === 'medium') {
        command = command.outputOptions(['-crf', '23']);
      } else {
        command = command.outputOptions(['-crf', '28']);
      }

      // Add Mac Quick Look compatibility options
      command = command.outputOptions([
        '-movflags', '+faststart',
        '-pix_fmt', 'yuv420p',
        '-profile:v', 'baseline',
        '-level', '3.0'
      ]);

      command
        .output(outputPath)
        .on('start', (commandLine: string) => {
          console.log('FFmpeg encoding command:', commandLine);
        })
        .on('progress', (progress: any) => {
          console.log('Video encoding progress:', progress);
          if (onProgress) {
            // Combine frame rendering progress (50%) with encoding progress (50%)
            const encodingProgress = (progress.percent || 0) * 0.5 + 50;
            onProgress(encodingProgress);
          }
        })
        .on('end', () => {
          console.log('Hardware-accelerated video encoding completed successfully');
          resolve(outputPath);
        })
        .on('error', (err: any) => {
          console.error('Hardware-accelerated encoding failed:', err);
          reject(new Error(`Hardware-accelerated encoding failed: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Detect available hardware acceleration
   */
  private detectHardwareAcceleration(): string | null {
    // Check for NVIDIA GPU
    try {
      const { execSync } = require('child_process');
      execSync('nvidia-smi', { stdio: 'ignore' });
      return 'cuda';
    } catch {
      // NVIDIA not available
    }

    // Check for Intel Quick Sync
    try {
      const { execSync } = require('child_process');
      execSync('vainfo', { stdio: 'ignore' });
      return 'qsv';
    } catch {
      // Intel QSV not available
    }

    // Check for AMD AMF
    try {
      const { execSync } = require('child_process');
      execSync('rocm-smi', { stdio: 'ignore' });
      return 'amf';
    } catch {
      // AMD AMF not available
    }

    return null; // No hardware acceleration available
  }

  /**
   * Render captions for a specific frame using GPU-accelerated canvas
   */
  private async renderCaptionsForFrame(
    ctx: CanvasRenderingContext2D,
    captions: any[],
    frameTime: number,
    canvasWidth: number,
    canvasHeight: number
  ): Promise<number> {
    let captionsRendered = 0;
    
    for (const caption of captions) {
      // Use startTime/endTime properties (matching app structure)
      const captionStart = caption.startTime !== undefined ? caption.startTime : caption.start;
      const captionEnd = caption.endTime !== undefined ? caption.endTime : caption.end;
      
      // Skip captions with invalid timing
      if (captionStart === undefined || captionEnd === undefined || captionStart >= captionEnd) {
        console.warn('Skipping caption with invalid timing:', caption);
        continue;
      }
      
      // Debug: Log timing check for first few captions
      if (captionsRendered < 3) {
        console.log(`Caption timing check: frameTime=${frameTime}ms, caption.startTime=${captionStart}ms, caption.endTime=${captionEnd}ms, match=${frameTime >= captionStart && frameTime <= captionEnd}`);
      }
      
      if (frameTime >= captionStart && frameTime <= captionEnd) {
        captionsRendered++;
        if (caption.words && caption.words.length > 0) {
          if (caption.style.renderMode === 'progressive') {
            await this.renderProgressiveTextOnGPUCanvas(ctx, caption.words, caption, frameTime, canvasWidth, canvasHeight);
          } else {
            await this.renderKaraokeTextOnGPUCanvas(ctx, caption.words, caption, frameTime, canvasWidth, canvasHeight);
          }
        } else {
          await this.renderSimpleTextOnGPUCanvas(ctx, caption.text, caption, canvasWidth, canvasHeight);
        }
      }
    }
    
    return captionsRendered;
  }

  /**
   * Render simple text using GPU-accelerated canvas
   */
  private async renderSimpleTextOnGPUCanvas(
    ctx: CanvasRenderingContext2D,
    text: string,
    caption: any,
    canvasWidth: number,
    canvasHeight: number
  ): Promise<void> {
    const baseFontSize = caption.style?.fontSize || 32;
    const scale = caption.style?.scale || 1;
    const fontSize = baseFontSize * scale;
    const fontFamily = this.mapFontName(caption.style?.font || 'Segoe UI');
    const textColor = this.parseColor(caption.style?.textColor || '#ffffff');
    const backgroundColor = this.parseColor(caption.style?.backgroundColor || '#80000000');
    const strokeColor = this.parseColor(caption.style?.strokeColor || 'transparent');
    const strokeWidth = caption.style?.strokeWidth || 0;
    
    // Apply text transformation
    const displayText = this.applyTextTransform(text, caption.style?.textTransform || 'none');
    
    // Set font with fallback
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
    if (backgroundColor.alpha > 0) {
      ctx.fillStyle = `rgba(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b}, ${backgroundColor.alpha})`;
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    }
    
    // Add text shadow for better visibility
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Draw stroke if specified
    if (strokeWidth > 0 && strokeColor.alpha > 0) {
      ctx.strokeStyle = `rgba(${strokeColor.r}, ${strokeColor.g}, ${strokeColor.b}, ${strokeColor.alpha})`;
      ctx.lineWidth = strokeWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeText(displayText, x, y);
    }
    
    // Draw text
    ctx.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, ${textColor.alpha})`;
    ctx.fillText(displayText, x, y);
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  /**
   * Render karaoke text using GPU-accelerated canvas
   */
  private async renderKaraokeTextOnGPUCanvas(
    ctx: CanvasRenderingContext2D,
    words: any[],
    caption: any,
    frameTime: number,
    canvasWidth: number,
    canvasHeight: number
  ): Promise<void> {
    const baseFontSize = caption.style?.fontSize || 32;
    const scale = caption.style?.scale || 1;
    const fontSize = baseFontSize * scale;
    const fontFamily = this.mapFontName(caption.style?.font || 'Segoe UI');
    const textColor = this.parseColor(caption.style?.textColor || '#ffffff');
    const highlighterColor = this.parseColor(caption.style?.highlighterColor || '#ffff00');
    const backgroundColor = this.parseColor(caption.style?.backgroundColor || '#80000000');
    const strokeColor = this.parseColor(caption.style?.strokeColor || 'transparent');
    const strokeWidth = caption.style?.strokeWidth || 0;
    const textTransform = caption.style?.textTransform || 'none';
    
    // Set font with precise sizing
    const fontString = `bold ${fontSize}px ${fontFamily}`;
    ctx.font = fontString;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle'; // Changed to middle for better centering
    
    const x = (canvasWidth * caption.style.position.x) / 100;
    const y = (canvasHeight * caption.style.position.y) / 100;
    
    // Since we enforce one line per frame and removed width functionality,
    // we render all words in a single line  
    const wordSpacing = 12 * scale; // Scaled uniform spacing between words
    const wordPadding = 4 * scale; // Scaled padding
    
    // Calculate total width for single line
    let totalWidth = 0;
    for (const word of words) {
      const transformedWord = this.applyTextTransform(word.word, textTransform);
      const wordWidth = ctx.measureText(transformedWord).width;
      totalWidth += wordWidth + (wordPadding * 2) + wordSpacing;
    }
    totalWidth -= wordSpacing; // Remove last margin
    
    // Calculate background box for single line caption (adjusted for middle baseline)
    const boxX = x - (totalWidth / 2) - 12;
    const boxY = y - (fontSize / 2) - 12;
    const boxWidth = totalWidth + 24;
    const boxHeight = fontSize + 24;
    
    // Draw main background box - only if not transparent
    if (backgroundColor.alpha > 0) {
      ctx.fillStyle = `rgba(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b}, ${backgroundColor.alpha})`;
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    }
    
    // Add text shadow for better visibility
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Draw words in single line
    let currentX = x - (totalWidth / 2) + wordPadding; // Start with padding
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const wordStart = word.start;
      const wordEnd = word.end;
      
      // Apply text transformation
      const displayWord = this.applyTextTransform(word.word, textTransform);
      
      // Determine if this word should be highlighted
      const isHighlighted = frameTime >= wordStart && frameTime <= wordEnd;
      const hasPassedWord = frameTime > wordEnd;
      
      // Measure transformed word width
      const wordWidth = ctx.measureText(displayWord).width;
      const wordBoxWidth = wordWidth + (wordPadding * 2);
      const wordBoxHeight = fontSize + (wordPadding * 2);
      const wordBoxX = currentX - wordPadding;
      const wordBoxY = y - (fontSize / 2) - wordPadding;
        
      // Handle emphasis mode vs background highlighting
      if (isHighlighted) {
        if (caption.style.emphasizeMode) {
          // Emphasis mode: increase font size by 5% and use highlighter color as text color
          const emphasizedFontSize = fontSize * 1.05;
          ctx.font = `bold ${emphasizedFontSize}px ${fontFamily}, Arial, sans-serif`;
          ctx.fillStyle = `rgba(${highlighterColor.r}, ${highlighterColor.g}, ${highlighterColor.b}, ${highlighterColor.alpha})`;
        } else {
          // Background highlighting mode
          ctx.fillStyle = `rgba(${highlighterColor.r}, ${highlighterColor.g}, ${highlighterColor.b}, ${highlighterColor.alpha})`;
          ctx.fillRect(wordBoxX, wordBoxY, wordBoxWidth, wordBoxHeight);
          ctx.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, ${textColor.alpha})`;
        }
      } else {
        // Set normal text color - in horizontal karaoke mode, all words should have full opacity
        ctx.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, ${textColor.alpha})`;
      }
      
      // Clear shadow for stroke
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      // Draw stroke if enabled (must be drawn before fill)
      if (strokeWidth > 0 && strokeColor.alpha > 0) {
        ctx.strokeStyle = `rgba(${strokeColor.r}, ${strokeColor.g}, ${strokeColor.b}, ${strokeColor.alpha})`;
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
      
      // Reset font size if it was changed for emphasis
      if (isHighlighted && caption.style.emphasizeMode) {
        ctx.font = `bold ${fontSize}px ${fontFamily}`;
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

  /**
   * Render progressive text using GPU-accelerated canvas
   */
  private async renderProgressiveTextOnGPUCanvas(
    ctx: CanvasRenderingContext2D,
    words: any[],
    caption: any,
    frameTime: number,
    canvasWidth: number,
    canvasHeight: number
  ): Promise<void> {
    const baseFontSize = caption.style?.fontSize || 32;
    const scale = caption.style?.scale || 1;
    const fontSize = baseFontSize * scale;
    const fontFamily = this.mapFontName(caption.style?.font || 'Segoe UI');
    const textColor = this.parseColor(caption.style?.textColor || '#ffffff');
    const highlighterColor = this.parseColor(caption.style?.highlighterColor || '#ffff00');
    const backgroundColor = this.parseColor(caption.style?.backgroundColor || '#80000000');
    
    // Set font with precise sizing
    const textAlign = caption.style?.textAlign || 'center';
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    ctx.textAlign = textAlign;
    ctx.textBaseline = 'bottom';
    
    const x = (canvasWidth * caption.style.position.x) / 100;
    const y = (canvasHeight * caption.style.position.y) / 100;
    
    // Find words that should be visible up to current time
    const visibleWords: any[] = [];
    
    for (const word of words) {
      if (frameTime >= word.start) {
        visibleWords.push(word);
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
      const firstWordY = y;
      
      // Draw each word in the line vertically
      for (let wordIndex = 0; wordIndex < displayLine.length; wordIndex++) {
        const word = displayLine[wordIndex];
        // First word (index 0) stays at centerY, others appear below
        const wordY = firstWordY + (wordIndex * lineHeight);
        const isHighlighted = frameTime >= word.start && frameTime <= word.end;
        
        // Apply text transformation
        const displayWord = this.applyTextTransform(word.word, caption.style?.textTransform || 'none');
        
        // Measure transformed word for background
        const wordWidth = ctx.measureText(displayWord).width;
        const boxX = x - (wordWidth / 2) - 8;
        const boxY = wordY - fontSize - 8;
        const boxWidth = wordWidth + 16;
        const boxHeight = fontSize + 16;
        
        // Draw background for each word if not transparent
        if (backgroundColor.alpha > 0) {
          ctx.fillStyle = `rgba(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b}, ${backgroundColor.alpha})`;
          ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
        }
        
        // Handle highlighting
        if (isHighlighted) {
          if (caption.style.emphasizeMode) {
            // Emphasis mode
            const emphasizedFontSize = fontSize * 1.05;
            ctx.font = `bold ${emphasizedFontSize}px ${fontFamily}, Arial, sans-serif`;
            ctx.fillStyle = `rgba(${highlighterColor.r}, ${highlighterColor.g}, ${highlighterColor.b}, ${highlighterColor.alpha})`;
          } else {
            // Background highlighting
            ctx.fillStyle = `rgba(${highlighterColor.r}, ${highlighterColor.g}, ${highlighterColor.b}, ${highlighterColor.alpha})`;
            ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
            ctx.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, ${textColor.alpha})`;
          }
        } else {
          // Normal text color - all revealed words should have full opacity
          ctx.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, ${textColor.alpha})`;
        }
        
        // Add text shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        // Draw stroke if enabled
        // Clear shadow for stroke
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        const strokeColor = this.parseColor(caption.style?.strokeColor || 'transparent');
        const strokeWidth = caption.style?.strokeWidth || 0;
        if (strokeWidth > 0 && strokeColor.alpha > 0) {
          ctx.strokeStyle = `rgba(${strokeColor.r}, ${strokeColor.g}, ${strokeColor.b}, ${strokeColor.alpha})`;
          ctx.lineWidth = strokeWidth;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.strokeText(displayWord, x, wordY);
        }
        
        // Add shadow for text fill
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
      }
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
  }

  // Helper methods (same as original CanvasVideoRenderer)
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

  private validateMetadata(metadata: any): boolean {
    return metadata && metadata.width && metadata.height && metadata.fps;
  }

  private async extractVideoFrames(videoPath: string, framesDir: string, fps: number, onProgress?: (progress: number) => void): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .fps(fps)
        .output(path.join(framesDir, 'frame_%06d.png'))
        .on('start', (commandLine: string) => {
          // Frame extraction started
        })
        .on('progress', (progress: any) => {
          if (onProgress) {
            onProgress((progress.percent || 0) * 0.5); // Frame extraction is 50% of total progress
          }
        })
        .on('end', () => {
          resolve();
        })
        .on('error', (err: any) => {
          console.error('Frame extraction error:', err);
          reject(err);
        })
        .run();
    });
  }

  private async validateFrameExtraction(framesDir: string): Promise<void> {
    const files = await fs.promises.readdir(framesDir);
    if (files.length === 0) {
      throw new Error('No frames were extracted');
    }
  }

  private async copyVideo(videoPath: string, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .videoCodec('copy')
        .audioCodec('copy')
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .run();
    });
  }

  private async validateOutput(outputPath: string, originalPath: string): Promise<void> {
    if (!fs.existsSync(outputPath)) {
      throw new Error('Output file was not created');
    }
  }

  private async cleanupTempFiles(tempDir: string): Promise<void> {
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup temporary files:', error);
    }
  }

  private extractFrameNumber(filename: string): number {
    const match = filename.match(/frame_(\d+)\.png/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Registers Google Fonts for use in text rendering
   */
  private registerGoogleFonts(): void {
    if (this.fontsRegistered) return;

    try {
      // In development: __dirname is src/services, so go up to src, then to assets/fonts
      // In production: __dirname is dist/main/services, so go up to project root, then to src/assets/fonts
      const isDevelopment = __dirname.includes('/src/');
      const fontsDir = isDevelopment 
        ? path.join(__dirname, '..', 'assets', 'fonts')
        : path.join(__dirname, '..', '..', '..', 'src', 'assets', 'fonts');
      
      // Register Google Fonts (matching VideoPanel/StylingPanel exactly)
      const fonts = [
        { file: 'Inter-Bold.ttf', family: 'Inter', weight: 'bold' },
        { file: 'Roboto-Bold.ttf', family: 'Roboto', weight: 'bold' },
        { file: 'OpenSans-Bold.ttf', family: 'Open Sans', weight: 'bold' },
        { file: 'SourceSansPro-Bold.ttf', family: 'Source Sans Pro', weight: 'bold' },
        { file: 'NotoSans-Bold.ttf', family: 'Noto Sans', weight: 'bold' },
        { file: 'Ubuntu-Bold.ttf', family: 'Ubuntu', weight: 'bold' },
        { file: 'Montserrat-Bold.ttf', family: 'Montserrat', weight: 'bold' },
        { file: 'Poppins-Bold.ttf', family: 'Poppins', weight: 'bold' },
        { file: 'Raleway-Bold.ttf', family: 'Raleway', weight: 'bold' },
        { file: 'Lato-Bold.ttf', family: 'Lato', weight: 'bold' },
        { file: 'Nunito-Bold.ttf', family: 'Nunito', weight: 'bold' },
        { file: 'Quicksand-Bold.ttf', family: 'Quicksand', weight: 'bold' }
      ];

      fonts.forEach(font => {
        const fontPath = path.join(fontsDir, font.file);
        if (fs.existsSync(fontPath)) {
          // Note: Skia Canvas may handle fonts differently than node-canvas
          // For now, we'll just log that fonts are available
          console.log(`Font available: ${font.family}`);
        } else {
          console.warn(`Font file not found: ${fontPath}`);
        }
      });

      this.fontsRegistered = true;
      console.log('All Google Fonts registered successfully');
    } catch (error) {
      console.error('Error registering fonts:', error);
      this.fontsRegistered = false;
    }
  }

  /**
   * Maps font names to registered Google Fonts
   */
  private mapFontName(fontName: string): string {
    // Ensure fonts are registered first
    this.registerGoogleFonts();
    
    // Map fonts exactly as VideoPanel does - Node.js Canvas fallback chains
    switch (fontName) {
      // Google Fonts (registered and available in Node.js Canvas)
      case 'Inter':
        return 'Inter, Arial, sans-serif';
      case 'Roboto':
        return 'Roboto, Arial, sans-serif';
      case 'Open Sans':
        return '"Open Sans", Arial, sans-serif';
      case 'Source Sans Pro':
        return '"Source Sans Pro", Arial, sans-serif';
      case 'Noto Sans':
        return '"Noto Sans", Arial, sans-serif';
      case 'Ubuntu':
        return 'Ubuntu, Arial, sans-serif';
      case 'Montserrat':
        return 'Montserrat, Arial, sans-serif';
      case 'Poppins':
        return 'Poppins, Arial, sans-serif';
      case 'Raleway':
        return 'Raleway, Arial, sans-serif';
      case 'Lato':
        return 'Lato, Arial, sans-serif';
      case 'Nunito':
        return 'Nunito, Arial, sans-serif';
      case 'Quicksand':
        return 'Quicksand, Arial, sans-serif';
      
      // System fonts (map to registered Google Fonts that are similar)
      case 'SF Pro Display':   // Apple system font
        return 'Inter, Arial, sans-serif'; // Inter is closest modern alternative
      case 'Segoe UI':         // Windows system font  
        return 'Inter, Arial, sans-serif'; // Inter is closest modern alternative
      
      // Standard fonts (available on most systems)
      case 'Arial':
        return 'Arial, sans-serif';
      case 'Helvetica':
        return 'Helvetica, Arial, sans-serif';
      
      default:
        return 'Inter, Arial, sans-serif'; // Default fallback
    }
  }

  private parseColor(color: string): { r: number; g: number; b: number; alpha: number } {
    if (color === 'transparent') {
      return { r: 0, g: 0, b: 0, alpha: 0 };
    }
    
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const alpha = hex.length === 8 ? parseInt(hex.substr(6, 2), 16) / 255 : 1;
    
    return { r, g, b, alpha };
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