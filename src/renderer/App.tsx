import React, { useState, useEffect } from 'react';
import { VideoFile, CaptionSegment, FontOption, ColorOption } from '../types';
import VideoPanel from './components/VideoPanel';
import TimelinePanel from './components/TimelinePanel';
import StylingPanel from './components/StylingPanel';
import TranscriptionSettings from './components/TranscriptionSettings';
import LoadingScreen from './components/LoadingScreen';

interface AppState {
  captions: CaptionSegment[];
  selectedSegmentId: string | null;
}

const App: React.FC = () => {
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [captions, setCaptions] = useState<CaptionSegment[]>([]);
  const [originalCaptions, setOriginalCaptions] = useState<CaptionSegment[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingProgress, setLoadingProgress] = useState<number | undefined>(undefined);
  const [history, setHistory] = useState<AppState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showTranscriptionSettings, setShowTranscriptionSettings] = useState(false);
  const [pendingVideoPath, setPendingVideoPath] = useState<string | null>(null);

  // Initialize history
  useEffect(() => {
    if (historyIndex === -1) {
      setHistory([{ captions: [], selectedSegmentId: null }]);
      setHistoryIndex(0);
    }
  }, [historyIndex]);

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
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

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


  const generateCaptions = async (videoPath: string, settings?: { maxCharsPerLine: number; maxWordsPerLine: number }) => {
    try {
      setLoadingProgress(0); // Reset progress
      setLoadingMessage('Extracting audio...');
      const audioPath = await window.electronAPI.extractAudio(videoPath);
      
      setLoadingMessage('Transcribing audio (this may take a few minutes)...');
      setLoadingProgress(0); // Reset for transcription
      const transcriptionResult = await window.electronAPI.transcribeAudio(audioPath);
      
      // Convert transcription to caption segments with optional line wrapping
      let captionSegments: CaptionSegment[] = transcriptionResult.segments.map((segment: any, index: number) => ({
        id: `segment-${index}`,
        startTime: segment.start,
        endTime: segment.end,
        text: segment.text,
        words: segment.words || [],
        style: {
          font: FontOption.SF_PRO_DISPLAY_SEMIBOLD,
          fontSize: 85,
          textColor: ColorOption.WHITE,
          highlighterColor: ColorOption.YELLOW,
          backgroundColor: ColorOption.TRANSPARENT,
          position: { x: 50, y: 80, z: 0 },
          renderMode: 'horizontal',
          scale: 1,
          emphasizeMode: true
        }
      }));

      // Apply line wrapping if settings provided
      if (settings) {
        captionSegments = applyLineWrapping(captionSegments, settings);
      }
      
      setCaptions(captionSegments);
      setOriginalCaptions([...captionSegments]); // Save original captions for comparison
      setIsLoading(false);
      setLoadingProgress(undefined); // Clear progress
    } catch (error) {
      console.error('Error generating captions:', error);
      setIsLoading(false);
      setLoadingProgress(undefined); // Clear progress
      setLoadingMessage('Error generating captions. Please check that FFmpeg and Whisper are installed.');
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
      setIsLoading(true);
      setLoadingProgress(undefined); // Clear progress during metadata loading
      setLoadingMessage('Loading video metadata...');
      
      // Get video metadata
      const videoMetadata = await window.electronAPI.getVideoMetadata(pendingVideoPath);
      setVideoFile(videoMetadata);
      
      // Auto-generate captions with settings
      await generateCaptions(pendingVideoPath, settings);
      setPendingVideoPath(null);
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

  const handleExport = async () => {
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
          outputPath
        );
        
        // Clean up temp file (note: this would need to be handled by the main process)
      } else {
        setLoadingMessage('Rendering video with captions (this may take several minutes)...');
        setLoadingProgress(0); // Reset for rendering
        await window.electronAPI.renderVideoWithCaptions(
          videoFile.path,
          captions,
          outputPath
        );
      }

      setIsLoading(false);
      setLoadingProgress(undefined); // Clear progress
    } catch (error) {
      console.error('Export error:', error);
      setIsLoading(false);
      setLoadingProgress(undefined); // Clear progress
      alert(`Export failed: ${error}`);
    }
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
  };

  const handleCaptionDelete = (segmentId: string) => {
    // Save current state to history before making changes
    saveToHistory();
    
    setCaptions(prev => prev.filter(segment => segment.id !== segmentId));
    
    // Clear selection if the deleted segment was selected
    if (selectedSegmentId === segmentId) {
      setSelectedSegmentId(null);
    }
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
      {/* Left Panel - Video Preview */}
      <div style={{ 
        flex: '1 1 60%', 
        display: 'flex', 
        flexDirection: 'column',
        borderRight: '1px solid #333'
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
        />
        
        {/* Timeline Panel */}
        <TimelinePanel
          captions={captions}
          currentTime={currentTime}
          selectedSegmentId={selectedSegmentId}
          onSegmentSelect={setSelectedSegmentId}
          onTimeSeek={setCurrentTime}
          onSegmentDelete={handleCaptionDelete}
          videoFile={videoFile}
        />
      </div>

      {/* Right Panel - Styling Controls */}
      <div style={{ 
        flex: '1 1 40%', 
        minWidth: '350px',
        maxWidth: '450px'
      }}>
        <StylingPanel
          selectedSegment={captions.find(c => c.id === selectedSegmentId) || null}
          onSegmentUpdate={handleCaptionUpdate}
          videoFile={videoFile}
          captions={captions}
          onExport={handleExport}
          onApplyToAll={handleApplyToAll}
          onTimeSeek={setCurrentTime}
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
    </div>
  );
};

export default App;