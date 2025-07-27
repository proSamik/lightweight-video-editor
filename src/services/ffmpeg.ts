import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { VideoFile } from '../types';

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
    // Check common macOS paths for FFmpeg
    const commonPaths = [
      '/usr/local/bin/ffmpeg',
      '/opt/homebrew/bin/ffmpeg',
      '/usr/bin/ffmpeg',
      'ffmpeg' // System PATH
    ];

    const probePaths = [
      '/usr/local/bin/ffprobe',
      '/opt/homebrew/bin/ffprobe',
      '/usr/bin/ffprobe',
      'ffprobe' // System PATH
    ];

    for (const ffmpegPath of commonPaths) {
      try {
        if (fs.existsSync(ffmpegPath) || ffmpegPath === 'ffmpeg') {
          this.ffmpegPath = ffmpegPath;
          break;
        }
      } catch (error) {
        continue;
      }
    }

    for (const probePath of probePaths) {
      try {
        if (fs.existsSync(probePath) || probePath === 'ffprobe') {
          this.ffprobePath = probePath;
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (this.ffmpegPath) {
      ffmpeg.setFfmpegPath(this.ffmpegPath);
    }
    if (this.ffprobePath) {
      ffmpeg.setFfprobePath(this.ffprobePath);
    }
  }

  public async getVideoMetadata(videoPath: string): Promise<VideoFile> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err: any, metadata: any) => {
        if (err) {
          reject(err);
          return;
        }

        const duration = metadata.format.duration || 0;
        const size = metadata.format.size || 0;

        resolve({
          path: videoPath,
          name: path.basename(videoPath),
          duration: duration * 1000, // Convert to milliseconds
          size: size
        });
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

      // Use modern Canvas + WebCodecs rendering for perfect preview matching
      try {
        const { ModernVideoRenderer } = await import('./canvasRenderer');
        const renderer = ModernVideoRenderer.getInstance();
        const result = await renderer.renderVideoWithCaptions(videoPath, captionsData, outputPath, onProgress);
        resolve(result);
      } catch (error) {
        console.error('Modern rendering failed, fallback to basic copy:', error);
        
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