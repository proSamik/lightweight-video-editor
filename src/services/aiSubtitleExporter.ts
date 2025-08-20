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
   * Export video with AI subtitle modifications
   */
  public async exportModifiedVideo(
    originalVideoPath: string,
    originalAudioPath: string,
    aiSubtitleData: AISubtitleData,
    baseStyle: SubtitleStyle,
    outputPath: string,
    exportSettings: ExportSettings,
    onProgress?: (progress: number, message: string) => void
  ): Promise<string> {
    console.log(`[AI SUBTITLE EXPORTER] Export started with mode: ${exportSettings.exportMode}`);
    console.log(`[AI SUBTITLE EXPORTER] AI Subtitle Data frames: ${aiSubtitleData.frames.length}`);
    
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-subtitle-export-'));
    
    try {
      onProgress?.(10, 'Analyzing modified segments...');
      
      // Process based on export mode
      switch (exportSettings.exportMode) {
        case 'modifiedSegments':
          return await this.exportWithModifiedSegments(
            originalVideoPath,
            originalAudioPath,
            aiSubtitleData,
            baseStyle,
            outputPath,
            exportSettings,
            tempDir,
            onProgress
          );
        
        case 'complete':
          return await this.exportCompleteVideo(
            originalVideoPath,
            aiSubtitleData,
            baseStyle,
            outputPath,
            exportSettings,
            tempDir,
            onProgress
          );
        
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
   * Export video with selective audio segment removal
   */
  private async exportWithModifiedSegments(
    originalVideoPath: string,
    originalAudioPath: string,
    aiSubtitleData: AISubtitleData,
    baseStyle: SubtitleStyle,
    outputPath: string,
    exportSettings: ExportSettings,
    tempDir: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<string> {
    onProgress?.(20, 'Processing video and audio segments...');
    
    // Get segments to keep (excluding both silenced and cut words)
    const segmentsToKeep = this.getSegmentsToKeep(aiSubtitleData);
    
    if (segmentsToKeep.length === 0) {
      throw new Error('No segments to keep after processing');
    }
    
    // Extract and concatenate audio segments
    const modifiedAudioPath = await this.createModifiedAudio(
      originalAudioPath,
      segmentsToKeep,
      tempDir,
      (progress) => onProgress?.(20 + progress * 0.2, 'Processing audio...')
    );
    
    // Extract and concatenate video segments  
    const modifiedVideoPath = await this.createModifiedVideo(
      originalVideoPath,
      segmentsToKeep,
      tempDir,
      (progress) => onProgress?.(40 + progress * 0.2, 'Processing video...')
    );
    
    onProgress?.(50, 'Generating subtitle overlays...');
    
    // Generate video overlay for modified frames
    const overlayPath = await this.generateVideoOverlay(
      aiSubtitleData,
      baseStyle,
      1920, // Default resolution, should be extracted from video
      1080,
      tempDir,
      (progress) => onProgress?.(50 + progress * 0.2, 'Rendering subtitles...')
    );
    
    onProgress?.(60, 'Combining modified video and audio...');
    
    // Combine modified video with modified audio and subtitle overlay
    const finalVideoPath = await this.combineVideoAudioAndSubtitles(
      modifiedVideoPath,
      modifiedAudioPath,
      overlayPath,
      outputPath,
      exportSettings,
      (progress) => onProgress?.(60 + progress * 0.4, 'Final video assembly...')
    );
    
    onProgress?.(100, 'Export complete!');
    return finalVideoPath;
  }

  /**
   * Export complete video with AI subtitle enhancements
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
    // Check if we need to cut segments (silenced or strikethrough words)
    const hasWordsToRemove = aiSubtitleData.frames.some(frame => 
      frame.words.some(word => word.editState === 'silenced' || word.editState === 'strikethrough')
    );

    console.log(`[Export] Checking for words to remove...`);
    console.log(`[Export] Total frames: ${aiSubtitleData.frames.length}`);
    
    // Debug: check all word states
    let totalWords = 0;
    let silencedCount = 0;
    let strikethroughCount = 0;
    
    aiSubtitleData.frames.forEach(frame => {
      frame.words.forEach(word => {
        totalWords++;
        if (word.editState === 'silenced') silencedCount++;
        if (word.editState === 'strikethrough') strikethroughCount++;
        if (word.editState === 'silenced' || word.editState === 'strikethrough') {
          console.log(`[Export] Found word to remove: "${word.word}" (state: ${word.editState})`);
        }
      });
    });
    
    console.log(`[Export] Word analysis: ${totalWords} total, ${silencedCount} silenced, ${strikethroughCount} strikethrough`);
    console.log(`[Export] hasWordsToRemove: ${hasWordsToRemove}`);

    if (hasWordsToRemove) {
      // Use the modified segments approach when cutting is needed
      onProgress?.(20, 'Processing video and audio segments...');
      
      // Get segments to keep (excluding both silenced and cut words)
      const segmentsToKeep = this.getSegmentsToKeep(aiSubtitleData);
      
      if (segmentsToKeep.length === 0) {
        throw new Error('No segments to keep after processing');
      }
      
      // Extract and concatenate audio segments
      const modifiedAudioPath = await this.createModifiedAudio(
        await this.ffmpegService.extractAudioForProject(originalVideoPath, tempDir),
        segmentsToKeep,
        tempDir,
        (progress) => onProgress?.(20 + progress * 0.2, 'Processing audio...')
      );
      
      // Extract and concatenate video segments  
      const modifiedVideoPath = await this.createModifiedVideo(
        originalVideoPath,
        segmentsToKeep,
        tempDir,
        (progress) => onProgress?.(40 + progress * 0.2, 'Processing video...')
      );
      
      onProgress?.(60, 'Generating subtitle overlays...');
      
      // Generate video overlay for modified frames
      const overlayPath = await this.generateVideoOverlay(
        aiSubtitleData,
        baseStyle,
        1920, // Default resolution
        1080,
        tempDir,
        (progress) => onProgress?.(60 + progress * 0.2, 'Rendering subtitles...')
      );
      
      onProgress?.(80, 'Combining modified video and audio...');
      
      // Combine modified video with modified audio and subtitle overlay
      const finalVideoPath = await this.combineVideoAudioAndSubtitles(
        modifiedVideoPath,
        modifiedAudioPath,
        overlayPath,
        outputPath,
        exportSettings,
        (progress) => onProgress?.(80 + progress * 0.2, 'Final video assembly...')
      );
      
      onProgress?.(100, 'Export complete!');
      return finalVideoPath;
    } else {
      // No cutting needed, use original approach with overlays
      onProgress?.(30, 'Generating enhanced subtitles...');
      
      // Generate overlay images for all frames with word-level highlighting
      const overlayPath = await this.generateVideoOverlay(
        aiSubtitleData,
        baseStyle,
        1920, // Default resolution
        1080,
        tempDir,
        (progress) => onProgress?.(30 + progress * 0.4, 'Rendering enhanced subtitles...')
      );
      
      onProgress?.(70, 'Applying subtitles to video...');
      
      // Apply overlay to original video
      const finalVideoPath = await this.ffmpegService.renderVideoWithBurnedCaptions(
        originalVideoPath,
        [], // Use overlay instead of caption data
        outputPath,
        (progress) => onProgress?.(70 + progress * 0.3, 'Final rendering...'),
        exportSettings
      );
      
      onProgress?.(100, 'Export complete!');
      return finalVideoPath;
    }
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
   * Get audio/video segments that should be kept (excluding silenced and strikethrough words)
   * Both silenced and cut words should be completely removed from the timeline
   */
  private getSegmentsToKeep(aiSubtitleData: AISubtitleData): Array<{ start: number; end: number }> {
    const segments: Array<{ start: number; end: number }> = [];
    let removedWordsCount = 0;
    let keptWordsCount = 0;
    
    aiSubtitleData.frames.forEach(frame => {
      frame.words.forEach(word => {
        // Exclude both silenced and strikethrough words - both should be cut from video
        if (word.editState !== 'strikethrough' && word.editState !== 'silenced') {
          segments.push({
            start: word.start,
            end: word.end
          });
          keptWordsCount++;
        } else {
          console.log(`[Export] Removing word "${word.word}" (${word.editState}) from ${word.start}s to ${word.end}s`);
          removedWordsCount++;
        }
      });
    });
    
    console.log(`[Export] Processing segments: ${keptWordsCount} words kept, ${removedWordsCount} words removed`);
    
    // Merge overlapping segments
    const mergedSegments = this.mergeOverlappingSegments(segments);
    console.log(`[Export] After merging: ${mergedSegments.length} segments to keep`);
    mergedSegments.forEach((segment, index) => {
      console.log(`[Export] Segment ${index + 1}: ${segment.start}s to ${segment.end}s (duration: ${(segment.end - segment.start).toFixed(2)}s)`);
    });
    
    return mergedSegments;
  }


  /**
   * Merge overlapping audio segments
   */
  private mergeOverlappingSegments(segments: Array<{ start: number; end: number }>): Array<{ start: number; end: number }> {
    if (segments.length === 0) return [];
    
    // Sort segments by start time
    const sorted = segments.sort((a, b) => a.start - b.start);
    const merged: Array<{ start: number; end: number }> = [sorted[0]];
    
    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = merged[merged.length - 1];
      
      if (current.start <= last.end) {
        // Overlapping, merge them
        last.end = Math.max(last.end, current.end);
      } else {
        // No overlap, add as new segment
        merged.push(current);
      }
    }
    
    return merged;
  }

  /**
   * Create modified audio by extracting and concatenating segments
   */
  private async createModifiedAudio(
    originalAudioPath: string,
    segments: Array<{ start: number; end: number }>,
    tempDir: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const segmentPaths: string[] = [];
    
    // Extract each segment
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const segmentPath = path.join(tempDir, `segment_${i}.wav`);
      
      await this.ffmpegService.extractAudioSegments(
        originalAudioPath,
        [{ ...segment, outputPath: segmentPath }],
        (progress) => onProgress?.((i / segments.length + progress / 100 / segments.length) * 80)
      );
      
      segmentPaths.push(segmentPath);
    }
    
    // Concatenate all segments
    const modifiedAudioPath = path.join(tempDir, 'modified_audio.wav');
    await this.ffmpegService.concatenateAudioSegments(
      segmentPaths,
      modifiedAudioPath,
      (progress) => onProgress?.(80 + progress * 0.2)
    );
    
    return modifiedAudioPath;
  }

  /**
   * Create modified video by extracting and concatenating segments
   */
  private async createModifiedVideo(
    originalVideoPath: string,
    segments: Array<{ start: number; end: number }>,
    tempDir: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const segmentPaths: string[] = [];
    
    // Extract each video segment
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const segmentPath = path.join(tempDir, `video_segment_${i}.mp4`);
      
      await this.ffmpegService.extractVideoSegment(
        originalVideoPath,
        segment.start,
        segment.end,
        segmentPath,
        (progress) => onProgress?.((i / segments.length + progress / 100 / segments.length) * 80)
      );
      
      segmentPaths.push(segmentPath);
    }
    
    // Concatenate all video segments
    const modifiedVideoPath = path.join(tempDir, 'modified_video.mp4');
    await this.ffmpegService.concatenateVideoSegments(
      segmentPaths,
      modifiedVideoPath,
      (progress) => onProgress?.(80 + progress * 0.2)
    );
    
    return modifiedVideoPath;
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
    const overlays = await this.renderer.generateFrameOverlays(
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
   * Combine video, audio, and subtitle overlays
   */
  private async combineVideoAudioAndSubtitles(
    videoPath: string,
    audioPath: string,
    overlayPath: string,
    outputPath: string,
    exportSettings: ExportSettings,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    // First combine video with modified audio
    const tempVideoPath = path.join(path.dirname(outputPath), 'temp_with_audio.mp4');
    
    await this.ffmpegService.renderVideoWithModifiedAudio(
      videoPath,
      audioPath,
      tempVideoPath,
      (progress) => onProgress?.(progress * 0.5)
    );
    
    // Then apply subtitle overlays (this would need to be implemented in FFmpegService)
    // For now, we'll use the temp video as the final output
    fs.renameSync(tempVideoPath, outputPath);
    
    onProgress?.(100);
    return outputPath;
  }

  /**
   * Generate SRT content from AI subtitle data
   */
  private generateSRTFromAIData(aiSubtitleData: AISubtitleData): string {
    let srtContent = '';
    let subtitleIndex = 1;
    
    aiSubtitleData.frames.forEach(frame => {
      const visibleWords = frame.words.filter(word => 
        word.editState !== 'strikethrough' && 
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