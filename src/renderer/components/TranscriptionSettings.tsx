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
    if (maxCharsPerLine <= 0) {
      alert('Maximum characters per line must be greater than 0');
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
            Maximum Characters per Line
          </label>
          <input
            type="number"
            min="20"
            max="200"
            value={maxCharsPerLine}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              if (!isNaN(value) && value > 0) {
                setMaxCharsPerLine(value);
              } else if (e.target.value === '') {
                setMaxCharsPerLine(1); // Minimum value while typing
              }
            }}
            style={{
              width: '100%',
              padding: '8px',
              backgroundColor: '#333',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '4px'
            }}
          />
          <div style={{ marginTop: '4px', fontSize: '12px', color: '#888' }}>
            Text will wrap when this limit is reached
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ccc' }}>
            Maximum Words per Line
          </label>
          <input
            type="number"
            min="3"
            max="20"
            value={maxWordsPerLine}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              if (!isNaN(value) && value > 0) {
                setMaxWordsPerLine(value);
              } else if (e.target.value === '') {
                setMaxWordsPerLine(1); // Minimum value while typing
              }
            }}
            style={{
              width: '100%',
              padding: '8px',
              backgroundColor: '#333',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '4px'
            }}
          />
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