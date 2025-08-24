import React, { useState } from 'react';
import { SubtitleFrame, SubtitleStyle } from '../../types';
import { useTheme } from '../contexts/ThemeContext';
import { FiType, FiRotateCw, FiDroplet, FiAlignLeft, FiAlignCenter, FiAlignRight } from 'react-icons/fi';

interface CaptionStyleModalProps {
  isOpen: boolean;
  onClose: () => void;
  caption: (Pick<SubtitleFrame, 'id' | 'style'> & { style: SubtitleStyle }) | null;
  onUpdate: (updates: { style: SubtitleStyle }) => void;
  position?: { x: number; y: number };
}

const CaptionStyleModal: React.FC<CaptionStyleModalProps> = ({
  isOpen,
  onClose,
  caption,
  onUpdate,
  position
}) => {
  const { theme } = useTheme();
  const [localStyle, setLocalStyle] = useState<SubtitleStyle>({
    font: 'Poppins',
    fontSize: 85,
    textColor: '#ffffff',
    highlighterColor: '#00ff00',
    backgroundColor: '#000000',
    strokeColor: '#000000',
    strokeWidth: 0,
    textTransform: 'none',
    position: { x: 50, y: 50, z: 0 },
    scale: 1,
    emphasizeMode: false,
    renderMode: 'horizontal',
    textAlign: 'center',
    burnInSubtitles: true
  });

  // Update local style when caption changes
  React.useEffect(() => {
    if (caption) {
      setLocalStyle(caption.style);
    }
  }, [caption]);

  const updateStyle = (updates: Partial<typeof localStyle>) => {
    const newStyle = { ...localStyle, ...updates };
    setLocalStyle(newStyle);
    if (caption && onUpdate) {
      onUpdate({ style: newStyle });
    }
  };

  const handleSave = () => {
    if (caption && onUpdate) {
      onUpdate({ style: localStyle });
    }
    onClose();
  };

  if (!caption || !isOpen) return null;

  // Smart positioning to avoid overflow
  const menuWidth = 300;
  const menuHeight = 300; // Approximate height
  const windowWidth = window.innerWidth;
  const windowHeight = 300;
  
  let left = position?.x || 100;
  let top = position?.y || 100;
  
  // Adjust horizontal position if menu would overflow right edge
  if (left + menuWidth > windowWidth) {
    left = (position?.x || 100) - menuWidth;
  }
  
  // Adjust vertical position if menu would overflow bottom edge
  if (top + menuHeight > windowHeight) {
    top = (position?.y || 100) - menuHeight;
  }
  
  // Ensure menu doesn't go above top edge
  if (top < 10) {
    top = 10;
  }
  
  // Ensure menu doesn't go beyond left edge
  if (left < 10) {
    left = 10;
  }

  return (
    <>
      <style>
        {`
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
        `}
      </style>
      <div
        style={{
          position: 'fixed',
          left: `${left}px`,
          top: `${top}px`,
          backgroundColor: theme.colors.modal.background,
          border: `1px solid ${theme.colors.modal.border}`,
          borderRadius: '12px',
          padding: '0',
          width: `${menuWidth}px`,
          maxHeight: '80vh',
          overflowY: 'auto',
          zIndex: 10000,
          boxShadow: theme.colors.modal.shadow,
          color: theme.colors.text,
          marginBottom: '10px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '12px 16px 8px 16px',
          borderBottom: `1px solid ${theme.colors.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '28px',
            height: '28px',
            backgroundColor: theme.colors.primary,
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FiType size={14} color={theme.colors.primaryForeground} />
          </div>
          <div>
            <h2 style={{
              margin: '0 0 2px 0',
              fontSize: '14px',
              fontWeight: '600',
              color: theme.colors.text
            }}>
              Caption Styling
            </h2>
            <p style={{
              margin: 0,
              fontSize: '11px',
              color: theme.colors.textSecondary
            }}>
              Customize the appearance of your captions
            </p>
          </div>
        </div>
        <div style={{ padding: '12px' }}>
          {/* Z-Axis Rotation */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                backgroundColor: theme.colors.accent,
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FiRotateCw size={12} color={theme.colors.accentForeground} />
              </div>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: theme.colors.text }}>
                Rotation
              </h3>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px'
            }}>
              <label style={{
                fontSize: '12px',
                fontWeight: '500',
                color: theme.colors.text
              }}>
                Z-Axis Rotation
              </label>
              <span style={{
                fontSize: '12px',
                fontWeight: '600',
                color: theme.colors.text
              }}>
                {localStyle.position?.z || 0}°
              </span>
            </div>
            <div style={{
              padding: '8px',
              backgroundColor: theme.colors.modal.background,
              borderRadius: theme.radius.md,
              border: `1px solid ${theme.colors.border}`
            }}>
              <input
                type="range"
                min="0"
                max="360"
                value={localStyle.position?.z || 0}
                onChange={(e) => {
                  updateStyle({
                    position: { ...localStyle.position, z: parseInt(e.target.value) }
                  });
                }}
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '3px',
                  background: `linear-gradient(to right, ${theme.colors.primary} 0%, ${theme.colors.primary} ${((localStyle.position?.z || 0) / 360) * 100}%, ${theme.colors.border} ${((localStyle.position?.z || 0) / 360) * 100}%, ${theme.colors.border} 100%)`,
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
                fontSize: '10px',
                color: theme.colors.textSecondary,
                fontWeight: '500'
              }}>
                <span>0°</span>
                <span>360°</span>
              </div>
            </div>
          </div>

          {/* Render Mode */}
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '14px',
              fontWeight: '600',
              color: theme.colors.text
            }}>
              Render Mode
            </h3>
            <p style={{
              margin: '0 0 10px 0',
              fontSize: '11px',
              color: theme.colors.textSecondary,
              lineHeight: '1.4'
            }}>
              Choose how the text should be rendered on the video.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '6px'
            }}>
              {[
                { value: 'horizontal', label: 'Horizontal', description: 'Standard text display' },
                { value: 'progressive', label: 'Progressive', description: 'Word-by-word highlighting' }
              ].map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => updateStyle({ renderMode: mode.value as 'horizontal' | 'progressive' })}
                  style={{
                    padding: '10px',
                    backgroundColor: localStyle.renderMode === mode.value 
                      ? theme.colors.primary 
                      : theme.colors.surface,
                    color: localStyle.renderMode === mode.value 
                      ? theme.colors.primaryForeground 
                      : theme.colors.text,
                    border: `1px solid ${localStyle.renderMode === mode.value 
                      ? theme.colors.primary 
                      : theme.colors.border}`,
                    borderRadius: theme.radius.md,
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '2px',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    if (localStyle.renderMode !== mode.value) {
                      e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (localStyle.renderMode !== mode.value) {
                      e.currentTarget.style.backgroundColor = theme.colors.surface;
                    }
                  }}
                >
                  <span style={{ fontWeight: '600' }}>{mode.label}</span>
                  <span style={{ 
                    fontSize: '9px', 
                    opacity: 0.8
                  }}>
                    {mode.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Text Alignment (only for progressive mode) */}
          {localStyle.renderMode === 'progressive' && (
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{
                margin: '0 0 8px 0',
                fontSize: '14px',
                fontWeight: '600',
                color: theme.colors.text
              }}>
                Text Alignment
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '6px'
              }}>
                {[
                  { value: 'left', label: 'Left', icon: <FiAlignLeft size={12} /> },
                  { value: 'center', label: 'Center', icon: <FiAlignCenter size={12} /> },
                  { value: 'right', label: 'Right', icon: <FiAlignRight size={12} /> }
                ].map((align) => (
                  <button
                    key={align.value}
                    onClick={() => updateStyle({ textAlign: align.value as 'left' | 'center' | 'right' })}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: localStyle.textAlign === align.value 
                        ? theme.colors.primary 
                        : theme.colors.surface,
                      color: localStyle.textAlign === align.value 
                        ? theme.colors.primaryForeground 
                        : theme.colors.text,
                      border: `1px solid ${localStyle.textAlign === align.value 
                        ? theme.colors.primary 
                        : theme.colors.border}`,
                      borderRadius: theme.radius.md,
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    onMouseEnter={(e) => {
                      if (localStyle.textAlign !== align.value) {
                        e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (localStyle.textAlign !== align.value) {
                        e.currentTarget.style.backgroundColor = theme.colors.surface;
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

          {/* Font Family */}
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '14px',
              fontWeight: '600',
              color: theme.colors.text
            }}>
              Typography
            </h3>
            <div style={{ marginBottom: '12px' }}>
              <label style={{
                fontSize: '12px',
                fontWeight: '500',
                color: theme.colors.text,
                marginBottom: '6px',
                display: 'block'
              }}>
                Font Family
              </label>
                              <select
                  value={localStyle.font || 'Poppins'}
                  onChange={(e) => updateStyle({ font: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: theme.colors.modal.background,
                    color: theme.colors.text,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.radius.md,
                    fontSize: '11px',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = theme.colors.borderFocus;
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
            <div>
              <label style={{
                fontSize: '12px',
                fontWeight: '500',
                color: theme.colors.text,
                marginBottom: '6px',
                display: 'block'
              }}>
                Text Transform
              </label>
              <select
                value={localStyle.textTransform || 'none'}
                onChange={(e) => updateStyle({ textTransform: e.target.value as 'none' | 'capitalize' | 'uppercase' | 'lowercase' })}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: theme.colors.modal.background,
                  color: theme.colors.text,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radius.md,
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = theme.colors.borderFocus;
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
          </div>

          {/* Colors */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                backgroundColor: theme.colors.accent,
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FiDroplet size={12} color={theme.colors.accentForeground} />
              </div>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: theme.colors.text }}>
                Colors
              </h3>
            </div>
            
            {/* Text Color */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{
                fontSize: '12px',
                fontWeight: '500',
                color: theme.colors.text,
                marginBottom: '6px',
                display: 'block'
              }}>
                Text Color
              </label>
              <input
                type="color"
                value={localStyle.textColor || '#ffffff'}
                onChange={(e) => updateStyle({ textColor: e.target.value })}
                style={{
                  width: '100%',
                  height: '30px',
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radius.md,
                  cursor: 'pointer'
                }}
              />
            </div>

            {/* Highlight Color */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                fontSize: '14px',
                fontWeight: '500',
                color: theme.colors.text,
                marginBottom: '8px',
                display: 'block'
              }}>
                Highlight Color
              </label>
              <input
                type="color"
                value={localStyle.highlighterColor || '#ffff00'}
                onChange={(e) => updateStyle({ highlighterColor: e.target.value })}
                style={{
                  width: '100%',
                  height: '40px',
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radius.md,
                  cursor: 'pointer'
                }}
              />
            </div>

            {/* Background Color */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                fontSize: '14px',
                fontWeight: '500',
                color: theme.colors.text,
                marginBottom: '8px',
                display: 'block'
              }}>
                Background Color
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={localStyle.backgroundColor === 'transparent' ? '#000000' : (localStyle.backgroundColor || '#80000000')}
                  onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                  style={{
                    flex: 1,
                    height: '40px',
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.radius.md,
                    cursor: 'pointer'
                  }}
                />
                <button
                  onClick={() => updateStyle({ backgroundColor: 'transparent' })}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: localStyle.backgroundColor === 'transparent' 
                      ? theme.colors.primary 
                      : theme.colors.surface,
                    color: localStyle.backgroundColor === 'transparent' 
                      ? theme.colors.primaryForeground 
                      : theme.colors.text,
                    border: `1px solid ${localStyle.backgroundColor === 'transparent' 
                      ? theme.colors.primary 
                      : theme.colors.border}`,
                    borderRadius: theme.radius.md,
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (localStyle.backgroundColor !== 'transparent') {
                      e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (localStyle.backgroundColor !== 'transparent') {
                      e.currentTarget.style.backgroundColor = theme.colors.surface;
                    }
                  }}
                >
                  Transparent
                </button>
              </div>
            </div>

            {/* Stroke Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: theme.colors.text,
                  marginBottom: '8px',
                  display: 'block'
                }}>
                  Stroke Color
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={localStyle.strokeColor || '#000000'}
                    onChange={(e) => updateStyle({ strokeColor: e.target.value })}
                    style={{
                      flex: 1,
                      height: '40px',
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.radius.md,
                      cursor: 'pointer'
                    }}
                  />
                  <button
                    onClick={() => updateStyle({ strokeColor: 'transparent' })}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: (localStyle.strokeColor || '#000000') === 'transparent' 
                        ? theme.colors.primary 
                        : theme.colors.surface,
                      color: (localStyle.strokeColor || '#000000') === 'transparent' 
                        ? theme.colors.primaryForeground 
                        : theme.colors.text,
                      border: `1px solid ${(localStyle.strokeColor || '#000000') === 'transparent' 
                        ? theme.colors.primary 
                        : theme.colors.border}`,
                      borderRadius: theme.radius.md,
                      cursor: 'pointer',
                      fontSize: '10px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if ((localStyle.strokeColor || '#000000') !== 'transparent') {
                        e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if ((localStyle.strokeColor || '#000000') !== 'transparent') {
                        e.currentTarget.style.backgroundColor = theme.colors.surface;
                      }
                    }}
                  >
                    Transparent
                  </button>
                </div>
              </div>
              <div>
                <label style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: theme.colors.text,
                  marginBottom: '8px',
                  display: 'block'
                }}>
                  Stroke Width
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={localStyle.strokeWidth || 0}
                    onChange={(e) => updateStyle({ strokeWidth: parseFloat(e.target.value) })}
                    style={{
                      flex: 1,
                      height: '6px',
                      borderRadius: '3px',
                      background: `linear-gradient(to right, ${theme.colors.primary} 0%, ${theme.colors.primary} ${((localStyle.strokeWidth || 0) / 10) * 100}%, ${theme.colors.border} ${((localStyle.strokeWidth || 0) / 10) * 100}%, ${theme.colors.border} 100%)`,
                      outline: 'none',
                      appearance: 'none',
                      cursor: 'pointer',
                      WebkitAppearance: 'none',
                      MozAppearance: 'none'
                    }}
                  />
                  <span style={{
                    fontSize: '12px',
                    color: theme.colors.textSecondary,
                    fontWeight: '500',
                    minWidth: '30px'
                  }}>
                    {localStyle.strokeWidth || 0}px
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '8px',
            justifyContent: 'flex-end',
            borderTop: `1px solid ${theme.colors.border}`,
            paddingTop: '16px',
            marginBottom: '130px'
          }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: theme.colors.text,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radius.md,
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '8px 16px',
                backgroundColor: theme.colors.primary,
                color: theme.colors.primaryForeground,
                border: `1px solid ${theme.colors.primary}`,
                borderRadius: theme.radius.md,
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.primaryHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.primary;
              }}
            >
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CaptionStyleModal;
