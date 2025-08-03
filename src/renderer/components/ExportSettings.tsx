import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { ExportSettings } from '../../types';
import { Button, IconButton } from './ui';
import { FiX, FiSettings, FiClock, FiZap, FiTarget, FiStar } from 'react-icons/fi';

interface ExportSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (settings: ExportSettings) => void;
}

const ExportSettingsModal: React.FC<ExportSettingsProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  const { theme } = useTheme();
  const [framerate, setFramerate] = useState<30 | 60>(30);
  const [quality, setQuality] = useState<'fast' | 'balanced' | 'high'>('balanced');

  const handleConfirm = () => {
    onConfirm({
      framerate,
      quality
    });
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.modal.overlay,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(8px)'
    }}>
      <div style={{
        backgroundColor: theme.colors.modal.background,
        borderRadius: '12px',
        border: `1px solid ${theme.colors.modal.border}`,
        padding: '0',
        minWidth: '450px',
        maxWidth: '90vw',
        maxHeight: '85vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        color: theme.colors.text
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${theme.colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: theme.colors.primary,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FiSettings size={20} color={theme.colors.primaryForeground} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', lineHeight: '1.2' }}>
                Export Settings
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: theme.colors.textSecondary }}>
                Configure video export quality and framerate
              </p>
            </div>
          </div>
          <IconButton
            icon={<FiX size={16} />}
            onClick={onClose}
            variant="ghost"
            size="sm"
            aria-label="Close modal"
          />
        </div>

        {/* Modal Content */}
        <div style={{ padding: '20px 24px' }}>

        {/* Framerate Selection */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              backgroundColor: theme.colors.accent,
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FiZap size={16} color={theme.colors.accentForeground} />
            </div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: theme.colors.text }}>
              Frame Rate
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Button
              onClick={() => setFramerate(30)}
              variant={framerate === 30 ? 'primary' : 'outline'}
              size="lg"
              fullWidth
              style={{
                justifyContent: 'flex-start',
                textAlign: 'left',
                padding: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <FiTarget size={16} />
                <span style={{ fontSize: '15px', fontWeight: '600' }}>30 FPS</span>
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: framerate === 30 ? theme.colors.primaryForeground : theme.colors.textSecondary,
                lineHeight: '1.4',
                opacity: 0.9
              }}>
                Standard quality, faster rendering
              </div>
            </Button>
            <Button
              onClick={() => setFramerate(60)}
              variant={framerate === 60 ? 'primary' : 'outline'}
              size="lg"
              fullWidth
              style={{
                justifyContent: 'flex-start',
                textAlign: 'left',
                padding: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <FiStar size={16} />
                <span style={{ fontSize: '15px', fontWeight: '600' }}>60 FPS</span>
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: framerate === 60 ? theme.colors.primaryForeground : theme.colors.textSecondary,
                lineHeight: '1.4',
                opacity: 0.9
              }}>
                Smooth motion, longer rendering
              </div>
            </Button>
          </div>
        </div>

        {/* Quality Selection */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              backgroundColor: theme.colors.success,
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FiStar size={16} color={theme.colors.successForeground} />
            </div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: theme.colors.text }}>
              Rendering Quality
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { value: 'fast', label: 'Fast', description: 'Quick rendering with basic quality', icon: FiZap },
              { value: 'balanced', label: 'Balanced', description: 'Good quality with reasonable speed', icon: FiTarget },
              { value: 'high', label: 'High Quality', description: 'Best quality, slower rendering', icon: FiStar }
            ].map(option => (
              <Button
                key={option.value}
                onClick={() => setQuality(option.value as any)}
                variant={quality === option.value ? 'primary' : 'outline'}
                size="lg"
                fullWidth
                style={{
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: quality === option.value ? theme.colors.primaryForeground : theme.colors.background,
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <option.icon size={16} color={quality === option.value ? theme.colors.primary : theme.colors.text} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '3px' }}>
                    {option.label}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: quality === option.value ? theme.colors.primaryForeground : theme.colors.textSecondary,
                    lineHeight: '1.4',
                    opacity: 0.9
                  }}>
                    {option.description}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Estimated rendering time info */}
        <div style={{
          backgroundColor: theme.colors.surface,
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px',
          border: `1px solid ${theme.colors.border}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              backgroundColor: theme.colors.info,
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FiClock size={16} color={theme.colors.infoForeground} />
            </div>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: theme.colors.text }}>
              Estimated Rendering Time
            </h4>
          </div>
          <div style={{ 
            fontSize: '13px', 
            color: theme.colors.textMuted,
            lineHeight: '1.5',
            padding: '8px 12px',
            backgroundColor: theme.colors.background,
            borderRadius: '6px',
            border: `1px solid ${theme.colors.border}`
          }}>
            <strong style={{ color: theme.colors.text }}>
              {framerate === 30 ? (
                quality === 'fast' ? '0.5-1x video length' :
                quality === 'balanced' ? '1-2x video length' :
                '2-3x video length'
              ) : (
                quality === 'fast' ? '1-2x video length' :
                quality === 'balanced' ? '2-4x video length' :
                '4-6x video length'
              )}
            </strong>
          </div>
        </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          padding: '16px 24px',
          borderTop: `1px solid ${theme.colors.border}`,
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          backgroundColor: theme.colors.backgroundSecondary
        }}>
          <Button
            onClick={onClose}
            variant="outline"
            size="md"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            variant="primary"
            size="md"
            leftIcon={<FiZap size={16} />}
          >
            Start Export
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExportSettingsModal;