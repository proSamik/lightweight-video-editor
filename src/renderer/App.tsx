import React, { useState, useEffect, useCallback } from 'react';
import { VideoFile, ExportSettings, ProjectData, AISettings, GeneratedContent, AISubtitleData, SubtitleFrame, VideoClip } from '../types';
import VideoPanel from './components/VideoPanel';
import UnifiedTimeline from './components/UnifiedTimeline';
import TabbedRightPanel from './components/TabbedRightPanel';
import TranscriptionSettings from './components/TranscriptionSettings';
import ProjectManagerModal from './components/ProjectManager';
import SuccessModal from './components/SuccessModal';
import ExportProcessingModal from './components/ExportProcessingModal';
import AISettingsModal from './components/AISettingsModal';
import AIContentModal from './components/AIContentModal';
import ExportSettingsModal from './components/ExportSettings';
import { UpdateModal } from './components/UpdateModal';
import { UpdateNotification } from './components/UpdateNotification';
import DependencyInstallModal from './components/DependencyInstallModal';
import { Button, Card } from './components/ui';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import {
  ProjectManagerIcon,
  NewProjectIcon,
  SaveProjectIcon,
  SettingsIcon,
  BotIcon,
  MusicIcon,
  MusicWithCheckIcon,
  MusicExportIcon,
  CloseIcon,
  ExportSrtIcon,
  ExportVideoIcon,
  AudioImportIcon,
  SocialMediaIcon,
} from './components/IconComponents';

interface AppState {
  aiSubtitleData?: AISubtitleData | null;
  selectedFrameId?: string | null;
  clips?: VideoClip[];

}

const AppContent: React.FC = () => {
  const { theme } = useTheme();
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [replacementAudioPath, setReplacementAudioPath] = useState<string | null>(null);
  const [isAudioPreviewEnabled, setIsAudioPreviewEnabled] = useState(true);
  const [extractedAudioPath, setExtractedAudioPath] = useState<string | null>(null);
  const [aiSubtitleData, setAiSubtitleData] = useState<AISubtitleData | null>(null);
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingProgress, setLoadingProgress] = useState<number | undefined>(undefined);
  const [history, setHistory] = useState<AppState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showTranscriptionSettings, setShowTranscriptionSettings] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [exportedFilePath, setExportedFilePath] = useState<string>('');
  const [pendingVideoPath, setPendingVideoPath] = useState<string | null>(null);
  const [pendingVideoDuration, setPendingVideoDuration] = useState<number | undefined>(undefined);
  const [pendingVideoMetadata, setPendingVideoMetadata] = useState<{ width?: number; height?: number; duration?: number } | null>(null);
  const [pendingTranscriptionSettings, setPendingTranscriptionSettings] = useState<{ maxCharsPerLine: number; maxWordsPerLine: number } | null>(null);
  const [showAISettings, setShowAISettings] = useState(false);
  const [showAIContent, setShowAIContent] = useState(false);
  const [aiSettings, setAISettings] = useState<AISettings | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [showExportSettings, setShowExportSettings] = useState(false);
  const [showSrtSuccess, setShowSrtSuccess] = useState(false);
  const [showDependencyInstall, setShowDependencyInstall] = useState(false);
  const [showVideoLoadingModal, setShowVideoLoadingModal] = useState(false);
  const [videoLoadingMessage, setVideoLoadingMessage] = useState('Loading video...');
  const [missingDependencies, setMissingDependencies] = useState({ ffmpeg: false, whisper: false });
  const [dependenciesReady, setDependenciesReady] = useState(false);
  const [isCheckingDependencies, setIsCheckingDependencies] = useState(true);

  // Update-related state
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateModalType, setUpdateModalType] = useState<'available' | 'downloaded' | 'changelog'>('available');
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [exportedSrtPath, setExportedSrtPath] = useState<string>('');
  const [currentProjectInfo, setCurrentProjectInfo] = useState<{
    projectPath: string | null;
    projectName: string;
    isModified: boolean;
  }>({ projectPath: null, projectName: 'Untitled Project', isModified: false });
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [editingProjectName, setEditingProjectName] = useState('');
  const [transcriptionStatus, setTranscriptionStatus] = useState<{
    isTranscribing: boolean;
    progress: number;
    message: string;
    speed?: string;
    eta?: string;
  }>({ isTranscribing: false, progress: 0, message: '' });
  const [cancelController, setCancelController] = useState<AbortController | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Clip editing state
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [zoomLevel, setZoomLevel] = useState(1); // Shared zoom level between modes (1 = 100% base zoom)
  const clipManager = {
    initializeClips: (videoDurationMs: number): VideoClip[] => {
      const initialClip: VideoClip = {
        id: 'clip-1',
        startTime: 0,
        endTime: videoDurationMs,
        isRemoved: false
      };
      return [initialClip];
    },
    isTimeInRemovedClip: (clips: VideoClip[], timeMs: number): boolean => {
      return clips.some(clip => 
        timeMs >= clip.startTime && timeMs <= clip.endTime && clip.isRemoved
      );
    },
    getNextValidTime: (clips: VideoClip[], currentTimeMs: number): number => {
      const removedClips = clips.filter(clip => clip.isRemoved);
      
      for (const removedClip of removedClips) {
        if (currentTimeMs >= removedClip.startTime && currentTimeMs <= removedClip.endTime) {
          return removedClip.endTime;
        }
      }
      
      return currentTimeMs;
    },
    getPreviousValidTime: (clips: VideoClip[], currentTimeMs: number): number => {
      const removedClips = clips.filter(clip => clip.isRemoved);
      
      for (const removedClip of removedClips) {
        if (currentTimeMs >= removedClip.startTime && currentTimeMs <= removedClip.endTime) {
          return removedClip.startTime;
        }
      }
      
      return currentTimeMs;
    },
    calculateEffectiveDuration: (clips: VideoClip[]): number => {
      if (clips.length === 0) return 0;

      const activeClips = clips.filter(clip => !clip.isRemoved);
      if (activeClips.length === 0) return 0;

      return activeClips.reduce((total, clip) => total + (clip.endTime - clip.startTime), 0);
    },
    effectiveToOriginalTime: (clips: VideoClip[], effectiveTime: number): number => {
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
    },
    originalToEffectiveTime: (clips: VideoClip[], originalTime: number): number => {
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
    },
    updateProjectClips: async (projectData: ProjectData, newClips: VideoClip[]) => {
      // Update the project data with new clips
      const updatedProjectData = {
        ...projectData,
        clips: newClips,
        lastModified: Date.now()
      };
      
      // Save the updated project
      await window.electronAPI.saveProject(updatedProjectData);
    }
  };

  // Handle cancel operation
  const handleCancel = () => {
    if (cancelController) {
      cancelController.abort();
      setCancelController(null);
    }
    // Also cancel the rendering operation
    try {
      window.electronAPI.cancelRendering();
    } catch (error) {
      console.log('No active rendering to cancel');
    }
  };

  // Clip handling functions
  const handleClipsChange = async (newClips: VideoClip[]) => {
    // Save current state to history before making changes
    saveToHistory();
    
    setClips(newClips);
    
    // Store clips in localStorage for persistence (not auto-save to .lvep)
    try {
      localStorage.setItem('tempClips', JSON.stringify(newClips));
      // Don't save clip mode - always default to subtitle mode
    } catch (error) {
      console.error('Failed to save clips to localStorage:', error);
    }
    
    // Update project modified status
    setCurrentProjectInfo(prev => ({ ...prev, isModified: true }));
  };



  // Update current time to skip removed clips during playback
  const handleTimeUpdate = (newTime: number) => {
    if (clips.length > 0) {
      // Check if current time is in a removed clip
      const isInRemovedClip = clipManager.isTimeInRemovedClip(clips, newTime);
      if (isInRemovedClip) {
        // Skip to next valid time
        const nextValidTime = clipManager.getNextValidTime(clips, newTime);
        setCurrentTime(nextValidTime);
        return;
      }
    }
    setCurrentTime(newTime);
  };

  // Handle time seeking with clip awareness
  const handleTimeSeek = (newTime: number) => {
    if (clips.length > 0) {
      // Check if target time is in a removed clip
      const isInRemovedClip = clipManager.isTimeInRemovedClip(clips, newTime);
      if (isInRemovedClip) {
        // Find the next valid time
        const nextValidTime = clipManager.getNextValidTime(clips, newTime);
        setCurrentTime(nextValidTime);
        return;
      }
    }
    setCurrentTime(newTime);
  };

  /**
   * Get clipped subtitles - excludes subtitles within removed clip time ranges
   */
  const getClippedSubtitles = useCallback((): AISubtitleData | null => {
    if (!aiSubtitleData) {
      return aiSubtitleData;
    }

    // Always filter subtitles based on clips, regardless of mode
    if (!clips || clips.length === 0) {
      return aiSubtitleData; // No clips, return all subtitles
    }

    const activeClips = clips.filter(clip => !clip.isRemoved);
    if (activeClips.length === 0) {
      return { ...aiSubtitleData, frames: [] }; // All clips removed, no subtitles
    }

    const filteredFrames = aiSubtitleData.frames.filter(frame => {
      // Check if this frame overlaps with any active clip
      const frameStartMs = frame.startTime * 1000;
      const frameEndMs = frame.endTime * 1000;
      
      const isInActiveClip = activeClips.some(clip => 
        frameStartMs < clip.endTime && frameEndMs > clip.startTime
      );
      
      return isInActiveClip;
    });

    return {
      ...aiSubtitleData,
      frames: filteredFrames
    };
  }, [aiSubtitleData, clips]);

  // Initialize history and load project info
  useEffect(() => {
    // Initialize app on startup
    const initializeApp = async () => {
      console.log('Initializing app and checking dependencies...');
      
      // Initialize history with current state
      const initialState = { aiSubtitleData: null, selectedFrameId: null, clips: [] };
      setHistory([initialState]);
      setHistoryIndex(0);

      // Load clips from localStorage if available
      try {
        const savedClips = localStorage.getItem('tempClips');
        
        if (savedClips) {
          const parsedClips = JSON.parse(savedClips);
          setClips(parsedClips);
        }
      } catch (error) {
        console.error('Failed to load clips from localStorage:', error);
      }

      // Load project info
      await loadCurrentProjectInfo();
      
      // Check dependencies at startup
      console.log('Checking dependencies at app startup...');
      const dependenciesOk = await checkDependencies();
      setDependenciesReady(dependenciesOk);
      setIsCheckingDependencies(false);
      
      console.log('App initialization complete. Dependencies ready:', dependenciesOk);
    };

    initializeApp();
  }, []);

  // Load current project info
  const loadCurrentProjectInfo = async () => {
    try {
      const info = await window.electronAPI.getCurrentProjectInfo();
      setCurrentProjectInfo(info);
    } catch (error) {
      console.error('Failed to load project info:', error);
    }
  };

  // Mark project as modified
  const markProjectModified = async () => {
    try {
      await window.electronAPI.markProjectModified();
      setCurrentProjectInfo(prev => ({ ...prev, isModified: true }));
    } catch (error) {
      console.error('Failed to mark project as modified:', error);
    }
  };

  // Save state to history
  const saveToHistory = () => {
    const currentState = { aiSubtitleData, selectedFrameId, clips };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(currentState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // AI Subtitle update handler with history
  const handleAISubtitleUpdate = (newData: AISubtitleData | null) => {
    // Save current state to history before making changes
    saveToHistory();
    setAiSubtitleData(newData);
    
    // Mark project as modified
    markProjectModified();
  };

  // No more caption sync needed - AI Subtitles are the single source of truth

  // Update-related handlers
  const handleShowUpdateModal = (type: 'available' | 'downloaded' | 'changelog', info: any) => {
    setUpdateInfo(info);
    setUpdateModalType(type);
    setShowUpdateModal(true);
  };

  // Undo/Redo handlers
  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const state = history[newIndex];
      setAiSubtitleData(state.aiSubtitleData || null);
      setSelectedFrameId(state.selectedFrameId || null);
      setClips(state.clips || []); // Restore clips
      setHistoryIndex(newIndex);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const state = history[newIndex];
      setAiSubtitleData(state.aiSubtitleData || null);
      setSelectedFrameId(state.selectedFrameId || null);
      setClips(state.clips || []); // Restore clips
      setHistoryIndex(newIndex);
    }
  };



  // Progress tracking and file drop event listeners
  useEffect(() => {
    const handleTranscriptionProgress = (progress: number, speed?: string, eta?: string) => {
      setLoadingProgress(progress);
      // Also update transcription status if actively transcribing
      setTranscriptionStatus(prev => 
        prev.isTranscribing ? { ...prev, progress, speed, eta } : prev
      );
    };
    
    const handleRenderingProgress = (progress: number) => {
      setLoadingProgress(progress);
    };
    
    const handleFileDropped = (filePath: string) => {
      console.log('File drop event received in renderer:', filePath);
      handleVideoDropped(filePath);
    };
    
    // Set up progress listeners
    window.electronAPI.onTranscriptionProgress(handleTranscriptionProgress);
    window.electronAPI.onRenderingProgress(handleRenderingProgress);
    window.electronAPI.onFileDropped(handleFileDropped);
    
    return () => {
      // Clean up listeners
      window.electronAPI.removeTranscriptionProgressListener();
      window.electronAPI.removeRenderingProgressListener();
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 's' && !e.shiftKey) {
        e.preventDefault();
        handleSaveProject();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 's' && e.shiftKey) {
        e.preventDefault();
        handleSaveProjectAs();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handleNewProject();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault();
        setShowProjectManager(true);
      } else if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setShowAISettings(true);
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
        e.preventDefault();
        if (aiSubtitleData && aiSubtitleData.frames.length > 0) {
          setShowAIContent(true);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history, videoFile, aiSubtitleData]);

  const checkDependencies = async () => {
    try {
      const deps = await window.electronAPI.checkDependencies();
      
      if (!deps.ffmpeg || !deps.whisper) {
        // Set missing dependencies and show installation modal
        setMissingDependencies({
          ffmpeg: !deps.ffmpeg,
          whisper: !deps.whisper
        });
        setShowDependencyInstall(true);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error checking dependencies:', error);
      alert('Error checking dependencies. Please ensure FFmpeg and Whisper are installed.');
      return false;
    }
  };

  const handleInstallationComplete = async () => {
    setShowDependencyInstall(false);
    // Refresh services to pick up newly installed dependencies
    try {
      // Force a reload of the services to detect newly installed dependencies
      await window.electronAPI.refreshDependencyDetection();
      console.log('Dependencies refreshed after installation');
    } catch (error) {
      console.error('Error refreshing dependencies after installation:', error);
    }
  };

  const handleVideoSelect = async () => {
    if (!dependenciesReady) {
      console.log('Dependencies not ready yet');
      return;
    }
    
    try {
      setShowVideoLoadingModal(true);
      setVideoLoadingMessage('Opening file selector...');
      
      const filePath = await window.electronAPI.selectVideoFile();
      if (filePath) {
        setVideoLoadingMessage('Loading video metadata...');
        
        // Load video metadata to get duration for time estimation
        const metadata = await window.electronAPI.getVideoMetadata(filePath);
        setPendingVideoDuration(metadata?.duration);
        setPendingVideoMetadata(metadata);
        
        setShowVideoLoadingModal(false);
        setShowTranscriptionSettings(true);
        setPendingVideoPath(filePath);
      } else {
        setShowVideoLoadingModal(false);
      }
    } catch (error) {
      console.error('Error selecting video file:', error);
      setShowVideoLoadingModal(false);
    }
  };

  const handleVideoDropped = async (filePath: string) => {
    console.log('handleVideoDropped called with:', filePath);
    if (!dependenciesReady) {
      console.log('Dependencies not ready yet');
      return;
    }
    
    console.log('Dependencies ready, processing dropped video');
    
    try {
      setShowVideoLoadingModal(true);
      setVideoLoadingMessage('Processing dropped video...');
      
      // Load video metadata to get duration for time estimation
      const metadata = await window.electronAPI.getVideoMetadata(filePath);
      setPendingVideoDuration(metadata?.duration);
      setPendingVideoMetadata(metadata);
      
      setShowVideoLoadingModal(false);
      setShowTranscriptionSettings(true);
      setPendingVideoPath(filePath);
    } catch (error) {
      console.error('Error loading video metadata:', error);
      setPendingVideoDuration(undefined);
      setPendingVideoMetadata(null);
      setShowVideoLoadingModal(false);
    }
  };


  const generateCaptions = async (
    videoPath: string, 
    settings?: { maxCharsPerLine: number; maxWordsPerLine: number; whisperModel?: string }
  ) => {
    try {
      // Start background transcription without blocking UI
      setTranscriptionStatus({ isTranscribing: true, progress: 0, message: 'Extracting audio...' });
      
      // Get current project path - if not saved yet, we'll save after extraction
      let projectPath = currentProjectInfo.projectPath;
      
      let audioPath: string;
      
      if (projectPath) {
        // Extract high-quality audio for the project (this will be saved for waveforms)
        audioPath = await window.electronAPI.extractAudioForProject(videoPath, projectPath);
        // Store the extracted audio path for later use with waveforms
        setExtractedAudioPath(audioPath);
      } else {
        // Fallback to temporary audio extraction if no project is saved yet
        audioPath = await window.electronAPI.extractAudio(videoPath);
      }
      
      setTranscriptionStatus(prev => ({ ...prev, message: 'Transcribing audio' }));
      
      // Transcribe entire audio
      const transcriptionResult = await window.electronAPI.transcribeAudio(audioPath, settings?.whisperModel || 'base');
      
      setTranscriptionStatus(prev => ({ ...prev, message: 'Processing transcription results...' }));
      
      // Get video metadata to determine aspect ratio for responsive font sizing
      const videoMetadata = await window.electronAPI.getVideoMetadata(videoPath);
      const isVertical = videoMetadata && videoMetadata.width && videoMetadata.height && 
                        (videoMetadata.height / videoMetadata.width) > 1.5; // 9:16 or more vertical
      
      // Use smaller font size for vertical videos (9:16)
      const defaultFontSize = isVertical ? 50 : 85;
      
      console.log('Video metadata for font sizing:', {
        width: videoMetadata?.width,
        height: videoMetadata?.height,
        aspectRatio: videoMetadata?.width && videoMetadata?.height ? videoMetadata.width / videoMetadata.height : 'unknown',
        isVertical,
        defaultFontSize
      });
      
      setTranscriptionStatus(prev => ({ ...prev, message: 'Creating AI subtitle data...' }));
      
      // Create AI subtitle data directly from transcription (no captions)
      const aiData = createAISubtitleDataFromTranscription(
        transcriptionResult, 
        defaultFontSize,
        settings?.maxWordsPerLine || (isVertical ? 2 : 5),
        settings?.maxCharsPerLine || (isVertical ? 12 : 16)
      );
      
      setTranscriptionStatus(prev => ({ ...prev, message: 'Finalizing AI subtitles...' }));
      
      // Set AI subtitle data as the single source of truth
      setAiSubtitleData(aiData);
      
      // If we extracted audio for a project, save the project to persist the audio path
      if (projectPath) {
        try {
          setTranscriptionStatus(prev => ({ ...prev, message: 'Saving project...' }));
          // The project data will be updated with the extractedAudioPath state which was set above
          const projectData = getCurrentProjectData();
          await window.electronAPI.saveProject(projectData);
          await loadCurrentProjectInfo(); // Refresh project info
          console.log('Project saved with extracted audio path');
        } catch (error) {
          console.warn('Failed to auto-save project with extracted audio:', error);
          // Don't fail the transcription for this
        }
      }
      
      // Small delay to show completion before hiding
      setTimeout(() => {
        setTranscriptionStatus({ isTranscribing: false, progress: 100, message: 'Transcription completed' });
      }, 500);
      
      // Clear loading progress without blocking UI
      setLoadingProgress(undefined);
    } catch (error) {
      console.error('Error generating captions:', error);
      setTranscriptionStatus({ isTranscribing: false, progress: 0, message: 'Transcription failed' });
      
      // Show error without blocking UI
      setLoadingProgress(undefined);
      alert('Error generating captions. Please check that FFmpeg and Whisper are installed.');
    }
  };

  // Convert transcription results directly to AI subtitle data (no captions)
  const createAISubtitleDataFromTranscription = (transcriptionResult: any, defaultFontSize: number, maxWordsPerFrame: number = 2, maxCharsPerFrame: number = 16): AISubtitleData => {
    const frames: SubtitleFrame[] = [];
    const audioSegments: any[] = [];
    
    transcriptionResult.segments.forEach((segment: any, segmentIndex: number) => {
      // Segment ID for referencing the original segment
      const segmentId = `segment-${segmentIndex}`;
      
      // Create audio segment
      audioSegments.push({
        id: `audio-${segmentId}`,
        startTime: segment.start / 1000, // Convert to seconds for AI format
        endTime: segment.end / 1000,
        isRemoved: false
      });
      
      if (segment.words && segment.words.length > 0) {
        // Convert words to AI format (seconds)
        const wordSegments = segment.words.map((word: any, wordIndex: number) => ({
          ...word,
          start: word.start / 1000, // Convert to seconds
          end: word.end / 1000,
          id: `${segmentId}-word-${wordIndex}`,
          editState: 'normal' as const,
          originalWord: word.word,
          isPause: word.word === '[.]',
          isKeyword: false
        }));
        
        // Split words into frames based on maxWordsPerFrame and maxCharsPerFrame
        let currentFrame: SubtitleFrame | null = null;
        let currentWords: any[] = [];
        let currentCharCount = 0;

        wordSegments.forEach((wordSegment: any, index: number) => {
          const wordLength = wordSegment.word.length + 1; // +1 for space
          
          // Check if we need to start a new frame
          if (
            currentWords.length >= maxWordsPerFrame ||
            currentCharCount + wordLength > maxCharsPerFrame ||
            currentFrame === null
          ) {
            // Save previous frame if exists
            if (currentFrame !== null && currentWords.length > 0) {
              (currentFrame as SubtitleFrame).words = [...currentWords];
              const lastWord = currentWords[currentWords.length - 1];
              if (lastWord) {
                (currentFrame as SubtitleFrame).endTime = lastWord.end;
              }
              frames.push(currentFrame as SubtitleFrame);
            }

            // Start new frame with default style including 2.5px stroke
            currentFrame = {
              id: `frame-${segmentIndex}-${Math.floor(index / maxWordsPerFrame)}`,
              startTime: wordSegment.start,
              endTime: wordSegment.end,
              words: [],
              segmentId: segmentId,
              isCustomBreak: false,
              style: {
                font: 'Poppins',
                fontSize: defaultFontSize,
                textColor: '#ffffff',
                highlighterColor: '#00ff00',
                backgroundColor: '#000000',
                strokeColor: '#000000',
                strokeWidth: 2.5,
                textTransform: 'none',
                position: { x: 50, y: 80, z: 0 },
                renderMode: 'horizontal',
                textAlign: 'center',
                scale: 1,
                emphasizeMode: true,
                burnInSubtitles: true,
              }
            };
            currentWords = [];
            currentCharCount = 0;
          }

          currentWords.push(wordSegment);
          currentCharCount += wordLength;
        });

        // Add the last frame if it has words
        if (currentFrame !== null && currentWords.length > 0) {
          (currentFrame as SubtitleFrame).words = currentWords;
          const lastWord = currentWords[currentWords.length - 1];
          if (lastWord) {
            (currentFrame as SubtitleFrame).endTime = lastWord.end;
          }
          frames.push(currentFrame as SubtitleFrame);
        }
      }
    });

    return {
      frames,
      audioSegments,
      maxWordsPerFrame,
      maxCharsPerFrame,
      lastModified: Date.now()
    };
  };


  const handleTranscriptionSettingsConfirm = async (settings: { maxCharsPerLine: number; maxWordsPerLine: number; whisperModel: string }) => {
    if (pendingVideoPath) {
      try {
        // Immediately show loading state to prevent UI freeze appearance
        setShowTranscriptionSettings(false);
        setTranscriptionStatus({ isTranscribing: true, progress: 0, message: 'Initializing transcription...' });
        
        // Update status and get video metadata
        setTranscriptionStatus(prev => ({ ...prev, message: 'Loading video metadata...' }));
        const videoMetadata = await window.electronAPI.getVideoMetadata(pendingVideoPath);
        setVideoFile(videoMetadata);
        
        // Reset state for new video - this will cause UnifiedTimeline to reinitialize
        setClips([]);
        setCurrentTime(0);
        setSelectedFrameId(null);
        
        // Clear any persisted clips from previous video
        localStorage.removeItem('tempClips');
        
        // Generate captions in background (UI remains responsive)
        await generateCaptions(pendingVideoPath, settings);
        setPendingVideoPath(null);
        setPendingVideoDuration(undefined);
        setPendingVideoMetadata(null);
        setPendingTranscriptionSettings(null);
      } catch (error) {
        console.error('Error in transcription setup:', error);
        setTranscriptionStatus({ isTranscribing: false, progress: 0, message: 'Failed to load video' });
        setShowTranscriptionSettings(false);
        setPendingVideoPath(null);
        setPendingVideoDuration(undefined);
        setPendingVideoMetadata(null);
      }
    }
  };



  const handleExport = async (exportSettings: ExportSettings) => {
    if (!videoFile) return;

    try {
      setIsLoading(true);
      setLoadingProgress(0);
      setLoadingMessage('Choosing export location...');
      
      const controller = new AbortController();
      setCancelController(controller);

      // Generate filename based on export mode
      let defaultFileName: string;
      switch (exportSettings.exportMode) {
        case 'newAudio':
          defaultFileName = `${videoFile.name.replace(/\.[^/.]+$/, "")}_with_new_audio.mp4`;
          break;
        case 'subtitlesOnly':
          defaultFileName = `${videoFile.name.replace(/\.[^/.]+$/, "")}_with_subtitles.mp4`;
          break;
        case 'completeWithClips':
          defaultFileName = `${videoFile.name.replace(/\.[^/.]+$/, "")}_clipped.mp4`;
          break;
        default:
          defaultFileName = `${videoFile.name.replace(/\.[^/.]+$/, "")}_exported.mp4`;
      }

      const outputPath = await window.electronAPI.exportVideo(defaultFileName);

      if (!outputPath) {
        setIsLoading(false);
        setLoadingProgress(undefined);
        return;
      }

      // Handle different export modes
      switch (exportSettings.exportMode) {
        case 'newAudio':
          // Export video with new audio only (no subtitles)
          if (!replacementAudioPath) {
            alert('No replacement audio available for this export mode.');
            setIsLoading(false);
            setLoadingProgress(undefined);
            return;
          }
          setLoadingMessage('Exporting video with new audio...');
          
          // Export video with new audio
          await window.electronAPI.exportVideoWithNewAudio(
            videoFile.path,
            replacementAudioPath,
            outputPath
          );
          break;

        case 'subtitlesOnly':
          // Export video with original audio and AI subtitles
          if (aiSubtitleData && aiSubtitleData.frames.length > 0) {
            setLoadingMessage('Rendering video with AI subtitles...');
            setLoadingProgress(0);
            await window.electronAPI.renderVideoWithAISubtitles(
              videoFile.path,
              aiSubtitleData,
              outputPath,
              exportSettings
            );
          } else {
            alert('No subtitles available for export.');
            setIsLoading(false);
            setLoadingProgress(undefined);
            return;
          }
          break;

        case 'completeWithClips':
          // Export complete video with clipping support
          setLoadingMessage('Rendering clipped video...');
          setLoadingProgress(0);
          await window.electronAPI.renderVideoWithClipsAndSubtitles(
            videoFile.path,
            clips,
            aiSubtitleData || { frames: [] }, // Pass empty frames array if no subtitles
            outputPath,
            exportSettings,
            replacementAudioPath || undefined
          );
          break;

        default: // 'exported'
          // Export complete video (with AI subtitles and audio replacement if available)
          if (aiSubtitleData && aiSubtitleData.frames.length > 0) {
            setLoadingMessage('Rendering complete video with AI subtitles...');
            setLoadingProgress(0);
            await window.electronAPI.renderVideoWithAISubtitles(
              videoFile.path,
              aiSubtitleData,
              outputPath,
              exportSettings,
              replacementAudioPath || undefined
            );
          } else {
            alert('No subtitles available for export.');
            setIsLoading(false);
            setLoadingProgress(undefined);
            return;
          }
      }

      setIsLoading(false);
      setLoadingProgress(undefined); // Clear progress
      setCancelController(null);
      
      // Show success modal
      setExportedFilePath(outputPath);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Export error:', error);
      setIsLoading(false);
      setLoadingProgress(undefined); // Clear progress
      setCancelController(null);
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('cancelled'))) {
        // Export was cancelled
        console.log('Export cancelled by user');
      } else {
        alert(`Export failed: ${error}`);
      }
    }
  };

  const getCurrentProjectData = (): ProjectData => {
    const projectData = {
      version: '1.0',
      videoFile,
      // AI subtitles are the single source of truth
      aiSubtitleData,
      timeline: [], // Empty for now, could be used for timeline selections
      replacementAudioPath,
      extractedAudioPath, // Include the extracted audio path for waveforms
      clips, // Include clips in project data
      lastModified: Date.now(),
      description: generatedContent?.description,
      title: generatedContent?.titles?.[0]?.title,
      aiGeneratedTitles: generatedContent?.titles?.map(t => t.title),
      tweets: generatedContent?.tweets,
      thumbnails: generatedContent?.thumbnails
    };
    return projectData;
  };

  const handleSaveProject = async () => {
    const hasAnySubtitles = aiSubtitleData && aiSubtitleData.frames.length > 0;
    if (!videoFile && !hasAnySubtitles) {
      alert('No project data to save. Load a video and create subtitles first.');
      return;
    }

    try {
      const projectData = getCurrentProjectData();
      const savedPath = await window.electronAPI.saveProject(projectData);
      console.log(`Project saved: ${savedPath}`);
      
      // Clear localStorage after successful save
      try {
        localStorage.removeItem('tempClips');
      } catch (error) {
        console.error('Failed to clear localStorage:', error);
      }
      
      // Update project info
      await loadCurrentProjectInfo();
      
      // Could show a success message or notification here
    } catch (error) {
      console.error('Failed to save project:', error);
      alert('Failed to save project.');
    }
  };

  const handleSaveProjectAs = async () => {
    if (!videoFile && (!aiSubtitleData || aiSubtitleData.frames.length === 0)) {
      alert('No project data to save. Load a video and create subtitles first.');
      return;
    }

    try {
      const projectData = getCurrentProjectData();
      const savedPath = await window.electronAPI.saveProjectAs(projectData);
      console.log(`Project saved as: ${savedPath}`);
      
      // Update project info
      await loadCurrentProjectInfo();
      
      // Could show a success message or notification here
    } catch (error) {
      console.error('Failed to save project as:', error);
      alert('Failed to save project as new file.');
    }
  };

  const handleNewProject = async () => {
    try {
      await window.electronAPI.createNewProject();
      
      // Reset UI state
      setVideoFile(null);
      setAiSubtitleData(null);
      setSelectedFrameId(null);
      setCurrentTime(0);
      setGeneratedContent(null);
      setClips([]); // Reset clips
      
      // Clear localStorage
      try {
        localStorage.removeItem('tempClips');
      } catch (error) {
        console.error('Failed to clear localStorage:', error);
      }
      
      // Reset history
      setHistory([{ aiSubtitleData: null, selectedFrameId: null, clips: [] }]);
      setHistoryIndex(0);
      
      // Update project info
      await loadCurrentProjectInfo();
      
      console.log('New project created');
    } catch (error) {
      console.error('Failed to create new project:', error);
      alert('Failed to create new project.');
    }
  };

  const handleStartRename = () => {
    setEditingProjectName(currentProjectInfo.projectName);
    setIsEditingProjectName(true);
  };

  const handleFinishRename = async () => {
    if (editingProjectName.trim() && editingProjectName.trim() !== currentProjectInfo.projectName) {
      try {
        await window.electronAPI.renameCurrentProject(editingProjectName.trim());
        await loadCurrentProjectInfo();
        markProjectModified();
      } catch (error) {
        console.error('Failed to rename project:', error);
        alert('Failed to rename project.');
      }
    }
    setIsEditingProjectName(false);
    setEditingProjectName('');
  };

  const handleCancelRename = () => {
    setIsEditingProjectName(false);
    setEditingProjectName('');
  };

  const handleShowExportSettings = () => {
    setShowExportSettings(true);
  };

  const handleSrtExport = async () => {
    if (!aiSubtitleData || aiSubtitleData.frames.length === 0) {
      alert('No subtitles available for export.');
      return;
    }

    try {
      // Use project name for SRT filename
      const projectName = currentProjectInfo.projectName || 'subtitles';
      const defaultFileName = `${projectName}.srt`;
      
      // Convert AI subtitle frames to caption format for SRT export
      const captionsForSrt = aiSubtitleData.frames.map((frame, index) => ({
        id: frame.id,
        startTime: frame.startTime * 1000, // Convert to milliseconds
        endTime: frame.endTime * 1000,
        text: frame.words.map(w => w.word).join(' '),
        words: frame.words.map(w => ({ 
          word: w.word, 
          start: w.start * 1000, 
          end: w.end * 1000 
        }))
      }));
      
      const result = await window.electronAPI.exportSrt(captionsForSrt, defaultFileName);
      if (result.success && !result.canceled) {
        setExportedSrtPath(result.filePath);
        setShowSrtSuccess(true);
      }
    } catch (error) {
      console.error('Failed to export SRT:', error);
      alert('Failed to export SRT file. Please try again.');
    }
  };

  const handleShowSrtInFinder = async () => {
    try {
      await window.electronAPI.showItemInFolder(exportedSrtPath);
    } catch (error) {
      console.error('Failed to show SRT in finder:', error);
    }
  };

  const handleExportVideoWithNewAudio = async () => {
    if (!videoFile || !replacementAudioPath) {
      alert('Video file and replacement audio are required for this export.');
      return;
    }

    try {
      setIsLoading(true);
      setLoadingMessage('Exporting video with new audio...');
      setLoadingProgress(0);

      // Create output path in same directory as video file
      const videoDir = videoFile.path.substring(0, videoFile.path.lastIndexOf('/'));
      const videoName = videoFile.name.replace(/\.[^/.]+$/, '');
      const outputPath = `${videoDir}/${videoName}_with_new_audio.mp4`;

      // Use the new FFmpeg service method
      await window.electronAPI.exportVideoWithNewAudio(
        videoFile.path,
        replacementAudioPath,
        outputPath
      );

      setIsLoading(false);
      setLoadingProgress(undefined);
      
      // Show success modal
      setExportedFilePath(outputPath);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Export with new audio failed:', error);
      setIsLoading(false);
      setLoadingProgress(undefined);
      if (error instanceof Error && error.message.includes('cancelled')) {
        console.log('Export cancelled by user');
      } else {
        alert(`Export failed: ${error}`);
      }
    }
  };

  const handleLoadProject = async (projectData: ProjectData) => {
    // Save current state to history before loading
    saveToHistory();

    setVideoFile(projectData.videoFile);
    
    // Clear state unconditionally first to prevent previous data from persisting
    setAiSubtitleData(null);
    setClips([]);
    setSelectedFrameId(null);
    
    // Load AI subtitles as the single source of truth
    if (projectData.aiSubtitleData) {
      setAiSubtitleData(projectData.aiSubtitleData);
    }
    
    // Load clips from project data
    if (projectData.clips) {
      setClips(projectData.clips);
    }
    
    // Load replacement audio path and verify file exists
    const replacementPath = projectData.replacementAudioPath;
    if (replacementPath) {
      // Check if the replacement audio file still exists
      try {
        const exists = await window.electronAPI.fileExists(replacementPath);
        if (exists) {
          setReplacementAudioPath(replacementPath);
        } else {
          console.warn('Replacement audio file not found:', replacementPath);
          setReplacementAudioPath(null);
        }
      } catch (error) {
        console.error('Error checking replacement audio file:', error);
        setReplacementAudioPath(null);
      }
    } else {
      setReplacementAudioPath(null);
    }
    setExtractedAudioPath(projectData.extractedAudioPath || null); // Restore extracted audio path for waveforms
    setCurrentTime(0);

    // Clear localStorage when loading a project
    try {
      localStorage.removeItem('tempClips');
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }

    // If no extracted audio exists but we have AI subtitles and a video file, 
    // extract audio for better waveform performance
    const hasSubtitles = (projectData.aiSubtitleData?.frames.length ?? 0) > 0;
    if (!projectData.extractedAudioPath && projectData.videoFile && hasSubtitles) {
      const currentProjectPath = await window.electronAPI.getCurrentProjectInfo();
      if (currentProjectPath.projectPath) {
        console.log('No extracted audio found for existing project, extracting audio for waveforms...');
        try {
          const extractedPath = await window.electronAPI.extractAudioForProject(
            projectData.videoFile.path, 
            currentProjectPath.projectPath
          );
          setExtractedAudioPath(extractedPath);
          
          // Auto-save the project with the new extracted audio path
          const updatedProjectData = { ...projectData, extractedAudioPath: extractedPath };
          await window.electronAPI.saveProject(updatedProjectData);
          console.log('Extracted audio for existing project:', extractedPath);
        } catch (error) {
          console.warn('Failed to extract audio for existing project:', error);
          // Don't fail the project loading for this
        }
      }
    }

    // Restore AI generated content
    if (projectData.description || projectData.aiGeneratedTitles || projectData.tweets || projectData.thumbnails) {
      const restoredContent: GeneratedContent = {};
      if (projectData.description) {
        restoredContent.description = projectData.description;
      }
      if (projectData.aiGeneratedTitles) {
        restoredContent.titles = projectData.aiGeneratedTitles.map(title => ({
          title,
          characterCount: title.length
        }));
      }
      if (projectData.tweets) {
        restoredContent.tweets = projectData.tweets;
      }
      if (projectData.thumbnails) {
        restoredContent.thumbnails = projectData.thumbnails;
      }
      setGeneratedContent(restoredContent);
    } else {
      setGeneratedContent(null);
    }

    // Update project info
    await loadCurrentProjectInfo();

    console.log('Project loaded successfully');
  };


  const handlePlayPause = () => {
    setIsPlaying(prev => !prev);
  };


  const handleAudioImport = async () => {
    if (!videoFile) {
      alert('Please load a video file first to replace its audio track.');
      return;
    }

    try {
      const audioPath = await window.electronAPI.selectAudioFile();
      if (audioPath) {
        setReplacementAudioPath(audioPath);
        console.log(`Audio replacement set: ${audioPath}`);
      }
    } catch (error) {
      console.error('Error selecting audio file:', error);
      alert('Failed to select audio file');
    }
  };

  const handleAudioExport = async () => {
    if (!videoFile) {
      alert('No video file loaded to extract audio from.');
      return;
    }

    try {
      setIsLoading(true);
      setLoadingMessage('Extracting audio...');
      
      const audioPath = await window.electronAPI.exportAudio(videoFile.path, `${videoFile.name.replace(/\.[^/.]+$/, "")}`);
      if (audioPath) {
        setExportedFilePath(audioPath);
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error exporting audio:', error);
      alert(`Failed to export audio: ${error}`);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  // Start/stop timer for export progress
  useEffect(() => {
    if (isLoading) {
      setElapsedTime(0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isLoading]);

  // Keep app visible; show LiquidModal overlay during processing instead of full-screen takeover

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      background: `
        linear-gradient(135deg, 
          rgba(255, 255, 255, 0.8) 0%, 
          rgba(249, 250, 251, 0.8) 50%, 
          rgba(243, 244, 246, 0.8) 100%
        )
      `,
      backdropFilter: 'blur(20px)',
      color: theme.colors.text,
      fontFamily: theme.typography.fontFamily,
      overflow: 'hidden'
    }}>
      
      {/* Draggable Header with Border */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '60px',
          WebkitAppRegion: 'drag',
          zIndex: 100,
          background: `linear-gradient(180deg, ${theme.colors.glass.background} 0%, ${theme.colors.background}E6 100%)`,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${theme.colors.border}`,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          display: 'grid',
          gridTemplateColumns: 'minmax(200px, auto) 1fr minmax(200px, auto)',
          alignItems: 'center',
          padding: `0 ${theme.spacing.lg}`,
          paddingLeft: '90px', // Extra space to avoid window controls
          gap: '1px',
        }}
        className="drag-region"
      >
        {/* Left Section - Project Actions */}
        <Card 
          variant="glass" 
          padding="sm" 
          style={{ 
            display: 'flex', 
            gap: '5px',
            WebkitAppRegion: 'no-drag',
            background: `linear-gradient(180deg, ${theme.colors.glass.background} 0%, ${theme.colors.background}E6 100%)`,
          }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowProjectManager(true)}
            title="Project Manager (Ctrl/Cmd+O)"
            style={{ padding: '2px 6px' }}
          >
            <ProjectManagerIcon size={14} />
            <span style={{ fontSize: '10px' }}>
              Projects
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewProject}
            title="New Project (Ctrl/Cmd+N)"
            style={{ padding: '2px 6px' }}
          >
            <NewProjectIcon size={14} />
            <span style={{ fontSize: '10px' }}>
              New
            </span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveProject}
            title="Save (Ctrl/Cmd+S) • Save As (Ctrl/Cmd+Shift+S)"
            style={{ padding: '2px 6px' }}
          >
            <SaveProjectIcon size={14} />
            <span style={{ fontSize: '10px' }}>
              Save
            </span>
          </Button>
        </Card>

        {/* Center Section - Project Name */}
        <div 
          style={{
            textAlign: 'center',
            WebkitAppRegion: 'no-drag',
            justifySelf: 'center',
          }}
        >
          {isEditingProjectName ? (
            <input
              type="text"
              value={editingProjectName}
              onChange={(e) => setEditingProjectName(e.target.value)}
              onBlur={handleFinishRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleFinishRename();
                } else if (e.key === 'Escape') {
                  handleCancelRename();
                }
              }}
              autoFocus
              style={{
                fontWeight: theme.typography.fontWeight.semibold,
                fontSize: theme.typography.fontSize.xs,
                backgroundColor: theme.colors.input.background,
                color: theme.colors.text,
                border: `1px solid ${theme.colors.input.borderFocus}`,
                borderRadius: theme.radius.md,
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                outline: 'none',
                minWidth: '200px',
                fontFamily: theme.typography.fontFamily,
                textAlign: 'center',
              }}
            />
          ) : (
            <div
              style={{ 
                cursor: 'pointer',
                transition: 'all 0.1s ease',
              }}
              onClick={handleStartRename}
              onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                const cardElement = e.currentTarget.firstElementChild as HTMLElement;
                if (cardElement) {
                  cardElement.style.backgroundColor = theme.colors.surfaceHover;
                }
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                const cardElement = e.currentTarget.firstElementChild as HTMLElement;
                if (cardElement) {
                  cardElement.style.backgroundColor = 'transparent';
                }
              }}
            >
              <Card 
                variant="glass" 
                padding="sm"
                style={{ 
                  transition: 'all 0.1s ease',
                  minWidth: '220px',
                  maxWidth: '350px',
                  background: `linear-gradient(180deg, ${theme.colors.glass.background} 0%, ${theme.colors.background}E6 100%)`,
                }}
              >
              <div style={{ 
                fontWeight: theme.typography.fontWeight.semibold,
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.text,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: theme.spacing.xs,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {currentProjectInfo.isModified && (
                  <span style={{ 
                    color: theme.colors.primary,
                    fontSize: theme.typography.fontSize.xs,
                    fontWeight: theme.typography.fontWeight.bold,
                    marginRight: '4px'
                  }}>
                    ●
                  </span>
                )}
                {currentProjectInfo.projectName.replace(/\.lvep$/, '')}
              </div>
              </Card>
            </div>
          )}
        </div>

        {/* Right Section - Action Buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          WebkitAppRegion: 'no-drag',
          justifySelf: 'end',
        }}>
          {/* Combined Action Group */}
          <Card variant="glass" padding="sm" style={{ display: 'flex', gap: '5px', background: `linear-gradient(180deg, ${theme.colors.glass.background} 0%, ${theme.colors.background}E6 100%)` }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAISettings(true)}
              title="AI Settings (Ctrl/Cmd+,)"
              style={{ padding: '2px 6px' }}
            >
              <SettingsIcon size={14} />
              <span style={{ fontSize: '10px' }}>
                AI Settings
              </span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => aiSubtitleData && aiSubtitleData.frames.length > 0 && setShowAIContent(true)}
              disabled={!aiSubtitleData || aiSubtitleData.frames.length === 0}
              title="Generate AI Content (Ctrl/Cmd+G)"
              style={{ padding: '2px 6px' }}
            >
              <SocialMediaIcon size={14} />
              <span style={{ fontSize: '10px' }}>
                AI Content
              </span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAudioImport}
              disabled={!videoFile}
              title="Replace Video Audio Track"
              style={{ padding: '2px 6px' }}
            >
              {replacementAudioPath ? <MusicWithCheckIcon size={14} /> : <AudioImportIcon size={14} />}
              <span style={{ fontSize: '10px' }}>
                {replacementAudioPath ? 'Audio Set' : 'Replace Audio'}
              </span>
            </Button>
            {replacementAudioPath && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setReplacementAudioPath(null)}
                title="Clear Audio Replacement"
                style={{ padding: '2px 6px' }}
              >
                <CloseIcon size={12} />
                <span style={{ fontSize: '10px' }}>
                  Clear
                </span>
              </Button>
            )}
            {aiSubtitleData && aiSubtitleData.frames.length > 0 && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSrtExport}
                title="Export SRT Subtitle File"
                style={{ padding: '2px 6px' }}
              >
                <ExportSrtIcon size={14} />
                <span style={{  fontSize: '10px' }}>
                  SRT
                </span>
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handleAudioExport}
              disabled={!videoFile}
              title="Export Audio from Video"
              style={{ padding: '2px 6px' }}
            >
              <MusicExportIcon size={14} />
              <span style={{ fontSize: '10px' }}>
                Audio
              </span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleShowExportSettings}
              disabled={!videoFile || (!aiSubtitleData || aiSubtitleData.frames.length === 0) && !replacementAudioPath}
              title={aiSubtitleData && aiSubtitleData.frames.length > 0 ? "Export Video with Subtitles" : "Export Video with Audio"}
              style={{ padding: '2px 6px' }}
            >
              <ExportVideoIcon size={14} />
              <span style={{  fontSize: '10px' }}>
                Video
              </span>
            </Button>
          </Card>
        </div>
      </div>

      {/* Main Content Area - Liquid Layout */}
      <div style={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        paddingTop: '70px', // Account for new header height (60px + 10px spacing)
        backgroundColor: theme.colors.background,
        overflow: 'hidden',
      }}>
        {/* Content Panel */}
        <div style={{ 
          flex: 1,
          display: 'flex',
          minHeight: 0,
          gap: videoFile ? theme.spacing.md : 0,
          padding: videoFile ? theme.spacing.md : theme.spacing.md,
        }}>
          {videoFile ? (
            <>
              {/* Left Panel - Video Preview with Timeline */}
              <Card 
                variant="default" 
                padding="none"
                style={{ 
                  flex: '1 1 60%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  minHeight: 0,
                  overflow: 'hidden',
                }}
              >
                <VideoPanel
                  videoFile={videoFile}
                  currentTime={currentTime}
                  onTimeUpdate={handleTimeUpdate}
                  onTimeSeek={handleTimeSeek}
                  onVideoSelect={handleVideoSelect}
                  onPlayPause={handlePlayPause}
                  isPlaying={isPlaying}
                  replacementAudioPath={replacementAudioPath}
                  isAudioPreviewEnabled={isAudioPreviewEnabled}
                  dependenciesReady={dependenciesReady}
                  isCheckingDependencies={isCheckingDependencies}
                  aiSubtitleData={aiSubtitleData}
                  selectedFrameId={selectedFrameId}
                  onFrameSelect={setSelectedFrameId}
                  onAISubtitleUpdate={handleAISubtitleUpdate}
                  clips={clips}
                />
                
                {/* Unified Timeline - Show when video is loaded */}
                {videoFile && !isLoading && (
                <UnifiedTimeline
                  currentTime={currentTime}
                  onTimeSeek={handleTimeSeek}
                  videoFile={videoFile}
                  onPlayPause={handlePlayPause}
                  isPlaying={isPlaying}
                  onUndo={undo}
                  onRedo={redo}
                  canUndo={historyIndex > 0}
                  canRedo={historyIndex < history.length - 1}
                  replacementAudioPath={replacementAudioPath}
                  onAudioPreviewToggle={setIsAudioPreviewEnabled}
                  isAudioPreviewEnabled={isAudioPreviewEnabled}
                  aiSubtitleData={aiSubtitleData}
                  onAISubtitleUpdate={setAiSubtitleData}
                  selectedFrameId={selectedFrameId}
                  onFrameSelect={setSelectedFrameId}
                  clips={clips}
                  onClipsChange={handleClipsChange}
                  zoomLevel={zoomLevel}
                  onZoomChange={setZoomLevel}
                  transcriptionStatus={transcriptionStatus}
                />
                )}
              </Card>

              {/* Right Panel - Tabbed Controls - Only show when video is loaded */}
              <Card 
                variant="default" 
                padding="none"
                style={{ 
                  flex: '1 1 40%', 
                  minWidth: '300px',
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                <TabbedRightPanel
                  onTimeSeek={handleTimeSeek}
                  transcriptionStatus={transcriptionStatus}
                  currentTime={currentTime}
                  aiSubtitleData={aiSubtitleData}
                  onAISubtitleUpdate={handleAISubtitleUpdate}
                  selectedFrameId={selectedFrameId}
                  onFrameSelect={setSelectedFrameId}
                  videoPath={videoFile?.path || null}
                  audioPath={replacementAudioPath || extractedAudioPath || null}
                  clips={clips}
                />
              </Card>
            </>
          ) : (
            /* Empty state - Full-width VideoPanel when no video is loaded */
            <div style={{ 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              padding: theme.spacing.lg,
            }}>
              <VideoPanel
                videoFile={videoFile}
                currentTime={currentTime}
                onTimeUpdate={handleTimeUpdate}
                onTimeSeek={handleTimeSeek}
                onVideoSelect={handleVideoSelect}
                onPlayPause={handlePlayPause}
                isPlaying={isPlaying}
                replacementAudioPath={replacementAudioPath}
                isAudioPreviewEnabled={isAudioPreviewEnabled}
                dependenciesReady={dependenciesReady}
                isCheckingDependencies={isCheckingDependencies}
                clips={clips}
              />
            </div>
          )}
        </div>
      </div>

      {/* Transcription Settings Dialog */}
      <TranscriptionSettings
        isOpen={showTranscriptionSettings}
        onClose={() => {
          setShowTranscriptionSettings(false);
          setPendingVideoPath(null);
          setPendingVideoDuration(undefined);
          setPendingVideoMetadata(null);
        }}
        onConfirm={handleTranscriptionSettingsConfirm}
        videoDuration={pendingVideoDuration || videoFile?.duration}
        videoMetadata={pendingVideoMetadata || (videoFile ? { width: videoFile.width, height: videoFile.height } : undefined)}
      />


      {/* Project Manager Dialog */}
      <ProjectManagerModal
        isOpen={showProjectManager}
        onClose={() => setShowProjectManager(false)}
        onLoadProject={handleLoadProject}
        onSaveProject={handleSaveProject}
        currentProject={getCurrentProjectData()}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        filePath={exportedFilePath}
        elapsedSeconds={elapsedTime}
        onShowInFinder={async () => {
          try {
            await window.electronAPI.showItemInFolder(exportedFilePath);
          } catch (error) {
            console.error('Failed to show in finder:', error);
          }
        }}
      />

      {/* AI Settings Modal */}
      <AISettingsModal
        isOpen={showAISettings}
        onClose={() => setShowAISettings(false)}
        onSave={(settings) => {
          setAISettings(settings);
          setShowAISettings(false);
        }}
      />

      {/* AI Content Generation Modal */}
      <AIContentModal
        isOpen={showAIContent}
        onClose={() => setShowAIContent(false)}
        aiSubtitleData={aiSubtitleData || null}
        onSave={(content) => {
          console.log('App.tsx - Received content from AIContentModal:', content);
          setGeneratedContent(content);
          setShowAIContent(false);
        }}
        initialContent={generatedContent || undefined}
      />

      {/* Dependency Installation Modal */}
      <DependencyInstallModal
        isOpen={showDependencyInstall}
        onClose={() => setShowDependencyInstall(false)}
        missingDependencies={missingDependencies}
        onInstallComplete={handleInstallationComplete}
      />
      {/* Export Settings Modal */}
      <ExportSettingsModal
        isOpen={showExportSettings}
        onClose={() => setShowExportSettings(false)}
        onConfirm={(settings) => {
          setShowExportSettings(false);
          handleExport(settings);
        }}
        replacementAudioPath={replacementAudioPath}
        aiSubtitleData={aiSubtitleData || undefined}
        clips={clips}
      />

      {/* Export Processing Modal (Liquid) */}
      <ExportProcessingModal
        isOpen={isLoading}
        message={loadingMessage}
        progress={loadingProgress}
        elapsedTime={elapsedTime}
        onCancel={cancelController ? handleCancel : undefined}
      />

      {/* Video Loading Modal */}
      <ExportProcessingModal
        isOpen={showVideoLoadingModal}
        message={videoLoadingMessage}
        progress={undefined}
        elapsedTime={undefined}
        onCancel={undefined}
      />

      {/* SRT Export Success Modal */}
      {showSrtSuccess && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme.colors.modal.overlay,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}>
          <Card 
            variant="glass" 
            padding="lg"
            style={{
              width: '400px',
              maxWidth: '90vw',
              textAlign: 'center',
            }}
          >
            <div style={{ 
              marginBottom: theme.spacing.lg,
              color: theme.colors.success,
            }}>
              <ExportSrtIcon size={48} />
            </div>
            <h3 style={{ 
              margin: `0 0 ${theme.spacing.md} 0`, 
              fontSize: theme.typography.fontSize.xl, 
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.text,
            }}>
              SRT Export Successful!
            </h3>
            <p style={{ 
              margin: `0 0 ${theme.spacing.lg} 0`, 
              fontSize: theme.typography.fontSize.sm, 
              color: theme.colors.textSecondary,
              lineHeight: theme.typography.lineHeight.relaxed,
            }}>
              Your subtitle file has been saved successfully.
            </p>
            <Card
              variant="elevated"
              padding="sm"
              style={{
                marginBottom: theme.spacing.lg,
                fontSize: theme.typography.fontSize.xs,
                wordBreak: 'break-all',
                color: theme.colors.textMuted,
                backgroundColor: theme.colors.backgroundSecondary,
              }}
            >
              {exportedSrtPath || ''}
            </Card>
            <div style={{ 
              display: 'flex', 
              gap: theme.spacing.sm, 
              justifyContent: 'center' 
            }}>
              <Button
                onClick={() => setShowSrtSuccess(false)}
                variant="secondary"
                size="md"
              >
                Close
              </Button>
              <Button
                onClick={handleShowSrtInFinder}
                variant="primary"
                size="md"
              >
                Show in Finder
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Update Modal */}
      <UpdateModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        updateInfo={updateInfo || undefined}
        type={updateModalType}
      />

      {/* Update Notification */}
      <UpdateNotification
        onShowModal={handleShowUpdateModal}
      />

    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;