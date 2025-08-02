import React, { useState } from 'react';
import { CaptionSegment, FontOption, ColorOption, ExportSettings } from '../../types';
import ExportSettingsModal from './ExportSettings';
import { useTheme } from '../contexts/ThemeContext';
import { ExportSrtIcon } from './IconComponents';

interface StylingPanelProps {
  selectedSegment: CaptionSegment | null;
  onSegmentUpdate: (segmentId: string, updates: Partial<CaptionSegment>) => void;
  videoFile?: { path: string; name: string } | null;
  captions?: CaptionSegment[];
  onExport?: (settings: ExportSettings) => void;
  onApplyToAll?: (styleUpdates: Partial<CaptionSegment['style']>) => void;
  onTimeSeek?: (time: number) => void;
  transcriptionStatus?: {
    isTranscribing: boolean;
    progress: number;
    message: string;
  };
}

const StylingPanel: React.FC<StylingPanelProps> = ({
  selectedSegment,
  onSegmentUpdate,
  videoFile,
  captions,
  onExport,
  onApplyToAll,
  onTimeSeek,
  transcriptionStatus,
}) => {
  const { theme } = useTheme();
  const [showExportSettings, setShowExportSettings] = useState(false);
  
  // Transcription status component (shown in both selected and non-selected states)
  const transcriptionStatusComponent = transcriptionStatus?.isTranscribing ? (
    <div style={{
      backgroundColor: theme.colors.background,
      border: `1px solid ${theme.colors.success}`,
      borderRadius: '6px',
      padding: '12px',
      marginBottom: '20px'
    }}>
      <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>🎤 Transcribing Audio...</span>
        <span style={{ fontSize: '12px', color: theme.colors.success, fontWeight: 'bold' }}>
          {Math.round(transcriptionStatus.progress)}%
        </span>
      </div>
      <div style={{ 
        backgroundColor: theme.colors.background,
        borderRadius: '4px',
        height: '8px',
        overflow: 'hidden',
        marginBottom: '8px'
      }}>
        <div style={{
          backgroundColor: theme.colors.success,
          height: '100%',
          width: `${transcriptionStatus.progress}%`,
          transition: 'width 0.3s ease'
        }} />
      </div>
      <div style={{ fontSize: '12px', color: theme.colors.textSecondary }}>
        {transcriptionStatus.message}
      </div>
    </div>
  ) : null;
  
  if (!selectedSegment) {
    return (
      <div style={{
        padding: '20px',
        height: '100%',
        backgroundColor: theme.colors.background,
      }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: theme.colors.text }}>Styling Controls</h3>
        
        {transcriptionStatusComponent}
        
        <div style={{
          textAlign: 'center',
          color: theme.colors.textSecondary,
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
    // If we have word-level timing, try to preserve and update it
    if (selectedSegment.words && selectedSegment.words.length > 0) {
      const newWords = newText.split(' ').filter(word => word.trim() !== '');
      const originalWords = selectedSegment.words;
      
      // Create updated word timing by mapping new words to original timing
      const updatedWords = newWords.map((word, index) => {
        // Try to find matching word in original timing
        const originalWord = originalWords[index];
        const isEdited = originalWord ? originalWord.word !== word : true;
        
        if (originalWord) {
          // Use original timing but update the word
          return {
            ...originalWord,
            word: word,
            // If word was edited, ensure minimum duration for better highlighting
            end: isEdited ? 
              Math.max(originalWord.end, originalWord.start + 500) : 
              originalWord.end
          };
        } else {
          // New word - estimate timing based on segment duration
          const segmentDuration = selectedSegment.endTime - selectedSegment.startTime;
          const wordDuration = segmentDuration / newWords.length;
          const wordStart = selectedSegment.startTime + (index * wordDuration);
          
          return {
            word: word,
            start: wordStart,
            end: Math.min(wordStart + Math.max(wordDuration, 500), selectedSegment.endTime)
          };
        }
      });
      
      onSegmentUpdate(selectedSegment.id, {
        text: newText,
        words: updatedWords
      });
    } else {
      // No word-level timing, just update text
      onSegmentUpdate(selectedSegment.id, {
        text: newText
      });
    }
  };

  const handleWordUpdate = (wordIndex: number, newWord: string) => {
    if (!selectedSegment.words) return;
    
    const updatedWords = [...selectedSegment.words];
    const originalWord = updatedWords[wordIndex].word;
    
    // Only update if the word is not completely empty
    if (newWord.trim() !== '') {
      updatedWords[wordIndex] = { ...updatedWords[wordIndex], word: newWord.trim() };
      
      // Mark this word as edited by updating its timing to force highlighter to focus on it
      if (originalWord !== newWord.trim()) {
        // Extend the word's timing slightly to make it more visible during highlighting
        const wordDuration = updatedWords[wordIndex].end - updatedWords[wordIndex].start;
        const minDuration = 500; // Minimum 500ms for edited words
        
        if (wordDuration < minDuration) {
          const timeDiff = minDuration - wordDuration;
          updatedWords[wordIndex].end = updatedWords[wordIndex].end + timeDiff;
        }
      }
      
      // Regenerate text from words (only non-empty words)
      const newText = updatedWords.filter(w => w.word.trim() !== '').map(w => w.word).join(' ');
      
      onSegmentUpdate(selectedSegment.id, {
        text: newText,
        words: updatedWords
      });
    } else {
      // If word is empty, call the delete function instead
      handleWordDelete(wordIndex);
    }
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

  const handleWordMerge = (wordIndex: number) => {
    if (!selectedSegment?.words || wordIndex >= selectedSegment.words.length - 1) return;
    
    const updatedWords = [...selectedSegment.words];
    const currentWord = updatedWords[wordIndex];
    const nextWord = updatedWords[wordIndex + 1];
    
    // Merge the words - combine text and extend timing
    const mergedWord = {
      ...currentWord,
      word: (currentWord.word + ' ' + nextWord.word).trim(),
      end: nextWord.end // Extend timing to include next word
    };
    
    // Replace current word with merged word and remove next word
    updatedWords[wordIndex] = mergedWord;
    updatedWords.splice(wordIndex + 1, 1);
    
    const newText = updatedWords.map(w => w.word).join(' ');
    
    onSegmentUpdate(selectedSegment.id, {
      text: newText,
      words: updatedWords
    });
  };

  const handleJumpToWord = (wordStart: number) => {
    if (onTimeSeek) {
      onTimeSeek(wordStart);
    }
  };

  return (
    <div style={{
      padding: '20px',
      height: '100%',
      backgroundColor: theme.colors.surface,
      overflowY: 'auto'
    }}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: '16px' }}>Styling Controls</h3>
      
      {transcriptionStatusComponent}
      
      {/* Text Editor Section */}
      <div style={{ marginBottom: '25px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: theme.colors.text }}>
          Text Content
        </label>
        <textarea
          value={selectedSegment.text}
          onChange={(e) => handleTextUpdate(e.target.value)}
          style={{
            width: '100%',
            height: '80px',
            padding: '8px',
            backgroundColor: theme.colors.background,
            color: theme.colors.text,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: '4px',
            resize: 'vertical',
            fontFamily: 'monospace',
            fontSize: '14px'
          }}
          placeholder="Enter caption text..."
        />
        <div style={{ marginTop: '8px', fontSize: '12px', color: theme.colors.textSecondary }}>
          {selectedSegment.words ? 
            `${selectedSegment.words.length} words with timing • Edited words get enhanced highlighting` : 
            'No word-level timing available • Edit text to add basic timing'
          }
        </div>
      </div>

      {/* Word-Level Editor */}
      {selectedSegment.words && selectedSegment.words.length > 0 && (
        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: theme.colors.text }}>
            Word-Level Editor
          </label>
          <div style={{
            maxHeight: '200px',
            overflowY: 'auto',
            backgroundColor: theme.colors.background,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: '4px',
            padding: '8px'
          }}>
            {selectedSegment.words.map((word, index) => {
              // Check if this word has been edited (has extended timing)
              const wordDuration = word.end - word.start;
              const isEdited = wordDuration >= 500; // Words with extended timing are considered edited
              
              return (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '4px',
                    padding: '4px',
                    backgroundColor: isEdited ? theme.colors.success : theme.colors.surface, // Green tint for edited words
                    borderRadius: '3px',
                    border: isEdited ? `1px solid ${theme.colors.success}` : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    {isEdited && (
                      <span style={{ 
                        marginRight: '6px', 
                        fontSize: '10px',
                        color: theme.colors.success,
                        fontWeight: 'bold'
                      }}>
                        ✎
                      </span>
                    )}
                    <input
                      type="text"
                      value={word.word}
                      onChange={(e) => handleWordUpdate(index, e.target.value)}
                      style={{
                        flex: 1,
                        padding: '2px 4px',
                        backgroundColor: isEdited ? theme.colors.success : theme.colors.surface,
                        color: theme.colors.text,
                        border: isEdited ? `1px solid ${theme.colors.success}` : `1px solid ${theme.colors.border}`,
                        borderRadius: '2px',
                        fontSize: '12px'
                      }}
                    />
                  </div>
                  <div 
                    onClick={() => handleJumpToWord(word.start)}
                    style={{ 
                      fontSize: '9px', 
                      color: isEdited ? theme.colors.success : theme.colors.textSecondary, 
                      marginLeft: '4px',
                      minWidth: '40px',
                      textAlign: 'center',
                      cursor: onTimeSeek ? 'pointer' : 'default',
                      padding: '2px',
                      borderRadius: '2px',
                      backgroundColor: onTimeSeek ? 'rgba(255,255,255,0.05)' : 'transparent'
                    }}
                    title={onTimeSeek ? `Click to jump to word at ${(word.start / 1000).toFixed(1)}s` : ''}
                  >
                    {Math.round(wordDuration)}ms
                  </div>
                  {index < (selectedSegment.words?.length || 0) - 1 && (
                    <button
                      onClick={() => handleWordMerge(index)}
                      style={{
                        marginLeft: '8px',
                        padding: '2px 6px',
                                              backgroundColor: theme.colors.success,
                      color: theme.colors.text,
                        border: 'none',
                        borderRadius: '2px',
                        fontSize: '10px',
                        cursor: 'pointer'
                      }}
                      title="Merge with next word"
                    >
                      ⟷
                    </button>
                  )}
                  <button
                    onClick={() => handleWordDelete(index)}
                    style={{
                      marginLeft: '8px',
                      padding: '2px 6px',
                      backgroundColor: theme.colors.error,
                      color: theme.colors.text,
                      border: 'none',
                      borderRadius: '2px',
                      fontSize: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: '8px', fontSize: '11px', color: theme.colors.textSecondary }}>
            ✎ Green highlighted words have extended timing for better highlighting visibility<br/>
            ⟷ Merge button combines words while preserving audio timing<br/>
            ⚠️ Deleting words will remove corresponding audio/video segments
          </div>
        </div>
      )}
      
      {/* Font Size Control */}
      <div style={{ marginBottom: '25px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: theme.colors.text }}>
          Font Size: {selectedSegment.style.fontSize}px
        </label>
        <input
          type="range"
          min="16"
          max="200"
          step="1"
          value={selectedSegment.style.fontSize}
          onChange={(e) => handleStyleUpdate({ fontSize: parseInt(e.target.value) })}
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
          <span>16px</span>
          <span>200px</span>
        </div>
      </div>

      {/* Font Family Control */}
      <div style={{ marginBottom: '25px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: theme.colors.text }}>
          Font Family
        </label>
        <select
          value={selectedSegment.style.font}
          onChange={(e) => handleStyleUpdate({ font: e.target.value })}
          style={{
            width: '100%',
            padding: '8px',
            backgroundColor: theme.colors.background,
            color: theme.colors.text,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: '4px'
          }}
        >
          <option value="SF Pro Display Semibold">SF Pro Display Semibold</option>
          <option value="Arial">Arial</option>
          <option value="Helvetica">Helvetica</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Georgia">Georgia</option>
          <option value="Montserrat">Montserrat</option>
        </select>
      </div>

      {/* Text Color Control */}
      <div style={{ marginBottom: '25px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: theme.colors.text }}>
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
                border: selectedSegment.style.textColor === color ? `3px solid ${theme.colors.primary}` : `1px solid ${theme.colors.border}`,
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
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: theme.colors.text }}>
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
                border: selectedSegment.style.highlighterColor === color ? `3px solid ${theme.colors.primary}` : `1px solid ${theme.colors.border}`,
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

      {/* Burn-in Subtitles Control */}
      <div style={{ marginBottom: '25px' }}>
        <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={selectedSegment.style.burnInSubtitles !== false} // Default true
            onChange={(e) => handleStyleUpdate({ burnInSubtitles: e.target.checked })}
            style={{ marginRight: '8px' }}
          />
          Burn-in Subtitles
        </label>
        <div style={{ marginTop: '4px', fontSize: '12px', color: '#888' }}>
          {selectedSegment.style.burnInSubtitles !== false
            ? 'Subtitles will be permanently embedded in the exported video'
            : 'Subtitles will not appear in the exported video (SRT file only)'
          }
        </div>
      </div>

      {/* Render Mode Control */}
      <div style={{ marginBottom: '25px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
          Text Reveal Style
        </label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => handleStyleUpdate({ renderMode: 'horizontal' })}
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: (selectedSegment.style.renderMode || 'horizontal') === 'horizontal' ? '#007acc' : '#444',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Horizontal
          </button>
          <button
            onClick={() => handleStyleUpdate({ renderMode: 'progressive' })}
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: selectedSegment.style.renderMode === 'progressive' ? '#007acc' : '#444',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Progressive
          </button>
        </div>
        <div style={{ marginTop: '4px', fontSize: '12px', color: '#888' }}>
          {selectedSegment.style.renderMode === 'progressive' 
            ? 'Words appear line-by-line vertically as they are spoken'
            : 'Traditional horizontal layout with word highlighting'
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

      {/* Scale Control */}
      <div style={{ marginBottom: '25px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
          Scale: {Math.round((selectedSegment.style.scale || 1) * 100)}%
        </label>
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.05"
          value={selectedSegment.style.scale || 1}
          onChange={(e) => handleStyleUpdate({ scale: parseFloat(e.target.value) })}
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
          <span>50%</span>
          <span>100%</span>
          <span>200%</span>
        </div>
        <div style={{ marginTop: '4px', fontSize: '12px', color: '#888' }}>
          Resize subtitles proportionally
        </div>
      </div>

      {/* Text Stroke Controls */}
      <div style={{ marginBottom: '25px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
          Text Stroke
        </label>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
          <label style={{ fontSize: '12px', color: '#ccc', minWidth: '60px' }}>Width: {selectedSegment.style.strokeWidth || 0}px</label>
          <input
            type="range"
            min="0"
            max="10"
            step="1"
            value={selectedSegment.style.strokeWidth || 0}
            onChange={(e) => handleStyleUpdate({ strokeWidth: parseInt(e.target.value) })}
            style={{
              flex: 1,
              height: '6px',
              borderRadius: '3px',
              background: '#444',
              outline: 'none',
              appearance: 'none'
            }}
          />
        </div>
        <div style={{ marginBottom: '8px', fontSize: '12px', color: '#ccc' }}>Stroke Color</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {/* Transparent stroke option */}
          <button
            onClick={() => handleStyleUpdate({ strokeColor: 'transparent' })}
            style={{
              width: '30px',
              height: '30px',
              backgroundColor: 'transparent',
              border: (selectedSegment.style.strokeColor || '#000000') === 'transparent' ? '3px solid #007acc' : '1px solid #555',
              borderRadius: '4px',
              cursor: 'pointer',
              position: 'relative',
              backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
              backgroundSize: '8px 8px',
              backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
            }}
            title="No Stroke"
          />
          {Object.values(ColorOption).filter(color => color !== 'transparent').map(color => (
            <button
              key={color}
              onClick={() => handleStyleUpdate({ strokeColor: color })}
              style={{
                width: '30px',
                height: '30px',
                backgroundColor: color,
                border: (selectedSegment.style.strokeColor || '#000000') === color ? '3px solid #007acc' : '1px solid #555',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Text Transform Controls */}
      <div style={{ marginBottom: '25px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
          Text Transform
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {[
            { value: 'none', label: 'None' },
            { value: 'capitalize', label: 'Capitalize' },
            { value: 'uppercase', label: 'UPPERCASE' },
            { value: 'lowercase', label: 'lowercase' }
          ].map(option => (
            <button
              key={option.value}
              onClick={() => handleStyleUpdate({ textTransform: option.value as any })}
              style={{
                padding: '8px 12px',
                backgroundColor: (selectedSegment.style.textTransform || 'none') === option.value ? '#007acc' : '#444',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {option.label}
            </button>
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
            <label style={{ fontSize: '12px', color: '#ccc' }}>X: {selectedSegment.style.position.x}%</label>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={selectedSegment.style.position.x}
              onChange={(e) => handleStyleUpdate({ 
                position: { 
                  ...selectedSegment.style.position, 
                  x: parseInt(e.target.value) 
                }
              })}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: '#444',
                outline: 'none',
                appearance: 'none'
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px', color: '#ccc' }}>Y: {selectedSegment.style.position.y}%</label>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={selectedSegment.style.position.y}
              onChange={(e) => handleStyleUpdate({ 
                position: { 
                  ...selectedSegment.style.position, 
                  y: parseInt(e.target.value) 
                }
              })}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: '#444',
                outline: 'none',
                appearance: 'none'
              }}
            />
          </div>
        </div>
        <div style={{ marginBottom: '8px' }}>
          <label style={{ fontSize: '12px', color: '#ccc' }}>Z Rotation: {selectedSegment.style.position.z || 0}°</label>
          <input
            type="range"
            min="-180"
            max="180"
            step="1"
            value={selectedSegment.style.position.z || 0}
            onChange={(e) => handleStyleUpdate({ 
              position: { 
                ...selectedSegment.style.position, 
                z: parseInt(e.target.value) 
              }
            })}
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              background: '#444',
              outline: 'none',
              appearance: 'none'
            }}
          />
        </div>
        <div style={{ fontSize: '12px', color: '#888' }}>
          Use sliders to position and rotate subtitles
        </div>
      </div>

      {/* Apply to All Section */}
      {onApplyToAll && (
        <div style={{ marginBottom: '25px', paddingTop: '20px', borderTop: `1px solid ${theme.colors.border}` }}>
          <button
            onClick={() => onApplyToAll(selectedSegment.style)}
            style={{
              width: '100%',
              padding: '10px 20px',
              backgroundColor: theme.colors.success,
              color: theme.colors.text,
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            Apply Style to All Subtitles
          </button>
          <div style={{ marginTop: '4px', fontSize: '12px', color: theme.colors.textSecondary, textAlign: 'center' }}>
            This will apply the current style to all subtitle segments
          </div>
        </div>
      )}

      {/* Export Section */}
      {videoFile && captions && captions.length > 0 && (
        <div style={{ 
          marginTop: '30px', 
          paddingTop: '20px', 
          borderTop: `1px solid ${theme.colors.border}` 
        }}>
          <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', fontWeight: 'bold', color: theme.colors.text }}>
            Export Options
          </h4>
          
          {/* SRT Export Button */}
          <button
            onClick={async () => {
              try {
                const result = await window.electronAPI.exportSrt(captions, `${videoFile.name.replace(/\.[^/.]+$/, '')}_subtitles.srt`);
                if (result.success && !result.canceled) {
                  alert(`SRT file exported successfully to: ${result.filePath}`);
                }
              } catch (error) {
                console.error('Failed to export SRT:', error);
                alert('Failed to export SRT file. Please try again.');
              }
            }}
            style={{
              width: '100%',
              padding: '10px 20px',
              backgroundColor: theme.colors.success,
              color: theme.colors.text,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <ExportSrtIcon size={16} />
            Export SRT Subtitles
          </button>
          <div style={{
            marginBottom: '15px',
            fontSize: '12px',
            color: theme.colors.textSecondary,
            textAlign: 'center'
          }}>
            Export subtitles for YouTube uploads
          </div>
          <button
            onClick={() => setShowExportSettings(true)}
            style={{
              width: '100%',
              padding: '12px 24px',
              backgroundColor: theme.colors.primary,
              color: theme.colors.text,
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
            color: theme.colors.textSecondary,
            textAlign: 'center'
          }}>
            This will render your video with burned-in captions
          </div>
        </div>
      )}

      {/* Export Settings Modal */}
      <ExportSettingsModal
        isOpen={showExportSettings}
        onClose={() => setShowExportSettings(false)}
        onConfirm={(settings) => {
          setShowExportSettings(false);
          if (onExport) {
            onExport(settings);
          }
        }}
      />
    </div>
  );
};

export default StylingPanel;