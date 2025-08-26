import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { 
  WordSegment, 
  SubtitleFrame, 
  AISubtitleData, 
  WordEditState,
  VideoClip,
} from '../../types';
import { Copy, Edit3, Hash, FileX, ChevronUp, ChevronDown, HelpCircle, Scissors } from 'lucide-react';
import CompactSearchReplace from './CompactSearchReplace';
import { formatTimeHHMMSS } from '../../utils/timeFormatting';
import { LiquidModal } from './ui';

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
  // New: Clip editing support
  clips?: VideoClip[];
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
  audioPath,
  clips = [],
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);
  const [searchHighlight, setSearchHighlight] = useState<{frameId: string, wordIndex: number} | null>(null);
  const [splitModal, setSplitModal] = useState<{show: boolean, wordId: string, originalText: string}>({
    show: false,
    wordId: '',
    originalText: ''
  });
  const [splitInput, setSplitInput] = useState('');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Convert original time to effective time (accounting for removed clips)
  const convertToEffectiveTime = useCallback((originalTimeSeconds: number): number => {
    if (!clips?.length) return originalTimeSeconds;
    
    const originalTimeMs = originalTimeSeconds * 1000;
    let effectiveTimeMs = originalTimeMs;
    
    // Subtract duration of all removed clips that start before this time
    const deletedClips = clips.filter(clip => clip.isRemoved && clip.startTime < originalTimeMs);
    
    for (const clip of deletedClips) {
      const clipDuration = clip.endTime - clip.startTime;
      effectiveTimeMs -= clipDuration;
    }
    
    return Math.max(0, effectiveTimeMs / 1000);
  }, [clips]);

  // Convert effective time back to original time (for finding frames in original timeline)
  const convertToOriginalTime = useCallback((effectiveTimeSeconds: number): number => {
    if (!clips?.length) return effectiveTimeSeconds;
    
    const effectiveTimeMs = effectiveTimeSeconds * 1000;
    let originalTimeMs = effectiveTimeMs;
    
    // Add back duration of all removed clips that start before this effective time
    const activeClips = clips.filter(clip => !clip.isRemoved);
    let currentEffectiveTime = 0;
    
    for (const clip of activeClips) {
      const clipDuration = clip.endTime - clip.startTime;
      if (effectiveTimeMs <= currentEffectiveTime + clipDuration) {
        // Time falls within this clip
        const timeWithinClip = effectiveTimeMs - currentEffectiveTime;
        originalTimeMs = clip.startTime + timeWithinClip;
        break;
      }
      currentEffectiveTime += clipDuration;
    }
    
    return originalTimeMs / 1000;
  }, [clips]);

  // Filter subtitle frames based on clips (hide subtitles in removed clips)
  const filteredFrames = useMemo(() => {
    if (!aiSubtitleData?.frames) {
      return [];
    }

    // If no clips exist, return all frames
    if (clips.length === 0) {
      return aiSubtitleData.frames;
    }

    // Check if there are any removed clips
    const hasRemovedClips = clips.some(clip => clip.isRemoved);
    if (!hasRemovedClips) {
      return aiSubtitleData.frames;
    }

    const filtered = aiSubtitleData.frames.filter(frame => {
      // Check if this frame overlaps with any removed clip
      const frameStartMs = frame.startTime * 1000;
      const frameEndMs = frame.endTime * 1000;
      
      const isInRemovedClip = clips.some(clip => 
        clip.isRemoved && 
        frameStartMs < clip.endTime && 
        frameEndMs > clip.startTime
      );
      
      return !isInRemovedClip;
    });

    // Convert times to effective times for the remaining frames when clips are removed
    const adjustedFrames = hasRemovedClips ? filtered.map(frame => {
      // Calculate effective time by subtracting removed clip durations
      let effectiveStartTime = frame.startTime;
      let effectiveEndTime = frame.endTime;
      
      const frameStartMs = frame.startTime * 1000;
      const frameEndMs = frame.endTime * 1000;
      
      // Calculate how much time to subtract from removed clips that come before this frame
      const removedClips = clips.filter(clip => clip.isRemoved);
      let timeToSubtract = 0;
      
      for (const clip of removedClips) {
        if (clip.endTime <= frameStartMs) {
          // Entire clip is before this frame
          timeToSubtract += (clip.endTime - clip.startTime);
        }
      }
      
      effectiveStartTime = Math.max(0, (frameStartMs - timeToSubtract) / 1000);
      effectiveEndTime = Math.max(0, (frameEndMs - timeToSubtract) / 1000);
      
      return {
        ...frame,
        startTime: effectiveStartTime,
        endTime: effectiveEndTime,
        words: frame.words.map(word => {
          const wordStartMs = word.start * 1000;
          const wordEndMs = word.end * 1000;
          
          let wordTimeToSubtract = 0;
          for (const clip of removedClips) {
            if (clip.endTime <= wordStartMs) {
              wordTimeToSubtract += (clip.endTime - clip.startTime);
            }
          }
          
          return {
            ...word,
            start: Math.max(0, (wordStartMs - wordTimeToSubtract) / 1000),
            end: Math.max(0, (wordEndMs - wordTimeToSubtract) / 1000)
          };
        })
      };
    }) : filtered;
    
    return adjustedFrames;
  }, [aiSubtitleData?.frames, clips]);

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
    if (!filteredFrames) return [] as SubtitleFrame[];
    
    const frames = [...filteredFrames];
    const seenIds = new Set<string>();
    const fixedFrames = frames.map((frame, index) => {
      if (seenIds.has(frame.id)) {
        // Generate a new unique ID for duplicate frames (deterministic suffix)
        const newId = `${frame.id}-dup-${index}`;
        // console.warn suppressed to avoid noisy logs
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
      const fixedData = { 
        ...aiSubtitleData, 
        frames: nonOverlappingFrames, 
        lastModified: Date.now(),
        audioSegments: aiSubtitleData?.audioSegments || [],
        maxWordsPerFrame: aiSubtitleData?.maxWordsPerFrame || 5,
        maxCharsPerFrame: aiSubtitleData?.maxCharsPerFrame || 30
      };
      // Schedule the update for the next tick to avoid infinite re-renders
      setTimeout(() => updateAISubtitleData(fixedData), 0);
    }
    
    return nonOverlappingFrames.sort((a, b) => a.startTime - b.startTime);
  }, [filteredFrames, aiSubtitleData]);

  // Get currently highlighted words based on current time
  const currentlyHighlightedWords = useMemo(() => {
    if (!renderFrames?.length) return new Set<string>();
    
    const highlighted = new Set<string>();
    
    // Convert current time to effective time to match with frame times
    let effectiveCurrentTime = currentTime / 1000;
    
    // If there are removed clips, convert original time to effective time
    const hasRemovedClips = clips.some(clip => clip.isRemoved);
    if (hasRemovedClips) {
      const currentTimeMs = currentTime;
      const removedClips = clips.filter(clip => clip.isRemoved);
      let timeToSubtract = 0;
      
      for (const clip of removedClips) {
        if (clip.endTime <= currentTimeMs) {
          // Entire clip is before current time
          timeToSubtract += (clip.endTime - clip.startTime);
        }
      }
      
      effectiveCurrentTime = Math.max(0, (currentTimeMs - timeToSubtract) / 1000);
    }
    
    // Find the current frame using effective time
    const currentFrame = renderFrames.find(frame => 
      effectiveCurrentTime >= frame.startTime && effectiveCurrentTime <= frame.endTime
    );
    
    if (currentFrame) {
      // Only highlight words in the current frame
      currentFrame.words.forEach(word => {
        if (effectiveCurrentTime >= word.start && effectiveCurrentTime <= word.end) {
          highlighted.add(word.id);
        }
      });
    }
    
    return highlighted;
  }, [renderFrames, currentTime, clips]);

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
        // Check if we're in the search component - if so, don't handle Ctrl+F here
        const searchContainer = document.querySelector('[data-search-container]');
        const isWithinSearchComponent = searchContainer && searchContainer.contains(target);
        
        // Only handle Ctrl+F if not within search component
        if ((e.metaKey || e.ctrlKey) && e.key === 'f' && !isWithinSearchComponent) {
          e.preventDefault();
          setIsSearchOpen(true);
        }
        return;
      }

      // Don't handle shortcuts if split modal is open (after input field check)
      if (splitModal.show) {
        return; // Let the modal handle its own keyboard events
      }

      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      }
      if (e.key === 'Escape') {
        if (splitModal.show) {
          handleSplitCancel();
        } else {
          setContextMenu(prev => ({ ...prev, show: false }));
          setEditingWordId(null);
        }
      }
      // Search and replace shortcut
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
      }

      // Context menu shortcuts
      if (selectedWordIds.size > 0) {
        const selectedWordId = Array.from(selectedWordIds)[0];
        const frame = renderFrames.find(f => f.words.some(w => w.id === selectedWordId));
        const word = frame?.words.find(w => w.id === selectedWordId);

        if (word) {
          if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
            e.preventDefault();
            navigator.clipboard.writeText(word.word);
          } else if (e.key === 'F2') {
            e.preventDefault();
            handleWordDoubleClick(selectedWordId, word.word);
          } else if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
            e.preventDefault();
            handleSplitWord(selectedWordId);
          } else if ((e.metaKey || e.ctrlKey) && e.key === 'm' && selectedWordIds.size > 1) {
            e.preventDefault();
            handleCombineWords(Array.from(selectedWordIds));
          } else if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
            e.preventDefault();
            if (word.editState === 'censored') {
              updateWordInFrames(selectedWordId, word.originalWord, 'normal');
            } else {
              const censoredWord = word.originalWord.length <= 2 
                ? '**' 
                : word.originalWord[0] + '*'.repeat(Math.max(2, word.originalWord.length - 1));
              updateWordInFrames(selectedWordId, censoredWord, 'censored');
            }
          } else if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
            e.preventDefault();
            if (word.editState === 'removedCaption') {
              const textToRestore = word.previousWord || word.word;
              updateWordInFrames(selectedWordId, textToRestore, 'normal');
            } else {
              updateWordInFramesWithPrevious(selectedWordId, word.word, 'removedCaption', word.word);
            }
          }
        }
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
  }, [editingWordId, selectedWordIds, aiSubtitleData, enterPressCount, lastEnterTime, isSearchOpen, splitModal.show]);

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

  // Auto-select first frame if none selected
  useEffect(() => {
    if (filteredFrames && filteredFrames.length > 0 && !selectedFrameId && onFrameSelect) {
      onFrameSelect(filteredFrames[0].id);
    }
  }, [filteredFrames, selectedFrameId, onFrameSelect]);

  // Auto-scroll to selected frame
  useEffect(() => {
    const container = listRef.current;
    if (!container || !renderFrames?.length) return;
    
    // Convert current time to effective time to match with frame times
    let effectiveCurrentTime = currentTime / 1000;
    
    // If there are removed clips, convert original time to effective time
    const hasRemovedClips = clips.some(clip => clip.isRemoved);
    if (hasRemovedClips) {
      const currentTimeMs = currentTime;
      const removedClips = clips.filter(clip => clip.isRemoved);
      let timeToSubtract = 0;
      
      for (const clip of removedClips) {
        if (clip.endTime <= currentTimeMs) {
          // Entire clip is before current time
          timeToSubtract += (clip.endTime - clip.startTime);
        }
      }
      
      effectiveCurrentTime = Math.max(0, (currentTimeMs - timeToSubtract) / 1000);
    }
    
    // Find frame that contains the effective current time
    const currentFrame = renderFrames.find(frame => 
      effectiveCurrentTime >= frame.startTime && effectiveCurrentTime <= frame.endTime
    );
    
    const targetFrameId = currentFrame?.id || selectedFrameId;
    
    if (targetFrameId) {
      const selectedElement = container.querySelector(`[data-frame-id="${targetFrameId}"]`) as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    }
  }, [currentTime, selectedFrameId, renderFrames?.length, clips]);

  // Find frame by ID
  const findFrameById = useCallback((frameId: string) => {
    const frame = filteredFrames.find(f => f.id === frameId);
    return frame;
  }, [filteredFrames]);

  // Handle word click
  const handleWordClick = (e: React.MouseEvent, wordId: string, frameId: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Find the word and frame for seeking
    const frame = renderFrames.find(f => f.id === frameId);
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
    setSearchHighlight(null); // Clear search highlight when editing
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
    const frame = renderFrames.find(f => f.id === frameId);
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
    const frameWithWords = renderFrames.find(frame => 
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

  // Handle splitting a word into multiple words
  const handleSplitWord = (wordId: string) => {
    console.log('handleSplitWord called with wordId:', wordId);
    
    if (!aiSubtitleData) {
      console.log('No aiSubtitleData');
      return;
    }

    // Find the frame containing this word
    const frameWithWord = renderFrames.find(frame => 
      frame.words.some(w => w.id === wordId)
    );

    if (!frameWithWord) {
      console.log('No frame found for word');
      return;
    }

    const word = frameWithWord.words.find(w => w.id === wordId);
    if (!word) {
      console.log('No word found');
      return;
    }
    
    console.log('Found word to split:', word.word);

    // Show split modal
    const originalText = word.word;
    setSplitInput(originalText);
    setSplitModal({
      show: true,
      wordId: wordId,
      originalText: originalText
    });
  };

  // Handle split modal confirm
  const handleSplitConfirm = () => {
    const { wordId } = splitModal;
    const userInput = splitInput.trim();
    
    if (!userInput) {
      // No input provided
      setSplitModal({ show: false, wordId: '', originalText: '' });
      setSplitInput('');
      return;
    }

    // Find the word and frame again
    const frameWithWord = renderFrames.find(frame => 
      frame.words.some(w => w.id === wordId)
    );
    
    if (!frameWithWord || !aiSubtitleData) {
      setSplitModal({ show: false, wordId: '', originalText: '' });
      setSplitInput('');
      return;
    }

    const word = frameWithWord.words.find(w => w.id === wordId);
    if (!word) {
      setSplitModal({ show: false, wordId: '', originalText: '' });
      setSplitInput('');
      return;
    }

    // Split the input by spaces
    const splitWords = userInput.split(/\s+/).filter(w => w.length > 0);
    
    if (splitWords.length <= 1) {
      // Only one word - update the existing word if text changed
      if (userInput !== splitModal.originalText.trim()) {
        updateWordInFrames(wordId, userInput, word.editState || 'normal');
      }
      setSplitModal({ show: false, wordId: '', originalText: '' });
      setSplitInput('');
      return;
    }

    // Calculate timing for each word based on character length
    const totalDuration = word.end - word.start;
    const totalChars = splitWords.reduce((sum, w) => sum + w.length, 0);
    
    let currentStart = word.start;
    const newWordSegments: WordSegment[] = [];

    splitWords.forEach((splitWord, index) => {
      const wordDuration = totalChars > 0 ? (splitWord.length / totalChars) * totalDuration : totalDuration / splitWords.length;
      const wordEnd = index === splitWords.length - 1 ? word.end : currentStart + wordDuration;

      newWordSegments.push({
        id: `${wordId}-split-${index}-${Date.now()}`,
        word: splitWord,
        originalWord: splitWord,
        start: currentStart,
        end: wordEnd,
        editState: word.editState || 'normal',
        isKeyword: word.isKeyword,
        isPause: false
      });

      currentStart = wordEnd;
    });

    // Update the frame with split words
    const updatedFrames = aiSubtitleData.frames.map(frame => {
      if (frame.id !== frameWithWord.id) return frame;

      // Find the original word index
      const wordIndex = frame.words.findIndex(w => w.id === wordId);
      if (wordIndex === -1) return frame;

      // Replace the original word with split words
      const newWords = [
        ...frame.words.slice(0, wordIndex),
        ...newWordSegments,
        ...frame.words.slice(wordIndex + 1)
      ];

      return {
        ...frame,
        words: newWords
      };
    });

    const newAIData = {
      ...aiSubtitleData,
      frames: updatedFrames,
      lastModified: Date.now()
    };
    
    updateAISubtitleData(newAIData);

    // Select the first split word
    setSelectedWordIds(new Set([newWordSegments[0].id]));

    // Close modal
    setSplitModal({ show: false, wordId: '', originalText: '' });
    setSplitInput('');
  };

  // Handle split modal cancel
  const handleSplitCancel = () => {
    setSplitModal({ show: false, wordId: '', originalText: '' });
    setSplitInput('');
  };

  // Context menu actions
  const handleContextAction = (action: string) => {
    if (!contextMenu.wordId || !aiSubtitleData) return;

    const targetWordIds = contextMenu.isMultiSelect ? Array.from(selectedWordIds) : [contextMenu.wordId];
    
    targetWordIds.forEach(wordId => {
      const frame = renderFrames.find(f => f.words.some(w => w.id === wordId));
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
        case 'split':
          handleSplitWord(wordId);
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
  const getWordStyle = (word: WordSegment, frameId: string, wordIndex: number): React.CSSProperties => {
    const isHighlighted = currentlyHighlightedWords.has(word.id);
    const isSelected = selectedWordIds.has(word.id);
    const isEditing = editingWordId === word.id;
    const isSearchHighlighted = !isEditing && searchHighlight && 
      searchHighlight.frameId === frameId && 
      searchHighlight.wordIndex === wordIndex;
    
    const baseStyle: React.CSSProperties = {
      display: 'inline-block',
      padding: '2px 4px', // Reduced padding for more compact display
      margin: '1px 2px', // Reduced margins
      borderRadius: '2px', // Smaller border radius
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      userSelect: 'none',
      border: 'none', // Remove border completely
      outline: 'none',
      boxShadow: isSelected ? `0 0 0 2px ${theme.colors.primary}` : 'none', // Use box-shadow for selection
      position: 'relative',
      zIndex: isSelected ? 10 : 1,
      fontSize: '12px' // Smaller font size for words
    };

    // Apply edit state styling
    switch (word.editState) {
      case 'censored':
        return {
          ...baseStyle,
          backgroundColor: isSearchHighlighted ? '#ffeb3b' : (isHighlighted ? theme.colors.warning + '60' : theme.colors.warning + '20'),
          color: theme.colors.text
        };
      case 'removedCaption':
        return {
          ...baseStyle,
          textDecoration: 'line-through',
          color: theme.colors.textSecondary,
          opacity: 0.6,
          backgroundColor: isSearchHighlighted ? '#ffeb3b' : (isHighlighted ? theme.colors.textSecondary + '40' : 'transparent')
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
            backgroundColor: isSearchHighlighted ? '#ffeb3b' : (isHighlighted ? theme.colors.accent + '80' : theme.colors.accent + '40'),
            color: theme.colors.text,
            fontWeight: 'bold'
          };
        }
        
        return {
          ...baseStyle,
          backgroundColor: isSearchHighlighted ? '#ffeb3b' : (isHighlighted ? theme.colors.primary + '60' : 'transparent'),
          color: theme.colors.text
        };
    }
  };

  // Render context menu
  const renderContextMenu = () => {
    if (!contextMenu.show) return null;

    const word = renderFrames
      .find(f => f.id === contextMenu.frameId)?.words
      .find(w => w.id === contextMenu.wordId);

    if (!word) return null;

    const isMultiSelect = selectedWordIds.size > 1;
    const isCensored = word.editState === 'censored';
    const isRemovedCaption = word.editState === 'removedCaption';

    const canSplit = !isMultiSelect;

    const menuItems = [
      { icon: Copy, label: 'Copy', action: 'copy', shortcut: 'Ctrl+C' },
      { icon: Edit3, label: 'Edit', action: 'edit', shortcut: 'F2' },
      ...(isMultiSelect ? [{ icon: Edit3, label: 'Combine', action: 'combine', color: theme.colors.accent, shortcut: 'Ctrl+M' }] : []),
      ...(canSplit ? [{ icon: Scissors, label: 'Split', action: 'split', color: theme.colors.accent, shortcut: 'Ctrl+D' }] : []),
      { icon: Hash, label: isCensored ? 'Uncensor' : 'Censor', action: 'censor', color: theme.colors.warning, shortcut: 'Ctrl+H' },
      { icon: FileX, label: isRemovedCaption ? 'Restore Caption' : 'Remove Caption', action: 'removeCaption', color: theme.colors.textSecondary, shortcut: 'Ctrl+R' }
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
              justifyContent: 'space-between',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <item.icon size={14} />
              {item.label}
            </div>
            {item.shortcut && (
              <span style={{
                fontSize: '12px',
                color: theme.colors.textMuted,
                fontFamily: 'monospace'
              }}>
                {item.shortcut}
              </span>
            )}
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
        padding: '12px',
        borderBottom: `1px solid ${theme.colors.border}`,
        backgroundColor: theme.colors.surface
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
            AI Subtitles Editor
          </h3>
          <div style={{ position: 'relative' }}>
            <button
              onMouseEnter={() => setShowHelpTooltip(true)}
              onMouseLeave={() => setShowHelpTooltip(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: theme.colors.textSecondary,
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <HelpCircle size={14} />
            </button>
            {showHelpTooltip && (
              <div
                style={{
                  position: 'absolute',
                  top: '24px',
                  left: '-120px',
                  width: '280px',
                  backgroundColor: theme.colors.surface,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: '4px',
                  padding: '8px',
                  fontSize: '11px',
                  color: theme.colors.text,
                  zIndex: 1000,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Keyboard Shortcuts:</div>
                <div>• <strong>Ctrl/Cmd + F:</strong> Search & Replace</div>
                <div>• <strong>Ctrl/Cmd + C:</strong> Copy selected word</div>
                <div>• <strong>F2:</strong> Edit selected word</div>
                <div>• <strong>Ctrl/Cmd + D:</strong> Split selected word</div>
                <div>• <strong>Ctrl/Cmd + M:</strong> Combine selected words</div>
                <div>• <strong>Ctrl/Cmd + H:</strong> Censor/Uncensor word</div>
                <div>• <strong>Ctrl/Cmd + R:</strong> Remove/Restore caption</div>
                <div>• <strong>Single click:</strong> Select word & show context menu</div>
                <div>• <strong>Double click:</strong> Edit word</div>
                <div>• <strong>Shift + click:</strong> Multi-select words</div>
                <div>• <strong>Double Enter:</strong> Split frame at selected word</div>
                <div>• <strong>↑↓:</strong> Combine frames</div>
                <div>• <strong>Ctrl/Cmd + Z:</strong> Undo all changes</div>
              </div>
            )}
          </div>
        </div>
        <p style={{ 
          margin: '3px 0 6px 0', 
          fontSize: '11px', 
          color: theme.colors.textSecondary 
        }}>
          {renderFrames.length} frames • Max {maxWordsPerFrame} words, {maxCharsPerFrame} chars per frame
        </p>
        
        {/* Compact Search & Replace */}
        <CompactSearchReplace
          aiSubtitleData={aiSubtitleData}
          onAISubtitleUpdate={updateAISubtitleData}
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onOpen={() => setIsSearchOpen(true)}
          onFrameSelect={onFrameSelect}
          onTimeSeek={onTimeSeek}
          onSearchHighlight={(frameId, wordIndex) => 
            frameId && wordIndex !== null 
              ? setSearchHighlight({frameId, wordIndex})
              : setSearchHighlight(null)
          }
        />
      </div>

      {/* Subtitle Frames */}
      <div
        ref={listRef as any}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '6px'
        }}
      >
        {renderFrames.map((frame, frameIndex) => (
          <div
            key={frame.id}
            data-frame-id={frame.id}
            onClick={() => handleFrameClick(frame.id)}
            style={{
              marginBottom: '4px',
              padding: '6px 8px',
              backgroundColor: theme.colors.surface,
              borderRadius: '4px',
              border: `1px solid ${selectedFrameId === frame.id ? theme.colors.primary : theme.colors.border}`,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              lineHeight: 1.3
            }}
          >
            {/* Frame timing and controls */}
            <div style={{
              fontSize: '10px',
              color: theme.colors.textSecondary,
              marginBottom: '4px',
              fontFamily: 'monospace',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>
                  {`${formatTimeHHMMSS(frame.startTime)} - ${formatTimeHHMMSS(frame.endTime)}`}
                </span>
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
              lineHeight: '1.4',
              fontSize: '13px'
            }}>
              {frame.words.map((word, wordIndex) => (
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
                      border: `1px solid ${theme.colors.primary}`,
                      borderRadius: '2px',
                      backgroundColor: theme.colors.background,
                      color: theme.colors.text,
                      fontSize: '12px',
                      minWidth: '40px'
                    }}
                  />
                ) : (
                  <span
                    key={word.id}
                    style={getWordStyle(word, frame.id, wordIndex)}
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

      {/* Split Word Modal */}
      <LiquidModal
        isOpen={splitModal.show}
        onClose={handleSplitCancel}
        title="Split Word"
        subtitle={`Split "${splitModal.originalText}" into multiple words`}
        icon={<Scissors size={24} />}
        maxWidth="600px"
      >
        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '18px',
              fontWeight: '600',
              color: theme.colors.text
            }}>
              How it works
            </h3>
            <p style={{
              margin: '0 0 16px 0',
              fontSize: '14px',
              color: theme.colors.textSecondary,
              lineHeight: '1.5'
            }}>
              Enter words separated by spaces. Each word will get timing proportional to its character length.
            </p>
            
            {/* Examples */}
            <div style={{
              padding: '16px',
              backgroundColor: theme.colors.modal.background,
              borderRadius: theme.radius.lg,
              border: `1px solid ${theme.colors.border}`,
              marginBottom: '20px'
            }}>
              <h4 style={{
                margin: '0 0 12px 0',
                fontSize: '14px',
                fontWeight: '600',
                color: theme.colors.text
              }}>
                Examples:
              </h4>
              <div style={{ fontSize: '13px', color: theme.colors.textSecondary, lineHeight: '1.6' }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong style={{ color: theme.colors.text }}>Input:</strong> "helloworld" → <strong style={{ color: theme.colors.text }}>Output:</strong> "hello world"
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong style={{ color: theme.colors.text }}>Input:</strong> "folks," → <strong style={{ color: theme.colors.text }}>Output:</strong> "folks there"
                </div>
                <div>
                  <strong style={{ color: theme.colors.text }}>Input:</strong> "iPhone15Pro" → <strong style={{ color: theme.colors.text }}>Output:</strong> "iPhone 15 Pro"
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: theme.colors.text,
              marginBottom: '8px'
            }}>
              Split "{splitModal.originalText}" into:
            </label>
            <input
              type="text"
              value={splitInput}
              onChange={(e) => setSplitInput(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation(); // Prevent event bubbling to global handlers
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSplitConfirm();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  handleSplitCancel();
                }
              }}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                color: theme.colors.text,
                backgroundColor: theme.colors.input.background,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radius.md,
                outline: 'none'
              }}
              placeholder="Enter words separated by spaces"
              autoFocus
              data-split-modal-input="true"
            />
            <small style={{
              display: 'block',
              marginTop: '6px',
              fontSize: '12px',
              color: theme.colors.textSecondary
            }}>
              Timing will be distributed based on character count of each word
            </small>
          </div>

          {/* Preview */}
          {splitInput.trim() && (
            <div style={{
              padding: '12px',
              backgroundColor: theme.colors.accent + '20',
              borderRadius: theme.radius.md,
              border: `1px solid ${theme.colors.accent}40`,
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '12px', color: theme.colors.textSecondary, marginBottom: '4px' }}>
                {splitInput.trim().split(/\s+/).filter(w => w.length > 0).length > 1 ? 'Will split into:' : 'Will update to:'}
              </div>
              <div style={{ fontSize: '14px', color: theme.colors.text }}>
                {splitInput.trim().split(/\s+/).filter(w => w.length > 0).map((word, index, arr) => (
                  <span key={index}>
                    <strong>"{word}"</strong>
                    {index < arr.length - 1 ? ' + ' : ''}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            borderTop: `1px solid ${theme.colors.border}`,
            paddingTop: '20px'
          }}>
            <button
              onClick={handleSplitCancel}
              style={{
                padding: '12px 24px',
                backgroundColor: 'transparent',
                color: theme.colors.text,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radius.md,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSplitConfirm}
              disabled={!splitInput.trim()}
              style={{
                padding: '12px 24px',
                backgroundColor: !splitInput.trim() 
                  ? theme.colors.textMuted 
                  : theme.colors.primary,
                color: !splitInput.trim()
                  ? theme.colors.text
                  : theme.colors.primaryForeground,
                border: 'none',
                borderRadius: theme.radius.md,
                cursor: !splitInput.trim() 
                  ? 'not-allowed' 
                  : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                opacity: !splitInput.trim() ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (splitInput.trim()) {
                  e.currentTarget.style.backgroundColor = theme.colors.primaryHover;
                }
              }}
              onMouseLeave={(e) => {
                if (splitInput.trim()) {
                  e.currentTarget.style.backgroundColor = theme.colors.primary;
                }
              }}
            >
              {splitInput.trim().split(/\s+/).filter(w => w.length > 0).length > 1 ? 'Split Word' : 'Update Word'}
            </button>
          </div>
        </div>
      </LiquidModal>

      {/* Context Menu */}
      {renderContextMenu()}
    </div>
  );
};

export default AISubtitlesPanel;