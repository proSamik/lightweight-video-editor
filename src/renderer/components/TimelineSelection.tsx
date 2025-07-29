import React, { useState, useEffect } from 'react';
import { TimelineSelection } from '../../types';

interface TimelineSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selections: TimelineSelection[]) => void;
  videoDuration: number; // in seconds
}

const TimelineSelectionModal: React.FC<TimelineSelectionProps> = ({
  isOpen,
  onClose,
  onConfirm,
  videoDuration
}) => {
  const [selections, setSelections] = useState<TimelineSelection[]>([]);
  const [currentSelection, setCurrentSelection] = useState<{ start: number; end: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    // Initialize with full video selected when modal opens
    if (isOpen && videoDuration > 0) {
      setSelections([{
        startTime: 0,
        endTime: videoDuration * 1000, // Convert to milliseconds
        selected: true
      }]);
    }
    
    // Clear selections when modal closes
    if (!isOpen) {
      setSelections([]);
      setCurrentSelection(null);
    }
  }, [isOpen, videoDuration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const timeInSeconds = percentage * videoDuration;
    
    if (!isDragging && !currentSelection) {
      // Start new selection
      setCurrentSelection({ start: timeInSeconds, end: timeInSeconds });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (currentSelection) {
      const rect = e.currentTarget.getBoundingClientRect();
      const moveX = e.clientX - rect.left;
      const percentage = moveX / rect.width;
      const timeInSeconds = Math.max(0, Math.min(videoDuration, percentage * videoDuration));
      
      setCurrentSelection({
        start: Math.min(currentSelection.start, timeInSeconds),
        end: Math.max(currentSelection.start, timeInSeconds)
      });
    }
  };

  const handleMouseUp = () => {
    if (currentSelection && Math.abs(currentSelection.end - currentSelection.start) > 1) {
      // Add selection if it's meaningful (> 1 second)
      const newSelection: TimelineSelection = {
        startTime: currentSelection.start * 1000, // Convert to milliseconds
        endTime: currentSelection.end * 1000,
        selected: true
      };
      
      setSelections(prev => [...prev, newSelection]);
    }
    setCurrentSelection(null);
    setIsDragging(false);
  };

  const removeSelection = (index: number) => {
    setSelections(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllSelections = () => {
    setSelections([]);
  };

  const selectAll = () => {
    setSelections([{
      startTime: 0,
      endTime: videoDuration * 1000,
      selected: true
    }]);
  };

  const handleConfirm = () => {
    console.log('=== TIMELINE SELECTION DEBUG ===');
    console.log('handleConfirm called');
    console.log('selections:', selections);
    console.log('videoDuration:', videoDuration);
    console.log('onConfirm function:', onConfirm);
    
    if (selections.length === 0) {
      // If no selections, transcribe the whole video
      const fallbackSelection = [{
        startTime: 0,
        endTime: videoDuration * 1000,
        selected: true
      }];
      console.log('No selections, using fallback:', fallbackSelection);
      onConfirm(fallbackSelection);
    } else {
      console.log('Using existing selections:', selections);
      onConfirm(selections);
    }
    console.log('=== END TIMELINE SELECTION DEBUG ===');
  };

  if (!isOpen) return null;

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
        borderRadius: '8px',
        padding: '24px',
        minWidth: '600px',
        maxWidth: '800px',
        border: '1px solid #444',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>
            Select Timeline Segments for Transcription
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

        <div style={{ marginBottom: '20px', fontSize: '14px', color: '#ccc' }}>
          Click and drag on the timeline below to select segments for transcription. Only selected segments will be processed.
        </div>

        {/* Timeline Visualization */}
        <div style={{
          height: '60px',
          backgroundColor: '#333',
          borderRadius: '4px',
          position: 'relative',
          cursor: 'crosshair',
          marginBottom: '20px',
          border: '1px solid #555'
        }}
        onClick={handleTimelineClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        >
          {/* Time markers */}
          {Array.from({ length: 11 }, (_, i) => {
            const time = (i / 10) * videoDuration;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${i * 10}%`,
                  top: '5px',
                  fontSize: '10px',
                  color: '#888',
                  whiteSpace: 'nowrap',
                  transform: 'translateX(-50%)'
                }}
              >
                {formatTime(time)}
              </div>
            );
          })}

          {/* Existing selections */}
          {selections.map((selection, index) => (
            <div
              key={index}
              style={{
                position: 'absolute',
                left: `${(selection.startTime / 1000 / videoDuration) * 100}%`,
                width: `${((selection.endTime - selection.startTime) / 1000 / videoDuration) * 100}%`,
                top: '25px',
                height: '30px',
                backgroundColor: 'rgba(0, 122, 204, 0.6)',
                border: '2px solid #007acc',
                borderRadius: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                color: '#fff',
                cursor: 'pointer'
              }}
              title={`${formatTime(selection.startTime / 1000)} - ${formatTime(selection.endTime / 1000)}`}
              onClick={(e) => {
                e.stopPropagation();
                removeSelection(index);
              }}
            >
              ✕
            </div>
          ))}

          {/* Current selection preview */}
          {currentSelection && (
            <div
              style={{
                position: 'absolute',
                left: `${(currentSelection.start / videoDuration) * 100}%`,
                width: `${Math.abs(currentSelection.end - currentSelection.start) / videoDuration * 100}%`,
                top: '25px',
                height: '30px',
                backgroundColor: 'rgba(255, 255, 0, 0.3)',
                border: '2px dashed #ffff00',
                borderRadius: '2px'
              }}
            />
          )}
        </div>

        {/* Selection List */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '10px' }}>
            Selected Segments ({selections.length})
          </h3>
          {selections.length === 0 ? (
            <div style={{ 
              padding: '20px', 
              textAlign: 'center', 
              color: '#666',
              backgroundColor: '#1a1a1a',
              borderRadius: '4px',
              border: '1px dashed #444'
            }}>
              No segments selected. Click and drag on the timeline to select segments.
            </div>
          ) : (
            <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
              {selections.map((selection, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    backgroundColor: '#333',
                    marginBottom: '4px',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                >
                  <span>
                    Segment {index + 1}: {formatTime(selection.startTime / 1000)} - {formatTime(selection.endTime / 1000)}
                    {' '}({Math.round((selection.endTime - selection.startTime) / 1000)}s)
                  </span>
                  <button
                    onClick={() => removeSelection(index)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ff6b6b',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={selectAll}
            style={{
              padding: '8px 16px',
              backgroundColor: '#444',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Select All
          </button>
          <button
            onClick={clearAllSelections}
            style={{
              padding: '8px 16px',
              backgroundColor: '#444',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Clear All
          </button>
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
              backgroundColor: '#007acc',
              color: '#fff',
              border: '1px solid #0066a3',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            Transcribe Selected Segments
          </button>
        </div>

        <div style={{
          marginTop: '16px',
          fontSize: '11px',
          color: '#666',
          borderTop: '1px solid #444',
          paddingTop: '12px'
        }}>
          <strong>Tips:</strong> Click and drag to select segments. Click on a segment to remove it. 
          If no segments are selected, the entire video will be transcribed.
        </div>
      </div>
    </div>
  );
};

export default TimelineSelectionModal;