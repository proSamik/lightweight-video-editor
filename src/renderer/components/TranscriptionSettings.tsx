import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { LiquidModal } from './ui';
import { SettingsIcon } from './IconComponents';

interface TranscriptionSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (settings: { maxCharsPerLine: number; maxWordsPerLine: number; whisperModel: string; language: string }) => void;
  videoDuration?: number;
  videoMetadata?: { width?: number; height?: number };
}

const TranscriptionSettings: React.FC<TranscriptionSettingsProps> = ({
  isOpen,
  onClose,
  onConfirm,
  videoDuration = 0,
  videoMetadata
}) => {
  const { theme } = useTheme();
  
  // State for transcription settings
  const [maxCharsPerLine, setMaxCharsPerLine] = useState(16);
  const [maxWordsPerLine, setMaxWordsPerLine] = useState(5);
  const [whisperModel, setWhisperModel] = useState('base');
  const [language, setLanguage] = useState('auto');

  // Update defaults when video metadata changes
  useEffect(() => {
    if (videoMetadata?.width && videoMetadata?.height) {
      const isVertical = (videoMetadata.height / videoMetadata.width) > 1.5;
      
      // Set defaults based on video aspect ratio
      setMaxCharsPerLine(isVertical ? 12 : 16);
      setMaxWordsPerLine(isVertical ? 2 : 5);
    }
  }, [videoMetadata]);

  const whisperModels = [
    { value: 'tiny', label: 'Tiny' },
    { value: 'base', label: 'Base' },
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' }
  ];

  const supportedLanguages = [
    { value: 'auto', label: 'Auto Detect' },
    { value: 'en', label: 'English' },
    { value: 'fr', label: 'French' },
    { value: 'es', label: 'Spanish' },
    { value: 'de', label: 'German' },
    { value: 'it', label: 'Italian' },
    { value: 'pt', label: 'Portuguese' },
    { value: 'ru', label: 'Russian' },
    { value: 'ja', label: 'Japanese' },
    { value: 'ko', label: 'Korean' },
    { value: 'zh', label: 'Chinese' },
    { value: 'ar', label: 'Arabic' },
    { value: 'hi', label: 'Hindi' },
    { value: 'bn', label: 'Bengali' },
    { value: 'tr', label: 'Turkish' },
    { value: 'pl', label: 'Polish' },
    { value: 'nl', label: 'Dutch' },
    { value: 'sv', label: 'Swedish' },
    { value: 'da', label: 'Danish' },
    { value: 'no', label: 'Norwegian' },
    { value: 'fi', label: 'Finnish' }
  ];

  const getEstimatedTime = (model: string, duration: number) => {
    if (!duration) return 'Unknown';
    
    const durationMinutes = duration / 60;
    let multiplier = 1;
    
    switch (model) {
      case 'tiny': multiplier = 0.1; break;
      case 'base': multiplier = 0.2; break;
      case 'small': multiplier = 0.4; break;
      case 'medium': multiplier = 0.7; break;
      case 'large': multiplier = 1.0; break;
    }
    
    const estimatedMinutes = durationMinutes * multiplier;
    if (estimatedMinutes < 1) {
      return `~${Math.ceil(estimatedMinutes * 60)}s`;
    } else {
      return `~${Math.ceil(estimatedMinutes)}m`;
    }
  };

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
    
    onConfirm({ maxCharsPerLine, maxWordsPerLine, whisperModel, language });
    onClose();
  };

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
    <LiquidModal
      isOpen={isOpen}
      onClose={onClose}
      title="Transcription Settings"
      subtitle="Configure how your video will be transcribed"
      icon={<SettingsIcon size={24} />}
      maxWidth="500px"
    >
      <div style={{ padding: '20px' }}>
        {/* Whisper Model Selection */}
                  <div style={{ marginBottom: '24px' }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: '600',
            color: theme.colors.text
          }}>
            Whisper Model
          </h3>
          <p style={{
            margin: '0 0 16px 0',
            fontSize: '14px',
            color: theme.colors.textSecondary,
            lineHeight: '1.5'
          }}>
            Choose the Whisper model for transcription. Larger models are more accurate but take longer to process.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '8px'
          }}>
            {whisperModels.map((model) => (
              <button
                key={model.value}
                onClick={() => setWhisperModel(model.value)}
                style={{
                  padding: '12px 16px',
                  backgroundColor: whisperModel === model.value 
                    ? theme.colors.primary 
                    : theme.colors.surface,
                  color: whisperModel === model.value 
                    ? theme.colors.primaryForeground 
                    : theme.colors.text,
                  border: `1px solid ${whisperModel === model.value 
                    ? theme.colors.primary 
                    : theme.colors.border}`,
                  borderRadius: theme.radius.md,
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onMouseEnter={(e) => {
                  if (whisperModel !== model.value) {
                    e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
                  }
                }}
                onMouseLeave={(e) => {
                  if (whisperModel !== model.value) {
                    e.currentTarget.style.backgroundColor = theme.colors.surface;
                  }
                }}
              >
                <span style={{ fontWeight: '600' }}>{model.label}</span>
                <span style={{ 
                  fontSize: '12px', 
                  opacity: 0.8,
                  textAlign: 'center'
                }}>
                  {getEstimatedTime(model.value, videoDuration)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Language Selection */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: '600',
            color: theme.colors.text
          }}>
            Language
          </h3>
          <p style={{
            margin: '0 0 16px 0',
            fontSize: '14px',
            color: theme.colors.textSecondary,
            lineHeight: '1.5'
          }}>
            Select the language for transcription. Auto-detect will identify the language automatically.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '8px',
            maxHeight: '200px',
            overflowY: 'auto',
            padding: '8px',
            backgroundColor: theme.colors.modal.background,
            borderRadius: theme.radius.lg,
            border: `1px solid ${theme.colors.border}`
          }}>
            {supportedLanguages.map((lang) => (
              <button
                key={lang.value}
                onClick={() => setLanguage(lang.value)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: language === lang.value 
                    ? theme.colors.primary 
                    : theme.colors.surface,
                  color: language === lang.value 
                    ? theme.colors.primaryForeground 
                    : theme.colors.text,
                  border: `1px solid ${language === lang.value 
                    ? theme.colors.primary 
                    : theme.colors.border}`,
                  borderRadius: theme.radius.sm,
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  textAlign: 'center',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  if (language !== lang.value) {
                    e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
                  }
                }}
                onMouseLeave={(e) => {
                  if (language !== lang.value) {
                    e.currentTarget.style.backgroundColor = theme.colors.surface;
                  }
                }}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Text Formatting Settings */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: '600',
            color: theme.colors.text
          }}>
            Text Formatting
          </h3>
          <p style={{
            margin: '0 0 16px 0',
            fontSize: '14px',
            color: theme.colors.textSecondary,
            lineHeight: '1.5'
          }}>
            Configure how the transcribed text will be formatted for captions.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Max Characters Per Line */}
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <label style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: theme.colors.text
                }}>
                  Max Characters Per Line
                </label>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: theme.colors.text
                }}>
                  {maxCharsPerLine}
                </span>
              </div>
                             <div style={{
                 padding: '12px',
                 backgroundColor: theme.colors.modal.background,
                 borderRadius: theme.radius.lg,
                 border: `1px solid ${theme.colors.border}`
               }}>
                 <input
                   type="range"
                   min="12"
                   max="50"
                   step="1"
                   value={maxCharsPerLine}
                   onChange={(e) => setMaxCharsPerLine(parseInt(e.target.value))}
                   style={{
                     width: '100%',
                     height: '6px',
                     borderRadius: '3px',
                     background: `linear-gradient(to right, ${theme.colors.primary} 0%, ${theme.colors.primary} ${((maxCharsPerLine - 12) / (50 - 12)) * 100}%, ${theme.colors.border} ${((maxCharsPerLine - 12) / (50 - 12)) * 100}%, ${theme.colors.border} 100%)`,
                     outline: 'none',
                     appearance: 'none',
                     cursor: 'pointer',
                     WebkitAppearance: 'none',
                     MozAppearance: 'none'
                   }}
                 />
                 <div style={{
                   display: 'flex',
                   justifyContent: 'space-between',
                   marginTop: '8px',
                   fontSize: '12px',
                   color: theme.colors.textSecondary,
                   fontWeight: '500'
                 }}>
                   <span>12</span>
                   <span>50</span>
                 </div>
               </div>
            </div>

            {/* Max Words Per Line */}
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <label style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: theme.colors.text
                }}>
                  Max Words Per Line
                </label>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: theme.colors.text
                }}>
                  {maxWordsPerLine}
                </span>
              </div>
                             <div style={{
                 padding: '12px',
                 backgroundColor: theme.colors.modal.background,
                 borderRadius: theme.radius.lg,
                 border: `1px solid ${theme.colors.border}`
               }}>
                 <input
                   type="range"
                   min="1"
                   max="10"
                   step="1"
                   value={maxWordsPerLine}
                   onChange={(e) => setMaxWordsPerLine(parseInt(e.target.value))}
                   style={{
                     width: '100%',
                     height: '6px',
                     borderRadius: '3px',
                     background: `linear-gradient(to right, ${theme.colors.primary} 0%, ${theme.colors.primary} ${((maxWordsPerLine - 1) / (10 - 1)) * 100}%, ${theme.colors.border} ${((maxWordsPerLine - 1) / (10 - 1)) * 100}%, ${theme.colors.border} 100%)`,
                     outline: 'none',
                     appearance: 'none',
                     cursor: 'pointer'
                   }}
                 />
                 <div style={{
                   display: 'flex',
                   justifyContent: 'space-between',
                   marginTop: '8px',
                   fontSize: '12px',
                   color: theme.colors.textSecondary,
                   fontWeight: '500'
                 }}>
                   <span>1</span>
                   <span>10</span>
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          borderTop: `1px solid ${theme.colors.border}`,
          paddingTop: '24px'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              backgroundColor: 'transparent',
              color: theme.colors.text,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.radius.md,
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            style={{
              padding: '12px 24px',
              backgroundColor: theme.colors.primary,
              color: theme.colors.primaryForeground,
              border: `1px solid ${theme.colors.primary}`,
              borderRadius: theme.radius.md,
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.primaryHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.primary;
            }}
          >
            Start Transcription
          </button>
        </div>
      </div>
    </LiquidModal>
    </>
  );
};

export default TranscriptionSettings; 