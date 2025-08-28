import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { FiType, FiAlignLeft, FiAlignCenter, FiAlignRight } from 'react-icons/fi';
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
  const [openModalState, setOpenModalState] = useState<string | null>(null);
  const [tempStyle, setTempStyle] = useState<SubtitleStyle>(style);
  const [originalStyleSnapshot, setOriginalStyleSnapshot] = useState<SubtitleStyle | null>(null);

  // Update temp style when main style changes, but ONLY if no modal is open
  useEffect(() => {
    console.log('useEffect triggered:', { openModalState, style });
    if (!openModalState) {
      console.log('useEffect updating tempStyle to:', style);
      setTempStyle({ ...style });
      // Clear any leftover snapshot
      setOriginalStyleSnapshot(null);
    } else {
      console.log('useEffect skipped - modal is open');
    }
  }, [style, openModalState]);


  // Modal Component - positioned within styling panel
  const Modal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    title: string; 
    children: React.ReactNode;
  }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    
    return (
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        borderRadius: '8px'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '20px',
          maxWidth: '350px',
          width: '90%',
          maxHeight: '400px',
          overflow: 'auto',
          border: `2px solid ${theme.colors.border}`,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)'
        }}>
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
          
          {/* Apply/Cancel Buttons */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginTop: '16px',
            justifyContent: 'flex-end',
            borderTop: `1px solid ${theme.colors.border}`,
            paddingTop: '12px'
          }}>
            <button
              onClick={handleCancel}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: theme.colors.text,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '6px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              style={{
                padding: '8px 16px',
                backgroundColor: theme.colors.primary,
                color: theme.colors.primaryForeground,
                border: 'none',
                borderRadius: '6px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Modal closing and opening handlers  
  const openModal = (modalName: string) => {
    openModalWithState(modalName);
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
        padding: '12px 16px',
        backgroundColor: active ? theme.colors.primary : '#ffffff',
        color: active ? theme.colors.primaryForeground : theme.colors.text,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '10px',
        fontWeight: '500',
        gap: '4px',
        minWidth: '85px',
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

  // Helper functions for modal interactions
  const openModalWithState = (modalName: string) => {
    console.log('openModalWithState:', { modalName, currentStyle: style });
    // Take snapshot of current style when modal opens
    setOriginalStyleSnapshot({ ...style });
    setTempStyle({ ...style });
    setOpenModalState(modalName);
  };

  const handleCancel = () => {
    // Revert to snapshot taken when modal was opened
    if (originalStyleSnapshot) {
      console.log('handleCancel - reverting to originalStyleSnapshot:', originalStyleSnapshot);
      onStyleUpdate(originalStyleSnapshot);
      setTempStyle({ ...originalStyleSnapshot });
    }
    setOriginalStyleSnapshot(null); // Clean up memory
    setOpenModalState(null);
  };

  const handleApply = () => {
    // Changes are already applied via live preview - just close modal and cleanup
    console.log('handleApply - keeping current style (already applied via live preview)');
    setOriginalStyleSnapshot(null); // Clean up memory
    setOpenModalState(null);
  };

  // Update temp style WITH live preview - apply changes immediately for preview
  const updateTempStyle = (updates: Partial<SubtitleStyle>) => {
    const newTempStyle = { ...tempStyle, ...updates };
    console.log('updateTempStyle:', { updates, newTempStyle });
    setTempStyle(newTempStyle);
    // Apply changes immediately for live preview
    onStyleUpdate(newTempStyle);
  };

  return (
    <>
      <div style={{ padding: '12px', overflow: 'hidden', backgroundColor: theme.colors.surface, position: 'relative' }}>
        
        {/* Burn-in Subtitles Toggle - Top */}
        <div style={{ 
          marginBottom: '16px',
          padding: '16px 20px',
          backgroundColor: '#e3f2fd',
          borderRadius: '10px',
          border: `2px solid ${theme.colors.primary}`,
          boxShadow: '0 3px 8px rgba(25, 118, 210, 0.1)'
        }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            fontSize: '12px',
            fontWeight: '500',
            color: theme.colors.primary,
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={style.burnInSubtitles !== false}
              onChange={(e) => onStyleUpdate({ burnInSubtitles: e.target.checked })}
              style={{
                width: '16px',
                height: '16px',
                accentColor: theme.colors.primary
              }}
            />
            Burn-in Subtitles
          </label>
        </div>

        {/* Render Mode & Emphasis */}
        <div style={{ 
          marginBottom: '16px',
          padding: '16px 20px',
          backgroundColor: '#e3f2fd',
          borderRadius: '10px',
          border: `2px solid ${theme.colors.primary}`,
          boxShadow: '0 3px 8px rgba(25, 118, 210, 0.1)'
        }}>
          <div style={{ 
            fontSize: '12px', 
            fontWeight: '600', 
            color: theme.colors.primary, 
            marginBottom: '12px' 
          }}>
            Render Mode
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button
              onClick={() => onStyleUpdate({ renderMode: 'horizontal' })}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: style.renderMode === 'horizontal' ? theme.colors.primary : '#ffffff',
                color: style.renderMode === 'horizontal' ? '#ffffff' : theme.colors.text,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '6px',
                fontSize: '11px',
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
                padding: '10px',
                backgroundColor: style.renderMode === 'progressive' ? theme.colors.primary : '#ffffff',
                color: style.renderMode === 'progressive' ? '#ffffff' : theme.colors.text,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '6px',
                fontSize: '11px',
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
            fontSize: '11px',
            color: theme.colors.primary,
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={style.emphasizeMode || false}
              onChange={(e) => onStyleUpdate({ emphasizeMode: e.target.checked })}
              style={{
                width: '14px',
                height: '14px',
                accentColor: theme.colors.primary
              }}
            />
            Emphasis Mode
          </label>
        </div>

        {/* Typography Row */}
        <div style={{ 
          marginBottom: '16px',
          padding: '16px 20px',
          backgroundColor: '#e3f2fd',
          borderRadius: '10px',
          border: `2px solid ${theme.colors.primary}`,
          boxShadow: '0 3px 8px rgba(25, 118, 210, 0.1)'
        }}>
          <div style={{ 
            fontSize: '12px', 
            fontWeight: '600', 
            color: theme.colors.primary, 
            marginBottom: '12px' 
          }}>
            Typography
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => openModal('font')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '12px 16px',
                backgroundColor: '#ffffff',
                color: theme.colors.text,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: '500',
                gap: '4px',
                minWidth: '85px',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px',
                fontWeight: '600' 
              }}>
                <FiType size={14} />
                <span>{style.font}</span>
              </div>
              <div>Font</div>
            </button>
            <button
              onClick={() => openModal('fontSize')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '12px 16px',
                backgroundColor: '#ffffff',
                color: theme.colors.text,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: '500',
                gap: '4px',
                minWidth: '85px',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ fontWeight: '600' }}>{style.fontSize}px</div>
              <div>Size</div>
            </button>
            <button
              onClick={() => openModal('textTransform')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '12px 16px',
                backgroundColor: '#ffffff',
                color: theme.colors.text,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: '500',
                gap: '4px',
                minWidth: '85px',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ fontWeight: '600' }}>{style.textTransform || 'none'}</div>
              <div>Transform</div>
            </button>
            <button
              onClick={() => openModal('textAlign')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '12px 16px',
                backgroundColor: '#ffffff',
                color: theme.colors.text,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: '500',
                gap: '4px',
                minWidth: '85px',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ fontWeight: '600' }}>
                {style.textAlign === 'left' ? <FiAlignLeft size={14} /> : 
                 style.textAlign === 'right' ? <FiAlignRight size={14} /> : 
                 <FiAlignCenter size={14} />}
              </div>
              <div>Align</div>
            </button>
          </div>
        </div>

        {/* Colors Row */}
        <div style={{ 
          marginBottom: '16px',
          padding: '16px 20px',
          backgroundColor: '#e3f2fd',
          borderRadius: '10px',
          border: `2px solid ${theme.colors.primary}`,
          boxShadow: '0 3px 8px rgba(25, 118, 210, 0.1)'
        }}>
          <div style={{ 
            fontSize: '12px', 
            fontWeight: '600', 
            color: theme.colors.primary, 
            marginBottom: '12px' 
          }}>
            Colors
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <CompactButton
              icon={<div style={{ 
                width: '14px', 
                height: '14px', 
                backgroundColor: style.textColor, 
                borderRadius: '3px',
                border: '2px solid #ddd',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }} />}
              label="Text"
              onClick={() => openModal('textColor')}
            />
            <CompactButton
              icon={<div style={{ 
                width: '14px', 
                height: '14px', 
                backgroundColor: style.highlighterColor, 
                borderRadius: '3px',
                border: '2px solid #ddd',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }} />}
              label="Highlight"
              onClick={() => openModal('highlighterColor')}
            />
            <CompactButton
              icon={<div style={{ 
                width: '14px', 
                height: '14px', 
                backgroundColor: style.backgroundColor, 
                borderRadius: '3px',
                border: '2px solid #ddd',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }} />}
              label="Background"
              onClick={() => openModal('backgroundColor')}
            />
            <CompactButton
              icon={<div style={{ 
                width: '14px', 
                height: '14px', 
                backgroundColor: style.strokeColor, 
                borderRadius: '3px',
                border: '2px solid #ddd',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }} />}
              label="Stroke"
              onClick={() => openModal('strokeColor')}
            />
          </div>
        </div>

        {/* Position Row */}
        <div style={{ 
          marginBottom: '16px',
          padding: '16px 20px',
          backgroundColor: '#e3f2fd',
          borderRadius: '10px',
          border: `2px solid ${theme.colors.primary}`,
          boxShadow: '0 3px 8px rgba(25, 118, 210, 0.1)'
        }}>
          <div style={{ 
            fontSize: '12px', 
            fontWeight: '600', 
            color: theme.colors.primary, 
            marginBottom: '12px' 
          }}>
            Position
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => openModal('position')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '12px 16px',
                backgroundColor: '#ffffff',
                color: theme.colors.text,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: '500',
                gap: '4px',
                minWidth: '85px',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ fontWeight: '600' }}>{(style.position?.x || 50).toFixed(1)}, {(style.position?.y || 80).toFixed(1)}</div>
              <div>Position</div>
            </button>
            <button
              onClick={() => openModal('rotation')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '12px 16px',
                backgroundColor: '#ffffff',
                color: theme.colors.text,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: '500',
                gap: '4px',
                minWidth: '85px',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ fontWeight: '600' }}>{style.position?.z || 0}°</div>
              <div>Rotation</div>
            </button>
            <button
              onClick={() => openModal('strokeWidth')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '12px 16px',
                backgroundColor: '#ffffff',
                color: theme.colors.text,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: '500',
                gap: '4px',
                minWidth: '85px',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ fontWeight: '600' }}>{style.strokeWidth || 0}px</div>
              <div>Stroke Width</div>
            </button>
          </div>
        </div>

        {/* All Modals */}

        {/* Font Modal */}
        <Modal 
          isOpen={openModalState === 'font'} 
          onClose={handleCancel} 
          title="Font Family"
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {Object.values(FontOption).map((font) => (
              <button
                key={font}
                onClick={() => updateTempStyle({ font })}
                style={{
                  padding: '12px',
                  backgroundColor: tempStyle.font === font ? theme.colors.primary : theme.colors.background,
                  color: tempStyle.font === font ? theme.colors.primaryForeground : theme.colors.text,
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
        <Modal 
          isOpen={openModalState === 'fontSize'} 
          onClose={handleCancel} 
          title="Font Size"
        >
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <span style={{ fontSize: '12px', color: theme.colors.text }}>Size</span>
              <span style={{ fontSize: '12px', fontWeight: '600', color: theme.colors.primary }}>
                {tempStyle.fontSize}px
              </span>
            </div>
            <div style={{
              padding: '12px',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: `1px solid ${theme.colors.border}`
            }}>
              {/* Custom draggable slider */}
              <div style={{ position: 'relative', height: '40px' }}>
                {/* Track background */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  right: 0,
                  height: '6px',
                  backgroundColor: theme.colors.border,
                  borderRadius: '3px',
                  transform: 'translateY(-50%)'
                }} />
                
                {/* Active track */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  width: `${((tempStyle.fontSize - 16) / (200 - 16)) * 100}%`,
                  height: '6px',
                  backgroundColor: theme.colors.primary,
                  borderRadius: '3px',
                  transform: 'translateY(-50%)'
                }} />
                
                {/* Clickable track for direct positioning */}
                <div 
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '40px',
                    cursor: 'pointer'
                  }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
                    const newValue = Math.round(16 + percentage * (200 - 16));
                    updateTempStyle({ fontSize: newValue });
                  }}
                />
                
                {/* Draggable thumb */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: `${((tempStyle.fontSize - 16) / (200 - 16)) * 100}%`,
                    width: '20px',
                    height: '20px',
                    backgroundColor: theme.colors.primary,
                    borderRadius: '50%',
                    border: '3px solid #ffffff',
                    transform: 'translate(-50%, -50%)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    cursor: 'grab',
                    zIndex: 5,
                    transition: 'transform 0.1s ease'
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const thumb = e.currentTarget as HTMLElement;
                    thumb.style.cursor = 'grabbing';
                    
                    const container = thumb.parentElement;
                    if (!container) return;
                    
                    const containerRect = container.getBoundingClientRect();
                    
                    const handleMouseMove = (moveEvent: MouseEvent) => {
                      const mouseX = moveEvent.clientX - containerRect.left;
                      const percentage = Math.max(0, Math.min(1, mouseX / containerRect.width));
                      const newValue = Math.round(16 + percentage * (200 - 16));
                      updateTempStyle({ fontSize: newValue });
                    };
                    
                    const handleMouseUp = () => {
                      thumb.style.cursor = 'grab';
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                    };
                    
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
                  }}
                />
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '8px',
                fontSize: '10px',
                color: theme.colors.textSecondary,
                fontWeight: '500'
              }}>
                <span>16</span>
                <span>200</span>
              </div>
            </div>
          </div>
        </Modal>

        {/* Text Transform Modal */}
        <Modal 
          isOpen={openModalState === 'textTransform'} 
          onClose={handleCancel} 
          title="Text Transform"
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {['none', 'capitalize', 'uppercase', 'lowercase'].map((transform) => (
              <button
                key={transform}
                onClick={() => updateTempStyle({ textTransform: transform as any })}
                style={{
                  padding: '12px',
                  backgroundColor: tempStyle.textTransform === transform ? theme.colors.primary : theme.colors.background,
                  color: tempStyle.textTransform === transform ? theme.colors.primaryForeground : theme.colors.text,
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
        <Modal 
          isOpen={openModalState === 'textAlign'} 
          onClose={handleCancel} 
          title="Text Alignment"
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { value: 'left', icon: <FiAlignLeft size={16} />, label: 'Left' },
              { value: 'center', icon: <FiAlignCenter size={16} />, label: 'Center' },
              { value: 'right', icon: <FiAlignRight size={16} />, label: 'Right' }
            ].map(({ value, icon, label }) => (
              <button
                key={value}
                onClick={() => updateTempStyle({ textAlign: value as any })}
                style={{
                  flex: 1,
                  padding: '16px',
                  backgroundColor: tempStyle.textAlign === value ? theme.colors.primary : theme.colors.background,
                  color: tempStyle.textAlign === value ? theme.colors.primaryForeground : theme.colors.text,
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
            isOpen={openModalState === colorType} 
            onClose={handleCancel} 
            title={colorType.replace('Color', '').replace(/([A-Z])/g, ' $1').replace(/^\w/, c => c.toUpperCase()) + ' Color'}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {Object.values(ColorOption).map((color) => (
                <button
                  key={color}
                  onClick={() => updateTempStyle({ [colorType]: color })}
                  style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: color === 'transparent' ? 'transparent' : color,
                    border: color === 'transparent' 
                      ? '2px dashed #ccc' 
                      : `3px solid ${(tempStyle as any)[colorType] === color ? theme.colors.primary : '#ddd'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    position: 'relative',
                    boxShadow: color !== 'transparent' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
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
        <Modal 
          isOpen={openModalState === 'position'} 
          onClose={handleCancel} 
          title="Position"
        >
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <label style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: theme.colors.text
                  }}>
                    X Position
                  </label>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: theme.colors.text
                  }}>
                    {tempStyle.position?.x || 50}%
                  </span>
                </div>
                <div style={{
                  padding: '12px',
                  backgroundColor: theme.colors.modal.background,
                  borderRadius: theme.radius.lg,
                  border: `1px solid ${theme.colors.border}`
                }}>
                  {/* Custom draggable slider */}
                  <div style={{ position: 'relative', height: '40px' }}>
                    {/* Track background */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: 0,
                      right: 0,
                      height: '6px',
                      backgroundColor: theme.colors.border,
                      borderRadius: '3px',
                      transform: 'translateY(-50%)'
                    }} />
                    
                    {/* Active track */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: 0,
                      width: `${(tempStyle.position?.x || 50)}%`,
                      height: '6px',
                      backgroundColor: theme.colors.primary,
                      borderRadius: '3px',
                      transform: 'translateY(-50%)'
                    }} />
                    
                    {/* Clickable track */}
                    <div 
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '40px',
                        cursor: 'pointer'
                      }}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const percentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
                        updateTempStyle({
                          position: { ...(tempStyle.position || { x: 50, y: 80, z: 0 }), x: Math.round(percentage) }
                        });
                      }}
                    />
                    
                    {/* Draggable thumb */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: `${(tempStyle.position?.x || 50)}%`,
                        width: '20px',
                        height: '20px',
                        backgroundColor: theme.colors.primary,
                        borderRadius: '50%',
                        border: '3px solid #ffffff',
                        transform: 'translate(-50%, -50%)',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                        cursor: 'grab',
                        zIndex: 5,
                        transition: 'transform 0.1s ease'
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const thumb = e.currentTarget as HTMLElement;
                        thumb.style.cursor = 'grabbing';
                        
                        const container = thumb.parentElement;
                        if (!container) return;
                        
                        const containerRect = container.getBoundingClientRect();
                        
                        const handleMouseMove = (moveEvent: MouseEvent) => {
                          const mouseX = moveEvent.clientX - containerRect.left;
                          const percentage = Math.max(0, Math.min(100, (mouseX / containerRect.width) * 100));
                          updateTempStyle({
                            position: { ...(tempStyle.position || { x: 50, y: 80, z: 0 }), x: Math.round(percentage) }
                          });
                        };
                        
                        const handleMouseUp = () => {
                          thumb.style.cursor = 'grab';
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };
                        
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
                      }}
                    />
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '8px',
                    fontSize: '12px',
                    color: theme.colors.textSecondary,
                    fontWeight: '500'
                  }}>
                    <span>0</span>
                    <span>100</span>
                  </div>
                </div>
              </div>
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <label style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: theme.colors.text
                  }}>
                    Y Position
                  </label>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: theme.colors.text
                  }}>
                    {tempStyle.position?.y || 80}%
                  </span>
                </div>
                <div style={{
                  padding: '12px',
                  backgroundColor: theme.colors.modal.background,
                  borderRadius: theme.radius.lg,
                  border: `1px solid ${theme.colors.border}`
                }}>
                  {/* Custom draggable slider */}
                  <div style={{ position: 'relative', height: '40px' }}>
                    {/* Track background */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: 0,
                      right: 0,
                      height: '6px',
                      backgroundColor: theme.colors.border,
                      borderRadius: '3px',
                      transform: 'translateY(-50%)'
                    }} />
                    
                    {/* Active track */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: 0,
                      width: `${(tempStyle.position?.y || 80)}%`,
                      height: '6px',
                      backgroundColor: theme.colors.primary,
                      borderRadius: '3px',
                      transform: 'translateY(-50%)'
                    }} />
                    
                    {/* Clickable track */}
                    <div 
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '40px',
                        cursor: 'pointer'
                      }}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const percentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
                        updateTempStyle({
                          position: { ...(tempStyle.position || { x: 50, y: 80, z: 0 }), y: Math.round(percentage) }
                        });
                      }}
                    />
                    
                    {/* Draggable thumb */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: `${(tempStyle.position?.y || 80)}%`,
                        width: '20px',
                        height: '20px',
                        backgroundColor: theme.colors.primary,
                        borderRadius: '50%',
                        border: '3px solid #ffffff',
                        transform: 'translate(-50%, -50%)',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                        cursor: 'grab',
                        zIndex: 5,
                        transition: 'transform 0.1s ease'
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const thumb = e.currentTarget as HTMLElement;
                        thumb.style.cursor = 'grabbing';
                        
                        const container = thumb.parentElement;
                        if (!container) return;
                        
                        const containerRect = container.getBoundingClientRect();
                        
                        const handleMouseMove = (moveEvent: MouseEvent) => {
                          const mouseX = moveEvent.clientX - containerRect.left;
                          const percentage = Math.max(0, Math.min(100, (mouseX / containerRect.width) * 100));
                          updateTempStyle({
                            position: { ...(tempStyle.position || { x: 50, y: 80, z: 0 }), y: Math.round(percentage) }
                          });
                        };
                        
                        const handleMouseUp = () => {
                          thumb.style.cursor = 'grab';
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };
                        
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
                      }}
                    />
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '8px',
                    fontSize: '12px',
                    color: theme.colors.textSecondary,
                    fontWeight: '500'
                  }}>
                    <span>0</span>
                    <span>100</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>

        {/* Rotation Modal */}
        <Modal
          isOpen={openModalState === 'rotation'}
          onClose={handleCancel}
          title="Z-Axis Rotation"
        >
          <div style={{ padding: '20px' }}>
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <label style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: theme.colors.text
                }}>
                  Rotation
                </label>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: theme.colors.text
                }}>
                  {tempStyle.position?.z || 0}°
                </span>
              </div>
              <div style={{
                padding: '12px',
                backgroundColor: theme.colors.modal.background,
                borderRadius: theme.radius.lg,
                border: `1px solid ${theme.colors.border}`
              }}>
                {/* Custom draggable slider */}
                <div style={{ position: 'relative', height: '40px' }}>
                  {/* Track background */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: 0,
                    right: 0,
                    height: '6px',
                    backgroundColor: theme.colors.border,
                    borderRadius: '3px',
                    transform: 'translateY(-50%)'
                  }} />
                  
                  {/* Active track */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: 0,
                    width: `${((tempStyle.position?.z || 0) / 360) * 100}%`,
                    height: '6px',
                    backgroundColor: theme.colors.primary,
                    borderRadius: '3px',
                    transform: 'translateY(-50%)'
                  }} />
                  
                  {/* Clickable track */}
                  <div 
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '40px',
                      cursor: 'pointer'
                    }}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const percentage = Math.max(0, Math.min(1, clickX / rect.width));
                      const newValue = Math.round(percentage * 360);
                      updateTempStyle({
                        position: { ...(tempStyle.position || { x: 50, y: 80, z: 0 }), z: newValue }
                      });
                    }}
                  />
                  
                  {/* Draggable thumb */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: `${((tempStyle.position?.z || 0) / 360) * 100}%`,
                      width: '20px',
                      height: '20px',
                      backgroundColor: theme.colors.primary,
                      borderRadius: '50%',
                      border: '3px solid #ffffff',
                      transform: 'translate(-50%, -50%)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      cursor: 'grab',
                      zIndex: 5,
                      transition: 'transform 0.1s ease'
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      const thumb = e.currentTarget as HTMLElement;
                      thumb.style.cursor = 'grabbing';
                      
                      const container = thumb.parentElement;
                      if (!container) return;
                      
                      const containerRect = container.getBoundingClientRect();
                      
                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        const mouseX = moveEvent.clientX - containerRect.left;
                        const percentage = Math.max(0, Math.min(1, mouseX / containerRect.width));
                        const newValue = Math.round(percentage * 360);
                        updateTempStyle({
                          position: { ...(tempStyle.position || { x: 50, y: 80, z: 0 }), z: newValue }
                        });
                      };
                      
                      const handleMouseUp = () => {
                        thumb.style.cursor = 'grab';
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
                    }}
                  />
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '8px',
                  fontSize: '12px',
                  color: theme.colors.textSecondary,
                  fontWeight: '500'
                }}>
                  <span>0°</span>
                  <span>360°</span>
                </div>
              </div>
            </div>
          </div>
        </Modal>

        {/* Stroke Width Modal */}
        <Modal
          isOpen={openModalState === 'strokeWidth'}
          onClose={handleCancel}
          title="Stroke Width"
        >
          <div style={{ padding: '20px' }}>
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <label style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: theme.colors.text
                }}>
                  Width
                </label>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: theme.colors.text
                }}>
                  {tempStyle.strokeWidth || 0}px
                </span>
              </div>
              <div style={{
                padding: '12px',
                backgroundColor: theme.colors.modal.background,
                borderRadius: theme.radius.lg,
                border: `1px solid ${theme.colors.border}`
              }}>
                {/* Custom draggable slider */}
                <div style={{ position: 'relative', height: '40px' }}>
                  {/* Track background */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: 0,
                    right: 0,
                    height: '6px',
                    backgroundColor: theme.colors.border,
                    borderRadius: '3px',
                    transform: 'translateY(-50%)'
                  }} />
                  
                  {/* Active track */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: 0,
                    width: `${((tempStyle.strokeWidth || 0) / 10) * 100}%`,
                    height: '6px',
                    backgroundColor: theme.colors.primary,
                    borderRadius: '3px',
                    transform: 'translateY(-50%)'
                  }} />
                  
                  {/* Clickable track */}
                  <div 
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '40px',
                      cursor: 'pointer'
                    }}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const percentage = Math.max(0, Math.min(1, clickX / rect.width));
                      const newValue = Math.round(percentage * 10);
                      updateTempStyle({ strokeWidth: newValue });
                    }}
                  />
                  
                  {/* Draggable thumb */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: `${((tempStyle.strokeWidth || 0) / 10) * 100}%`,
                      width: '20px',
                      height: '20px',
                      backgroundColor: theme.colors.primary,
                      borderRadius: '50%',
                      border: '3px solid #ffffff',
                      transform: 'translate(-50%, -50%)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      cursor: 'grab',
                      zIndex: 5,
                      transition: 'transform 0.1s ease'
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      const thumb = e.currentTarget as HTMLElement;
                      thumb.style.cursor = 'grabbing';
                      
                      const container = thumb.parentElement;
                      if (!container) return;
                      
                      const containerRect = container.getBoundingClientRect();
                      
                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        const mouseX = moveEvent.clientX - containerRect.left;
                        const percentage = Math.max(0, Math.min(1, mouseX / containerRect.width));
                        const newValue = Math.round(percentage * 10);
                        updateTempStyle({ strokeWidth: newValue });
                      };
                      
                      const handleMouseUp = () => {
                        thumb.style.cursor = 'grab';
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
                    }}
                  />
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '8px',
                  fontSize: '12px',
                  color: theme.colors.textSecondary,
                  fontWeight: '500'
                }}>
                  <span>0</span>
                  <span>10</span>
                </div>
              </div>
            </div>
          </div>
        </Modal>

      </div>
    </>
  );
};