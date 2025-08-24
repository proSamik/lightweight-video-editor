import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { 
  FiSearch, 
  FiChevronDown,
  FiChevronRight,
  FiX,
  FiCornerDownLeft,
  FiEdit3,
  FiRefreshCw,
} from 'react-icons/fi';
import { AISubtitleData, WordSegment } from '../../types';

interface CompactSearchReplaceProps {
  aiSubtitleData?: AISubtitleData | null;
  onAISubtitleUpdate?: (data: AISubtitleData) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpen?: () => void;
  onFrameSelect?: (frameId: string) => void;
  onTimeSeek?: (time: number) => void;
  onSearchHighlight?: (frameId: string | null, wordIndex: number | null) => void;
}

interface SearchResult {
  frameId: string;
  wordIndex: number;
  word: WordSegment;
  frameStartTime: number;
  context: string;
}

const CompactSearchReplace: React.FC<CompactSearchReplaceProps> = ({
  aiSubtitleData,
  onAISubtitleUpdate,
  isOpen,
  onClose,
  onOpen,
  onFrameSelect,
  onTimeSeek,
  onSearchHighlight
}) => {
  const { theme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const isNavigatingRef = useRef(false);

  // Focus search input only when opening
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      // Use setTimeout to ensure focus happens after render
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }, 0);
    } else if (!isOpen) {
      // Clear highlight when search is closed
      onSearchHighlight?.(null, null);
    }
  }, [isOpen]); // Remove onSearchHighlight dependency - this was causing the refocus!

  // Search functionality
  const performSearch = useCallback((term: string) => {
    if (!term.trim() || !aiSubtitleData?.frames) {
      setSearchResults([]);
      setCurrentResultIndex(0);
      onSearchHighlight?.(null, null); // Clear highlight when no search results
      return;
    }

    const results: SearchResult[] = [];
    const searchValue = caseSensitive ? term : term.toLowerCase();

    aiSubtitleData.frames.forEach((frame) => {
      if (!frame.words || !Array.isArray(frame.words)) return;

      frame.words.forEach((word, wordIndex) => {
        if (!word || typeof word.word !== 'string') return;

        const wordValue = caseSensitive ? word.word : word.word.toLowerCase();
        let matches = false;

        if (wholeWord) {
          const regex = new RegExp(`\\b${searchValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, caseSensitive ? 'g' : 'gi');
          matches = regex.test(wordValue);
        } else {
          matches = wordValue.includes(searchValue);
        }

        if (matches) {
          const contextStart = Math.max(0, wordIndex - 2);
          const contextEnd = Math.min(frame.words.length, wordIndex + 3);
          const contextWords = frame.words.slice(contextStart, contextEnd);
          const context = contextWords.map((w, i) => {
            if (!w || typeof w.word !== 'string') return '';
            const isTarget = contextStart + i === wordIndex;
            return isTarget ? `**${w.word}**` : w.word;
          }).join(' ');

          results.push({
            frameId: frame.id,
            wordIndex,
            word,
            frameStartTime: frame.startTime * 1000,
            context
          });
        }
      });
    });

    setSearchResults(results);
    
    // Only reset to first result if we're not currently navigating
    // Don't auto-navigate or highlight - let user manually navigate
    if (results.length > 0 && !isNavigatingRef.current) {
      setCurrentResultIndex(0);
    }
    
    // Reset navigation flag
    isNavigatingRef.current = false;
  }, [aiSubtitleData?.frames, caseSensitive, wholeWord]);

  // Debounced search to prevent too many re-renders
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchTerm);
    }, 500); // 500ms debounce - longer delay for better UX

    return () => clearTimeout(timeoutId);
  }, [searchTerm, performSearch]);

  // Note: Removed aggressive focus maintenance that was interfering with word editing
  // Users can click back into search input if they need to continue searching

  // Navigate to search result
  const navigateToResult = useCallback((index: number) => {
    if (searchResults.length === 0) return;

    // Set flag to prevent search from resetting to first result
    isNavigatingRef.current = true;
    
    const validIndex = Math.max(0, Math.min(index, searchResults.length - 1));
    setCurrentResultIndex(validIndex);

    const result = searchResults[validIndex];
    if (result) {
      onFrameSelect?.(result.frameId);
      onTimeSeek?.(result.frameStartTime);
      onSearchHighlight?.(result.frameId, result.wordIndex);
    }
  }, [searchResults, onFrameSelect, onTimeSeek, onSearchHighlight]);

  // Replace functionality
  const replaceCurrentResult = useCallback(() => {
    if (!aiSubtitleData || searchResults.length === 0 || !onAISubtitleUpdate) return;

    const result = searchResults[currentResultIndex];
    if (!result) return;

    const updatedFrames = aiSubtitleData.frames.map(frame => {
      if (frame.id !== result.frameId) return frame;

      const updatedWords = frame.words.map((word, index) => {
        if (index !== result.wordIndex) return word;

        return {
          ...word,
          word: replaceTerm
        };
      });

      return {
        ...frame,
        words: updatedWords
      };
    });

    const updatedData = {
      ...aiSubtitleData,
      frames: updatedFrames,
      lastModified: Date.now()
    };

    onAISubtitleUpdate(updatedData);

    setTimeout(() => {
      performSearch(searchTerm);
    }, 100);
  }, [aiSubtitleData, searchResults, currentResultIndex, replaceTerm, onAISubtitleUpdate, performSearch, searchTerm]);

  // Replace all functionality
  const replaceAll = useCallback(() => {
    if (!aiSubtitleData || searchResults.length === 0 || !onAISubtitleUpdate || !searchTerm.trim()) return;

    let replacementCount = 0;
    const searchValue = caseSensitive ? searchTerm : searchTerm.toLowerCase();

    const updatedFrames = aiSubtitleData.frames.map(frame => {
      if (!frame.words || !Array.isArray(frame.words)) return frame;

      const updatedWords = frame.words.map(word => {
        if (!word || typeof word.word !== 'string') return word;

        const wordValue = caseSensitive ? word.word : word.word.toLowerCase();
        let shouldReplace = false;

        if (wholeWord) {
          const regex = new RegExp(`\\b${searchValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, caseSensitive ? 'g' : 'gi');
          shouldReplace = regex.test(wordValue);
        } else {
          shouldReplace = wordValue.includes(searchValue);
        }

        if (shouldReplace) {
          replacementCount++;
          return {
            ...word,
            word: wholeWord 
              ? word.word.replace(
                  new RegExp(`\\b${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, caseSensitive ? 'g' : 'gi'),
                  replaceTerm
                )
              : word.word.replace(
                  new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'g' : 'gi'),
                  replaceTerm
                )
          };
        }

        return word;
      });

      return {
        ...frame,
        words: updatedWords
      };
    });

    const updatedData = {
      ...aiSubtitleData,
      frames: updatedFrames,
      lastModified: Date.now()
    };

    onAISubtitleUpdate(updatedData);

    setTimeout(() => {
      performSearch(searchTerm);
    }, 100);
  }, [aiSubtitleData, searchResults, searchTerm, replaceTerm, caseSensitive, wholeWord, onAISubtitleUpdate, performSearch]);

  // Keyboard shortcuts - only handle when focus is within the search component
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      
      // Only handle events if the target is within our search component
      const searchContainer = document.querySelector('[data-search-container]');
      const isWithinSearchComponent = searchContainer && searchContainer.contains(target);
      
      if (!isWithinSearchComponent) {
        return; // Don't handle if focus is outside search component
      }

      const isInInput = target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.contentEditable === 'true'
      );

      // Always handle Escape to close
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      // Handle F3 navigation only when not in input fields
      if (!isInInput && e.key === 'F3') {
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) {
          navigateToResult(currentResultIndex - 1);
        } else {
          navigateToResult(currentResultIndex + 1);
        }
        return;
      }

      // Handle Enter specifically for our inputs
      if (isInInput && e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        
        if (e.ctrlKey || e.metaKey) {
          replaceAll();
        } else if (target === replaceInputRef.current) {
          replaceCurrentResult();
        } else if (target === searchInputRef.current) {
          navigateToResult(currentResultIndex + 1);
        }
        return;
      }
    };

    // Use capture phase to handle events before they bubble up
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose, replaceAll, replaceCurrentResult, navigateToResult, currentResultIndex, showReplace]);

  return (
    <div
      style={{
        width: '100%',
        fontSize: '12px',
        marginTop: '8px'
      }}
    >
      {/* Always visible search bar */}
      {!isOpen && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            height: '28px',
            backgroundColor: theme.colors.background,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: '4px',
            padding: '0 8px',
            cursor: 'text'
          }}
          onClick={() => {
            onOpen?.();
          }}
        >
          <FiSearch size={12} color={theme.colors.textSecondary} style={{ marginRight: '6px' }} />
          <span 
            style={{ 
              color: theme.colors.textSecondary,
              fontSize: '11px',
              userSelect: 'none',
              flex: 1
            }}
          >
            Search subtitles... (Ctrl+F)
          </span>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <button
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: theme.colors.textSecondary,
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Replace"
            >
              <FiEdit3 size={10} />
            </button>
            <button
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: theme.colors.textSecondary,
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Replace All"
            >
              <FiRefreshCw size={10} />
            </button>
          </div>
        </div>
      )}

      {/* Expanded search interface */}
      {isOpen && (
        <div
          data-search-container
          style={{
            backgroundColor: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: '4px'
          }}
        >
          {/* Search Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              height: '32px',
              padding: '0 8px',
              borderBottom: showReplace ? `1px solid ${theme.colors.border}` : 'none'
            }}
          >
            <button
              onClick={() => setShowReplace(!showReplace)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: theme.colors.textSecondary,
                cursor: 'pointer',
                padding: '2px',
                marginRight: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {showReplace ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />}
            </button>
            
            <FiSearch size={12} color={theme.colors.textSecondary} style={{ marginRight: '6px' }} />
            
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Find"
              onKeyDown={(e) => {
                // Prevent other keyboard shortcuts from triggering
                e.stopPropagation();
                
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (e.ctrlKey || e.metaKey) {
                    replaceAll();
                  } else {
                    navigateToResult(currentResultIndex + 1);
                  }
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  onClose();
                } else if (e.key === 'F3') {
                  e.preventDefault();
                  if (e.shiftKey) {
                    navigateToResult(currentResultIndex - 1);
                  } else {
                    navigateToResult(currentResultIndex + 1);
                  }
                }
              }}
              style={{
                flex: 1,
                border: 'none',
                backgroundColor: 'transparent',
                color: theme.colors.text,
                fontSize: '12px',
                outline: 'none',
                padding: '4px'
              }}
            />

            {/* Match count */}
            {searchResults.length > 0 && (
              <span style={{ 
                color: theme.colors.textSecondary, 
                fontSize: '11px',
                marginRight: '6px',
                minWidth: '40px',
                textAlign: 'right'
              }}>
                {searchResults.length > 0 ? `${currentResultIndex + 1} of ${searchResults.length}` : 'No results'}
              </span>
            )}

            {/* Navigation buttons */}
            <button
              onClick={() => navigateToResult(currentResultIndex - 1)}
              disabled={searchResults.length === 0}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: searchResults.length > 0 ? theme.colors.textSecondary : theme.colors.textMuted,
                cursor: searchResults.length > 0 ? 'pointer' : 'not-allowed',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                marginRight: '2px'
              }}
              title="Previous match (Shift+F3)"
            >
              <span style={{ transform: 'rotate(180deg)' }}>▶</span>
            </button>
            
            <button
              onClick={() => navigateToResult(currentResultIndex + 1)}
              disabled={searchResults.length === 0}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: searchResults.length > 0 ? theme.colors.textSecondary : theme.colors.textMuted,
                cursor: searchResults.length > 0 ? 'pointer' : 'not-allowed',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                marginRight: '4px'
              }}
              title="Next match (F3)"
            >
              ▶
            </button>

            {/* Options */}
            <button
              onClick={() => setCaseSensitive(!caseSensitive)}
              style={{
                backgroundColor: caseSensitive ? theme.colors.primary : 'transparent',
                color: caseSensitive ? theme.colors.primaryForeground : theme.colors.textSecondary,
                border: `1px solid ${caseSensitive ? theme.colors.primary : theme.colors.border}`,
                borderRadius: '2px',
                cursor: 'pointer',
                padding: '2px 4px',
                fontSize: '10px',
                fontWeight: 'bold',
                marginRight: '2px'
              }}
              title="Match case"
            >
              Aa
            </button>
            
            <button
              onClick={() => setWholeWord(!wholeWord)}
              style={{
                backgroundColor: wholeWord ? theme.colors.primary : 'transparent',
                color: wholeWord ? theme.colors.primaryForeground : theme.colors.textSecondary,
                border: `1px solid ${wholeWord ? theme.colors.primary : theme.colors.border}`,
                borderRadius: '2px',
                cursor: 'pointer',
                padding: '2px 4px',
                fontSize: '10px',
                marginRight: '4px'
              }}
              title="Match whole word"
            >
              ab
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: theme.colors.textSecondary,
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Close (Esc)"
            >
              <FiX size={12} />
            </button>
          </div>

          {/* Replace Row */}
          {showReplace && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                height: '32px',
                padding: '0 8px 0 24px'
              }}
            >
              <FiCornerDownLeft size={10} color={theme.colors.textSecondary} style={{ marginRight: '8px', transform: 'scaleX(-1)' }} />
              
              <input
                ref={replaceInputRef}
                type="text"
                value={replaceTerm}
                onChange={(e) => setReplaceTerm(e.target.value)}
                placeholder="Replace"
                onKeyDown={(e) => {
                  // Prevent other keyboard shortcuts from triggering
                  e.stopPropagation();
                  
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (e.ctrlKey || e.metaKey) {
                      replaceAll();
                    } else {
                      replaceCurrentResult();
                    }
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    onClose();
                  } else if (e.key === 'F3') {
                    e.preventDefault();
                    if (e.shiftKey) {
                      navigateToResult(currentResultIndex - 1);
                    } else {
                      navigateToResult(currentResultIndex + 1);
                    }
                  }
                }}
                style={{
                  flex: 1,
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: theme.colors.text,
                  fontSize: '12px',
                  outline: 'none',
                  padding: '4px'
                }}
              />

              {/* Replace buttons */}
              <button
                onClick={replaceCurrentResult}
                disabled={searchResults.length === 0 || !replaceTerm.trim()}
                style={{
                  backgroundColor: 'transparent',
                  border: `1px solid ${searchResults.length > 0 && replaceTerm.trim() ? theme.colors.border : theme.colors.textMuted}`,
                  color: searchResults.length > 0 && replaceTerm.trim() ? theme.colors.text : theme.colors.textMuted,
                  borderRadius: '2px',
                  cursor: searchResults.length > 0 && replaceTerm.trim() ? 'pointer' : 'not-allowed',
                  padding: '2px 6px',
                  fontSize: '10px',
                  marginRight: '4px'
                }}
                title="Replace (Enter)"
              >
                Replace
              </button>
              
              <button
                onClick={replaceAll}
                disabled={searchResults.length === 0 || !replaceTerm.trim()}
                style={{
                  backgroundColor: 'transparent',
                  border: `1px solid ${searchResults.length > 0 && replaceTerm.trim() ? theme.colors.border : theme.colors.textMuted}`,
                  color: searchResults.length > 0 && replaceTerm.trim() ? theme.colors.text : theme.colors.textMuted,
                  borderRadius: '2px',
                  cursor: searchResults.length > 0 && replaceTerm.trim() ? 'pointer' : 'not-allowed',
                  padding: '2px 6px',
                  fontSize: '10px'
                }}
                title="Replace All (Ctrl+Enter)"
              >
                All
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CompactSearchReplace;