import React from 'react';
import { CaptionSegment } from '../../../types';
import { useTheme } from '../../contexts/ThemeContext';

// Import UI components
import {
  Stack,
  HStack,
  Button,
  spacing,
  typography,
  borderRadius,
} from '../ui';

// Import sub-components
import { TranscriptionStatus } from './TranscriptionStatus';
import { TextEditor } from './TextEditor';
import { WordLevelEditor } from './WordLevelEditor';
import { StyleControls } from './StyleControls';

interface StylingPanelProps {
  selectedSegment: CaptionSegment | null;
  onSegmentUpdate: (segmentId: string, updates: Partial<CaptionSegment>) => void;
  onApplyToAll?: (styleUpdates: Partial<CaptionSegment['style']>) => void;
  onTimeSeek?: (time: number) => void;
  transcriptionStatus?: {
    isTranscribing: boolean;
    progress: number;
    message: string;
  };
}

const StylingPanel: React.FC<StylingPanelProps> = ({
  selectedSegment,
  onSegmentUpdate,
  onApplyToAll,
  onTimeSeek,
  transcriptionStatus,
}) => {
  const { theme } = useTheme();

  // Handle style updates
  const handleStyleUpdate = (styleUpdates: Partial<CaptionSegment['style']>) => {
    if (selectedSegment) {
      onSegmentUpdate(selectedSegment.id, {
        style: { ...selectedSegment.style, ...styleUpdates }
      });
    }
  };

  // Handle text updates with word-level timing preservation
  const handleTextUpdate = (newText: string) => {
    if (!selectedSegment) return;

    if (selectedSegment.words && selectedSegment.words.length > 0) {
      const newWords = newText.split(' ').filter(word => word.trim() !== '');
      const originalWords = selectedSegment.words;
      
      // Create updated word timing by mapping new words to original timing
      const updatedWords = newWords.map((word, index) => {
        const originalWord = originalWords[index];
        const isEdited = originalWord ? originalWord.word !== word : true;
        
        if (originalWord) {
          return {
            ...originalWord,
            word: word,
            end: isEdited ? 
              Math.max(originalWord.end, originalWord.start + 500) : 
              originalWord.end
          };
        } else {
          const segmentDuration = selectedSegment.endTime - selectedSegment.startTime;
          const wordDuration = segmentDuration / newWords.length;
          const wordStart = selectedSegment.startTime + (index * wordDuration);
          
          return {
            word: word,
            start: wordStart,
            end: Math.min(wordStart + Math.max(wordDuration, 500), selectedSegment.endTime)
          };
        }
      });
      
      onSegmentUpdate(selectedSegment.id, {
        text: newText,
        words: updatedWords
      });
    } else {
      onSegmentUpdate(selectedSegment.id, {
        text: newText
      });
    }
  };

  // Handle word-level operations
  const handleWordUpdate = (wordIndex: number, newWord: string) => {
    if (!selectedSegment?.words) return;
    
    const updatedWords = [...selectedSegment.words];
    const originalWord = updatedWords[wordIndex].word;
    
    if (newWord.trim() !== '') {
      updatedWords[wordIndex] = { ...updatedWords[wordIndex], word: newWord.trim() };
      
      if (originalWord !== newWord.trim()) {
        const wordDuration = updatedWords[wordIndex].end - updatedWords[wordIndex].start;
        const minDuration = 500;
        
        if (wordDuration < minDuration) {
          const timeDiff = minDuration - wordDuration;
          updatedWords[wordIndex].end = updatedWords[wordIndex].end + timeDiff;
        }
      }
      
      const newText = updatedWords.filter(w => w.word.trim() !== '').map(w => w.word).join(' ');
      
      onSegmentUpdate(selectedSegment.id, {
        text: newText,
        words: updatedWords
      });
    } else {
      handleWordDelete(wordIndex);
    }
  };

  const handleWordDelete = (wordIndex: number) => {
    if (!selectedSegment?.words) return;
    
    // Just clear the text, keep the timing for empty space
    const updatedWords = [...selectedSegment.words];
    updatedWords[wordIndex] = { ...updatedWords[wordIndex], word: '' };
    const newText = updatedWords.filter(w => w.word.trim() !== '').map(w => w.word).join(' ');
    
    onSegmentUpdate(selectedSegment.id, {
      text: newText,
      words: updatedWords
    });
  };
  
  const handleWordDeleteWithAudio = (wordIndex: number) => {
    if (!selectedSegment?.words) return;
    
    // Completely remove the word and its timing
    const updatedWords = selectedSegment.words.filter((_, index) => index !== wordIndex);
    const newText = updatedWords.map(w => w.word).join(' ');
    
    onSegmentUpdate(selectedSegment.id, {
      text: newText,
      words: updatedWords
    });
  };

  const handleWordMerge = (wordIndex: number) => {
    if (!selectedSegment?.words || wordIndex >= selectedSegment.words.length - 1) return;
    
    const updatedWords = [...selectedSegment.words];
    const currentWord = updatedWords[wordIndex];
    const nextWord = updatedWords[wordIndex + 1];
    
    const mergedWord = {
      ...currentWord,
      word: (currentWord.word + ' ' + nextWord.word).trim(),
      end: nextWord.end
    };
    
    updatedWords[wordIndex] = mergedWord;
    updatedWords.splice(wordIndex + 1, 1);
    
    const newText = updatedWords.map(w => w.word).join(' ');
    
    onSegmentUpdate(selectedSegment.id, {
      text: newText,
      words: updatedWords
    });
  };

  const handleJumpToWord = (wordStart: number) => {
    if (onTimeSeek) {
      onTimeSeek(wordStart);
    }
  };

  // Main panel styles with blue accents
  const panelStyles: React.CSSProperties = {
    height: '100%',
    backgroundColor: theme.colors.sidebar.background,
    borderRadius: borderRadius.lg,
    border: `1px solid ${theme.colors.borderFocus}20`,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: theme.shadows.sm,
  };

  const headerStyles: React.CSSProperties = {
    padding: spacing['2xl'],
    borderBottom: `1px solid ${theme.colors.border}`,
    backgroundColor: theme.colors.background,
  };

  const contentStyles: React.CSSProperties = {
    flex: 1,
    padding: spacing['2xl'],
    overflowY: 'auto',
    backgroundColor: theme.colors.sidebar.background,
  };

  const emptyStateStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    textAlign: 'center',
    color: theme.colors.textSecondary,
    gap: spacing.lg,
  };

  // Empty state when no segment is selected
  if (!selectedSegment) {
    return (
      <div style={panelStyles}>
        <div style={headerStyles}>
          <h3 style={{ 
            margin: 0, 
            fontSize: typography.fontSize.xl, 
            fontWeight: typography.fontWeight.semibold,
            color: theme.colors.text 
          }}>
            Styling Controls
          </h3>
        </div>
        
        <div style={contentStyles}>
          <TranscriptionStatus transcriptionStatus={transcriptionStatus} />
          
          <div style={emptyStateStyles}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: theme.colors.primary,
              background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.lg,
              boxShadow: `0 8px 24px ${theme.colors.primary}30`,
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path 
                  d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" 
                  stroke="white" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h4 style={{ 
              margin: 0, 
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.semibold,
              color: theme.colors.text,
              marginBottom: spacing.sm,
            }}>
              No Caption Selected
            </h4>
            <p style={{ 
              margin: 0, 
              fontSize: typography.fontSize.base,
              lineHeight: typography.lineHeight.relaxed,
              maxWidth: 320,
              color: theme.colors.textSecondary,
            }}>
              Select a caption segment from the timeline to edit its style and content
            </p>
            
            {/* Blue accent decoration */}
            <div style={{
              marginTop: spacing.xl,
              padding: `${spacing.md}px ${spacing.lg}px`,
              backgroundColor: theme.colors.primarySubtle,
              borderRadius: borderRadius.md,
              border: `1px solid ${theme.colors.primary}20`,
              fontSize: typography.fontSize.sm,
              color: theme.colors.primary,
              fontWeight: typography.fontWeight.medium,
            }}>
              💡 Double-click any timeline segment to begin editing
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={panelStyles}>
        <div style={headerStyles}>
          <HStack justify="between" align="center">
            <h3 style={{ 
              margin: 0, 
              fontSize: typography.fontSize.xl, 
              fontWeight: typography.fontWeight.semibold,
              color: theme.colors.text 
            }}>
              Styling Controls
            </h3>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onApplyToAll && onApplyToAll(selectedSegment.style)}
              disabled={!onApplyToAll}
            >
              Apply to All
            </Button>
          </HStack>
        </div>
        
        <div style={contentStyles}>
          <Stack gap="2xl">
            <TranscriptionStatus transcriptionStatus={transcriptionStatus} />
            
            <TextEditor
              text={selectedSegment.text}
              words={selectedSegment.words}
              onTextUpdate={handleTextUpdate}
            />
            
            {selectedSegment.words && selectedSegment.words.length > 0 && (
              <div style={{
                padding: `${spacing.lg}px`,
                backgroundColor: theme.colors.background,
                borderRadius: borderRadius.lg,
                border: `1px solid ${theme.colors.border}`,
                margin: `0 -${spacing.md}px`,
                boxShadow: theme.shadows.sm
              }}>
                <WordLevelEditor
                  words={selectedSegment.words}
                  onWordUpdate={handleWordUpdate}
                  onWordDelete={handleWordDelete}
                  onWordDeleteWithAudio={handleWordDeleteWithAudio}
                  onWordMerge={handleWordMerge}
                  onJumpToWord={handleJumpToWord}
                />
              </div>
            )}
            
            <StyleControls
              style={selectedSegment.style}
              onStyleUpdate={handleStyleUpdate}
            />
          </Stack>
        </div>
      </div>
    </>
  );
};

export default StylingPanel;