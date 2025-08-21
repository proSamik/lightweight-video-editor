import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { 
  WordSegment, 
  SubtitleFrame, 
  AISubtitleData, 
  WordEditState,
} from '../../types';
import { Copy, Edit3, Star, Hash, FileX, ChevronUp, ChevronDown } from 'lucide-react';
import { formatTimeHHMMSS } from '../../utils/timeFormatting';

interface AISubtitlesPanelProps {
  currentTime: number;
  onTimeSeek: (time: number) => void;
  maxWordsPerFrame?: number;
  maxCharsPerFrame?: number;
  aiSubtitleData?: AISubtitleData | null;
  onAISubtitleUpdate?: (data: AISubtitleData | null) => void;
  selectedFrameId?: string | null;
  onFrameSelect?: (frameId: string) => void;
  videoPath?: string | null;
  audioPath?: string | null;
}

interface WordContextMenu {
  show: boolean;
  x: number;
  y: number;
  wordId: string;
  frameId: string;
  isMultiSelect: boolean;
  selectedWordIds: string[];
}

const AISubtitlesPanel: React.FC<AISubtitlesPanelProps> = ({
  currentTime,
  onTimeSeek,
  maxWordsPerFrame = 5,
  maxCharsPerFrame = 30,
  aiSubtitleData: propAiSubtitleData,
  onAISubtitleUpdate,
  selectedFrameId,
  onFrameSelect,
  videoPath,
  audioPath
}) => {
  const { theme } = useTheme();
  const [internalAiSubtitleData, setInternalAiSubtitleData] = useState<AISubtitleData | null>(null);
  
  // Use prop data if available, otherwise use internal data
  const aiSubtitleData = propAiSubtitleData || internalAiSubtitleData;
  
  // Helper function to update AI subtitle data
  const updateAISubtitleData = useCallback((updatedData: AISubtitleData) => {
    if (onAISubtitleUpdate) {
      onAISubtitleUpdate(updatedData);
    } else {
      setInternalAiSubtitleData(updatedData);
    }
  }, [onAISubtitleUpdate]);

  // No more conversion needed - AI Subtitles are the single source of truth

  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<WordContextMenu>({
    show: false,
    x: 0,
    y: 0,
    wordId: '',
    frameId: '',
    isMultiSelect: false,
    selectedWordIds: []
  });
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [enterPressCount, setEnterPressCount] = useState(0);
  const [lastEnterTime, setLastEnterTime] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // AI Subtitles are now the primary data source - no conversion needed

  // Utility function to ensure frames don't overlap
  const ensureNonOverlappingFrames = (frames: SubtitleFrame[]): SubtitleFrame[] => {
    const sortedFrames = [...frames].sort((a, b) => a.startTime - b.startTime);
    const GAP_DURATION = 0.01; // 10ms gap between frames

    return sortedFrames.map((frame, index) => {
      if (index === 0) return frame;
      
      const prevFrame = sortedFrames[index - 1];
      
      // If current frame starts at or before previous frame ends, adjust the timing
      if (frame.startTime <= prevFrame.endTime) {
        const adjustedStartTime = prevFrame.endTime + GAP_DURATION;
        
        // Ensure the frame duration is at least 0.1 seconds
        const minEndTime = adjustedStartTime + 0.1;
        const adjustedEndTime = Math.max(frame.endTime, minEndTime);
        
        return {
          ...frame,
          startTime: adjustedStartTime,
          endTime: adjustedEndTime,
          words: frame.words.map(word => ({
            ...word,
            start: Math.max(word.start, adjustedStartTime),
            end: Math.min(word.end, adjustedEndTime)
          }))
        };
      }
      
      return frame;
    });
  };

  // Always use sorted frames directly from aiSubtitleData - no local state needed
  // Also fix any duplicate IDs that might exist in the data and ensure non-overlapping times
  const renderFrames = useMemo(() => {
    if (!aiSubtitleData) return [] as SubtitleFrame[];
    
    const frames = [...aiSubtitleData.frames];
    const seenIds = new Set<string>();
    const fixedFrames = frames.map((frame, index) => {
      if (seenIds.has(frame.id)) {
        // Generate a new unique ID for duplicate frames
        const newId = `${frame.id}-duplicate-fix-${Date.now()}-${index}`;
        console.warn(`Fixed duplicate frame ID: ${frame.id} -> ${newId}`);
        return { ...frame, id: newId };
      }
      seenIds.add(frame.id);
      return frame;
    });
    
    // Fix overlapping times
    const nonOverlappingFrames = ensureNonOverlappingFrames(fixedFrames);
    
    // Update the parent data if we fixed any duplicates or overlaps
    const needsUpdate = fixedFrames.some((frame, index) => frame.id !== frames[index].id) ||
                       nonOverlappingFrames.some((frame, index) => 
                         Math.abs(frame.startTime - fixedFrames[index].startTime) > 0.001 ||
                         Math.abs(frame.endTime - fixedFrames[index].endTime) > 0.001);
    
    if (needsUpdate) {
      const fixedData = { ...aiSubtitleData, frames: nonOverlappingFrames, lastModified: Date.now() };
      // Schedule the update for the next tick to avoid infinite re-renders
      setTimeout(() => updateAISubtitleData(fixedData), 0);
    }
    
    return nonOverlappingFrames.sort((a, b) => a.startTime - b.startTime);
  }, [aiSubtitleData?.frames]);

  // Get currently highlighted words based on current time
  const currentlyHighlightedWords = useMemo(() => {
    if (!aiSubtitleData) return new Set<string>();
    
    const highlighted = new Set<string>();
    const currentTimeInSeconds = currentTime / 1000; // Convert currentTime (milliseconds) to seconds
    
    // Find the current frame first
    const currentFrame = aiSubtitleData.frames.find(frame => 
      currentTimeInSeconds >= frame.startTime && currentTimeInSeconds <= frame.endTime
    );
    
    if (currentFrame) {
      // Only highlight words in the current frame
      currentFrame.words.forEach(word => {
        if (currentTimeInSeconds >= word.start && currentTimeInSeconds <= word.end) {
          highlighted.add(word.id);
        }
      });
    }
    
    return highlighted;
  }, [aiSubtitleData, currentTime]);

  // Handle frame splitting with double-enter
  const handleFrameSplit = (frameId: string, wordId: string) => {
    if (!aiSubtitleData) return;

    const frameIndex = aiSubtitleData.frames.findIndex(f => f.id === frameId);
    const frame = aiSubtitleData.frames[frameIndex];
    if (!frame) return;

    const wordIndex = frame.words.findIndex(w => w.id === wordId);
    if (wordIndex === -1) return;

    // Split the frame at this word
    const firstHalf = frame.words.slice(0, wordIndex);
    const secondHalf = frame.words.slice(wordIndex);

    if (firstHalf.length === 0 || secondHalf.length === 0) return;

    // Update first frame (inherit existing style)
    const updatedFirstFrame = {
      ...frame,
      endTime: firstHalf[firstHalf.length - 1].end,
      words: firstHalf,
      isCustomBreak: true,
      style: frame.style // Inherit current style
    };

    // Create new frame for second half with guaranteed unique ID
    const generateUniqueId = (baseId: string, existingFrames: SubtitleFrame[]): string => {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      let newId = `${baseId}-split-${timestamp}-${random}`;
      
      // Ensure the ID is truly unique
      while (existingFrames.some(f => f.id === newId)) {
        newId = `${baseId}-split-${timestamp}-${Math.floor(Math.random() * 10000)}`;
      }
      return newId;
    };

    const newFrame: SubtitleFrame = {
      id: generateUniqueId(frameId, aiSubtitleData.frames),
      startTime: secondHalf[0].start,
      endTime: secondHalf[secondHalf.length - 1].end,
      words: secondHalf,
      segmentId: frame.segmentId,
      isCustomBreak: true,
      style: frame.style // Inherit current style from original frame
    };

    // Update frames array
    const updatedFrames = [
      ...aiSubtitleData.frames.slice(0, frameIndex),
      updatedFirstFrame,
      newFrame,
      ...aiSubtitleData.frames.slice(frameIndex + 1)
    ];

    // Ensure frames are always ordered by time and don't overlap
    const sortedFrames = [...updatedFrames].sort((a, b) => a.startTime - b.startTime);
    const nonOverlappingFrames = ensureNonOverlappingFrames(sortedFrames);

    const newAIData = {
      ...aiSubtitleData,
      frames: nonOverlappingFrames,
      lastModified: Date.now()
    };
    
    updateAISubtitleData(newAIData);

    // Update selection to the first split frame to maintain continuity
    if (onFrameSelect) {
      onFrameSelect(updatedFirstFrame.id);
    }
  };

  // Handle frame merging
  const handleFrameMerge = (frameId: string, direction: 'up' | 'down') => {
    if (!aiSubtitleData) return;

    const frameIndex = aiSubtitleData.frames.findIndex(f => f.id === frameId);
    const frame = aiSubtitleData.frames[frameIndex];
    if (!frame) return;

    const targetIndex = direction === 'up' ? frameIndex - 1 : frameIndex + 1;
    const targetFrame = aiSubtitleData.frames[targetIndex];
    if (!targetFrame) return;

    // Remove segment restriction - allow merging any adjacent frames

    // Merge frames
    const mergedWords = direction === 'up' 
      ? [...targetFrame.words, ...frame.words]
      : [...frame.words, ...targetFrame.words];

    const mergedFrame: SubtitleFrame = {
      id: direction === 'up' ? targetFrame.id : frame.id,
      startTime: Math.min(frame.startTime, targetFrame.startTime),
      endTime: Math.max(frame.endTime, targetFrame.endTime),
      words: mergedWords.sort((a, b) => a.start - b.start),
      segmentId: direction === 'up' ? targetFrame.segmentId : frame.segmentId, // Use the segment ID from the primary frame
      isCustomBreak: frame.isCustomBreak || targetFrame.isCustomBreak,
      style: frame.style || targetFrame.style // Inherit style from either frame
    };

    // Remove both frames and add merged frame
    const updatedFrames = aiSubtitleData.frames.filter((_, i) => 
      i !== frameIndex && i !== targetIndex
    );
    
    const insertIndex = Math.min(frameIndex, targetIndex);
    updatedFrames.splice(insertIndex, 0, mergedFrame);

    // Ensure frames are always ordered by time and don't overlap
    const sortedFrames = [...updatedFrames].sort((a, b) => a.startTime - b.startTime);
    const nonOverlappingFrames = ensureNonOverlappingFrames(sortedFrames);

    const newAIData = {
      ...aiSubtitleData,
      frames: nonOverlappingFrames,
      lastModified: Date.now()
    };
    
    updateAISubtitleData(newAIData);
    
    // Update selection to merged frame
    if (onFrameSelect) {
      onFrameSelect(mergedFrame.id);
    }
  };

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts if user is editing text
      if (editingWordId) {
        if (e.key === 'Escape') {
          setContextMenu(prev => ({ ...prev, show: false }));
          setEditingWordId(null);
        }
        return; // Exit early to prevent other shortcuts
      }

      // Don't handle shortcuts if user is typing in any input field
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true')) {
        return;
      }

      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      }
      if (e.key === 'Escape') {
        setContextMenu(prev => ({ ...prev, show: false }));
        setEditingWordId(null);
      }
      if (e.key === 'Enter' && !editingWordId && selectedWordIds.size === 1) {
        const currentTime = Date.now();
        const timeDiff = currentTime - lastEnterTime;
        
        if (timeDiff < 500) { // Double enter within 500ms
          setEnterPressCount(prev => prev + 1);
          if (enterPressCount >= 1) { // This is the second enter
            const selectedWordId = Array.from(selectedWordIds)[0];
            const frameWithWord = aiSubtitleData?.frames.find(f => 
              f.words.some(w => w.id === selectedWordId)
            );
            if (frameWithWord) {
              handleFrameSplit(frameWithWord.id, selectedWordId);
            }
            setEnterPressCount(0);
          }
        } else {
          setEnterPressCount(1);
        }
        setLastEnterTime(currentTime);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Don't handle shortcuts if user is editing text
      if (editingWordId) {
        return;
      }

      // Don't handle shortcuts if user is typing in any input field
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true')) {
        return;
      }

      if (e.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [editingWordId, selectedWordIds, aiSubtitleData, enterPressCount, lastEnterTime]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.show) {
        setContextMenu(prev => ({ ...prev, show: false }));
      }
    };

    if (contextMenu.show) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
    
    return () => {}; // Return empty cleanup function when contextMenu is not shown
  }, [contextMenu.show]);

  // Auto-select first frame when AI subtitle data loads
  useEffect(() => {
    if (aiSubtitleData?.frames && aiSubtitleData.frames.length > 0 && !selectedFrameId && onFrameSelect) {
      const firstFrameId = aiSubtitleData.frames[0].id;
      if (firstFrameId) {
        onFrameSelect(firstFrameId);
      }
    }
  }, [aiSubtitleData?.frames, selectedFrameId, onFrameSelect]);

  // Auto-scroll to active/selected frame with stronger tracking
  useEffect(() => {
    const container = listRef.current;
    if (!container || !aiSubtitleData?.frames?.length) return;
    const currentSec = currentTime / 1000;
    const active = aiSubtitleData.frames.find(f => currentSec >= f.startTime && currentSec <= f.endTime);
    const targetId = active?.id || selectedFrameId;
    if (!targetId) return;

    const el = container.querySelector(`[data-frame-id="${targetId}"]`) as HTMLElement | null;
    if (!el) return;

    const elTop = el.offsetTop;
    const elBottom = elTop + el.offsetHeight;
    const viewTop = container.scrollTop;
    const viewBottom = viewTop + container.clientHeight;
    const padding = 32;

    if (elTop < viewTop + padding) {
      container.scrollTo({ top: Math.max(0, elTop - padding), behavior: 'smooth' });
    } else if (elBottom > viewBottom - padding) {
      container.scrollTo({ top: elBottom - container.clientHeight + padding, behavior: 'smooth' });
    }
  }, [currentTime, selectedFrameId, aiSubtitleData?.frames?.length]);

  // Handle word click
  const handleWordClick = (e: React.MouseEvent, wordId: string, frameId: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Find the word and frame for seeking
    const frame = aiSubtitleData?.frames.find(f => f.id === frameId);
    const word = frame?.words.find(w => w.id === wordId);

    if (isShiftPressed) {
      // Multi-select with Shift
      setSelectedWordIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(wordId)) {
          newSet.delete(wordId);
        } else {
          newSet.add(wordId);
        }
        return newSet;
      });
    } else {
      // Single selection and show context menu
      setSelectedWordIds(new Set([wordId]));
      setContextMenu({
        show: true,
        x: e.clientX,
        y: e.clientY,
        wordId,
        frameId,
        isMultiSelect: selectedWordIds.size > 1,
        selectedWordIds: [wordId]
      });

      // Select the frame and seek to the middle of the word's time segment
      if (onFrameSelect) {
        onFrameSelect(frameId);
      }
      if (word && onTimeSeek) {
        const middleTime = (word.start + word.end) / 2; // Calculate middle of word segment
        onTimeSeek(middleTime * 1000); // Convert seconds to milliseconds
      }
    }
  };

  // Handle word double-click (edit mode)
  const handleWordDoubleClick = (wordId: string, currentWord: string) => {
    setEditingWordId(wordId);
    setEditingValue(currentWord);
    setContextMenu(prev => ({ ...prev, show: false }));
    // Focus input after state update
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Handle editing save
  const handleEditSave = () => {
    if (editingWordId && aiSubtitleData) {
      updateWordInFrames(editingWordId, editingValue, 'normal');
      setEditingWordId(null);
      setEditingValue('');
    }
  };

  // Handle editing cancel
  const handleEditCancel = () => {
    setEditingWordId(null);
    setEditingValue('');
  };

  // Handle frame click for selection
  const handleFrameClick = (frameId: string) => {
    if (onFrameSelect) {
      onFrameSelect(frameId);
    }
    
    // Also seek to the start of the selected frame to sync with timeline
    const frame = aiSubtitleData?.frames.find(f => f.id === frameId);
    if (frame && onTimeSeek) {
      onTimeSeek(frame.startTime * 1000); // Convert seconds to milliseconds
    }
  };

  // Update word in frames
  const updateWordInFrames = (wordId: string, newWord: string, newState: WordEditState) => {
    if (!aiSubtitleData) return;

    const updatedFrames = aiSubtitleData.frames.map(frame => ({
      ...frame,
      words: frame.words.map(word => 
        word.id === wordId 
          ? { ...word, word: newWord, editState: newState }
          : word
      )
    }));

    const newAIData = {
      ...aiSubtitleData,
      frames: updatedFrames,
      lastModified: Date.now()
    };
    
    updateAISubtitleData(newAIData);
  };

  // Update word in frames with previous word tracking
  const updateWordInFramesWithPrevious = (wordId: string, newWord: string, newState: WordEditState, previousWord: string) => {
    if (!aiSubtitleData) return;

    const updatedFrames = aiSubtitleData.frames.map(frame => ({
      ...frame,
      words: frame.words.map(word => 
        word.id === wordId 
          ? { ...word, word: newWord, editState: newState, previousWord: previousWord }
          : word
      )
    }));

    const newAIData = {
      ...aiSubtitleData,
      frames: updatedFrames,
      lastModified: Date.now()
    };
    
    updateAISubtitleData(newAIData);
  };

  // Export AI subtitles
  const exportAISubtitles = async (format: 'srt' | 'modified') => {
    if (!aiSubtitleData) return;

    try {
      if (format === 'srt') {
        // Use IPC to trigger SRT export
        const result = await window.electronAPI.exportAISubtitlesSRT(aiSubtitleData);
        if (result.success) {
          console.log('SRT exported successfully:', result.path);
        }
      } else if (format === 'modified') {
        // Use IPC to trigger modified video export
        if (!videoPath) {
          alert('No video file available for export.');
          return;
        }
        
        const result = await window.electronAPI.exportModifiedVideo(aiSubtitleData, videoPath, audioPath || undefined);
        if (result.success) {
          console.log('Modified video exported successfully:', result.path);
        }
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  // Handle combining multiple words
  const handleCombineWords = (wordIds: string[]) => {
    if (!aiSubtitleData || wordIds.length < 2) return;

    // Find the frame containing these words
    const frameWithWords = aiSubtitleData.frames.find(frame => 
      wordIds.every(id => frame.words.some(w => w.id === id))
    );

    if (!frameWithWords) return;

    // Sort word IDs by their position in the frame
    const sortedWords = wordIds
      .map(id => frameWithWords.words.find(w => w.id === id)!)
      .filter(Boolean)
      .sort((a, b) => a.start - b.start);

    if (sortedWords.length < 2) return;

    // Create combined word
    const combinedWord: WordSegment = {
      ...sortedWords[0],
      id: `combined-${Date.now()}`,
      word: sortedWords.map(w => w.word).join(' '),
      originalWord: sortedWords.map(w => w.originalWord).join(' '),
      end: sortedWords[sortedWords.length - 1].end
    };

    // Remove original words and add combined word
    const updatedFrames = aiSubtitleData.frames.map(frame => {
      if (frame.id !== frameWithWords.id) return frame;

      const filteredWords = frame.words.filter(w => !wordIds.includes(w.id));
      const insertIndex = filteredWords.findIndex(w => w.start > combinedWord.start);
      
      if (insertIndex === -1) {
        filteredWords.push(combinedWord);
      } else {
        filteredWords.splice(insertIndex, 0, combinedWord);
      }

      return {
        ...frame,
        words: filteredWords
      };
    });

    const newAIData = {
      ...aiSubtitleData,
      frames: updatedFrames,
      lastModified: Date.now()
    };
    
    updateAISubtitleData(newAIData);

    setSelectedWordIds(new Set([combinedWord.id]));
  };

  // Context menu actions
  const handleContextAction = (action: string) => {
    if (!contextMenu.wordId || !aiSubtitleData) return;

    const targetWordIds = contextMenu.isMultiSelect ? Array.from(selectedWordIds) : [contextMenu.wordId];
    
    targetWordIds.forEach(wordId => {
      const frame = aiSubtitleData.frames.find(f => f.words.some(w => w.id === wordId));
      const word = frame?.words.find(w => w.id === wordId);
      
      if (!word) return;

      switch (action) {
        case 'copy':
          navigator.clipboard.writeText(word.word);
          break;
        case 'edit':
          handleWordDoubleClick(wordId, word.word);
          break;
        case 'censor':
          if (word.editState === 'censored') {
            // Uncensor: restore original word
            updateWordInFrames(wordId, word.originalWord, 'normal');
          } else {
            // Censor: replace with asterisks
            const censoredWord = word.originalWord.length <= 2 
              ? '**' 
              : word.originalWord[0] + '*'.repeat(Math.max(2, word.originalWord.length - 1));
            updateWordInFrames(wordId, censoredWord, 'censored');
          }
          break;
        case 'removeCaption':
          if (word.editState === 'removedCaption') {
            // Restore: show caption again using previously stored text
            const textToRestore = word.previousWord || word.word;
            updateWordInFrames(wordId, textToRestore, 'normal');
          } else {
            // Remove caption: store current text and hide caption
            updateWordInFramesWithPrevious(wordId, word.word, 'removedCaption', word.word);
          }
          break;
        case 'restore':
          updateWordInFrames(wordId, word.originalWord, 'normal');
          break;
        case 'combine':
          handleCombineWords(Array.from(selectedWordIds));
          break;
      }
    });

    setContextMenu(prev => ({ ...prev, show: false }));
  };

  // Get tooltip text for word based on its state
  const getWordTooltip = (word: WordSegment): string => {
    switch (word.editState) {
      case 'censored':
        return 'Censored - Text replaced with asterisks';
      case 'removedCaption':
        const storedText = word.previousWord || word.word;
        return `Caption hidden (stored: "${storedText}") - Click to restore`;
      case 'normal':
        if (word.isKeyword) return 'Keyword - Highlighted word';
        return `Original: "${word.originalWord}" | Time: ${formatTimeHHMMSS(word.start)} - ${formatTimeHHMMSS(word.end)}`;
      default:
        return `Time: ${formatTimeHHMMSS(word.start)} - ${formatTimeHHMMSS(word.end)}`;
    }
  };

  // Get word style based on state
  const getWordStyle = (word: WordSegment): React.CSSProperties => {
    const isHighlighted = currentlyHighlightedWords.has(word.id);
    const isSelected = selectedWordIds.has(word.id);
    
    const baseStyle: React.CSSProperties = {
      display: 'inline-block',
      padding: '4px 6px', // Increased padding to compensate for removed border
      margin: '2px 3px',
      borderRadius: '3px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      userSelect: 'none',
      border: 'none', // Remove border completely
      outline: 'none',
      boxShadow: isSelected ? `0 0 0 2px ${theme.colors.primary}` : 'none', // Use box-shadow for selection
      position: 'relative',
      zIndex: isSelected ? 10 : 1
    };

    // Apply edit state styling
    switch (word.editState) {
      case 'censored':
        return {
          ...baseStyle,
          backgroundColor: isHighlighted ? theme.colors.warning + '60' : theme.colors.warning + '20',
          color: theme.colors.text
        };
      case 'removedCaption':
        return {
          ...baseStyle,
          textDecoration: 'line-through',
          color: theme.colors.textSecondary,
          opacity: 0.6,
          backgroundColor: isHighlighted ? theme.colors.textSecondary + '40' : 'transparent'
        };
      case 'editing':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.primary + '20',
          outline: `2px solid ${theme.colors.primary}`
        };
      default:
        if (word.isPause) {
          return {
            ...baseStyle,
            color: theme.colors.textSecondary,
            fontStyle: 'italic',
            backgroundColor: 'transparent'
          };
        }
        
        if (word.isKeyword) {
          return {
            ...baseStyle,
            backgroundColor: isHighlighted ? theme.colors.accent + '80' : theme.colors.accent + '40',
            color: theme.colors.text,
            fontWeight: 'bold'
          };
        }
        
        return {
          ...baseStyle,
          backgroundColor: isHighlighted ? theme.colors.primary + '60' : 'transparent',
          color: theme.colors.text
        };
    }
  };

  // Render context menu
  const renderContextMenu = () => {
    if (!contextMenu.show) return null;

    const word = aiSubtitleData?.frames
      .find(f => f.id === contextMenu.frameId)?.words
      .find(w => w.id === contextMenu.wordId);

    if (!word) return null;

    const isMultiSelect = selectedWordIds.size > 1;
    const isCensored = word.editState === 'censored';
    const isRemovedCaption = word.editState === 'removedCaption';

    const menuItems = [
      { icon: Copy, label: 'Copy', action: 'copy' },
      { icon: Edit3, label: 'Edit', action: 'edit' },
      ...(isMultiSelect ? [{ icon: Edit3, label: 'Combine', action: 'combine', color: theme.colors.accent }] : []),
      { icon: Hash, label: isCensored ? 'Uncensor' : 'Censor', action: 'censor', color: theme.colors.warning },
      { icon: FileX, label: isRemovedCaption ? 'Restore Caption' : 'Remove Caption', action: 'removeCaption', color: theme.colors.textSecondary }
    ];

    return (
      <div
        style={{
          position: 'fixed',
          top: contextMenu.y,
          left: contextMenu.x,
          backgroundColor: theme.colors.surface,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: '8px',
          padding: '4px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          zIndex: 1000,
          minWidth: '160px'
        }}
      >
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={() => handleContextAction(item.action)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: 'none',
              backgroundColor: 'transparent',
              color: item.color || theme.colors.text,
              cursor: 'pointer',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.background;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <item.icon size={14} />
            {item.label}
          </button>
        ))}
      </div>
    );
  };

  if (!aiSubtitleData || aiSubtitleData.frames.length === 0) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: theme.colors.textSecondary
      }}>
        No subtitle data available. Please transcribe a video first.
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: `1px solid ${theme.colors.border}`,
        backgroundColor: theme.colors.surface
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
          AI Subtitles Editor
        </h3>
        <p style={{ 
          margin: '4px 0 8px 0', 
          fontSize: '12px', 
          color: theme.colors.textSecondary 
        }}>
          {aiSubtitleData.frames.length} frames • Max {maxWordsPerFrame} words, {maxCharsPerFrame} chars per frame
        </p>
      </div>

      {/* Subtitle Frames */}
      <div
        ref={listRef as any}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '8px'
        }}
      >
        {renderFrames.map((frame, frameIndex) => (
          <div
            key={frame.id}
            data-frame-id={frame.id}
            onClick={() => handleFrameClick(frame.id)}
            style={{
              marginBottom: '8px',
              padding: '10px',
              backgroundColor: theme.colors.surface,
              borderRadius: '6px',
              border: `1px solid ${selectedFrameId === frame.id ? theme.colors.primary : theme.colors.border}`,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              lineHeight: 1.4
            }}
          >
            {/* Frame timing and controls */}
            <div style={{
              fontSize: '12px',
              color: theme.colors.textSecondary,
              marginBottom: '8px',
              fontFamily: 'monospace',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{formatTimeHHMMSS(frame.startTime)} - {formatTimeHHMMSS(frame.endTime)}</span>
                {frame.isCustomBreak && (
                  <span style={{
                    fontSize: '10px',
                    backgroundColor: theme.colors.accent + '40',
                    color: theme.colors.accent,
                    padding: '2px 6px',
                    borderRadius: '12px',
                    fontWeight: '500'
                  }}>
                    Custom Break
                  </span>
                )}
              </div>
              
              {/* Merge Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {/* Merge Up Button - Always visible and enabled when there's a frame above */}
                <button
                  onClick={() => handleFrameMerge(frame.id, 'up')}
                  disabled={frameIndex === 0}
                  style={{
                    padding: '4px',
                    backgroundColor: 'transparent',
                    color: frameIndex > 0 
                      ? theme.colors.textSecondary 
                      : theme.colors.textMuted,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: '4px',
                    cursor: frameIndex > 0 
                      ? 'pointer' 
                      : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    opacity: frameIndex > 0 ? 1 : 0.5
                  }}
                  onMouseEnter={(e) => {
                    if (frameIndex > 0) {
                      e.currentTarget.style.backgroundColor = theme.colors.background;
                      e.currentTarget.style.color = theme.colors.primary;
                      e.currentTarget.style.borderColor = theme.colors.primary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = frameIndex > 0 
                      ? theme.colors.textSecondary 
                      : theme.colors.textMuted;
                    e.currentTarget.style.borderColor = theme.colors.border;
                  }}
                  title="Merge with frame above"
                >
                  <ChevronUp size={16} />
                </button>
                
                {/* Merge Down Button - Always visible and enabled when there's a frame below */}
                <button
                  onClick={() => handleFrameMerge(frame.id, 'down')}
                  disabled={frameIndex === renderFrames.length - 1}
                  style={{
                    padding: '4px',
                    backgroundColor: 'transparent',
                    color: frameIndex < renderFrames.length - 1 
                      ? theme.colors.textSecondary 
                      : theme.colors.textMuted,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: '4px',
                    cursor: frameIndex < renderFrames.length - 1 
                      ? 'pointer' 
                      : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    opacity: frameIndex < renderFrames.length - 1 ? 1 : 0.5
                  }}
                  onMouseEnter={(e) => {
                    if (frameIndex < renderFrames.length - 1) {
                      e.currentTarget.style.backgroundColor = theme.colors.background;
                      e.currentTarget.style.color = theme.colors.primary;
                      e.currentTarget.style.borderColor = theme.colors.primary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = frameIndex < renderFrames.length - 1 
                      ? theme.colors.textSecondary 
                      : theme.colors.textMuted;
                    e.currentTarget.style.borderColor = theme.colors.border;
                  }}
                  title="Merge with frame below"
                >
                  <ChevronDown size={16} />
                </button>
              </div>
            </div>

            {/* Words */}
            <div style={{
              lineHeight: '1.6',
              fontSize: '16px'
            }}>
              {frame.words.map((word) => (
                editingWordId === word.id ? (
                  <input
                    key={word.id}
                    ref={inputRef}
                    value={editingValue}
                    onChange={(e) => {
                      e.stopPropagation();
                      setEditingValue(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation(); // Prevent event bubbling
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleEditSave();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        handleEditCancel();
                      }
                    }}
                    onBlur={handleEditSave}
                    style={{
                      display: 'inline-block',
                      padding: '2px 4px',
                      margin: '1px',
                      border: `2px solid ${theme.colors.primary}`,
                      borderRadius: '3px',
                      backgroundColor: theme.colors.background,
                      color: theme.colors.text,
                      fontSize: 'inherit',
                      minWidth: '60px'
                    }}
                  />
                ) : (
                  <span
                    key={word.id}
                    style={getWordStyle(word)}
                    onClick={(e) => handleWordClick(e, word.id, frame.id)}
                    onDoubleClick={() => handleWordDoubleClick(word.id, word.word)}
                    title={getWordTooltip(word)}
                  >
                    {word.word}
                  </span>
                )
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Help Text */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: theme.colors.surface,
        borderTop: `1px solid ${theme.colors.border}`,
        fontSize: '12px',
        color: theme.colors.textSecondary,
        lineHeight: '1.4'
      }}>
        <div><strong>Controls:</strong></div>
        <div>• Single click: Select word & show context menu</div>
        <div>• Double click: Edit word</div>
        <div>• Shift + click: Multi-select words</div>
        <div>• Double Enter: Split frame at selected word</div>
        <div>• Use merge buttons (↑↓) to combine frames</div>
        <div>• Cmd/Ctrl + Z: Undo all changes</div>
      </div>

      {/* Context Menu */}
      {renderContextMenu()}
    </div>
  );
};

export default AISubtitlesPanel;