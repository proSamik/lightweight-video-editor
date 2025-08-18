import React, { useState, useEffect } from 'react';
import { VideoFile, CaptionSegment,ColorOption, ExportSettings, ProjectData, AISettings, GeneratedContent } from '../types';
import VideoPanel from './components/VideoPanel';
import UnifiedTimeline from './components/UnifiedTimeline';
import TabbedRightPanel from './components/TabbedRightPanel';
import TranscriptionSettings from './components/TranscriptionSettings';
import ProjectManagerModal from './components/ProjectManager';
import SuccessModal from './components/SuccessModal';
import LoadingScreen from './components/LoadingScreen';
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
  captions: CaptionSegment[];
  selectedSegmentId: string | null;
}

const AppContent: React.FC = () => {
  const { theme } = useTheme();
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [replacementAudioPath, setReplacementAudioPath] = useState<string | null>(null);
  const [isAudioPreviewEnabled, setIsAudioPreviewEnabled] = useState(true);
  const [extractedAudioPath, setExtractedAudioPath] = useState<string | null>(null);
  const [captions, setCaptions] = useState<CaptionSegment[]>([]);
  const [originalCaptions, setOriginalCaptions] = useState<CaptionSegment[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
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
  const [pendingTranscriptionSettings, setPendingTranscriptionSettings] = useState<{ maxCharsPerLine: number; maxWordsPerLine: number } | null>(null);
  const [showAISettings, setShowAISettings] = useState(false);
  const [showAIContent, setShowAIContent] = useState(false);
  const [aiSettings, setAISettings] = useState<AISettings | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [showExportSettings, setShowExportSettings] = useState(false);
  const [showSrtSuccess, setShowSrtSuccess] = useState(false);
  const [showDependencyInstall, setShowDependencyInstall] = useState(false);
  const [missingDependencies, setMissingDependencies] = useState({ ffmpeg: false, whisper: false });

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
      console.warn('Error cancelling rendering:', error);
    }
    setIsLoading(false);
    setLoadingProgress(undefined);
    setLoadingMessage('');
  };

  // Initialize history and load project info
  useEffect(() => {
    if (historyIndex === -1) {
      setHistory([{ captions: [], selectedSegmentId: null }]);
      setHistoryIndex(0);
    }
    loadCurrentProjectInfo();
  }, [historyIndex]);

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
    const currentState = { captions, selectedSegmentId };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(currentState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

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
      setCaptions(state.captions);
      setSelectedSegmentId(state.selectedSegmentId);
      setHistoryIndex(newIndex);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const state = history[newIndex];
      setCaptions(state.captions);
      setSelectedSegmentId(state.selectedSegmentId);
      setHistoryIndex(newIndex);
    }
  };

  // Auto-select segment based on current time
  useEffect(() => {
    if (captions.length > 0) {
      const currentSegment = captions.find(
        caption => currentTime >= caption.startTime && currentTime <= caption.endTime
      );
      
      // Only auto-select if no segment is currently selected or if we're in a different segment
      if (currentSegment && currentSegment.id !== selectedSegmentId) {
        setSelectedSegmentId(currentSegment.id);
      }
    }
  }, [currentTime, captions, selectedSegmentId]);


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
        if (captions.length > 0) {
          setShowAIContent(true);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history, videoFile, captions]);

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
    if (!(await checkDependencies())) return;
    
    try {
      const filePath = await window.electronAPI.selectVideoFile();
      if (filePath) {
        // Load video metadata to get duration for time estimation
        const metadata = await window.electronAPI.getVideoMetadata(filePath);
        setPendingVideoDuration(metadata?.duration);
        setShowTranscriptionSettings(true);
        setPendingVideoPath(filePath);
      }
    } catch (error) {
      console.error('Error selecting video file:', error);
    }
  };

  const handleVideoDropped = async (filePath: string) => {
    console.log('handleVideoDropped called with:', filePath);
    if (!(await checkDependencies())) return;
    
    console.log('Dependencies checked, opening transcription settings');
    // Load video metadata to get duration for time estimation
    try {
      const metadata = await window.electronAPI.getVideoMetadata(filePath);
      setPendingVideoDuration(metadata?.duration);
    } catch (error) {
      console.error('Error loading video metadata:', error);
      setPendingVideoDuration(undefined);
    }
    setShowTranscriptionSettings(true);
    setPendingVideoPath(filePath);
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
      
      // Convert transcription to caption segments with optional line wrapping
      // Get video metadata to determine aspect ratio for responsive font sizing
      const videoMetadata = await window.electronAPI.getVideoMetadata(videoPath);
      const isVertical = videoMetadata && videoMetadata.width && videoMetadata.height && 
                        (videoMetadata.height / videoMetadata.width) > 1.5; // 9:16 or more vertical
      
      // Use smaller font size for vertical videos (9:16)
      const defaultFontSize = isVertical ? 20 : 85;
      
      console.log('Video metadata for font sizing:', {
        width: videoMetadata?.width,
        height: videoMetadata?.height,
        aspectRatio: videoMetadata?.width && videoMetadata?.height ? videoMetadata.width / videoMetadata.height : 'unknown',
        isVertical,
        defaultFontSize
      });
      
      let captionSegments: CaptionSegment[] = transcriptionResult.segments.map((segment: any, index: number) => ({
        id: `segment-${index}`,
        startTime: segment.start, // Already in milliseconds from Whisper service
        endTime: segment.end, // Already in milliseconds from Whisper service
        text: segment.text,
        words: segment.words ? segment.words.map((word: any) => ({
          word: word.word,
          start: word.start, // Already in milliseconds from Whisper service
          end: word.end // Already in milliseconds from Whisper service
        })) : [],
        style: {
          font: 'Segoe UI',
          fontSize: defaultFontSize,
          textColor: ColorOption.WHITE,
          highlighterColor: ColorOption.YELLOW,
          backgroundColor: ColorOption.TRANSPARENT,
          strokeColor: ColorOption.BLACK,
          strokeWidth: 2,
          textTransform: 'none',
          position: { x: 50, y: 80, z: 0 },
          renderMode: 'horizontal',
          textAlign: 'center',
          scale: 1,
          emphasizeMode: true,
          burnInSubtitles: true
        }
      }));

      setTranscriptionStatus(prev => ({ ...prev, message: 'Applying line wrapping...' }));
      
      // Apply line wrapping if settings provided
      if (settings) {
        captionSegments = applyLineWrapping(captionSegments, settings);
      }
      
      setTranscriptionStatus(prev => ({ ...prev, message: 'Finalizing captions...' }));
      
      setCaptions(captionSegments);
      setOriginalCaptions([...captionSegments]); // Save original captions for comparison
      
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

  const applyLineWrapping = (segments: CaptionSegment[], settings: { maxCharsPerLine: number; maxWordsPerLine: number }): CaptionSegment[] => {
    const wrappedSegments: CaptionSegment[] = [];
    
    segments.forEach((segment) => {
      const words = segment.words || segment.text.split(' ').map((word, i) => ({
        word,
        start: segment.startTime + (i * (segment.endTime - segment.startTime) / segment.text.split(' ').length),
        end: segment.startTime + ((i + 1) * (segment.endTime - segment.startTime) / segment.text.split(' ').length)
      }));
      
      let currentSegmentWords: any[] = [];
      let currentText = '';
      let currentWordCount = 0;
      let segmentCounter = 0;
      
      words.forEach((word) => {
        const testText = currentText + (currentText ? ' ' : '') + word.word;
        
        // Check if adding this word would exceed limits
        if (testText.length <= settings.maxCharsPerLine && currentWordCount < settings.maxWordsPerLine) {
          currentText = testText;
          currentSegmentWords.push(word);
          currentWordCount++;
        } else {
          // Create new segment with current words if we have any
          if (currentSegmentWords.length > 0) {
            const segmentStart = currentSegmentWords[0].start;
            const segmentEnd = currentSegmentWords[currentSegmentWords.length - 1].end;
            
            wrappedSegments.push({
              ...segment,
              id: `${segment.id}-${segmentCounter}`,
              startTime: segmentStart,
              endTime: segmentEnd,
              text: currentText.trim(),
              words: currentSegmentWords
            });
            
            segmentCounter++;
          }
          
          // Start new segment with current word
          currentText = word.word;
          currentSegmentWords = [word];
          currentWordCount = 1;
        }
      });
      
      // Add remaining words as final segment
      if (currentSegmentWords.length > 0) {
        const segmentStart = currentSegmentWords[0].start;
        const segmentEnd = currentSegmentWords[currentSegmentWords.length - 1].end;
        
        wrappedSegments.push({
          ...segment,
          id: `${segment.id}-${segmentCounter}`,
          startTime: segmentStart,
          endTime: segmentEnd,
          text: currentText.trim(),
          words: currentSegmentWords
        });
      }
    });
    
    return wrappedSegments;
  };

  const handleTranscriptionSettingsConfirm = async (settings: { maxCharsPerLine: number; maxWordsPerLine: number; whisperModel: string }) => {
    if (pendingVideoPath) {
      try {
        // Start background processing without blocking UI
        setTranscriptionStatus({ isTranscribing: true, progress: 0, message: 'Loading video metadata...' });
        
        // Get video metadata
        const videoMetadata = await window.electronAPI.getVideoMetadata(pendingVideoPath);
        setVideoFile(videoMetadata);
        
        // Close transcription settings dialog
        setShowTranscriptionSettings(false);
        
        // Generate captions in background (UI remains responsive)
        await generateCaptions(pendingVideoPath, settings);
        setPendingVideoPath(null);
        setPendingTranscriptionSettings(null);
      } catch (error) {
        console.error('Error in transcription setup:', error);
        setTranscriptionStatus({ isTranscribing: false, progress: 0, message: 'Failed to load video' });
        setShowTranscriptionSettings(false);
        setPendingVideoPath(null);
      }
    }
  };


  // Function to detect actual word deletions (not just edits)
  const hasActualWordDeletions = (original: CaptionSegment[], current: CaptionSegment[]): boolean => {
    // Create maps of word count by segment
    const originalWordCounts = new Map();
    const currentWordCounts = new Map();
    
    original.forEach(segment => {
      if (segment.words) {
        originalWordCounts.set(segment.id, segment.words.length);
      }
    });
    
    current.forEach(segment => {
      if (segment.words) {
        // Count only non-empty words
        const nonEmptyWords = segment.words.filter(w => w.word.trim() !== '');
        currentWordCounts.set(segment.id, nonEmptyWords.length);
      }
    });
    
    // Check if any segment has fewer words (indicating deletions)
    for (const [segmentId, originalCount] of originalWordCounts) {
      const currentCount = currentWordCounts.get(segmentId) || 0;
      if (currentCount < originalCount) {
        return true; // Found actual word deletions
      }
    }
    
    return false; // No actual deletions, just edits
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
        default:
          defaultFileName = `${videoFile.name.replace(/\.[^/.]+$/, "")}_complete.mp4`;
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
          await window.electronAPI.exportVideoWithNewAudio(
            videoFile.path,
            replacementAudioPath,
            outputPath
          );
          break;

        case 'subtitlesOnly':
          // Export video with original audio and subtitles
          if (captions.length === 0) {
            alert('No captions available for subtitle export.');
            setIsLoading(false);
            setLoadingProgress(undefined);
            return;
          }
          setLoadingMessage('Rendering video with subtitles...');
          setLoadingProgress(0);
          
          const hasWordDeletions = hasActualWordDeletions(originalCaptions, captions);
          
          if (hasWordDeletions) {
            setLoadingMessage('Applying word deletions to video...');
            const tempVideoPath = outputPath.replace('.mp4', '_temp.mp4');
            await window.electronAPI.applyWordDeletions(
              videoFile.path,
              originalCaptions,
              captions,
              tempVideoPath
            );
            
            setLoadingMessage('Rendering video with subtitles...');
            setLoadingProgress(0);
            await window.electronAPI.renderVideoWithCaptions(
              tempVideoPath,
              captions,
              outputPath,
              exportSettings
              // Note: No replacement audio for subtitles-only mode
            );
          } else {
            await window.electronAPI.renderVideoWithCaptions(
              videoFile.path,
              captions,
              outputPath,
              exportSettings
              // Note: No replacement audio for subtitles-only mode
            );
          }
          break;

        default: // 'complete'
          // Export complete video (with subtitles and audio replacement if available)
          if (captions.length === 0) {
            alert('No captions available for export.');
            setIsLoading(false);
            setLoadingProgress(undefined);
            return;
          }
          
          const hasWordDeletionsComplete = hasActualWordDeletions(originalCaptions, captions);
          
          if (hasWordDeletionsComplete) {
            setLoadingMessage('Applying word deletions to video...');
            const tempVideoPath = outputPath.replace('.mp4', '_temp.mp4');
            await window.electronAPI.applyWordDeletions(
              videoFile.path,
              originalCaptions,
              captions,
              tempVideoPath
            );
            
            setLoadingMessage('Rendering complete video...');
            setLoadingProgress(0);
            await window.electronAPI.renderVideoWithCaptions(
              tempVideoPath,
              captions,
              outputPath,
              exportSettings,
              replacementAudioPath || undefined
            );
          } else {
            setLoadingMessage('Rendering complete video...');
            setLoadingProgress(0);
            await window.electronAPI.renderVideoWithCaptions(
              videoFile.path,
              captions,
              outputPath,
              exportSettings,
              replacementAudioPath || undefined
            );
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
      captions,
      timeline: [], // Empty for now, could be used for timeline selections
      replacementAudioPath,
      extractedAudioPath, // Include the extracted audio path for waveforms
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
    if (!videoFile && captions.length === 0) {
      alert('No project data to save. Load a video and create captions first.');
      return;
    }

    try {
      const projectData = getCurrentProjectData();
      const savedPath = await window.electronAPI.saveProject(projectData);
      console.log(`Project saved: ${savedPath}`);
      
      // Update project info
      await loadCurrentProjectInfo();
      
      // Could show a success message or notification here
    } catch (error) {
      console.error('Failed to save project:', error);
      alert('Failed to save project.');
    }
  };

  const handleSaveProjectAs = async () => {
    if (!videoFile && captions.length === 0) {
      alert('No project data to save. Load a video and create captions first.');
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
      setCaptions([]);
      setOriginalCaptions([]);
      setSelectedSegmentId(null);
      setCurrentTime(0);
      setGeneratedContent(null);
      
      // Reset history
      setHistory([{ captions: [], selectedSegmentId: null }]);
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
    if (!captions || captions.length === 0) {
      alert('No captions available for export.');
      return;
    }

    try {
      // Use project name for SRT filename
      const projectName = currentProjectInfo.projectName || 'subtitles';
      const defaultFileName = `${projectName}.srt`;
      
      const result = await window.electronAPI.exportSrt(captions, defaultFileName);
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
    setCaptions(projectData.captions);
    setOriginalCaptions([...projectData.captions]);
    setReplacementAudioPath(projectData.replacementAudioPath || null);
    setExtractedAudioPath(projectData.extractedAudioPath || null); // Restore extracted audio path for waveforms
    setSelectedSegmentId(null);
    setCurrentTime(0);

    // If no extracted audio exists but we have captions and a video file, 
    // extract audio for better waveform performance
    if (!projectData.extractedAudioPath && projectData.videoFile && projectData.captions.length > 0) {
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

  const handleCaptionUpdate = (segmentId: string, updates: Partial<CaptionSegment>) => {
    // Save current state to history before making changes
    saveToHistory();
    
    setCaptions(prev => 
      prev.map(segment => 
        segment.id === segmentId 
          ? { ...segment, ...updates }
          : segment
      )
    );
    
    // Mark project as modified
    markProjectModified();
  };

  const handleCaptionDelete = (segmentId: string) => {
    // Save current state to history before making changes
    saveToHistory();
    
    setCaptions(prev => prev.filter(segment => segment.id !== segmentId));
    
    // Clear selection if the deleted segment was selected
    if (selectedSegmentId === segmentId) {
      setSelectedSegmentId(null);
    }
    
    // Mark project as modified
    markProjectModified();
  };

  const handleApplyToAll = (styleUpdates: Partial<CaptionSegment['style']>) => {
    // Save current state to history before making changes
    saveToHistory();
    
    setCaptions(prev => 
      prev.map(segment => ({
        ...segment,
        style: { ...segment.style, ...styleUpdates }
      }))
    );
    
    // Mark project as modified
    markProjectModified();
  };

  const handlePlayPause = () => {
    if ((window as any).videoPlayPause) {
      (window as any).videoPlayPause();
    }
    // Note: isPlaying state will be updated by the video's play/pause events
  };

  // Setup video play state listener
  useEffect(() => {
    (window as any).setVideoPlaying = setIsPlaying;
    
    return () => {
      delete (window as any).setVideoPlaying;
    };
  }, []);

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

  const handleSplitSegment = (segmentId: string, splitTime: number) => {
    // Save current state to history
    saveToHistory();
    
    const segmentToSplit = captions.find(c => c.id === segmentId);
    if (!segmentToSplit) return;
    
    // Split words based on timing
    const firstWords = segmentToSplit.words ? segmentToSplit.words.filter(w => w.end <= splitTime) : [];
    const secondWords = segmentToSplit.words ? segmentToSplit.words.filter(w => w.start >= splitTime) : [];
    
    // Split text based on words
    const firstText = firstWords.length > 0 
      ? firstWords.map(w => w.word).join(' ').trim()
      : segmentToSplit.text.split(' ').slice(0, Math.ceil(segmentToSplit.text.split(' ').length / 2)).join(' ');
    
    const secondText = secondWords.length > 0
      ? secondWords.map(w => w.word).join(' ').trim()
      : segmentToSplit.text.split(' ').slice(Math.ceil(segmentToSplit.text.split(' ').length / 2)).join(' ');
    
    // Create two new segments
    const firstSegment: CaptionSegment = {
      ...segmentToSplit,
      id: `${segmentId}-split-1`,
      endTime: splitTime,
      text: firstText,
      words: firstWords
    };
    
    const secondSegment: CaptionSegment = {
      ...segmentToSplit,
      id: `${segmentId}-split-2`,
      startTime: splitTime,
      text: secondText,
      words: secondWords
    };
    
    // Update captions array
    setCaptions(prev => {
      const newCaptions = prev.filter(c => c.id !== segmentId);
      newCaptions.push(firstSegment, secondSegment);
      return newCaptions.sort((a, b) => a.startTime - b.startTime);
    });
    
    // Select the first segment
    setSelectedSegmentId(firstSegment.id);
    markProjectModified();
  };

  const handleReTranscribeSegment = async (startTime: number, endTime: number) => {
    if (!videoFile) {
      alert('No video file loaded.');
      return;
    }

    if (!(await checkDependencies())) return;

    try {
      setTranscriptionStatus({ isTranscribing: true, progress: 0, message: 'Re-transcribing selected segment...' });
      
      // Convert to seconds for the timeline selection
      const timelineSelections = [{
        startTime: startTime / 1000, // Convert from ms to seconds
        endTime: endTime / 1000,
        label: `Re-transcribe ${Math.round(startTime/1000)}s - ${Math.round(endTime/1000)}s`
      }];
      
      // Extract audio first
      const audioPath = await window.electronAPI.extractAudio(videoFile.path);
      
      // Transcribe the selected segment
      const transcriptionResult = await window.electronAPI.transcribeAudioSegments(audioPath, timelineSelections, 'base');
      
      if (transcriptionResult && transcriptionResult.length > 0) {
        // Save current state to history
        saveToHistory();
        
        // Remove existing captions in the selected time range
        const filteredCaptions = captions.filter(caption => 
          caption.endTime < startTime || caption.startTime > endTime
        );
        
        // Create new caption segments from transcription
        const newSegments: CaptionSegment[] = transcriptionResult[0].segments.map((segment: any, index: number) => ({
          id: `retranscribe-${Date.now()}-${index}`,
          startTime: segment.start, // Already in milliseconds from Whisper service
          endTime: segment.end, // Already in milliseconds from Whisper service
          text: segment.text,
          words: segment.words ? segment.words.map((word: any) => ({
            word: word.word,
            start: word.start, // Already in milliseconds from Whisper service
            end: word.end // Already in milliseconds from Whisper service
          })) : [],
          style: {
            font: 'Segoe UI',
            fontSize: 85,
            textColor: ColorOption.WHITE,
            highlighterColor: ColorOption.YELLOW,
            backgroundColor: ColorOption.TRANSPARENT,
            strokeColor: ColorOption.BLACK,
            strokeWidth: 2,
            textTransform: 'none',
            position: { x: 50, y: 80, z: 0 },
            renderMode: 'horizontal',
            textAlign: 'center',
            scale: 1,
            emphasizeMode: true,
            burnInSubtitles: true
          }
        }));
        
        // Combine and sort all captions by start time
        const updatedCaptions = [...filteredCaptions, ...newSegments]
          .sort((a, b) => a.startTime - b.startTime);
        
        setCaptions(updatedCaptions);
        markProjectModified();
        
        setTranscriptionStatus({ isTranscribing: false, progress: 100, message: 'Re-transcription completed' });
        console.log(`Re-transcribed segment from ${Math.round(startTime/1000)}s to ${Math.round(endTime/1000)}s`);
      }
    } catch (error) {
      console.error('Re-transcription error:', error);
      setTranscriptionStatus({ isTranscribing: false, progress: 0, message: 'Re-transcription failed' });
      alert(`Re-transcription failed: ${error}`);
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
                {currentProjectInfo.projectName.replace(/\.lvep$/, '')}
                {currentProjectInfo.isModified && (
                  <span style={{ 
                    color: theme.colors.primary,
                    fontSize: theme.typography.fontSize.xs,
                    fontWeight: theme.typography.fontWeight.bold 
                  }}>
                    ●
                  </span>
                )}
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
              onClick={() => captions.length > 0 && setShowAIContent(true)}
              disabled={captions.length === 0}
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
            {captions && captions.length > 0 && (
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
              disabled={!videoFile || (!captions || captions.length === 0) && !replacementAudioPath}
              title={captions && captions.length > 0 ? "Export Video with Captions" : "Export Video with Audio"}
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
                  flex: '1 1 70%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  minHeight: 0,
                  overflow: 'hidden',
                }}
              >
                <VideoPanel
                  videoFile={videoFile}
                  captions={captions}
                  currentTime={currentTime}
                  onTimeUpdate={setCurrentTime}
                  onTimeSeek={setCurrentTime}
                  onVideoSelect={handleVideoSelect}
                  onVideoDropped={handleVideoDropped}
                  selectedSegmentId={selectedSegmentId}
                  onCaptionUpdate={handleCaptionUpdate}
                  onPlayPause={handlePlayPause}
                  isPlaying={isPlaying}
                  onSegmentSelect={setSelectedSegmentId}
                  replacementAudioPath={replacementAudioPath}
                  isAudioPreviewEnabled={isAudioPreviewEnabled}
                />
                
                {/* Unified Timeline - Only show when video is loaded */}
                <UnifiedTimeline
                  captions={captions}
                  currentTime={currentTime}
                  selectedSegmentId={selectedSegmentId}
                  onSegmentSelect={setSelectedSegmentId}
                  onTimeSeek={setCurrentTime}
                  onSegmentDelete={handleCaptionDelete}
                  onCaptionUpdate={handleCaptionUpdate}
                  videoFile={videoFile}
                  onReTranscribeSegment={handleReTranscribeSegment}
                  onPlayPause={handlePlayPause}
                  isPlaying={isPlaying}
                  onUndo={undo}
                  onRedo={redo}
                  canUndo={historyIndex > 0}
                  canRedo={historyIndex < history.length - 1}
                  replacementAudioPath={replacementAudioPath}
                  onAudioPreviewToggle={setIsAudioPreviewEnabled}
                />
              </Card>

              {/* Right Panel - Tabbed Controls - Only show when video is loaded */}
              <Card 
                variant="default" 
                padding="none"
                style={{ 
                  flex: '1 1 30%', 
                  minWidth: '300px',
                  maxWidth: '400px',
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                <TabbedRightPanel
                  selectedSegment={captions.find(c => c.id === selectedSegmentId) || null}
                  onSegmentUpdate={handleCaptionUpdate}
                  captions={captions}
                  onApplyToAll={handleApplyToAll}
                  onTimeSeek={setCurrentTime}
                  transcriptionStatus={transcriptionStatus}
                  selectedSegmentId={selectedSegmentId}
                  onSegmentSelect={setSelectedSegmentId}
                  onSegmentDelete={handleCaptionDelete}
                  currentTime={currentTime}
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
                captions={captions}
                currentTime={currentTime}
                onTimeUpdate={setCurrentTime}
                onTimeSeek={setCurrentTime}
                onVideoSelect={handleVideoSelect}
                onVideoDropped={handleVideoDropped}
                selectedSegmentId={selectedSegmentId}
                onCaptionUpdate={handleCaptionUpdate}
                onPlayPause={handlePlayPause}
                isPlaying={isPlaying}
                onSegmentSelect={setSelectedSegmentId}
                replacementAudioPath={replacementAudioPath}
                isAudioPreviewEnabled={isAudioPreviewEnabled}
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
        }}
        onConfirm={handleTranscriptionSettingsConfirm}
        videoDuration={pendingVideoDuration || videoFile?.duration}
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
        captions={captions}
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
        captions={captions}
      />

      {/* Export Processing Modal (Liquid) */}
      <ExportProcessingModal
        isOpen={isLoading}
        message={loadingMessage}
        progress={loadingProgress}
        elapsedTime={elapsedTime}
        onCancel={cancelController ? handleCancel : undefined}
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
              {exportedSrtPath}
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
        updateInfo={updateInfo}
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