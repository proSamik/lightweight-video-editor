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
}

export const WordLevelEditor: React.FC<WordLevelEditorProps> = ({
  words,
  onWordUpdate,
  onWordDelete,
  onWordMerge,
  onJumpToWord,
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
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  const containerStyles: React.CSSProperties = {
    maxHeight: 300,
    overflowY: 'auto',
    backgroundColor: theme.colors.background,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  };

  const wordItemStyles = (isEdited: boolean): React.CSSProperties => ({
    padding: spacing.lg,
    backgroundColor: theme.colors.background,
    borderRadius: borderRadius.md,
    border: `1px solid ${theme.colors.border}`,
    transition: 'all 0.15s ease',
    marginBottom: spacing.sm,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    ':hover': {
      backgroundColor: theme.colors.surfaceHover,
      borderColor: theme.colors.borderHover,
    },
  });

  const wordIndexStyles: React.CSSProperties = {
    minWidth: 32,
    height: 32,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `1px solid ${theme.colors.border}`,
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

  // Delete icon
  const DeleteIcon = () => (
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
              <div key={index} style={wordItemStyles(isEdited)}>
                <HStack align="center" gap="lg">
                  <div style={wordIndexStyles}>
                    {index + 1}
                  </div>

                  <div style={{ flex: 1 }}>
                    {isEditing ? (
                      <HStack gap="xs">
                        <Input
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={handleKeyPress}
                          size="sm"
                          style={{ flex: 1 }}
                          autoFocus
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={saveEdit}
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </Button>
                      </HStack>
                    ) : (
                      <HStack justify="between" align="center">
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
                          }}
                          onDoubleClick={() => startEditing(index, word.word)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          {word.word}
                        </span>

                        <HStack gap="xs">
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
                            icon={<DeleteIcon />}
                            size="sm"
                            variant="ghost"
                            onClick={() => onWordDelete(index)}
                            aria-label="Delete word"
                            title="Delete word"
                          />
                        </HStack>
                      </HStack>
                    )}
                  </div>
                </HStack>

                {isEdited && !isEditing && (
                  <div style={{
                    marginTop: spacing.sm,
                    padding: `${spacing.xs}px ${spacing.sm}px`,
                    backgroundColor: theme.colors.backgroundSecondary,
                    borderRadius: borderRadius.sm,
                    fontSize: typography.fontSize.xs,
                    color: theme.colors.textSecondary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.xs,
                    border: `1px solid ${theme.colors.border}`,
                  }}>
                    <FiStar size={12} />
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