import React, { useState, useEffect } from 'react';
import { VideoFile, CaptionSegment, FontOption, ColorOption } from '../types';
import VideoPanel from './components/VideoPanel';
import TimelinePanel from './components/TimelinePanel';
import StylingPanel from './components/StylingPanel';
import LoadingScreen from './components/LoadingScreen';

interface AppState {
  captions: CaptionSegment[];
  selectedSegmentId: string | null;
}

const App: React.FC = () => {
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [captions, setCaptions] = useState<CaptionSegment[]>([]);
  const [originalCaptions, setOriginalCaptions] = useState<CaptionSegment[]>([]); // Track original captions for word deletion
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [dependencies, setDependencies] = useState<{ffmpeg: boolean, whisper: boolean} | null>(null);
  
  // Undo/Redo state management
  const [history, setHistory] = useState<AppState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  useEffect(() => {
    checkDependencies();
    
    // Set up drag and drop listener
    const handleFileDropped = (filePath: string) => {
      processVideoFile(filePath);
    };
    
    window.electronAPI.onFileDropped(handleFileDropped);
    
    // Set up keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        e.preventDefault();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [history, historyIndex]); // Add dependencies to ensure undo/redo works with latest state

  // Save state to history before making changes
  const saveToHistory = () => {
    const currentState: AppState = {
      captions: [...captions],
      selectedSegmentId
    };
    
    // Remove any future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(currentState);
    
    // Limit history size
    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      setHistoryIndex(historyIndex + 1);
    }
    
    setHistory(newHistory);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      setCaptions(previousState.captions);
      setSelectedSegmentId(previousState.selectedSegmentId);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setCaptions(nextState.captions);
      setSelectedSegmentId(nextState.selectedSegmentId);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const checkDependencies = async () => {
    try {
      const deps = await window.electronAPI.checkDependencies();
      setDependencies(deps);
    } catch (error) {
      console.error('Error checking dependencies:', error);
    }
  };

  const handleVideoSelect = async () => {
    try {
      const filePath = await window.electronAPI.selectVideoFile();
      if (filePath) {
        await processVideoFile(filePath);
      }
    } catch (error) {
      console.error('Error selecting video file:', error);
      setIsLoading(false);
    }
  };

  const handleVideoDropped = async (filePath: string) => {
    try {
      await processVideoFile(filePath);
    } catch (error) {
      console.error('Error processing dropped video file:', error);
      setIsLoading(false);
    }
  };

  const processVideoFile = async (filePath: string) => {
    setIsLoading(true);
    setLoadingMessage('Loading video metadata...');
    
    // Get video metadata
    const videoMetadata = await window.electronAPI.getVideoMetadata(filePath);
    setVideoFile(videoMetadata);
    
    // Auto-generate captions
    await generateCaptions(filePath);
  };

  const generateCaptions = async (videoPath: string) => {
    try {
      setLoadingMessage('Extracting audio...');
      const audioPath = await window.electronAPI.extractAudio(videoPath);
      
      setLoadingMessage('Transcribing audio (this may take a few minutes)...');
      const transcriptionResult = await window.electronAPI.transcribeAudio(audioPath);
      
      // Convert transcription to caption segments
      const captionSegments: CaptionSegment[] = transcriptionResult.segments.map((segment: any, index: number) => ({
        id: `segment-${index}`,
        startTime: segment.start,
        endTime: segment.end,
        text: segment.text,
        words: segment.words || [],
        style: {
          font: FontOption.SF_PRO_DISPLAY_SEMIBOLD,
          fontSize: 32,
          textColor: ColorOption.WHITE,
          highlighterColor: ColorOption.BRIGHT_YELLOW,
          backgroundColor: ColorOption.BLACK_SEMI,
          position: { x: 50, y: 80 },
          width: 600
        }
      }));
      
      setCaptions(captionSegments);
      setOriginalCaptions([...captionSegments]); // Save original captions for comparison
      setIsLoading(false);
    } catch (error) {
      console.error('Error generating captions:', error);
      setIsLoading(false);
      setLoadingMessage('Error generating captions. Please check that FFmpeg and Whisper are installed.');
    }
  };

  const handleExport = async () => {
    if (!videoFile || captions.length === 0) return;

    try {
      setIsLoading(true);
      setLoadingMessage('Choosing export location...');

      const outputPath = await window.electronAPI.exportVideo(
        `${videoFile.name.replace(/\.[^/.]+$/, "")}_with_captions.mp4`
      );

      if (!outputPath) {
        setIsLoading(false);
        return;
      }

      // Check if any words were deleted (affecting audio/video timing)
      const hasWordDeletions = JSON.stringify(originalCaptions) !== JSON.stringify(captions);
      
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
        await window.electronAPI.renderVideoWithCaptions(
          tempVideoPath,
          captions,
          outputPath
        );
        
        // Clean up temp file (note: this would need to be handled by the main process)
      } else {
        setLoadingMessage('Rendering video with captions (this may take several minutes)...');
        await window.electronAPI.renderVideoWithCaptions(
          videoFile.path,
          captions,
          outputPath
        );
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Export error:', error);
      setIsLoading(false);
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

  if (isLoading) {
    return <LoadingScreen message={loadingMessage} />;
  }

  if (dependencies && (!dependencies.ffmpeg || !dependencies.whisper)) {
    return (
      <div style={{
        height: '100vh',
        backgroundColor: '#1a1a1a',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        textAlign: 'center',
        padding: '40px'
      }}>
        <h2 style={{ marginBottom: '20px' }}>Missing Dependencies</h2>
        <div style={{ marginBottom: '30px', lineHeight: '1.6' }}>
          {!dependencies.ffmpeg && (
            <div style={{ marginBottom: '15px' }}>
              ❌ <strong>FFmpeg not found</strong><br />
              Install with: <code>brew install ffmpeg</code>
            </div>
          )}
          {!dependencies.whisper && (
            <div style={{ marginBottom: '15px' }}>
              ❌ <strong>Whisper not found</strong><br />
              Install with: <code>pip install openai-whisper</code>
            </div>
          )}
        </div>
        <button
          onClick={checkDependencies}
          style={{
            padding: '12px 24px',
            backgroundColor: '#007acc',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Check Again
        </button>
      </div>
    );
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
        />
        
        {/* Timeline Panel */}
        <TimelinePanel
          captions={captions}
          currentTime={currentTime}
          selectedSegmentId={selectedSegmentId}
          onSegmentSelect={setSelectedSegmentId}
          onTimeSeek={setCurrentTime}
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
        />
      </div>
    </div>
  );
};

export default App;