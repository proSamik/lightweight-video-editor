import React, { useState, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { CaptionPreset, SubtitleStyle } from '../../../types';
import { presetCategories } from '../../data/captionPresets';
import { PresetPreview } from '../PresetPreview';
import { FiSearch, FiFilter } from 'react-icons/fi';

interface PresetSelectorProps {
  selectedPresetId?: string;
  onPresetSelect: (preset: CaptionPreset) => void;
  onStyleUpdate: (style: Partial<SubtitleStyle>) => void;
  onApplyToAll?: (style: Partial<SubtitleStyle>) => void;
  selectedFrameText?: string;
}

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  selectedPresetId,
  onPresetSelect,
  onStyleUpdate,
  onApplyToAll,
  selectedFrameText
}) => {
  const { theme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  
  // Filter state - all categories enabled by default
  const [categoryFilters, setCategoryFilters] = useState(() => {
    const initialFilters: Record<string, boolean> = {};
    presetCategories.forEach(category => {
      initialFilters[category.id] = true;
    });
    return initialFilters;
  });

  // Get all presets from enabled categories
  const filteredPresets = useMemo(() => {
    return presetCategories
      .filter(category => categoryFilters[category.id])
      .flatMap(category => category.presets)
      .filter(preset => 
        preset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        preset.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (preset.tags || []).some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
  }, [categoryFilters, searchTerm]);

  // Pagination for 6 cards per page (single row layout)
  const presetsPerPage = 6;
  const totalPages = Math.ceil(filteredPresets.length / presetsPerPage);
  const currentPresets = filteredPresets.slice(currentPage * presetsPerPage, (currentPage + 1) * presetsPerPage);

  const handlePresetSelect = (preset: CaptionPreset) => {
    onPresetSelect(preset);
    const { animation, ...styleWithoutAnimation } = preset.style;
    onStyleUpdate(styleWithoutAnimation);
  };

  const toggleCategoryFilter = (categoryId: string) => {
    setCategoryFilters(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
    setCurrentPage(0); // Reset to first page when changing filters
  };

  // Create a live preview component that mimics the actual video rendering
  const LivePresetPreview: React.FC<{ preset: CaptionPreset; text: string; isSelected: boolean; onClick: () => void }> = ({ 
    preset, 
    text, 
    isSelected, 
    onClick 
  }) => {
    const words = text.split(' ');
    const [currentWordIndex, setCurrentWordIndex] = React.useState(0);
    const [animationActive, setAnimationActive] = React.useState(false);
    
    // Auto-cycle through words for preview
    React.useEffect(() => {
      if (!animationActive) {
        const startDelay = setTimeout(() => setAnimationActive(true), 500);
        return () => clearTimeout(startDelay);
      }
      
      const interval = setInterval(() => {
        setCurrentWordIndex(prev => (prev + 1) % words.length);
      }, 800);
      
      return () => clearInterval(interval);
    }, [words.length, animationActive]);
    
    // Dynamic font size based on render mode and text length
    const getPreviewFontSize = () => {
      const containerWidth = 320; // card width with padding
      const textLength = text.length;
      const isProgressive = preset.style.renderMode === 'progressive';
      
      let baseSize;
      if (isProgressive) {
        // For progressive mode, size based on number of words
        const wordCount = text.split(' ').length;
        baseSize = Math.min(16, Math.max(10, 120 / wordCount));
      } else {
        // For horizontal mode, size based on text length
        baseSize = Math.min(14, Math.max(8, 280 / (textLength * 0.4)));
      }
      
      return baseSize;
    };
    
    const fontSize = getPreviewFontSize();
    const isProgressive = preset.style.renderMode === 'progressive';
    
    return (
      <div 
        style={{ 
          position: 'relative',
          width: '100%',
          height: '120px',
          cursor: 'pointer'
        }}
        onClick={onClick}
      >
        <div style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#ffffff',
          border: isSelected 
            ? `2px solid ${theme.colors.primary}` 
            : `1px solid ${theme.colors.border}`,
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          transition: 'all 0.2s ease',
          position: 'relative',
          padding: '12px'
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.borderColor = theme.colors.primary;
            e.currentTarget.style.transform = 'scale(1.02)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.borderColor = theme.colors.border;
            e.currentTarget.style.transform = 'scale(1)';
          }
        }}
        >
          {/* Live Text Preview */}
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: isProgressive ? 'column' : 'row',
            flexWrap: 'nowrap',
            gap: isProgressive ? '1px' : '3px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {isProgressive ? (
              // Progressive mode - show words vertically one by one
              words.slice(0, currentWordIndex + 1).map((word, index) => (
                <div
                  key={index}
                  style={{
                    fontFamily: preset.style.font || 'Poppins',
                    fontSize: `${fontSize}px`,
                    fontWeight: 'bold',
                    color: index === currentWordIndex ? 
                      (preset.style.emphasizeMode ? 
                        preset.style.highlighterColor || '#00ff00' : 
                        preset.style.textColor || '#ffffff'
                      ) : 
                      preset.style.textColor || '#ffffff',
                    textTransform: preset.style.textTransform || 'none',
                    textShadow: preset.style.strokeWidth ? 
                      `0 0 ${preset.style.strokeWidth}px ${preset.style.strokeColor || '#000000'}` : 
                      '1px 1px 2px rgba(0, 0, 0, 0.8)',
                    lineHeight: '1.1',
                    textAlign: 'center',
                    backgroundColor: index === currentWordIndex && !preset.style.emphasizeMode ? 
                      preset.style.highlighterColor || '#00ff00' : 'transparent',
                    padding: index === currentWordIndex && !preset.style.emphasizeMode ? '2px 4px' : '0',
                    borderRadius: '4px',
                    transition: 'all 0.3s ease',
                    transform: index === currentWordIndex ? 'scale(1.05)' : 'scale(1)',
                    opacity: index <= currentWordIndex ? 1 : 0.3
                  }}
                >
                  {word}
                </div>
              ))
            ) : (
              // Horizontal mode - show all words in a line with current word highlighted
              <div style={{
                display: 'flex',
                flexWrap: 'nowrap',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                maxWidth: '100%',
                overflow: 'hidden'
              }}>
                {words.map((word, index) => {
                  const isCurrentWord = index === currentWordIndex;
                  return (
                    <span
                      key={index}
                      style={{
                        fontFamily: preset.style.font || 'Poppins',
                        fontSize: `${fontSize}px`,
                        fontWeight: 'bold',
                        color: isCurrentWord ? 
                          (preset.style.emphasizeMode ? 
                            preset.style.highlighterColor || '#00ff00' : 
                            preset.style.textColor || '#ffffff'
                          ) : 
                          preset.style.textColor || '#ffffff',
                        textTransform: preset.style.textTransform || 'none',
                        textShadow: preset.style.strokeWidth ? 
                          `0 0 ${preset.style.strokeWidth}px ${preset.style.strokeColor || '#000000'}` : 
                          '1px 1px 2px rgba(0, 0, 0, 0.8)',
                        backgroundColor: isCurrentWord && !preset.style.emphasizeMode ? 
                          preset.style.highlighterColor || '#00ff00' : 'transparent',
                        padding: isCurrentWord && !preset.style.emphasizeMode ? '2px 4px' : '0',
                        borderRadius: '4px',
                        transition: 'all 0.3s ease',
                        transform: isCurrentWord ? 
                          (preset.style.emphasizeMode ? 'scale(1.05)' : 'scale(1)') : 'scale(1)',
                        whiteSpace: 'nowrap',
                        maxWidth: 'fit-content'
                      }}
                    >
                      {word}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selection Indicator */}
          {isSelected && (
            <div style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              width: '16px',
              height: '16px',
              backgroundColor: theme.colors.primary,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                backgroundColor: theme.colors.primaryForeground,
                borderRadius: '50%'
              }} />
            </div>
          )}

          {/* Popularity Badge */}
          {preset.popularity && preset.popularity > 80 && (
            <div style={{
              position: 'absolute',
              top: '4px',
              left: '4px',
              backgroundColor: theme.colors.warning,
              color: 'white',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '8px',
              fontWeight: '600',
              textTransform: 'uppercase'
            }}>
              HOT
            </div>
          )}
        </div>

        {/* Preset Name */}
        <div style={{
          position: 'absolute',
          bottom: '-16px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '10px',
          color: theme.colors.textSecondary,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          fontWeight: '500',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {preset.name}
        </div>
      </div>
    );
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '12px',
      padding: '12px 16px',
      backgroundColor: theme.colors.surface,
      overflow: 'hidden'
    }}>
      {/* Search */}
      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute',
          left: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: theme.colors.textSecondary,
          pointerEvents: 'none'
        }}>
          <FiSearch size={14} />
        </div>
        <input
          type="text"
          placeholder="Search presets..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(0);
          }}
          style={{
            width: '100%',
            padding: '10px 12px 10px 40px',
            backgroundColor: theme.colors.background,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: '8px',
            fontSize: '11px',
            color: theme.colors.text,
            outline: 'none',
            transition: 'border-color 0.2s ease'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = theme.colors.primary;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = theme.colors.border;
          }}
        />
      </div>

      {/* Category Filters */}

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px'
      }}>
        {presetCategories.map((category) => (
          <label
            key={category.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              backgroundColor: categoryFilters[category.id] ? theme.colors.primary : theme.colors.background,
              color: categoryFilters[category.id] ? theme.colors.primaryForeground : theme.colors.text,
              border: `1px solid ${categoryFilters[category.id] ? theme.colors.primary : theme.colors.border}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              userSelect: 'none'
            }}
            onMouseEnter={(e) => {
              if (!categoryFilters[category.id]) {
                e.currentTarget.style.backgroundColor = theme.colors.surfaceHover || theme.colors.background;
              }
            }}
            onMouseLeave={(e) => {
              if (!categoryFilters[category.id]) {
                e.currentTarget.style.backgroundColor = theme.colors.background;
              }
            }}
          >
            <input
              type="checkbox"
              checked={categoryFilters[category.id]}
              onChange={() => toggleCategoryFilter(category.id)}
              style={{
                width: '12px',
                height: '12px',
                accentColor: theme.colors.primary,
                margin: 0
              }}
            />
            {category.name} ({category.presets.length})
          </label>
        ))}
      </div>

      {/* Presets List - Single Row Layout */}
      {currentPresets.length > 0 && (
        <div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            width: '100%'
          }}>
            {currentPresets.map((preset) => (
              <LivePresetPreview
                key={preset.id}
                preset={preset}
                text={selectedFrameText || 'Every SaaS founder faces is'}
                isSelected={selectedPresetId === preset.id}
                onClick={() => handlePresetSelect(preset)}
              />
            ))}
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '12px',
              marginTop: '24px'
            }}>
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                style={{
                  padding: '8px 12px',
                  backgroundColor: currentPage === 0 ? theme.colors.background : theme.colors.primary,
                  color: currentPage === 0 ? theme.colors.textSecondary : theme.colors.primaryForeground,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: '8px',
                  cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '10px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Previous
              </button>
              
              <span style={{
                fontSize: '10px',
                color: theme.colors.textSecondary,
                fontWeight: '500'
              }}>
                {currentPage + 1} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage === totalPages - 1}
                style={{
                  padding: '8px 12px',
                  backgroundColor: currentPage === totalPages - 1 ? theme.colors.background : theme.colors.primary,
                  color: currentPage === totalPages - 1 ? theme.colors.textSecondary : theme.colors.primaryForeground,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: '8px',
                  cursor: currentPage === totalPages - 1 ? 'not-allowed' : 'pointer',
                  fontSize: '10px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Next
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      )}

      {/* No Results */}
      {filteredPresets.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: theme.colors.textSecondary
        }}>
          <div style={{
            marginBottom: '16px',
            opacity: 0.5,
            display: 'flex',
            justifyContent: 'center'
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
              <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h4 style={{
            margin: '0 0 8px 0',
            fontSize: '13px',
            fontWeight: '600',
            color: theme.colors.text
          }}>
            No presets found
          </h4>
          <p style={{
            margin: 0,
            fontSize: '10px',
            color: theme.colors.textSecondary
          }}>
            Try adjusting your search term or enabling more category filters
          </p>
        </div>
      )}
    </div>
  );
};

export default PresetSelector;