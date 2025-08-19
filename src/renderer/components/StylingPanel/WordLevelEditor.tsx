import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  FormGroup, 
  Stack, 
  HStack, 
  Button, 
  IconButton, 
  Input,
  spacing, 
  typography, 
  borderRadius 
} from '../ui';
import { FiStar } from 'react-icons/fi';
import { WordTimestamp } from '../../../types';

interface WordLevelEditorProps {
  words: WordTimestamp[];
  onWordUpdate: (wordIndex: number, newWord: string) => void;
  onWordDelete: (wordIndex: number) => void;
  onWordMerge: (wordIndex: number) => void;
  onJumpToWord: (wordStart: number) => void;
  onWordDeleteWithAudio?: (wordIndex: number) => void;
}

export const WordLevelEditor: React.FC<WordLevelEditorProps> = ({
  words,
  onWordUpdate,
  onWordDelete,
  onWordMerge,
  onJumpToWord,
  onWordDeleteWithAudio,
}) => {
  const { theme } = useTheme();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const startEditing = (index: number, currentWord: string) => {
    setEditingIndex(index);
    setEditingValue(currentWord);
  };

  const saveEdit = () => {
    if (editingIndex !== null) {
      onWordUpdate(editingIndex, editingValue);
      setEditingIndex(null);
      setEditingValue('');
    }
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Stop propagation to prevent global keyboard shortcuts from firing
    e.stopPropagation();
    
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  const containerStyles: React.CSSProperties = {
    maxHeight: 400,
    overflowY: 'auto',
    overflowX: 'hidden',
    backgroundColor: theme.colors.backgroundSecondary,
    border: `1px solid ${theme.colors.primary}20`,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    width: '100%',
  };

  const wordItemStyles = (isEdited: boolean): React.CSSProperties => ({
    padding: spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: borderRadius.md,
    border: `1px solid ${theme.colors.primary}${isEdited ? '60' : '20'}`,
    transition: 'all 0.15s ease',
    marginBottom: spacing.sm,
    boxShadow: `0 2px 8px ${theme.colors.primary}${isEdited ? '15' : '05'}`,
    cursor: 'pointer',
    width: '100%',
    minWidth: 0,
    overflow: 'hidden',
  });

  const wordIndexStyles: React.CSSProperties = {
    minWidth: 40,
    width: 40,
    height: 32,
    backgroundColor: theme.colors.primary,
    color: theme.colors.primaryForeground,
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `1px solid ${theme.colors.primary}`,
    flexShrink: 0,
    boxShadow: `0 2px 4px ${theme.colors.primary}20`,
  };

  const timingStyles: React.CSSProperties = {
    fontSize: typography.fontSize.xs,
    color: theme.colors.textMuted,
    fontFamily: 'SF Mono, Consolas, Monaco, "Liberation Mono", "Courier New", monospace',
  };

  const formatTime = (milliseconds: number): string => {
    const seconds = milliseconds / 1000;
    return `${seconds.toFixed(1)}s`;
  };

  // Delete text only icon (eraser)
  const DeleteTextIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path 
        d="M7 7l10 10M7 17L17 7" 
        stroke={theme.colors.warning} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M3 12h18" 
        stroke={theme.colors.warning} 
        strokeWidth="1" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        opacity="0.6"
      />
    </svg>
  );
  
  // Delete with audio icon (trash)
  const DeleteWithAudioIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path 
        d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" 
        stroke={theme.colors.error} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );

  // Merge icon
  const MergeIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path 
        d="M8 12h8m-4-4l4 4-4 4" 
        stroke={theme.colors.textSecondary} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );

  // Jump icon
  const JumpIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path 
        d="M9 18l6-6-6-6" 
        stroke={theme.colors.primary} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <FormGroup
      label="Word-Level Editor"
      hint="Double-click words to edit • Click time to jump to position"
    >
      <div style={containerStyles}>
        <Stack gap="sm">
          {words.map((word, index) => {
            const wordDuration = word.end - word.start;
            const isEdited = wordDuration >= 500;
            const isEditing = editingIndex === index;

            return (
              <div 
                key={index} 
                style={wordItemStyles(isEdited)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.sidebar.itemHover;
                  e.currentTarget.style.borderColor = theme.colors.primary + '40';
                  e.currentTarget.style.boxShadow = `0 4px 12px ${theme.colors.primary}20`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.background;
                  e.currentTarget.style.borderColor = theme.colors.primary + (isEdited ? '60' : '20');
                  e.currentTarget.style.boxShadow = `0 2px 8px ${theme.colors.primary}${isEdited ? '15' : '05'}`;
                }}
              >
                <HStack align="center" gap="md" style={{ width: '100%', minWidth: 0 }}>
                  <div style={wordIndexStyles}>
                    {index + 1}
                  </div>

                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    {isEditing ? (
                      <HStack gap="xs" style={{ width: '100%', minWidth: 0 }}>
                        <Input
                          value={editingValue}
                          onChange={(e) => {
                            e.stopPropagation();
                            setEditingValue(e.target.value);
                          }}
                          onKeyDown={handleKeyPress}
                          onKeyUp={(e) => e.stopPropagation()}
                          onKeyPress={(e) => e.stopPropagation()}
                          size="sm"
                          style={{ flex: 1, minWidth: 0 }}
                          autoFocus
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={saveEdit}
                          style={{ flexShrink: 0 }}
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={cancelEdit}
                          style={{ flexShrink: 0 }}
                        >
                          Cancel
                        </Button>
                      </HStack>
                    ) : (
                      <HStack justify="between" align="center" style={{ width: '100%', minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: typography.fontSize.base,
                            fontWeight: typography.fontWeight.medium,
                            color: theme.colors.text,
                            cursor: 'pointer',
                            padding: `${spacing.xs}px ${spacing.sm}px`,
                            borderRadius: borderRadius.sm,
                            backgroundColor: 'transparent',
                            transition: 'background-color 0.2s ease',
                            flex: 1,
                            minWidth: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          onDoubleClick={() => startEditing(index, word.word)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = theme.colors.sidebar.itemHover;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          title={word.word}
                        >
                          {word.word}
                        </span>

                        <HStack gap="xs" style={{ flexShrink: 0 }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onJumpToWord(word.start)}
                            style={timingStyles}
                          >
                            {formatTime(word.start)}
                          </Button>

                          {index < words.length - 1 && (
                            <IconButton
                              icon={<MergeIcon />}
                              size="sm"
                              variant="ghost"
                              onClick={() => onWordMerge(index)}
                              aria-label="Merge with next word"
                              title="Merge with next word"
                            />
                          )}

                          <IconButton
                            icon={<DeleteTextIcon />}
                            size="sm"
                            variant="ghost"
                            onClick={() => onWordDelete(index)}
                            aria-label="Clear word text (keep audio)"
                            title="Clear word text (keep audio)"
                            style={{ color: theme.colors.warning }}
                          />
                          
                          {onWordDeleteWithAudio && (
                            <IconButton
                              icon={<DeleteWithAudioIcon />}
                              size="sm"
                              variant="ghost"
                              onClick={() => onWordDeleteWithAudio(index)}
                              aria-label="Delete word and audio"
                              title="Delete word and audio completely"
                              style={{ color: theme.colors.error }}
                            />
                          )}
                        </HStack>
                      </HStack>
                    )}
                  </div>
                </HStack>

                {isEdited && !isEditing && (
                  <div style={{
                    marginTop: spacing.sm,
                    padding: `${spacing.xs}px ${spacing.sm}px`,
                    backgroundColor: theme.colors.primarySubtle,
                    borderRadius: borderRadius.sm,
                    fontSize: typography.fontSize.xs,
                    color: theme.colors.primary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.xs,
                    border: `1px solid ${theme.colors.primary}30`,
                  }}>
                    <FiStar size={12} color={theme.colors.primary} />
                    <span>Enhanced highlighting</span>
                  </div>
                )}
              </div>
            );
          })}
        </Stack>
      </div>
    </FormGroup>
  );
};