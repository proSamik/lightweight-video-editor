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
    
    const wordToDelete = selectedSegment.words[wordIndex];
    const updatedWords = selectedSegment.words.filter((_, index) => index !== wordIndex);
    
    // Calculate new timing: remove the gap left by deleted word
    const deletedDuration = wordToDelete.end - wordToDelete.start;
    
    // Adjust timings of remaining words
    const adjustedWords = updatedWords.map((word) => {
      if (word.start > wordToDelete.start) {
        return {
          ...word,
          start: word.start - deletedDuration,
          end: word.end - deletedDuration
        };
      }
      return word;
    });
    
    // Regenerate text from remaining words
    const newText = adjustedWords.map(w => w.word).join(' ');
    
    // Calculate new segment timing
    const newStartTime = adjustedWords.length > 0 ? adjustedWords[0].start : selectedSegment.startTime;
    const newEndTime = adjustedWords.length > 0 ? adjustedWords[adjustedWords.length - 1].end : selectedSegment.endTime;
    
    onSegmentUpdate(selectedSegment.id, {
      text: newText,
      words: adjustedWords,
      startTime: newStartTime,
      endTime: newEndTime
    });
  };

  const textColors = [
    ColorOption.WHITE,
    ColorOption.BLACK,
    ColorOption.YELLOW,
    ColorOption.RED,
    ColorOption.BLUE,
  ];

  const highlighterColors = [
    ColorOption.BRIGHT_YELLOW,
    ColorOption.ORANGE,
    ColorOption.GREEN,
    ColorOption.PINK,
    ColorOption.CYAN,
  ];

  const backgroundColors = [
    ColorOption.TRANSPARENT,
    ColorOption.BLACK_SEMI,
    ColorOption.WHITE_SEMI,
    ColorOption.DARK_GRAY,
    ColorOption.NAVY_BLUE,
  ];

  const fonts = Object.values(FontOption);

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
      
      {/* Font Selection */}
      <div style={{ marginBottom: '25px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
          Font
        </label>
        <select
          value={selectedSegment.style.font}
          onChange={(e) => handleStyleUpdate({ font: e.target.value as FontOption })}
          style={{
            width: '100%',
            padding: '8px',
            backgroundColor: '#333',
            color: '#fff',
            border: '1px solid #555',
            borderRadius: '4px'
          }}
        >
          {fonts.map(font => (
            <option key={font} value={font}>{font}</option>
          ))}
        </select>
      </div>

      {/* Font Size */}
      <div style={{ marginBottom: '25px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
          Font Size: {selectedSegment.style.fontSize}px
        </label>
        <input
          type="range"
          min="16"
          max="72"
          value={selectedSegment.style.fontSize}
          onChange={(e) => handleStyleUpdate({ fontSize: parseInt(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>

      {/* Text Width */}
      <div style={{ marginBottom: '25px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
          Text Width: {selectedSegment.style.width}px
        </label>
        <input
          type="range"
          min="200"
          max="800"
          value={selectedSegment.style.width}
          onChange={(e) => handleStyleUpdate({ width: parseInt(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>

      {/* Text Color */}
      <div style={{ marginBottom: '25px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
          Text Color
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {textColors.map(color => (
            <div
              key={color}
              style={{
                width: '30px',
                height: '30px',
                backgroundColor: color,
                border: selectedSegment.style.textColor === color ? '3px solid #fff' : '1px solid #555',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              onClick={() => handleStyleUpdate({ textColor: color })}
            />
          ))}
        </div>
      </div>

      {/* Highlighter Color */}
      <div style={{ marginBottom: '25px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
          Highlighter Color
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {highlighterColors.map(color => (
            <div
              key={color}
              style={{
                width: '30px',
                height: '30px',
                backgroundColor: color,
                border: selectedSegment.style.highlighterColor === color ? '3px solid #fff' : '1px solid #555',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              onClick={() => handleStyleUpdate({ highlighterColor: color })}
            />
          ))}
        </div>
      </div>

      {/* Background Color */}
      <div style={{ marginBottom: '25px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
          Background Color
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {backgroundColors.map(color => (
            <div
              key={color}
              style={{
                width: '30px',
                height: '30px',
                backgroundColor: color === 'transparent' ? '#666' : color,
                border: selectedSegment.style.backgroundColor === color ? '3px solid #fff' : '1px solid #555',
                borderRadius: '4px',
                cursor: 'pointer',
                position: 'relative'
              }}
              onClick={() => handleStyleUpdate({ backgroundColor: color })}
            >
              {color === 'transparent' && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '12px',
                  color: '#fff'
                }}>
                  ∅
                </div>
              )}
            </div>
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