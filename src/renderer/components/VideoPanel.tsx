import React, { useRef, useEffect, useState } from 'react';
import { VideoFile, CaptionSegment } from '../../types';

interface VideoPanelProps {
  videoFile: VideoFile | null;
  captions: CaptionSegment[];
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  onVideoSelect: () => void;
  onVideoDropped?: (filePath: string) => void;
}

const VideoPanel: React.FC<VideoPanelProps> = ({
  videoFile,
  captions,
  currentTime,
  onTimeUpdate,
  onVideoSelect,
  onVideoDropped,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const handleTimeUpdate = () => {
        onTimeUpdate(video.currentTime * 1000);
      };
      
      video.addEventListener('timeupdate', handleTimeUpdate);
      return () => video.removeEventListener('timeupdate', handleTimeUpdate);
    }
    return undefined;
  }, [onTimeUpdate]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find(file => 
      file.type.startsWith('video/') || 
      /\.(mp4|mov|avi)$/i.test(file.name)
    );

    if (videoFile && onVideoDropped) {
      // In Electron, we can get the file path directly from the File object
      const filePath = (videoFile as any).path;
      if (filePath) {
        onVideoDropped(filePath);
      } else {
        // Fallback: try to read the file and create a temporary path
        console.warn('No file path available, falling back to file picker');
        onVideoSelect();
      }
    } else if (videoFile) {
      // Fallback to file picker
      onVideoSelect();
    }
  };

  const getCurrentCaption = () => {
    return captions.find(
      caption => currentTime >= caption.startTime && currentTime <= caption.endTime
    );
  };

  const renderKaraokeText = (caption: CaptionSegment) => {
    // Use word-level timestamps if available, otherwise fall back to simple simulation
    if (caption.words && caption.words.length > 0) {
      return (
        <span>
          {caption.words.map((wordData, index) => {
            const isHighlighted = currentTime >= wordData.start && currentTime <= wordData.end;
            const hasPassedWord = currentTime > wordData.end;
            
            return (
              <span
                key={index}
                style={{
                  backgroundColor: isHighlighted ? caption.style.highlighterColor : 'transparent',
                  color: hasPassedWord ? caption.style.textColor : 
                         isHighlighted ? '#000' : caption.style.textColor,
                  transition: 'all 0.2s ease',
                  padding: '2px 4px',
                  borderRadius: '3px',
                  marginRight: '4px',
                  display: 'inline-block',
                  opacity: hasPassedWord ? 0.8 : 1
                }}
              >
                {wordData.word}
              </span>
            );
          })}
        </span>
      );
    }
    
    // Fallback: simulate word highlighting based on time within the segment
    const words = caption.text.split(' ');
    const segmentDuration = caption.endTime - caption.startTime;
    const timeInSegment = currentTime - caption.startTime;
    const progressRatio = Math.max(0, Math.min(1, timeInSegment / segmentDuration));
    
    const wordsToHighlight = Math.floor(progressRatio * words.length);
    
    return (
      <span>
        {words.map((word, index) => {
          const isHighlighted = index < wordsToHighlight;
          return (
            <span
              key={index}
              style={{
                backgroundColor: isHighlighted ? caption.style.highlighterColor : 'transparent',
                color: isHighlighted ? '#000' : caption.style.textColor,
                transition: 'all 0.3s ease',
                padding: '2px 4px',
                borderRadius: '3px',
                marginRight: '4px',
                display: 'inline-block'
              }}
            >
              {word}
            </span>
          );
        })}
      </span>
    );
  };

  if (!videoFile) {
    return (
      <div 
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDragOver ? '#3a3a3a' : '#2a2a2a',
          margin: '20px',
          borderRadius: '8px',
          border: isDragOver ? '2px dashed #007acc' : '2px dashed #555',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }} 
        onClick={onVideoSelect}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📹</div>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>
            Drop a video file here or click to select
          </div>
          <div style={{ fontSize: '14px', color: '#888' }}>
            Supports MP4, MOV, AVI
          </div>
        </div>
      </div>
    );
  }

  const currentCaption = getCurrentCaption();

  return (
    <div style={{ 
      flex: 1, 
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#000',
      margin: '20px'
    }}>
      <video
        ref={videoRef}
        src={`file://${videoFile.path}`}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain'
        }}
        controls
      />
      
      {/* Caption Overlay */}
      {currentCaption && (
        <div style={{
          position: 'absolute',
          bottom: `${100 - currentCaption.style.position.y}%`,
          left: `${currentCaption.style.position.x}%`,
          transform: 'translateX(-50%)',
          backgroundColor: currentCaption.style.backgroundColor,
          fontSize: `${currentCaption.style.fontSize}px`,
          fontFamily: currentCaption.style.font,
          padding: '12px 24px',
          borderRadius: '6px',
          textAlign: 'center',
          maxWidth: `${currentCaption.style.width}px`,
          wordWrap: 'break-word',
          textShadow: '2px 2px 4px rgba(0,0,0,0.7)',
          lineHeight: '1.2'
        }}>
          {renderKaraokeText(currentCaption)}
        </div>
      )}
    </div>
  );
};

export default VideoPanel;