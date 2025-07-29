import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { CaptionSegment } from '../types';

export interface VideoEditOperation {
  type: 'trim' | 'cut' | 'splice';
  startTime: number; // milliseconds
  endTime: number; // milliseconds
  segmentId: string;
}

export class VideoEditor {
  private static instance: VideoEditor;

  private constructor() {}

  public static getInstance(): VideoEditor {
    if (!VideoEditor.instance) {
      VideoEditor.instance = new VideoEditor();
    }
    return VideoEditor.instance;
  }

  /**
   * Creates a new video with segments removed based on word deletions
   */
  public async applyWordDeletions(
    inputVideoPath: string,
    originalCaptions: CaptionSegment[],
    updatedCaptions: CaptionSegment[],
    outputPath: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        // Calculate which time segments need to be removed
        const segmentsToRemove = this.calculateRemovedSegments(originalCaptions, updatedCaptions);
        
        if (segmentsToRemove.length === 0) {
          // No changes, just copy the original video
          await this.copyVideo(inputVideoPath, outputPath);
          resolve(outputPath);
          return;
        }

        // Create a new video by splicing out the removed segments
        await this.removeSegmentsFromVideo(inputVideoPath, segmentsToRemove, outputPath, onProgress);
        resolve(outputPath);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Calculates which time segments were removed by comparing original and updated captions
   * Only considers actual word deletions, not text edits or merges
   */
  private calculateRemovedSegments(
    originalCaptions: CaptionSegment[],
    updatedCaptions: CaptionSegment[]
  ): Array<{ start: number; end: number }> {
    const removedSegments: Array<{ start: number; end: number }> = [];

    originalCaptions.forEach(originalSegment => {
      const updatedSegment = updatedCaptions.find(s => s.id === originalSegment.id);
      
      if (!updatedSegment) {
        // Entire segment was removed
        removedSegments.push({
          start: originalSegment.startTime,
          end: originalSegment.endTime
        });
        return;
      }

      // Check for word-level deletions within the segment
      if (originalSegment.words && updatedSegment.words) {
        const originalWords = originalSegment.words;
        const updatedWords = updatedSegment.words;
        
        // Only consider words actually deleted, not edited
        originalWords.forEach(originalWord => {
          // Check if this word was completely removed (not just edited)
          const wasActuallyDeleted = !updatedWords.some(updatedWord => {
            // Match by timing rather than text content to allow text edits
            const timingMatch = Math.abs(updatedWord.start - originalWord.start) < 100; // 100ms tolerance
            return timingMatch && updatedWord.word.trim() !== ''; // Must have content
          });
          
          // Only remove audio if the word was actually deleted, not just edited
          if (wasActuallyDeleted) {
            // Check if this is an intentional deletion vs a merge/edit
            const wasIntentionallyDeleted = this.isIntentionalWordDeletion(originalWord, updatedWords);
            
            if (wasIntentionallyDeleted) {
              removedSegments.push({
                start: originalWord.start,
                end: originalWord.end
              });
            }
          }
        });
      }
    });

    // Merge overlapping segments
    return this.mergeOverlappingSegments(removedSegments);
  }

  /**
   * Determines if a word was intentionally deleted vs merged/edited
   */
  private isIntentionalWordDeletion(
    originalWord: any,
    updatedWords: any[]
  ): boolean {
    // If there are no updated words in the time range, it was deleted
    const wordsInTimeRange = updatedWords.filter(word => 
      word.start >= originalWord.start - 200 && 
      word.end <= originalWord.end + 200
    );
    
    if (wordsInTimeRange.length === 0) {
      return true; // Definitely deleted
    }
    
    // If the word appears merged into another word (part of a larger word), don't delete audio
    const mergedIntoLargerWord = wordsInTimeRange.some(word => 
      word.word.toLowerCase().includes(originalWord.word.toLowerCase()) ||
      originalWord.word.toLowerCase().includes(word.word.toLowerCase())
    );
    
    return !mergedIntoLargerWord; // Only delete if not merged
  }

  /**
   * Merges overlapping time segments
   */
  private mergeOverlappingSegments(
    segments: Array<{ start: number; end: number }>
  ): Array<{ start: number; end: number }> {
    if (segments.length === 0) return segments;

    // Sort by start time
    const sorted = segments.sort((a, b) => a.start - b.start);
    const merged: Array<{ start: number; end: number }> = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const lastMerged = merged[merged.length - 1];

      if (current.start <= lastMerged.end + 100) { // 100ms buffer for merging
        // Overlapping or adjacent, merge them
        lastMerged.end = Math.max(lastMerged.end, current.end);
      } else {
        // No overlap, add as new segment
        merged.push(current);
      }
    }

    return merged;
  }

  /**
   * Removes specified time segments from video using FFmpeg
   */
  private async removeSegmentsFromVideo(
    inputPath: string,
    segmentsToRemove: Array<{ start: number; end: number }>,
    outputPath: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Get video duration first
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const totalDuration = (metadata.format.duration || 0) * 1000; // Convert to milliseconds
        
        // Create keep segments (inverse of remove segments)
        const keepSegments = this.calculateKeepSegments(segmentsToRemove, totalDuration);
        
        if (keepSegments.length === 0) {
          reject(new Error('No video segments to keep'));
          return;
        }

        // Use FFmpeg to concatenate keep segments
        this.concatenateSegments(inputPath, keepSegments, outputPath, onProgress)
          .then(() => resolve())
          .catch(reject);
      });
    });
  }

  /**
   * Calculates which segments to keep (inverse of segments to remove)
   */
  private calculateKeepSegments(
    removeSegments: Array<{ start: number; end: number }>,
    totalDuration: number
  ): Array<{ start: number; end: number }> {
    const keepSegments: Array<{ start: number; end: number }> = [];
    let currentStart = 0;

    removeSegments.forEach(removeSegment => {
      if (currentStart < removeSegment.start) {
        keepSegments.push({
          start: currentStart,
          end: removeSegment.start
        });
      }
      currentStart = removeSegment.end;
    });

    // Add final segment if there's remaining video
    if (currentStart < totalDuration) {
      keepSegments.push({
        start: currentStart,
        end: totalDuration
      });
    }

    return keepSegments.filter(segment => segment.end - segment.start > 100); // Minimum 100ms segments
  }

  /**
   * Concatenates video segments using FFmpeg
   */
  private async concatenateSegments(
    inputPath: string,
    segments: Array<{ start: number; end: number }>,
    outputPath: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const tempDir = os.tmpdir();
        const segmentPaths: string[] = [];

        // Extract each segment to temporary files
        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i];
          const segmentPath = path.join(tempDir, `segment_${i}_${Date.now()}.mp4`);
          
          await this.extractSegment(inputPath, segment.start / 1000, segment.end / 1000, segmentPath);
          segmentPaths.push(segmentPath);
        }

        // Create concat file list
        const concatFilePath = path.join(tempDir, `concat_${Date.now()}.txt`);
        const concatContent = segmentPaths.map(p => `file '${p}'`).join('\n');
        fs.writeFileSync(concatFilePath, concatContent);

        // Concatenate all segments
        ffmpeg()
          .input(concatFilePath)
          .inputOptions(['-f', 'concat', '-safe', '0'])
          .videoCodec('libx264')
          .audioCodec('aac')
          .output(outputPath)
          .on('progress', (progress) => {
            if (onProgress && progress.percent) {
              onProgress(progress.percent);
            }
          })
          .on('end', () => {
            // Clean up temporary files
            segmentPaths.forEach(p => {
              try { fs.unlinkSync(p); } catch (e) {}
            });
            try { fs.unlinkSync(concatFilePath); } catch (e) {}
            resolve();
          })
          .on('error', (err) => {
            // Clean up temporary files
            segmentPaths.forEach(p => {
              try { fs.unlinkSync(p); } catch (e) {}
            });
            try { fs.unlinkSync(concatFilePath); } catch (e) {}
            reject(err);
          })
          .run();

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Extracts a segment from video
   */
  private async extractSegment(
    inputPath: string,
    startSeconds: number,
    endSeconds: number,
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(startSeconds)
        .duration(endSeconds - startSeconds)
        .videoCodec('libx264')
        .audioCodec('aac')
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', reject)
        .run();
    });
  }

  /**
   * Simple video copy operation
   */
  private async copyVideo(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('copy')
        .audioCodec('copy')
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', reject)
        .run();
    });
  }
}

export default VideoEditor;