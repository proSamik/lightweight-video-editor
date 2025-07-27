import React, { useState } from 'react';

interface TranscriptionSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (settings: { maxCharsPerLine: number; maxWordsPerLine: number }) => void;
}

const TranscriptionSettings: React.FC<TranscriptionSettingsProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  const [maxCharsPerLine, setMaxCharsPerLine] = useState(50);
  const [maxWordsPerLine, setMaxWordsPerLine] = useState(8);

  if (!isOpen) return null;

  const handleConfirm = () => {
    // Validate inputs before confirming
    if (maxCharsPerLine < 12) {
      alert('Maximum characters per line must be at least 12');
      return;
    }
    if (maxWordsPerLine <= 0) {
      alert('Maximum words per line must be greater than 0');
      return;
    }
    
    onConfirm({ maxCharsPerLine, maxWordsPerLine });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#2a2a2a',
        padding: '30px',
        borderRadius: '8px',
        minWidth: '400px',
        border: '1px solid #444'
      }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#fff' }}>
          Transcription Settings
        </h3>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ccc' }}>
            Maximum Characters per Line: {maxCharsPerLine}
          </label>
          <input
            type="range"
            min="12"
            max="200"
            step="1"
            value={maxCharsPerLine}
            onChange={(e) => setMaxCharsPerLine(parseInt(e.target.value))}
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              background: '#444',
              outline: 'none',
              appearance: 'none'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '10px', color: '#888' }}>
            <span>12</span>
            <span>200</span>
          </div>
          <div style={{ marginTop: '4px', fontSize: '12px', color: '#888' }}>
            Text will wrap when this limit is reached
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ccc' }}>
            Maximum Words per Line: {maxWordsPerLine}
          </label>
          <input
            type="range"
            min="3"
            max="20"
            step="1"
            value={maxWordsPerLine}
            onChange={(e) => setMaxWordsPerLine(parseInt(e.target.value))}
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              background: '#444',
              outline: 'none',
              appearance: 'none'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '10px', color: '#888' }}>
            <span>3</span>
            <span>20</span>
          </div>
          <div style={{ marginTop: '4px', fontSize: '12px', color: '#888' }}>
            Text will wrap after this many words
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#555',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007acc',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Start Transcription
          </button>
        </div>
      </div>
    </div>
  );
};

export default TranscriptionSettings; 