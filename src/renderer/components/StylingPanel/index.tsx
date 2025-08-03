import React, { useState } from 'react';
import { CaptionSegment, ExportSettings } from '../../../types';
import ExportSettingsModal from '../ExportSettings';
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
import { ExportSection } from './ExportSection';

interface StylingPanelProps {
  selectedSegment: CaptionSegment | null;
  onSegmentUpdate: (segmentId: string, updates: Partial<CaptionSegment>) => void;
  videoFile?: { path: string; name: string } | null;
  captions?: CaptionSegment[];
  onExport?: (settings: ExportSettings) => void;
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
  videoFile,
  captions,
  onExport,
  onApplyToAll,
  onTimeSeek,
  transcriptionStatus,
}) => {
  const { theme } = useTheme();
  const [showExportSettings, setShowExportSettings] = useState(false);

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

  // Main panel styles
  const panelStyles: React.CSSProperties = {
    height: '100%',
    backgroundColor: theme.colors.background,
    borderRadius: borderRadius.lg,
    border: `1px solid ${theme.colors.border}`,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
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
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: theme.colors.surfaceHover,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.md,
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path 
                  d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" 
                  stroke={theme.colors.textMuted} 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h4 style={{ 
              margin: 0, 
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.medium,
              color: theme.colors.text,
              marginBottom: spacing.xs,
            }}>
              No Caption Selected
            </h4>
            <p style={{ 
              margin: 0, 
              fontSize: typography.fontSize.base,
              lineHeight: typography.lineHeight.relaxed,
              maxWidth: 280,
            }}>
              Select a caption segment from the timeline to edit its style and content
            </p>
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
              variant="outline"
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
              <WordLevelEditor
                words={selectedSegment.words}
                onWordUpdate={handleWordUpdate}
                onWordDelete={handleWordDelete}
                onWordMerge={handleWordMerge}
                onJumpToWord={handleJumpToWord}
              />
            )}
            
            <StyleControls
              style={selectedSegment.style}
              onStyleUpdate={handleStyleUpdate}
            />
            
            <ExportSection
              videoFile={videoFile}
              captions={captions}
              onExport={onExport}
              onShowExportSettings={() => setShowExportSettings(true)}
            />
          </Stack>
        </div>
      </div>

      {showExportSettings && onExport && (
        <ExportSettingsModal
          isOpen={showExportSettings}
          onClose={() => setShowExportSettings(false)}
          onConfirm={onExport}
        />
      )}
    </>
  );
};

export default StylingPanel;