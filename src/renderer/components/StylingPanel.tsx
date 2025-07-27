import React from 'react';
import { CaptionSegment, FontOption, ColorOption } from '../../types';

interface StylingPanelProps {
  selectedSegment: CaptionSegment | null;
  onSegmentUpdate: (segmentId: string, updates: Partial<CaptionSegment>) => void;
  videoFile?: { path: string; name: string } | null;
  captions?: CaptionSegment[];
  onExport?: () => void;
}

const StylingPanel: React.FC<StylingPanelProps> = ({
  selectedSegment,
  onSegmentUpdate,
  videoFile,
  captions,
  onExport,
}) => {
  if (!selectedSegment) {
    return (
      <div style={{
        padding: '20px',
        height: '100%',
        backgroundColor: '#2a2a2a'
      }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '16px' }}>Styling Controls</h3>
        <div style={{
          textAlign: 'center',
          color: '#888',
          marginTop: '100px'
        }}>
          Select a caption segment to edit its style
        </div>
      </div>
    );
  }

  const handleStyleUpdate = (styleUpdates: Partial<CaptionSegment['style']>) => {
    onSegmentUpdate(selectedSegment.id, {
      style: { ...selectedSegment.style, ...styleUpdates }
    });
  };

  const handleTextUpdate = (newText: string) => {
    onSegmentUpdate(selectedSegment.id, {
      text: newText
    });
  };

  const handleWordUpdate = (wordIndex: number, newWord: string) => {
    if (!selectedSegment.words) return;
    
    const updatedWords = [...selectedSegment.words];
    updatedWords[wordIndex] = { ...updatedWords[wordIndex], word: newWord };
    
    // Regenerate text from words
    const newText = updatedWords.map(w => w.word).join(' ');
    
    onSegmentUpdate(selectedSegment.id, {
      text: newText,
      words: updatedWords
    });
  };

  const handleWordDelete = (wordIndex: number) => {
    if (!selectedSegment.words) return;
    
    const updatedWords = selectedSegment.words.filter((_, index) => index !== wordIndex);
    
    // Regenerate text from remaining words
    const newText = updatedWords.map(w => w.word).join(' ');
    
    onSegmentUpdate(selectedSegment.id, {
      text: newText,
      words: updatedWords
    });
  };

  return (
    <div style={{
      padding: '20px',
      height: '100%',
      backgroundColor: '#2a2a2a',
      overflowY: 'auto'
    }}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: '16px' }}>Styling Controls</h3>
      
      {/* Text Editor Section */}
      <div style={{ marginBottom: '25px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
          Text Content
        </label>
        <textarea
          value={selectedSegment.text}
          onChange={(e) => handleTextUpdate(e.target.value)}
          style={{
            width: '100%',
            height: '80px',
            padding: '8px',
            backgroundColor: '#333',
            color: '#fff',
            border: '1px solid #555',
            borderRadius: '4px',
            resize: 'vertical',
            fontFamily: 'monospace',
            fontSize: '14px'
          }}
          placeholder="Enter caption text..."
        />
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
          {selectedSegment.words ? `${selectedSegment.words.length} words with timing` : 'No word-level timing available'}
        </div>
      </div>

      {/* Word-Level Editor */}
      {selectedSegment.words && selectedSegment.words.length > 0 && (
        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
            Word-Level Editor
          </label>
          <div style={{
            maxHeight: '200px',
            overflowY: 'auto',
            backgroundColor: '#333',
            border: '1px solid #555',
            borderRadius: '4px',
            padding: '8px'
          }}>
            {selectedSegment.words.map((word, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '4px',
                  padding: '4px',
                  backgroundColor: '#444',
                  borderRadius: '3px'
                }}
              >
                <input
                  type="text"
                  value={word.word}
                  onChange={(e) => handleWordUpdate(index, e.target.value)}
                  style={{
                    flex: 1,
                    padding: '2px 4px',
                    backgroundColor: '#555',
                    color: '#fff',
                    border: '1px solid #666',
                    borderRadius: '2px',
                    fontSize: '12px'
                  }}
                />
                <button
                  onClick={() => handleWordDelete(index)}
                  style={{
                    marginLeft: '8px',
                    padding: '2px 6px',
                    backgroundColor: '#d32f2f',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '2px',
                    fontSize: '10px',
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '8px', fontSize: '11px', color: '#888' }}>
            ⚠️ Deleting words will remove corresponding audio/video segments
          </div>
        </div>
      )}
      
      {/* Font Size Control */}
      <div style={{ marginBottom: '25px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
          Font Size
        </label>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {[16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76, 80].map(size => (
            <button
              key={size}
              onClick={() => handleStyleUpdate({ fontSize: size })}
              style={{
                padding: '6px 12px',
                backgroundColor: selectedSegment.style.fontSize === size ? '#007acc' : '#444',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                minWidth: '40px'
              }}
            >
              {size}
            </button>
          ))}
        </div>
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
          Current: {selectedSegment.style.fontSize}px
        </div>
      </div>

      {/* Font Family Control */}
      <div style={{ marginBottom: '25px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
          Font Family
        </label>
        <select
          value={selectedSegment.style.font}
          onChange={(e) => handleStyleUpdate({ font: e.target.value })}
          style={{
            width: '100%',
            padding: '8px',
            backgroundColor: '#333',
            color: '#fff',
            border: '1px solid #555',
            borderRadius: '4px'
          }}
        >
          <option value="SF Pro Display Semibold">SF Pro Display Semibold</option>
          <option value="Arial">Arial</option>
          <option value="Helvetica">Helvetica</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Georgia">Georgia</option>
        </select>
      </div>

      {/* Text Color Control */}
      <div style={{ marginBottom: '25px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
          Text Color
        </label>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {Object.values(ColorOption).map(color => (
            <button
              key={color}
              onClick={() => handleStyleUpdate({ textColor: color })}
              style={{
                width: '30px',
                height: '30px',
                backgroundColor: color,
                border: selectedSegment.style.textColor === color ? '3px solid #007acc' : '1px solid #555',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Highlighter Color Control */}
      <div style={{ marginBottom: '25px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
          Highlighter Color
        </label>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {Object.values(ColorOption).map(color => (
            <button
              key={color}
              onClick={() => handleStyleUpdate({ highlighterColor: color })}
              style={{
                width: '30px',
                height: '30px',
                backgroundColor: color,
                border: selectedSegment.style.highlighterColor === color ? '3px solid #007acc' : '1px solid #555',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Emphasis Mode Control */}
      <div style={{ marginBottom: '25px' }}>
        <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={selectedSegment.style.emphasizeMode || false}
            onChange={(e) => handleStyleUpdate({ emphasizeMode: e.target.checked })}
            style={{ marginRight: '8px' }}
          />
          Emphasis Mode
        </label>
        <div style={{ marginTop: '4px', fontSize: '12px', color: '#888' }}>
          {selectedSegment.style.emphasizeMode 
            ? 'Highlighted words will be emphasized (larger + color change)'
            : 'Highlighted words will have background highlighting'
          }
        </div>
      </div>

      {/* Background Color Control */}
      <div style={{ marginBottom: '25px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
          Background Color
        </label>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {/* Transparent option with special styling */}
          <button
            onClick={() => handleStyleUpdate({ backgroundColor: 'transparent' })}
            style={{
              width: '30px',
              height: '30px',
              backgroundColor: 'transparent',
              border: selectedSegment.style.backgroundColor === 'transparent' ? '3px solid #007acc' : '1px solid #555',
              borderRadius: '4px',
              cursor: 'pointer',
              position: 'relative',
              backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
              backgroundSize: '8px 8px',
              backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
            }}
            title="Transparent"
          />
          {Object.values(ColorOption).filter(color => color !== 'transparent').map(color => (
            <button
              key={color}
              onClick={() => handleStyleUpdate({ backgroundColor: color })}
              style={{
                width: '30px',
                height: '30px',
                backgroundColor: color,
                border: selectedSegment.style.backgroundColor === color ? '3px solid #007acc' : '1px solid #555',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Position Controls */}
      <div style={{ marginBottom: '25px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
          Position
        </label>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px', color: '#ccc' }}>X: {selectedSegment.style.position.x}</label>
            <input
              type="range"
              min="0"
              max="100"
              value={selectedSegment.style.position.x}
              onChange={(e) => handleStyleUpdate({ 
                position: { 
                  ...selectedSegment.style.position, 
                  x: parseInt(e.target.value) 
                }
              })}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px', color: '#ccc' }}>Y: {selectedSegment.style.position.y}</label>
            <input
              type="range"
              min="0"
              max="100"
              value={selectedSegment.style.position.y}
              onChange={(e) => handleStyleUpdate({ 
                position: { 
                  ...selectedSegment.style.position, 
                  y: parseInt(e.target.value) 
                }
              })}
              style={{ width: '100%' }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px', color: '#ccc' }}>Z Rotation: {selectedSegment.style.position.z || 0}°</label>
            <input
              type="range"
              min="-180"
              max="180"
              value={selectedSegment.style.position.z || 0}
              onChange={(e) => handleStyleUpdate({ 
                position: { 
                  ...selectedSegment.style.position, 
                  z: parseInt(e.target.value) 
                }
              })}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* Text Width Control */}
      <div style={{ marginBottom: '25px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
          Text Width: {selectedSegment.style.width || 600}px
        </label>
        <input
          type="range"
          min="100"
          max="2000"
          step="10"
          value={selectedSegment.style.width || 600}
          onChange={(e) => handleStyleUpdate({ width: parseInt(e.target.value) })}
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
          <span>100px</span>
          <span>2000px</span>
        </div>
        <div style={{ marginTop: '4px', fontSize: '12px', color: '#888' }}>
          Maximum width for text wrapping
        </div>
      </div>

      {/* Export Section */}
      {videoFile && captions && captions.length > 0 && (
        <div style={{ 
          marginTop: '30px', 
          paddingTop: '20px', 
          borderTop: '1px solid #444' 
        }}>
          <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', fontWeight: 'bold' }}>
            Export Video
          </h4>
          <button
            onClick={onExport}
            style={{
              width: '100%',
              padding: '12px 24px',
              backgroundColor: '#007acc',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            Export Video with Captions
          </button>
          <div style={{
            marginTop: '10px',
            fontSize: '12px',
            color: '#888',
            textAlign: 'center'
          }}>
            This will render your video with burned-in captions
          </div>
        </div>
      )}
    </div>
  );
};

export default StylingPanel;