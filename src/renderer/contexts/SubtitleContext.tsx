import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CaptionSegment, AISubtitleData, SubtitleFrame, WordSegment, WordTimestamp } from '../../types';

interface SubtitleContextValue {
  // Core subtitle data
  captions: CaptionSegment[];
  aiSubtitleData: AISubtitleData | null;
  selectedSegmentId: string | null;
  selectedFrameId: string | null;
  
  // Update functions
  updateCaption: (segmentId: string, updates: Partial<CaptionSegment>) => void;
  updateCaptions: (newCaptions: CaptionSegment[]) => void;
  deleteCaption: (segmentId: string) => void;
  
  // AI Subtitle functions
  updateAISubtitleData: (data: AISubtitleData | null) => void;
  splitSubtitleFrame: (frameId: string, wordId: string) => void;
  mergeSubtitleFrames: (frameId: string, direction: 'up' | 'down') => void;
  updateWordInFrame: (wordId: string, newWord: string, newState: string) => void;
  
  // Selection functions
  selectSegment: (segmentId: string | null) => void;
  selectFrame: (frameId: string | null) => void;
  
  // Sync function between AI subtitles and regular captions
  syncCaptionsFromAI: () => void;
  
  // Line splitting functionality
  splitSegmentIntoLines: (segmentId: string, lines: string[]) => void;
}

const SubtitleContext = createContext<SubtitleContextValue | null>(null);

export const useSubtitleContext = () => {
  const context = useContext(SubtitleContext);
  if (!context) {
    throw new Error('useSubtitleContext must be used within a SubtitleProvider');
  }
  return context;
};

interface SubtitleProviderProps {
  children: React.ReactNode;
  initialCaptions?: CaptionSegment[];
  initialAISubtitleData?: AISubtitleData | null;
  onCaptionChange?: (captions: CaptionSegment[]) => void;
  onAISubtitleChange?: (data: AISubtitleData | null) => void;
}

export const SubtitleProvider: React.FC<SubtitleProviderProps> = ({
  children,
  initialCaptions = [],
  initialAISubtitleData = null,
  onCaptionChange,
  onAISubtitleChange,
}) => {
  const [captions, setCaptions] = useState<CaptionSegment[]>(initialCaptions);
  const [aiSubtitleData, setAiSubtitleData] = useState<AISubtitleData | null>(initialAISubtitleData);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);

  // Sync with external changes
  useEffect(() => {
    setCaptions(initialCaptions);
  }, [initialCaptions]);

  useEffect(() => {
    setAiSubtitleData(initialAISubtitleData);
  }, [initialAISubtitleData]);

  // Convert AI Subtitle data back to regular caption segments
  const convertAISubtitlesToCaptions = useCallback((aiData: AISubtitleData): CaptionSegment[] => {
    const captionMap = new Map<string, CaptionSegment>();

    // Group frames by original segment ID
    aiData.frames.forEach(frame => {
      if (!captionMap.has(frame.segmentId)) {
        // Find the original caption to preserve its style
        const originalCaption = captions.find(c => c.id === frame.segmentId);
        if (originalCaption) {
          captionMap.set(frame.segmentId, {
            ...originalCaption,
            words: [],
            text: ''
          });
        }
      }

      const caption = captionMap.get(frame.segmentId);
      if (caption) {
        // Add visible words from this frame
        const visibleWords = frame.words.filter(word => 
          word.editState !== 'strikethrough' && 
          word.editState !== 'removedCaption' &&
          !word.isPause
        );

        caption.words = caption.words || [];
        caption.words.push(...visibleWords.map(word => ({
          word: word.word,
          start: word.start * 1000, // Convert seconds to milliseconds for caption format
          end: word.end * 1000 // Convert seconds to milliseconds for caption format
        })));
      }
    });

    // Convert map back to array and update text content
    const updatedCaptions = Array.from(captionMap.values()).map(caption => {
      // Sort words by start time
      if (caption.words) {
        caption.words.sort((a, b) => a.start - b.start);
        // Update text content based on visible words
        caption.text = caption.words.map(w => w.word).join(' ');
        
        // Update timing based on first and last words
        if (caption.words.length > 0) {
          caption.startTime = caption.words[0].start;
          caption.endTime = caption.words[caption.words.length - 1].end;
        }
      }
      return caption;
    });

    return updatedCaptions;
  }, [captions]);

  // Convert regular captions to AI subtitle format
  const convertCaptionsToAI = useCallback((captionSegments: CaptionSegment[], maxWordsPerFrame = 5, maxCharsPerFrame = 30): AISubtitleData => {
    const frames: SubtitleFrame[] = [];
    
    captionSegments.forEach((caption, segmentIndex) => {
      if (caption.words && caption.words.length > 0) {
        // Create word segments from existing words (convert milliseconds to seconds)
        const wordSegments: WordSegment[] = caption.words.map((word, wordIndex) => ({
          ...word,
          start: word.start / 1000, // Convert milliseconds to seconds for AI format
          end: word.end / 1000, // Convert milliseconds to seconds for AI format
          id: `${caption.id}-word-${wordIndex}`,
          editState: 'normal' as any,
          originalWord: word.word,
          isPause: word.word === '[.]'
        }));

        // Split words into frames based on maxWordsPerFrame and maxCharsPerFrame
        let currentFrame: SubtitleFrame | null = null;
        let currentWords: WordSegment[] = [];
        let currentCharCount = 0;

        wordSegments.forEach((wordSegment, index) => {
          const wordLength = wordSegment.word.length + 1; // +1 for space
          
          // Check if we need to start a new frame
          if (
            currentWords.length >= maxWordsPerFrame ||
            currentCharCount + wordLength > maxCharsPerFrame ||
            currentFrame === null
          ) {
            // Save previous frame if exists
            if (currentFrame !== null && currentWords.length > 0) {
              (currentFrame as SubtitleFrame).words = [...currentWords];
              const lastWord = currentWords[currentWords.length - 1];
              if (lastWord) {
                (currentFrame as SubtitleFrame).endTime = lastWord.end;
              }
              frames.push(currentFrame as SubtitleFrame);
            }

            // Start new frame
            currentFrame = {
              id: `frame-${segmentIndex}-${Math.floor(index / maxWordsPerFrame)}`,
              startTime: wordSegment.start,
              endTime: wordSegment.end,
              words: [],
              segmentId: caption.id,
              isCustomBreak: false
            };
            currentWords = [];
            currentCharCount = 0;
          }

          currentWords.push(wordSegment);
          currentCharCount += wordLength;
        });

        // Add the last frame if it has words
        if (currentFrame !== null && currentWords.length > 0) {
          (currentFrame as SubtitleFrame).words = currentWords;
          const lastWord = currentWords[currentWords.length - 1];
          if (lastWord) {
            (currentFrame as SubtitleFrame).endTime = lastWord.end;
          }
          frames.push(currentFrame as SubtitleFrame);
        }
      }
    });

    return {
      frames,
      audioSegments: [],
      maxWordsPerFrame,
      maxCharsPerFrame,
      lastModified: Date.now()
    };
  }, []);

  // Update caption function
  const updateCaption = useCallback((segmentId: string, updates: Partial<CaptionSegment>) => {
    setCaptions(prev => {
      const updated = prev.map(segment => 
        segment.id === segmentId 
          ? { ...segment, ...updates }
          : segment
      );
      onCaptionChange?.(updated);
      return updated;
    });
  }, [onCaptionChange]);

  // Update all captions
  const updateCaptions = useCallback((newCaptions: CaptionSegment[]) => {
    setCaptions(newCaptions);
    onCaptionChange?.(newCaptions);
  }, [onCaptionChange]);

  // Delete caption function
  const deleteCaption = useCallback((segmentId: string) => {
    setCaptions(prev => {
      const updated = prev.filter(segment => segment.id !== segmentId);
      onCaptionChange?.(updated);
      return updated;
    });
    
    // Clear selection if the deleted segment was selected
    if (selectedSegmentId === segmentId) {
      setSelectedSegmentId(null);
    }
  }, [selectedSegmentId, onCaptionChange]);

  // Update AI subtitle data
  const updateAISubtitleData = useCallback((data: AISubtitleData | null) => {
    setAiSubtitleData(data);
    onAISubtitleChange?.(data);
  }, [onAISubtitleChange]);

  // Split subtitle frame at word
  const splitSubtitleFrame = useCallback((frameId: string, wordId: string) => {
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

    const updatedData = {
      ...aiSubtitleData,
      frames: updatedFrames,
      lastModified: Date.now()
    };

    updateAISubtitleData(updatedData);
  }, [aiSubtitleData, updateAISubtitleData]);

  // Merge subtitle frames
  const mergeSubtitleFrames = useCallback((frameId: string, direction: 'up' | 'down') => {
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

    const updatedData = {
      ...aiSubtitleData,
      frames: updatedFrames,
      lastModified: Date.now()
    };

    updateAISubtitleData(updatedData);
    
    // Update selection to merged frame
    setSelectedFrameId(mergedFrame.id);
  }, [aiSubtitleData, updateAISubtitleData]);

  // Update word in frame
  const updateWordInFrame = useCallback((wordId: string, newWord: string, newState: string) => {
    if (!aiSubtitleData) return;

    const updatedFrames = aiSubtitleData.frames.map(frame => ({
      ...frame,
      words: frame.words.map(word => 
        word.id === wordId 
          ? { ...word, word: newWord, editState: newState as any }
          : word
      )
    }));

    const updatedData = {
      ...aiSubtitleData,
      frames: updatedFrames,
      lastModified: Date.now()
    };

    updateAISubtitleData(updatedData);
  }, [aiSubtitleData, updateAISubtitleData]);

  // Sync captions from AI subtitle data
  const syncCaptionsFromAI = useCallback(() => {
    if (aiSubtitleData) {
      const syncedCaptions = convertAISubtitlesToCaptions(aiSubtitleData);
      updateCaptions(syncedCaptions);
    }
  }, [aiSubtitleData, convertAISubtitlesToCaptions, updateCaptions]);

  // Split segment into multiple lines/segments
  const splitSegmentIntoLines = useCallback((segmentId: string, lines: string[]) => {
    const segment = captions.find(c => c.id === segmentId);
    if (!segment || lines.length <= 1) return;

    const totalDuration = segment.endTime - segment.startTime;
    const durationPerLine = totalDuration / lines.length;

    // Create new segments for each line
    const newSegments: CaptionSegment[] = lines.map((line, index) => ({
      ...segment,
      id: `${segmentId}-line-${index}`,
      text: line.trim(),
      startTime: segment.startTime + (index * durationPerLine),
      endTime: segment.startTime + ((index + 1) * durationPerLine),
      words: [] // Reset words for manual line splits
    }));

    // Replace original segment with new segments
    setCaptions(prev => {
      const updated = prev.filter(c => c.id !== segmentId);
      updated.push(...newSegments);
      updated.sort((a, b) => a.startTime - b.startTime);
      onCaptionChange?.(updated);
      return updated;
    });

    // If AI subtitle data exists, regenerate it
    if (aiSubtitleData) {
      const newAIData = convertCaptionsToAI(captions.filter(c => c.id !== segmentId).concat(newSegments));
      updateAISubtitleData(newAIData);
    }
  }, [captions, aiSubtitleData, convertCaptionsToAI, updateAISubtitleData, onCaptionChange]);

  // Selection functions
  const selectSegment = useCallback((segmentId: string | null) => {
    setSelectedSegmentId(segmentId);
  }, []);

  const selectFrame = useCallback((frameId: string | null) => {
    setSelectedFrameId(frameId);
  }, []);

  const contextValue: SubtitleContextValue = {
    captions,
    aiSubtitleData,
    selectedSegmentId,
    selectedFrameId,
    updateCaption,
    updateCaptions,
    deleteCaption,
    updateAISubtitleData,
    splitSubtitleFrame,
    mergeSubtitleFrames,
    updateWordInFrame,
    selectSegment,
    selectFrame,
    syncCaptionsFromAI,
    splitSegmentIntoLines,
  };

  return (
    <SubtitleContext.Provider value={contextValue}>
      {children}
    </SubtitleContext.Provider>
  );
};
