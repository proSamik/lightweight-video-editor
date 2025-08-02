import React, { useState, useEffect } from 'react';
import { VideoFile, CaptionSegment, FontOption, ColorOption, ExportSettings, ProjectData, AISettings, GeneratedContent } from '../types';
import VideoPanel from './components/VideoPanel';
import TimelinePanel from './components/TimelinePanel';
import UnifiedTimeline from './components/UnifiedTimeline';
import StylingPanel from './components/StylingPanel';
import TabbedRightPanel from './components/TabbedRightPanel';
import TranscriptionSettings from './components/TranscriptionSettings';
import ProjectManagerModal from './components/ProjectManager';
import SuccessModal from './components/SuccessModal';
import LoadingScreen from './components/LoadingScreen';
import AISettingsModal from './components/AISettingsModal';
import AIContentModal from './components/AIContentModal';

interface AppState {
  captions: CaptionSegment[];
  selectedSegmentId: string | null;
}

const App: React.FC = () => {
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [replacementAudioPath, setReplacementAudioPath] = useState<string | null>(null);
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
  const [pendingTranscriptionSettings, setPendingTranscriptionSettings] = useState<{ maxCharsPerLine: number; maxWordsPerLine: number } | null>(null);
  const [showAISettings, setShowAISettings] = useState(false);
  const [showAIContent, setShowAIContent] = useState(false);
  const [aiSettings, setAISettings] = useState<AISettings | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [currentProjectInfo, setCurrentProjectInfo] = useState<{
    projectPath: string | null;
    projectName: string;
    isModified: boolean;
  }>({ projectPath: null, projectName: 'Untitled Project', isModified: false });
  const [transcriptionStatus, setTranscriptionStatus] = useState<{
    isTranscribing: boolean;
    progress: number;
    message: string;
  }>({ isTranscribing: false, progress: 0, message: '' });

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
    const handleTranscriptionProgress = (progress: number) => {
      setLoadingProgress(progress);
      // Also update transcription status if actively transcribing
      setTranscriptionStatus(prev => 
        prev.isTranscribing ? { ...prev, progress } : prev
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
        alert('FFmpeg and OpenAI Whisper are required. Please install them first.');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error checking dependencies:', error);
      return false;
    }
  };

  const handleVideoSelect = async () => {
    if (!(await checkDependencies())) return;
    
    try {
      const filePath = await window.electronAPI.selectVideoFile();
      if (filePath) {
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
    setShowTranscriptionSettings(true);
    setPendingVideoPath(filePath);
  };


  const generateCaptions = async (
    videoPath: string, 
    settings?: { maxCharsPerLine: number; maxWordsPerLine: number }
  ) => {
    try {
      // Start background transcription without blocking UI
      setTranscriptionStatus({ isTranscribing: true, progress: 0, message: 'Extracting audio...' });
      
      const audioPath = await window.electronAPI.extractAudio(videoPath);
      
      setTranscriptionStatus({ isTranscribing: true, progress: 20, message: 'Transcribing audio (this may take a few minutes)...' });
      
      // Transcribe entire audio
      const transcriptionResult = await window.electronAPI.transcribeAudio(audioPath);
      
      setTranscriptionStatus({ isTranscribing: true, progress: 80, message: 'Processing transcription results...' });
      
      // Convert transcription to caption segments with optional line wrapping
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
          font: FontOption.SF_PRO_DISPLAY_SEMIBOLD,
          fontSize: 85,
          textColor: ColorOption.WHITE,
          highlighterColor: ColorOption.YELLOW,
          backgroundColor: ColorOption.TRANSPARENT,
          strokeColor: ColorOption.BLACK,
          strokeWidth: 2,
          textTransform: 'none',
          position: { x: 50, y: 80, z: 0 },
          renderMode: 'horizontal',
          scale: 1,
          emphasizeMode: true,
          burnInSubtitles: true
        }
      }));

      setTranscriptionStatus({ isTranscribing: true, progress: 90, message: 'Applying line wrapping...' });
      
      // Apply line wrapping if settings provided
      if (settings) {
        captionSegments = applyLineWrapping(captionSegments, settings);
      }
      
      setTranscriptionStatus({ isTranscribing: true, progress: 95, message: 'Finalizing captions...' });
      
      setCaptions(captionSegments);
      setOriginalCaptions([...captionSegments]); // Save original captions for comparison
      
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

  const handleTranscriptionSettingsConfirm = async (settings: { maxCharsPerLine: number; maxWordsPerLine: number }) => {
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
    if (!videoFile || captions.length === 0) return;

    try {
      setIsLoading(true);
      setLoadingProgress(0); // Reset progress
      setLoadingMessage('Choosing export location...');

      const outputPath = await window.electronAPI.exportVideo(
        `${videoFile.name.replace(/\.[^/.]+$/, "")}_with_captions.mp4`
      );

      if (!outputPath) {
        setIsLoading(false);
        setLoadingProgress(undefined); // Clear progress
        return;
      }

      // Check if any words were actually deleted (not just edited)
      const hasWordDeletions = hasActualWordDeletions(originalCaptions, captions);
      
      if (hasWordDeletions) {
        setLoadingMessage('Applying word deletions to video (this may take several minutes)...');
        
        // First, create a video with word deletions applied
        const tempVideoPath = outputPath.replace('.mp4', '_temp.mp4');
        await window.electronAPI.applyWordDeletions(
          videoFile.path,
          originalCaptions,
          captions,
          tempVideoPath
        );
        
        setLoadingMessage('Rendering video with captions (this may take several minutes)...');
        setLoadingProgress(0); // Reset for rendering
        await window.electronAPI.renderVideoWithCaptions(
          tempVideoPath,
          captions,
          outputPath,
          exportSettings,
          replacementAudioPath || undefined
        );
        
        // Clean up temp file (note: this would need to be handled by the main process)
      } else {
        setLoadingMessage('Rendering video with captions (this may take several minutes)...');
        setLoadingProgress(0); // Reset for rendering
        await window.electronAPI.renderVideoWithCaptions(
          videoFile.path,
          captions,
          outputPath,
          exportSettings,
          replacementAudioPath || undefined
        );
      }

      setIsLoading(false);
      setLoadingProgress(undefined); // Clear progress
      
      // Show success modal
      setExportedFilePath(outputPath);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Export error:', error);
      setIsLoading(false);
      setLoadingProgress(undefined); // Clear progress
      alert(`Export failed: ${error}`);
    }
  };

  const getCurrentProjectData = (): ProjectData => {
    return {
      version: '1.0',
      videoFile,
      captions,
      timeline: [], // Empty for now, could be used for timeline selections
      replacementAudioPath,
      lastModified: Date.now(),
      description: generatedContent?.description,
      title: generatedContent?.titles?.[0]?.title,
      aiGeneratedTitles: generatedContent?.titles?.map(t => t.title)
    };
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

  const handleLoadProject = async (projectData: ProjectData) => {
    // Save current state to history before loading
    saveToHistory();

    setVideoFile(projectData.videoFile);
    setCaptions(projectData.captions);
    setOriginalCaptions([...projectData.captions]);
    setReplacementAudioPath(projectData.replacementAudioPath || null);
    setSelectedSegmentId(null);
    setCurrentTime(0);

    // Restore AI generated content
    if (projectData.description || projectData.aiGeneratedTitles) {
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
        const proceed = confirm(`Replace audio track in "${videoFile.name}" with:\n"${audioPath}"\n\nThe audio will be replaced during video rendering/export. Continue?`);
        
        if (proceed) {
          setReplacementAudioPath(audioPath);
          alert(`✅ Audio replacement set!\n\nFile: ${audioPath}\n\nThe new audio will be used when you export the video.`);
        }
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
      
      const audioPath = await window.electronAPI.exportAudio(videoFile.path, `${videoFile.name}_audio.mp3`);
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
      const transcriptionResult = await window.electronAPI.transcribeAudioSegments(audioPath, timelineSelections);
      
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
            font: FontOption.SF_PRO_DISPLAY_SEMIBOLD,
            fontSize: 85,
            textColor: ColorOption.WHITE,
            highlighterColor: ColorOption.YELLOW,
            backgroundColor: ColorOption.TRANSPARENT,
            strokeColor: ColorOption.BLACK,
            strokeWidth: 2,
            textTransform: 'none',
            position: { x: 50, y: 80, z: 0 },
            renderMode: 'horizontal',
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

  if (isLoading) {
    return <LoadingScreen message={loadingMessage} progress={loadingProgress} />;
  }

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      backgroundColor: '#1a1a1a',
      color: '#ffffff'
    }}>
      {/* Window Drag Region */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '80px', // Increased height for better dragging
          WebkitAppRegion: 'drag',
          zIndex: 50,
          pointerEvents: 'none', // Allow clicks to pass through to buttons
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)', // Visual indicator line
          background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%)', // Subtle gradient
          cursor: 'grab'
        }}
        className="drag-region"
      />

      {/* Drag Region Indicator - Top Center
      <div style={{
        position: 'absolute',
        top: '8px', // Much closer to the top
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '10px',
        color: 'rgba(255, 255, 255, 0.4)',
        pointerEvents: 'none',
        zIndex: 51,
        letterSpacing: '1px',
        fontWeight: '500'
      }}>
      </div> */}
      
      {/* Top Menu Bar */}
      <div style={{
        position: 'absolute',
        top: '30px', // Moved down to give space for drag indicator
        left: '80px', // Leave space for traffic lights
        right: '20px',
        zIndex: 100,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        WebkitAppRegion: 'no-drag' // Make buttons clickable
      }}>
        {/* Project Info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '14px',
          color: '#ccc'
        }}>
          <span style={{ fontWeight: 'bold' }}>
            {currentProjectInfo.projectName}
            {currentProjectInfo.isModified && <span style={{ color: '#ffc107' }}> •</span>}
          </span>
          {currentProjectInfo.projectPath && (
            <span style={{ fontSize: '12px', opacity: 0.7 }}>
              ({currentProjectInfo.projectPath.split('/').pop()})
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '6px',
          flexWrap: 'wrap'
        }}>
          {/* Primary Actions Group */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setShowProjectManager(true)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#444',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Project Manager (Ctrl/Cmd+O)"
            >
              📁
            </button>
            <button
              onClick={handleNewProject}
              style={{
                padding: '6px 12px',
                backgroundColor: '#6c757d',
                color: '#fff',
                border: '1px solid #545b62',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="New Project (Ctrl/Cmd+N)"
            >
              📄
            </button>
            <button
              onClick={handleSaveProject}
              style={{
                padding: '6px 12px',
                backgroundColor: '#28a745',
                color: '#fff',
                border: '1px solid #218838',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Save Project (Ctrl/Cmd+S)"
            >
              💾
            </button>
          </div>
          
          {/* Secondary Actions */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={handleSaveProjectAs}
              style={{
                padding: '6px 10px',
                backgroundColor: '#17a2b8',
                color: '#fff',
                border: '1px solid #138496',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
              title="Save Project As (Ctrl/Cmd+Shift+S)"
            >
              💾+
            </button>
            <button
              onClick={() => setShowAISettings(true)}
              style={{
                padding: '6px 10px',
                backgroundColor: '#6f42c1',
                color: '#fff',
                border: '1px solid #5a359e',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
              title="AI Settings (Ctrl/Cmd+,)"
            >
              ⚙️
            </button>
            <button
              onClick={() => captions.length > 0 && setShowAIContent(true)}
              disabled={captions.length === 0}
              style={{
                padding: '6px 10px',
                backgroundColor: captions.length > 0 ? '#17a2b8' : '#6c757d',
                color: '#fff',
                border: captions.length > 0 ? '1px solid #138496' : '1px solid #545b62',
                borderRadius: '4px',
                cursor: captions.length > 0 ? 'pointer' : 'not-allowed',
                fontSize: '11px',
                opacity: captions.length > 0 ? 1 : 0.6
              }}
              title="Generate AI Content (Ctrl/Cmd+G)"
            >
              🤖
            </button>
          </div>
          
          {/* Audio Actions */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={handleAudioImport}
              disabled={!videoFile}
              style={{
                padding: '6px 10px',
                backgroundColor: videoFile ? (replacementAudioPath ? '#28a745' : '#fd7e14') : '#6c757d',
                color: '#fff',
                border: videoFile ? (replacementAudioPath ? '1px solid #28a745' : '1px solid #fd7e14') : '1px solid #545b62',
                borderRadius: '4px',
                cursor: videoFile ? 'pointer' : 'not-allowed',
                fontSize: '11px',
                opacity: videoFile ? 1 : 0.6
              }}
              title={replacementAudioPath ? `Audio Replacement Set: ${replacementAudioPath.split('/').pop()}` : "Replace Video Audio Track"}
            >
              {replacementAudioPath ? '🎵✅' : '🎵'}
            </button>
            {replacementAudioPath && (
              <button
                onClick={() => setReplacementAudioPath(null)}
                style={{
                  padding: '4px 6px',
                  backgroundColor: '#dc3545',
                  color: '#fff',
                  border: '1px solid #c82333',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '10px',
                  marginLeft: '2px'
                }}
                title="Clear audio replacement"
              >
                ✕
              </button>
            )}
            <button
              onClick={handleAudioExport}
              disabled={!videoFile}
              style={{
                padding: '6px 10px',
                backgroundColor: videoFile ? '#20c997' : '#6c757d',
                color: '#fff',
                border: videoFile ? '1px solid #20c997' : '1px solid #545b62',
                borderRadius: '4px',
                cursor: videoFile ? 'pointer' : 'not-allowed',
                fontSize: '11px',
                opacity: videoFile ? 1 : 0.6
              }}
              title="Export Audio from Video"
            >
              🎵↗️
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        paddingTop: '80px' // Account for increased drag region
      }}>
        {/* Content Panel */}
        <div style={{ 
          flex: 1,
          display: 'flex',
          minHeight: 0 // Important for proper flex sizing
        }}>
          {/* Left Panel - Video Preview */}
          <div style={{ 
            flex: '1 1 60%', 
            display: 'flex', 
            flexDirection: 'column',
            borderRight: '1px solid #333',
            minHeight: 0
          }}>
            <VideoPanel
              videoFile={videoFile}
              captions={captions}
              currentTime={currentTime}
              onTimeUpdate={setCurrentTime}
              onVideoSelect={handleVideoSelect}
              onVideoDropped={handleVideoDropped}
              selectedSegmentId={selectedSegmentId}
              onCaptionUpdate={handleCaptionUpdate}
              onPlayPause={handlePlayPause}
              isPlaying={isPlaying}
            />
          </div>

          {/* Right Panel - Tabbed Controls */}
          <div style={{ 
            flex: '1 1 40%', 
            minWidth: '350px',
            maxWidth: '450px',
            minHeight: 0
          }}>
            <TabbedRightPanel
              selectedSegment={captions.find(c => c.id === selectedSegmentId) || null}
              onSegmentUpdate={handleCaptionUpdate}
              videoFile={videoFile}
              captions={captions}
              onExport={handleExport}
              onApplyToAll={handleApplyToAll}
              onTimeSeek={setCurrentTime}
              transcriptionStatus={transcriptionStatus}
              selectedSegmentId={selectedSegmentId}
              onSegmentSelect={setSelectedSegmentId}
              onSegmentDelete={handleCaptionDelete}
              currentTime={currentTime}
            />
          </div>
        </div>
        
        {/* Bottom Unified Timeline */}
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
          onSplitSegment={handleSplitSegment}
          onPlayPause={handlePlayPause}
          isPlaying={isPlaying}
        />
      </div>

      {/* Transcription Settings Dialog */}
      <TranscriptionSettings
        isOpen={showTranscriptionSettings}
        onClose={() => {
          setShowTranscriptionSettings(false);
          setPendingVideoPath(null);
        }}
        onConfirm={handleTranscriptionSettingsConfirm}
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
          setGeneratedContent(content);
          setShowAIContent(false);
        }}
        initialContent={generatedContent || undefined}
      />
    </div>
  );
};

export default App;