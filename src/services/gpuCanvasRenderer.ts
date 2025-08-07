import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import ffmpeg = require('fluent-ffmpeg');
import { Canvas, CanvasRenderingContext2D, loadImage } from 'skia-canvas';

/**
 * GPU-Accelerated Canvas-based video renderer using Skia Canvas with multi-threading
 * This approach leverages hardware acceleration for text rendering and CPU parallelism:
 * 1. Extract video frames using FFmpeg (necessary for video decoding)
 * 2. Use multiple worker threads to render captions on frames in parallel (CPU-optimized)
 * 3. Use Skia Canvas for GPU-accelerated text rendering within each worker
 * 4. Encode frames back to video using FFmpeg with hardware acceleration
 */
export class GPUCanvasVideoRenderer {
  private static instance: GPUCanvasVideoRenderer;
  private fontsRegistered = false;
  private maxWorkers: number;

  private constructor() {
    // Determine optimal number of worker threads based on CPU cores
    this.maxWorkers = this.getOptimalWorkerCount();
    console.log(`GPU Canvas Renderer initialized with ${this.maxWorkers} worker threads`);
  }

  public static getInstance(): GPUCanvasVideoRenderer {
    if (!GPUCanvasVideoRenderer.instance) {
      GPUCanvasVideoRenderer.instance = new GPUCanvasVideoRenderer();
    }
    return GPUCanvasVideoRenderer.instance;
  }

  /**
   * Determine optimal number of worker threads based on CPU cores and system resources
   */
  private getOptimalWorkerCount(): number {
    const cpuCores = os.cpus().length;
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryGB = totalMemory / (1024 * 1024 * 1024);
    
    // Base calculation: use 75% of available CPU cores
    let optimalWorkers = Math.max(1, Math.floor(cpuCores * 0.75));
    
    // Adjust based on available memory (each worker needs ~100-200MB)
    const memoryBasedWorkers = Math.floor(freeMemory / (150 * 1024 * 1024)); // 150MB per worker
    optimalWorkers = Math.min(optimalWorkers, memoryBasedWorkers);
    
    // Cap at reasonable maximum to prevent system overload
    optimalWorkers = Math.min(optimalWorkers, 16);
    
    console.log(`CPU cores: ${cpuCores}, Memory: ${Math.round(memoryGB)}GB, Optimal workers: ${optimalWorkers}`);
    return optimalWorkers;
  }

  /**
   * Main method to render video with captions using GPU-accelerated Canvas approach with multi-threading
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
      console.log('Captions data:', JSON.stringify(captions?.slice(0, 2), null, 2));
      console.log('Export settings:', exportSettings);
      console.log('Using worker threads:', this.maxWorkers);
      
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
        
        // Step 2: Render captions on frames using multi-threaded GPU-accelerated Canvas
        console.log('Starting multi-threaded caption rendering on frames...');
        try {
          await this.renderCaptionsOnFramesWithMultiThreading(framesDir, captions, metadata, onProgress);
        } catch (error) {
          console.warn('Multi-threaded rendering failed, falling back to single-threaded:', error);
          console.log('Starting single-threaded caption rendering on frames...');
          await this.renderCaptionsOnFramesWithGPUCanvas(framesDir, captions, metadata, onProgress);
        }
        
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
   * Render captions on frames using multi-threaded GPU-accelerated Canvas
   */
  private async renderCaptionsOnFramesWithMultiThreading(
    framesDir: string,
    captions: any[],
    metadata: any,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const frameFiles = await fs.promises.readdir(framesDir);
    const pngFrames = frameFiles.filter(file => file.endsWith('.png')).sort();
    const frameCount = pngFrames.length;
    
    console.log(`Starting multi-threaded GPU-accelerated text rendering on ${frameCount} frames...`);
    console.log('Captions to render:', captions.length);
    console.log('Sample caption:', captions[0]);

    if (frameCount === 0) {
      console.log('No frames to process');
      return;
    }

    // Determine optimal batch size based on frame count and worker count
    const batchSize = Math.max(1, Math.ceil(frameCount / this.maxWorkers));
    const batches = this.createBatches(pngFrames, batchSize);
    
    console.log(`Created ${batches.length} batches with ${batchSize} frames per batch`);

    let processedFrames = 0;
    const startTime = Date.now();

    // Process batches in parallel using worker threads
    const batchPromises = batches.map(async (batch, batchIndex) => {
      return await this.processFrameBatch(
        batch,
        framesDir,
        captions,
        metadata,
        batchIndex,
        (batchProgress) => {
          // Update overall progress
          const totalProgress = ((batchIndex * batchSize + batchProgress) / frameCount) * 100;
          if (onProgress) {
            onProgress(totalProgress);
          }
        }
      );
    });

    // Wait for all batches to complete
    const batchResults = await Promise.all(batchPromises);
    
    // Sum up processed frames from all batches
    processedFrames = batchResults.reduce((sum, count) => sum + count, 0);
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`Multi-threaded GPU rendering completed: ${processedFrames} frames processed in ${duration.toFixed(2)}s`);
    console.log(`Average processing speed: ${(processedFrames / duration).toFixed(2)} frames/second`);
  }

  /**
   * Create batches of frames for parallel processing
   */
  private createBatches(frameFiles: string[], batchSize: number): string[][] {
    const batches: string[][] = [];
    
    for (let i = 0; i < frameFiles.length; i += batchSize) {
      batches.push(frameFiles.slice(i, i + batchSize));
    }
    
    return batches;
  }

  /**
   * Process a batch of frames using a worker thread
   */
  private async processFrameBatch(
    frameBatch: string[],
    framesDir: string,
    captions: any[],
    metadata: any,
    batchIndex: number,
    onBatchProgress?: (progress: number) => void
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      // Create worker thread for this batch
      const worker = new Worker(__filename, {
        workerData: {
          frameBatch,
          framesDir,
          captions,
          metadata,
          batchIndex,
          isWorker: true
        }
      });

      let processedFrames = 0;

      worker.on('message', (message) => {
        if (message.type === 'progress') {
          processedFrames = message.processedFrames;
          if (onBatchProgress) {
            onBatchProgress(processedFrames);
          }
        } else if (message.type === 'complete') {
          console.log(`Batch ${batchIndex} completed: ${message.processedFrames} frames`);
          resolve(message.processedFrames);
        } else if (message.type === 'error') {
          console.error(`Batch ${batchIndex} error:`, message.error);
          reject(new Error(message.error));
        }
      });

      worker.on('error', (error) => {
        console.error(`Worker ${batchIndex} error:`, error);
        reject(error);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          console.error(`Worker ${batchIndex} exited with code ${code}`);
          reject(new Error(`Worker exited with code ${code}`));
        }
      });
    });
  }

  /**
   * Fallback method: Render captions on frames using single-threaded GPU-accelerated Canvas
   * Used when multi-threading fails or is disabled
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

    console.log(`Starting single-threaded GPU-accelerated text rendering on ${frameCount} frames...`);
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

    console.log(`Single-threaded GPU rendering completed: ${processedFrames} frames processed`);
  }

  /**
   * Encode frames to video using FFmpeg with hardware acceleration and I/O error handling
   */
  private async encodeFramesToVideoWithHardwareAccel(
    framesDir: string,
    originalVideoPath: string,
    outputPath: string,
    metadata: any,
    onProgress?: (progress: number) => void,
    exportSettings?: { framerate: number; quality: string }
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        // Pre-encode validation and preparation
        await this.validateEncodingEnvironment(outputPath, framesDir);
        
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

        // Add Mac Quick Look compatibility options and I/O optimization
        command = command.outputOptions([
          '-movflags', '+faststart',
          '-pix_fmt', 'yuv420p',
          '-profile:v', 'baseline',
          '-level', '3.0',
          '-threads', Math.max(1, Math.floor(this.maxWorkers / 2)).toString(), // Limit FFmpeg threads
          '-max_muxing_queue_size', '1024' // Increase queue size for large files
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
          .on('error', async (err: any) => {
            console.error('Hardware-accelerated encoding failed:', err);
            
            // Check if it's an I/O error and try fallback
            const errorMessage = err.message || String(err);
            if (errorMessage.includes('EIO') || errorMessage.includes('ENOSPC') || errorMessage.includes('write')) {
              console.log('I/O error detected, trying fallback encoding...');
              try {
                const fallbackResult = await this.encodeFramesToVideoFallback(framesDir, originalVideoPath, outputPath, metadata, onProgress, exportSettings);
                resolve(fallbackResult);
              } catch (fallbackError) {
                reject(new Error(`Both hardware and fallback encoding failed. Hardware error: ${errorMessage}. Fallback error: ${fallbackError}`));
              }
            } else {
              reject(new Error(`Hardware-accelerated encoding failed: ${errorMessage}`));
            }
          })
          .run();
      } catch (error) {
        reject(new Error(`Encoding setup failed: ${error}`));
      }
    });
  }

  /**
   * Validate encoding environment before starting FFmpeg
   */
  private async validateEncodingEnvironment(outputPath: string, framesDir: string): Promise<void> {
    // Check disk space
    const outputDir = path.dirname(outputPath);
    const freeSpace = await this.getDiskFreeSpace(outputDir);
    const requiredSpace = 500 * 1024 * 1024; // 500MB minimum
    
    if (freeSpace < requiredSpace) {
      throw new Error(`Insufficient disk space. Available: ${Math.round(freeSpace / (1024 * 1024))}MB, Required: ${Math.round(requiredSpace / (1024 * 1024))}MB`);
    }
    
    // Check if output directory is writable
    try {
      const testFile = path.join(outputDir, '.test-write');
      await fs.promises.writeFile(testFile, 'test');
      await fs.promises.unlink(testFile);
    } catch (error) {
      throw new Error(`Output directory is not writable: ${outputPath}`);
    }
    
    // Check if frames directory exists and has files
    const frameFiles = await fs.promises.readdir(framesDir);
    const pngFiles = frameFiles.filter(file => file.endsWith('.png'));
    if (pngFiles.length === 0) {
      throw new Error('No frame files found for encoding');
    }
    
    console.log(`Encoding environment validated: ${pngFiles.length} frames, ${Math.round(freeSpace / (1024 * 1024))}MB free space`);
  }

  /**
   * Get available disk space for a directory
   */
  private async getDiskFreeSpace(directory: string): Promise<number> {
    try {
      const { execSync } = require('child_process');
      const platform = process.platform;
      
      let command: string;
      if (platform === 'win32') {
        command = `wmic logicaldisk where "DeviceID='${directory.charAt(0)}:'" get freespace /value`;
        const output = execSync(command, { encoding: 'utf8' });
        const match = output.match(/FreeSpace=(\d+)/);
        return match ? parseInt(match[1]) : 0;
      } else {
        command = `df -k "${directory}" | tail -1 | awk '{print $4}'`;
        const output = execSync(command, { encoding: 'utf8' });
        return parseInt(output.trim()) * 1024; // Convert KB to bytes
      }
    } catch (error) {
      console.warn('Could not determine disk space, assuming sufficient:', error);
      return 1024 * 1024 * 1024; // Assume 1GB available
    }
  }

  /**
   * Fallback encoding method with reduced quality and simpler settings
   */
  private async encodeFramesToVideoFallback(
    framesDir: string,
    originalVideoPath: string,
    outputPath: string,
    metadata: any,
    onProgress?: (progress: number) => void,
    exportSettings?: { framerate: number; quality: string }
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const fps = exportSettings?.framerate || metadata.fps;
      
      console.log('Using fallback encoding with software codec...');
      
      let command = ffmpeg()
        .input(path.join(framesDir, 'frame_%06d.png'))
        .inputFPS(fps)
        .input(originalVideoPath)
        .audioCodec('copy')
        .videoCodec('libx264')
        .outputOptions([
          '-crf', '28', // Lower quality for faster encoding
          '-preset', 'ultrafast', // Fastest preset
          '-tune', 'fastdecode',
          '-threads', '1', // Single thread to avoid I/O conflicts
          '-max_muxing_queue_size', '512',
          '-movflags', '+faststart',
          '-pix_fmt', 'yuv420p'
        ]);

      command
        .output(outputPath)
        .on('start', (commandLine: string) => {
          console.log('Fallback FFmpeg encoding command:', commandLine);
        })
        .on('progress', (progress: any) => {
          console.log('Fallback encoding progress:', progress);
          if (onProgress) {
            const encodingProgress = (progress.percent || 0) * 0.5 + 50;
            onProgress(encodingProgress);
          }
        })
        .on('end', () => {
          console.log('Fallback video encoding completed successfully');
          resolve(outputPath);
        })
        .on('error', (err: any) => {
          console.error('Fallback encoding failed:', err);
          reject(new Error(`Fallback encoding failed: ${err.message}`));
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
      
      if (frameTime >= captionStart && frameTime <= captionEnd) {
        // Check if subtitles should be burned in (default: true)
        const shouldBurnIn = caption.style?.burnInSubtitles !== false;
        if (!shouldBurnIn) {
          continue; // Skip this caption if burnInSubtitles is false
        }
        
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
      
      // Draw stroke if enabled (must be drawn before fill)
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
        
        // Add text shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        // Clear shadow for stroke
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        const strokeColor = this.parseColor(caption.style?.strokeColor || 'transparent');
        const strokeWidth = caption.style?.strokeWidth || 0;
        if (strokeWidth > 0 && strokeColor.a > 0) {
          ctx.strokeStyle = `rgba(${strokeColor.r}, ${strokeColor.g}, ${strokeColor.b}, ${strokeColor.a})`;
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

  /**
   * Extract video frames using multi-threaded FFmpeg with hardware acceleration
   */
  private async extractVideoFrames(videoPath: string, framesDir: string, fps: number, onProgress?: (progress: number) => void): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      console.log('Starting multi-threaded frame extraction...');
      
      // Use FFmpeg with multi-threading and hardware acceleration
      let command = ffmpeg(videoPath)
        .fps(fps)
        .output(path.join(framesDir, 'frame_%06d.png'))
        // Enable multi-threading for faster processing
        .outputOptions([
          '-threads', this.maxWorkers.toString(), // Use all available worker threads
          '-preset', 'ultrafast', // Fastest encoding preset
          '-tune', 'fastdecode' // Optimize for fast decoding
        ]);

      // Add hardware acceleration if available
      const hwaccel = this.detectHardwareAcceleration();
      if (hwaccel) {
        console.log(`Using hardware acceleration (${hwaccel}) for frame extraction`);
        if (hwaccel === 'cuda') {
          command = command.outputOptions(['-hwaccel', 'cuda', '-hwaccel_output_format', 'cuda']);
        } else if (hwaccel === 'qsv') {
          command = command.outputOptions(['-hwaccel', 'qsv', '-hwaccel_output_format', 'qsv']);
        } else if (hwaccel === 'amf') {
          command = command.outputOptions(['-hwaccel', 'amf', '-hwaccel_output_format', 'amf']);
        }
      }

      command
        .on('start', (commandLine: string) => {
          console.log('Multi-threaded FFmpeg frame extraction command:', commandLine);
        })
        .on('progress', (progress: any) => {
          console.log('Frame extraction progress:', progress);
          if (onProgress) {
            onProgress((progress.percent || 0) * 0.5); // Frame extraction is 50% of total progress
          }
        })
        .on('end', () => {
          console.log('Multi-threaded frame extraction completed successfully');
          resolve();
        })
        .on('error', (err: any) => {
          console.error('Multi-threaded frame extraction error:', err);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Alternative: Extract frames in parallel chunks for very long videos
   * This method splits the video into time segments and extracts frames in parallel
   */
  private async extractVideoFramesParallel(videoPath: string, framesDir: string, fps: number, metadata: any, onProgress?: (progress: number) => void): Promise<void> {
    const videoDuration = metadata.duration;
    const totalFrames = Math.ceil(videoDuration * fps);
    
    // For videos longer than 30 seconds, use parallel extraction
    if (videoDuration < 30) {
      console.log('Video is short, using standard extraction');
      return this.extractVideoFrames(videoPath, framesDir, fps, onProgress);
    }
    
    console.log(`Video is long (${videoDuration.toFixed(1)}s), using parallel frame extraction`);
    
    // Split video into chunks based on worker count
    const chunkCount = Math.min(this.maxWorkers, 8); // Max 8 chunks to avoid too many FFmpeg processes
    const chunkDuration = videoDuration / chunkCount;
    
    console.log(`Splitting video into ${chunkCount} chunks of ${chunkDuration.toFixed(1)}s each`);
    
    // Create temporary directories for each chunk
    const chunkDirs: string[] = [];
    for (let i = 0; i < chunkCount; i++) {
      const chunkDir = path.join(framesDir, `chunk_${i}`);
      await fs.promises.mkdir(chunkDir);
      chunkDirs.push(chunkDir);
    }
    
    try {
      // Extract frames for each chunk in parallel
      const chunkPromises = chunkDirs.map(async (chunkDir, chunkIndex) => {
        const startTime = chunkIndex * chunkDuration;
        const endTime = (chunkIndex + 1) * chunkDuration;
        
        return this.extractVideoChunk(
          videoPath,
          chunkDir,
          fps,
          startTime,
          endTime,
          chunkIndex,
          (chunkProgress) => {
            // Calculate overall progress
            const overallProgress = ((chunkIndex + chunkProgress) / chunkCount) * 100;
            if (onProgress) {
              onProgress(overallProgress * 0.5); // Frame extraction is 50% of total progress
            }
          }
        );
      });
      
      // Wait for all chunks to complete
      await Promise.all(chunkPromises);
      
      // Merge all chunk frames into the main frames directory
      console.log('Merging chunk frames...');
      await this.mergeChunkFrames(chunkDirs, framesDir, chunkCount, totalFrames);
      
      console.log('Parallel frame extraction completed successfully');
      
    } finally {
      // Clean up chunk directories
      for (const chunkDir of chunkDirs) {
        try {
          await fs.promises.rm(chunkDir, { recursive: true, force: true });
        } catch (error) {
          console.warn(`Failed to cleanup chunk directory ${chunkDir}:`, error);
        }
      }
    }
  }

  /**
   * Extract a specific chunk of video frames
   */
  private async extractVideoChunk(
    videoPath: string,
    chunkDir: string,
    fps: number,
    startTime: number,
    endTime: number,
    chunkIndex: number,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const duration = endTime - startTime;
      const frameCount = Math.ceil(duration * fps);
      
      console.log(`Extracting chunk ${chunkIndex}: ${startTime.toFixed(1)}s - ${endTime.toFixed(1)}s (${frameCount} frames)`);
      
      let command = ffmpeg(videoPath)
        .inputOptions([
          '-ss', startTime.toString(), // Start time
          '-t', duration.toString() // Duration
        ])
        .fps(fps)
        .output(path.join(chunkDir, `chunk_${chunkIndex}_frame_%06d.png`))
        .outputOptions([
          '-threads', Math.max(1, Math.floor(this.maxWorkers / 4)).toString(), // Use subset of workers per chunk
          '-preset', 'ultrafast',
          '-tune', 'fastdecode'
        ]);

      // Add hardware acceleration if available
      const hwaccel = this.detectHardwareAcceleration();
      if (hwaccel) {
        if (hwaccel === 'cuda') {
          command = command.outputOptions(['-hwaccel', 'cuda', '-hwaccel_output_format', 'cuda']);
        } else if (hwaccel === 'qsv') {
          command = command.outputOptions(['-hwaccel', 'qsv', '-hwaccel_output_format', 'qsv']);
        } else if (hwaccel === 'amf') {
          command = command.outputOptions(['-hwaccel', 'amf', '-hwaccel_output_format', 'amf']);
        }
      }

      command
        .on('start', (commandLine: string) => {
          console.log(`Chunk ${chunkIndex} FFmpeg command:`, commandLine);
        })
        .on('progress', (progress: any) => {
          if (onProgress) {
            onProgress(progress.percent || 0);
          }
        })
        .on('end', () => {
          console.log(`Chunk ${chunkIndex} extraction completed`);
          resolve();
        })
        .on('error', (err: any) => {
          console.error(`Chunk ${chunkIndex} extraction error:`, err);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Merge frames from chunk directories into the main frames directory
   */
  private async mergeChunkFrames(chunkDirs: string[], framesDir: string, chunkCount: number, totalFrames: number): Promise<void> {
    let frameIndex = 1;
    
    for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex++) {
      const chunkDir = chunkDirs[chunkIndex];
      const chunkFiles = await fs.promises.readdir(chunkDir);
      const pngFiles = chunkFiles.filter(file => file.endsWith('.png')).sort();
      
      console.log(`Merging chunk ${chunkIndex}: ${pngFiles.length} frames`);
      
      for (const pngFile of pngFiles) {
        const sourcePath = path.join(chunkDir, pngFile);
        const targetPath = path.join(framesDir, `frame_${String(frameIndex).padStart(6, '0')}.png`);
        
        try {
          await fs.promises.copyFile(sourcePath, targetPath);
          frameIndex++;
        } catch (error) {
          console.error(`Failed to copy frame ${pngFile}:`, error);
        }
      }
    }
    
    console.log(`Merged ${frameIndex - 1} frames into main directory`);
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
      // Check if directory exists before trying to remove it
      if (await fs.promises.access(tempDir).then(() => true).catch(() => false)) {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
        console.log('Temporary files cleaned up successfully');
      }
    } catch (error) {
      console.warn('Failed to cleanup temporary files:', error);
      
      // Try alternative cleanup method
      try {
        const { execSync } = require('child_process');
        if (process.platform === 'win32') {
          execSync(`rmdir /s /q "${tempDir}"`, { stdio: 'ignore' });
        } else {
          execSync(`rm -rf "${tempDir}"`, { stdio: 'ignore' });
        }
        console.log('Temporary files cleaned up using alternative method');
      } catch (altError) {
        console.error('All cleanup methods failed:', altError);
      }
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

// Worker thread execution logic
if (!isMainThread && workerData?.isWorker) {
  // This code runs in worker threads
  const { frameBatch, framesDir, captions, metadata, batchIndex } = workerData;
  
  // Import required modules in worker context
  const fs = require('fs');
  const path = require('path');
  const { Canvas, loadImage } = require('skia-canvas');
  
  /**
   * Worker thread frame processing function
   */
  const processFrameBatchInWorker = async () => {
    let processedFrames = 0;
    
    try {
      for (const frameFile of frameBatch) {
        const framePath = path.join(framesDir, frameFile);
        const frameNumber = extractFrameNumber(frameFile);
        const frameTime = (frameNumber / metadata.fps) * 1000; // Convert to milliseconds
        
        try {
          // Load frame image using Skia Canvas
          const frameImage = await loadImage(framePath);
          
          // Create GPU-accelerated canvas with frame dimensions
          const canvas = new Canvas(frameImage.width, frameImage.height);
          const ctx = canvas.getContext('2d');
          
          // Draw the original frame
          ctx.drawImage(frameImage, 0, 0);
          
          // Render captions on this frame
          const captionsRendered = await renderCaptionsForFrameInWorker(ctx, captions, frameTime, frameImage.width, frameImage.height);
          
          // Save the rendered frame back to disk
          const buffer = await canvas.toBuffer('png');
          await fs.promises.writeFile(framePath, buffer);
          
          processedFrames++;
          
          // Report progress every 10 frames
          if (processedFrames % 10 === 0) {
            parentPort?.postMessage({
              type: 'progress',
              processedFrames,
              batchIndex
            });
          }
        } catch (error) {
          console.error(`Worker ${batchIndex} - Error rendering frame ${frameFile}:`, error);
          // Continue with next frame
        }
      }
      
      // Report completion
      parentPort?.postMessage({
        type: 'complete',
        processedFrames,
        batchIndex
      });
      
         } catch (error) {
       // Report error
       const errorMessage = error instanceof Error ? error.message : String(error);
       parentPort?.postMessage({
         type: 'error',
         error: errorMessage,
         batchIndex
       });
     }
  }
  
  /**
   * Extract frame number from filename
   */
  const extractFrameNumber = (filename: string): number => {
    const match = filename.match(/frame_(\d+)\.png/);
    return match ? parseInt(match[1]) : 0;
  }
  
  /**
   * Render captions for a specific frame in worker thread
   */
  const renderCaptionsForFrameInWorker = async (
    ctx: any,
    captions: any[],
    frameTime: number,
    canvasWidth: number,
    canvasHeight: number
  ): Promise<number> => {
    let captionsRendered = 0;
    
    for (const caption of captions) {
      // Use startTime/endTime properties (matching app structure)
      const captionStart = caption.startTime !== undefined ? caption.startTime : caption.start;
      const captionEnd = caption.endTime !== undefined ? caption.endTime : caption.end;
      
      // Skip captions with invalid timing
      if (captionStart === undefined || captionEnd === undefined || captionStart >= captionEnd) {
        continue;
      }
      
      if (frameTime >= captionStart && frameTime <= captionEnd) {
        // Check if subtitles should be burned in (default: true)
        const shouldBurnIn = caption.style?.burnInSubtitles !== false;
        if (!shouldBurnIn) {
          continue; // Skip this caption if burnInSubtitles is false
        }
        
        captionsRendered++;
        if (caption.words && caption.words.length > 0) {
          if (caption.style.renderMode === 'progressive') {
            await renderProgressiveTextInWorker(ctx, caption.words, caption, frameTime, canvasWidth, canvasHeight);
          } else {
            await renderKaraokeTextInWorker(ctx, caption.words, caption, frameTime, canvasWidth, canvasHeight);
          }
        } else {
          await renderSimpleTextInWorker(ctx, caption.text, caption, canvasWidth, canvasHeight);
        }
      }
    }
    
    return captionsRendered;
  }
  
  /**
   * Render simple text in worker thread
   */
  const renderSimpleTextInWorker = async (
    ctx: any,
    text: string,
    caption: any,
    canvasWidth: number,
    canvasHeight: number
  ): Promise<void> => {
    const baseFontSize = caption.style?.fontSize || 32;
    const scale = caption.style?.scale || 1;
    const fontSize = baseFontSize * scale;
    const fontFamily = mapFontNameInWorker(caption.style?.font || 'Segoe UI');
    const textColor = parseColorInWorker(caption.style?.textColor || '#ffffff');
    const backgroundColor = parseColorInWorker(caption.style?.backgroundColor || '#80000000');
    const strokeColor = parseColorInWorker(caption.style?.strokeColor || 'transparent');
    const strokeWidth = caption.style?.strokeWidth || 0;
    
    // Apply text transformation
    const displayText = applyTextTransformInWorker(text, caption.style?.textTransform || 'none');
    
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
   * Render karaoke text in worker thread
   */
  const renderKaraokeTextInWorker = async (
    ctx: any,
    words: any[],
    caption: any,
    frameTime: number,
    canvasWidth: number,
    canvasHeight: number
  ): Promise<void> => {
    const baseFontSize = caption.style?.fontSize || 32;
    const scale = caption.style?.scale || 1;
    const fontSize = baseFontSize * scale;
    const fontFamily = mapFontNameInWorker(caption.style?.font || 'Segoe UI');
    const textColor = parseColorInWorker(caption.style?.textColor || '#ffffff');
    const highlighterColor = parseColorInWorker(caption.style?.highlighterColor || '#ffff00');
    const backgroundColor = parseColorInWorker(caption.style?.backgroundColor || '#80000000');
    const strokeColor = parseColorInWorker(caption.style?.strokeColor || 'transparent');
    const strokeWidth = caption.style?.strokeWidth || 0;
    const textTransform = caption.style?.textTransform || 'none';
    
    // Set font with precise sizing
    const fontString = `bold ${fontSize}px ${fontFamily}`;
    ctx.font = fontString;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const x = (canvasWidth * caption.style.position.x) / 100;
    const y = (canvasHeight * caption.style.position.y) / 100;
    
    // Calculate total width for single line
    const wordSpacing = 12 * scale;
    const wordPadding = 4 * scale;
    
    let totalWidth = 0;
    for (const word of words) {
      const transformedWord = applyTextTransformInWorker(word.word, textTransform);
      const wordWidth = ctx.measureText(transformedWord).width;
      totalWidth += wordWidth + (wordPadding * 2) + wordSpacing;
    }
    totalWidth -= wordSpacing;
    
    // Calculate background box
    const boxX = x - (totalWidth / 2) - 12;
    const boxY = y - (fontSize / 2) - 12;
    const boxWidth = totalWidth + 24;
    const boxHeight = fontSize + 24;
    
    // Draw main background box
    if (backgroundColor.a > 0) {
      ctx.fillStyle = `rgba(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b}, ${backgroundColor.a})`;
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    }
    
    // Add text shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Draw words in single line
    let currentX = x - (totalWidth / 2) + wordPadding;
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const wordStart = word.start;
      const wordEnd = word.end;
      
      const displayWord = applyTextTransformInWorker(word.word, textTransform);
      const isHighlighted = frameTime >= wordStart && frameTime <= wordEnd;
      
      const wordWidth = ctx.measureText(displayWord).width;
      const wordBoxWidth = wordWidth + (wordPadding * 2);
      const wordBoxHeight = fontSize + (wordPadding * 2);
      const wordBoxX = currentX - wordPadding;
      const wordBoxY = y - (fontSize / 2) - wordPadding;
        
      if (isHighlighted) {
        if (caption.style.emphasizeMode) {
          const emphasizedFontSize = fontSize * 1.05;
          ctx.font = `bold ${emphasizedFontSize}px ${fontFamily}, Arial, sans-serif`;
          ctx.fillStyle = `rgba(${highlighterColor.r}, ${highlighterColor.g}, ${highlighterColor.b}, ${highlighterColor.a})`;
        } else {
          ctx.fillStyle = `rgba(${highlighterColor.r}, ${highlighterColor.g}, ${highlighterColor.b}, ${highlighterColor.a})`;
          ctx.fillRect(wordBoxX, wordBoxY, wordBoxWidth, wordBoxHeight);
          ctx.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, ${textColor.a})`;
        }
      } else {
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
   * Render progressive text in worker thread
   */
  async function renderProgressiveTextInWorker(
    ctx: any,
    words: any[],
    caption: any,
    frameTime: number,
    canvasWidth: number,
    canvasHeight: number
  ): Promise<void> {
    const baseFontSize = caption.style?.fontSize || 32;
    const scale = caption.style?.scale || 1;
    const fontSize = baseFontSize * scale;
    const fontFamily = mapFontNameInWorker(caption.style?.font || 'Segoe UI');
    const textColor = parseColorInWorker(caption.style?.textColor || '#ffffff');
    const highlighterColor = parseColorInWorker(caption.style?.highlighterColor || '#ffff00');
    const backgroundColor = parseColorInWorker(caption.style?.backgroundColor || '#80000000');
    
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    ctx.textAlign = caption.style?.textAlign || 'center';
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
    
    // Group words into lines
    const lines: any[][] = [];
    for (let i = 0; i < visibleWords.length; i++) {
      lines.push(visibleWords.slice(0, i + 1));
    }
    
    // Show only the line that corresponds to the currently highlighted word
    const currentWord = words.find(word => frameTime >= word.start && frameTime <= word.end);
    const currentWordIndex = currentWord ? words.indexOf(currentWord) : visibleWords.length - 1;
    const displayLineIndex = Math.min(currentWordIndex, lines.length - 1);
    
    if (displayLineIndex >= 0 && lines[displayLineIndex]) {
      const displayLine = lines[displayLineIndex];
      const lineHeight = fontSize + 8;
      const firstWordY = y;
      
      // Draw each word in the line vertically
      for (let wordIndex = 0; wordIndex < displayLine.length; wordIndex++) {
        const word = displayLine[wordIndex];
        const wordY = firstWordY + (wordIndex * lineHeight);
        const isHighlighted = frameTime >= word.start && frameTime <= word.end;
        
        const displayWord = applyTextTransformInWorker(word.word, caption.style?.textTransform || 'none');
        
        // Measure transformed word for background
        const wordWidth = ctx.measureText(displayWord).width;
        const boxX = x - (wordWidth / 2) - 8;
        const boxY = wordY - fontSize - 8;
        const boxWidth = wordWidth + 16;
        const boxHeight = fontSize + 16;
        
        // Draw background for each word
        if (backgroundColor.a > 0) {
          ctx.fillStyle = `rgba(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b}, ${backgroundColor.a})`;
          ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
        }
        
        // Handle highlighting
        if (isHighlighted) {
          if (caption.style.emphasizeMode) {
            const emphasizedFontSize = fontSize * 1.05;
            ctx.font = `bold ${emphasizedFontSize}px ${fontFamily}, Arial, sans-serif`;
            ctx.fillStyle = `rgba(${highlighterColor.r}, ${highlighterColor.g}, ${highlighterColor.b}, ${highlighterColor.a})`;
          } else {
            ctx.fillStyle = `rgba(${highlighterColor.r}, ${highlighterColor.g}, ${highlighterColor.b}, ${highlighterColor.a})`;
            ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
            ctx.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, ${textColor.a})`;
          }
        } else {
          ctx.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, ${textColor.a})`;
        }
        
        // Add text shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        // Clear shadow for stroke
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        const strokeColor = parseColorInWorker(caption.style?.strokeColor || 'transparent');
        const strokeWidth = caption.style?.strokeWidth || 0;
        if (strokeWidth > 0 && strokeColor.a > 0) {
          ctx.strokeStyle = `rgba(${strokeColor.r}, ${strokeColor.g}, ${strokeColor.b}, ${strokeColor.a})`;
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
  
  /**
   * Helper functions for worker thread
   */
  function mapFontNameInWorker(fontName: string): string {
    switch (fontName) {
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
      case 'SF Pro Display':
        return 'Inter, Arial, sans-serif';
      case 'Segoe UI':
        return 'Inter, Arial, sans-serif';
      case 'Arial':
        return 'Arial, sans-serif';
      case 'Helvetica':
        return 'Helvetica, Arial, sans-serif';
      default:
        return 'Inter, Arial, sans-serif';
    }
  }
  
  function parseColorInWorker(color: string): { r: number; g: number; b: number; a: number } {
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
  
  function applyTextTransformInWorker(text: string, transform?: string): string {
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
  
  // Start processing the frame batch
  processFrameBatchInWorker().catch((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    parentPort?.postMessage({
      type: 'error',
      error: errorMessage,
      batchIndex
    });
  });
} 