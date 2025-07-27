import ffmpeg from 'fluent-ffmpeg';
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
   * Renders a video with captions using FFmpeg
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
        // No captions, just copy the video
        return await this.copyVideo(videoPath, outputPath);
      }

      // Create a temporary SRT subtitle file
      const subtitlePath = await this.createSubtitleFile(captions);
      
      // Render video with burned-in subtitles
      const result = await this.renderVideoWithSubtitles(videoPath, subtitlePath, outputPath, onProgress);
      
      // Clean up temporary subtitle file
      try {
        fs.unlinkSync(subtitlePath);
      } catch (e) {
        // Ignore cleanup errors
      }
      
      return result;
    } catch (error) {
      throw new Error(`Video rendering failed: ${error}`);
    }
  }

  /**
   * Creates a temporary SRT subtitle file from caption data
   */
  private async createSubtitleFile(captions: any[]): Promise<string> {
    const tempDir = os.tmpdir();
    const subtitlePath = path.join(tempDir, `captions_${Date.now()}.srt`);
    
    let srtContent = '';
    let subtitleIndex = 1;

    for (const caption of captions) {
      if (caption.words && caption.words.length > 0) {
        // Create individual subtitles for each word (karaoke effect)
        for (const word of caption.words) {
          const startTime = this.formatTime(word.start);
          const endTime = this.formatTime(word.end);
          
          srtContent += `${subtitleIndex}\n`;
          srtContent += `${startTime} --> ${endTime}\n`;
          srtContent += `<font color="${caption.style.textColor}">${word.word}</font>\n\n`;
          subtitleIndex++;
        }
      } else {
        // Create subtitle for the entire caption
        const startTime = this.formatTime(caption.startTime);
        const endTime = this.formatTime(caption.endTime);
        
        srtContent += `${subtitleIndex}\n`;
        srtContent += `${startTime} --> ${endTime}\n`;
        srtContent += `<font color="${caption.style.textColor}">${caption.text}</font>\n\n`;
        subtitleIndex++;
      }
    }

    fs.writeFileSync(subtitlePath, srtContent);
    return subtitlePath;
  }

  /**
   * Formats milliseconds to SRT time format (HH:MM:SS,mmm)
   */
  private formatTime(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const ms = milliseconds % 1000;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }

  /**
   * Renders video with burned-in subtitles using FFmpeg
   */
  private async renderVideoWithSubtitles(
    videoPath: string,
    subtitlePath: string,
    outputPath: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
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

  /**
   * Copies video without modifications
   */
  private async copyVideo(inputPath: string, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('copy')
        .audioCodec('copy')
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', (err: any) => reject(err))
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
      'SF_PRO_DISPLAY_SEMIBOLD': 'SF Pro Display, Arial, sans-serif',
      'HELVETICA_NEUE_BOLD': 'Helvetica Neue, Arial, sans-serif',
      'ARIAL_BLACK': 'Arial Black, Arial, sans-serif',
      'FUTURA_BOLD': 'Futura, Arial, sans-serif',
      'TIMES_NEW_ROMAN_BOLD': 'Times New Roman, Times, serif',
      'GEORGIA_BOLD': 'Georgia, Times, serif'
    };
    
    return fontMap[fontOption] || 'Arial, sans-serif';
  }
}