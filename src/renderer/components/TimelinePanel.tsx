import React, { useState, useEffect } from 'react';
import { CaptionSegment, SearchResult } from '../../types';
import SearchModal from './SearchModal';
import { useTheme } from '../contexts/ThemeContext';
import { FiMic, FiTrash2, FiScissors } from 'react-icons/fi';

interface TimelinePanelProps {
  captions: CaptionSegment[];
  currentTime: number;
  selectedSegmentId: string | null;
  onSegmentSelect: (segmentId: string) => void;
  onTimeSeek: (time: number) => void;
  onSegmentDelete: (segmentId: string) => void;
  onCaptionUpdate: (segmentId: string, updates: Partial<CaptionSegment>) => void;
  videoFile?: { path: string; name: string; duration?: number } | null;
  onReTranscribeSegment?: (startTime: number, endTime: number) => void;
}

const TimelinePanel: React.FC<TimelinePanelProps> = ({
  captions,
  currentTime,
  selectedSegmentId,
  onSegmentSelect,
  onTimeSeek,
  onSegmentDelete,
  onCaptionUpdate,
  videoFile,
  onReTranscribeSegment,
}) => {
  const { theme } = useTheme();
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [highlightedSegments, setHighlightedSegments] = useState<Set<string>>(new Set());
  const [searchHighlight, setSearchHighlight] = useState<{segmentId: string, start: number, end: number} | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<{start: number, end: number} | null>(null);
  const [isSelectingRange, setIsSelectingRange] = useState(false);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearchModal(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchResult = (result: SearchResult) => {
    // Highlight the segment and navigate to it
    onSegmentSelect(result.segmentId);
    setSearchHighlight({
      segmentId: result.segmentId,
      start: result.matchStart,
      end: result.matchEnd
    });

    // Scroll to the segment if needed
    const segmentElement = document.querySelector(`[data-segment-id="${result.segmentId}"]`);
    if (segmentElement) {
      segmentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Navigate to the segment's time
    const caption = captions.find(c => c.id === result.segmentId);
    if (caption) {
      onTimeSeek(caption.startTime);
    }
  };

  const handleReplaceAll = (searchTerm: string, replaceTerm: string) => {
    const searchPattern = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    
    captions.forEach(caption => {
      if (searchPattern.test(caption.text)) {
        const newText = caption.text.replace(searchPattern, replaceTerm);
        onCaptionUpdate(caption.id, { text: newText });
      }
    });

    setShowSearchModal(false);
    setSearchHighlight(null);
  };

  const handleReplace = (segmentId: string, newText: string) => {
    onCaptionUpdate(segmentId, { text: newText });
  };

  const renderHighlightedText = (text: string, segmentId: string) => {
    if (!searchHighlight || searchHighlight.segmentId !== segmentId) {
      return text;
    }

    const beforeMatch = text.substring(0, searchHighlight.start);
    const match = text.substring(searchHighlight.start, searchHighlight.end);
    const afterMatch = text.substring(searchHighlight.end);

    return (
      <>
        {beforeMatch}
        <span style={{
          backgroundColor: theme.colors.warning,
          color: theme.colors.text,
          padding: '2px 4px',
          borderRadius: '2px',
          fontWeight: 'bold'
        }}>
          {match}
        </span>
        {afterMatch}
      </>
    );
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Use video duration if available, otherwise fallback to caption duration
  const totalDuration = videoFile?.duration 
    ? videoFile.duration * 1000 // Convert from seconds to milliseconds
    : captions.length > 0 
      ? Math.max(...captions.map(c => c.endTime))
      : 60000; // Default 1 minute

  return (
    <div style={{
      height: '200px',
      backgroundColor: theme.colors.surface,
      borderTop: `1px solid ${theme.colors.border}`,
      padding: '20px',
      overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', color: theme.colors.text }}>Caption Timeline</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => {
              setIsSelectingRange(!isSelectingRange);
              setSelectedTimeRange(null);
            }}
            style={{
              padding: '6px 12px',
              backgroundColor: isSelectingRange ? theme.colors.success : theme.colors.secondary,
              color: theme.colors.text,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Select timeline range for re-transcription"
          >
            📐 {isSelectingRange ? 'Cancel Selection' : 'Select Range'}
          </button>
          {selectedTimeRange && onReTranscribeSegment && (
            <button
              onClick={() => {
                onReTranscribeSegment(selectedTimeRange.start, selectedTimeRange.end);
                setSelectedTimeRange(null);
                setIsSelectingRange(false);
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: theme.colors.error,
                color: theme.colors.text,
                border: `1px solid ${theme.colors.error}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Re-transcribe selected range"
            >
              <FiMic size={14} style={{ marginRight: '6px' }} />
              Re-transcribe
            </button>
          )}
          <button
            onClick={() => setShowSearchModal(true)}
            style={{
              padding: '6px 12px',
              backgroundColor: theme.colors.surface,
              color: theme.colors.text,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Search in timeline (Ctrl/Cmd+F)"
          >
            🔍 Search
          </button>
        </div>
      </div>
      
      {/* Timeline Ruler */}
      <div style={{
        height: '30px',
        position: 'relative',
        backgroundColor: theme.colors.background,
        borderRadius: '4px',
        marginBottom: '15px',
        cursor: 'pointer'
      }} onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        const seekTime = percentage * totalDuration;
        
        if (isSelectingRange) {
          if (!selectedTimeRange) {
            // First click - set start time
            setSelectedTimeRange({ start: seekTime, end: seekTime });
          } else {
            // Second click - set end time
            const start = Math.min(selectedTimeRange.start, seekTime);
            const end = Math.max(selectedTimeRange.start, seekTime);
            setSelectedTimeRange({ start, end });
          }
        } else {
          onTimeSeek(seekTime);
        }
      }}>
        {/* Selected Time Range */}
        {selectedTimeRange && (
          <div style={{
            position: 'absolute',
            left: `${(selectedTimeRange.start / totalDuration) * 100}%`,
            width: `${((selectedTimeRange.end - selectedTimeRange.start) / totalDuration) * 100}%`,
            top: 0,
            bottom: 0,
            backgroundColor: `${theme.colors.success}30`,
            border: `1px solid ${theme.colors.success}`,
            borderRadius: '2px',
            zIndex: 1
          }} />
        )}
        
        {/* Current Time Indicator */}
        <div style={{
          position: 'absolute',
          left: `${(currentTime / totalDuration) * 100}%`,
          top: 0,
          bottom: 0,
          width: '2px',
          backgroundColor: theme.colors.error,
          zIndex: 2
        }} />
        
        {/* Time Markers */}
        {Array.from({ length: 11 }, (_, i) => {
          const time = (i / 10) * totalDuration;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${i * 10}%`,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '10px',
                color: theme.colors.textSecondary,
                whiteSpace: 'nowrap'
              }}
            >
              {formatTime(time)}
            </div>
          );
        })}
      </div>

      {/* Caption Segments */}
      <div style={{
        height: '120px',
        overflowY: 'auto',
        overflowX: 'hidden'
      }}>
        {captions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: theme.colors.textSecondary,
            marginTop: '40px'
          }}>
            No captions loaded. Import a video to generate captions.
          </div>
        ) : (
          captions.map((caption) => (
            <div
              key={caption.id}
              data-segment-id={caption.id}
              style={{
                padding: '8px 12px',
                marginBottom: '8px',
                backgroundColor: selectedSegmentId === caption.id ? theme.colors.surface : theme.colors.background,
                borderRadius: '4px',
                cursor: 'pointer',
                border: selectedSegmentId === caption.id ? `1px solid ${theme.colors.border}` : '1px solid transparent',
                transition: 'all 0.2s ease'
              }}
              onClick={() => onSegmentSelect(caption.id)}
              onDoubleClick={() => {
                // Select the segment and seek to its start time
                onSegmentSelect(caption.id);
                onTimeSeek(caption.endTime);
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <span style={{ fontSize: '12px', color: theme.colors.textSecondary }}>
                  {formatTime(caption.startTime)} - {formatTime(caption.endTime)}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: theme.colors.textSecondary }}>
                    {Math.round((caption.endTime - caption.startTime) / 1000)}s
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent segment selection
                      onSegmentDelete(caption.id);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: theme.colors.error,
                      cursor: 'pointer',
                      fontSize: '16px',
                      padding: '2px',
                      borderRadius: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Delete this caption segment"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
              <div style={{
                fontSize: '14px',
                lineHeight: '1.4',
                color: selectedSegmentId === caption.id ? theme.colors.text : theme.colors.textSecondary
              }}>
                {renderHighlightedText(caption.text, caption.id)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Search Modal */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => {
          setShowSearchModal(false);
          setSearchHighlight(null);
        }}
        captions={captions}
        onSearchResult={handleSearchResult}
        onReplaceAll={handleReplaceAll}
        onReplace={handleReplace}
      />
    </div>
  );
};

export default TimelinePanel;