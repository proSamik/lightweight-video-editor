import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  FormGroup, 
  FormSection,
  FormGrid,
  Stack, 
  HStack,
  Select,
  Checkbox,
  spacing, 
  typography, 
  borderRadius 
} from '../ui';
import { CaptionStyle } from '../../../types';

interface StyleControlsProps {
  style: CaptionStyle;
  onStyleUpdate: (updates: Partial<CaptionStyle>) => void;
}

export const StyleControls: React.FC<StyleControlsProps> = ({
  style,
  onStyleUpdate,
}) => {
  const { theme } = useTheme();

  // Font size slider component
  const FontSizeSlider: React.FC = () => {
    const sliderStyles: React.CSSProperties = {
      width: '100%',
      height: 6,
      borderRadius: borderRadius.sm,
      background: theme.colors.surfaceActive,
      outline: 'none',
      appearance: 'none',
      cursor: 'pointer',
    };

    const sliderThumbStyles = `
      input[type="range"]::-webkit-slider-thumb {
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: ${theme.colors.primary};
        cursor: pointer;
        border: 2px solid ${theme.colors.primaryForeground};
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
      
      input[type="range"]::-moz-range-thumb {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: ${theme.colors.primary};
        cursor: pointer;
        border: 2px solid ${theme.colors.primaryForeground};
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
    `;

    return (
      <FormGroup label="Font Size" hint={`Current: ${style.fontSize}px`}>
        <style>{sliderThumbStyles}</style>
        <input
          type="range"
          min="16"
          max="200"
          value={style.fontSize}
          onChange={(e) => onStyleUpdate({ fontSize: parseInt(e.target.value) })}
          style={sliderStyles}
        />
        <HStack justify="between" style={{ marginTop: spacing.xs }}>
          <span style={{ fontSize: typography.fontSize.xs, color: theme.colors.textMuted }}>16px</span>
          <span style={{ fontSize: typography.fontSize.xs, color: theme.colors.textMuted }}>200px</span>
        </HStack>
      </FormGroup>
    );
  };

  // Scale slider component
  const ScaleSlider: React.FC = () => {
    const scaleValue = style.scale || 1;
    const scalePercentage = Math.round(scaleValue * 100);

    const sliderStyles: React.CSSProperties = {
      width: '100%',
      height: 6,
      borderRadius: borderRadius.sm,
      background: theme.colors.surfaceActive,
      outline: 'none',
      appearance: 'none',
      cursor: 'pointer',
    };

    return (
      <FormGroup label="Scale" hint={`Current: ${scalePercentage}%`}>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={scaleValue}
          onChange={(e) => onStyleUpdate({ scale: parseFloat(e.target.value) })}
          style={sliderStyles}
        />
        <HStack justify="between" style={{ marginTop: spacing.xs }}>
          <span style={{ fontSize: typography.fontSize.xs, color: theme.colors.textMuted }}>50%</span>
          <span style={{ fontSize: typography.fontSize.xs, color: theme.colors.textMuted }}>200%</span>
        </HStack>
      </FormGroup>
    );
  };

  // Color picker component using HTML color input (like VideoPanel context menu)
  const ColorPicker: React.FC<{
    label: string;
    value: string;
    onChange: (color: string) => void;
    includeTransparent?: boolean;
  }> = ({ label, value, onChange, includeTransparent = false }) => {
    const colorInputStyles: React.CSSProperties = {
      width: '100%',
      height: 40,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: borderRadius.md,
      backgroundColor: theme.colors.surface,
      cursor: 'pointer',
    };

    const transparentButtonStyles: React.CSSProperties = {
      padding: `${spacing.sm}px ${spacing.md}px`,
      backgroundColor: value === 'transparent' ? theme.colors.primary : theme.colors.surface,
      color: value === 'transparent' ? theme.colors.primaryForeground : theme.colors.text,
      border: `1px solid ${value === 'transparent' ? theme.colors.primary : theme.colors.border}`,
      borderRadius: borderRadius.md,
      cursor: 'pointer',
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      transition: 'all 0.2s ease',
      minWidth: 90,
    };

    return (
      <FormGroup label={label}>
        <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'center' }}>
          <input
            type="color"
            value={value === 'transparent' ? '#000000' : value}
            onChange={(e) => onChange(e.target.value)}
            style={colorInputStyles}
            disabled={value === 'transparent'}
          />
          {includeTransparent && (
            <button
              type="button"
              onClick={() => onChange('transparent')}
              style={transparentButtonStyles}
            >
              Transparent
            </button>
          )}
        </div>
      </FormGroup>
    );
  };

  // Render mode buttons
  const RenderModeSelector: React.FC = () => {
    const currentMode = style.renderMode || 'horizontal';

    const modeButtonStyles = (isSelected: boolean): React.CSSProperties => ({
      flex: 1,
      padding: `${spacing.sm}px ${spacing.lg}px`,
      backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
      color: isSelected ? theme.colors.primaryForeground : theme.colors.text,
      border: `1px solid ${isSelected ? theme.colors.primary : theme.colors.border}`,
      borderRadius: borderRadius.md,
      cursor: 'pointer',
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      transition: 'all 0.2s ease',
    });

    const descriptionText = currentMode === 'progressive' 
      ? 'Words appear line-by-line vertically as they are spoken'
      : 'Traditional horizontal layout with word highlighting';

    return (
      <FormGroup 
        label="Text Reveal Style" 
        hint={descriptionText}
      >
        <HStack gap="sm">
          <button
            onClick={() => onStyleUpdate({ renderMode: 'horizontal' })}
            style={modeButtonStyles(currentMode === 'horizontal')}
          >
            Horizontal
          </button>
          <button
            onClick={() => onStyleUpdate({ renderMode: 'progressive' })}
            style={modeButtonStyles(currentMode === 'progressive')}
          >
            Progressive
          </button>
        </HStack>
      </FormGroup>
    );
  };

  return (
    <FormSection 
      title="Style Settings" 
      description="Customize the appearance and behavior of your captions"
    >
      <Stack gap="xl">
        {/* Font Settings */}
        <FormGrid columns={1}>
          <FontSizeSlider />
          <ScaleSlider />
          
          <FormGroup label="Font Family">
            <Select
              value={style.font}
              onChange={(e) => onStyleUpdate({ font: e.target.value })}
            >
              <option value="SF Pro Display Semibold">SF Pro Display Semibold</option>
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Georgia">Georgia</option>
              <option value="Montserrat">Montserrat</option>
            </Select>
          </FormGroup>
        </FormGrid>

        {/* Color Settings */}
        <Stack gap="lg">
          <ColorPicker
            label="Text Color"
            value={style.textColor}
            onChange={(color) => onStyleUpdate({ textColor: color })}
          />
          
          <ColorPicker
            label="Highlighter Color"
            value={style.highlighterColor}
            onChange={(color) => onStyleUpdate({ highlighterColor: color })}
          />
          
          <ColorPicker
            label="Background Color"
            value={style.backgroundColor}
            onChange={(color) => onStyleUpdate({ backgroundColor: color })}
            includeTransparent={true}
          />
        </Stack>

        {/* Behavior Settings */}
        <Stack gap="lg">
          <RenderModeSelector />
          
          <Checkbox
            label="Emphasis Mode"
            description={
              style.emphasizeMode 
                ? 'Highlighted words will be emphasized (larger + color change)'
                : 'Highlighted words will have background highlighting'
            }
            checked={style.emphasizeMode || false}
            onChange={(e) => onStyleUpdate({ emphasizeMode: e.target.checked })}
          />
          
          <Checkbox
            label="Burn-in Subtitles"
            description={
              style.burnInSubtitles !== false
                ? 'Subtitles will be permanently embedded in the exported video'
                : 'Subtitles will not appear in the exported video (SRT file only)'
            }
            checked={style.burnInSubtitles !== false}
            onChange={(e) => onStyleUpdate({ burnInSubtitles: e.target.checked })}
          />
        </Stack>
      </Stack>
    </FormSection>
  );
};