import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import ffmpeg = require('fluent-ffmpeg');
import { Canvas, CanvasRenderingContext2D } from 'canvas';

/**
 * High-Performance FFmpeg Overlay-based video renderer
 * Features: Parallel processing, hardware acceleration, and chunking for long videos
 */
export class FFmpegOverlayRenderer {
  private static instance: FFmpegOverlayRenderer;
  private isCancelled: boolean = false;
  private activeFFmpegProcesses: Set<any> = new Set();
  private activeWorkers: Set<any> = new Set();
  private currentTempDir: string | null = null;
  private maxWorkers: number;

  private constructor() {
    // Determine optimal number of worker threads based on CPU cores
    this.maxWorkers = this.getOptimalWorkerCount();
    console.log(`FFmpeg Overlay Renderer initialized with ${this.maxWorkers} worker threads`);
  }

  public static getInstance(): FFmpegOverlayRenderer {
    if (!FFmpegOverlayRenderer.instance) {
      FFmpegOverlayRenderer.instance = new FFmpegOverlayRenderer();
    }
    return FFmpegOverlayRenderer.instance;
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
    
    // Cap at reasonable maximum to prevent system overload and file descriptor limits
    optimalWorkers = Math.min(optimalWorkers, 8); // Reduced from 16 to 8
    
    // Ensure we always have at least 1 worker to prevent division by zero
    optimalWorkers = Math.max(1, optimalWorkers);
    
    console.log(`CPU cores: ${cpuCores}, Memory: ${Math.round(memoryGB)}GB, Optimal workers: ${optimalWorkers}`);
    return optimalWorkers;
  }

  /**
   * Cancel the current rendering operation
   */
  public cancelRendering(): void {
    console.log('[FFmpegOverlayRenderer] Cancellation requested');
    this.isCancelled = true;
    
    // Terminate all active worker threads
    for (const worker of this.activeWorkers) {
      try {
        if (worker && typeof worker.terminate === 'function') {
          console.log('[FFmpegOverlayRenderer] Terminating worker thread');
          worker.terminate();
        }
      } catch (error) {
        console.error('[FFmpegOverlayRenderer] Error terminating worker:', error);
      }
    }
    this.activeWorkers.clear();
    
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
   * Main method to render video with captions using streaming mode
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
      
      console.log('=== FFMPEG OVERLAY RENDERER START ===');
      console.log('Input video path:', videoPath);
      console.log('Output path:', outputPath);
      console.log('Captions count:', captions?.length || 0);
      console.log('Export settings:', exportSettings);
      console.log('Using worker threads:', this.maxWorkers);
      
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
      
      // Determine rendering mode based on video size and system resources
      const shouldUseStreaming = this.shouldUseStreamingMode(metadata, captions);
      
      if (shouldUseStreaming) {
        console.log('Using streaming mode for large video');
        return await this.renderVideoStreaming(videoPath, captions, outputPath, metadata, onProgress, exportSettings);
      } else {
        console.log('Using optimized two-phase processing');
        return await this.renderVideoOptimized(videoPath, captions, outputPath, metadata, onProgress, exportSettings);
      }
    } catch (error) {
      // Check if this is a cancellation (expected behavior)
      if (error instanceof Error && (error.message.includes('cancelled') || this.isCancelled)) {
        console.log('=== FFMPEG OVERLAY RENDERER CANCELLED ===');
        throw error; // Re-throw cancellation errors without fallback
      }
      
      console.error('=== FFMPEG OVERLAY RENDERER END - ERROR ===');
      console.error('FFmpeg overlay rendering failed:', error);
      if (error instanceof Error) {
        console.error('Error stack:', error.stack);
      }
      
      // Fallback to copying original video
      return await this.copyVideo(videoPath, outputPath);
    }
  }

  /**
   * Optimized two-phase rendering approach
   * Phase 1: Generate all overlay images upfront (parallel)
   * Phase 2: Map images to video chunks and process (sequential)
   */
  private async renderVideoOptimized(
    videoPath: string,
    captions: any[],
    outputPath: string,
    metadata: any,
    onProgress?: (progress: number) => void,
    exportSettings?: { framerate: number; quality: string }
  ): Promise<string> {
    // Create temporary directory for all overlay images
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'ffmpeg-overlay-optimized-'));
    this.currentTempDir = tempDir;
    console.log('Optimized temp directory created:', tempDir);
    
    try {
      // Report initial progress
      if (onProgress) {
        onProgress(0);
      }
      
      // Phase 1: Generate caption video (0-50%)
      console.log('=== PHASE 1: Generating caption video ===');
      const captionVideoPath = await this.generateCaptionVideo(
        captions,
        metadata,
        tempDir,
        (progress: number) => {
          if (onProgress) {
            // Phase 1 is 50% of total progress
            const overallProgress = (progress / 100) * 50;
            onProgress(Math.round(overallProgress));
          }
        }
      );
      
      // Check if cancelled before Phase 2
      if (this.isCancelled) {
        throw new Error('Rendering cancelled before video processing');
      }
      
      // Phase 2: Overlay caption video on main video (50-100%)
      console.log('=== PHASE 2: Overlaying caption video ===');
      const result = await this.overlayCaptionVideo(
        videoPath,
        captionVideoPath,
        outputPath,
        metadata,
        (progress) => {
          if (onProgress) {
            // Phase 2 is 50% of total progress (50-100%)
            const overallProgress = 50 + (progress / 100) * 50;
            onProgress(Math.round(overallProgress));
          }
        },
        exportSettings
      );
      
      // Validate output
      await this.validateOutput(result, videoPath);
      
      console.log('=== FFMPEG OVERLAY RENDERER END - SUCCESS ===');
      return result;
    } finally {
      // Clean up temporary files
      await this.cleanupTempFiles(tempDir);
      this.currentTempDir = null;
    }
  }

  /**
   * Generate a single transparent video with all captions composited
   */
  private async generateCaptionVideo(
    captions: any[],
    metadata: any,
    tempDir: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    console.log(`Generating caption video for ${captions.length} captions using ${this.maxWorkers} workers...`);
    
    // Generate all overlay images using parallel processing
    const allOverlayFiles = await this.generateOverlayImagesParallel(captions, metadata, tempDir, (progress) => {
      if (onProgress) {
        // Overlay generation is 80% of caption video creation
        const overallProgress = Math.min(80, (progress / 100) * 80);
        onProgress(Math.round(overallProgress));
      }
    });
    
    console.log(`Generated ${allOverlayFiles.length} overlay images, creating caption video...`);
    
    // Create caption video from overlay images
    const captionVideoPath = path.join(tempDir, 'caption_overlay.mov');
    await this.createCaptionVideoFromImages(allOverlayFiles, captionVideoPath, metadata, (progress) => {
      if (onProgress) {
        // Video creation is 20% of caption video creation (80-100%)
        const overallProgress = Math.min(100, 80 + (progress / 100) * 20);
        onProgress(Math.round(overallProgress));
      }
    });
    
    console.log(`Caption video created: ${captionVideoPath}`);
    return captionVideoPath;
  }

  /**
   * Create a transparent video from overlay images using a simpler approach
   */
  private async createCaptionVideoFromImages(
    overlayFiles: Array<{ file: string; startTime: number; endTime: number }>,
    outputPath: string,
    metadata: any,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const fps = metadata.fps || 30;
    const width = metadata.width || 1920;
    const height = metadata.height || 1080;
    const duration = metadata.duration || 0;
    
    console.log(`Creating caption video: ${width}x${height} @ ${fps}fps, duration: ${duration}s`);
    
        return new Promise((resolve, reject) => {
      // Sort overlays by start time
      const sortedOverlays = [...overlayFiles].sort((a, b) => a.startTime - b.startTime);
      
      // Create a concat file for the overlay images with proper duration handling
      const concatFile = path.join(path.dirname(outputPath), 'overlay_concat.txt');
      let concatContent = '';
      
      // Create concat file with proper duration for each overlay
      for (let i = 0; i < sortedOverlays.length; i++) {
        const overlay = sortedOverlays[i];
        const nextOverlay = sortedOverlays[i + 1];
        
        // Calculate duration for this overlay
        let segmentDuration: number;
        if (nextOverlay) {
          segmentDuration = nextOverlay.startTime - overlay.startTime;
        } else {
          // For the last overlay, use remaining duration
          segmentDuration = Math.max(0.1, duration - overlay.startTime);
        }
        
        concatContent += `file '${overlay.file}'\n`;
        concatContent += `duration ${segmentDuration}\n`;
      }
      
      // FFmpeg concat demuxer needs the last file repeated for the last duration
      if (sortedOverlays.length > 0) {
        const lastOverlay = sortedOverlays[sortedOverlays.length - 1];
        concatContent += `file '${lastOverlay.file}'\n`;
      }
      
      fs.writeFileSync(concatFile, concatContent);
      
      console.log(`Creating caption video with ${sortedOverlays.length} overlay segments using PNG with rgba`);
      
      // Create FFmpeg command using concat demuxer
      let command = ffmpeg()
        .input(concatFile)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions([
          '-c:v', 'png',
          '-pix_fmt', 'rgba',
          '-f', 'mov'
        ]);
      
      command
        .output(outputPath)
        .on('start', (commandLine: string) => {
          console.log('Caption video creation started');
          this.activeFFmpegProcesses.add(command);
        })
        .on('progress', (progress: any) => {
          if (onProgress) {
            const percent = Math.min(100, progress.percent || 0);
            onProgress(Math.round(percent));
          }
        })
        .on('end', () => {
          console.log('Caption video creation completed successfully');
          this.activeFFmpegProcesses.delete(command);
          // Clean up concat file
          try {
            fs.unlinkSync(concatFile);
          } catch (error) {
            console.warn('Failed to cleanup concat file:', error);
          }
          resolve();
        })
        .on('error', (err: any) => {
          console.error('Caption video creation failed:', err);
          this.activeFFmpegProcesses.delete(command);
          // Clean up concat file
          try {
            fs.unlinkSync(concatFile);
          } catch (error) {
            console.warn('Failed to cleanup concat file:', error);
          }
          reject(new Error(`Caption video creation failed: ${err.message}`));
        });
      
      command.run();
    });
  }

  /**
   * Overlay caption video on main video
   */
  private async overlayCaptionVideo(
    videoPath: string,
    captionVideoPath: string,
    outputPath: string,
    metadata: any,
    onProgress?: (progress: number) => void,
    exportSettings?: { framerate: number; quality: string }
  ): Promise<string> {
    const fps = exportSettings?.framerate || metadata.fps;
    const quality = exportSettings?.quality || 'high';
    
    console.log(`Overlaying caption video on main video...`);
    
    return new Promise((resolve, reject) => {
      // Detect hardware acceleration
      const hwaccel = this.detectHardwareAcceleration();
      
      // Build FFmpeg command to overlay caption video
      let command = ffmpeg()
        .input(videoPath)
        .input(captionVideoPath);
      
      console.log(`Overlaying caption video with ${hwaccel || 'software'} acceleration`);
      
      // Apply overlay filter with proper alpha channel handling for PNG overlay
      command = command
        .complexFilter('[1:v]format=rgba[ov];[0:v][ov]overlay=0:0:shortest=1,format=yuv420p[v]')
        .outputOptions([
          '-map', '[v]',        // Map the video output from filter
          '-map', '0:a?',       // Map audio from original video (if it exists)
        ])
        .audioCodec('copy')     // Copy original audio without re-encoding
        .fps(fps);
      
      // Use hardware acceleration if available, otherwise software encoding
      if (hwaccel === 'metal') {
        console.log(`Using Metal detection but software encoding for overlay operation (videotoolbox has filter limitations)`);
      } else {
        console.log(`Using ${hwaccel || 'software'} acceleration for overlay operation`);
      }
      
      if (hwaccel === 'metal') {
        // For Metal, use software encoding for overlay operations as videotoolbox has limitations with complex filters
        command = command
          .videoCodec('libx264')
          .outputOptions([
            '-crf', '18',
            '-preset', 'medium'
          ]);
      } else if (hwaccel === 'cuda') {
        command = command
          .videoCodec('h264_nvenc')
          .outputOptions([
            '-rc', 'vbr',
            '-cq', '18',
            '-preset', 'medium'
          ]);
      } else if (hwaccel === 'qsv') {
        command = command
          .videoCodec('h264_qsv')
          .outputOptions([
            '-global_quality', '18',
            '-preset', 'medium'
          ]);
      } else if (hwaccel === 'amf') {
        command = command
          .videoCodec('h264_amf')
          .outputOptions([
            '-rc', 'vbr_peak',
            '-qp_i', '18',
            '-quality', 'speed'
          ]);
      } else {
        // Software encoding
        command = command
          .videoCodec('libx264')
          .outputOptions([
            '-crf', '18',
            '-preset', 'medium'
          ]);
      }
      
      // Add compatibility options
      command = command.outputOptions([
        '-movflags', '+faststart',
        '-pix_fmt', 'yuv420p',
        '-profile:v', 'baseline',
        '-level', '3.0',
        '-threads', Math.max(1, Math.floor(this.maxWorkers / 2)).toString()
      ]);
      
      command
        .output(outputPath)
        .on('start', (commandLine: string) => {
          console.log('Caption overlay FFmpeg command started');
          this.activeFFmpegProcesses.add(command);
        })
        .on('progress', (progress: any) => {
          if (onProgress) {
            const percent = Math.min(100, progress.percent || 0);
            onProgress(Math.round(percent));
          }
        })
        .on('end', () => {
          console.log('Caption overlay completed successfully');
          this.activeFFmpegProcesses.delete(command);
          resolve(outputPath);
        })
        .on('error', async (err: any) => {
          console.error('Caption overlay failed:', err);
          this.activeFFmpegProcesses.delete(command);
          
          // Check if it's a cancellation
          if (this.isCancelled) {
            reject(new Error('Caption overlay cancelled'));
            return;
          }
          
          // Check if it's a segmentation fault or similar critical error
          const errorMessage = err.message || String(err);
          if (errorMessage.includes('SIGSEGV') || errorMessage.includes('killed') || errorMessage.includes('segmentation')) {
            console.log('Critical FFmpeg error detected, trying alternative overlay methods...');
            try {
              // Try alternative overlay approach
              console.log('Trying alternative overlay method...');
              const result = await this.tryAlternativeOverlay(videoPath, captionVideoPath, outputPath, metadata, exportSettings);
              resolve(result);
            } catch (fallbackError) {
              console.error('Alternative overlay failed, using simple copy fallback:', fallbackError);
              try {
                // Final fallback to simple copy
                console.log('Using final fallback: copying original video');
                await this.copyVideo(videoPath, outputPath);
                resolve(outputPath);
              } catch (copyError) {
                console.error('Copy fallback also failed:', copyError);
                reject(new Error(`All overlay methods failed: ${err.message}`));
              }
            }
          } else {
            reject(new Error(`Caption overlay failed: ${err.message}`));
          }
        })
        .run();
    });
  }

  /**
   * Try alternative overlay methods when the main overlay fails
   */
  private async tryAlternativeOverlay(
    videoPath: string,
    captionVideoPath: string,
    outputPath: string,
    metadata: any,
    exportSettings?: { framerate: number; quality: string }
  ): Promise<string> {
    const fps = exportSettings?.framerate || metadata.fps;
    const quality = exportSettings?.quality || 'high';
    
    console.log('Trying alternative overlay method with proper transparency handling...');
    
    return new Promise((resolve, reject) => {
      // Try with proper alpha channel handling
      const command = ffmpeg()
        .input(videoPath)
        .input(captionVideoPath)
        .complexFilter('[1:v]format=yuva420p[ov];[0:v][ov]overlay=0:0:shortest=1,format=yuv420p[outv]')
        .outputOptions([
          '-map', '[outv]',
          '-map', '0:a?',
        ])
        .audioCodec('copy')
        .videoCodec('libx264') // Use software encoding for stability
        .outputOptions([
          '-crf', quality === 'high' ? '18' : quality === 'medium' ? '23' : '28',
          '-preset', 'medium', // Changed to medium for better compatibility
          '-pix_fmt', 'yuv420p',
          '-movflags', '+faststart'
        ])
        .output(outputPath)
        .on('start', (commandLine: string) => {
          console.log('Alternative overlay method started');
          this.activeFFmpegProcesses.add(command);
        })
        .on('end', () => {
          console.log('Alternative overlay method completed successfully');
          this.activeFFmpegProcesses.delete(command);
          resolve(outputPath);
        })
        .on('error', (err: any) => {
          console.error('Alternative overlay method failed:', err);
          this.activeFFmpegProcesses.delete(command);
          reject(new Error(`Alternative overlay failed: ${err.message}`));
        });
      
      command.run();
    });
  }

  /**
   * Process video chunks using pre-generated overlay images
   */
  private async processVideoChunksWithImages(
    videoPath: string,
    allOverlayFiles: Array<{ file: string; startTime: number; endTime: number }>,
    outputPath: string,
    metadata: any,
    onProgress?: (progress: number) => void,
    exportSettings?: { framerate: number; quality: string }
  ): Promise<string> {
    const videoDuration = metadata.duration || 0;
    const chunkDuration = 300; // 5 minutes per chunk
    const totalChunks = Math.ceil(videoDuration / chunkDuration);
    
    console.log(`Processing video in ${totalChunks} chunks of ${chunkDuration}s each`);
    
    // Split video into chunks and process each chunk
    const chunkFiles: string[] = [];
    
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      if (this.isCancelled) {
        throw new Error('Video processing cancelled');
      }
      
      const startTime = chunkIndex * chunkDuration;
      const endTime = Math.min((chunkIndex + 1) * chunkDuration, videoDuration);
      
      console.log(`Processing chunk ${chunkIndex + 1}/${totalChunks}: ${startTime}s - ${endTime}s`);
      
      // Filter overlay files for this chunk
      const chunkOverlays = allOverlayFiles.filter(overlay => 
        overlay.startTime >= startTime && overlay.startTime < endTime
      );
      
      console.log(`Chunk ${chunkIndex + 1} has ${chunkOverlays.length} overlays`);
      
      // Process this chunk
      const chunkOutput = path.join(path.dirname(outputPath), `chunk_${chunkIndex}.mp4`);
      await this.processSingleChunkWithImages(
        videoPath,
        chunkOverlays,
        chunkOutput,
        metadata,
        startTime,
        endTime,
        chunkIndex,
        totalChunks,
        onProgress,
        exportSettings
      );
      
      chunkFiles.push(chunkOutput);
    }
    
    // Concatenate all chunks into final output
    console.log('Concatenating video chunks...');
    const result = await this.concatenateVideoChunks(chunkFiles, outputPath, onProgress);
    
    // Clean up chunk files
    for (const chunkFile of chunkFiles) {
      try {
        if (fs.existsSync(chunkFile)) {
          await fs.promises.unlink(chunkFile);
        }
      } catch (cleanupError) {
        console.warn('Failed to cleanup chunk file:', chunkFile, cleanupError);
      }
    }
    
    return result;
  }

  /**
   * Process a single video chunk using pre-generated overlay images
   */
  private async processSingleChunkWithImages(
    videoPath: string,
    chunkOverlays: Array<{ file: string; startTime: number; endTime: number }>,
    chunkOutput: string,
    metadata: any,
    startTime: number,
    endTime: number,
    chunkIndex: number,
    totalChunks: number,
    onProgress?: (progress: number) => void,
    exportSettings?: { framerate: number; quality: string }
  ): Promise<void> {
    // Create temporary directory for this chunk
    const chunkTempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), `chunk-${chunkIndex}-`));
    
    try {
      // Calculate progress contribution for this chunk (evenly distributed across 60-90%)
      const progressPerChunk = 30 / totalChunks; // 30% for chunk processing (60-90%)
      const chunkStartProgress = chunkIndex * progressPerChunk;
      
      // Extract video chunk (10% of this chunk's contribution)
      const chunkVideoPath = path.join(chunkTempDir, 'chunk_video.mp4');
      await this.extractVideoChunk(videoPath, chunkVideoPath, startTime, endTime);
      
      // Report chunk extraction completion
      if (onProgress) {
        const extractionProgress = chunkStartProgress + (progressPerChunk * 0.1);
        onProgress(Math.round(extractionProgress));
      }
      
      // Apply overlays to chunk (90% of this chunk's contribution)
      await this.applyOverlaysWithHardwareAccel(
        chunkVideoPath,
        chunkOverlays,
        chunkOutput,
        metadata,
        (ffmpegProgress) => {
          if (onProgress) {
            const extractionProgress = chunkStartProgress + (progressPerChunk * 0.1);
            const ffmpegProgressRange = progressPerChunk * 0.9;
            const currentFFmpegProgress = extractionProgress + (ffmpegProgress / 100) * ffmpegProgressRange;
            onProgress(Math.round(currentFFmpegProgress));
          }
        },
        exportSettings
      );
      
      console.log(`Chunk ${chunkIndex + 1}/${totalChunks} completed`);
    } finally {
      // Clean up chunk temporary files
      await this.cleanupTempFiles(chunkTempDir);
    }
  }

  /**
   * Determine if streaming mode should be used based on video characteristics
   */
  private shouldUseStreamingMode(metadata: any, captions: any[]): boolean {
    const videoDuration = metadata.duration || 0;
    const captionCount = captions.length;
    
    // Use streaming mode for:
    // - Videos longer than 10 minutes (600s)
    // - Videos with more than 500 captions
    // - When video duration * caption count > 100,000 (complex videos)
    
    const isLongVideo = videoDuration > 600;
    const isManyCaptions = captionCount > 500;
    const isComplexVideo = videoDuration * captionCount > 100000;
    
    console.log(`Streaming mode check: Duration=${videoDuration}s, Captions=${captionCount}`);
    console.log(`Criteria: Long=${isLongVideo}, Many=${isManyCaptions}, Complex=${isComplexVideo}`);
    
    return isLongVideo || isManyCaptions || isComplexVideo;
  }

  /**
   * Render video using streaming mode for large videos
   */
  private async renderVideoStreaming(
    videoPath: string,
    captions: any[],
    outputPath: string,
    metadata: any,
    onProgress?: (progress: number) => void,
    exportSettings?: { framerate: number; quality: string }
  ): Promise<string> {
    // Create temporary directory for overlay images
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'ffmpeg-streaming-'));
    this.currentTempDir = tempDir;
    console.log('Streaming temp directory created:', tempDir);
    
    try {
      // Report initial progress
      if (onProgress) {
        onProgress(0);
      }
      
      // Phase 1: Generate caption video (0-40%)
      console.log('=== STREAMING PHASE 1: Generating caption video ===');
      const captionVideoPath = await this.generateCaptionVideo(
        captions,
        metadata,
        tempDir,
        (progress) => {
          if (onProgress) {
            // Phase 1 is 40% of total progress
            const overallProgress = (progress / 100) * 40;
            onProgress(Math.round(overallProgress));
          }
        }
      );
      
      // Check if cancelled before streaming
      if (this.isCancelled) {
        throw new Error('Rendering cancelled before streaming');
      }
      
      // Phase 2: Overlay caption video on main video (40-100%)
      console.log('=== STREAMING PHASE 2: Overlaying caption video ===');
      const result = await this.overlayCaptionVideo(
        videoPath,
        captionVideoPath,
        outputPath,
        metadata,
        (progress) => {
          if (onProgress) {
            // Phase 2 is 60% of total progress (40-100%)
            const overallProgress = 40 + (progress / 100) * 60;
            onProgress(Math.round(overallProgress));
          }
        },
        exportSettings
      );
      
      // Validate output
      await this.validateOutput(result, videoPath);
      
      console.log('=== FFMPEG OVERLAY RENDERER END - SUCCESS (STREAMING) ===');
      return result;
    } finally {
      // Clean up temporary files
      await this.cleanupTempFiles(tempDir);
      this.currentTempDir = null;
    }
  }

  /**
   * Stream video processing with overlay application using time-based segments
   */
  private async streamVideoWithOverlays(
    videoPath: string,
    overlayFiles: Array<{ file: string; startTime: number; endTime: number }>,
    outputPath: string,
    metadata: any,
    onProgress?: (progress: number) => void,
    exportSettings?: { framerate: number; quality: string }
  ): Promise<string> {
    const videoDuration = metadata.duration || 0;
    const segmentDuration = 60; // 1 minute segments for streaming
    const totalSegments = Math.ceil(videoDuration / segmentDuration);
    
    console.log(`Streaming video with ${overlayFiles.length} overlays in ${totalSegments} segments of ${segmentDuration}s each`);
    
    // Create temporary directory for segments
    const tempDir = path.dirname(outputPath);
    const segmentFiles: string[] = [];
    
    try {
      // Process video in time-based segments
      for (let segmentIndex = 0; segmentIndex < totalSegments; segmentIndex++) {
        if (this.isCancelled) {
          throw new Error('Streaming processing cancelled');
        }
        
        const startTime = segmentIndex * segmentDuration;
        const endTime = Math.min((segmentIndex + 1) * segmentDuration, videoDuration);
        
        console.log(`Processing streaming segment ${segmentIndex + 1}/${totalSegments}: ${startTime}s - ${endTime}s`);
        
        // Filter overlays for this time segment
        const segmentOverlays = overlayFiles.filter(overlay => 
          overlay.startTime >= startTime && overlay.startTime < endTime
        );
        
        console.log(`Segment ${segmentIndex + 1} has ${segmentOverlays.length} overlays`);
        
        // Process this segment with streaming
        const segmentOutput = path.join(tempDir, `stream_segment_${segmentIndex}.mp4`);
        await this.processStreamingSegment(
          videoPath,
          segmentOverlays,
          segmentOutput,
          metadata,
          startTime,
          endTime,
          segmentIndex,
          totalSegments,
          onProgress,
          exportSettings
        );
        
        segmentFiles.push(segmentOutput);
      }
      
      // Concatenate all segments into final output
      console.log('Concatenating streaming segments...');
      const result = await this.concatenateVideoChunks(segmentFiles, outputPath, onProgress);
      
      // Clean up segment files
      for (const segmentFile of segmentFiles) {
        try {
          if (fs.existsSync(segmentFile)) {
            await fs.promises.unlink(segmentFile);
          }
        } catch (cleanupError) {
          console.warn('Failed to cleanup segment file:', segmentFile, cleanupError);
        }
      }
      
      return result;
    } catch (error) {
      console.error('Streaming segment processing failed:', error);
      throw error;
    }
  }

  /**
   * Process a single streaming segment with overlays
   */
  private async processStreamingSegment(
    videoPath: string,
    segmentOverlays: Array<{ file: string; startTime: number; endTime: number }>,
    segmentOutput: string,
    metadata: any,
    startTime: number,
    endTime: number,
    segmentIndex: number,
    totalSegments: number,
    onProgress?: (progress: number) => void,
    exportSettings?: { framerate: number; quality: string }
  ): Promise<void> {
    const fps = exportSettings?.framerate || metadata.fps;
    const quality = exportSettings?.quality || 'high';
    
    // If no overlays for this segment, just copy the video segment
    if (segmentOverlays.length === 0) {
      console.log(`Segment ${segmentIndex + 1} has no overlays, copying video segment`);
      await this.extractVideoChunk(videoPath, segmentOutput, startTime, endTime);
      return;
    }
    
         // Use batch processing for segments with many overlays
     const maxOverlaysPerBatch = this.getOptimalBatchSize();
     if (segmentOverlays.length > maxOverlaysPerBatch) {
       console.log(`Segment ${segmentIndex + 1} has ${segmentOverlays.length} overlays, using batch processing`);
       await this.processOverlaysInBatches(
         videoPath,
         segmentOverlays,
         segmentOutput,
         metadata,
         onProgress,
         exportSettings,
         maxOverlaysPerBatch
       );
       return;
     }
    
    // Process segment with streaming FFmpeg
    console.log(`Processing segment ${segmentIndex + 1} with ${segmentOverlays.length} overlays using streaming FFmpeg`);
    
    return new Promise((resolve, reject) => {
      // Detect hardware acceleration
      const hwaccel = this.detectHardwareAcceleration();
      
      // Build streaming FFmpeg command for segment
      let command = ffmpeg()
        .input(videoPath)
        .inputOptions([
          '-ss', startTime.toString(),
          '-t', (endTime - startTime).toString()
        ]);
      
      // Add overlay images as inputs
      segmentOverlays.forEach(overlay => {
        command = command.input(overlay.file);
      });
      
      // Build filter chain for overlays
      let filterComplex = '';
      let currentInput = '[0:v]'; // Start with main video
      
      segmentOverlays.forEach((overlay, index) => {
        const inputIndex = index + 1; // Overlay inputs start at index 1
        const outputLabel = index === segmentOverlays.length - 1 ? '[outv]' : `[tmp${index}]`;
        
        // Adjust overlay timing for segment
        const adjustedStartTime = overlay.startTime - startTime;
        const adjustedEndTime = overlay.endTime - startTime;
        
        // Create overlay filter with microsecond precision
        const overlayFilter = `${currentInput}[${inputIndex}:v]overlay=enable='between(t,${adjustedStartTime.toFixed(6)},${adjustedEndTime.toFixed(6)})'${outputLabel}`;
        
        if (filterComplex) {
          filterComplex += ';';
        }
        filterComplex += overlayFilter;
        
        // Update current input for next iteration
        currentInput = outputLabel;
      });
      
      console.log(`Streaming segment ${segmentIndex + 1} with ${segmentOverlays.length} overlays using ${hwaccel || 'software'} acceleration`);
      
      // Apply streaming-optimized settings
      command = command
        .complexFilter(filterComplex)
        .outputOptions([
          '-map', '[outv]',     // Map the video output from filter
          '-map', '0:a?',       // Map audio from original video (if it exists)
        ])
        .audioCodec('copy')     // Copy original audio without re-encoding
        .fps(fps);
      
      // Set video codec with streaming optimizations
      if (hwaccel === 'cuda') {
        command = command.videoCodec('h264_nvenc');
        if (quality === 'high') {
          command = command.outputOptions(['-rc', 'vbr', '-cq', '18', '-preset', 'fast']);
        } else if (quality === 'medium') {
          command = command.outputOptions(['-rc', 'vbr', '-cq', '23', '-preset', 'fast']);
        } else {
          command = command.outputOptions(['-rc', 'vbr', '-cq', '28', '-preset', 'fast']);
        }
      } else if (hwaccel === 'qsv') {
        command = command.videoCodec('h264_qsv');
        if (quality === 'high') {
          command = command.outputOptions(['-global_quality', '18', '-preset', 'fast']);
        } else if (quality === 'medium') {
          command = command.outputOptions(['-global_quality', '23', '-preset', 'fast']);
        } else {
          command = command.outputOptions(['-global_quality', '28', '-preset', 'fast']);
        }
      } else if (hwaccel === 'amf') {
        command = command.videoCodec('h264_amf');
        if (quality === 'high') {
          command = command.outputOptions(['-rc', 'vbr_peak', '-qp_i', '18', '-quality', 'speed']);
        } else if (quality === 'medium') {
          command = command.outputOptions(['-rc', 'vbr_peak', '-qp_i', '23', '-quality', 'speed']);
        } else {
          command = command.outputOptions(['-rc', 'vbr_peak', '-qp_i', '28', '-quality', 'speed']);
        }
      } else {
        // Software encoding with streaming optimizations
        command = command.videoCodec('libx264');
        if (quality === 'high') {
          command = command.outputOptions(['-crf', '18', '-preset', 'fast']);
        } else if (quality === 'medium') {
          command = command.outputOptions(['-crf', '23', '-preset', 'fast']);
        } else {
          command = command.outputOptions(['-crf', '28', '-preset', 'fast']);
        }
      }
      
      // Add streaming-optimized options
      command = command.outputOptions([
        '-movflags', '+faststart+frag_keyframe+empty_moov', // Streaming optimizations
        '-pix_fmt', 'yuv420p',
        '-profile:v', 'baseline',
        '-level', '3.0',
        '-threads', Math.max(1, Math.floor(this.maxWorkers / 2)).toString(),
        '-bufsize', '8192k', // Larger buffer for streaming
        '-maxrate', '10M'    // Limit bitrate for streaming
      ]);
      
      command
        .output(segmentOutput)
        .on('start', (commandLine: string) => {
          console.log(`Streaming segment ${segmentIndex + 1} FFmpeg command started`);
          this.activeFFmpegProcesses.add(command);
        })
        .on('progress', (progress: any) => {
          if (onProgress) {
            // Calculate progress for this segment within the streaming phase
            const segmentStartProgress = (segmentIndex / totalSegments) * 100;
            const segmentEndProgress = ((segmentIndex + 1) / totalSegments) * 100;
            const segmentProgressRange = segmentEndProgress - segmentStartProgress;
            const currentSegmentProgress = segmentStartProgress + (progress.percent || 0) * segmentProgressRange / 100;
            onProgress(Math.round(currentSegmentProgress));
          }
        })
        .on('end', () => {
          console.log(`Streaming segment ${segmentIndex + 1} completed successfully`);
          this.activeFFmpegProcesses.delete(command);
          resolve();
        })
        .on('error', (err: any) => {
          console.error(`Streaming segment ${segmentIndex + 1} failed:`, err);
          this.activeFFmpegProcesses.delete(command);
          
          // Check if it's a cancellation
          if (this.isCancelled) {
            reject(new Error('Streaming segment processing cancelled'));
            return;
          }
          
          reject(new Error(`Streaming segment processing failed: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Determine if chunking should be used based on video length and caption count
   */
  private shouldUseChunking(metadata: any, captions: any[]): boolean {
    const videoDuration = metadata.duration || 0;
    const captionCount = captions.length;
    
    // Use chunking for videos longer than 5 minutes or with more than 100 captions
    return videoDuration > 300 || captionCount > 100;
  }

  /**
   * Standard parallel processing for shorter videos
   */
  private async renderVideoStandard(
    videoPath: string,
    captions: any[],
    outputPath: string,
    metadata: any,
    onProgress?: (progress: number) => void,
    exportSettings?: { framerate: number; quality: string }
  ): Promise<string> {
    // Create temporary directory for overlay PNGs
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'ffmpeg-overlay-'));
    this.currentTempDir = tempDir;
    console.log('Temp directory created:', tempDir);
    
    try {
      // Report initial progress
      if (onProgress) {
        onProgress(0);
      }
      
      // Step 1: Generate caption video using parallel processing (0-50%)
      console.log('Generating caption video with parallel processing...');
      const captionVideoPath = await this.generateCaptionVideo(
        captions, 
        metadata, 
        tempDir, 
        (progress) => {
          if (onProgress) {
            // Caption video generation is 50% of total progress
            const overallProgress = (progress / 100) * 50;
            onProgress(Math.round(overallProgress));
          }
        }
      );
      
      // Check if cancelled before FFmpeg processing
      if (this.isCancelled) {
        throw new Error('Rendering cancelled before FFmpeg processing');
      }
      
      // Step 2: Overlay caption video on main video (50-100%)
      console.log('Overlaying caption video on main video...');
      const result = await this.overlayCaptionVideo(
        videoPath, 
        captionVideoPath, 
        outputPath, 
        metadata, 
        (progress) => {
          if (onProgress) {
            // Overlay processing is 50% of total progress (50-100%)
            const overallProgress = 50 + (progress / 100) * 50;
            onProgress(Math.round(overallProgress));
          }
        }, 
        exportSettings
      );
      
      // Validate output
      await this.validateOutput(result, videoPath);
      
      console.log('=== FFMPEG OVERLAY RENDERER END - SUCCESS ===');
      return result;
    } finally {
      // Clean up temporary files
      await this.cleanupTempFiles(tempDir);
      this.currentTempDir = null;
    }
  }

    /**
   * Chunked processing for long videos
   */
  private async renderVideoWithChunking(
    videoPath: string,
    captions: any[],
    outputPath: string,
    metadata: any,
    onProgress?: (progress: number) => void,
    exportSettings?: { framerate: number; quality: string }
  ): Promise<string> {
    const videoDuration = metadata.duration || 0;
    const chunkDuration = 300; // 5 minutes per chunk
    const chunkCount = Math.ceil(videoDuration / chunkDuration);
    
    console.log(`Splitting video into ${chunkCount} chunks of ${chunkDuration}s each`);
    
    // Report initial progress
    if (onProgress) {
      onProgress(0);
    }
    
    // Create temporary directory for chunks
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'ffmpeg-chunks-'));
    this.currentTempDir = tempDir;
    
    try {
      const chunkFiles: string[] = [];
      
      // Process each chunk sequentially to avoid overwhelming the system
      for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex++) {
        if (this.isCancelled) {
          throw new Error('Chunked processing cancelled');
        }
        
        const startTime = chunkIndex * chunkDuration;
        const endTime = Math.min((chunkIndex + 1) * chunkDuration, videoDuration);
        
        // Filter captions for this chunk
        const chunkCaptions = captions.filter(caption => {
          const captionStart = caption.startTime !== undefined ? caption.startTime : caption.start;
          const captionEnd = caption.endTime !== undefined ? caption.endTime : caption.end;
          return captionStart < endTime * 1000 && captionEnd > startTime * 1000;
        });
        
        // Adjust caption timing for chunk
        const adjustedCaptions = chunkCaptions.map(caption => ({
          ...caption,
          startTime: Math.max(0, (caption.startTime || caption.start) - startTime * 1000),
          endTime: Math.min(chunkDuration * 1000, (caption.endTime || caption.end) - startTime * 1000),
          words: caption.words?.map((word: any) => ({
            ...word,
            start: Math.max(0, word.start - startTime * 1000),
            end: Math.min(chunkDuration * 1000, word.end - startTime * 1000)
          }))
        }));
        
        const chunkOutput = path.join(tempDir, `chunk_${chunkIndex}.mp4`);
        chunkFiles.push(chunkOutput);
        
        // Process this chunk with proper progress calculation
        await this.processVideoChunk(
          videoPath,
          adjustedCaptions,
          chunkOutput,
          metadata,
          startTime,
          endTime,
          chunkIndex,
          chunkCount,
          onProgress,
          exportSettings
        );
      }
      
      // Concatenate chunks into final video
      console.log('Concatenating video chunks...');
      if (onProgress) {
        onProgress(90); // Start concatenation at 90%
      }
      const result = await this.concatenateVideoChunks(chunkFiles, outputPath, onProgress);
      
      console.log('=== FFMPEG OVERLAY RENDERER END - SUCCESS ===');
      return result;
    } finally {
      // Clean up temporary files
      await this.cleanupTempFiles(tempDir);
      this.currentTempDir = null;
    }
  }

  /**
   * Process a single video chunk
   */
  private async processVideoChunk(
    videoPath: string,
    captions: any[],
    chunkOutput: string,
    metadata: any,
    startTime: number,
    endTime: number,
    chunkIndex: number,
    totalChunks: number,
    onProgress?: (progress: number) => void,
    exportSettings?: { framerate: number; quality: string }
  ): Promise<void> {
    console.log(`Processing chunk ${chunkIndex + 1}/${totalChunks}: ${startTime}s - ${endTime}s`);
    
    // Create temporary directory for this chunk
    const chunkTempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), `chunk-${chunkIndex}-`));
    
    try {
      // Calculate progress contribution for this chunk (evenly distributed across 0-90%)
      const progressPerChunk = 90 / totalChunks; // Each chunk contributes equally to 0-90%
      const chunkStartProgress = chunkIndex * progressPerChunk;
      const chunkEndProgress = (chunkIndex + 1) * progressPerChunk;
      
      // Extract video chunk (10% of this chunk's contribution)
      const chunkVideoPath = path.join(chunkTempDir, 'chunk_video.mp4');
      await this.extractVideoChunk(videoPath, chunkVideoPath, startTime, endTime);
      
      // Report chunk extraction completion
      if (onProgress) {
        const extractionProgress = chunkStartProgress + (progressPerChunk * 0.1); // 10% of this chunk's progress
        onProgress(Math.round(extractionProgress));
      }
      
      // Generate overlay images for this chunk (40% of this chunk's contribution)
      const overlayFiles = await this.generateOverlayImagesParallel(
        captions, 
        metadata, 
        chunkTempDir,
        (overlayProgress) => {
          if (onProgress) {
            const extractionProgress = chunkStartProgress + (progressPerChunk * 0.1); // 10% of this chunk's progress
            const overlayProgressRange = progressPerChunk * 0.4; // 40% of this chunk's progress
            const currentOverlayProgress = extractionProgress + (overlayProgress / 100) * overlayProgressRange;
            onProgress(Math.round(currentOverlayProgress));
          }
        }
      );
      
      // Apply overlays to chunk (50% of this chunk's contribution)
      await this.applyOverlaysWithHardwareAccel(
        chunkVideoPath,
        overlayFiles,
        chunkOutput,
        metadata,
        (ffmpegProgress) => {
          if (onProgress) {
            const extractionProgress = chunkStartProgress + (progressPerChunk * 0.1); // 10% of this chunk's progress
            const overlayProgress = extractionProgress + (progressPerChunk * 0.4); // 40% of this chunk's progress
            const ffmpegProgressRange = progressPerChunk * 0.5; // 50% of this chunk's progress
            const currentFFmpegProgress = overlayProgress + (ffmpegProgress / 100) * ffmpegProgressRange;
            onProgress(Math.round(currentFFmpegProgress));
          }
        },
        exportSettings
      );
      
      console.log(`Chunk ${chunkIndex + 1}/${totalChunks} completed`);
    } finally {
      // Clean up chunk temporary files
      await this.cleanupTempFiles(chunkTempDir);
    }
  }

  /**
   * Extract a chunk of video using FFmpeg
   */
  private async extractVideoChunk(
    videoPath: string,
    outputPath: string,
    startTime: number,
    endTime: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const duration = endTime - startTime;
      
      const command = ffmpeg(videoPath)
        .inputOptions([
          '-ss', startTime.toString(),
          '-t', duration.toString()
        ])
        .videoCodec('copy')
        .audioCodec('copy')
        .output(outputPath)
        .on('start', () => {
          this.activeFFmpegProcesses.add(command);
        })
        .on('end', () => {
          this.activeFFmpegProcesses.delete(command);
          resolve();
        })
        .on('error', (err: any) => {
          this.activeFFmpegProcesses.delete(command);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Concatenate video chunks into final output
   */
  private async concatenateVideoChunks(
    chunkFiles: string[],
    outputPath: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // Create concat file
      const concatFile = path.join(path.dirname(outputPath), 'concat.txt');
      const concatContent = chunkFiles.map(file => `file '${file}'`).join('\n');
      
      fs.writeFileSync(concatFile, concatContent);
      
      const command = ffmpeg()
        .input(concatFile)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .videoCodec('copy')
        .audioCodec('copy')
        .output(outputPath)
        .on('start', () => {
          this.activeFFmpegProcesses.add(command);
        })
        .on('progress', (progress: any) => {
          if (onProgress) {
            // Concatenation is the final 10% of progress (90-100%)
            const concatProgress = 90 + (progress.percent || 0) * 0.1;
            onProgress(Math.round(concatProgress));
          }
        })
        .on('end', () => {
          this.activeFFmpegProcesses.delete(command);
          // Clean up concat file
          try {
            fs.unlinkSync(concatFile);
          } catch (error) {
            console.warn('Failed to cleanup concat file:', error);
          }
          resolve(outputPath);
        })
        .on('error', (err: any) => {
          this.activeFFmpegProcesses.delete(command);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Generate overlay images using true parallel processing with worker threads
   */
  private async generateOverlayImagesParallel(
    captions: any[],
    metadata: any,
    tempDir: string,
    onProgress?: (progress: number) => void
  ): Promise<Array<{ file: string; startTime: number; endTime: number }>> {
    const overlayFiles: Array<{ file: string; startTime: number; endTime: number }> = [];
    
    console.log(`Generating overlay images for ${captions.length} captions using ${this.maxWorkers} workers...`);
    
    // Split captions into batches for parallel processing
    const batchSize = Math.ceil(captions.length / this.maxWorkers);
    const batches = [];
    
    for (let i = 0; i < captions.length; i += batchSize) {
      batches.push(captions.slice(i, i + batchSize));
    }
    
    console.log(`Created ${batches.length} batches with ${batchSize} captions per batch`);
    
    // Process batches in parallel using worker threads
    let completedBatches = 0;
    const batchPromises = batches.map((batch, batchIndex) => {
      return this.processCaptionBatch(
        batch,
        batchIndex,
        metadata,
        tempDir,
        (batchProgress) => {
          if (onProgress) {
            // Calculate overall progress based on completed batches
            const completedProgress = (completedBatches / batches.length) * 100;
            const currentBatchProgress = (batchProgress / 100) * (100 / batches.length);
            const totalProgress = Math.min(100, completedProgress + currentBatchProgress);
            onProgress(Math.round(totalProgress));
          }
        }
      ).then(result => {
        completedBatches++;
        return result;
      });
    });
    
    // Wait for all batches to complete in parallel
    const batchResults = await Promise.all(batchPromises);
    
    // Combine results from all batches
    for (const batchResult of batchResults) {
      overlayFiles.push(...batchResult);
    }
    
    console.log(`Generated ${overlayFiles.length} overlay images using parallel batch processing`);
    return overlayFiles;
  }

  /**
   * Process a batch of captions using worker thread
   */
  private async processCaptionBatch(
    captions: any[],
    batchIndex: number,
    metadata: any,
    tempDir: string,
    onBatchProgress?: (progress: number) => void
  ): Promise<Array<{ file: string; startTime: number; endTime: number }>> {
    return new Promise((resolve, reject) => {
      // Create worker thread for this batch
      const worker = new Worker(__filename, {
        workerData: {
          captions,
          batchIndex,
          metadata,
          tempDir,
          isWorker: true
        }
      });

      this.activeWorkers.add(worker);

      worker.on('message', (message) => {
        if (message.type === 'progress') {
          if (onBatchProgress) {
            onBatchProgress(message.progress);
          }
        } else if (message.type === 'complete') {
          console.log(`Batch ${batchIndex} completed: ${message.overlayFiles.length} overlays`);
          this.activeWorkers.delete(worker);
          resolve(message.overlayFiles);
        } else if (message.type === 'error') {
          console.error(`Batch ${batchIndex} error:`, message.error);
          this.activeWorkers.delete(worker);
          reject(new Error(message.error));
        }
      });

      worker.on('error', (error) => {
        console.error(`Worker ${batchIndex} error:`, error);
        this.activeWorkers.delete(worker);
        reject(error);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          console.error(`Worker ${batchIndex} exited with code ${code}`);
          this.activeWorkers.delete(worker);
          reject(new Error(`Worker exited with code ${code}`));
        }
      });
    });
  }

  /**
   * Apply overlays to video using hardware-accelerated FFmpeg with batch processing
   */
  private async applyOverlaysWithHardwareAccel(
    videoPath: string,
    overlayFiles: Array<{ file: string; startTime: number; endTime: number }>,
    outputPath: string,
    metadata: any,
    onProgress?: (progress: number) => void,
    exportSettings?: { framerate: number; quality: string }
  ): Promise<string> {
    if (overlayFiles.length === 0) {
      // No overlays to apply, just copy the video
      return await this.copyVideo(videoPath, outputPath);
    }
    
    const fps = exportSettings?.framerate || metadata.fps;
    const quality = exportSettings?.quality || 'high';
    
    console.log(`Applying ${overlayFiles.length} overlays with hardware acceleration...`);
    
    // Use batch processing for large overlay sets to avoid file descriptor limits
    const maxOverlaysPerBatch = this.getOptimalBatchSize();
    if (overlayFiles.length > maxOverlaysPerBatch) {
      console.log(`Large overlay set detected (${overlayFiles.length} overlays). Using batch processing with ${maxOverlaysPerBatch} overlays per batch.`);
      return await this.processOverlaysInBatches(
        videoPath,
        overlayFiles,
        outputPath,
        metadata,
        onProgress,
        exportSettings,
        maxOverlaysPerBatch
      );
    }
    
    // For small overlay sets, use direct processing
    return await this.processOverlaysDirect(
      videoPath,
      overlayFiles,
      outputPath,
      metadata,
      onProgress,
      exportSettings
    );
  }
  
  /**
   * Process overlays in batches using parallel processing for better performance
   */
  private async processOverlaysInBatches(
    videoPath: string,
    overlayFiles: Array<{ file: string; startTime: number; endTime: number }>,
    outputPath: string,
    metadata: any,
    onProgress?: (progress: number) => void,
    exportSettings?: { framerate: number; quality: string },
    batchSize: number = 100
  ): Promise<string> {
    const tempDir = path.dirname(outputPath);
    
    try {
      // Sort overlays by start time for proper temporal processing
      const sortedOverlays = [...overlayFiles].sort((a, b) => a.startTime - b.startTime);
      
      // Split overlays into time-based batches
      const batches = [];
      for (let i = 0; i < sortedOverlays.length; i += batchSize) {
        batches.push(sortedOverlays.slice(i, i + batchSize));
      }
      
      console.log(`Created ${batches.length} time-based batches`);
      
      // Process batches in parallel for better performance
      const batchPromises = batches.map(async (batch, batchIndex) => {
        if (this.isCancelled) {
          throw new Error('Batch processing cancelled');
        }
        
        const batchOutput = path.join(tempDir, `temp_batch_${batchIndex}.mp4`);
        
        console.log(`Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} overlays`);
        
        // Process this batch
        await this.processOverlaysDirect(
          videoPath, // Use original video for each batch
          batch, 
          batchOutput, 
          metadata, 
          (progress) => {
            if (onProgress) {
              // Calculate overall progress for this batch
              const batchStartProgress = (batchIndex / batches.length) * 100;
              const batchEndProgress = ((batchIndex + 1) / batches.length) * 100;
              const batchProgressRange = batchEndProgress - batchStartProgress;
              const currentBatchProgress = batchStartProgress + (progress / 100) * batchProgressRange;
              onProgress(Math.round(currentBatchProgress));
            }
          },
          exportSettings
        );
        
        console.log(`Completed batch ${batchIndex + 1}/${batches.length}`);
        return batchOutput;
      });
      
      // Wait for all batches to complete in parallel
      const batchOutputs = await Promise.all(batchPromises);
      
      // Concatenate all batch outputs into final result
      console.log('Concatenating batch outputs...');
      const result = await this.concatenateVideoChunks(batchOutputs, outputPath, onProgress);
      
      // Clean up batch files
      for (const batchFile of batchOutputs) {
        try {
          if (fs.existsSync(batchFile)) {
            await fs.promises.unlink(batchFile);
          }
        } catch (cleanupError) {
          console.warn('Failed to cleanup batch file:', batchFile, cleanupError);
        }
      }
      
      console.log('All batches processed successfully in parallel');
      return result;
    } catch (error) {
      console.error('Parallel batch processing failed:', error);
      throw error;
    }
  }
  
  /**
   * Process overlays directly with FFmpeg (for small batches or single processing)
   */
  private async processOverlaysDirect(
    videoPath: string,
    overlayFiles: Array<{ file: string; startTime: number; endTime: number }>,
    outputPath: string,
    metadata: any,
    onProgress?: (progress: number) => void,
    exportSettings?: { framerate: number; quality: string }
  ): Promise<string> {
    const fps = exportSettings?.framerate || metadata.fps;
    const quality = exportSettings?.quality || 'high';
    
    return new Promise((resolve, reject) => {
      // Detect hardware acceleration
      const hwaccel = this.detectHardwareAcceleration();
      
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
        
        // Create overlay filter with microsecond precision
        const overlayFilter = `${currentInput}[${inputIndex}:v]overlay=enable='between(t,${overlay.startTime.toFixed(6)},${overlay.endTime.toFixed(6)})'${outputLabel}`;
        
        if (filterComplex) {
          filterComplex += ';';
        }
        filterComplex += overlayFilter;
        
        // Update current input for next iteration
        currentInput = outputLabel;
      });
      
      console.log(`Processing ${overlayFiles.length} overlays with ${hwaccel || 'software'} acceleration`);
      
      // Apply filter complex
      command = command
        .complexFilter(filterComplex)
        .outputOptions([
          '-map', '[outv]',     // Map the video output from filter
          '-map', '0:a?',       // Map audio from original video (if it exists)
        ])
        .audioCodec('copy')     // Copy original audio without re-encoding
        .fps(fps);
      
      // Set video codec and quality with hardware acceleration
      if (hwaccel === 'cuda') {
        command = command.videoCodec('h264_nvenc');
        if (quality === 'high') {
          command = command.outputOptions(['-rc', 'vbr', '-cq', '18']);
        } else if (quality === 'medium') {
          command = command.outputOptions(['-rc', 'vbr', '-cq', '23']);
        } else {
          command = command.outputOptions(['-rc', 'vbr', '-cq', '28']);
        }
      } else if (hwaccel === 'qsv') {
        command = command.videoCodec('h264_qsv');
        if (quality === 'high') {
          command = command.outputOptions(['-global_quality', '18']);
        } else if (quality === 'medium') {
          command = command.outputOptions(['-global_quality', '23']);
        } else {
          command = command.outputOptions(['-global_quality', '28']);
        }
      } else if (hwaccel === 'amf') {
        command = command.videoCodec('h264_amf');
        if (quality === 'high') {
          command = command.outputOptions(['-rc', 'vbr_peak', '-qp_i', '18']);
        } else if (quality === 'medium') {
          command = command.outputOptions(['-rc', 'vbr_peak', '-qp_i', '23']);
        } else {
          command = command.outputOptions(['-rc', 'vbr_peak', '-qp_i', '28']);
        }
      } else {
        // Software encoding
        command = command.videoCodec('libx264');
        if (quality === 'high') {
          command = command.outputOptions(['-crf', '18']);
        } else if (quality === 'medium') {
          command = command.outputOptions(['-crf', '23']);
        } else {
          command = command.outputOptions(['-crf', '28']);
        }
      }
      
      // Add compatibility options
      command = command.outputOptions([
        '-movflags', '+faststart',
        '-pix_fmt', 'yuv420p',
        '-profile:v', 'baseline',
        '-level', '3.0',
        '-threads', Math.max(1, Math.floor(this.maxWorkers / 2)).toString()
      ]);
      
      command
        .output(outputPath)
        .on('start', (commandLine: string) => {
          console.log('Hardware-accelerated FFmpeg command started');
          this.activeFFmpegProcesses.add(command);
        })
        .on('progress', (progress: any) => {
          if (onProgress) {
            // FFmpeg progress is 100% of this phase
            const ffmpegProgress = progress.percent || 0;
            onProgress(ffmpegProgress);
          }
        })
        .on('end', () => {
          console.log('Hardware-accelerated FFmpeg processing completed successfully');
          this.activeFFmpegProcesses.delete(command);
          resolve(outputPath);
        })
        .on('error', async (err: any) => {
          console.error('Hardware-accelerated FFmpeg processing failed:', err);
          this.activeFFmpegProcesses.delete(command);
          
          // Check if it's a cancellation
          if (this.isCancelled) {
            reject(new Error('FFmpeg processing cancelled'));
            return;
          }
          
          // Check if it's a resource limit error
          const errorMessage = err.message || String(err);
          if (errorMessage.includes('Resource temporarily unavailable') || 
              errorMessage.includes('Too many open files') ||
              errorMessage.includes('No such file or directory')) {
            console.log('Resource limit error detected, trying with smaller batch size...');
            try {
              // Try with smaller batch size
              const smallerBatchSize = Math.max(10, Math.floor(overlayFiles.length / 4));
              const result = await this.processOverlaysInBatches(
                videoPath,
                overlayFiles,
                outputPath,
                metadata,
                onProgress,
                exportSettings,
                smallerBatchSize
              );
              resolve(result);
            } catch (retryError) {
              console.error('Retry with smaller batch size also failed:', retryError);
              reject(new Error(`FFmpeg processing failed after retry: ${err.message}`));
            }
          } else {
            reject(new Error(`FFmpeg processing failed: ${err.message}`));
          }
        })
        .run();
    });
  }

  /**
   * Detect available hardware acceleration
   */
  private detectHardwareAcceleration(): string | null {
    // Check for Apple Metal (macOS)
    if (process.platform === 'darwin') {
      try {
        const { execSync } = require('child_process');
        // Check if Metal is available by looking for Metal framework
        execSync('system_profiler SPDisplaysDataType | grep -i metal', { stdio: 'ignore' });
        return 'metal';
      } catch {
        // Metal not available or not detected
      }
    }

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
   * Get optimal batch size based on system limits
   */
  private getOptimalBatchSize(): number {
    try {
      // Check system file descriptor limits
      const { execSync } = require('child_process');
      const platform = process.platform;
      
      let maxFiles = 1024; // Default fallback
      
      if (platform === 'darwin' || platform === 'linux') {
        try {
          const output = execSync('ulimit -n', { encoding: 'utf8' });
          maxFiles = parseInt(output.trim());
        } catch {
          // Use default if ulimit fails
        }
      }
      
      // Calculate safe batch size (leave room for system files and other processes)
      const safeBatchSize = Math.max(10, Math.min(100, Math.floor(maxFiles / 10)));
      
      console.log(`System file descriptor limit: ${maxFiles}, Using batch size: ${safeBatchSize}`);
      return safeBatchSize;
    } catch (error) {
      console.warn('Could not determine system limits, using default batch size:', error);
      return 50; // Conservative default
    }
  }

  /**
   * Generate overlay images for each word highlight state
   * Creates one image per word that shows that specific word highlighted
   */
  private async generateOverlayImages(
    captions: any[],
    metadata: any,
    tempDir: string,
    onProgress?: (progress: number) => void
  ): Promise<Array<{ file: string; startTime: number; endTime: number }>> {
    const overlayFiles: Array<{ file: string; startTime: number; endTime: number }> = [];
    
    console.log(`Generating overlay images for ${captions.length} captions...`);
    
    let totalImages = 0;
    let processedImages = 0;
    
    // Count total images needed
    for (const caption of captions) {
      if (caption.words && caption.words.length > 0) {
        totalImages += caption.words.length; // One image per word
      } else {
        totalImages += 1; // One image for simple text caption
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
        // Generate one image per word highlight state
        for (let wordIndex = 0; wordIndex < caption.words.length; wordIndex++) {
          const word = caption.words[wordIndex];
          const wordStart = word.start;
          const wordEnd = word.end;
          
          if (wordStart === undefined || wordEnd === undefined || wordStart >= wordEnd) {
            console.warn('Skipping word with invalid timing:', word);
            continue;
          }
          
          // Generate overlay image for this word highlight state
          const overlayFileName = `caption_${String(captionIndex).padStart(3, '0')}_word_${String(wordIndex).padStart(3, '0')}.png`;
          const overlayPath = path.join(tempDir, overlayFileName);
          
          // Create PNG with this specific word highlighted
          await this.renderWordHighlightImage(
            caption,
            wordIndex,
            metadata.width,
            metadata.height,
            overlayPath
          );
          
          // Calculate precise timing with microsecond precision
          const startTimeSeconds = wordStart / 1000;
          const endTimeSeconds = wordEnd / 1000;
          
          // Ensure no overlap with next word
          let adjustedEndTime = endTimeSeconds;
          if (wordIndex < caption.words.length - 1) {
            const nextWordStart = caption.words[wordIndex + 1].start / 1000;
            // If next word starts immediately after this one, reduce by 1 microsecond
            if (Math.abs(endTimeSeconds - nextWordStart) < 0.001) { // Within 1ms = adjacent words
              adjustedEndTime = nextWordStart - 0.000001; // 1 microsecond before next word
            }
          }
          
          overlayFiles.push({
            file: overlayPath,
            startTime: startTimeSeconds,
            endTime: adjustedEndTime
          });
          
          // Debug timing with microsecond precision
          const gap = overlayFiles.length > 1 ? startTimeSeconds - overlayFiles[overlayFiles.length - 2].endTime : 0;
          const gapMicroseconds = Math.round(gap * 1000000);
          console.log(`Word "${word.word}": ${startTimeSeconds.toFixed(6)}s - ${adjustedEndTime.toFixed(6)}s [Gap: ${gapMicroseconds}μs]`);
          
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
        await this.renderStaticCaptionImage(
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
    
    console.log(`Generated ${overlayFiles.length} overlay images`);
    return overlayFiles;
  }

  /**
   * Render word highlight overlay image (shows specific word highlighted)
   */
  private async renderWordHighlightImage(
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
   * Render static caption image (for captions without word timing)
   */
  private async renderStaticCaptionImage(
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
    
    // Render simple text overlay
    await this.renderSimpleTextOverlay(ctx, caption.text, caption, videoWidth, videoHeight);
    
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
   * Render karaoke word highlight (specific word highlighted in single line)
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
    
    // Calculate total width for single line
    const wordSpacing = 12 * scale;
    const wordPadding = 4 * scale;
    
    let totalWidth = 0;
    const wordWidths: number[] = [];
    
    for (const word of words) {
      const transformedWord = this.applyTextTransform(word.word, textTransform);
      const wordWidth = ctx.measureText(transformedWord).width;
      wordWidths.push(wordWidth);
      totalWidth += wordWidth + (wordPadding * 2) + wordSpacing;
    }
    totalWidth -= wordSpacing; // Remove last spacing
    
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
    
    // Draw words in single line with specific word highlighted
    let currentX = x - (totalWidth / 2) + wordPadding;
    
    for (let i = 0; i < words.length; i++) {
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
          // Emphasis mode: increase font size and use highlighter color
          const emphasizedFontSize = fontSize * 1.05;
          ctx.font = `bold ${emphasizedFontSize}px ${fontFamily}`;
          ctx.fillStyle = `rgba(${highlighterColor.r}, ${highlighterColor.g}, ${highlighterColor.b}, ${highlighterColor.a})`;
        } else {
          // Background highlight mode
          ctx.fillStyle = `rgba(${highlighterColor.r}, ${highlighterColor.g}, ${highlighterColor.b}, ${highlighterColor.a})`;
          ctx.fillRect(wordBoxX, wordBoxY, wordBoxWidth, wordBoxHeight);
          ctx.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, ${textColor.a})`;
        }
      } else {
        // Normal text color
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
    
    // Set font
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    ctx.textAlign = caption.style?.textAlign || 'center';
    ctx.textBaseline = 'bottom';
    
    const x = (canvasWidth * caption.style.position.x) / 100;
    const y = (canvasHeight * caption.style.position.y) / 100;
    
    // Show words progressively up to the highlighted word
    const visibleWords = words.slice(0, highlightedWordIndex + 1);
    const lineHeight = fontSize + 8;
    const firstWordY = y;
    
    // Draw each word vertically
    for (let wordIndex = 0; wordIndex < visibleWords.length; wordIndex++) {
      const word = visibleWords[wordIndex];
      const wordY = firstWordY + (wordIndex * lineHeight);
      const isHighlighted = wordIndex === highlightedWordIndex;
      
      const displayWord = this.applyTextTransform(word.word, caption.style?.textTransform || 'none');
      
      // Measure word for background
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
          // Emphasis mode: increase font size and use highlighter color
          const emphasizedFontSize = fontSize * 1.05;
          ctx.font = `bold ${emphasizedFontSize}px ${fontFamily}`;
          ctx.fillStyle = `rgba(${highlighterColor.r}, ${highlighterColor.g}, ${highlighterColor.b}, ${highlighterColor.a})`;
        } else {
          // Background highlighting
          ctx.fillStyle = `rgba(${highlighterColor.r}, ${highlighterColor.g}, ${highlighterColor.b}, ${highlighterColor.a})`;
          ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
          ctx.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, ${textColor.a})`;
        }
      } else {
        // Normal text color
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

  // Helper methods
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

// Worker thread execution logic
if (!isMainThread && workerData?.isWorker) {
  // This code runs in worker threads
  const { captions, batchIndex, metadata, tempDir } = workerData;
  
  // Import required modules in worker context
  const fs = require('fs');
  const path = require('path');
  const { Canvas } = require('canvas');
  
  /**
   * Worker thread caption processing function
   */
  const processCaptionBatchInWorker = async () => {
    const overlayFiles: Array<{ file: string; startTime: number; endTime: number }> = [];
    let processedCaptions = 0;
    
    try {
      for (const caption of captions) {
        const captionStart = caption.startTime !== undefined ? caption.startTime : caption.start;
        const captionEnd = caption.endTime !== undefined ? caption.endTime : caption.end;
        
        // Skip captions with invalid timing
        if (captionStart === undefined || captionEnd === undefined || captionStart >= captionEnd) {
          continue;
        }
        
        // Check if subtitles should be burned in (default: true)
        const shouldBurnIn = caption.style?.burnInSubtitles !== false;
        if (!shouldBurnIn) {
          continue; // Skip this caption if burnInSubtitles is false
        }
        
        if (caption.words && caption.words.length > 0) {
          // Generate one image per word highlight state
          for (let wordIndex = 0; wordIndex < caption.words.length; wordIndex++) {
            const word = caption.words[wordIndex];
            const wordStart = word.start;
            const wordEnd = word.end;
            
            if (wordStart === undefined || wordEnd === undefined || wordStart >= wordEnd) {
              continue;
            }
            
            // Generate overlay image for this word highlight state
            const overlayFileName = `batch_${batchIndex}_caption_${String(processedCaptions).padStart(3, '0')}_word_${String(wordIndex).padStart(3, '0')}.png`;
            const overlayPath = path.join(tempDir, overlayFileName);
            
            // Create PNG with this specific word highlighted
            await renderWordHighlightImageInWorker(
              caption,
              wordIndex,
              metadata.width,
              metadata.height,
              overlayPath
            );
            
            // Calculate precise timing with microsecond precision
            const startTimeSeconds = wordStart / 1000;
            const endTimeSeconds = wordEnd / 1000;
            
            // Ensure no overlap with next word
            let adjustedEndTime = endTimeSeconds;
            if (wordIndex < caption.words.length - 1) {
              const nextWordStart = caption.words[wordIndex + 1].start / 1000;
              // If next word starts immediately after this one, reduce by 1 microsecond
              if (Math.abs(endTimeSeconds - nextWordStart) < 0.001) { // Within 1ms = adjacent words
                adjustedEndTime = nextWordStart - 0.000001; // 1 microsecond before next word
              }
            }
            
            overlayFiles.push({
              file: overlayPath,
              startTime: startTimeSeconds,
              endTime: adjustedEndTime
            });
          }
        } else {
          // Simple text caption (no word timing) - just one static image
          const overlayFileName = `batch_${batchIndex}_caption_${String(processedCaptions).padStart(3, '0')}_static.png`;
          const overlayPath = path.join(tempDir, overlayFileName);
          
          // Generate static PNG overlay for this caption
          await renderStaticCaptionImageInWorker(
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
        }
        
        processedCaptions++;
        
        // Report progress every 5 captions
        if (processedCaptions % 5 === 0) {
          parentPort?.postMessage({
            type: 'progress',
            progress: Math.round((processedCaptions / captions.length) * 100)
          });
        }
      }
      
      // Report completion
      parentPort?.postMessage({
        type: 'complete',
        overlayFiles
      });
      
    } catch (error) {
      // Report error
      const errorMessage = error instanceof Error ? error.message : String(error);
      parentPort?.postMessage({
        type: 'error',
        error: errorMessage
      });
    }
  }
  
  /**
   * Render word highlight overlay image in worker thread
   */
  const renderWordHighlightImageInWorker = async (
    caption: any,
    highlightedWordIndex: number,
    videoWidth: number,
    videoHeight: number,
    outputPath: string
  ): Promise<void> => {
    // Create canvas with video dimensions
    const canvas = new Canvas(videoWidth, videoHeight);
    const ctx = canvas.getContext('2d');
    
    // Set transparent background
    ctx.clearRect(0, 0, videoWidth, videoHeight);
    
    // Render caption with specific word highlighted
    if (caption.style.renderMode === 'progressive') {
      await renderProgressiveWordHighlightInWorker(ctx, caption.words, caption, highlightedWordIndex, videoWidth, videoHeight);
    } else {
      await renderKaraokeWordHighlightInWorker(ctx, caption.words, caption, highlightedWordIndex, videoWidth, videoHeight);
    }
    
    // Save as PNG with transparency
    const buffer = canvas.toBuffer('image/png');
    await fs.promises.writeFile(outputPath, buffer);
  }
  
  /**
   * Render static caption image in worker thread
   */
  const renderStaticCaptionImageInWorker = async (
    caption: any,
    videoWidth: number,
    videoHeight: number,
    outputPath: string
  ): Promise<void> => {
    // Create canvas with video dimensions
    const canvas = new Canvas(videoWidth, videoHeight);
    const ctx = canvas.getContext('2d');
    
    // Set transparent background
    ctx.clearRect(0, 0, videoWidth, videoHeight);
    
    // Render simple text overlay
    await renderSimpleTextOverlayInWorker(ctx, caption.text, caption, videoWidth, videoHeight);
    
    // Save as PNG with transparency
    const buffer = canvas.toBuffer('image/png');
    await fs.promises.writeFile(outputPath, buffer);
  }
  
  /**
   * Render simple text overlay in worker thread
   */
  const renderSimpleTextOverlayInWorker = async (
    ctx: any,
    text: string,
    caption: any,
    canvasWidth: number,
    canvasHeight: number
  ): Promise<void> => {
    const baseFontSize = caption.style?.fontSize || 32;
    const scale = caption.style?.scale || 1;
    const fontSize = baseFontSize * scale;
    const fontFamily = mapFontNameInWorker(caption.style?.font || 'Arial');
    const textColor = parseColorInWorker(caption.style?.textColor || '#ffffff');
    const backgroundColor = parseColorInWorker(caption.style?.backgroundColor || 'transparent');
    const strokeColor = parseColorInWorker(caption.style?.strokeColor || 'transparent');
    const strokeWidth = caption.style?.strokeWidth || 0;
    
    // Apply text transformation
    const displayText = applyTextTransformInWorker(text, caption.style?.textTransform || 'none');
    
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
   * Render karaoke word highlight in worker thread
   */
  const renderKaraokeWordHighlightInWorker = async (
    ctx: any,
    words: any[],
    caption: any,
    highlightedWordIndex: number,
    canvasWidth: number,
    canvasHeight: number
  ): Promise<void> => {
    const baseFontSize = caption.style?.fontSize || 32;
    const scale = caption.style?.scale || 1;
    const fontSize = baseFontSize * scale;
    const fontFamily = mapFontNameInWorker(caption.style?.font || 'Arial');
    const textColor = parseColorInWorker(caption.style?.textColor || '#ffffff');
    const highlighterColor = parseColorInWorker(caption.style?.highlighterColor || '#ffff00');
    const backgroundColor = parseColorInWorker(caption.style?.backgroundColor || 'transparent');
    const strokeColor = parseColorInWorker(caption.style?.strokeColor || 'transparent');
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
    const wordWidths: number[] = [];
    
    for (const word of words) {
      const transformedWord = applyTextTransformInWorker(word.word, textTransform);
      const wordWidth = ctx.measureText(transformedWord).width;
      wordWidths.push(wordWidth);
      totalWidth += wordWidth + (wordPadding * 2) + wordSpacing;
    }
    totalWidth -= wordSpacing; // Remove last spacing
    
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
    
    // Draw words in single line with specific word highlighted
    let currentX = x - (totalWidth / 2) + wordPadding;
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const displayWord = applyTextTransformInWorker(word.word, textTransform);
      const wordWidth = wordWidths[i];
      const isHighlighted = i === highlightedWordIndex;
      
      const wordBoxWidth = wordWidth + (wordPadding * 2);
      const wordBoxHeight = fontSize + (wordPadding * 2);
      const wordBoxX = currentX - wordPadding;
      const wordBoxY = y - (fontSize / 2) - wordPadding;
      
      // Handle highlighting for the specific word
      if (isHighlighted) {
        if (caption.style.emphasizeMode) {
          // Emphasis mode: increase font size and use highlighter color
          const emphasizedFontSize = fontSize * 1.05;
          ctx.font = `bold ${emphasizedFontSize}px ${fontFamily}`;
          ctx.fillStyle = `rgba(${highlighterColor.r}, ${highlighterColor.g}, ${highlighterColor.b}, ${highlighterColor.a})`;
        } else {
          // Background highlight mode
          ctx.fillStyle = `rgba(${highlighterColor.r}, ${highlighterColor.g}, ${highlighterColor.b}, ${highlighterColor.a})`;
          ctx.fillRect(wordBoxX, wordBoxY, wordBoxWidth, wordBoxHeight);
          ctx.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, ${textColor.a})`;
        }
      } else {
        // Normal text color
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
   * Render progressive word highlight in worker thread
   */
  const renderProgressiveWordHighlightInWorker = async (
    ctx: any,
    words: any[],
    caption: any,
    highlightedWordIndex: number,
    canvasWidth: number,
    canvasHeight: number
  ): Promise<void> => {
    const baseFontSize = caption.style?.fontSize || 32;
    const scale = caption.style?.scale || 1;
    const fontSize = baseFontSize * scale;
    const fontFamily = mapFontNameInWorker(caption.style?.font || 'Arial');
    const textColor = parseColorInWorker(caption.style?.textColor || '#ffffff');
    const highlighterColor = parseColorInWorker(caption.style?.highlighterColor || '#ffff00');
    const backgroundColor = parseColorInWorker(caption.style?.backgroundColor || 'transparent');
    
    // Set font
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    ctx.textAlign = caption.style?.textAlign || 'center';
    ctx.textBaseline = 'bottom';
    
    const x = (canvasWidth * caption.style.position.x) / 100;
    const y = (canvasHeight * caption.style.position.y) / 100;
    
    // Show words progressively up to the highlighted word
    const visibleWords = words.slice(0, highlightedWordIndex + 1);
    const lineHeight = fontSize + 8;
    const firstWordY = y;
    
    // Draw each word vertically
    for (let wordIndex = 0; wordIndex < visibleWords.length; wordIndex++) {
      const word = visibleWords[wordIndex];
      const wordY = firstWordY + (wordIndex * lineHeight);
      const isHighlighted = wordIndex === highlightedWordIndex;
      
      const displayWord = applyTextTransformInWorker(word.word, caption.style?.textTransform || 'none');
      
      // Measure word for background
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
          // Emphasis mode: increase font size and use highlighter color
          const emphasizedFontSize = fontSize * 1.05;
          ctx.font = `bold ${emphasizedFontSize}px ${fontFamily}`;
          ctx.fillStyle = `rgba(${highlighterColor.r}, ${highlighterColor.g}, ${highlighterColor.b}, ${highlighterColor.a})`;
        } else {
          // Background highlighting
          ctx.fillStyle = `rgba(${highlighterColor.r}, ${highlighterColor.g}, ${highlighterColor.b}, ${highlighterColor.a})`;
          ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
          ctx.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, ${textColor.a})`;
        }
      } else {
        // Normal text color
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
   * Helper functions for worker thread
   */
  function mapFontNameInWorker(fontName: string): string {
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
  
  // Start processing the caption batch
  processCaptionBatchInWorker().catch((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    parentPort?.postMessage({
      type: 'error',
      error: errorMessage
    });
  });
}