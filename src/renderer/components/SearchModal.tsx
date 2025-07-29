import React, { useState, useEffect } from 'react';
import { CaptionSegment, SearchResult } from '../../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  captions: CaptionSegment[];
  onSearchResult: (result: SearchResult) => void;
  onReplaceAll: (searchTerm: string, replaceTerm: string) => void;
  onReplace: (segmentId: string, newText: string) => void;
}

const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  captions,
  onSearchResult,
  onReplaceAll,
  onReplace,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [showReplace, setShowReplace] = useState(false);

  // Perform search when search term changes
  useEffect(() => {
    if (searchTerm.trim()) {
      performSearch();
    } else {
      setSearchResults([]);
      setCurrentResultIndex(0);
    }
  }, [searchTerm, caseSensitive, wholeWord, captions]);

  const performSearch = () => {
    const results: SearchResult[] = [];
    const searchFlags = caseSensitive ? 'g' : 'gi';
    let searchPattern: RegExp;
    
    try {
      if (wholeWord) {
        searchPattern = new RegExp(`\\b${escapeRegExp(searchTerm)}\\b`, searchFlags);
      } else {
        searchPattern = new RegExp(escapeRegExp(searchTerm), searchFlags);
      }
    } catch (error) {
      // Invalid regex, treat as literal string
      const escaped = escapeRegExp(searchTerm);
      searchPattern = new RegExp(escaped, searchFlags);
    }

    captions.forEach((caption, segmentIndex) => {
      const matches = Array.from(caption.text.matchAll(searchPattern));
      
      matches.forEach(match => {
        if (match.index !== undefined) {
          results.push({
            segmentId: caption.id,
            segmentIndex,
            matchStart: match.index,
            matchEnd: match.index + match[0].length,
            context: getContext(caption.text, match.index, match[0].length)
          });
        }
      });
    });

    setSearchResults(results);
    setCurrentResultIndex(0);
  };

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const getContext = (text: string, start: number, length: number): string => {
    const contextRadius = 20;
    const beforeStart = Math.max(0, start - contextRadius);
    const afterEnd = Math.min(text.length, start + length + contextRadius);
    
    let context = text.slice(beforeStart, afterEnd);
    if (beforeStart > 0) context = '...' + context;
    if (afterEnd < text.length) context = context + '...';
    
    return context;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      navigateToNext();
    } else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      navigateToPrevious();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const navigateToNext = () => {
    if (searchResults.length === 0) return;
    
    const nextIndex = (currentResultIndex + 1) % searchResults.length;
    setCurrentResultIndex(nextIndex);
    onSearchResult(searchResults[nextIndex]);
  };

  const navigateToPrevious = () => {
    if (searchResults.length === 0) return;
    
    const prevIndex = currentResultIndex === 0 ? searchResults.length - 1 : currentResultIndex - 1;
    setCurrentResultIndex(prevIndex);
    onSearchResult(searchResults[prevIndex]);
  };

  const handleReplaceAll = () => {
    if (searchTerm.trim() && replaceTerm !== undefined) {
      onReplaceAll(searchTerm, replaceTerm);
      setSearchTerm('');
      setReplaceTerm('');
    }
  };

  const handleReplaceCurrent = () => {
    if (searchResults.length === 0 || !searchTerm.trim()) return;
    
    const currentResult = searchResults[currentResultIndex];
    const caption = captions.find(c => c.id === currentResult.segmentId);
    
    if (caption) {
      const newText = caption.text.substring(0, currentResult.matchStart) + 
                     replaceTerm + 
                     caption.text.substring(currentResult.matchEnd);
      
      // Call the parent's replace function
      onReplace(caption.id, newText);
      
      // Refresh search results after replacement
      setTimeout(() => {
        performSearch();
      }, 100);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#2a2a2a',
        borderRadius: '8px',
        padding: '24px',
        minWidth: '500px',
        maxWidth: '700px',
        border: '1px solid #444'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>
            {showReplace ? 'Find & Replace' : 'Find in Timeline'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#ccc',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Search Input */}
        <div style={{ marginBottom: '12px' }}>
          <input
            type="text"
            placeholder="Search text..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#333',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>

        {/* Replace Input */}
        {showReplace && (
          <div style={{ marginBottom: '12px' }}>
            <input
              type="text"
              placeholder="Replace with..."
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#333',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
        )}

        {/* Search Options */}
        <div style={{ 
          display: 'flex', 
          gap: '16px', 
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              style={{ marginRight: '6px' }}
            />
            Case sensitive
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={wholeWord}
              onChange={(e) => setWholeWord(e.target.checked)}
              style={{ marginRight: '6px' }}
            />
            Whole word
          </label>
        </div>

        {/* Search Results Info */}
        {searchTerm && (
          <div style={{
            marginBottom: '16px',
            fontSize: '12px',
            color: '#aaa'
          }}>
            {searchResults.length === 0 ? 
              'No matches found' : 
              `${currentResultIndex + 1} of ${searchResults.length} matches`
            }
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          justifyContent: 'space-between',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={navigateToPrevious}
              disabled={searchResults.length === 0}
              style={{
                padding: '8px 16px',
                backgroundColor: searchResults.length > 0 ? '#444' : '#2a2a2a',
                color: searchResults.length > 0 ? '#fff' : '#666',
                border: '1px solid #555',
                borderRadius: '4px',
                cursor: searchResults.length > 0 ? 'pointer' : 'default',
                fontSize: '12px'
              }}
            >
              Previous
            </button>
            <button
              onClick={navigateToNext}
              disabled={searchResults.length === 0}
              style={{
                padding: '8px 16px',
                backgroundColor: searchResults.length > 0 ? '#444' : '#2a2a2a',
                color: searchResults.length > 0 ? '#fff' : '#666',
                border: '1px solid #555',
                borderRadius: '4px',
                cursor: searchResults.length > 0 ? 'pointer' : 'default',
                fontSize: '12px'
              }}
            >
              Next
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowReplace(!showReplace)}
              style={{
                padding: '8px 16px',
                backgroundColor: showReplace ? '#007acc' : '#444',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {showReplace ? 'Hide Replace' : 'Replace'}
            </button>

            {showReplace && (
              <>
                <button
                  onClick={handleReplaceCurrent}
                  disabled={searchResults.length === 0}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: searchResults.length > 0 ? '#28a745' : '#2a2a2a',
                    color: searchResults.length > 0 ? '#fff' : '#666',
                    border: '1px solid #555',
                    borderRadius: '4px',
                    cursor: searchResults.length > 0 ? 'pointer' : 'default',
                    fontSize: '12px'
                  }}
                >
                  Replace
                </button>
                <button
                  onClick={handleReplaceAll}
                  disabled={searchResults.length === 0}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: searchResults.length > 0 ? '#dc3545' : '#2a2a2a',
                    color: searchResults.length > 0 ? '#fff' : '#666',
                    border: '1px solid #555',
                    borderRadius: '4px',
                    cursor: searchResults.length > 0 ? 'pointer' : 'default',
                    fontSize: '12px'
                  }}
                >
                  Replace All
                </button>
              </>
            )}
          </div>
        </div>

        {/* Keyboard Shortcuts Help */}
        <div style={{
          marginTop: '16px',
          fontSize: '11px',
          color: '#666',
          borderTop: '1px solid #444',
          paddingTop: '12px'
        }}>
          <strong>Keyboard shortcuts:</strong> Enter = Next, Shift+Enter = Previous, Esc = Close
        </div>
      </div>
    </div>
  );
};

export default SearchModal;