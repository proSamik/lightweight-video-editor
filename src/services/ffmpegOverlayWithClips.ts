import * as fs from 'fs';
import * as path from 'path';
import ffmpeg = require('fluent-ffmpeg');
import { VideoClip } from '../types';
import { FFmpegOverlayRenderer } from './ffmpegOverlayRenderer';
import FFmpegService from './ffmpeg';

/**
 * Advanced FFmpeg Overlay-based video renderer with clipping support
 * Features: Audio replacement, video clipping, subtitle overlay, and chunked processing
 */
export class FFmpegOverlayWithClips {
  private static instance: FFmpegOverlayWithClips;
  private isCancelled: boolean = false;
  private activeFFmpegProcesses: Set<any> = new Set();
  private currentTempDir: string | null = null;

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
        }
      );
      console.log('Video clipping completed:', clippedVideoPath);
      
      // Check if cancelled after clipping
      if (this.isCancelled) {
        throw new Error('Rendering cancelled after video clipping');
      }
      
      // Phase 3: Adjust captions timing for clipped video (50-60%)
      console.log('=== PHASE 3: Adjusting Caption Timing ===');
      const adjustedCaptions = this.adjustCaptionsForClips(captions, clips);
      console.log('Caption timing adjusted, adjusted count:', adjustedCaptions.length);
      if (onProgress) onProgress(60);
      
      // Check if cancelled after caption adjustment
      if (this.isCancelled) {
        throw new Error('Rendering cancelled after caption timing adjustment');
      }
      
      // Phase 4: Use FFmpegOverlayRenderer for subtitle overlay rendering (60-100%)
      console.log('=== PHASE 4: Subtitle Overlay Rendering ===');
      console.log(`Passing ${adjustedCaptions.length} adjusted captions to FFmpegOverlayRenderer`);
      
      if (adjustedCaptions.length === 0) {
        console.log('No captions to render, copying clipped video to output');
        return await this.copyVideo(clippedVideoPath, outputPath);
      }
      
      // Validate that we have at least some captions with burn-in enabled
      const captionsWithBurnIn = adjustedCaptions.filter(caption => 
        caption.style?.burnInSubtitles !== false
      );
      
      if (captionsWithBurnIn.length === 0) {
        console.log('No captions with burn-in enabled, copying clipped video to output');
        return await this.copyVideo(clippedVideoPath, outputPath);
      }
      
      console.log(`Found ${captionsWithBurnIn.length} captions with burn-in enabled`);
      
      // Debug: Log first few captions to verify timing
      if (captionsWithBurnIn.length > 0) {
        console.log('=== DEBUG: First 3 adjusted captions ===');
        captionsWithBurnIn.slice(0, 3).forEach((caption, index) => {
          console.log(`Caption ${index + 1}: ${(caption.startTime/1000).toFixed(3)}s - ${(caption.endTime/1000).toFixed(3)}s (duration: ${((caption.endTime - caption.startTime)/1000).toFixed(3)}s)`);
          if (caption.words && caption.words.length > 0) {
            console.log(`  Words: ${caption.words.length}, First word: ${(caption.words[0].start/1000).toFixed(3)}s - ${(caption.words[0].end/1000).toFixed(3)}s`);
          }
        });
        console.log('=== END DEBUG ===');
      }
      
      // Final validation: Ensure all captions have proper timing
      const finalValidCaptions = captionsWithBurnIn.filter(caption => {
        const isValid = caption.startTime !== undefined && 
                       caption.endTime !== undefined && 
                       caption.startTime < caption.endTime &&
                       (caption.endTime - caption.startTime) >= 1; // At least 1ms duration
        
        if (!isValid) {
          console.warn(`Final validation: Removing invalid caption with timing: start=${caption.startTime}, end=${caption.endTime}, duration=${caption.endTime - caption.startTime}ms`);
          return false;
        }
        
        // Also validate word timing if present
        if (caption.words && Array.isArray(caption.words)) {
          const validWords = caption.words.filter((word: any) => {
            const wordValid = word.start !== undefined && 
                            word.end !== undefined && 
                            word.start < word.end &&
                            (word.end - word.start) >= 1; // At least 1ms duration
            
            if (!wordValid) {
              console.warn(`Final validation: Removing invalid word with timing: start=${word.start}, end=${word.end}, duration=${word.end - word.start}ms`);
            }
            
            return wordValid;
          });
          
          // Update caption with only valid words
          caption.words = validWords;
          
          // If no valid words remain, the caption might still be valid for static rendering
          if (validWords.length === 0 && caption.words && caption.words.length > 0) {
            console.log(`Caption has no valid words after final validation, will render as static text`);
          }
        }
        
        return true;
      });
      
      if (finalValidCaptions.length === 0) {
        console.log('No valid captions after final validation, copying clipped video to output');
        return await this.copyVideo(clippedVideoPath, outputPath);
      }
      
      console.log(`Final validation complete: ${finalValidCaptions.length} captions ready for rendering`);
      
      // Additional validation: Check for any remaining timing issues
      let totalWords = 0;
      let validWords = 0;
      finalValidCaptions.forEach(caption => {
        if (caption.words && Array.isArray(caption.words)) {
          totalWords += caption.words.length;
          validWords += caption.words.filter((word: any) => 
            word.start !== undefined && 
            word.end !== undefined && 
            word.start < word.end &&
            (word.end - word.start) >= 1
          ).length;
        }
      });
      
      console.log(`Word validation summary: ${validWords}/${totalWords} words have valid timing`);
      
      if (validWords < totalWords) {
        console.warn(`Warning: ${totalWords - validWords} words have invalid timing and will be skipped`);
      }
      
      // Use the existing FFmpegOverlayRenderer for the overlay rendering
      const overlayRenderer = FFmpegOverlayRenderer.getInstance();
      
      const finalVideoPath = await overlayRenderer.renderVideoWithCaptions(
        clippedVideoPath,
        finalValidCaptions,
        outputPath,
        (progress) => {
          if (onProgress) onProgress(60 + Math.min(40, (progress / 100) * 40));
        },
        exportSettings
      );
      
      // Check if cancelled before cleanup
      if (this.isCancelled) {
        throw new Error('Rendering cancelled before cleanup');
      }
      
      // Clean up temporary files
      console.log('=== CLEANUP: Removing temporary files ===');
      this.cleanupTempFiles(tempDir);
      this.currentTempDir = null;
      
      console.log('=== FFMPEG OVERLAY WITH CLIPS RENDERER COMPLETED ===');
      return finalVideoPath;
      
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
    onProgress?: (progress: number) => void
  ): Promise<string> {
    // Filter out removed clips and sort by start time
    const activeClips = clips
      .filter(clip => !clip.isRemoved)
      .sort((a, b) => a.startTime - b.startTime);
    
    console.log('Active clips for processing:', activeClips.length);
    
    if (activeClips.length === 0) {
      throw new Error('No active clips found for processing');
    }
    
    // If only one clip that spans the entire video, just copy the original
    if (activeClips.length === 1) {
      const clip = activeClips[0];
      const clipDurationMs = clip.endTime - clip.startTime;
      const videoDurationMs = metadata.duration * 1000;
      
      // Check if this is essentially the full video (allow 1s tolerance)
      if (clip.startTime === 0 && Math.abs(clipDurationMs - videoDurationMs) <= 1000) {
        console.log('Single full-duration clip detected, copying original video');
        console.log(`Clip duration: ${clipDurationMs}ms, Video duration: ${videoDurationMs}ms`);
        const outputPath = path.join(tempDir, 'clipped_video.mp4');
        return await this.copyVideo(videoPath, outputPath);
      }
    }
    
    // Extract individual video segments
    console.log('Extracting video segments...');
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
        }
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
      }
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
   * Adjust caption timing based on clips using the same logic as AISubtitlesPanel
   * This ensures captions are properly mapped to the new clipped video timeline
   * Note: FFmpegOverlayRenderer expects times in milliseconds
   */
  private adjustCaptionsForClips(captions: any[], clips: VideoClip[]): any[] {
    console.log('Adjusting caption timing for', captions.length, 'captions');
    
    // Check if there are any removed clips
    const hasRemovedClips = clips.some(clip => clip.isRemoved);
    if (!hasRemovedClips) {
      console.log('No removed clips, returning original captions');
      return captions;
    }
    
    const removedClips = clips.filter(clip => clip.isRemoved).sort((a, b) => a.startTime - b.startTime);
    console.log('Removed clips:', removedClips.map(c => `${(c.startTime/1000).toFixed(3)}s-${(c.endTime/1000).toFixed(3)}s`));
    
    // First, filter out captions that overlap with removed clips (same logic as UI)
    const filteredCaptions = captions.filter(caption => {
      // Caption times are in milliseconds, convert to same unit as clip times
      const captionStartMs = caption.startTime;
      const captionEndMs = caption.endTime;
      
      // Check if this caption overlaps with any removed clip
      const isInRemovedClip = removedClips.some(clip => 
        captionStartMs < clip.endTime && 
        captionEndMs > clip.startTime
      );
      
      if (isInRemovedClip) {
        console.log(`Filtering out caption ${(captionStartMs/1000).toFixed(3)}s-${(captionEndMs/1000).toFixed(3)}s: overlaps with removed clip`);
      }
      
      return !isInRemovedClip;
    });
    
    console.log(`Filtered ${filteredCaptions.length}/${captions.length} captions (removed overlapping with deleted clips)`);
    
    // Then, adjust timing by subtracting removed clip durations (same logic as UI)
    const adjustedCaptions = filteredCaptions.map(caption => {
      const captionStartMs = caption.startTime;
      const captionEndMs = caption.endTime;
      
      // Calculate how much time to subtract from removed clips that come before this caption
      let timeToSubtractMs = 0;
      for (const clip of removedClips) {
        if (clip.endTime <= captionStartMs) {
          // Entire clip is before this caption
          timeToSubtractMs += (clip.endTime - clip.startTime);
        }
      }
      
      // Keep times in milliseconds for FFmpegOverlayRenderer
      const newStartMs = Math.max(0, captionStartMs - timeToSubtractMs);
      const newEndMs = Math.max(newStartMs + 1, captionEndMs - timeToSubtractMs); // Ensure minimum 1ms duration
      
      // Adjust word timing if present
      let adjustedWords = caption.words;
      if (Array.isArray(caption.words)) {
        adjustedWords = caption.words.map((word: any) => {
          if (word.start !== undefined && word.end !== undefined) {
            // Word times are in milliseconds
            const wordStartMs = word.start;
            const wordEndMs = word.end;
            
            // Calculate time to subtract for this word
            let wordTimeToSubtractMs = 0;
            for (const clip of removedClips) {
              if (clip.endTime <= wordStartMs) {
                wordTimeToSubtractMs += (clip.endTime - clip.startTime);
              }
            }
            
            // Keep word times in milliseconds for FFmpegOverlayRenderer
            const newWordStartMs = Math.max(0, wordStartMs - wordTimeToSubtractMs);
            const newWordEndMs = Math.max(newWordStartMs + 1, wordEndMs - wordTimeToSubtractMs); // Ensure minimum 1ms duration
            
            // Additional validation: ensure the word has a valid duration
            if (newWordEndMs <= newWordStartMs) {
              console.warn(`Invalid word duration after adjustment: start=${newWordStartMs}ms, end=${newWordEndMs}ms, original: start=${wordStartMs}ms, end=${wordEndMs}ms, subtracted=${wordTimeToSubtractMs}ms`);
              // Skip this word by returning null - it will be filtered out
              return null;
            }
            
            // Ensure word timing is constrained within caption timing (like AISubtitlesPanel does)
            const constrainedStartMs = Math.max(newWordStartMs, newStartMs);
            const constrainedEndMs = Math.min(newWordEndMs, newEndMs);
            
            // Final validation: ensure constrained timing is valid
            if (constrainedEndMs <= constrainedStartMs) {
              console.warn(`Word timing constrained to invalid duration: start=${constrainedStartMs}ms, end=${constrainedEndMs}ms, caption: start=${newStartMs}ms, end=${newEndMs}ms`);
              return null;
            }
            
            return {
              ...word,
              start: constrainedStartMs,
              end: constrainedEndMs
            };
          }
          return word;
        }).filter((word: any) => word !== null); // Remove null words (invalid durations)
        
        // If no valid words remain, log it but keep the caption for static rendering
        if (adjustedWords.length === 0 && caption.words && caption.words.length > 0) {
          console.log(`Caption at ${(newStartMs/1000).toFixed(3)}s has no valid words after adjustment, will render as static text`);
        }
      }
      
      const adjustedCaption = {
        ...caption,
        startTime: newStartMs,  // Keep in milliseconds for FFmpegOverlayRenderer
        endTime: newEndMs,      // Keep in milliseconds for FFmpegOverlayRenderer
        words: adjustedWords || []
      };
      
      // Debug first few captions
      if (filteredCaptions.indexOf(caption) < 3) {
        console.log(`Adjusted caption: ${(captionStartMs/1000).toFixed(3)}s -> ${(newStartMs/1000).toFixed(3)}s (subtracted ${(timeToSubtractMs/1000).toFixed(3)}s)`);
        console.log(`  Words: ${adjustedWords?.length || 0}, First word timing: ${adjustedWords?.[0]?.start ? (adjustedWords[0].start/1000).toFixed(3) : 'N/A'}s-${adjustedWords?.[0]?.end ? (adjustedWords[0].end/1000).toFixed(3) : 'N/A'}s`);
        
        // Debug word timing adjustment for first caption
        if (filteredCaptions.indexOf(caption) === 0 && caption.words && caption.words.length > 0) {
          console.log(`  === WORD TIMING DEBUG ===`);
          caption.words.slice(0, 3).forEach((word: any, wordIndex: number) => {
            const wordStartMs = word.start;
            const wordEndMs = word.end;
            let wordTimeToSubtractMs = 0;
            for (const clip of removedClips) {
              if (clip.endTime <= wordStartMs) {
                wordTimeToSubtractMs += (clip.endTime - clip.startTime);
              }
            }
            const newWordStartMs = Math.max(0, wordStartMs - wordTimeToSubtractMs);
            const newWordEndMs = Math.max(newWordStartMs + 1, wordEndMs - wordTimeToSubtractMs);
            const constrainedStartMs = Math.max(newWordStartMs, newStartMs);
            const constrainedEndMs = Math.min(newWordEndMs, newEndMs);
            
            console.log(`  Word ${wordIndex}: ${(wordStartMs/1000).toFixed(3)}s-${(wordEndMs/1000).toFixed(3)}s -> ${(constrainedStartMs/1000).toFixed(3)}s-${(constrainedEndMs/1000).toFixed(3)}s (subtracted: ${(wordTimeToSubtractMs/1000).toFixed(3)}s)`);
          });
          console.log(`  === END WORD TIMING DEBUG ===`);
        }
      }
      
      return adjustedCaption;
    });
    
    // Validate and filter out any captions with invalid timing after adjustment
    const validCaptions = adjustedCaptions.filter(caption => {
      const isValid = caption.startTime !== undefined && 
                     caption.endTime !== undefined && 
                     caption.startTime < caption.endTime &&
                     caption.endTime > caption.startTime;
      
      if (!isValid) {
        console.warn(`Filtering out invalid caption after adjustment: start=${caption.startTime}, end=${caption.endTime}`);
      }
      
      return isValid;
    });
    
    console.log(`Caption timing adjustment complete: ${validCaptions.length} valid captions in final video (filtered out ${adjustedCaptions.length - validCaptions.length} invalid captions)`);
    return validCaptions;
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