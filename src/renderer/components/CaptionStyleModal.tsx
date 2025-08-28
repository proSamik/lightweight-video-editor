import React, { useState, useEffect } from 'react';
import { SubtitleFrame, SubtitleStyle, FontOption, ColorOption } from '../../types';
import { useTheme } from '../contexts/ThemeContext';
import { FiType, FiAlignLeft, FiAlignCenter, FiAlignRight } from 'react-icons/fi';

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
  const [openModalState, setOpenModalState] = useState<string | null>(null);
  const [tempStyle, setTempStyle] = useState<SubtitleStyle>({
    font: 'Poppins',
    fontSize: 85,
    textColor: '#ffffff',
    textColorOpacity: 100,
    highlighterColor: '#00ff00',
    highlighterColorOpacity: 100,
    backgroundColor: '#000000',
    backgroundColorOpacity: 100,
    strokeColor: '#000000',
    strokeColorOpacity: 100,
    strokeWidth: 0,
    textTransform: 'none',
    position: { x: 50, y: 50, z: 0 },
    scale: 1,
    emphasizeMode: false,
    renderMode: 'horizontal',
    textAlign: 'center',
    burnInSubtitles: true
  });
  const [originalStyleSnapshot, setOriginalStyleSnapshot] = useState<SubtitleStyle | null>(null);

  // Update temp style when caption changes, but ONLY if no modal is open
  useEffect(() => {
    if (!openModalState && caption) {
      // Ensure all opacity fields have default values
      const styleWithDefaults = {
        ...caption.style,
        textColorOpacity: caption.style.textColorOpacity ?? 100,
        highlighterColorOpacity: caption.style.highlighterColorOpacity ?? 100,
        backgroundColorOpacity: caption.style.backgroundColorOpacity ?? 100,
        strokeColorOpacity: caption.style.strokeColorOpacity ?? 100,
      };
      setTempStyle(styleWithDefaults);
      // Clear any leftover snapshot
      setOriginalStyleSnapshot(null);
    }
  }, [caption, openModalState]);

  // Modal Component - positioned within styling panel
  const Modal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    title: string; 
    children: React.ReactNode;
  }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    
    return (
      <div 
        style={{
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
        }}
        onClick={(e) => {
          e.stopPropagation(); // Prevent event bubbling
          onClose();
        }}
      >
        <div 
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            maxWidth: '350px',
            width: '90%',
            maxHeight: '400px',
            overflow: 'auto',
            border: `2px solid ${theme.colors.border}`,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)'
          }}
          onClick={(e) => e.stopPropagation()} // Prevent modal from closing when clicking inside
        >
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
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
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
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleInternalCancel();
              }}
              style={{
                flex: 1,
                padding: '8px 16px',
                backgroundColor: theme.colors.border,
                color: theme.colors.text,
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleInternalApply();
              }}
              style={{
                flex: 1,
                padding: '8px 16px',
                backgroundColor: theme.colors.primary,
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
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

  // Compact button component
  const CompactButton: React.FC<{ 
    icon: React.ReactNode; 
    label: string; 
    onClick: () => void;
    isActive?: boolean;
  }> = ({ icon, label, onClick, isActive = false }) => (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        padding: '12px 8px',
        backgroundColor: isActive ? theme.colors.primary : '#ffffff',
        color: isActive ? '#ffffff' : theme.colors.text,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: '8px',
        fontSize: '10px',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        minWidth: '60px'
      }}
    >
      {icon}
      <div>{label}</div>
    </button>
  );

  // Helper functions for modal interactions
  const openModalWithState = (modalName: string) => {
    // Take snapshot of current style when modal opens - use current tempStyle values
    const currentStyle = { ...tempStyle };
    setOriginalStyleSnapshot({ ...currentStyle });
    setOpenModalState(modalName);
  };

  const openModal = (modalName: string) => openModalWithState(modalName);

  // Handler for main modal cancel (closes entire modal)
  const handleCancel = () => {
    // Revert to snapshot taken when modal was opened
    if (originalStyleSnapshot) {
      setTempStyle({ ...originalStyleSnapshot });
      if (caption && onUpdate) {
        onUpdate({ style: originalStyleSnapshot });
      }
    }
    setOriginalStyleSnapshot(null); // Clean up memory
    setOpenModalState(null);
  };

  // Handler for internal modal cancel (only closes internal modal, reverts changes)
  const handleInternalCancel = () => {
    // Revert to snapshot taken when internal modal was opened
    if (originalStyleSnapshot) {
      setTempStyle({ ...originalStyleSnapshot });
      if (caption && onUpdate) {
        onUpdate({ style: originalStyleSnapshot });
      }
    }
    setOriginalStyleSnapshot(null); // Clean up memory
    setOpenModalState(null);
  };

  // Handler for internal modal apply (only closes internal modal, keeps changes)
  const handleInternalApply = () => {
    // Changes are already applied via live preview - just close internal modal and cleanup
    setOriginalStyleSnapshot(null); // Clean up memory
    setOpenModalState(null);
  };

  const handleApply = () => {
    // Changes are already applied via live preview - just close modal and cleanup
    setOriginalStyleSnapshot(null); // Clean up memory
    setOpenModalState(null);
  };

  // Update temp style WITH live preview - apply changes immediately for preview
  const updateTempStyle = (updates: Partial<SubtitleStyle>) => {
    const newTempStyle = { ...tempStyle, ...updates };
    setTempStyle(newTempStyle);
    // Apply changes immediately for live preview
    if (caption && onUpdate) {
      onUpdate({ style: newTempStyle });
    }
  };

  const updateStyle = (updates: Partial<SubtitleStyle>) => {
    updateTempStyle(updates);
  };

  if (!caption || !isOpen) return null;

  // Smart positioning to avoid overflow
  const menuWidth = 400;
  const menuHeight = 600;
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
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
  
  // Ensure menu doesn't go off-screen
  left = Math.max(10, left);
  top = Math.max(10, top);

  const style = tempStyle;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          left: `${left}px`,
          top: `${top}px`,
          width: `${menuWidth}px`,
          maxHeight: `${menuHeight}px`,
          backgroundColor: theme.colors.surface,
          border: `2px solid ${theme.colors.border}`,
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
          zIndex: 1000,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()} // Prevent modal from closing when clicking inside
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${theme.colors.border}`,
          backgroundColor: theme.colors.background,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: theme.colors.text }}>
            Caption Style
          </h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
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

        {/* Content */}
        <div 
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '12px',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()} // Prevent modal from closing when clicking content
        >
          {/* Burn-in Subtitles Toggle */}
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
                onChange={(e) => updateStyle({ burnInSubtitles: e.target.checked })}
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
                onClick={() => updateStyle({ renderMode: 'horizontal' })}
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
                onClick={() => updateStyle({ renderMode: 'progressive' })}
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
                checked={style.emphasizeMode === true}
                onChange={(e) => updateStyle({ emphasizeMode: e.target.checked })}
                style={{
                  width: '14px',
                  height: '14px',
                  accentColor: theme.colors.primary
                }}
              />
              Emphasis Mode
            </label>
          </div>

          {/* Font & Size */}
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
              Font & Size
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <CompactButton
                icon={<FiType size={14} />}
                label="Font"
                onClick={() => openModal('font')}
              />
              <CompactButton
                icon={<div style={{ fontSize: '12px', fontWeight: '600' }}>
                  {Math.round(style.fontSize || 85)}px
                </div>}
                label="Size"
                onClick={() => openModal('fontSize')}
              />
              <CompactButton
                icon={<div style={{ fontSize: '12px', fontWeight: '600' }}>
                  {Math.round((style.scale || 1) * 100)}%
                </div>}
                label="Scale"
                onClick={() => openModal('scale')}
              />
              <CompactButton
                icon={<div style={{ fontSize: '12px', fontWeight: '600' }}>
                  {Math.round(style.strokeWidth || 0)}px
                </div>}
                label="Stroke Width"
                onClick={() => openModal('strokeWidth')}
              />
            </div>
          </div>

          {/* Colors */}
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

          {/* Alignment & Position */}
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
              Alignment & Position
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <CompactButton
                icon={<FiAlignLeft size={14} />}
                label="Left"
                onClick={() => updateStyle({ textAlign: 'left' })}
                isActive={style.textAlign === 'left'}
              />
              <CompactButton
                icon={<FiAlignCenter size={14} />}
                label="Center"
                onClick={() => updateStyle({ textAlign: 'center' })}
                isActive={style.textAlign === 'center'}
              />
              <CompactButton
                icon={<FiAlignRight size={14} />}
                label="Right"
                onClick={() => updateStyle({ textAlign: 'right' })}
                isActive={style.textAlign === 'right'}
              />
              <CompactButton
                icon={<div style={{ fontSize: '12px', fontWeight: '600' }}>
                  {Math.round(style.position?.x || 50)}%
                </div>}
                label="X Position"
                onClick={() => openModal('positionX')}
              />
              <CompactButton
                icon={<div style={{ fontSize: '12px', fontWeight: '600' }}>
                  {Math.round(style.position?.y || 50)}%
                </div>}
                label="Y Position"
                onClick={() => openModal('positionY')}
              />
            </div>
          </div>

          {/* Font Modal */}
          <Modal 
            isOpen={openModalState === 'font'} 
            onClose={handleInternalCancel} 
            title="Font Family"
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {Object.values(FontOption).map((font) => (
                <button
                  key={font}
                  onClick={() => updateTempStyle({ font })}
                  style={{
                    padding: '12px',
                    backgroundColor: style.font === font ? theme.colors.primary : '#ffffff',
                    color: style.font === font ? '#ffffff' : theme.colors.text,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    fontFamily: font,
                    transition: 'all 0.2s ease'
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
            onClose={handleInternalCancel} 
            title="Font Size"
          >
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                fontSize: '12px',
                fontWeight: '500',
                color: theme.colors.text,
                marginBottom: '8px',
                display: 'block'
              }}>
                Size: {Math.round(style.fontSize || 85)}px
              </label>
              <input
                type="range"
                min="16"
                max="200"
                value={style.fontSize || 85}
                onChange={(e) => updateTempStyle({ fontSize: parseInt(e.target.value) })}
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '3px',
                  background: theme.colors.border,
                  outline: 'none',
                  accentColor: theme.colors.primary
                }}
              />
            </div>
          </Modal>

          {/* Scale Modal */}
          <Modal 
            isOpen={openModalState === 'scale'} 
            onClose={handleInternalCancel} 
            title="Scale"
          >
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                fontSize: '12px',
                fontWeight: '500',
                color: theme.colors.text,
                marginBottom: '8px',
                display: 'block'
              }}>
                Scale: {Math.round((style.scale || 1) * 100)}%
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={style.scale || 1}
                onChange={(e) => updateTempStyle({ scale: parseFloat(e.target.value) })}
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '3px',
                  background: theme.colors.border,
                  outline: 'none',
                  accentColor: theme.colors.primary
                }}
              />
            </div>
          </Modal>

          {/* Stroke Width Modal */}
          <Modal 
            isOpen={openModalState === 'strokeWidth'} 
            onClose={handleInternalCancel} 
            title="Stroke Width"
          >
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                fontSize: '12px',
                fontWeight: '500',
                color: theme.colors.text,
                marginBottom: '8px',
                display: 'block'
              }}>
                Width: {Math.round(style.strokeWidth || 0)}px
              </label>
              <input
                type="range"
                min="0"
                max="10"
                value={style.strokeWidth || 0}
                onChange={(e) => updateTempStyle({ strokeWidth: parseInt(e.target.value) })}
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '3px',
                  background: theme.colors.border,
                  outline: 'none',
                  accentColor: theme.colors.primary
                }}
              />
            </div>
          </Modal>

          {/* Position X Modal */}
          <Modal 
            isOpen={openModalState === 'positionX'} 
            onClose={handleInternalCancel} 
            title="X Position"
          >
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                fontSize: '12px',
                fontWeight: '500',
                color: theme.colors.text,
                marginBottom: '8px',
                display: 'block'
              }}>
                X Position: {Math.round(style.position?.x || 50)}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={style.position?.x || 50}
                onChange={(e) => updateTempStyle({ 
                  position: { 
                    ...style.position, 
                    x: parseInt(e.target.value) 
                  } 
                })}
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '3px',
                  background: theme.colors.border,
                  outline: 'none',
                  accentColor: theme.colors.primary
                }}
              />
            </div>
          </Modal>

          {/* Position Y Modal */}
          <Modal 
            isOpen={openModalState === 'positionY'} 
            onClose={handleInternalCancel} 
            title="Y Position"
          >
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                fontSize: '12px',
                fontWeight: '500',
                color: theme.colors.text,
                marginBottom: '8px',
                display: 'block'
              }}>
                Y Position: {Math.round(style.position?.y || 50)}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={style.position?.y || 50}
                onChange={(e) => updateTempStyle({ 
                  position: { 
                    ...style.position, 
                    y: parseInt(e.target.value) 
                  } 
                })}
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '3px',
                  background: theme.colors.border,
                  outline: 'none',
                  accentColor: theme.colors.primary
                }}
              />
            </div>
          </Modal>

          {/* Color Modals with Opacity */}
          {['textColor', 'highlighterColor', 'backgroundColor', 'strokeColor'].map((colorType) => {
            const opacityKey = `${colorType}Opacity` as keyof SubtitleStyle;
            const currentOpacity = (tempStyle as any)[opacityKey] || 100;
            
            return (
              <Modal 
                key={colorType}
                isOpen={openModalState === colorType} 
                onClose={handleInternalCancel} 
                title={colorType.replace('Color', '').replace(/([A-Z])/g, ' $1').replace(/^\w/, c => c.toUpperCase()) + ' Color'}
              >
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
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
                            : `2px solid ${(tempStyle as any)[colorType] === color ? theme.colors.primary : '#ddd'}`,
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          position: 'relative'
                        }}
                      >
                        {color === 'transparent' && (
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            fontSize: '10px',
                            color: '#666',
                            fontWeight: '500'
                          }}>
                            T
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Opacity Slider - Only show if color is not transparent */}
                  {(tempStyle as any)[colorType] !== 'transparent' && (
                    <div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px'
                      }}>
                        <label style={{
                          fontSize: '12px',
                          fontWeight: '500',
                          color: theme.colors.text
                        }}>
                          Opacity
                        </label>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: theme.colors.primary
                        }}>
                          {currentOpacity}%
                        </span>
                      </div>
                      <div style={{
                        padding: '12px',
                        backgroundColor: '#ffffff',
                        borderRadius: '8px',
                        border: `1px solid ${theme.colors.border}`
                      }}>
                        {/* Custom draggable slider */}
                        <div style={{ position: 'relative', height: '30px' }}>
                          {/* Track background */}
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: 0,
                            right: 0,
                            height: '4px',
                            backgroundColor: theme.colors.border,
                            borderRadius: '2px',
                            transform: 'translateY(-50%)'
                          }} />
                          
                          {/* Active track */}
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: 0,
                            width: `${currentOpacity}%`,
                            height: '4px',
                            backgroundColor: theme.colors.primary,
                            borderRadius: '2px',
                            transform: 'translateY(-50%)'
                          }} />
                          
                          {/* Clickable track for direct positioning */}
                          <div 
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              height: '30px',
                              cursor: 'pointer'
                            }}
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const clickX = e.clientX - rect.left;
                              const percentage = Math.max(0, Math.min(100, Math.round((clickX / rect.width) * 100)));
                              // Create explicit update object instead of computed property
                              const opacityUpdate: Partial<SubtitleStyle> = {};
                              if (colorType === 'textColor') {
                                opacityUpdate.textColorOpacity = percentage;
                              } else if (colorType === 'highlighterColor') {
                                opacityUpdate.highlighterColorOpacity = percentage;
                              } else if (colorType === 'backgroundColor') {
                                opacityUpdate.backgroundColorOpacity = percentage;
                              } else if (colorType === 'strokeColor') {
                                opacityUpdate.strokeColorOpacity = percentage;
                              }
                              
                              updateTempStyle(opacityUpdate);
                            }}
                          />
                          
                          {/* Draggable thumb */}
                          <div
                            style={{
                              position: 'absolute',
                              top: '50%',
                              left: `${currentOpacity}%`,
                              width: '16px',
                              height: '16px',
                              backgroundColor: theme.colors.primary,
                              borderRadius: '50%',
                              border: '2px solid #ffffff',
                              transform: 'translate(-50%, -50%)',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
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
                              
                              const handleMouseMove = (e: MouseEvent) => {
                                const containerRect = container.getBoundingClientRect();
                                const mouseX = e.clientX - containerRect.left;
                                const percentage = Math.max(0, Math.min(100, Math.round((mouseX / containerRect.width) * 100)));
                                
                                // Create explicit update object instead of computed property
                                const opacityUpdate: Partial<SubtitleStyle> = {};
                                if (colorType === 'textColor') {
                                  opacityUpdate.textColorOpacity = percentage;
                                } else if (colorType === 'highlighterColor') {
                                  opacityUpdate.highlighterColorOpacity = percentage;
                                } else if (colorType === 'backgroundColor') {
                                  opacityUpdate.backgroundColorOpacity = percentage;
                                } else if (colorType === 'strokeColor') {
                                  opacityUpdate.strokeColorOpacity = percentage;
                                }
                                
                                updateTempStyle(opacityUpdate);
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
                      </div>
                    </div>
                  )}
                </div>
              </Modal>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default CaptionStyleModal;