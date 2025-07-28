import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
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
    onProgress?: (progress: number) => void
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

      // Use Canvas-based rendering for perfect preview matching
      try {
        console.log('Starting Canvas-based video rendering...');
        const { CanvasVideoRenderer } = await import('./canvasRenderer');
        const renderer = CanvasVideoRenderer.getInstance();
        
        // Create progress wrapper to provide detailed updates
        const progressWrapper = (progress: number) => {
          console.log(`Overall rendering progress: ${Math.round(progress)}%`);
          if (onProgress) {
            onProgress(progress);
          }
        };
        
        const result = await renderer.renderVideoWithCaptions(videoPath, captionsData, outputPath, progressWrapper);
        console.log('Canvas-based rendering completed successfully');
        resolve(result);
      } catch (error) {
        console.error('Canvas rendering failed, fallback to basic copy:', error);
        
        // Fallback: just copy the video if modern rendering fails
        const command = ffmpeg(videoPath)
          .videoCodec('copy')
          .audioCodec('copy')
          .output(outputPath)
          .on('end', () => resolve(outputPath))
          .on('error', (err: any) => reject(new Error(`Fallback failed: ${err.message}`)));
        
        command.run();
      }
    });
  }


  public checkFFmpegAvailability(): boolean {
    return this.ffmpegPath !== '';
  }
}

export default FFmpegService;