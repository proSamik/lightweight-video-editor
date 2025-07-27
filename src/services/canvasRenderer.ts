import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import ffmpeg = require('fluent-ffmpeg');
import { createCanvas, loadImage, Canvas, CanvasRenderingContext2D } from 'canvas';

/**
 * True web-compatible Canvas-based video renderer
 * This approach uses actual Canvas rendering for captions, just like in a web browser:
 * 1. Extract video frames using FFmpeg (necessary for video decoding)
 * 2. Use Canvas to render captions on each frame (web-compatible approach)
 * 3. Encode frames back to video using FFmpeg (necessary for video encoding)
 */
export class CanvasVideoRenderer {
  private static instance: CanvasVideoRenderer;

  private constructor() {}

  public static getInstance(): CanvasVideoRenderer {
    if (!CanvasVideoRenderer.instance) {
      CanvasVideoRenderer.instance = new CanvasVideoRenderer();
    }
    return CanvasVideoRenderer.instance;
  }

  /**
   * Main method to render video with captions using true Canvas approach
   * This mimics the web approach: extract frames, render captions on Canvas, re-encode
   */
  public async renderVideoWithCaptions(
    videoPath: string,
    captions: any[],
    outputPath: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      if (!captions || captions.length === 0) {
        return await this.copyVideo(videoPath, outputPath);
      }
      
      // Get video metadata
      const metadata = await this.getVideoMetadata(videoPath);
      
      // Create temporary directory for frame extraction
      const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'video-frames-'));
      
      try {
        // Step 1: Extract video frames (FFmpeg needed for video decoding)
        const framesDir = path.join(tempDir, 'frames');
        await fs.promises.mkdir(framesDir);
        await this.extractVideoFrames(videoPath, framesDir, metadata.fps, onProgress);
        
        // Step 2: Render captions on each frame using REAL Canvas (web-compatible)
        await this.renderCaptionsOnFramesWithCanvas(framesDir, captions, metadata, onProgress);
        
        // Step 3: Encode frames back to video with original audio (FFmpeg needed for encoding)
        const result = await this.encodeFramesToVideo(framesDir, videoPath, outputPath, metadata, onProgress);
        
        return result;
      } finally {
        // Clean up temporary files
        await this.cleanupTempFiles(tempDir);
      }
    } catch (error) {
      return await this.copyVideo(videoPath, outputPath);
    }
  }

  /**
   * Extracts video frames to individual image files
   * FFmpeg is necessary here for video decoding
   */
  private async extractVideoFrames(
    videoPath: string, 
    framesDir: string, 
    fps: number,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const command = ffmpeg(videoPath)
        .outputOptions([
          '-vf', `fps=${fps}`,
          '-frame_pts', '1'
        ])
        .output(path.join(framesDir, 'frame_%06d.png'))
        .on('start', (commandLine: string) => {
        })
        .on('progress', (progress: any) => {
          if (onProgress && progress.percent) {
            onProgress(progress.percent * 0.3); // 30% of total progress
          }
        })
        .on('end', () => {
          resolve();
        })
        .on('error', (err: any) => {
          reject(err);
        });

      command.run();
    });
  }

  /**
   * Renders captions on each frame using REAL Canvas (web-compatible approach)
   * This is exactly how you'd do it in a web browser
   */
  private async renderCaptionsOnFramesWithCanvas(
    framesDir: string,
    captions: any[],
    metadata: any,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    // Get frame files
    const frameFiles = await fs.promises.readdir(framesDir);
    const pngFiles = frameFiles.filter(file => file.endsWith('.png')).sort();
    
    // Process each frame
    for (let i = 0; i < pngFiles.length; i++) {
      const frameFile = pngFiles[i];
      const framePath = path.join(framesDir, frameFile);
      
      // Calculate current time for this frame
      const frameTime = (i / metadata.fps) * 1000; // Convert to milliseconds
      
      // Find captions that should be displayed at this time
      const activeCaptions = captions.filter(caption => 
        frameTime >= caption.startTime && frameTime <= caption.endTime
      );
      
      if (activeCaptions.length > 0) {
        // Render captions on this frame using Canvas
        await this.renderCaptionsOnFrameWithCanvas(framePath, activeCaptions, metadata, frameTime);
      }
      
      // Update progress with detailed logging
      const progress = 30 + (i / pngFiles.length) * 40; // 30-70% of total progress
      if (onProgress) {
        onProgress(progress);
      }
    }
  }

  /**
   * Renders captions on a single frame using REAL Canvas
   * This is exactly like drawing on HTML5 Canvas in a web browser
   */
  private async renderCaptionsOnFrameWithCanvas(
    framePath: string,
    activeCaptions: any[],
    metadata: any,
    frameTime: number
  ): Promise<void> {
    try {
      // Load the frame image
      const frameImage = await loadImage(framePath);
      
      // Create a canvas with the same dimensions as the video
      const canvas = createCanvas(metadata.width, metadata.height);
      const ctx = canvas.getContext('2d');
      
      // Draw the original frame
      ctx.drawImage(frameImage, 0, 0);
      
      // Render each active caption on the canvas
      for (const caption of activeCaptions) {
        await this.renderCaptionOnCanvas(ctx, caption, metadata, frameTime);
      }
      
      // Save the canvas as a new image
      const buffer = canvas.toBuffer('image/png');
      await fs.promises.writeFile(framePath, buffer);
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Renders a single caption on the Canvas context
   * This replicates the exact styling from the editor
   */
  private async renderCaptionOnCanvas(
    ctx: CanvasRenderingContext2D,
    caption: any,
    metadata: any,
    frameTime: number
  ): Promise<void> {
    try {
      // Calculate position (matching the VideoPanel exactly)
      // x: percentage from left (0-100)
      // y: percentage from top (0-100) - NOT from bottom!
      const x = (metadata.width * caption.style.position.x) / 100;
      const y = (metadata.height * caption.style.position.y) / 100;
      
      // Apply rotation if z rotation is specified
      if (caption.style.position.z && caption.style.position.z !== 0) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((caption.style.position.z * Math.PI) / 180);
        ctx.translate(-x, -y);
      }
      
      // Get text to render
      let text = caption.text;
      let words: any[] = [];
      
        if (caption.words && caption.words.length > 0) {
        words = caption.words;
      }
      
      // Draw text with word-level highlighting
      if (words.length > 0) {
        if (caption.style.renderMode === 'progressive') {
          await this.renderProgressiveTextOnCanvas(ctx, words, caption, frameTime, x, y);
        } else {
          await this.renderKaraokeTextOnCanvas(ctx, words, caption, frameTime, x, y);
        }
      } else {
        // Simple text without word-level timing
        await this.renderSimpleTextOnCanvas(ctx, text, caption, x, y);
      }
      
      // Restore context if rotation was applied
      if (caption.style.position.z && caption.style.position.z !== 0) {
        ctx.restore();
      }
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Parses color strings to RGBA values
   */
  private parseColor(colorStr: string): { r: number, g: number, b: number, a: number } {
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
    
    // Handle rgba colors
    if (colorStr.startsWith('rgba(')) {
      const match = colorStr.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
      if (match) {
        return {
          r: parseInt(match[1]),
          g: parseInt(match[2]),
          b: parseInt(match[3]),
          a: parseFloat(match[4])
        };
      }
    }
    
    // Handle rgb colors
    if (colorStr.startsWith('rgb(')) {
      const match = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        return {
          r: parseInt(match[1]),
          g: parseInt(match[2]),
          b: parseInt(match[3]),
          a: 1
        };
      }
    }
    
    // Default to white
    return { r: 255, g: 255, b: 255, a: 1 };
  }

  /**
   * Encodes processed frames back to video with original audio
   * FFmpeg is necessary here for video encoding
   */
  private async encodeFramesToVideo(
    framesDir: string,
    originalVideoPath: string,
    outputPath: string,
    metadata: any,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const command = ffmpeg()
        .input(path.join(framesDir, 'frame_%06d.png'))
        .inputOptions(['-framerate', metadata.fps.toString()])
        .input(originalVideoPath)
        .complexFilter([
          '[0:v][1:a]concat=n=1:v=1:a=1[outv][outa]'
        ])
        .outputOptions([
          '-map', '[outv]',
          '-map', '[outa]',
          '-c:v', 'libx264',
          '-c:a', 'aac',
          '-preset', 'medium',
          '-crf', '23',
          '-movflags', '+faststart', // Ensure video is web-compatible
          '-pix_fmt', 'yuv420p' // Ensure compatibility
        ])
        .output(outputPath)
        .on('start', (commandLine: string) => {
        })
        .on('progress', (progress: any) => {
          if (onProgress && progress.percent) {
            onProgress(70 + (progress.percent * 0.3)); // 70-100% of total progress
          }
        })
        .on('end', () => {
          resolve(outputPath);
        })
        .on('error', (err: any) => {
          reject(err);
        });

      command.run();
    });
  }

  /**
   * Gets video metadata using FFmpeg
   */
  private async getVideoMetadata(videoPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
          if (!videoStream) {
            reject(new Error('No video stream found in the file'));
            return;
          }
          resolve({
            width: videoStream.width,
            height: videoStream.height,
            duration: metadata.format.duration,
            fps: eval(videoStream.r_frame_rate || '30')
          });
        }
      });
    });
  }

  /**
   * Wraps text to fit within a specified width
   */
  private wrapTextToWidth(
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

  /**
   * Maps font names to Canvas-compatible fonts
   */
  private mapFontName(fontName: string): string {
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

  /**
   * Renders karaoke-style text with word-level highlighting on Canvas
   * This replicates the exact karaoke effect from the editor
   */
  private async renderKaraokeTextOnCanvas(
    ctx: CanvasRenderingContext2D,
    words: any[],
    caption: any,
    frameTime: number,
    centerX: number,
    centerY: number
  ): Promise<void> {
    try {
      const fontSize = caption.style?.fontSize || 32;
      const fontFamily = this.mapFontName(caption.style?.font || 'SF Pro Display Semibold');
      const textColor = this.parseColor(caption.style?.textColor || '#ffffff');
      const highlighterColor = this.parseColor(caption.style?.highlighterColor || '#ffff00');
      const backgroundColor = this.parseColor(caption.style?.backgroundColor || '#80000000');
      
      // Set font with precise sizing
      ctx.font = `bold ${fontSize}px ${fontFamily}, Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle'; // Changed to middle for better centering
      
      // Since we enforce one line per frame and removed width functionality,
      // we render all words in a single line  
      const wordSpacing = 12; // Increased uniform spacing between words
      const wordPadding = 4; // padding from editor
      
      // Calculate total width for single line
      let totalWidth = 0;
      for (const word of words) {
        const wordWidth = ctx.measureText(word.word).width;
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
        
        // Determine if this word should be highlighted
        const isHighlighted = frameTime >= wordStart && frameTime <= wordEnd;
        const hasPassedWord = frameTime > wordEnd;
        
        // Measure word width
        const wordWidth = ctx.measureText(word.word).width;
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
          
        // Draw the word
        ctx.fillText(word.word, currentX + wordWidth/2, centerY);
        
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
      
    } catch (error) {
      console.error('Error in karaoke text rendering:', error);
      throw error;
    }
  }

  /**
   * Renders simple text on Canvas (no karaoke highlighting)
   */
  private async renderSimpleTextOnCanvas(
    ctx: CanvasRenderingContext2D,
    text: string,
    caption: any,
    x: number,
    y: number
  ): Promise<void> {
    try {
      const fontSize = caption.style?.fontSize || 32;
      const fontFamily = this.mapFontName(caption.style?.font || 'SF Pro Display Semibold');
      const textColor = this.parseColor(caption.style?.textColor || '#ffffff');
      const backgroundColor = this.parseColor(caption.style?.backgroundColor || '#80000000');
      
      // Set font with fallback
      ctx.font = `bold ${fontSize}px ${fontFamily}, Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle'; // Changed to middle for better centering
      
      // Measure text for background box
      const textMetrics = ctx.measureText(text);
      const textWidth = textMetrics.width;
      const textHeight = fontSize;
      
      // Calculate background box position and size (matching editor padding, adjusted for middle baseline)
      const boxX = x - (textWidth / 2) - 12; // 12px padding from editor
      const boxY = y - (textHeight / 2) - 12; // Adjusted for middle baseline
      const boxWidth = textWidth + 24; // 12px padding on each side
      const boxHeight = textHeight + 24; // 12px padding top/bottom
      
      // Draw background box (matching editor's caption background) - only if not transparent
      if (backgroundColor.a > 0) {
        ctx.fillStyle = `rgba(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b}, ${backgroundColor.a})`;
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
      }
      
      // Add text shadow for better visibility (matching editor)
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
      
    } catch (error) {
      console.error('Error in simple text rendering:', error);
      throw error;
    }
  }

  /**
   * Copies video without modifications
   */
  private async copyVideo(inputPath: string, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log(`Copying video from ${inputPath} to ${outputPath}`);
      
      ffmpeg(inputPath)
        .videoCodec('copy')
        .audioCodec('copy')
        .output(outputPath)
        .on('start', (commandLine: string) => {
          console.log('FFmpeg copy command:', commandLine);
        })
        .on('end', () => {
          console.log('Video copy completed');
          resolve(outputPath);
        })
        .on('error', (err: any) => {
          console.error('FFmpeg copy error:', err);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Renders progressive text reveal on Canvas (vertical line-by-line)
   */
  private async renderProgressiveTextOnCanvas(
    ctx: CanvasRenderingContext2D,
    words: any[],
    caption: any,
    frameTime: number,
    centerX: number,
    centerY: number
  ): Promise<void> {
    try {
      const fontSize = caption.style?.fontSize || 32;
      const fontFamily = this.mapFontName(caption.style?.font || 'SF Pro Display Semibold');
      const textColor = this.parseColor(caption.style?.textColor || '#ffffff');
      const highlighterColor = this.parseColor(caption.style?.highlighterColor || '#ffff00');
      const backgroundColor = this.parseColor(caption.style?.backgroundColor || '#80000000');
      
      // Set font with precise sizing
      ctx.font = `bold ${fontSize}px ${fontFamily}, Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      
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
        
        // Calculate vertical position for the line
        const lineY = centerY - ((displayLine.length - 1) * lineHeight) / 2;
        
        // Draw each word in the line vertically
        for (let wordIndex = 0; wordIndex < displayLine.length; wordIndex++) {
          const word = displayLine[wordIndex];
          const wordY = lineY + (wordIndex * lineHeight);
          const isHighlighted = frameTime >= word.start && frameTime <= word.end;
          
          // Measure word for background
          const wordWidth = ctx.measureText(word.word).width;
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
            // Normal text color (slightly transparent for non-current words)
            const alpha = wordIndex === displayLine.length - 1 ? textColor.a : 0.6;
            ctx.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, ${alpha})`;
          }
          
          // Add text shadow
          ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          
          // Draw the word
          ctx.fillText(word.word, centerX, wordY);
          
          // Reset font size if changed
          if (isHighlighted && caption.style.emphasizeMode) {
            ctx.font = `bold ${fontSize}px ${fontFamily}, Arial, sans-serif`;
          }
        }
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }
      
    } catch (error) {
      console.error('Error in progressive text rendering:', error);
      throw error;
    }
  }

  /**
   * Cleans up temporary files
   */
  private async cleanupTempFiles(tempDir: string): Promise<void> {
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
      console.log('Temporary files cleaned up');
    } catch (error) {
      console.warn('Failed to cleanup temporary files:', error);
    }
  }
}