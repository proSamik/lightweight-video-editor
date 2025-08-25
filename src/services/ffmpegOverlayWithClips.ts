import * as fs from 'fs';
import * as path from 'path';
import ffmpeg = require('fluent-ffmpeg');
import { VideoClip } from '../types';
import { FFmpegOverlayRenderer } from './ffmpegOverlayRenderer';
import FFmpegService from './ffmpeg';

/**
 * Timeline segment representing an active video clip with original and effective timing
 */
interface TimelineSegment {
  originalStart: number;
  originalEnd: number;
  effectiveStart: number;
  effectiveEnd: number;
  segmentIndex: number;
}

/**
 * TimelineMapper class for accurate subtitle timing adjustments
 * Provides consistent timeline mapping to eliminate timing drift
 */
class TimelineMapper {
  private segments: TimelineSegment[] = [];
  
  constructor(clips: VideoClip[]) {
    this.buildTimelineSegments(clips);
  }
  
  /**
   * Build ordered timeline segments from active clips
   */
  private buildTimelineSegments(clips: VideoClip[]): void {
    // Get active clips sorted by start time
    const activeClips = clips
      .filter(clip => !clip.isRemoved)
      .sort((a, b) => a.startTime - b.startTime);
    
    console.log('TimelineMapper: Building segments from', activeClips.length, 'active clips');
    
    let effectiveOffset = 0;
    
    this.segments = activeClips.map((clip, index) => {
      const segment: TimelineSegment = {
        originalStart: clip.startTime,
        originalEnd: clip.endTime,
        effectiveStart: effectiveOffset,
        effectiveEnd: effectiveOffset + (clip.endTime - clip.startTime),
        segmentIndex: index
      };
      
      // Next segment starts after this one ends
      effectiveOffset = segment.effectiveEnd;
      
      console.log(`Segment ${index}: Original ${(segment.originalStart/1000).toFixed(3)}s-${(segment.originalEnd/1000).toFixed(3)}s → Effective ${(segment.effectiveStart/1000).toFixed(3)}s-${(segment.effectiveEnd/1000).toFixed(3)}s`);
      
      return segment;
    });
    
    console.log('TimelineMapper: Built', this.segments.length, 'timeline segments');
  }
  
  /**
   * Find the timeline segment containing the given original time
   */
  private findSegmentContaining(originalTime: number): TimelineSegment | null {
    return this.segments.find(segment => 
      originalTime >= segment.originalStart && originalTime <= segment.originalEnd
    ) || null;
  }
  
  /**
   * Map an original timestamp to effective timeline timestamp
   */
  public mapSubtitleTime(originalTime: number): number {
    const segment = this.findSegmentContaining(originalTime);
    if (!segment) {
      // Time falls outside any active segment - should be filtered
      return -1;
    }
    
    // Calculate offset within the segment
    const offsetWithinSegment = originalTime - segment.originalStart;
    const effectiveTime = segment.effectiveStart + offsetWithinSegment;
    
    return effectiveTime;
  }
  
  /**
   * Check if a subtitle should be filtered out (doesn't overlap with any active segment)
   */
  public shouldFilterSubtitle(startTime: number, endTime: number): boolean {
    // Subtitle should be filtered if it doesn't overlap with any active segment
    const hasOverlap = this.segments.some(segment => 
      startTime < segment.originalEnd && endTime > segment.originalStart
    );
    
    return !hasOverlap;
  }
  
  /**
   * Get total effective duration of all active segments
   */
  public getTotalEffectiveDuration(): number {
    return this.segments.reduce((total, segment) => {
      return Math.max(total, segment.effectiveEnd);
    }, 0);
  }
}

/**
 * Advanced FFmpeg Overlay-based video renderer with clipping support
 * Features: Audio replacement, video clipping, subtitle overlay, and chunked processing
 */
export class FFmpegOverlayWithClips {
  private static instance: FFmpegOverlayWithClips;
  private isCancelled: boolean = false;
  private activeFFmpegProcesses: Set<any> = new Set();
  private currentTempDir: string | null = null;
  private debugMode: boolean = false;

  private constructor() {
    console.log('FFmpeg Overlay With Clips Renderer initialized');
  }

  public static getInstance(): FFmpegOverlayWithClips {
    if (!FFmpegOverlayWithClips.instance) {
      FFmpegOverlayWithClips.instance = new FFmpegOverlayWithClips();
    }
    return FFmpegOverlayWithClips.instance;
  }

  /**
   * Cancel the current rendering operation
   */
  public cancelRendering(): void {
    console.log('[FFmpegOverlayWithClips] Cancellation requested');
    this.isCancelled = true;
    
    // Kill all active FFmpeg processes
    for (const ffmpegCommand of this.activeFFmpegProcesses) {
      try {
        if (ffmpegCommand && typeof ffmpegCommand.kill === 'function') {
          console.log('[FFmpegOverlayWithClips] Killing FFmpeg command');
          ffmpegCommand.kill('SIGTERM');
        }
      } catch (error) {
        console.error('[FFmpegOverlayWithClips] Error killing FFmpeg command:', error);
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
   * Main method to render video with clips, audio replacement, and subtitles
   */
  public async renderVideoWithClipsAndSubtitles(
    videoPath: string,
    clips: VideoClip[],
    captions: any[],
    outputPath: string,
    replacementAudioPath?: string,
    onProgress?: (progress: number) => void,
    exportSettings?: { quality: string }
  ): Promise<string> {
    try {
      // Reset cancellation state for new render
      this.isCancelled = false;
      
      console.log('=== FFMPEG OVERLAY WITH CLIPS RENDERER START ===');
      console.log('Input video path:', videoPath);
      console.log('Output path:', outputPath);
      console.log('Clips count:', clips?.length || 0);
      console.log('Captions count:', captions?.length || 0);
      console.log('Replacement audio:', replacementAudioPath || 'none');
      console.log('Export settings:', exportSettings);
      
      // Create temporary directory in assets folder
      const assetsDir = path.join(path.dirname(videoPath), 'assets');
      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }
      
      const tempDir = path.join(assetsDir, `temp_render_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      this.currentTempDir = tempDir;
      
      console.log('Temporary directory:', tempDir);
      
      // Check if cancelled before starting
      if (this.isCancelled) {
        throw new Error('Rendering cancelled');
      }
      
      // Validate inputs
      await this.validateInputs(videoPath, clips, captions, outputPath);
      
      // Get video metadata
      const metadata = await this.getVideoMetadata(videoPath);
      console.log('Video metadata:', metadata);
      
      // Phase 1: Replace audio if provided (0-15%)
      let workingVideoPath = videoPath;
      if (replacementAudioPath) {
        console.log('=== PHASE 1: Audio Replacement ===');
        const audioReplacedPath = path.join(tempDir, 'video_with_new_audio.mp4');
        workingVideoPath = await this.replaceVideoAudio(
          videoPath, 
          replacementAudioPath, 
          audioReplacedPath,
          (progress) => {
            if (onProgress) onProgress(Math.min(15, (progress / 100) * 15));
          }
        );
        console.log('Audio replacement completed:', workingVideoPath);
      }
      
      // Check if cancelled after audio replacement
      if (this.isCancelled) {
        throw new Error('Rendering cancelled after audio replacement');
      }
      
      // Phase 2: Generate clipped video segments (15-50%)
      console.log('=== PHASE 2: Video Clipping ===');
      const clippedVideoPath = await this.generateClippedVideo(
        workingVideoPath,
        clips,
        tempDir,
        metadata,
        (progress) => {
          if (onProgress) onProgress(15 + Math.min(35, (progress / 100) * 35));
        },
        exportSettings?.quality // Pass quality setting (will be overridden to 'high' in Phase 2)
      );
      console.log('Video clipping completed:', clippedVideoPath);
      
      // Check if cancelled after clipping
      if (this.isCancelled) {
        throw new Error('Rendering cancelled after video clipping');
      }
      
      // Phase 3: Direct segment processing with overlays (50-100%)
      console.log('=== PHASE 3: Direct Segment Processing with Overlays ===');
      
      // Adjust caption timing for the clipped timeline
      const adjustedCaptions = this.adjustCaptionsForClips(captions, clips);
      console.log('Adjusted caption count:', adjustedCaptions.length);
      
      if (adjustedCaptions.length === 0) {
        console.log('No captions to process, copying clipped video to output');
        return await this.copyVideo(clippedVideoPath, outputPath);
      }
      
      // Check if cancelled after caption adjustment
      if (this.isCancelled) {
        throw new Error('Rendering cancelled after caption timing adjustment');
      }
      
      // Get the list of segment files created in Phase 2
      const activeClips = clips.filter(clip => !clip.isRemoved).sort((a, b) => a.startTime - b.startTime);
      const segmentPaths: string[] = [];
      
      for (let i = 0; i < activeClips.length; i++) {
        segmentPaths.push(path.join(tempDir, `segment_${i}.mp4`));
      }
      
      console.log(`Processing ${segmentPaths.length} video segments with overlays`);
      if (onProgress) onProgress(60);
      
      const processedSegmentPaths: string[] = [];
      
      // Process each segment individually
      for (let i = 0; i < segmentPaths.length; i++) {
        const segmentPath = segmentPaths[i];
        const clip = activeClips[i];
        
        if (!fs.existsSync(segmentPath)) {
          throw new Error(`Segment file not found: ${segmentPath}`);
        }
        
        console.log(`Processing segment ${i + 1}/${segmentPaths.length}: ${path.basename(segmentPath)}`);
        
        if (this.isCancelled) {
          throw new Error('Rendering cancelled during segment processing');
        }
        
        // Create segment descriptor for caption filtering
        // IMPORTANT: Use effective times that correspond to the adjustedCaptions timeline
        // The TimelineMapper mapped captions to effective times (0-based timeline)
        // So segment 0 starts at effective time 0, segment 1 starts where segment 0 ends, etc.
        
        // Calculate effective start/end for this segment
        let effectiveStartMs = 0;
        for (let j = 0; j < i; j++) {
          const prevClip = activeClips[j];
          effectiveStartMs += (prevClip.endTime - prevClip.startTime);
        }
        const effectiveEndMs = effectiveStartMs + (clip.endTime - clip.startTime);
        
        const segmentDescriptor = {
          startTime: effectiveStartMs, // Use effective timeline times
          endTime: effectiveEndMs,
          segmentIndex: i
        };
        
        // Get captions for this segment (adjusted to segment-relative timing)
        const segmentCaptions = this.getSegmentCaptions(segmentDescriptor, adjustedCaptions);
        
        // Generate overlay images for this segment
        const overlayFiles = await this.generateOverlayImagesForSegment(
          segmentCaptions,
          i,
          tempDir,
          metadata
        );
        
        // Determine processing approach based on segment duration
        const segmentMetadata = await this.getVideoMetadata(segmentPath);
        const segmentDuration = segmentMetadata.duration;
        
        const processedSegmentPath = path.join(tempDir, `processed_segment_${i}.mp4`);
        
        if (segmentDuration <= 90) {
          // Process as single batch (most common case)
          console.log(`Processing segment ${i + 1} as single batch (${segmentDuration.toFixed(1)}s)`);
          await this.processSingleSegment(segmentPath, overlayFiles, processedSegmentPath, segmentMetadata, exportSettings);
        } else {
          // Process with internal chunking for large segments
          console.log(`Processing segment ${i + 1} with chunking (${segmentDuration.toFixed(1)}s)`);
          await this.processLargeSegmentWithChunking(segmentPath, overlayFiles, processedSegmentPath, segmentMetadata, exportSettings);
        }
        
        processedSegmentPaths.push(processedSegmentPath);
        
        // Progress update
        if (onProgress) {
          const segmentProgress = 60 + ((i + 1) / segmentPaths.length) * 35; // 60-95%
          onProgress(Math.round(segmentProgress));
        }
        
        console.log(`Segment ${i + 1} processing completed`);
      }
      
      console.log(`All ${processedSegmentPaths.length} segments processed, concatenating final video`);
      
      // Concatenate all processed segments into final output using stream copying
      await this.concatenateVideoFiles(processedSegmentPaths, outputPath, true);
      
      if (onProgress) onProgress(100);
      
      console.log('Direct segment processing completed successfully');
      
      // Check if cancelled before cleanup
      if (this.isCancelled) {
        throw new Error('Rendering cancelled before cleanup');
      }
      
      // Clean up temporary files
      console.log('=== CLEANUP: Removing temporary files ===');
      this.cleanupTempFiles(tempDir);
      this.currentTempDir = null;
      
      console.log('=== FFMPEG OVERLAY WITH CLIPS RENDERER COMPLETED ===');
      return outputPath;
      
    } catch (error) {
      // Check if this is a cancellation (expected behavior)
      if (error instanceof Error && (error.message.includes('cancelled') || this.isCancelled)) {
        console.log('=== FFMPEG OVERLAY WITH CLIPS RENDERER CANCELLED ===');
        // Clean up temporary files on cancellation
        if (this.currentTempDir) {
          this.cleanupTempFiles(this.currentTempDir);
          this.currentTempDir = null;
        }
        throw error; // Re-throw cancellation errors
      }
      
      console.error('=== FFMPEG OVERLAY WITH CLIPS RENDERER ERROR ===');
      console.error('Rendering failed:', error);
      if (error instanceof Error) {
        console.error('Error stack:', error.stack);
      }
      
      // Clean up temporary files on error
      if (this.currentTempDir) {
        this.cleanupTempFiles(this.currentTempDir);
        this.currentTempDir = null;
      }
      
      throw error;
    }
  }

  /**
   * Replace video audio with new audio track
   */
  private async replaceVideoAudio(
    videoPath: string,
    audioPath: string,
    outputPath: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.isCancelled) {
        reject(new Error('Audio replacement cancelled'));
        return;
      }
      
      const command = ffmpeg()
        .input(videoPath)
        .input(audioPath)
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
          if (this.isCancelled) {
            command.kill('SIGTERM');
            return;
          }
          if (onProgress && progress.percent) {
            onProgress(progress.percent);
          }
        })
        .on('end', () => {
          this.activeFFmpegProcesses.delete(command);
          resolve(outputPath);
        })
        .on('error', (err: any) => {
          this.activeFFmpegProcesses.delete(command);
          if (this.isCancelled) {
            reject(new Error('Audio replacement cancelled'));
          } else {
            reject(new Error(`Audio replacement failed: ${err.message}`));
          }
        });

      this.activeFFmpegProcesses.add(command);
      command.run();
    });
  }

  /**
   * Generate clipped video based on VideoClip array
   */
  private async generateClippedVideo(
    videoPath: string,
    clips: VideoClip[],
    tempDir: string,
    metadata: any,
    onProgress?: (progress: number) => void,
    quality?: string
  ): Promise<string> {
    // Filter out removed clips and sort by start time
    const activeClips = clips
      .filter(clip => !clip.isRemoved)
      .sort((a, b) => a.startTime - b.startTime);
    
    console.log('Active clips for processing:', activeClips.length);
    
    if (activeClips.length === 0) {
      throw new Error('No active clips found for processing');
    }
    
    // Note: We always create segment files for Phase 3 processing, even for single clips
    // This ensures consistent processing pipeline regardless of clip count
    
    // Extract individual video segments
    console.log('Extracting video segments...');
    console.log('PHASE 2: Using HIGH quality extraction regardless of user quality setting for optimal segment quality');
    const segmentPaths: string[] = [];
    const ffmpegService = FFmpegService.getInstance();
    let totalExpectedDuration = 0;
    
    for (let i = 0; i < activeClips.length; i++) {
      const clip = activeClips[i];
      const segmentPath = path.join(tempDir, `segment_${i}.mp4`);
      
      if (this.isCancelled) {
        throw new Error('Video clipping cancelled during segment extraction');
      }
      
      const durationMs = clip.endTime - clip.startTime;
      console.log(`Extracting segment ${i + 1}/${activeClips.length}: ${clip.startTime}ms - ${clip.endTime}ms (duration: ${durationMs}ms = ${(durationMs/1000).toFixed(3)}s)`);
      
      await ffmpegService.extractVideoSegment(
        videoPath,
        clip.startTime / 1000, // Convert to seconds
        clip.endTime / 1000,   // Convert to seconds
        segmentPath,
        (segmentProgress) => {
          if (onProgress) {
            const overallProgress = ((i / activeClips.length) + (segmentProgress / 100 / activeClips.length)) * 80; // 80% for extraction
            onProgress(overallProgress);
          }
        },
        'high' // Always use high quality for Phase 2 extraction regardless of user quality setting
      );
      
      segmentPaths.push(segmentPath);
      totalExpectedDuration += (durationMs / 1000);
    }
    
    // Concatenate segments into final clipped video
    console.log('Concatenating video segments...');
    console.log(`Expected total duration of clipped video: ${totalExpectedDuration.toFixed(3)}s (${Math.floor(totalExpectedDuration / 60)}:${(totalExpectedDuration % 60).toFixed(1).padStart(4, '0')})`);
    const clippedVideoPath = path.join(tempDir, 'clipped_video.mp4');
    
    if (this.isCancelled) {
      throw new Error('Video clipping cancelled during concatenation');
    }
    
    await ffmpegService.concatenateVideoSegments(
      segmentPaths,
      clippedVideoPath,
      (concatProgress) => {
        if (onProgress) {
          const overallProgress = 80 + (concatProgress / 100) * 20; // 20% for concatenation
          onProgress(overallProgress);
        }
      },
      'high' // Always use high quality for Phase 2 concatenation regardless of user quality setting
    );
    
    // Verify final concatenated video duration
    try {
      const finalMetadata = await this.getVideoMetadata(clippedVideoPath);
      console.log(`=== FINAL CLIPPED VIDEO VERIFICATION ===`);
      console.log(`Expected duration: ${totalExpectedDuration.toFixed(3)}s`);
      console.log(`Actual duration: ${finalMetadata.duration.toFixed(3)}s`);
      console.log(`Difference: ${(finalMetadata.duration - totalExpectedDuration).toFixed(3)}s`);
      
      if (Math.abs(finalMetadata.duration - totalExpectedDuration) > 1.0) {
        console.warn(`WARNING: Duration mismatch exceeds 1 second tolerance!`);
      }
    } catch (error) {
      console.warn(`Could not verify final video duration:`, error);
    }
    
    return clippedVideoPath;
  }

  /**
   * Adjust caption timing based on clips using TimelineMapper for accurate segment-based processing
   * Eliminates timing drift by using precise timeline mapping instead of cumulative time subtraction
   * Note: FFmpegOverlayRenderer expects times in milliseconds
   */
  private adjustCaptionsForClips(captions: any[], clips: VideoClip[]): any[] {
    console.log('=== TIMELINE MAPPER: Adjusting caption timing for', captions.length, 'captions ===');
    
    // Check if there are any removed clips
    const hasRemovedClips = clips.some(clip => clip.isRemoved);
    if (!hasRemovedClips) {
      console.log('No removed clips, returning original captions');
      return captions;
    }
    
    // Initialize TimelineMapper with clip data
    const timelineMapper = new TimelineMapper(clips);
    
    console.log('=== CAPTION FILTERING AND MAPPING PHASE ===');
    
    // Debug: Show first few caption times for comparison
    if (captions.length > 0) {
      console.log('=== DEBUG: First 3 original caption timings ===');
      captions.slice(0, 3).forEach((caption, index) => {
        console.log(`Caption ${index + 1}: ${(caption.startTime/1000).toFixed(3)}s - ${(caption.endTime/1000).toFixed(3)}s`);
      });
      console.log('=== END DEBUG ===');
    }
    
    // Filter and adjust captions using TimelineMapper
    const processedCaptions = captions
      .filter(caption => {
        // Filter out captions that fall entirely outside active segments
        const shouldFilter = timelineMapper.shouldFilterSubtitle(caption.startTime, caption.endTime);
        
        if (shouldFilter) {
          console.log(`Filtering out caption ${(caption.startTime/1000).toFixed(3)}s-${(caption.endTime/1000).toFixed(3)}s: falls outside active segments`);
        }
        
        return !shouldFilter;
      })
      .map((caption, index) => {
        // Map original times to effective timeline times
        const originalStartMs = caption.startTime;
        const originalEndMs = caption.endTime;
        
        const effectiveStartMs = timelineMapper.mapSubtitleTime(originalStartMs);
        const effectiveEndMs = timelineMapper.mapSubtitleTime(originalEndMs);
        
        // Validate mapped times
        if (effectiveStartMs < 0 || effectiveEndMs < 0) {
          console.warn(`Caption ${index} has invalid mapped times: ${effectiveStartMs}ms - ${effectiveEndMs}ms`);
          return null;
        }
        
        // Ensure minimum duration
        const finalStartMs = effectiveStartMs;
        const finalEndMs = Math.max(finalStartMs + 100, effectiveEndMs); // Minimum 100ms duration
        
        // Process word timing if present
        let adjustedWords = caption.words;
        if (Array.isArray(caption.words) && caption.words.length > 0) {
          adjustedWords = caption.words
            .map((word: any) => {
              if (word.start !== undefined && word.end !== undefined) {
                const wordEffectiveStart = timelineMapper.mapSubtitleTime(word.start);
                const wordEffectiveEnd = timelineMapper.mapSubtitleTime(word.end);
                
                // Skip words that couldn't be mapped to any active segment
                if (wordEffectiveStart < 0 || wordEffectiveEnd < 0) {
                  console.log(`Filtering out word "${word.word}" - falls outside active segments`);
                  return null;
                }
                
                // Ensure word times are valid and have minimum duration
                const validStart = Math.max(wordEffectiveStart, finalStartMs);
                const validEnd = Math.max(wordEffectiveEnd, validStart + 50); // Minimum 50ms duration
                
                // Constrain within caption bounds
                const constrainedStart = validStart;
                const constrainedEnd = Math.min(validEnd, finalEndMs);
                
                // Final validation: ensure we have a valid duration after constraints (minimum 10ms)
                if (constrainedEnd <= constrainedStart || (constrainedEnd - constrainedStart) < 10) {
                  if (this.debugMode) {
                    console.log(`Filtering out word "${word.word}" - invalid duration: ${constrainedStart}ms - ${constrainedEnd}ms (duration: ${constrainedEnd - constrainedStart}ms)`);
                  }
                  return null;
                }
                
                return {
                  ...word,
                  start: constrainedStart,
                  end: constrainedEnd
                };
              }
              return word;
            })
            .filter((word: any) => word !== null);
        }
        
        // Debug timing for first few captions
        if (index < 3) {
          console.log(`Caption ${index + 1} timing adjustment:`);
          console.log(`  Original: ${(originalStartMs/1000).toFixed(3)}s - ${(originalEndMs/1000).toFixed(3)}s`);
          console.log(`  Effective: ${(finalStartMs/1000).toFixed(3)}s - ${(finalEndMs/1000).toFixed(3)}s`);
          console.log(`  Words: ${adjustedWords?.length || 0} (${caption.words?.length || 0} original)`);
        }
        
        return {
          ...caption,
          startTime: finalStartMs,
          endTime: finalEndMs,
          words: adjustedWords || []
        };
      })
      .filter((caption: any) => caption !== null); // Remove null captions
    
    // Final validation
    const validCaptions = processedCaptions.filter((caption: any) => {
      const isValid = caption.startTime !== undefined && 
                     caption.endTime !== undefined && 
                     caption.startTime < caption.endTime &&
                     (caption.endTime - caption.startTime) >= 100; // Minimum 100ms duration
      
      if (!isValid) {
        console.warn(`Final validation failed for caption: start=${caption.startTime}ms, end=${caption.endTime}ms, duration=${caption.endTime - caption.startTime}ms`);
      }
      
      return isValid;
    });
    
    const totalEffectiveDuration = timelineMapper.getTotalEffectiveDuration();
    
    console.log('=== TIMELINE MAPPER RESULTS ===');
    console.log(`Original captions: ${captions.length}`);
    console.log(`Filtered captions: ${processedCaptions.length}`);
    console.log(`Valid final captions: ${validCaptions.length}`);
    console.log(`Total effective timeline duration: ${(totalEffectiveDuration/1000).toFixed(3)}s`);
    console.log('=== END TIMELINE MAPPER ===');
    
    return validCaptions;
  }

  /**
   * Extract captions that fall within a specific segment's timeline
   * and adjust their timing relative to segment start
   */
  private getSegmentCaptions(
    segment: { startTime: number; endTime: number; segmentIndex: number },
    adjustedCaptions: any[]
  ): any[] {
    // Convert segment times from milliseconds to seconds for comparison
    const segmentStartSec = segment.startTime / 1000;
    const segmentEndSec = segment.endTime / 1000;
    const segmentDurationSec = segmentEndSec - segmentStartSec;

    console.log(`\n=== CAPTION DEBUGGING FOR SEGMENT ${segment.segmentIndex} ===`);
    console.log(`Segment: ${segmentStartSec.toFixed(3)}s - ${segmentEndSec.toFixed(3)}s (duration: ${segmentDurationSec.toFixed(3)}s)`);
    console.log(`Total adjusted captions available: ${adjustedCaptions.length}`);
    
    // Debug first few captions to see their timing
    console.log('First 5 adjusted captions:');
    adjustedCaptions.slice(0, 5).forEach((caption, index) => {
      const captionStartSec = caption.startTime / 1000;
      const captionEndSec = caption.endTime / 1000;
      console.log(`  Caption ${index}: ${captionStartSec.toFixed(3)}s - ${captionEndSec.toFixed(3)}s`);
    });

    const segmentCaptions = adjustedCaptions
      .filter(caption => {
        // Convert caption times from milliseconds to seconds
        const captionStartSec = caption.startTime / 1000;
        const captionEndSec = caption.endTime / 1000;
        
        // Caption overlaps with segment if it starts before segment ends AND ends after segment starts
        const overlaps = captionStartSec < segmentEndSec && captionEndSec > segmentStartSec;
        
        if (segment.segmentIndex === 1) { // Debug segment 2 specifically
          console.log(`    Caption ${captionStartSec.toFixed(3)}s-${captionEndSec.toFixed(3)}s overlaps with segment? ${overlaps}`);
        }
        
        return overlaps;
      })
      .map(caption => {
        // Convert caption times from milliseconds to seconds for calculation
        const captionStartSec = caption.startTime / 1000;
        const captionEndSec = caption.endTime / 1000;
        
        // Adjust timing relative to segment start (convert back to milliseconds for consistency)
        const relativeStartSec = Math.max(0, captionStartSec - segmentStartSec);
        const relativeEndSec = Math.min(segmentDurationSec, captionEndSec - segmentStartSec);
        
        return {
          ...caption,
          startTime: relativeStartSec * 1000, // Convert back to milliseconds
          endTime: relativeEndSec * 1000,     // Convert back to milliseconds
          words: caption.words?.map((word: any) => {
            const wordStartSec = word.start / 1000;
            const wordEndSec = word.end / 1000;
            
            return {
              ...word,
              start: Math.max(0, (wordStartSec - segmentStartSec)) * 1000,
              end: Math.min(segmentDurationSec * 1000, (wordEndSec - segmentStartSec) * 1000)
            };
          }) || []
        };
      })
      .filter(caption => {
        // Final validation: ensure caption has valid duration within segment
        return caption.startTime < caption.endTime && caption.endTime > 0;
      });

    console.log(`Found ${segmentCaptions.length} captions for segment ${segment.segmentIndex}`);
    
    // Debug the first few segment captions
    if (segmentCaptions.length > 0) {
      console.log('First 3 segment captions (relative timing):');
      segmentCaptions.slice(0, 3).forEach((caption, index) => {
        const captionStartSec = caption.startTime / 1000;
        const captionEndSec = caption.endTime / 1000;
        console.log(`  Segment caption ${index}: ${captionStartSec.toFixed(3)}s - ${captionEndSec.toFixed(3)}s`);
      });
    }
    console.log(`=== END CAPTION DEBUGGING FOR SEGMENT ${segment.segmentIndex} ===\n`);
    
    return segmentCaptions;
  }

  /**
   * Generate overlay images for a specific segment's captions using FFmpegOverlayRenderer system
   */
  private async generateOverlayImagesForSegment(
    segmentCaptions: any[],
    segmentIndex: number,
    tempDir: string,
    metadata: any
  ): Promise<Array<{ file: string; startTime: number; endTime: number }>> {
    if (segmentCaptions.length === 0) {
      console.log(`No captions for segment ${segmentIndex}, skipping overlay generation`);
      return [];
    }

    console.log(`Generating overlay images for segment ${segmentIndex} with ${segmentCaptions.length} captions`);
    
    // Create segment-specific overlay directory
    const segmentOverlayDir = path.join(tempDir, `segment_${segmentIndex}_overlays`);
    if (!fs.existsSync(segmentOverlayDir)) {
      fs.mkdirSync(segmentOverlayDir, { recursive: true });
    }

    // Use FFmpegOverlayRenderer's proper image generation system
    const overlayRenderer = FFmpegOverlayRenderer.getInstance();
    
    // Generate overlay images using the same parallel processing as FFmpegOverlayRenderer
    const overlayFiles = await overlayRenderer.generateOverlayImagesParallel(
      segmentCaptions,
      metadata,
      segmentOverlayDir,
      (progress) => {
        console.log(`Segment ${segmentIndex} overlay generation: ${progress}%`);
      }
    );

    console.log(`Generated ${overlayFiles.length} overlay images for segment ${segmentIndex}`);
    return overlayFiles;
  }

  /**
   * Process a single segment (≤90s) with its overlays in one batch
   */
  private async processSingleSegment(
    segmentPath: string,
    overlayFiles: Array<{ file: string; startTime: number; endTime: number }>,
    outputPath: string,
    _metadata: any,
    exportSettings?: { quality: string }
  ): Promise<void> {
    console.log(`Processing single segment: ${path.basename(segmentPath)} with ${overlayFiles.length} overlays`);
    
    if (overlayFiles.length === 0) {
      // No overlays, just copy the segment
      console.log('No overlays for segment, copying directly');
      return await this.copyVideoFile(segmentPath, outputPath);
    }
    
    return new Promise((resolve, reject) => {
      if (this.isCancelled) {
        reject(new Error('Segment processing cancelled'));
        return;
      }
      
      // Build overlay filter chain
      const tempDir = path.dirname(outputPath);
      const filterChain = this.buildSegmentOverlayFilter(overlayFiles, tempDir);
      
      // Create FFmpeg command
      let command = ffmpeg(segmentPath);
      
      // Add overlay inputs
      overlayFiles.forEach(overlay => {
        command = command.input(overlay.file);
      });
      
      // Apply filter chain and output options
      const codec = this.getVideoCodecForMac();
      const quality = exportSettings?.quality || 'high';
      
      if (filterChain.filterComplex && filterChain.filterScriptPath) {
        const outputOptions = [
          '-filter_complex_script', filterChain.filterScriptPath,
          '-map', '[final]', // Map the final video output
          '-map', '0:a?', // Map audio stream if available (? makes it optional)
          '-c:v', codec,
          '-c:a', 'copy', // PRESERVE AUDIO - copy without re-encoding
          '-pix_fmt', 'yuv420p',
          '-movflags', '+faststart'
        ];
        
        // Add quality settings based on encoder type
        if (codec === 'h264_videotoolbox') {
          // Hardware encoder quality settings
          switch (quality) {
            case 'high':
              outputOptions.push('-b:v', '8000k', '-maxrate', '8000k', '-bufsize', '16000k');
              break;
            case 'medium':
              outputOptions.push('-b:v', '4000k', '-maxrate', '4000k', '-bufsize', '8000k');
              break;
            case 'low':
              outputOptions.push('-b:v', '1500k', '-maxrate', '1500k', '-bufsize', '3000k');
              break;
            default:
              outputOptions.push('-b:v', '4000k', '-maxrate', '4000k', '-bufsize', '8000k');
          }
        } else {
          // Software encoder quality settings
          const preset = this.getPresetForQuality(quality);
          const crf = this.getCRFForQuality(quality);
          if (preset) outputOptions.push('-preset', preset);
          if (crf) outputOptions.push('-crf', crf);
          outputOptions.push(
            '-b:v', this.getBitrateForQuality(quality),
            '-maxrate', this.getMaxBitrateForQuality(quality),
            '-bufsize', this.getBufferSizeForQuality(quality)
          );
        }
        
        command = command.outputOptions(outputOptions);
      } else {
        // No filter chain or script path, just copy the video without re-encoding
        const outputOptions = [
          '-c:v', 'copy', // COPY VIDEO - preserve original quality
          '-c:a', 'copy', // COPY AUDIO - preserve original quality
          '-map', '0:v', // Map video stream directly
          '-map', '0:a?', // Map audio stream if available
          '-movflags', '+faststart'
        ];
        
        command = command.outputOptions(outputOptions);
      }
      
      command = command.output(outputPath);
        
      // Add this command to active processes for cancellation support
      this.activeFFmpegProcesses.add(command);
      
      command
        .on('start', (commandLine) => {
          const codec = this.getVideoCodecForMac();
          const encodingType = codec === 'h264_videotoolbox' ? 'hardware' : 'software';
          console.log(`Using ${encodingType} encoding (${codec}) for segment processing`);
          console.log(`[DEBUG] Full FFmpeg command: ${commandLine}`);
        })
        .on('stderr', (stderrLine) => {
          console.error(`FFmpeg stderr: ${stderrLine}`);
        })
        .on('end', () => {
          console.log(`Segment processed successfully: ${path.basename(outputPath)}`);
          this.activeFFmpegProcesses.delete(command);
          // Clean up filter script file
          if (filterChain.filterScriptPath && fs.existsSync(filterChain.filterScriptPath)) {
            try {
              fs.unlinkSync(filterChain.filterScriptPath);
              console.log(`[DEBUG] Filter script file cleaned up: ${filterChain.filterScriptPath}`);
            } catch (error) {
              console.warn(`Failed to clean up filter script file: ${error}`);
            }
          }
          resolve();
        })
        .on('error', (err) => {
          console.error(`Segment processing failed: ${err.message}`);
          console.error(`FFmpeg error details:`, err);
          this.activeFFmpegProcesses.delete(command);
          // Clean up filter script file on error
          if (filterChain.filterScriptPath && fs.existsSync(filterChain.filterScriptPath)) {
            try {
              fs.unlinkSync(filterChain.filterScriptPath);
              console.log(`[DEBUG] Filter script file cleaned up on error: ${filterChain.filterScriptPath}`);
            } catch (error) {
              console.warn(`Failed to clean up filter script file on error: ${error}`);
            }
          }
          reject(new Error(`Segment processing failed: ${err.message}`));
        });
        
      command.run();
    });
  }

  /**
   * Process a large segment (>90s) by chunking it internally
   */
  private async processLargeSegmentWithChunking(
    segmentPath: string,
    overlayFiles: Array<{ file: string; startTime: number; endTime: number }>,
    outputPath: string,
    metadata: any,
    exportSettings?: { quality: string }
  ): Promise<void> {
    console.log(`Processing large segment with chunking: ${path.basename(segmentPath)}`);
    
    // Get segment duration
    const segmentMetadata = await this.getVideoMetadata(segmentPath);
    const segmentDuration = segmentMetadata.duration;
    
    if (segmentDuration <= 90) {
      // Not actually a large segment, process normally
      return await this.processSingleSegment(segmentPath, overlayFiles, outputPath, metadata, exportSettings);
    }
    
    // Create chunks within this segment
    const chunkDuration = 90; // 90 seconds per chunk
    const numChunks = Math.ceil(segmentDuration / chunkDuration);
    
    console.log(`Splitting large segment (${segmentDuration}s) into ${numChunks} chunks`);
    
    const tempDir = path.dirname(outputPath);
    const chunkPaths: string[] = [];
    
    try {
      for (let i = 0; i < numChunks; i++) {
        const chunkStart = i * chunkDuration;
        const chunkEnd = Math.min((i + 1) * chunkDuration, segmentDuration);
        const chunkPath = path.join(tempDir, `segment_chunk_${i}.mp4`);
        
        // Extract chunk from segment using stream copying to preserve quality
        await this.extractVideoChunk(segmentPath, chunkPath, chunkStart, chunkEnd, true);
        
        // Filter overlays for this chunk and adjust timing
        const chunkOverlays = overlayFiles
          .filter(overlay => {
            const overlayStartSec = overlay.startTime / 1000;
            const overlayEndSec = overlay.endTime / 1000;
            return overlayStartSec < chunkEnd && overlayEndSec > chunkStart;
          })
          .map(overlay => ({
            ...overlay,
            startTime: Math.max(0, (overlay.startTime / 1000 - chunkStart)) * 1000,
            endTime: Math.min((chunkEnd - chunkStart) * 1000, (overlay.endTime / 1000 - chunkStart) * 1000)
          }));
        
        // Process chunk with its overlays
        const processedChunkPath = path.join(tempDir, `processed_chunk_${i}.mp4`);
        await this.processSingleSegment(chunkPath, chunkOverlays, processedChunkPath, metadata, exportSettings);
        
        chunkPaths.push(processedChunkPath);
        
        // Clean up intermediate chunk
        fs.unlinkSync(chunkPath);
      }
      
      // Merge all processed chunks using stream copying to preserve quality
      await this.concatenateVideoFiles(chunkPaths, outputPath, true);
      
    } finally {
      // Clean up all chunk files
      for (const chunkPath of chunkPaths) {
        try {
          if (fs.existsSync(chunkPath)) {
            fs.unlinkSync(chunkPath);
          }
        } catch (error) {
          console.warn(`Failed to cleanup chunk file: ${chunkPath}`, error);
        }
      }
    }
  }

  /**
   * Build overlay filter chain for a single segment
   * Uses filter script file to avoid command line length limits
   */
  private buildSegmentOverlayFilter(overlayFiles: Array<{ file: string; startTime: number; endTime: number }>, tempDir: string) {
    if (overlayFiles.length === 0) {
      return { filterComplex: '', outputs: [], filterScriptPath: null };
    }
    
    const filters: string[] = [];
    let currentInput = '[0:v]'; // Main video input
    
    // Sort overlays by start time to prevent timing conflicts
    const sortedOverlays = [...overlayFiles].sort((a, b) => a.startTime - b.startTime);
    
    sortedOverlays.forEach((overlay, index) => {
      const inputIndex = index + 1; // Overlay inputs start from 1
      const outputLabel = index === sortedOverlays.length - 1 ? '[final]' : `[v${index + 1}]`;
      
      // Convert times to seconds with proper precision
      const startSeconds = (overlay.startTime / 1000).toFixed(3);
      const endSeconds = (overlay.endTime / 1000).toFixed(3);
      
      // Create overlay filter with timing  
      const overlayFilter = `${currentInput}[${inputIndex}:v]overlay=enable='gte(t,${startSeconds})*lt(t,${endSeconds})' ${outputLabel}`;
      filters.push(overlayFilter);
      currentInput = outputLabel;
    });
    
    const filterComplex = filters.join(';');
    console.log(`[DEBUG] Generated filter complex with ${overlayFiles.length} overlays`);
    console.log(`[DEBUG] Filter complex length: ${filterComplex.length} characters`);
    console.log(`[DEBUG] Expected output label: [final]`);
    
    // Write filter complex to file to avoid command line length limits
    const filterScriptPath = path.join(tempDir, `filter_complex_${Date.now()}.txt`);
    fs.writeFileSync(filterScriptPath, filterComplex);
    console.log(`[DEBUG] Filter complex written to: ${filterScriptPath}`);
    
    return {
      filterComplex,
      outputs: ['[final]'],
      filterScriptPath
    };
  }

  /**
   * Extract a chunk from a video file using stream copying to preserve quality
   */
  private async extractVideoChunk(
    inputPath: string,
    outputPath: string,
    startTimeSeconds: number,
    endTimeSeconds: number,
    useStreamCopy: boolean = true
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const duration = endTimeSeconds - startTimeSeconds;
      
      const command = ffmpeg(inputPath)
        .seekInput(startTimeSeconds)
        .duration(duration);
      
      if (useStreamCopy) {
        // Use stream copying to preserve original quality - no re-encoding
        console.log(`Extracting chunk with stream copying (no quality loss): ${startTimeSeconds}s-${endTimeSeconds}s`);
        command
          .videoCodec('copy')
          .audioCodec('copy')
          .outputOptions([
            '-avoid_negative_ts', 'make_zero',
            '-fflags', '+genpts'
          ]);
      } else {
        // Fallback to re-encoding if stream copy fails
        console.log(`Extracting chunk with re-encoding: ${startTimeSeconds}s-${endTimeSeconds}s`);
        command
          .videoCodec(this.getVideoCodecForMac())
          .audioCodec('aac')
          .outputOptions([
            '-avoid_negative_ts', 'make_zero',
            '-fflags', '+genpts',
            '-preset', 'fast', // Use fast preset to minimize processing time
            '-crf', '18' // High quality CRF
          ]);
      }
      
      command.output(outputPath);
      this.activeFFmpegProcesses.add(command);
      
      command
        .on('end', () => {
          this.activeFFmpegProcesses.delete(command);
          resolve();
        })
        .on('error', (err) => {
          console.error(`Chunk extraction failed with ${useStreamCopy ? 'stream copy' : 're-encoding'}:`, err.message);
          this.activeFFmpegProcesses.delete(command);
          
          // If stream copy failed and we haven't tried re-encoding yet, retry with re-encoding
          if (useStreamCopy) {
            console.log('Retrying chunk extraction with re-encoding...');
            this.extractVideoChunk(inputPath, outputPath, startTimeSeconds, endTimeSeconds, false)
              .then(resolve)
              .catch(reject);
          } else {
            reject(err);
          }
        });
        
      command.run();
    });
  }

  /**
   * Concatenate multiple video files using stream copying to preserve quality
   */
  private async concatenateVideoFiles(filePaths: string[], outputPath: string, useStreamCopy: boolean = true): Promise<void> {
    return new Promise((resolve, reject) => {
      const concatFile = path.join(path.dirname(outputPath), `concat_${Date.now()}.txt`);
      const concatContent = filePaths.map(file => `file '${path.resolve(file)}'`).join('\n');
      
      fs.writeFileSync(concatFile, concatContent);
      
      let outputOptions: string[];
      
      if (useStreamCopy) {
        // Use stream copying to preserve quality - no re-encoding
        console.log('Concatenating video files with stream copying (no quality loss)');
        outputOptions = [
          '-c:v', 'copy', // Copy video stream without re-encoding
          '-c:a', 'copy', // Copy audio stream without re-encoding
          '-map', '0:v', // Map video stream
          '-map', '0:a?', // Map audio stream if available
          '-fflags', '+genpts'
        ];
      } else {
        // Fallback to re-encoding with high quality settings
        console.log('Concatenating video files with re-encoding (quality may be affected)');
        const codec = this.getVideoCodecForMac();
        outputOptions = [
          '-c:v', codec,
          '-c:a', 'aac',
          '-map', '0:v',
          '-map', '0:a?',
          '-fflags', '+genpts'
        ];
        
        // Add high quality settings
        if (codec === 'h264_videotoolbox') {
          outputOptions.push('-b:v', '8000k', '-maxrate', '8000k', '-bufsize', '16000k');
        } else {
          outputOptions.push('-preset', 'slow', '-crf', '18');
        }
      }
      
      const command = ffmpeg()
        .input(concatFile)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions(outputOptions)
        .output(outputPath);
        
      this.activeFFmpegProcesses.add(command);
      
      command
        .on('end', () => {
          this.activeFFmpegProcesses.delete(command);
          try {
            fs.unlinkSync(concatFile);
          } catch (error) {
            console.warn('Failed to cleanup concat file:', error);
          }
          resolve();
        })
        .on('error', (err) => {
          console.error(`Concatenation failed with ${useStreamCopy ? 'stream copy' : 're-encoding'}:`, err.message);
          this.activeFFmpegProcesses.delete(command);
          try {
            fs.unlinkSync(concatFile);
          } catch (error) {
            console.warn('Failed to cleanup concat file:', error);
          }
          
          // If stream copy failed and we haven't tried re-encoding yet, retry with re-encoding
          if (useStreamCopy) {
            console.log('Retrying concatenation with re-encoding...');
            this.concatenateVideoFiles(filePaths, outputPath, false)
              .then(resolve)
              .catch(reject);
          } else {
            reject(err);
          }
        });
        
      command.run();
    });
  }

  /**
   * Copy a video file (utility method)
   */
  private async copyVideoFile(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath)
        .outputOptions([
          '-c', 'copy', // Copy both streams
          '-map', '0:v', // Map video stream
          '-map', '0:a?' // Map audio stream if available
        ])
        .output(outputPath);
        
      this.activeFFmpegProcesses.add(command);
      
      command
        .on('end', () => {
          this.activeFFmpegProcesses.delete(command);
          resolve();
        })
        .on('error', (err) => {
          this.activeFFmpegProcesses.delete(command);
          reject(err);
        });
        
      command.run();
    });
  }

  /**
   * Get video codec for macOS with hardware acceleration preference
   */
  private getVideoCodecForMac(): string {
    // On macOS, try to use hardware acceleration
    if (process.platform === 'darwin') {
      console.log('Using hardware encoding (h264_videotoolbox) for macOS');
      return 'h264_videotoolbox';
    }
    console.log('Using software encoding (libx264)');
    return 'libx264';
  }

  /**
   * Get FFmpeg preset for quality setting
   */
  private getPresetForQuality(quality: string): string {
    const codec = this.getVideoCodecForMac();
    
    if (codec === 'h264_videotoolbox') {
      // Hardware encoder doesn't use presets, return empty string
      return '';
    } else {
      // Software encoder presets
      switch (quality) {
        case 'low': return 'ultrafast';
        case 'medium': return 'fast';
        case 'high': return 'slow';
        default: return 'fast';
      }
    }
  }

  /**
   * Get CRF value for quality setting
   */
  private getCRFForQuality(quality: string): string {
    const codec = this.getVideoCodecForMac();
    
    if (codec === 'h264_videotoolbox') {
      // Hardware encoder doesn't use CRF, return empty string
      return '';
    } else {
      // Software encoder CRF values
      switch (quality) {
        case 'low': return '28';
        case 'medium': return '23';
        case 'high': return '18';
        default: return '23';
      }
    }
  }

  /**
   * Get bitrate for quality setting
   */
  private getBitrateForQuality(quality: string): string {
    switch (quality) {
      case 'low': return '2M';
      case 'medium': return '5M';
      case 'high': return '10M';
      default: return '5M';
    }
  }

  /**
   * Get max bitrate for quality setting
   */
  private getMaxBitrateForQuality(quality: string): string {
    switch (quality) {
      case 'low': return '3M';
      case 'medium': return '7M';
      case 'high': return '15M';
      default: return '7M';
    }
  }

  /**
   * Get buffer size for quality setting
   */
  private getBufferSizeForQuality(quality: string): string {
    switch (quality) {
      case 'low': return '4M';
      case 'medium': return '10M';
      case 'high': return '20M';
      default: return '10M';
    }
  }

  /**
   * Simple video copy utility
   */
  private async copyVideo(inputPath: string, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.isCancelled) {
        reject(new Error('Video copy cancelled'));
        return;
      }
      
      const command = ffmpeg(inputPath)
        .videoCodec('copy')
        .audioCodec('copy')
        .output(outputPath)
        .on('end', () => {
          this.activeFFmpegProcesses.delete(command);
          resolve(outputPath);
        })
        .on('error', (err: any) => {
          this.activeFFmpegProcesses.delete(command);
          if (this.isCancelled) {
            reject(new Error('Video copy cancelled'));
          } else {
            reject(new Error(`Video copy failed: ${err.message}`));
          }
        });

      this.activeFFmpegProcesses.add(command);
      command.run();
    });
  }

  /**
   * Get video metadata
   */
  private async getVideoMetadata(videoPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err: any, metadata: any) => {
        if (err) {
          reject(new Error(`Failed to get video metadata: ${err.message}`));
          return;
        }

        const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
        const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio');

        resolve({
          duration: metadata.format.duration || 0,
          width: videoStream?.width || 1920,
          height: videoStream?.height || 1080,
          framerate: videoStream?.r_frame_rate ? eval(videoStream.r_frame_rate) : 30,
          hasAudio: !!audioStream,
          bitrate: metadata.format.bit_rate || 0
        });
      });
    });
  }

  /**
   * Validate inputs
   */
  private async validateInputs(
    videoPath: string,
    clips: VideoClip[],
    _captions: any[],
    outputPath: string
  ): Promise<void> {
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Input video file not found: ${videoPath}`);
    }
    
    if (!clips || clips.length === 0) {
      throw new Error('No clips provided for processing');
    }
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  /**
   * Clean up temporary files and directories
   */
  private cleanupTempFiles(tempDir: string): void {
    try {
      if (fs.existsSync(tempDir)) {
        console.log(`Cleaning up temporary directory: ${tempDir}`);
        
        // Remove all files in the temp directory
        const files = fs.readdirSync(tempDir);
        for (const file of files) {
          const filePath = path.join(tempDir, file);
          try {
            if (fs.lstatSync(filePath).isDirectory()) {
              // Recursively remove subdirectories
              this.cleanupTempFiles(filePath);
            } else {
              fs.unlinkSync(filePath);
            }
          } catch (error) {
            console.warn(`Failed to remove file ${filePath}:`, error);
          }
        }
        
        // Remove the temp directory itself
        fs.rmdirSync(tempDir);
        console.log(`Temporary directory cleaned up: ${tempDir}`);
      }
    } catch (error) {
      console.warn(`Failed to cleanup temporary directory ${tempDir}:`, error);
    }
  }
}

export default FFmpegOverlayWithClips;