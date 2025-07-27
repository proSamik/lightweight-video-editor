import ffmpeg = require('fluent-ffmpeg');
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class ModernVideoRenderer {
  private static instance: ModernVideoRenderer;

  private constructor() {
    // No browser-specific initialization needed
  }

  public static getInstance(): ModernVideoRenderer {
    if (!ModernVideoRenderer.instance) {
      ModernVideoRenderer.instance = new ModernVideoRenderer();
    }
    return ModernVideoRenderer.instance;
  }

  /**
   * Renders a video with captions using FFmpeg with rich styling
   * @param videoPath - Path to the input video file
   * @param captions - Array of caption segments with styling information
   * @param outputPath - Path where the output video will be saved
   * @param onProgress - Optional progress callback function
   * @returns Promise that resolves to the output file path
   */
  public async renderVideoWithCaptions(
    videoPath: string,
    captions: any[],
    outputPath: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      if (!captions || captions.length === 0) {
        console.log('No captions provided, copying video without modifications');
        return await this.copyVideo(videoPath, outputPath);
      }

      console.log(`Processing ${captions.length} caption segments with rich styling`);
      
      // Get video metadata
      const metadata = await this.getVideoMetadata(videoPath);
      console.log('Video metadata:', metadata);
      
      // Create ASS subtitle file for rich styling
      const assPath = await this.createASSSubtitles(captions, outputPath);
      console.log(`Created ASS subtitle file at: ${assPath}`);
      
      // Debug: Read and log ASS file content
      const assContent = await fs.promises.readFile(assPath, 'utf8');
      console.log('ASS file content:');
      console.log(assContent);
      
      // Verify ASS file exists and has content
      const assExists = await fs.promises.access(assPath).then(() => true).catch(() => false);
      if (!assExists) {
        throw new Error('ASS subtitle file was not created');
      }
      
      // Burn subtitles into video using FFmpeg
      const result = await this.burnSubtitlesIntoVideo(videoPath, assPath, outputPath, onProgress);
      
      // Clean up ASS file
      await fs.promises.unlink(assPath).catch(() => {});
      
      return result;
    } catch (error) {
      console.error('Rich subtitle rendering failed, fallback to basic copy:', error);
      // Final fallback: just copy the video
      return await this.copyVideo(videoPath, outputPath);
    }
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
            fps: eval(videoStream.r_frame_rate || '30') // Convert fraction to number, default to 30fps
          });
        }
      });
    });
  }

  /**
   * Creates ASS (Advanced SubStation Alpha) subtitle file for rich styling
   */
  private async createASSSubtitles(captions: any[], outputPath: string): Promise<string> {
    const assPath = outputPath.replace('.mp4', '_subtitles.ass');
    
    let assContent = `[Script Info]
Title: Video Captions
ScriptType: v4.00+
WrapStyle: 1
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,32,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    for (const caption of captions) {
      if (caption.words && caption.words.length > 0) {
        // For karaoke effect, create individual events for each word
        for (const word of caption.words) {
          const startTime = this.formatASSTime(word.start);
          const endTime = this.formatASSTime(word.end);
          const text = this.escapeASSText(word.word);
          
          assContent += `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${text}\n`;
        }
      } else {
        // Handle full caption segments
        const startTime = this.formatASSTime(caption.startTime);
        const endTime = this.formatASSTime(caption.endTime);
        const text = this.escapeASSText(caption.text);
        
        assContent += `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${text}\n`;
      }
    }

    await fs.promises.writeFile(assPath, assContent, 'utf8');
    return assPath;
  }

  /**
   * Escapes text for ASS format
   */
  private escapeASSText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}');
  }

  /**
   * Formats time in milliseconds to ASS format (H:MM:SS.cc)
   */
  private formatASSTime(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((milliseconds % 1000) / 10);

    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  }

  /**
   * Burns subtitles into video using FFmpeg with audio preservation
   */
  private async burnSubtitlesIntoVideo(
    videoPath: string,
    assPath: string,
    outputPath: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log(`Burning ASS subtitles from ${assPath} into video`);
      
      // Use absolute path for ASS file to avoid path issues
      const absoluteAssPath = path.resolve(assPath);
      console.log(`Using absolute ASS path: ${absoluteAssPath}`);
      
      const command = ffmpeg(videoPath)
        .outputOptions([
          '-vf', `ass=${absoluteAssPath}`,
          '-c:v', 'libx264',
          '-c:a', 'aac',
          '-preset', 'medium',
          '-crf', '23'
        ])
        .format('mp4')
        .output(outputPath)
        .on('start', (commandLine: string) => {
          console.log('FFmpeg command:', commandLine);
        })
        .on('progress', (progress: any) => {
          console.log('FFmpeg progress:', progress);
          if (onProgress && progress.percent) {
            onProgress(progress.percent);
          }
        })
        .on('end', () => {
          console.log('FFmpeg processing completed successfully');
          resolve(outputPath);
        })
        .on('error', (err: any) => {
          console.error('FFmpeg error:', err);
          reject(err);
        });

      command.run();
    });
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
   * Maps font option enum to actual font family names
   * @param fontOption - The font option from the enum
   * @returns The actual font family name
   */
  private mapFontName(fontOption: string): string {
    const fontMap: { [key: string]: string } = {
      'SF_PRO_DISPLAY_SEMIBOLD': 'SF Pro Display',
      'HELVETICA_NEUE_BOLD': 'Helvetica Neue',
      'ARIAL_BLACK': 'Arial',
      'FUTURA_BOLD': 'Futura',
      'TIMES_NEW_ROMAN_BOLD': 'Times New Roman',
      'GEORGIA_BOLD': 'Georgia'
    };
    
    return fontMap[fontOption] || 'Arial';
  }
}