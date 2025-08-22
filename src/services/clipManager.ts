import { VideoClip, ClipTimelineData, ProjectData } from '../types';
import { ProjectManager } from './projectManager';

/**
 * ClipManager service for handling video clip operations
 * Manages clip splitting, deletion, and integration with .lvep files
 */
export class ClipManager {
  private static instance: ClipManager;
  private projectManager: ProjectManager;

  private constructor() {
    this.projectManager = ProjectManager.getInstance();
  }

  public static getInstance(): ClipManager {
    if (!ClipManager.instance) {
      ClipManager.instance = new ClipManager();
    }
    return ClipManager.instance;
  }

  /**
   * Initialize clips for a video with given duration
   */
  public initializeClips(videoDurationMs: number): VideoClip[] {
    const initialClip: VideoClip = {
      id: 'clip-1',
      startTime: 0,
      endTime: videoDurationMs,
      isRemoved: false
    };
    return [initialClip];
  }

  /**
   * Split a clip at the specified time
   */
  public splitClip(clips: VideoClip[], splitTimeMs: number): VideoClip[] {
    const newClips: VideoClip[] = [];
    
    for (const clip of clips) {
      if (splitTimeMs >= clip.startTime && splitTimeMs <= clip.endTime && !clip.isRemoved) {
        // Split this clip into two parts
        if (splitTimeMs > clip.startTime) {
          // First part
          newClips.push({
            ...clip,
            endTime: splitTimeMs
          });
        }
        
        if (splitTimeMs < clip.endTime) {
          // Second part
          newClips.push({
            ...clip,
            id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            startTime: splitTimeMs
          });
        }
      } else {
        newClips.push(clip);
      }
    }

    return newClips;
  }

  /**
   * Delete a clip at the specified time
   */
  public deleteClip(clips: VideoClip[], deleteTimeMs: number): VideoClip[] {
    return clips.map(clip => {
      if (deleteTimeMs >= clip.startTime && deleteTimeMs <= clip.endTime && !clip.isRemoved) {
        return { ...clip, isRemoved: true };
      }
      return clip;
    });
  }

  /**
   * Calculate effective duration (excluding removed clips)
   */
  public calculateEffectiveDuration(clips: VideoClip[]): number {
    if (clips.length === 0) return 0;

    const activeClips = clips.filter(clip => !clip.isRemoved);
    if (activeClips.length === 0) return 0;

    return activeClips.reduce((total, clip) => total + (clip.endTime - clip.startTime), 0);
  }

  /**
   * Convert effective time to original video time
   */
  public effectiveToOriginalTime(clips: VideoClip[], effectiveTime: number): number {
    if (clips.length === 0) return effectiveTime;

    const activeClips = clips.filter(clip => !clip.isRemoved);
    if (activeClips.length === 0) return 0;

    let accumulatedTime = 0;
    for (const clip of activeClips) {
      const clipDuration = clip.endTime - clip.startTime;
      if (effectiveTime <= accumulatedTime + clipDuration) {
        // Time falls within this clip
        const timeWithinClip = effectiveTime - accumulatedTime;
        return clip.startTime + timeWithinClip;
      }
      accumulatedTime += clipDuration;
    }

    return activeClips[activeClips.length - 1]?.endTime || 0;
  }

  /**
   * Convert original video time to effective time
   */
  public originalToEffectiveTime(clips: VideoClip[], originalTime: number): number {
    if (clips.length === 0) return originalTime;

    const activeClips = clips.filter(clip => !clip.isRemoved);
    if (activeClips.length === 0) return 0;

    let effectiveTime = 0;
    for (const clip of activeClips) {
      if (originalTime >= clip.startTime && originalTime <= clip.endTime) {
        // Time falls within this clip
        return effectiveTime + (originalTime - clip.startTime);
      }
      effectiveTime += clip.endTime - clip.startTime;
    }

    return effectiveTime;
  }

  /**
   * Get clip timeline data for a project
   */
  public getClipTimelineData(projectData: ProjectData): ClipTimelineData {
    const clips = projectData.clips || [];
    const originalDuration = projectData.videoFile?.duration 
      ? projectData.videoFile.duration * 1000 
      : 0;
    
    return {
      clips,
      effectiveDuration: this.calculateEffectiveDuration(clips),
      originalDuration
    };
  }

  /**
   * Update project with new clips and save to .lvep file
   */
  public async updateProjectClips(projectData: ProjectData, newClips: VideoClip[]): Promise<void> {
    const updatedProjectData: ProjectData = {
      ...projectData,
      clips: newClips,
      lastModified: Date.now()
    };

    try {
      await this.projectManager.saveProject(updatedProjectData);
      console.log('Project clips updated and saved to .lvep file');
    } catch (error) {
      console.error('Failed to save project clips:', error);
      throw error;
    }
  }

  /**
   * Check if a time falls within a removed clip
   */
  public isTimeInRemovedClip(clips: VideoClip[], timeMs: number): boolean {
    return clips.some(clip => 
      timeMs >= clip.startTime && timeMs <= clip.endTime && clip.isRemoved
    );
  }

  /**
   * Get the next valid time after a removed clip
   */
  public getNextValidTime(clips: VideoClip[], currentTimeMs: number): number {
    const removedClips = clips.filter(clip => clip.isRemoved);
    
    for (const removedClip of removedClips) {
      if (currentTimeMs >= removedClip.startTime && currentTimeMs <= removedClip.endTime) {
        return removedClip.endTime;
      }
    }
    
    return currentTimeMs;
  }

  /**
   * Get the previous valid time before a removed clip
   */
  public getPreviousValidTime(clips: VideoClip[], currentTimeMs: number): number {
    const removedClips = clips.filter(clip => clip.isRemoved);
    
    for (const removedClip of removedClips) {
      if (currentTimeMs >= removedClip.startTime && currentTimeMs <= removedClip.endTime) {
        return removedClip.startTime;
      }
    }
    
    return currentTimeMs;
  }
}
