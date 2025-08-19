import React, { useState } from 'react';
import { CaptionSegment, CaptionPreset } from '../../../types';
import { useTheme } from '../../contexts/ThemeContext';
import TimelineApplyModal from '../TimelineApplyModal';

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
import { WordLevelEditor } from './WordLevelEditor';
import { StyleControls } from './StyleControls';
import { PresetSelector } from './PresetSelector';

interface StylingPanelProps {
  selectedSegment: CaptionSegment | null;
  onSegmentUpdate: (segmentId: string, updates: Partial<CaptionSegment>) => void;
  onApplyToAll?: (styleUpdates: Partial<CaptionSegment['style']>) => void;
  onApplyToTimeline?: (startTime: number, endTime: number, styleUpdates: Partial<CaptionSegment['style']>) => void;
  onTimeSeek?: (time: number) => void;
  captions?: CaptionSegment[];
  currentTime?: number;
  transcriptionStatus?: {
    isTranscribing: boolean;
    progress: number;
    message: string;
    speed?: string;
    eta?: string;
  };
}

const StylingPanel: React.FC<StylingPanelProps> = ({
  selectedSegment,
  onSegmentUpdate,
  onApplyToAll,
  onApplyToTimeline,
  onTimeSeek,
  captions = [],
  currentTime = 0,
  transcriptionStatus,
}) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  const [selectedPresetId, setSelectedPresetId] = useState<string>();
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);

  // Handle style updates
  const handleStyleUpdate = (styleUpdates: Partial<CaptionSegment['style']>) => {
    if (selectedSegment) {
      onSegmentUpdate(selectedSegment.id, {
        style: { ...selectedSegment.style, ...styleUpdates }
      });
    }
  };

  // Handle preset selection
  const handlePresetSelect = (preset: CaptionPreset) => {
    setSelectedPresetId(preset.id);
    if (selectedSegment) {
      // Extract animation from style before applying
      const { animation, ...styleWithoutAnimation } = preset.style;
      onSegmentUpdate(selectedSegment.id, {
        style: { ...selectedSegment.style, ...styleWithoutAnimation }
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

  // Handle timeline apply
  const handleTimelineApply = (startTime: number, endTime: number) => {
    if (selectedSegment) {
      if (onApplyToTimeline) {
        onApplyToTimeline(startTime, endTime, selectedSegment.style);
      } else {
        // Fallback: apply to all segments in the time range if no specific handler
        console.log('Applying style to timeline range:', { startTime, endTime, style: selectedSegment.style });
        // You could add a notification here that the feature needs to be implemented
      }
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
          <HStack justify="between" align="center" style={{ marginBottom: spacing.lg }}>
            <div>
              <h3 style={{ 
                margin: 0, 
                fontSize: typography.fontSize.xl, 
                fontWeight: typography.fontWeight.semibold,
                color: theme.colors.text 
              }}>
                Caption Styling
              </h3>
              <p style={{
                margin: '4px 0 0 0',
                fontSize: typography.fontSize.sm,
                color: theme.colors.textSecondary
              }}>
                Customize your caption appearance with presets or manual controls
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsTimelineModalOpen(true)}
              disabled={!selectedSegment}
            >
              Apply to Timeline
            </Button>
          </HStack>
          
          {/* Tab Navigation */}
          <div style={{
            display: 'flex',
            gap: '4px',
            backgroundColor: theme.colors.surface,
            padding: '4px',
            borderRadius: theme.radius.lg,
            border: `1px solid ${theme.colors.border}`
          }}>
            <button
              onClick={() => setActiveTab('presets')}
              style={{
                flex: 1,
                padding: '12px 16px',
                backgroundColor: activeTab === 'presets' ? theme.colors.primary : 'transparent',
                color: activeTab === 'presets' ? theme.colors.primaryForeground : theme.colors.text,
                border: 'none',
                borderRadius: theme.radius.md,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                justifyContent: 'center'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.3"/>
              </svg>
              Style Presets
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              style={{
                flex: 1,
                padding: '12px 16px',
                backgroundColor: activeTab === 'custom' ? theme.colors.primary : 'transparent',
                color: activeTab === 'custom' ? theme.colors.primaryForeground : theme.colors.text,
                border: 'none',
                borderRadius: theme.radius.md,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                justifyContent: 'center'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Custom Controls
            </button>
          </div>
        </div>
        
        <div style={contentStyles}>
          <Stack gap="xl">
            <TranscriptionStatus transcriptionStatus={transcriptionStatus} />
            
            {/* Tab Content */}
            {activeTab === 'presets' ? (
              <PresetSelector
                selectedPresetId={selectedPresetId}
                onPresetSelect={handlePresetSelect}
                onStyleUpdate={handleStyleUpdate}
                onApplyToAll={onApplyToAll}
              />
            ) : (
              <div>
                {selectedSegment.words && selectedSegment.words.length > 0 && (
                  <div style={{
                    padding: `${spacing.lg}px`,
                    backgroundColor: theme.colors.background,
                    borderRadius: borderRadius.lg,
                    border: `1px solid ${theme.colors.border}`,
                    marginBottom: spacing.xl,
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
              </div>
            )}
          </Stack>
        </div>
      </div>

      {/* Timeline Apply Modal */}
      <TimelineApplyModal
        isOpen={isTimelineModalOpen}
        onClose={() => setIsTimelineModalOpen(false)}
        onApply={handleTimelineApply}
        currentStyle={selectedSegment.style}
        captions={captions}
        currentTime={currentTime}
        selectedSegmentId={selectedSegment.id}
      />
    </>
  );
};

export default StylingPanel;