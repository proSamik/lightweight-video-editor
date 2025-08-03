import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  FormGroup, 
  FormSection,
  FormGrid,
  FormRow,
  Stack, 
  HStack,
  Button,
  Select,
  Checkbox,
  spacing, 
  typography, 
  borderRadius 
} from '../ui';
import { FontOption, ColorOption, CaptionStyle } from '../../../types';

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

  // Color picker component
  const ColorPicker: React.FC<{
    label: string;
    value: string;
    onChange: (color: string) => void;
    includeTransparent?: boolean;
  }> = ({ label, value, onChange, includeTransparent = false }) => {
    const colorButtonStyles = (color: string, isSelected: boolean): React.CSSProperties => ({
      width: 32,
      height: 32,
      borderRadius: borderRadius.sm,
      border: isSelected 
        ? `3px solid ${theme.colors.primary}` 
        : `1px solid ${theme.colors.border}`,
      cursor: 'pointer',
      backgroundColor: color === 'transparent' ? 'transparent' : color,
      backgroundImage: color === 'transparent' 
        ? `linear-gradient(45deg, ${theme.colors.border} 25%, transparent 25%), linear-gradient(-45deg, ${theme.colors.border} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${theme.colors.border} 75%), linear-gradient(-45deg, transparent 75%, ${theme.colors.border} 75%)`
        : undefined,
      backgroundSize: color === 'transparent' ? '8px 8px' : undefined,
      backgroundPosition: color === 'transparent' ? '0 0, 0 4px, 4px -4px, -4px 0px' : undefined,
      transition: 'all 0.2s ease',
      position: 'relative',
    });

    const colors = includeTransparent 
      ? ['transparent', ...Object.values(ColorOption).filter(c => c !== 'transparent')]
      : Object.values(ColorOption).filter(c => c !== 'transparent');

    return (
      <FormGroup label={label}>
        <div style={{ 
          display: 'flex', 
          gap: spacing.sm, 
          flexWrap: 'wrap',
          padding: spacing.sm,
          backgroundColor: theme.colors.backgroundSecondary,
          borderRadius: borderRadius.md,
        }}>
          {colors.map(color => (
            <button
              key={color}
              onClick={() => onChange(color)}
              style={colorButtonStyles(color, value === color)}
              title={color}
              aria-label={`Select ${color} color`}
            />
          ))}
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