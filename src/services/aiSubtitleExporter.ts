import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FFmpegService } from './ffmpeg';
import { AISubtitleRenderer } from './aiSubtitleRenderer';
import { 
  AISubtitleData, 
  SubtitleFrame, 
  WordSegment, 
  AudioSegment,
  SubtitleStyle,
  ExportSettings
} from '../types';

export class AISubtitleExporter {
  private static instance: AISubtitleExporter;
  private ffmpegService: FFmpegService;
  private renderer: AISubtitleRenderer;

  private constructor() {
    this.ffmpegService = FFmpegService.getInstance();
    this.renderer = AISubtitleRenderer.getInstance();
  }

  public static getInstance(): AISubtitleExporter {
    if (!AISubtitleExporter.instance) {
      AISubtitleExporter.instance = new AISubtitleExporter();
    }
    return AISubtitleExporter.instance;
  }

  /**
   * Export video with AI subtitle modifications using overlay-based rendering
   */
  public async exportModifiedVideo(
    originalVideoPath: string,
    _originalAudioPath: string,
    aiSubtitleData: AISubtitleData,
    baseStyle: SubtitleStyle,
    outputPath: string,
    exportSettings: ExportSettings,
    onProgress?: (progress: number, message: string) => void
  ): Promise<string> {
    console.log(`[AI SUBTITLE EXPORTER] Export started with overlay-based rendering`);
    console.log(`[AI SUBTITLE EXPORTER] AI Subtitle Data frames: ${aiSubtitleData.frames.length}`);
    
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-subtitle-export-'));
    
    try {
      onProgress?.(10, 'Analyzing subtitle data...');
      
      // Process based on export mode - simplified to overlay-based only
      switch (exportSettings.exportMode) {
        case 'subtitlesOnly':
          return await this.exportSubtitlesOnly(
            aiSubtitleData,
            outputPath,
            onProgress
          );
        
        default:
          throw new Error(`Unsupported export mode: ${exportSettings.exportMode}`);
      }
    } finally {
      // Cleanup temporary directory
      this.cleanupTempDir(tempDir);
    }
  }

  /**
   * Export complete video with AI subtitle enhancements using overlay-based rendering only
   */
  private async exportCompleteVideo(
    originalVideoPath: string,
    aiSubtitleData: AISubtitleData,
    baseStyle: SubtitleStyle,
    outputPath: string,
    exportSettings: ExportSettings,
    tempDir: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<string> {
    onProgress?.(30, 'Generating subtitle overlays...');
    
    // Generate overlay images for all frames with word-level highlighting
    const overlayPath = await this.generateVideoOverlay(
      aiSubtitleData,
      baseStyle,
      1920, // Default resolution
      1080,
      tempDir,
      (progress) => onProgress?.(30 + progress * 0.4, 'Rendering subtitles...')
    );
    
    onProgress?.(70, 'Applying subtitles to video...');
    
    // Apply overlay to original video using FFmpeg with burned captions
    const finalVideoPath = await this.ffmpegService.renderVideoWithBurnedCaptions(
      originalVideoPath,
      [], // Use overlay directory instead of caption data
      outputPath,
      (progress: number) => onProgress?.(70 + progress * 0.3, 'Final rendering...'),
      exportSettings
    );
    
    onProgress?.(100, 'Export complete!');
    return finalVideoPath;
  }

  /**
   * Export only subtitle data (SRT format with AI enhancements)
   */
  private async exportSubtitlesOnly(
    aiSubtitleData: AISubtitleData,
    outputPath: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<string> {
    onProgress?.(50, 'Generating SRT file...');
    
    const srtContent = this.generateSRTFromAIData(aiSubtitleData);
    
    // Ensure output path has .srt extension
    const srtPath = outputPath.endsWith('.srt') ? outputPath : outputPath.replace(/\.[^.]+$/, '.srt');
    
    fs.writeFileSync(srtPath, srtContent, 'utf8');
    
    onProgress?.(100, 'SRT export complete!');
    return srtPath;
  }

  /**
   * Generate video overlay with enhanced AI subtitles
   */
  private async generateVideoOverlay(
    aiSubtitleData: AISubtitleData,
    baseStyle: SubtitleStyle,
    videoWidth: number,
    videoHeight: number,
    tempDir: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const overlayDir = path.join(tempDir, 'overlays');
    fs.mkdirSync(overlayDir, { recursive: true });
    
    // Generate frame overlays with word-level highlighting
    await this.renderer.generateFrameOverlays(
      aiSubtitleData,
      baseStyle,
      videoWidth,
      videoHeight,
      overlayDir
    );
    
    onProgress?.(100);
    
    // Return overlay directory path for FFmpeg processing
    return overlayDir;
  }

  /**
   * Generate SRT content from AI subtitle data
   */
  private generateSRTFromAIData(aiSubtitleData: AISubtitleData): string {
    let srtContent = '';
    let subtitleIndex = 1;
    
    aiSubtitleData.frames.forEach(frame => {
      const visibleWords = frame.words.filter(word => 
        word.editState !== 'removedCaption' &&
        !word.isPause
      );
      
      if (visibleWords.length === 0) return;
      
      const text = visibleWords.map(word => {
        let displayText = word.word;
        
        // Apply censoring
        if (word.editState === 'censored') {
          displayText = word.word; // Already censored in the word data
        }
        
        return displayText;
      }).join(' ');
      
      const startTime = this.formatSRTTime(frame.startTime);
      const endTime = this.formatSRTTime(frame.endTime);
      
      srtContent += `${subtitleIndex}\n`;
      srtContent += `${startTime} --> ${endTime}\n`;
      srtContent += `${text}\n\n`;
      
      subtitleIndex++;
    });
    
    return srtContent;
  }

  /**
   * Format time for SRT format (HH:MM:SS,mmm)
   */
  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
  }

  /**
   * Clean up temporary directory
   */
  private cleanupTempDir(tempDir: string): void {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn('Failed to cleanup temporary directory:', error);
    }
  }
}

export default AISubtitleExporter;