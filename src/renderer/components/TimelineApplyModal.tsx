import React, { useState, useCallback } from 'react';
import { CaptionSegment, CaptionStyle } from '../../types';
import { useTheme } from '../contexts/ThemeContext';
import { FiClock, FiSliders, FiCheck, FiX } from 'react-icons/fi';

interface TimelineApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (startTime: number, endTime: number) => void;
  currentStyle: CaptionStyle;
  captions: CaptionSegment[];
  currentTime?: number;
  selectedSegmentId?: string | null;
}

const TimelineApplyModal: React.FC<TimelineApplyModalProps> = ({
  isOpen,
  onClose,
  onApply,
  currentStyle,
  captions,
  currentTime = 0,
  selectedSegmentId
}) => {
  const { theme } = useTheme();
  
    // Format time as MM:SS.ms
    const formatTime = (ms: number) => {
      const totalSeconds = ms / 1000;
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = Math.floor(totalSeconds % 60);
      const milliseconds = Math.floor((ms % 1000) / 10);
      return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    };

  // Find the selected segment to get default range
  const selectedSegment = captions.find(c => c.id === selectedSegmentId);
  const totalDuration = captions.length > 0 ? Math.max(...captions.map(c => c.endTime)) : 60000;
  
  // Default to selected segment's range, or current time +/- 5 seconds
  const defaultStartTime = selectedSegment?.startTime || Math.max(0, currentTime - 5000);
  const defaultEndTime = selectedSegment?.endTime || Math.min(totalDuration, currentTime + 5000);
  
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [endTime, setEndTime] = useState(defaultEndTime);
  const [startTimeInput, setStartTimeInput] = useState(formatTime(defaultStartTime));
  const [endTimeInput, setEndTimeInput] = useState(formatTime(defaultEndTime));
  const [isEditingStartTime, setIsEditingStartTime] = useState(false);
  const [isEditingEndTime, setIsEditingEndTime] = useState(false);

  // Update times when selectedSegment changes
  React.useEffect(() => {
    if (selectedSegment) {
      const newStartTime = selectedSegment.startTime;
      const newEndTime = selectedSegment.endTime;
      
      setStartTime(newStartTime);
      setEndTime(newEndTime);
      
      if (!isEditingStartTime) {
        setStartTimeInput(formatTime(newStartTime));
      }
      if (!isEditingEndTime) {
        setEndTimeInput(formatTime(newEndTime));
      }
    }
  }, [selectedSegment?.id]); // Only depend on segment ID to avoid infinite loops

  // Update input fields when times change (from slider)
  React.useEffect(() => {
    if (!isEditingStartTime) {
      setStartTimeInput(formatTime(startTime));
    }
  }, [startTime, isEditingStartTime]);

  React.useEffect(() => {
    if (!isEditingEndTime) {
      setEndTimeInput(formatTime(endTime));
    }
  }, [endTime, isEditingEndTime]);

  // Parse time from MM:SS.ms format
  const parseTime = (timeStr: string): number => {
    const parts = timeStr.split(':');
    if (parts.length !== 2) return 0;
    
    const minutes = parseInt(parts[0]) || 0;
    const secondsParts = parts[1].split('.');
    const seconds = parseInt(secondsParts[0]) || 0;
    const milliseconds = secondsParts[1] ? parseInt(secondsParts[1].padEnd(2, '0')) * 10 : 0;
    
    return (minutes * 60 + seconds) * 1000 + milliseconds;
  };

  const handleStartTimeChange = useCallback((value: number) => {
    const newStartTime = Math.max(0, Math.min(value, endTime - 1000)); // Ensure at least 1 second gap
    setStartTime(newStartTime);
  }, [endTime]);

  const handleEndTimeChange = useCallback((value: number) => {
    const newEndTime = Math.min(totalDuration, Math.max(value, startTime + 1000)); // Ensure at least 1 second gap
    setEndTime(newEndTime);
  }, [startTime, totalDuration]);

  const handleStartTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setStartTimeInput(e.target.value);
    
    // Try to parse and update time, but don't force format
    const parsedTime = parseTime(e.target.value);
    if (!isNaN(parsedTime)) {
      handleStartTimeChange(parsedTime);
    }
  };

  const handleEndTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setEndTimeInput(e.target.value);
    
    // Try to parse and update time, but don't force format
    const parsedTime = parseTime(e.target.value);
    if (!isNaN(parsedTime)) {
      handleEndTimeChange(parsedTime);
    }
  };

  const handleStartTimeInputBlur = () => {
    setIsEditingStartTime(false);
    const parsedTime = parseTime(startTimeInput);
    if (!isNaN(parsedTime)) {
      handleStartTimeChange(parsedTime);
      setStartTimeInput(formatTime(parsedTime));
    } else {
      // Reset to current time if invalid
      setStartTimeInput(formatTime(startTime));
    }
  };

  const handleEndTimeInputBlur = () => {
    setIsEditingEndTime(false);
    const parsedTime = parseTime(endTimeInput);
    if (!isNaN(parsedTime)) {
      handleEndTimeChange(parsedTime);
      setEndTimeInput(formatTime(parsedTime));
    } else {
      // Reset to current time if invalid
      setEndTimeInput(formatTime(endTime));
    }
  };

  const handleApply = () => {
    onApply(startTime, endTime);
    onClose();
  };

  // Cleanup mouse events on unmount
  React.useEffect(() => {
    return () => {
      // Remove any lingering event listeners
      document.removeEventListener('mousemove', () => {});
      document.removeEventListener('mouseup', () => {});
    };
  }, []);

  if (!isOpen) return null;

  return (
    <>
      <style>
        {`
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: ${theme.colors.primary};
            cursor: pointer;
            border: none;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
          
          input[type="range"]::-moz-range-thumb {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: ${theme.colors.primary};
            cursor: pointer;
            border: none;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
          
          input[type="range"]::-ms-thumb {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: ${theme.colors.primary};
            cursor: pointer;
            border: none;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
        `}
      </style>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}
        onClick={onClose}
      >
        {/* Modal Content */}
        <div
          style={{
            backgroundColor: theme.colors.modal.background,
            border: `1px solid ${theme.colors.modal.border}`,
            borderRadius: '12px',
            padding: '0',
            width: '420px',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: theme.colors.modal.shadow,
            color: theme.colors.text
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            padding: '16px 20px 12px 20px',
            borderBottom: `1px solid ${theme.colors.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              backgroundColor: theme.colors.primary,
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FiClock size={16} color={theme.colors.primaryForeground} />
            </div>
            <div>
              <h2 style={{
                margin: '0 0 2px 0',
                fontSize: '16px',
                fontWeight: '600',
                color: theme.colors.text
              }}>
                Apply Style to Timeline Range
              </h2>
              <p style={{
                margin: 0,
                fontSize: '12px',
                color: theme.colors.textSecondary
              }}>
                Select the time range to apply the current caption style
              </p>
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: '20px' }}>
            {/* Timeline Range Slider */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  backgroundColor: theme.colors.accent,
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FiSliders size={12} color={theme.colors.accentForeground} />
                </div>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: theme.colors.text }}>
                  Timeline Range
                </h3>
              </div>

              {/* Range Display */}
              <div style={{
                padding: '12px',
                backgroundColor: theme.colors.modal.background,
                borderRadius: theme.radius.lg,
                border: `1px solid ${theme.colors.primary}`,
                marginBottom: '16px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                  color: theme.colors.textSecondary,
                  marginBottom: '8px'
                }}>
                  <span>Start Time</span>
                  <span>End Time</span>
                </div>
                
                {/* Dual Range Slider - Custom implementation */}
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
                  
                  {/* Time interval markers */}
                  {Array.from({ length: 9 }, (_, i) => i + 1).map(marker => (
                    <div
                      key={marker}
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: `${(marker / 10) * 100}%`,
                        width: '1px',
                        height: '10px',
                        backgroundColor: theme.colors.textSecondary,
                        opacity: 0.3,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 1
                      }}
                    />
                  ))}
                  
                  {/* Active track */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: `${(startTime / totalDuration) * 100}%`,
                    width: `${((endTime - startTime) / totalDuration) * 100}%`,
                    height: '6px',
                    backgroundColor: theme.colors.primary,
                    borderRadius: '3px',
                    transform: 'translateY(-50%)',
                    zIndex: 2
                  }} />
                  
                  {/* Clickable track for direct positioning */}
                  <div 
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '40px',
                      cursor: 'pointer',
                      zIndex: 1
                    }}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const percentage = clickX / rect.width;
                      const clickTime = percentage * totalDuration;
                      
                      // If clicking within the active range, move the nearest thumb
                      const isWithinRange = clickTime >= startTime && clickTime <= endTime;
                      
                      if (isWithinRange) {
                        // Calculate distances to both thumbs
                        const distanceToStart = Math.abs(clickTime - startTime);
                        const distanceToEnd = Math.abs(clickTime - endTime);
                        
                        if (distanceToStart < distanceToEnd) {
                          handleStartTimeChange(clickTime);
                        } else {
                          handleEndTimeChange(clickTime);
                        }
                      } else {
                        // If outside range, move the nearest thumb
                        if (clickTime < startTime) {
                          handleStartTimeChange(clickTime);
                        } else {
                          handleEndTimeChange(clickTime);
                        }
                      }
                    }}
                  />
                  
                  {/* Start thumb */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: `${(startTime / totalDuration) * 100}%`,
                      width: '20px',
                      height: '20px',
                      backgroundColor: theme.colors.primary,
                      borderRadius: '50%',
                      border: `3px solid ${theme.colors.background}`,
                      transform: 'translate(-50%, -50%)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      cursor: 'grab',
                      zIndex: 5,
                      transition: 'transform 0.1s ease'
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation(); // Prevent track click
                      
                      const thumb = e.currentTarget as HTMLElement;
                      thumb.style.cursor = 'grabbing';
                      
                      const container = thumb.parentElement;
                      if (!container) return;
                      
                      const containerRect = container.getBoundingClientRect();
                      
                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        const mouseX = moveEvent.clientX - containerRect.left;
                        const percentage = Math.max(0, Math.min(1, mouseX / containerRect.width));
                        const newTime = percentage * totalDuration;
                        handleStartTimeChange(newTime);
                      };
                      
                      const handleMouseUp = () => {
                        thumb.style.cursor = 'grab';
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                      
                      // Ensure cleanup on component unmount
                      return () => {
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
                    }}
                  />
                  
                  {/* End thumb */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: `${(endTime / totalDuration) * 100}%`,
                      width: '20px',
                      height: '20px',
                      backgroundColor: theme.colors.primary,
                      borderRadius: '50%',
                      border: `3px solid ${theme.colors.background}`,
                      transform: 'translate(-50%, -50%)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      cursor: 'grab',
                      zIndex: 4,
                      transition: 'transform 0.1s ease'
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation(); // Prevent track click
                      
                      const thumb = e.currentTarget as HTMLElement;
                      thumb.style.cursor = 'grabbing';
                      
                      const container = thumb.parentElement;
                      if (!container) return;
                      
                      const containerRect = container.getBoundingClientRect();
                      
                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        const mouseX = moveEvent.clientX - containerRect.left;
                        const percentage = Math.max(0, Math.min(1, mouseX / containerRect.width));
                        const newTime = percentage * totalDuration;
                        handleEndTimeChange(newTime);
                      };
                      
                      const handleMouseUp = () => {
                        thumb.style.cursor = 'grab';
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                      
                      // Ensure cleanup on component unmount
                      return () => {
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
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
                  fontWeight: '500',
                  position: 'relative'
                }}>
                  <span>{formatTime(0)}</span>
                  
                  {/* Time interval labels */}
                  {[0.25, 0.5, 0.75].map(fraction => (
                    <span
                      key={fraction}
                      style={{
                        position: 'absolute',
                        left: `${fraction * 100}%`,
                        transform: 'translateX(-50%)',
                        fontSize: '9px',
                        opacity: 0.6
                      }}
                    >
                      {formatTime(fraction * totalDuration)}
                    </span>
                  ))}
                  
                  <span>{formatTime(totalDuration)}</span>
                </div>
              </div>
            </div>

            {/* Time Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{
                  fontSize: '12px',
                  fontWeight: '500',
                  color: theme.colors.text,
                  marginBottom: '6px',
                  display: 'block'
                }}>
                  Start Time
                </label>
                <input
                  type="text"
                  value={startTimeInput}
                  onChange={handleStartTimeInputChange}
                  onKeyDown={(e) => {
                    // Prevent global keyboard shortcuts
                    e.stopPropagation();
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                  }}
                  onKeyUp={(e) => e.stopPropagation()}
                  onFocus={() => setIsEditingStartTime(true)}
                  onBlur={(e) => {
                    handleStartTimeInputBlur();
                    e.currentTarget.style.borderColor = theme.colors.primary;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  placeholder="MM:SS.ms"
                  style={{
                    width: '120px',
                    padding: '6px 10px',
                    backgroundColor: theme.colors.modal.background,
                    color: theme.colors.text,
                    border: `1px solid ${theme.colors.primary}`,
                    borderRadius: theme.radius.md,
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    textAlign: 'center'
                  }}
                  onFocusCapture={(e) => {
                    e.currentTarget.style.borderColor = theme.colors.borderFocus;
                    e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.primary}20`;
                  }}
                />
              </div>

              <div>
                <label style={{
                  fontSize: '12px',
                  fontWeight: '500',
                  color: theme.colors.text,
                  marginBottom: '6px',
                  display: 'block'
                }}>
                  End Time
                </label>
                <input
                  type="text"
                  value={endTimeInput}
                  onChange={handleEndTimeInputChange}
                  onKeyDown={(e) => {
                    // Prevent global keyboard shortcuts
                    e.stopPropagation();
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                  }}
                  onKeyUp={(e) => e.stopPropagation()}
                  onFocus={() => setIsEditingEndTime(true)}
                  onBlur={(e) => {
                    handleEndTimeInputBlur();
                    e.currentTarget.style.borderColor = theme.colors.primary;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  placeholder="MM:SS.ms"
                  style={{
                    width: '120px',
                    padding: '6px 10px',
                    backgroundColor: theme.colors.modal.background,
                    color: theme.colors.text,
                    border: `1px solid ${theme.colors.primary}`,
                    borderRadius: theme.radius.md,
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    textAlign: 'center'
                  }}
                  onFocusCapture={(e) => {
                    e.currentTarget.style.borderColor = theme.colors.borderFocus;
                    e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.primary}20`;
                  }}
                />
              </div>
            </div>

            {/* Info */}
            <div style={{
              padding: '12px',
              backgroundColor: theme.colors.primarySubtle,
              borderRadius: theme.radius.md,
              border: `1px solid ${theme.colors.primary}20`,
              marginBottom: '20px'
            }}>
              <p style={{
                margin: 0,
                fontSize: '11px',
                color: theme.colors.primary,
                fontWeight: '500'
              }}>
                💡 This will apply the current caption style to all segments within the selected time range ({formatTime(endTime - startTime)} duration)
              </p>
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
                  backgroundColor: 'transparent',
                  color: theme.colors.text,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radius.md,
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <FiX size={14} />
                Cancel
              </button>
              <button
                onClick={handleApply}
                style={{
                  padding: '10px 20px',
                  backgroundColor: theme.colors.primary,
                  color: theme.colors.primaryForeground,
                  border: `1px solid ${theme.colors.primary}`,
                  borderRadius: theme.radius.md,
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.primaryHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.primary;
                }}
              >
                <FiCheck size={14} />
                Apply to Timeline
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TimelineApplyModal;