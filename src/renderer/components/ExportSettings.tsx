import React, { useState } from 'react';
import { ExportSettings } from '../../types';

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
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#2a2a2a',
        borderRadius: '8px',
        padding: '24px',
        minWidth: '400px',
        border: '1px solid #444'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>
            Export Settings
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#ccc',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Framerate Selection */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
            Frame Rate
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setFramerate(30)}
              style={{
                flex: 1,
                padding: '12px 16px',
                backgroundColor: framerate === 30 ? '#007acc' : '#444',
                color: '#fff',
                border: framerate === 30 ? '2px solid #0099ff' : '1px solid #555',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: framerate === 30 ? 'bold' : 'normal'
              }}
            >
              <div style={{ marginBottom: '4px' }}>30 FPS</div>
              <div style={{ fontSize: '11px', color: framerate === 30 ? '#cce7ff' : '#aaa' }}>
                Standard quality, faster rendering
              </div>
            </button>
            <button
              onClick={() => setFramerate(60)}
              style={{
                flex: 1,
                padding: '12px 16px',
                backgroundColor: framerate === 60 ? '#007acc' : '#444',
                color: '#fff',
                border: framerate === 60 ? '2px solid #0099ff' : '1px solid #555',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: framerate === 60 ? 'bold' : 'normal'
              }}
            >
              <div style={{ marginBottom: '4px' }}>60 FPS</div>
              <div style={{ fontSize: '11px', color: framerate === 60 ? '#cce7ff' : '#aaa' }}>
                Smooth motion, longer rendering
              </div>
            </button>
          </div>
        </div>

        {/* Quality Selection */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
            Rendering Quality
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { value: 'fast', label: 'Fast', description: 'Quick rendering with basic quality' },
              { value: 'balanced', label: 'Balanced', description: 'Good quality with reasonable speed' },
              { value: 'high', label: 'High Quality', description: 'Best quality, slower rendering' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setQuality(option.value as any)}
                style={{
                  padding: '12px 16px',
                  backgroundColor: quality === option.value ? '#007acc' : '#444',
                  color: '#fff',
                  border: quality === option.value ? '2px solid #0099ff' : '1px solid #555',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: quality === option.value ? 'bold' : 'normal',
                  textAlign: 'left'
                }}
              >
                <div style={{ marginBottom: '2px' }}>{option.label}</div>
                <div style={{ fontSize: '11px', color: quality === option.value ? '#cce7ff' : '#aaa' }}>
                  {option.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Estimated rendering time info */}
        <div style={{
          backgroundColor: '#1a1a1a',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '20px',
          border: '1px solid #333'
        }}>
          <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '4px' }}>
            <strong>Estimated rendering time:</strong>
          </div>
          <div style={{ fontSize: '11px', color: '#aaa' }}>
            {framerate === 30 ? (
              quality === 'fast' ? '0.5-1x video length' :
              quality === 'balanced' ? '1-2x video length' :
              '2-3x video length'
            ) : (
              quality === 'fast' ? '1-2x video length' :
              quality === 'balanced' ? '2-4x video length' :
              '4-6x video length'
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#444',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: '#fff',
              border: '1px solid #218838',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            Start Export
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportSettingsModal;