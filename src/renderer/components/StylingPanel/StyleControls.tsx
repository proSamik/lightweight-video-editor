import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { FiType, FiMove, FiAlignLeft, FiAlignCenter, FiAlignRight } from 'react-icons/fi';
import { SubtitleStyle, FontOption, ColorOption } from '../../../types';

interface StyleControlsProps {
  style: SubtitleStyle;
  onStyleUpdate: (updates: Partial<SubtitleStyle>) => void;
}

export const StyleControls: React.FC<StyleControlsProps> = ({
  style,
  onStyleUpdate,
}) => {
  const { theme } = useTheme();
  const [openModal, setOpenModal] = useState<string | null>(null);

  // Custom slider thumb styles for proper dragging
  const sliderThumbStyles = `
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: ${theme.colors.primary};
      cursor: pointer;
      border: 2px solid #ffffff;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    }
    
    input[type="range"]::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: ${theme.colors.primary};
      cursor: pointer;
      border: 2px solid #ffffff;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
      -moz-appearance: none;
    }
    
    input[type="range"]::-ms-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: ${theme.colors.primary};
      cursor: pointer;
      border: 2px solid #ffffff;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    }

    input[type="range"]::-webkit-slider-track {
      height: 8px;
      border-radius: 4px;
      background: transparent;
    }
    
    input[type="range"]::-moz-range-track {
      height: 8px;
      border-radius: 4px;
      background: transparent;
      border: none;
    }
    
    input[type="range"]::-ms-track {
      height: 8px;
      border-radius: 4px;
      background: transparent;
      border: none;
      color: transparent;
    }
  `;

  // Modal Component
  const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ 
    isOpen, onClose, title, children 
  }) => {
    if (!isOpen) return null;
    
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }} onClick={onClose}>
        <div style={{
          backgroundColor: theme.colors.surface,
          borderRadius: '12px',
          padding: '20px',
          maxWidth: '400px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          border: `1px solid ${theme.colors.border}`
        }} onClick={(e) => e.stopPropagation()}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: theme.colors.text }}>
              {title}
            </h3>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                color: theme.colors.textSecondary
              }}
            >
              ×
            </button>
          </div>
          {children}
        </div>
      </div>
    );
  };

  // Compact Button Component
  const CompactButton: React.FC<{ 
    icon?: React.ReactNode; 
    label: string; 
    value?: string | number;
    onClick: () => void;
    active?: boolean;
  }> = ({ icon, label, value, onClick, active }) => (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px 12px',
        backgroundColor: active ? theme.colors.primary : theme.colors.background,
        color: active ? theme.colors.primaryForeground : theme.colors.text,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '10px',
        fontWeight: '500',
        gap: '4px',
        minWidth: '70px',
        transition: 'all 0.2s ease'
      }}
    >
      {icon && <div>{icon}</div>}
      <div style={{ textAlign: 'center' }}>
        <div>{label}</div>
        {value && <div style={{ fontWeight: '600' }}>{value}</div>}
      </div>
    </button>
  );

  return (
    <>
      <style>{sliderThumbStyles}</style>
      <div style={{ padding: '12px', overflow: 'hidden', backgroundColor: theme.colors.surface }}>
        
        {/* Burn-in Subtitles Toggle - Top */}
      <div style={{ 
        marginBottom: '16px',
        padding: '12px 16px',
        backgroundColor: theme.colors.background,
        borderRadius: '8px',
        border: `2px solid ${theme.colors.border}`,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
      }}>
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          fontSize: '11px',
          fontWeight: '500',
          color: theme.colors.text,
          cursor: 'pointer'
        }}>
          <input
            type="checkbox"
            checked={style.burnInSubtitles !== false}
            onChange={(e) => onStyleUpdate({ burnInSubtitles: e.target.checked })}
            style={{
              width: '14px',
              height: '14px',
              accentColor: theme.colors.primary
            }}
          />
          Burn-in Subtitles
        </label>
      </div>

      {/* Render Mode & Emphasis */}
      <div style={{ 
        marginBottom: '16px',
        padding: '12px 16px',
        backgroundColor: theme.colors.background,
        borderRadius: '8px',
        border: `2px solid ${theme.colors.border}`,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ 
          fontSize: '11px', 
          fontWeight: '600', 
          color: theme.colors.text, 
          marginBottom: '8px' 
        }}>
          Render Mode
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <button
            onClick={() => onStyleUpdate({ renderMode: 'horizontal' })}
            style={{
              flex: 1,
              padding: '8px',
              backgroundColor: style.renderMode === 'horizontal' ? theme.colors.primary : theme.colors.background,
              color: style.renderMode === 'horizontal' ? theme.colors.primaryForeground : theme.colors.text,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: '6px',
              fontSize: '10px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Horizontal
          </button>
          <button
            onClick={() => onStyleUpdate({ renderMode: 'progressive' })}
            style={{
              flex: 1,
              padding: '8px',
              backgroundColor: style.renderMode === 'progressive' ? theme.colors.primary : theme.colors.background,
              color: style.renderMode === 'progressive' ? theme.colors.primaryForeground : theme.colors.text,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: '6px',
              fontSize: '10px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Progressive
          </button>
        </div>
        
        {/* Emphasis Mode Toggle */}
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          fontSize: '10px',
          color: theme.colors.textSecondary,
          cursor: 'pointer'
        }}>
          <input
            type="checkbox"
            checked={style.emphasizeMode || false}
            onChange={(e) => onStyleUpdate({ emphasizeMode: e.target.checked })}
            style={{
              width: '12px',
              height: '12px',
              accentColor: theme.colors.primary
            }}
          />
          Emphasis Mode
        </label>
      </div>

      {/* Typography Row */}
      <div style={{ 
        marginBottom: '16px',
        padding: '12px 16px',
        backgroundColor: theme.colors.background,
        borderRadius: '8px',
        border: `2px solid ${theme.colors.border}`,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ 
          fontSize: '11px', 
          fontWeight: '600', 
          color: theme.colors.text, 
          marginBottom: '8px' 
        }}>
          Typography
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <CompactButton
            icon={<FiType size={12} />}
            label="Font"
            value={style.font}
            onClick={() => setOpenModal('font')}
          />
          <CompactButton
            label="Size"
            value={`${style.fontSize}px`}
            onClick={() => setOpenModal('fontSize')}
          />
          <CompactButton
            label="Transform"
            value={style.textTransform || 'none'}
            onClick={() => setOpenModal('textTransform')}
          />
          <CompactButton
            icon={style.textAlign === 'left' ? <FiAlignLeft size={12} /> : 
                  style.textAlign === 'right' ? <FiAlignRight size={12} /> : 
                  <FiAlignCenter size={12} />}
            label="Align"
            onClick={() => setOpenModal('textAlign')}
          />
        </div>
      </div>

      {/* Colors Row */}
      <div style={{ 
        marginBottom: '16px',
        padding: '12px 16px',
        backgroundColor: theme.colors.background,
        borderRadius: '8px',
        border: `2px solid ${theme.colors.border}`,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ 
          fontSize: '11px', 
          fontWeight: '600', 
          color: theme.colors.text, 
          marginBottom: '8px' 
        }}>
          Colors
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <CompactButton
            icon={<div style={{ 
              width: '12px', 
              height: '12px', 
              backgroundColor: style.textColor, 
              borderRadius: '2px',
              border: '1px solid rgba(255,255,255,0.2)'
            }} />}
            label="Text"
            onClick={() => setOpenModal('textColor')}
          />
          <CompactButton
            icon={<div style={{ 
              width: '12px', 
              height: '12px', 
              backgroundColor: style.highlighterColor, 
              borderRadius: '2px',
              border: '1px solid rgba(255,255,255,0.2)'
            }} />}
            label="Highlight"
            onClick={() => setOpenModal('highlighterColor')}
          />
          <CompactButton
            icon={<div style={{ 
              width: '12px', 
              height: '12px', 
              backgroundColor: style.backgroundColor, 
              borderRadius: '2px',
              border: '1px solid rgba(255,255,255,0.2)'
            }} />}
            label="Background"
            onClick={() => setOpenModal('backgroundColor')}
          />
          <CompactButton
            icon={<div style={{ 
              width: '12px', 
              height: '12px', 
              backgroundColor: style.strokeColor, 
              borderRadius: '2px',
              border: '1px solid rgba(255,255,255,0.2)'
            }} />}
            label="Stroke"
            onClick={() => setOpenModal('strokeColor')}
          />
        </div>
      </div>

      {/* Position Row */}
      <div style={{ 
        marginBottom: '16px',
        padding: '12px 16px',
        backgroundColor: theme.colors.background,
        borderRadius: '8px',
        border: `2px solid ${theme.colors.border}`,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ 
          fontSize: '11px', 
          fontWeight: '600', 
          color: theme.colors.text, 
          marginBottom: '8px' 
        }}>
          Position
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <CompactButton
            icon={<FiMove size={12} />}
            label="X, Y"
            value={`${(style.position?.x || 50).toFixed(1)}, ${(style.position?.y || 80).toFixed(1)}`}
            onClick={() => setOpenModal('position')}
          />
          <CompactButton
            label="Rotation"
            value={`${style.position?.z || 0}°`}
            onClick={() => setOpenModal('rotation')}
          />
          <CompactButton
            label="Stroke Width"
            value={`${style.strokeWidth || 0}px`}
            onClick={() => setOpenModal('strokeWidth')}
          />
        </div>
      </div>

      {/* Font Modal */}
      <Modal isOpen={openModal === 'font'} onClose={() => setOpenModal(null)} title="Font Family">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          {Object.values(FontOption).map((font) => (
            <button
              key={font}
              onClick={() => {
                onStyleUpdate({ font });
                setOpenModal(null);
              }}
              style={{
                padding: '12px',
                backgroundColor: style.font === font ? theme.colors.primary : theme.colors.background,
                color: style.font === font ? theme.colors.primaryForeground : theme.colors.text,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '500',
                cursor: 'pointer',
                fontFamily: font
              }}
            >
              {font}
            </button>
          ))}
        </div>
      </Modal>

      {/* Font Size Modal */}
      <Modal isOpen={openModal === 'fontSize'} onClose={() => setOpenModal(null)} title="Font Size">
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '12px', color: theme.colors.text }}>Size</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: theme.colors.primary }}>
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
              height: '8px',
              borderRadius: '4px',
              background: `linear-gradient(to right, ${theme.colors.primary} 0%, ${theme.colors.primary} ${((style.fontSize - 16) / (200 - 16)) * 100}%, ${theme.colors.border} ${((style.fontSize - 16) / (200 - 16)) * 100}%, ${theme.colors.border} 100%)`,
              outline: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              cursor: 'pointer'
            }}
          />
        </div>
      </Modal>

      {/* Text Transform Modal */}
      <Modal isOpen={openModal === 'textTransform'} onClose={() => setOpenModal(null)} title="Text Transform">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          {['none', 'capitalize', 'uppercase', 'lowercase'].map((transform) => (
            <button
              key={transform}
              onClick={() => {
                onStyleUpdate({ textTransform: transform as any });
                setOpenModal(null);
              }}
              style={{
                padding: '12px',
                backgroundColor: style.textTransform === transform ? theme.colors.primary : theme.colors.background,
                color: style.textTransform === transform ? theme.colors.primaryForeground : theme.colors.text,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '500',
                cursor: 'pointer',
                textTransform: transform as any
              }}
            >
              {transform === 'none' ? 'Normal' : transform}
            </button>
          ))}
        </div>
      </Modal>

      {/* Text Align Modal */}
      <Modal isOpen={openModal === 'textAlign'} onClose={() => setOpenModal(null)} title="Text Alignment">
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { value: 'left', icon: <FiAlignLeft size={16} />, label: 'Left' },
            { value: 'center', icon: <FiAlignCenter size={16} />, label: 'Center' },
            { value: 'right', icon: <FiAlignRight size={16} />, label: 'Right' }
          ].map(({ value, icon, label }) => (
            <button
              key={value}
              onClick={() => {
                onStyleUpdate({ textAlign: value as any });
                setOpenModal(null);
              }}
              style={{
                flex: 1,
                padding: '16px',
                backgroundColor: style.textAlign === value ? theme.colors.primary : theme.colors.background,
                color: style.textAlign === value ? theme.colors.primaryForeground : theme.colors.text,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </Modal>

      {/* Color Modals */}
      {['textColor', 'highlighterColor', 'backgroundColor', 'strokeColor'].map((colorType) => (
        <Modal 
          key={colorType}
          isOpen={openModal === colorType} 
          onClose={() => setOpenModal(null)} 
          title={colorType.replace('Color', '').replace(/([A-Z])/g, ' $1').replace(/^\w/, c => c.toUpperCase()) + ' Color'}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {Object.values(ColorOption).map((color) => (
              <button
                key={color}
                onClick={() => {
                  onStyleUpdate({ [colorType]: color });
                  setOpenModal(null);
                }}
                style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: color === 'transparent' ? 'transparent' : color,
                  border: color === 'transparent' ? '2px dashed #ccc' : '2px solid transparent',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  position: 'relative',
                  outline: (style as any)[colorType] === color ? `2px solid ${theme.colors.primary}` : 'none'
                }}
              >
                {color === 'transparent' && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: '8px',
                    color: '#666',
                    fontWeight: '500'
                  }}>
                    None
                  </div>
                )}
              </button>
            ))}
          </div>
        </Modal>
      ))}

      {/* Position Modal */}
      <Modal isOpen={openModal === 'position'} onClose={() => setOpenModal(null)} title="Position">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <span style={{ fontSize: '12px', color: theme.colors.text }}>X Position</span>
              <span style={{ fontSize: '12px', fontWeight: '600', color: theme.colors.primary }}>
                {style.position?.x || 50}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={style.position?.x || 50}
              onChange={(e) => onStyleUpdate({
                position: { ...(style.position || { x: 50, y: 80, z: 0 }), x: parseInt(e.target.value) }
              })}
              style={{
                width: '100%',
                height: '8px',
                borderRadius: '4px',
                background: `linear-gradient(to right, ${theme.colors.primary} 0%, ${theme.colors.primary} ${(style.position?.x || 50)}%, ${theme.colors.border} ${(style.position?.x || 50)}%, ${theme.colors.border} 100%)`,
                outline: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                cursor: 'pointer'
              }}
            />
          </div>
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <span style={{ fontSize: '12px', color: theme.colors.text }}>Y Position</span>
              <span style={{ fontSize: '12px', fontWeight: '600', color: theme.colors.primary }}>
                {style.position?.y || 80}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={style.position?.y || 80}
              onChange={(e) => onStyleUpdate({
                position: { ...(style.position || { x: 50, y: 80, z: 0 }), y: parseInt(e.target.value) }
              })}
              style={{
                width: '100%',
                height: '8px',
                borderRadius: '4px',
                background: `linear-gradient(to right, ${theme.colors.primary} 0%, ${theme.colors.primary} ${(style.position?.y || 80)}%, ${theme.colors.border} ${(style.position?.y || 80)}%, ${theme.colors.border} 100%)`,
                outline: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                cursor: 'pointer'
              }}
            />
          </div>
        </div>
      </Modal>

      {/* Rotation Modal */}
      <Modal isOpen={openModal === 'rotation'} onClose={() => setOpenModal(null)} title="Z-Axis Rotation">
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '12px', color: theme.colors.text }}>Rotation</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: theme.colors.primary }}>
              {style.position?.z || 0}°
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            value={style.position?.z || 0}
            onChange={(e) => onStyleUpdate({
              position: { ...(style.position || { x: 50, y: 80, z: 0 }), z: parseInt(e.target.value) }
            })}
            style={{
              width: '100%',
              height: '8px',
              borderRadius: '4px',
              background: `linear-gradient(to right, ${theme.colors.primary} 0%, ${theme.colors.primary} ${((style.position?.z || 0) / 360) * 100}%, ${theme.colors.border} ${((style.position?.z || 0) / 360) * 100}%, ${theme.colors.border} 100%)`,
              outline: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              cursor: 'pointer'
            }}
          />
        </div>
      </Modal>

      {/* Stroke Width Modal */}
      <Modal isOpen={openModal === 'strokeWidth'} onClose={() => setOpenModal(null)} title="Stroke Width">
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '12px', color: theme.colors.text }}>Width</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: theme.colors.primary }}>
              {style.strokeWidth || 0}px
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="10"
            value={style.strokeWidth || 0}
            onChange={(e) => onStyleUpdate({ strokeWidth: parseInt(e.target.value) })}
            style={{
              width: '100%',
              height: '8px',
              borderRadius: '4px',
              background: `linear-gradient(to right, ${theme.colors.primary} 0%, ${theme.colors.primary} ${((style.strokeWidth || 0) / 10) * 100}%, ${theme.colors.border} ${((style.strokeWidth || 0) / 10) * 100}%, ${theme.colors.border} 100%)`,
              outline: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              cursor: 'pointer'
            }}
          />
        </div>
      </Modal>

      </div>
    </>
  );
};