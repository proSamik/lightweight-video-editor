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
          max="2.0"
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

  // Stroke width slider component
  const StrokeWidthSlider: React.FC = () => {
    const strokeWidth = style.strokeWidth || 0;

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
      <FormGroup label="Stroke Width" hint={`Current: ${strokeWidth}px`}>
        <input
          type="range"
          min="0"
          max="10"
          step="0.5"
          value={strokeWidth}
          onChange={(e) => onStyleUpdate({ strokeWidth: parseFloat(e.target.value) })}
          style={sliderStyles}
        />
        <HStack justify="between" style={{ marginTop: spacing.xs }}>
          <span style={{ fontSize: typography.fontSize.xs, color: theme.colors.textMuted }}>0px</span>
          <span style={{ fontSize: typography.fontSize.xs, color: theme.colors.textMuted }}>10px</span>
        </HStack>
      </FormGroup>
    );
  };

  // Position controls component
  const PositionControls: React.FC = () => {
    const position = style.position || { x: 50, y: 80, z: 0 };

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
      <FormGroup label="Position" hint="X: percentage from left, Y: percentage from top">
        <Stack gap="md">
          {/* X Position */}
          <div>
            <HStack justify="between" style={{ marginBottom: spacing.xs }}>
              <span style={{ fontSize: typography.fontSize.sm, color: theme.colors.text }}>X Position</span>
              <span style={{ fontSize: typography.fontSize.xs, color: theme.colors.textMuted }}>{Math.round(position.x)}%</span>
            </HStack>
            <input
              type="range"
              min="0"
              max="100"
              value={position.x}
              onChange={(e) => onStyleUpdate({ 
                position: { ...position, x: parseFloat(e.target.value) }
              })}
              style={sliderStyles}
            />
          </div>

          {/* Y Position */}
          <div>
            <HStack justify="between" style={{ marginBottom: spacing.xs }}>
              <span style={{ fontSize: typography.fontSize.sm, color: theme.colors.text }}>Y Position</span>
              <span style={{ fontSize: typography.fontSize.xs, color: theme.colors.textMuted }}>{Math.round(position.y)}%</span>
            </HStack>
            <input
              type="range"
              min="0"
              max="100"
              value={position.y}
              onChange={(e) => onStyleUpdate({ 
                position: { ...position, y: parseFloat(e.target.value) }
              })}
              style={sliderStyles}
            />
          </div>

          {/* Z Rotation */}
          <div>
            <HStack justify="between" style={{ marginBottom: spacing.xs }}>
              <span style={{ fontSize: typography.fontSize.sm, color: theme.colors.text }}>Z Rotation</span>
              <span style={{ fontSize: typography.fontSize.xs, color: theme.colors.textMuted }}>{position.z || 0}°</span>
            </HStack>
            <input
              type="range"
              min="0"
              max="360"
              value={position.z || 0}
              onChange={(e) => onStyleUpdate({ 
                position: { ...position, z: parseFloat(e.target.value) }
              })}
              style={sliderStyles}
            />
          </div>
        </Stack>
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

  // Text alignment selector (only shown for progressive mode)
  const TextAlignmentSelector: React.FC = () => {
    const currentAlign = style.textAlign || 'center';

    const alignButtonStyles = (isSelected: boolean): React.CSSProperties => ({
      flex: 1,
      padding: `${spacing.sm}px ${spacing.md}px`,
      backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
      color: isSelected ? theme.colors.primaryForeground : theme.colors.text,
      border: `1px solid ${isSelected ? theme.colors.primary : theme.colors.border}`,
      borderRadius: borderRadius.md,
      cursor: 'pointer',
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    });

    // Only show for progressive mode
    if (style.renderMode !== 'progressive') {
      return null;
    }

    return (
      <FormGroup 
        label="Text Alignment" 
        hint="How text is aligned in progressive mode"
      >
        <HStack gap="sm">
          <button
            onClick={() => onStyleUpdate({ textAlign: 'left' })}
            style={alignButtonStyles(currentAlign === 'left')}
            title="Left align"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path 
                d="M3 6h18M3 12h12M3 18h18" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            onClick={() => onStyleUpdate({ textAlign: 'center' })}
            style={alignButtonStyles(currentAlign === 'center')}
            title="Center align"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path 
                d="M3 6h18M6 12h12M3 18h18" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            onClick={() => onStyleUpdate({ textAlign: 'right' })}
            style={alignButtonStyles(currentAlign === 'right')}
            title="Right align"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path 
                d="M3 6h18M9 12h12M3 18h18" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
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
          <StrokeWidthSlider />
          <PositionControls />
          
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
          
          <FormGroup label="Text Transform">
            <Select
              value={style.textTransform || 'none'}
              onChange={(e) => onStyleUpdate({ textTransform: e.target.value as 'none' | 'capitalize' | 'uppercase' | 'lowercase' })}
            >
              <option value="none">None</option>
              <option value="capitalize">Capitalize</option>
              <option value="uppercase">Uppercase</option>
              <option value="lowercase">Lowercase</option>
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
          
          <ColorPicker
            label="Stroke Color"
            value={style.strokeColor || '#000000'}
            onChange={(color) => onStyleUpdate({ strokeColor: color })}
            includeTransparent={true}
          />
        </Stack>

        {/* Behavior Settings */}
        <Stack gap="lg">
          <RenderModeSelector />
          <TextAlignmentSelector />
          
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