import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { 
  WordSegment, 
  SubtitleFrame, 
  AISubtitleData, 
  WordEditState,
} from '../../types';
import { Copy, Edit3, Star, VolumeX, Hash, FileX, Trash2, RotateCcw, ChevronUp, ChevronDown, Merge } from 'lucide-react';

interface AISubtitlesPanelProps {
  currentTime: number;
  onTimeSeek: (time: number) => void;
  maxWordsPerFrame?: number;
  maxCharsPerFrame?: number;
  aiSubtitleData?: AISubtitleData | null;
  onAISubtitleUpdate?: (data: AISubtitleData | null) => void;
  selectedFrameId?: string | null;
  onFrameSelect?: (frameId: string) => void;
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
  onFrameSelect
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

  // AI Subtitles are now the primary data source - no conversion needed

  // Always use sorted frames directly from aiSubtitleData - no local state needed
  const renderFrames = useMemo(() => {
    if (!aiSubtitleData) return [] as SubtitleFrame[];
    return [...aiSubtitleData.frames].sort((a, b) => a.startTime - b.startTime);
  }, [aiSubtitleData?.frames]);

  // Get currently highlighted words based on current time
  const currentlyHighlightedWords = useMemo(() => {
    if (!aiSubtitleData) return new Set<string>();
    
    const highlighted = new Set<string>();
    const currentTimeInSeconds = currentTime / 1000; // Convert currentTime (milliseconds) to seconds
    aiSubtitleData.frames.forEach(frame => {
      frame.words.forEach(word => {
        if (currentTimeInSeconds >= word.start && currentTimeInSeconds <= word.end) {
          highlighted.add(word.id);
        }
      });
    });
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

    // Update first frame
    const updatedFirstFrame = {
      ...frame,
      endTime: firstHalf[firstHalf.length - 1].end,
      words: firstHalf,
      isCustomBreak: true
    };

    // Create new frame for second half
    const newFrame: SubtitleFrame = {
      id: `${frameId}-split-${Date.now()}`,
      startTime: secondHalf[0].start,
      endTime: secondHalf[secondHalf.length - 1].end,
      words: secondHalf,
      segmentId: frame.segmentId,
      isCustomBreak: true
    };

    // Update frames array
    const updatedFrames = [
      ...aiSubtitleData.frames.slice(0, frameIndex),
      updatedFirstFrame,
      newFrame,
      ...aiSubtitleData.frames.slice(frameIndex + 1)
    ];

    // Ensure frames are always ordered by time for immediate correct UI order
    const sortedFrames = [...updatedFrames].sort((a, b) => a.startTime - b.startTime);


    const newAIData = {
      ...aiSubtitleData,
      frames: sortedFrames,
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

    // Check if frames belong to the same original segment
    if (frame.segmentId !== targetFrame.segmentId) return;

    // Merge frames
    const mergedWords = direction === 'up' 
      ? [...targetFrame.words, ...frame.words]
      : [...frame.words, ...targetFrame.words];

    const mergedFrame: SubtitleFrame = {
      id: direction === 'up' ? targetFrame.id : frame.id,
      startTime: Math.min(frame.startTime, targetFrame.startTime),
      endTime: Math.max(frame.endTime, targetFrame.endTime),
      words: mergedWords.sort((a, b) => a.start - b.start),
      segmentId: frame.segmentId,
      isCustomBreak: frame.isCustomBreak || targetFrame.isCustomBreak
    };

    // Remove both frames and add merged frame
    const updatedFrames = aiSubtitleData.frames.filter((_, i) => 
      i !== frameIndex && i !== targetIndex
    );
    
    const insertIndex = Math.min(frameIndex, targetIndex);
    updatedFrames.splice(insertIndex, 0, mergedFrame);

    // Ensure frames are always ordered by time for immediate correct UI order
    const sortedFrames = [...updatedFrames].sort((a, b) => a.startTime - b.startTime);


    const newAIData = {
      ...aiSubtitleData,
      frames: sortedFrames,
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

  // Auto-scroll to the frame that contains the current playhead time
  useEffect(() => {
    if (!containerRef.current || !aiSubtitleData?.frames?.length) return;
    const currentSec = currentTime / 1000;
    const activeFrame = aiSubtitleData.frames.find(f => currentSec >= f.startTime && currentSec <= f.endTime);
    const targetId = activeFrame?.id || selectedFrameId;
    if (!targetId) return;

    const el = containerRef.current.querySelector(`[data-frame-id="${targetId}"]`) as HTMLElement | null;
    if (el) {
      const container = containerRef.current;
      const elTop = el.offsetTop;
      const elBottom = elTop + el.offsetHeight;
      const viewTop = container.scrollTop;
      const viewBottom = viewTop + container.clientHeight;
      if (elTop < viewTop || elBottom > viewBottom) {
        container.scrollTo({ top: elTop - 24, behavior: 'smooth' });
      }
    }
  }, [currentTime, selectedFrameId, aiSubtitleData?.frames]);

  // Handle word click
  const handleWordClick = (e: React.MouseEvent, wordId: string, frameId: string) => {
    e.preventDefault();
    e.stopPropagation();

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
        const result = await window.electronAPI.exportModifiedVideo(aiSubtitleData);
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
        case 'keyword':
          updateWordInFrames(wordId, word.word, 'normal');
          // Toggle keyword status
          const updatedFrames = aiSubtitleData.frames.map(f => ({
            ...f,
            words: f.words.map(w => 
              w.id === wordId ? { ...w, isKeyword: !w.isKeyword } : w
            )
          }));
          const newAIData = { ...aiSubtitleData, frames: updatedFrames, lastModified: Date.now() };
          updateAISubtitleData(newAIData);
          break;
        case 'silence':
          // Keep word visible but remove audio (placeholder for future implementation)
          break;
        case 'censor':
          const censoredWord = word.originalWord.length <= 2 
            ? '**' 
            : word.originalWord[0] + '*'.repeat(Math.max(2, word.originalWord.length - 1));
          updateWordInFrames(wordId, censoredWord, 'censored');
          break;
        case 'removeCaption':
          updateWordInFrames(wordId, word.word, 'removedCaption');
          break;
        case 'cutFromVideo':
          updateWordInFrames(wordId, word.word, 'strikethrough');
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

  // Get word style based on state
  const getWordStyle = (word: WordSegment): React.CSSProperties => {
    const isHighlighted = currentlyHighlightedWords.has(word.id);
    const isSelected = selectedWordIds.has(word.id);
    
    const baseStyle: React.CSSProperties = {
      display: 'inline-block',
      padding: '2px 4px',
      margin: '1px',
      borderRadius: '3px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      userSelect: 'none',
      border: isSelected ? `2px solid ${theme.colors.primary}` : '2px solid transparent'
    };

    // Apply edit state styling
    switch (word.editState) {
      case 'strikethrough':
        return {
          ...baseStyle,
          textDecoration: 'line-through',
          color: theme.colors.textSecondary,
          backgroundColor: isHighlighted ? theme.colors.error + '40' : 'transparent'
        };
      case 'censored':
        return {
          ...baseStyle,
          backgroundColor: isHighlighted ? theme.colors.warning + '60' : theme.colors.warning + '20',
          color: theme.colors.text
        };
      case 'removedCaption':
        return {
          ...baseStyle,
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

    const isStrikethrough = word.editState === 'strikethrough';
    const isMultiSelect = selectedWordIds.size > 1;

    const menuItems = isStrikethrough 
      ? [{ icon: RotateCcw, label: 'Restore', action: 'restore', color: theme.colors.success }]
      : [
          { icon: Copy, label: 'Copy', action: 'copy' },
          { icon: Edit3, label: 'Edit', action: 'edit' },
          ...(isMultiSelect ? [{ icon: Edit3, label: 'Combine', action: 'combine', color: theme.colors.accent }] : []),
          { icon: Star, label: 'Keyword', action: 'keyword', color: theme.colors.warning },
          { icon: VolumeX, label: 'Silence', action: 'silence', color: theme.colors.info },
          { icon: Hash, label: 'Censor', action: 'censor', color: theme.colors.warning },
          { icon: FileX, label: 'Remove Caption', action: 'removeCaption', color: theme.colors.textSecondary },
          { icon: Trash2, label: 'Cut from Video', action: 'cutFromVideo', color: theme.colors.error }
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
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '16px'
      }}>
        {renderFrames.map((frame, frameIndex) => (
          <div
            key={frame.id}
            data-frame-id={frame.id}
            onClick={() => handleFrameClick(frame.id)}
            style={{
              marginBottom: '24px',
              padding: '16px',
              backgroundColor: selectedFrameId === frame.id ? theme.colors.primary + '20' : theme.colors.surface,
              borderRadius: '8px',
              border: selectedFrameId === frame.id 
                ? `2px solid ${theme.colors.primary}` 
                : `1px solid ${theme.colors.border}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
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
                <span>{(frame.startTime).toFixed(2)}s - {(frame.endTime).toFixed(2)}s</span>
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
                {/* Merge Up Button */}
                {frameIndex > 0 && renderFrames[frameIndex - 1]?.segmentId === frame.segmentId && (
                  <button
                    onClick={() => handleFrameMerge(frame.id, 'up')}
                    style={{
                      padding: '4px',
                      backgroundColor: 'transparent',
                      color: theme.colors.textSecondary,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.colors.background;
                      e.currentTarget.style.color = theme.colors.primary;
                      e.currentTarget.style.borderColor = theme.colors.primary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = theme.colors.textSecondary;
                      e.currentTarget.style.borderColor = theme.colors.border;
                    }}
                    title="Merge with frame above"
                  >
                    <ChevronUp size={16} />
                  </button>
                )}
                
                {/* Merge Down Button */}
                {frameIndex < renderFrames.length - 1 && renderFrames[frameIndex + 1]?.segmentId === frame.segmentId && (
                  <button
                    onClick={() => handleFrameMerge(frame.id, 'down')}
                    style={{
                      padding: '4px',
                      backgroundColor: 'transparent',
                      color: theme.colors.textSecondary,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.colors.background;
                      e.currentTarget.style.color = theme.colors.primary;
                      e.currentTarget.style.borderColor = theme.colors.primary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = theme.colors.textSecondary;
                      e.currentTarget.style.borderColor = theme.colors.border;
                    }}
                    title="Merge with frame below"
                  >
                    <ChevronDown size={16} />
                  </button>
                )}
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
        <div>• Right-click strikethrough words to restore</div>
      </div>

      {/* Context Menu */}
      {renderContextMenu()}
    </div>
  );
};

export default AISubtitlesPanel;