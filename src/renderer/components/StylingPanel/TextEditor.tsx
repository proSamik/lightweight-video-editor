import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { FormGroup, Textarea, Stack, spacing, typography } from '../ui';
import { WordTimestamp } from '../../../types';

interface TextEditorProps {
  text: string;
  words?: WordTimestamp[];
  onTextUpdate: (newText: string) => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  text,
  words,
  onTextUpdate,
}) => {
  const { theme } = useTheme();

  const hintText = words && words.length > 0
    ? `${words.length} words with timing • Edited words get enhanced highlighting`
    : 'No word-level timing available • Edit text to add basic timing';

  const textareaStyles: React.CSSProperties = {
    fontFamily: 'SF Mono, Consolas, Monaco, "Liberation Mono", "Courier New", monospace',
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.relaxed,
    minHeight: 120,
    resize: 'vertical',
  };

  return (
    <FormGroup
      label="Text Content"
      hint={hintText}
    >
      <Textarea
        value={text}
        onChange={(e) => onTextUpdate(e.target.value)}
        placeholder="Enter caption text..."
        style={textareaStyles}
      />
    </FormGroup>
  );
};