import React, { useState, useEffect, useRef } from 'react';
import { CaptionSegment } from '../../types';

interface SubtitlePanelProps {
  captions: CaptionSegment[];
  selectedSegmentId: string | null;
  onSegmentSelect: (segmentId: string) => void;
  onCaptionUpdate: (segmentId: string, updates: Partial<CaptionSegment>) => void;
  onSegmentDelete: (segmentId: string) => void;
  onTimeSeek: (time: number) => void;
  currentTime: number;
}

const SubtitlePanel: React.FC<SubtitlePanelProps> = ({
  captions,
  selectedSegmentId,
  onSegmentSelect,
  onCaptionUpdate,
  onSegmentDelete,
  onTimeSeek,
  currentTime,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [showSearchReplace, setShowSearchReplace] = useState(false);
  const [searchResults, setSearchResults] = useState<{segmentId: string, matchCount: number}[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input field (except Ctrl/Cmd+F)
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true';
      
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearchReplace(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      } else if (e.key === 'Escape') {
        setShowSearchReplace(false);
        setSearchTerm('');
        setReplaceTerm('');
        setSearchResults([]);
      }
      // Note: Other shortcuts are handled by parent components and should not conflict
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search functionality
  useEffect(() => {
    if (searchTerm.trim()) {
      const results: {segmentId: string, matchCount: number}[] = [];
      const searchRegex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      
      captions.forEach(caption => {
        const matches = caption.text.match(searchRegex);
        if (matches) {
          results.push({
            segmentId: caption.id,
            matchCount: matches.length
          });
        }
      });
      
      setSearchResults(results);
      setCurrentSearchIndex(0);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, captions]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSearch = (direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;
    
    let newIndex = currentSearchIndex;
    if (direction === 'next') {
      newIndex = (currentSearchIndex + 1) % searchResults.length;
    } else {
      newIndex = currentSearchIndex === 0 ? searchResults.length - 1 : currentSearchIndex - 1;
    }
    
    setCurrentSearchIndex(newIndex);
    const result = searchResults[newIndex];
    onSegmentSelect(result.segmentId);
    
    // Scroll to the segment
    const segmentElement = document.querySelector(`[data-segment-id="${result.segmentId}"]`);
    if (segmentElement) {
      segmentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleReplace = (segmentId: string) => {
    const segment = captions.find(c => c.id === segmentId);
    if (!segment || !searchTerm.trim()) return;
    
    const searchRegex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const newText = segment.text.replace(searchRegex, replaceTerm);
    
    onCaptionUpdate(segmentId, { text: newText });
  };

  const handleReplaceAll = () => {
    if (!searchTerm.trim()) return;
    
    const searchRegex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    
    searchResults.forEach(result => {
      const segment = captions.find(c => c.id === result.segmentId);
      if (segment) {
        const newText = segment.text.replace(searchRegex, replaceTerm);
        onCaptionUpdate(result.segmentId, { text: newText });
      }
    });
    
    setShowSearchReplace(false);
    setSearchTerm('');
    setReplaceTerm('');
  };

  const highlightSearchTerm = (text: string, segmentId: string) => {
    if (!searchTerm.trim() || !searchResults.some(r => r.segmentId === segmentId)) {
      return text;
    }
    
    const searchRegex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(searchRegex);
    
    return parts.map((part, index) => {
      if (searchRegex.test(part)) {
        return (
          <span
            key={index}
            style={{
              backgroundColor: '#ffff00',
              color: '#000',
              padding: '1px 2px',
              borderRadius: '2px',
              fontWeight: 'bold'
            }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const handleTextEdit = (segmentId: string, newText: string) => {
    onCaptionUpdate(segmentId, { text: newText });
  };

  return (
    <div style={{
      height: '100%',
      backgroundColor: '#2a2a2a',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #444',
        backgroundColor: '#333'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#fff' }}>
            Subtitle Editor
          </h3>
          <button
            onClick={() => setShowSearchReplace(!showSearchReplace)}
            style={{
              padding: '6px 12px',
              backgroundColor: showSearchReplace ? '#007acc' : '#555',
              color: '#fff',
              border: '1px solid #666',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Search & Replace (Ctrl/Cmd+F)"
          >
            🔍 Search
          </button>
        </div>

        {/* Search & Replace Panel */}
        {showSearchReplace && (
          <div style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #555',
            borderRadius: '6px',
            padding: '12px'
          }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  backgroundColor: '#2a2a2a',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '12px'
                }}
              />
              <button
                onClick={() => handleSearch('prev')}
                disabled={searchResults.length === 0}
                style={{
                  padding: '6px 8px',
                  backgroundColor: '#555',
                  color: '#fff',
                  border: '1px solid #666',
                  borderRadius: '4px',
                  cursor: searchResults.length > 0 ? 'pointer' : 'not-allowed',
                  fontSize: '12px',
                  opacity: searchResults.length > 0 ? 1 : 0.5
                }}
              >
                ↑
              </button>
              <button
                onClick={() => handleSearch('next')}
                disabled={searchResults.length === 0}
                style={{
                  padding: '6px 8px',
                  backgroundColor: '#555',
                  color: '#fff',
                  border: '1px solid #666',
                  borderRadius: '4px',
                  cursor: searchResults.length > 0 ? 'pointer' : 'not-allowed',
                  fontSize: '12px',
                  opacity: searchResults.length > 0 ? 1 : 0.5
                }}
              >
                ↓
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                placeholder="Replace with..."
                value={replaceTerm}
                onChange={(e) => setReplaceTerm(e.target.value)}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  backgroundColor: '#2a2a2a',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '12px'
                }}
              />
              <button
                onClick={() => {
                  if (selectedSegmentId) {
                    handleReplace(selectedSegmentId);
                  }
                }}
                disabled={!selectedSegmentId || !searchTerm.trim()}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#28a745',
                  color: '#fff',
                  border: '1px solid #218838',
                  borderRadius: '4px',
                  cursor: selectedSegmentId && searchTerm.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '12px',
                  opacity: selectedSegmentId && searchTerm.trim() ? 1 : 0.5
                }}
              >
                Replace
              </button>
              <button
                onClick={handleReplaceAll}
                disabled={searchResults.length === 0 || !replaceTerm.trim()}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#dc3545',
                  color: '#fff',
                  border: '1px solid #c82333',
                  borderRadius: '4px',
                  cursor: searchResults.length > 0 && replaceTerm.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '12px',
                  opacity: searchResults.length > 0 && replaceTerm.trim() ? 1 : 0.5
                }}
              >
                Replace All
              </button>
            </div>
            
            {searchResults.length > 0 && (
              <div style={{
                fontSize: '11px',
                color: '#888',
                textAlign: 'center'
              }}>
                {currentSearchIndex + 1} of {searchResults.length} matches
              </div>
            )}
          </div>
        )}
      </div>

      {/* Subtitle List */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '8px'
      }}>
        {captions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#888',
            marginTop: '40px',
            fontSize: '14px'
          }}>
            No subtitles available.
            <br />
            Import a video to generate subtitles.
          </div>
        ) : (
          captions.map((caption, index) => {
            const isSelected = selectedSegmentId === caption.id;
            const isCurrent = currentTime >= caption.startTime && currentTime <= caption.endTime;
            const hasSearchMatch = searchResults.some(r => r.segmentId === caption.id);
            
            return (
              <div
                key={caption.id}
                data-segment-id={caption.id}
                style={{
                  marginBottom: '8px',
                  padding: '12px',
                  backgroundColor: isSelected ? '#444' : isCurrent ? '#3a3a3a' : '#333',
                  border: isSelected ? '2px solid #007acc' : isCurrent ? '2px solid #28a745' : '1px solid #555',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  outline: hasSearchMatch ? '2px solid #ffff00' : 'none'
                }}
                onClick={() => {
                  onSegmentSelect(caption.id);
                  onTimeSeek(caption.startTime);
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{
                      fontSize: '11px',
                      color: '#888',
                      fontFamily: 'monospace'
                    }}>
                      #{index + 1}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      color: '#aaa'
                    }}>
                      {formatTime(caption.startTime)} → {formatTime(caption.endTime)}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      color: '#888',
                      backgroundColor: '#1a1a1a',
                      padding: '2px 6px',
                      borderRadius: '3px'
                    }}>
                      {Math.round((caption.endTime - caption.startTime) / 1000)}s
                    </span>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSegmentDelete(caption.id);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ff6b6b',
                      cursor: 'pointer',
                      fontSize: '14px',
                      padding: '4px',
                      borderRadius: '3px'
                    }}
                    title="Delete subtitle"
                  >
                    🗑️
                  </button>
                </div>
                
                <textarea
                  value={caption.text}
                  onChange={(e) => handleTextEdit(caption.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: '100%',
                    minHeight: '60px',
                    padding: '8px',
                    backgroundColor: '#2a2a2a',
                    border: '1px solid #555',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '13px',
                    lineHeight: '1.4',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                  placeholder="Enter subtitle text..."
                />
                
                {/* Show highlighted text for search results */}
                {hasSearchMatch && (
                  <div style={{
                    marginTop: '8px',
                    padding: '6px',
                    backgroundColor: '#1a1a1a',
                    borderRadius: '4px',
                    fontSize: '12px',
                    lineHeight: '1.4'
                  }}>
                    {highlightSearchTerm(caption.text, caption.id)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SubtitlePanel;