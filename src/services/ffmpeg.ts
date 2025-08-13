import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';
import { VideoFile } from '../types';

// Import bundled FFmpeg binaries
let ffmpegPath: string;
let ffprobePath: string;

try {
  // Get the paths to the packaged versions of the binaries
  ffmpegPath = require('ffmpeg-static').replace('app.asar', 'app.asar.unpacked');
  ffprobePath = require('ffprobe-static').path.replace('app.asar', 'app.asar.unpacked');
} catch (error) {
  // Fallback to system FFmpeg if bundled version is not available
  ffmpegPath = '';
  ffprobePath = '';
}

export class FFmpegService {
  private static instance: FFmpegService;
  private ffmpegPath: string = '';
  private ffprobePath: string = '';

  private constructor() {
    this.detectFFmpegPaths();
  }

  public static getInstance(): FFmpegService {
    if (!FFmpegService.instance) {
      FFmpegService.instance = new FFmpegService();
    }
    return FFmpegService.instance;
  }

  private detectFFmpegPaths(): void {
    // First try to use bundled FFmpeg binaries
    if (ffmpegPath && ffprobePath) {
      try {
        if (fs.existsSync(ffmpegPath) && fs.existsSync(ffprobePath)) {
          this.ffmpegPath = ffmpegPath;
          this.ffprobePath = ffprobePath;
          console.log(`Using bundled FFmpeg: ${ffmpegPath}`);
          console.log(`Using bundled FFprobe: ${ffprobePath}`);
        }
      } catch (error) {
        console.log('Bundled FFmpeg not found, falling back to system FFmpeg');
      }
    }

    // If bundled binaries not available, check system paths
    if (!this.ffmpegPath || !this.ffprobePath) {
      const commonPaths = [
        '/usr/local/bin/ffmpeg',
        '/opt/homebrew/bin/ffmpeg',
        '/usr/bin/ffmpeg',
        'C:\\ffmpeg\\bin\\ffmpeg.exe', // Windows
        'ffmpeg' // System PATH
      ];

      const probePaths = [
        '/usr/local/bin/ffprobe',
        '/opt/homebrew/bin/ffprobe',
        '/usr/bin/ffprobe',
        'C:\\ffmpeg\\bin\\ffprobe.exe', // Windows
        'ffprobe' // System PATH
      ];

      // Try to find FFmpeg
      for (const path of commonPaths) {
        try {
          if (path === 'ffmpeg') {
            // Check if ffmpeg is in system PATH
            const { execSync } = require('child_process');
            execSync('which ffmpeg', { stdio: 'pipe' });
            this.ffmpegPath = 'ffmpeg';
            console.log('FFmpeg found in system PATH');
            break;
          } else if (fs.existsSync(path)) {
            this.ffmpegPath = path;
            console.log(`FFmpeg found at: ${path}`);
            break;
          }
        } catch (error) {
          continue;
        }
      }

      // Try to find FFprobe
      for (const path of probePaths) {
        try {
          if (path === 'ffprobe') {
            // Check if ffprobe is in system PATH
            const { execSync } = require('child_process');
            execSync('which ffprobe', { stdio: 'pipe' });
            this.ffprobePath = 'ffprobe';
            console.log('FFprobe found in system PATH');
            break;
          } else if (fs.existsSync(path)) {
            this.ffprobePath = path;
            console.log(`FFprobe found at: ${path}`);
            break;
          }
        } catch (error) {
          continue;
        }
      }
    }

    // Set the paths for fluent-ffmpeg
    if (this.ffmpegPath) {
      ffmpeg.setFfmpegPath(this.ffmpegPath);
    }
    if (this.ffprobePath) {
      ffmpeg.setFfprobePath(this.ffprobePath);
    }

    console.log(`Final FFmpeg path: ${this.ffmpegPath}`);
    console.log(`Final FFprobe path: ${this.ffprobePath}`);
  }

  public async getVideoMetadata(videoPath: string): Promise<VideoFile> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err: any, metadata: any) => {
        if (err) {
          reject(err);
          return;
        }

        const duration = metadata.format.duration || 0;
        const videoFile: VideoFile = {
          name: path.basename(videoPath),
          path: videoPath,
          duration: duration,
          width: metadata.streams.find((s: any) => s.width)?.width || 0,
          height: metadata.streams.find((s: any) => s.height)?.height || 0
        };

        resolve(videoFile);
      });
    });
  }

  public async extractAudio(videoPath: string, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const audioPath = path.join(outputPath, `${Date.now()}_audio.wav`);
      
      ffmpeg(videoPath)
        .audioCodec('pcm_s16le')
        .audioChannels(1)
        .audioFrequency(16000)
        .format('wav')
        .output(audioPath)
        .on('end', () => {
          resolve(audioPath);
        })
        .on('error', (err: any) => {
          reject(err);
        })
        .run();
    });
  }

  public async extractAudioToFile(videoPath: string, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const fileExtension = path.extname(outputPath).toLowerCase();
      let audioCodec = 'mp3';
      let format = 'mp3';
      
      // Set codec and format based on output file extension
      switch (fileExtension) {
        case '.wav':
          audioCodec = 'pcm_s16le';
          format = 'wav';
          break;
        case '.aac':
        case '.m4a':
          audioCodec = 'aac';
          format = 'aac';
          break;
        case '.mp3':
        default:
          audioCodec = 'mp3';
          format = 'mp3';
          break;
      }
      
      ffmpeg(videoPath)
        .audioCodec(audioCodec)
        .format(format)
        .output(outputPath)
        .on('end', () => {
          resolve(outputPath);
        })
        .on('error', (err: any) => {
          reject(err);
        })
        .run();
    });
  }

  /**
   * Extracts high-quality audio for project storage and waveform generation
   * This creates a persistent audio file that can be used for both transcription and waveforms
   */
  public async extractAudioForProject(videoPath: string, projectDir: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Ensure the project directory exists
      if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
      }
      
      // Create audio filename based on video file
      const videoBaseName = path.basename(videoPath, path.extname(videoPath));
      const audioFileName = `${videoBaseName}_extracted.wav`;
      const audioPath = path.join(projectDir, audioFileName);
      
      console.log(`Extracting audio for project: ${videoPath} -> ${audioPath}`);
      
      ffmpeg(videoPath)
        .audioCodec('pcm_s16le') // High quality uncompressed audio for best waveform quality
        .audioChannels(2) // Keep stereo for better waveform visualization
        .audioFrequency(44100) // Standard sample rate for good quality
        .format('wav')
        .output(audioPath)
        .on('end', () => {
          console.log(`Audio extracted successfully: ${audioPath}`);
          resolve(audioPath);
        })
        .on('error', (err: any) => {
          console.error('Error extracting audio for project:', err);
          reject(err);
        })
        .run();
    });
  }

  public async exportVideoWithNewAudio(
    videoPath: string,
    newAudioPath: string,
    outputPath: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // Merge video with new audio (no subtitles)
      const command = ffmpeg()
        .input(videoPath)
        .input(newAudioPath)
        .outputOptions([
          '-c:v copy',        // Copy video stream without re-encoding (faster)
          '-c:a aac',         // Re-encode audio to AAC for compatibility
          '-map 0:v:0',       // Use video from first input
          '-map 1:a:0',       // Use audio from second input (new audio)
          '-shortest'         // Match duration to shortest input
        ])
        .format('mp4')
        .output(outputPath)
        .on('progress', (progress: any) => {
          if (onProgress && progress.percent) {
            onProgress(progress.percent);
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

  public async replaceAudioTrack(videoPath: string, audioPath: string, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(videoPath)
        .input(audioPath)
        .outputOptions([
          '-c:v copy',        // Copy video stream without re-encoding
          '-c:a aac',         // Re-encode audio to AAC
          '-map 0:v:0',       // Use video from first input
          '-map 1:a:0',       // Use audio from second input
          '-shortest'         // Match duration to shortest input
        ])
        .format('mp4')
        .output(outputPath)
        .on('end', () => {
          resolve(outputPath);
        })
        .on('error', (err: any) => {
          reject(err);
        })
        .run();
    });
  }

  public async renderVideoWithSubtitles(
    videoPath: string,
    subtitlePath: string,
    outputPath: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const outputVideoPath = outputPath;

      const command = ffmpeg(videoPath)
        .videoFilters([
          {
            filter: 'subtitles',
            options: {
              filename: subtitlePath,
              force_style: 'FontName=Arial,FontSize=24,PrimaryColour=&Hffffff,SecondaryColour=&H000000,OutlineColour=&H000000,BackColour=&H80000000'
            }
          }
        ])
        .videoCodec('libx264')
        .audioCodec('aac')
        .format('mp4')
        .output(outputVideoPath)
        .on('progress', (progress: any) => {
          if (onProgress && progress.percent) {
            onProgress(progress.percent);
          }
        })
        .on('end', () => {
          resolve(outputVideoPath);
        })
        .on('error', (err: any) => {
          reject(err);
        });

      command.run();
    });
  }

  public async renderVideoWithBurnedCaptions(
    videoPath: string,
    captionsData: any[],
    outputPath: string,
    onProgress?: (progress: number) => void,
    exportSettings?: { framerate: number; quality: string }
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      if (!captionsData || captionsData.length === 0) {
        // No captions, just copy the video
        const copyCommand = ffmpeg(videoPath)
          .videoCodec('copy')
          .audioCodec('copy')
          .output(outputPath)
          .on('end', () => resolve(outputPath))
          .on('error', (err: any) => reject(err));
        
        copyCommand.run();
        return;
      }

      // Use GPU-accelerated Canvas-based rendering for perfect preview matching
      try {
        console.log('Starting GPU-accelerated Canvas-based video rendering...');
        const { GPUCanvasVideoRenderer } = await import('./gpuCanvasRenderer');
        const renderer = GPUCanvasVideoRenderer.getInstance();
        
        // Create progress wrapper to provide detailed updates
        const progressWrapper = (progress: number) => {
          if (onProgress) {
            onProgress(progress);
          }
        };
        
        const result = await renderer.renderVideoWithCaptions(videoPath, captionsData, outputPath, progressWrapper, exportSettings);
        console.log('GPU-accelerated Canvas-based rendering completed successfully');
        resolve(result);
      } catch (error) {
        console.error('GPU-accelerated rendering failed, trying CPU fallback:', error);
        
        // Fallback to CPU-based rendering
        // try {
        //   console.log('Falling back to CPU-based Canvas rendering...');
        //   const { CanvasVideoRenderer } = await import('./canvasRenderer');
        //   const renderer = CanvasVideoRenderer.getInstance();
          
        //   const progressWrapper = (progress: number) => {
        //     if (onProgress) {
        //       onProgress(progress);
        //     }
        //   };
          
        //   const result = await renderer.renderVideoWithCaptions(videoPath, captionsData, outputPath, progressWrapper, exportSettings);
        //   console.log('CPU-based rendering completed successfully');
        //   resolve(result);
        // } catch (fallbackError) {
        //   console.error('CPU rendering also failed, fallback to basic copy:', fallbackError);
          
        //   // Final fallback: just copy the video if all rendering fails
        //   const command = ffmpeg(videoPath)
        //     .videoCodec('copy')
        //     .audioCodec('copy')
        //     .output(outputPath)
        //     .on('end', () => resolve(outputPath))
        //     .on('error', (err: any) => reject(new Error(`All rendering methods failed: ${err.message}`)));
          
        //   command.run();
        // }
      }
    });
  }


  public checkFFmpegAvailability(): boolean {
    return this.ffmpegPath !== '';
  }

  /**
   * Cancel the current rendering operation
   */
  public cancelRendering(): void {
    try {
      const { StreamingVideoRenderer } = require('./streamingRenderer');
      const renderer = StreamingVideoRenderer.getInstance();
      renderer.cancel();
      console.log('[FFmpegService] Rendering cancellation requested');
    } catch (error) {
      console.warn('[FFmpegService] Error cancelling rendering:', error);
    }
  }

  /**
   * Cleanup method to ensure no orphaned FFmpeg processes
   * This should be called when the application is shutting down
   */
  public cleanup(): void {
    try {
      // Force kill any remaining FFmpeg processes
      const { exec } = require('child_process');
      
      // On macOS/Linux
      exec('pkill -f ffmpeg', (error: any) => {
        if (error) {
          console.warn('[FFmpegService] No FFmpeg processes to kill or error:', error.message);
        } else {
          console.log('[FFmpegService] Cleaned up FFmpeg processes');
        }
      });
      
      // On Windows (if needed)
      exec('taskkill /f /im ffmpeg.exe', (error: any) => {
        if (error) {
          console.warn('[FFmpegService] No FFmpeg processes to kill on Windows or error:', error.message);
        }
      });
    } catch (error) {
      console.warn('[FFmpegService] Error during cleanup:', error);
    }
  }
}

export default FFmpegService;