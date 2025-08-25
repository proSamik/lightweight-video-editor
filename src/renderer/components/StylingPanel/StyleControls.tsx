import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { FiType, FiRotateCw, FiDroplet, FiAlignLeft, FiAlignCenter, FiAlignRight, FiMove, FiSettings } from 'react-icons/fi';
import { SubtitleStyle } from '../../../types';

interface StyleControlsProps {
  style: SubtitleStyle;
  onStyleUpdate: (updates: Partial<SubtitleStyle>) => void;
}

export const StyleControls: React.FC<StyleControlsProps> = ({
  style,
  onStyleUpdate,
}) => {
  const { theme } = useTheme();

  // Custom slider thumb styles
  const sliderThumbStyles = `
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: ${theme.colors.primary};
      cursor: pointer;
      border: none;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    
    input[type="range"]::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: ${theme.colors.primary};
      cursor: pointer;
      border: none;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    
    input[type="range"]::-ms-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: ${theme.colors.primary};
      cursor: pointer;
      border: none;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
  `;

  // Section header component for consistent styling
  const SectionHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
      <div style={{
        width: '24px',
        height: '24px',
        backgroundColor: theme.colors.accent,
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {icon}
      </div>
      <h3 style={{ 
        margin: 0, 
        fontSize: '13px', 
        fontWeight: '600', 
        color: theme.colors.text,
        letterSpacing: '0.01em'
      }}>
        {title}
      </h3>
    </div>
  );

  // Consistent control container styling
  const controlContainerStyle: React.CSSProperties = {
    padding: '10px',
    backgroundColor: theme.colors.background,
    borderRadius: '8px',
    border: `1px solid ${theme.colors.border}`,
    marginBottom: '12px'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: '6px',
    display: 'block'
  };

  const valueDisplayStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: '600',
    color: theme.colors.primary
  };

  return (
    <>
      <style>{sliderThumbStyles}</style>
      <div style={{ padding: '16px', overflow: 'hidden', backgroundColor: theme.colors.surface }}>
        
        {/* Z-Axis Rotation */}
        <div style={{ marginBottom: '20px' }}>
          <SectionHeader 
            icon={<FiRotateCw size={12} color={theme.colors.accentForeground} />}
            title="Rotation"
          />
          <div style={controlContainerStyle}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px'
            }}>
              <label style={labelStyle}>
                Z-Axis Rotation
              </label>
              <span style={valueDisplayStyle}>
                {style.position?.z || 0}°
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              value={style.position?.z || 0}
              onChange={(e) => {
                onStyleUpdate({
                  position: { ...(style.position || { x: 50, y: 80, z: 0 }), z: parseInt(e.target.value) }
                });
              }}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: `linear-gradient(to right, ${theme.colors.primary} 0%, ${theme.colors.primary} ${((style.position?.z || 0) / 360) * 100}%, ${theme.colors.border} ${((style.position?.z || 0) / 360) * 100}%, ${theme.colors.border} 100%)`,
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer',
                WebkitAppearance: 'none',
                MozAppearance: 'none'
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '6px',
              fontSize: '9px',
              color: theme.colors.textSecondary,
              fontWeight: '500'
            }}>
              <span>0°</span>
              <span>360°</span>
            </div>
          </div>
        </div>

        {/* Render Mode */}
        <div style={{ marginBottom: '20px' }}>
          <SectionHeader 
            icon={<FiSettings size={12} color={theme.colors.accentForeground} />}
            title="Render Mode"
          />
          <p style={{
            margin: '0 0 12px 0',
            fontSize: '10px',
            color: theme.colors.textSecondary,
            lineHeight: '1.4'
          }}>
            Choose how the text should be rendered on the video.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px'
          }}>
            {[
              { value: 'horizontal', label: 'Horizontal', description: 'Standard text display' },
              { value: 'progressive', label: 'Progressive', description: 'Word-by-word highlighting' }
            ].map((mode) => (
              <button
                key={mode.value}
                onClick={() => onStyleUpdate({ renderMode: mode.value as 'horizontal' | 'progressive' })}
                style={{
                  padding: '12px',
                  backgroundColor: style.renderMode === mode.value 
                    ? theme.colors.primary 
                    : theme.colors.background,
                  color: style.renderMode === mode.value 
                    ? theme.colors.primaryForeground 
                    : theme.colors.text,
                  border: `1px solid ${style.renderMode === mode.value 
                    ? theme.colors.primary 
                    : theme.colors.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '10px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '3px',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => {
                  if (style.renderMode !== mode.value) {
                    e.currentTarget.style.backgroundColor = theme.colors.surfaceHover || theme.colors.background;
                  }
                }}
                onMouseLeave={(e) => {
                  if (style.renderMode !== mode.value) {
                    e.currentTarget.style.backgroundColor = theme.colors.background;
                  }
                }}
              >
                <span style={{ fontWeight: '600', fontSize: '11px' }}>{mode.label}</span>
                <span style={{ 
                  fontSize: '8px', 
                  opacity: 0.7,
                  lineHeight: '1.2'
                }}>
                  {mode.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Text Alignment (only for progressive mode) */}
        {style.renderMode === 'progressive' && (
          <div style={{ marginBottom: '20px' }}>
            <SectionHeader 
              icon={<FiAlignCenter size={12} color={theme.colors.accentForeground} />}
              title="Text Alignment"
            />
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px'
            }}>
              {[
                { value: 'left', label: 'Left', icon: <FiAlignLeft size={12} /> },
                { value: 'center', label: 'Center', icon: <FiAlignCenter size={12} /> },
                { value: 'right', label: 'Right', icon: <FiAlignRight size={12} /> }
              ].map((align) => (
                <button
                  key={align.value}
                  onClick={() => onStyleUpdate({ textAlign: align.value as 'left' | 'center' | 'right' })}
                  style={{
                    padding: '10px 8px',
                    backgroundColor: style.textAlign === align.value 
                      ? theme.colors.primary 
                      : theme.colors.background,
                    color: style.textAlign === align.value 
                      ? theme.colors.primaryForeground 
                      : theme.colors.text,
                    border: `1px solid ${style.textAlign === align.value 
                      ? theme.colors.primary 
                      : theme.colors.border}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onMouseEnter={(e) => {
                    if (style.textAlign !== align.value) {
                      e.currentTarget.style.backgroundColor = theme.colors.surfaceHover || theme.colors.background;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (style.textAlign !== align.value) {
                      e.currentTarget.style.backgroundColor = theme.colors.background;
                    }
                  }}
                >
                  {align.icon}
                  <span>{align.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Typography */}
        <div style={{ marginBottom: '20px' }}>
          <SectionHeader 
            icon={<FiType size={12} color={theme.colors.accentForeground} />}
            title="Typography"
          />
          
          {/* Font Size */}
          <div style={controlContainerStyle}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px'
            }}>
              <label style={labelStyle}>
                Font Size
              </label>
              <span style={valueDisplayStyle}>
                {style.fontSize}px
              </span>
            </div>
            <input
              type="range"
              min="16"
              max="200"
              value={style.fontSize}
              onChange={(e) => onStyleUpdate({ fontSize: parseInt(e.target.value) })}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: `linear-gradient(to right, ${theme.colors.primary} 0%, ${theme.colors.primary} ${((style.fontSize - 16) / (200 - 16)) * 100}%, ${theme.colors.border} ${((style.fontSize - 16) / (200 - 16)) * 100}%, ${theme.colors.border} 100%)`,
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer',
                WebkitAppearance: 'none',
                MozAppearance: 'none'
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '6px',
              fontSize: '9px',
              color: theme.colors.textSecondary,
              fontWeight: '500'
            }}>
              <span>16px</span>
              <span>200px</span>
            </div>
          </div>

          {/* Scale */}
          <div style={controlContainerStyle}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px'
            }}>
              <label style={labelStyle}>
                Scale
              </label>
              <span style={valueDisplayStyle}>
                {Math.round((style.scale || 1) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={style.scale || 1}
              onChange={(e) => onStyleUpdate({ scale: parseFloat(e.target.value) })}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: `linear-gradient(to right, ${theme.colors.primary} 0%, ${theme.colors.primary} ${(((style.scale || 1) - 0.5) / (2.0 - 0.5)) * 100}%, ${theme.colors.border} ${(((style.scale || 1) - 0.5) / (2.0 - 0.5)) * 100}%, ${theme.colors.border} 100%)`,
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer',
                WebkitAppearance: 'none',
                MozAppearance: 'none'
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '6px',
              fontSize: '9px',
              color: theme.colors.textSecondary,
              fontWeight: '500'
            }}>
              <span>50%</span>
              <span>200%</span>
            </div>
          </div>

          {/* Font Family */}
          <div style={controlContainerStyle}>
            <label style={labelStyle}>
              Font Family
            </label>
            <select
              value={style.font || 'Poppins'}
              onChange={(e) => onStyleUpdate({ font: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 10px',
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '8px',
                fontSize: '10px',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = theme.colors.borderFocus || theme.colors.primary;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = theme.colors.border;
              }}
            >
              <option value="Segoe UI">Segoe UI (Microsoft System)</option>
              <option value="Inter">Inter (Modern & Readable)</option>
              <option value="Roboto">Roboto (Google System)</option>
              <option value="Open Sans">Open Sans (Clean & Friendly)</option>
              <option value="Source Sans Pro">Source Sans Pro (Adobe)</option>
              <option value="Noto Sans">Noto Sans (Universal)</option>
              <option value="SF Pro Display">SF Pro Display (Apple)</option>
              <option value="Ubuntu">Ubuntu (Modern)</option>
              <option value="Montserrat">Montserrat (Stylish & Modern)</option>
              <option value="Poppins">Poppins (Clean & Geometric)</option>
              <option value="Raleway">Raleway (Elegant & Light)</option>
              <option value="Lato">Lato (Friendly & Readable)</option>
              <option value="Nunito">Nunito (Rounded & Friendly)</option>
              <option value="Quicksand">Quicksand (Modern & Rounded)</option>
              <option value="Arial">Arial (Classic)</option>
              <option value="Helvetica">Helvetica (Classic)</option>
            </select>
          </div>

          {/* Text Transform */}
          <div style={controlContainerStyle}>
            <label style={labelStyle}>
              Text Transform
            </label>
            <select
              value={style.textTransform || 'none'}
              onChange={(e) => onStyleUpdate({ textTransform: e.target.value as 'none' | 'capitalize' | 'uppercase' | 'lowercase' })}
              style={{
                width: '100%',
                padding: '8px 10px',
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '8px',
                fontSize: '10px',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = theme.colors.borderFocus || theme.colors.primary;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = theme.colors.border;
              }}
            >
              <option value="none">None</option>
              <option value="capitalize">Capitalize</option>
              <option value="uppercase">Uppercase</option>
              <option value="lowercase">Lowercase</option>
            </select>
          </div>

          {/* Stroke Width */}
          <div style={controlContainerStyle}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px'
            }}>
              <label style={labelStyle}>
                Stroke Width
              </label>
              <span style={valueDisplayStyle}>
                {style.strokeWidth || 0}px
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={style.strokeWidth || 0}
              onChange={(e) => onStyleUpdate({ strokeWidth: parseFloat(e.target.value) })}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: `linear-gradient(to right, ${theme.colors.primary} 0%, ${theme.colors.primary} ${((style.strokeWidth || 0) / 10) * 100}%, ${theme.colors.border} ${((style.strokeWidth || 0) / 10) * 100}%, ${theme.colors.border} 100%)`,
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer',
                WebkitAppearance: 'none',
                MozAppearance: 'none'
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '6px',
              fontSize: '9px',
              color: theme.colors.textSecondary,
              fontWeight: '500'
            }}>
              <span>0px</span>
              <span>10px</span>
            </div>
          </div>
        </div>

        {/* Colors */}
        <div style={{ marginBottom: '20px' }}>
          <SectionHeader 
            icon={<FiDroplet size={12} color={theme.colors.accentForeground} />}
            title="Colors"
          />
          
          {/* Text Color */}
          <div style={controlContainerStyle}>
            <label style={labelStyle}>
              Text Color
            </label>
            <input
              type="color"
              value={style.textColor || '#ffffff'}
              onChange={(e) => onStyleUpdate({ textColor: e.target.value })}
              style={{
                width: '100%',
                height: '30px',
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            />
          </div>

          {/* Highlight Color */}
          <div style={controlContainerStyle}>
            <label style={labelStyle}>
              Highlight Color
            </label>
            <input
              type="color"
              value={style.highlighterColor || '#ffff00'}
              onChange={(e) => onStyleUpdate({ highlighterColor: e.target.value })}
              style={{
                width: '100%',
                height: '30px',
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            />
          </div>

          {/* Background Color */}
          <div style={controlContainerStyle}>
            <label style={labelStyle}>
              Background Color
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="color"
                value={style.backgroundColor === 'transparent' ? '#000000' : (style.backgroundColor || '#80000000')}
                onChange={(e) => onStyleUpdate({ backgroundColor: e.target.value })}
                style={{
                  flex: 1,
                  height: '30px',
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              />
              <button
                onClick={() => onStyleUpdate({ backgroundColor: 'transparent' })}
                style={{
                  padding: '6px 10px',
                  backgroundColor: style.backgroundColor === 'transparent' 
                    ? theme.colors.primary 
                    : theme.colors.background,
                  color: style.backgroundColor === 'transparent' 
                    ? theme.colors.primaryForeground 
                    : theme.colors.text,
                  border: `1px solid ${style.backgroundColor === 'transparent' 
                    ? theme.colors.primary 
                    : theme.colors.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '10px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (style.backgroundColor !== 'transparent') {
                    e.currentTarget.style.backgroundColor = theme.colors.surfaceHover || theme.colors.background;
                  }
                }}
                onMouseLeave={(e) => {
                  if (style.backgroundColor !== 'transparent') {
                    e.currentTarget.style.backgroundColor = theme.colors.background;
                  }
                }}
              >
                Transparent
              </button>
            </div>
          </div>

          {/* Stroke Color */}
          <div style={controlContainerStyle}>
            <label style={labelStyle}>
              Stroke Color
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="color"
                value={style.strokeColor || '#000000'}
                onChange={(e) => onStyleUpdate({ strokeColor: e.target.value })}
                style={{
                  flex: 1,
                  height: '30px',
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              />
              <button
                onClick={() => onStyleUpdate({ strokeColor: 'transparent' })}
                style={{
                  padding: '6px 10px',
                  backgroundColor: (style.strokeColor || '#000000') === 'transparent' 
                    ? theme.colors.primary 
                    : theme.colors.background,
                  color: (style.strokeColor || '#000000') === 'transparent' 
                    ? theme.colors.primaryForeground 
                    : theme.colors.text,
                  border: `1px solid ${(style.strokeColor || '#000000') === 'transparent' 
                    ? theme.colors.primary 
                    : theme.colors.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '10px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if ((style.strokeColor || '#000000') !== 'transparent') {
                    e.currentTarget.style.backgroundColor = theme.colors.surfaceHover || theme.colors.background;
                  }
                }}
                onMouseLeave={(e) => {
                  if ((style.strokeColor || '#000000') !== 'transparent') {
                    e.currentTarget.style.backgroundColor = theme.colors.background;
                  }
                }}
              >
                Transparent
              </button>
            </div>
          </div>
        </div>

        {/* Position Controls */}
        <div style={{ marginBottom: '20px' }}>
          <SectionHeader 
            icon={<FiMove size={12} color={theme.colors.accentForeground} />}
            title="Position"
          />
          
          {/* X Position */}
          <div style={controlContainerStyle}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px'
            }}>
              <label style={labelStyle}>
                X Position (Left/Right)
              </label>
              <span style={valueDisplayStyle}>
                {Math.round(style.position?.x || 50)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={style.position?.x || 50}
              onChange={(e) => onStyleUpdate({ 
                position: { ...(style.position || { x: 50, y: 80, z: 0 }), x: parseFloat(e.target.value) }
              })}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: `linear-gradient(to right, ${theme.colors.primary} 0%, ${theme.colors.primary} ${(style.position?.x || 50)}%, ${theme.colors.border} ${(style.position?.x || 50)}%, ${theme.colors.border} 100%)`,
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer',
                WebkitAppearance: 'none',
                MozAppearance: 'none'
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '6px',
              fontSize: '9px',
              color: theme.colors.textSecondary,
              fontWeight: '500'
            }}>
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Y Position */}
          <div style={controlContainerStyle}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px'
            }}>
              <label style={labelStyle}>
                Y Position (Top/Bottom)
              </label>
              <span style={valueDisplayStyle}>
                {Math.round(style.position?.y || 80)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={style.position?.y || 80}
              onChange={(e) => onStyleUpdate({ 
                position: { ...(style.position || { x: 50, y: 80, z: 0 }), y: parseFloat(e.target.value) }
              })}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: `linear-gradient(to right, ${theme.colors.primary} 0%, ${theme.colors.primary} ${(style.position?.y || 80)}%, ${theme.colors.border} ${(style.position?.y || 80)}%, ${theme.colors.border} 100%)`,
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer',
                WebkitAppearance: 'none',
                MozAppearance: 'none'
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '6px',
              fontSize: '9px',
              color: theme.colors.textSecondary,
              fontWeight: '500'
            }}>
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* Behavior Settings */}
        <div style={{ marginBottom: '20px' }}>
          <SectionHeader 
            icon={<FiSettings size={12} color={theme.colors.accentForeground} />}
            title="Behavior"
          />
          
          {/* Emphasis Mode Checkbox */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            gap: '12px', 
            padding: '12px',
            backgroundColor: theme.colors.background,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: '8px',
            marginBottom: '6px'
          }}>
            <input
              type="checkbox"
              id="emphasizeMode"
              checked={style.emphasizeMode || false}
              onChange={(e) => onStyleUpdate({ emphasizeMode: e.target.checked })}
              style={{
                width: '16px',
                height: '16px',
                marginTop: '2px',
                accentColor: theme.colors.primary
              }}
            />
            <div style={{ flex: 1 }}>
              <label htmlFor="emphasizeMode" style={{
                fontSize: '11px',
                fontWeight: '500',
                color: theme.colors.text,
                cursor: 'pointer',
                display: 'block',
                marginBottom: '2px'
              }}>
                Emphasis Mode
              </label>
              <div style={{
                fontSize: '10px',
                color: theme.colors.textSecondary,
                lineHeight: '1.3'
              }}>
                {style.emphasizeMode 
                  ? 'Highlighted words will be emphasized (larger + color change)'
                  : 'Highlighted words will have background highlighting'
                }
              </div>
            </div>
          </div>

          {/* Burn-in Subtitles Checkbox */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            gap: '12px', 
            padding: '12px',
            backgroundColor: theme.colors.background,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: '8px'
          }}>
            <input
              type="checkbox"
              id="burnInSubtitles"
              checked={style.burnInSubtitles !== false}
              onChange={(e) => onStyleUpdate({ burnInSubtitles: e.target.checked })}
              style={{
                width: '16px',
                height: '16px',
                marginTop: '2px',
                accentColor: theme.colors.primary
              }}
            />
            <div style={{ flex: 1 }}>
              <label htmlFor="burnInSubtitles" style={{
                fontSize: '11px',
                fontWeight: '500',
                color: theme.colors.text,
                cursor: 'pointer',
                display: 'block',
                marginBottom: '2px'
              }}>
                Burn-in Subtitles
              </label>
              <div style={{
                fontSize: '10px',
                color: theme.colors.textSecondary,
                lineHeight: '1.3'
              }}>
                {style.burnInSubtitles !== false
                  ? 'Subtitles will be permanently embedded in the exported video'
                  : 'Subtitles will not appear in the exported video (SRT file only)'
                }
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
};