import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { CaptionPreset, SubtitleStyle } from '../../../types';
import { presetCategories } from '../../data/captionPresets';
import { PresetPreview } from '../PresetPreview';
import { FiSearch, FiGrid, FiCheck } from 'react-icons/fi';

interface PresetSelectorProps {
  selectedPresetId?: string;
  onPresetSelect: (preset: CaptionPreset) => void;
  onStyleUpdate: (style: Partial<SubtitleStyle>) => void;
  onApplyToAll?: (style: Partial<SubtitleStyle>) => void;
  selectedFrameText?: string; // Add prop for the actual selected text
}

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  selectedPresetId,
  onPresetSelect,
  onStyleUpdate,
  onApplyToAll,
  selectedFrameText
}) => {
  const { theme } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState('modern');
  const [searchTerm, setSearchTerm] = useState('');
  const [applyToAll, setApplyToAll] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  // Filter presets based on search term
  const filteredCategories = presetCategories.map(category => ({
    ...category,
    presets: category.presets.filter(preset => 
      preset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      preset.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (preset.tags || []).some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  })).filter(category => category.presets.length > 0);

  const selectedCategoryData = filteredCategories.find(cat => cat.id === selectedCategory) || filteredCategories[0];
  
  // Pagination for single column list
  const presetsPerPage = 3;
  const totalPages = selectedCategoryData ? Math.ceil(selectedCategoryData.presets.length / presetsPerPage) : 0;
  const currentPresets = selectedCategoryData ? selectedCategoryData.presets.slice(currentPage * presetsPerPage, (currentPage + 1) * presetsPerPage) : [];

  const handlePresetSelect = (preset: CaptionPreset) => {
    onPresetSelect(preset);
    // Apply the preset style immediately
    const { animation, ...styleWithoutAnimation } = preset.style;
    
    if (applyToAll && onApplyToAll) {
      onApplyToAll(styleWithoutAnimation);
    } else {
      onStyleUpdate(styleWithoutAnimation);
    }
  };

  const categoryButtonStyles = (isSelected: boolean): React.CSSProperties => ({
    padding: '10px 12px',
    backgroundColor: isSelected ? theme.colors.primary : theme.colors.background,
    color: isSelected ? theme.colors.primaryForeground : theme.colors.text,
    border: `1px solid ${isSelected ? theme.colors.primary : theme.colors.border}`,
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '10px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap'
  });

  const searchInputStyles: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: theme.colors.background,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: '8px',
    fontSize: '11px',
    color: theme.colors.text,
    outline: 'none',
    transition: 'border-color 0.2s ease'
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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <div style={{
          width: '24px',
          height: '24px',
          backgroundColor: theme.colors.accent,
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <FiGrid size={12} color={theme.colors.accentForeground} />
        </div>
        <div>
          <h3 style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: '600',
            color: theme.colors.text,
            letterSpacing: '0.01em'
          }}>
            Style Presets
          </h3>
        </div>
      </div>
      <p style={{
        margin: '0 0 12px 0',
        fontSize: '10px',
        color: theme.colors.textSecondary,
        lineHeight: '1.4'
      }}>
        Choose from trending animated caption styles or customize your own
      </p>


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
            setCurrentPage(0); // Reset to first page when searching
          }}
          style={{
            ...searchInputStyles,
            paddingLeft: '40px',
            fontSize: '11px',
            padding: '10px 12px 10px 40px',
            backgroundColor: theme.colors.background,
            borderRadius: '8px'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = theme.colors.primary;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = theme.colors.border;
          }}
        />
      </div>

      {/* Category Tabs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '6px'
      }}>
        {filteredCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => {
              setSelectedCategory(category.id);
              setCurrentPage(0); // Reset to first page when changing category
            }}
            style={categoryButtonStyles(selectedCategory === category.id)}
            onMouseEnter={(e) => {
              if (selectedCategory !== category.id) {
                e.currentTarget.style.backgroundColor = theme.colors.surfaceHover || theme.colors.background;
              }
            }}
            onMouseLeave={(e) => {
              if (selectedCategory !== category.id) {
                e.currentTarget.style.backgroundColor = theme.colors.background;
              }
            }}
          >
            {category.name} ({category.presets.length})
          </button>
        ))}
      </div>

      {/* Category Description */}
      {selectedCategoryData && (
        <div style={{
          padding: '10px 12px',
          backgroundColor: theme.colors.background,
          borderRadius: '8px',
          border: `1px solid ${theme.colors.border}`
        }}>
          <p style={{
            margin: 0,
            fontSize: '10px',
            color: theme.colors.textSecondary,
            fontWeight: '500',
            lineHeight: '1.4'
          }}>
            {selectedCategoryData.description}
          </p>
        </div>
      )}

      {/* Presets List - Single Column Layout */}
      {selectedCategoryData && currentPresets.length > 0 && (
        <div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            alignItems: 'center' // Center the cards horizontally
          }}>
            {currentPresets.map((preset) => (
              <div key={preset.id} style={{ position: 'relative' }}>
                <PresetPreview
                  preset={preset}
                  isSelected={selectedPresetId === preset.id}
                  onClick={() => handlePresetSelect(preset)}
                  size="medium"
                  selectedFrameText={selectedFrameText}
                />
                
                {/* Preset Info Overlay */}
                <div style={{
                  position: 'absolute',
                  bottom: '40px',
                  left: '8px',
                  right: '8px',
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  color: 'white',
                  padding: '6px 8px',
                  borderRadius: theme.radius.sm,
                  fontSize: '12px',
                  opacity: 0,
                  transition: 'opacity 0.2s ease',
                  pointerEvents: 'none',
                  textAlign: 'center'
                }}
                className="preset-info"
                >
                  {preset.description}
                </div>
                
                {/* Popularity Badge */}
                {preset.popularity && preset.popularity > 80 && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    backgroundColor: theme.colors.warning,
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: theme.radius.sm,
                    fontSize: '10px',
                    fontWeight: '600',
                    textTransform: 'uppercase'
                  }}>
                    HOT
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '12px',
              marginTop: '16px'
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
      {(filteredCategories.length === 0 || (selectedCategoryData && selectedCategoryData.presets.length === 0)) && (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: theme.colors.textSecondary,
          gridColumn: '1 / -1'
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
            Try adjusting your search term or browse different categories
          </p>
        </div>
      )}

      <style>
        {`
          .preset-info:hover {
            opacity: 1 !important;
          }
          
          /* Custom scrollbar styling */
          div::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          
          div::-webkit-scrollbar-track {
            background: ${theme.colors.background};
            border-radius: 4px;
          }
          
          div::-webkit-scrollbar-thumb {
            background: ${theme.colors.border};
            border-radius: 4px;
          }
          
          div::-webkit-scrollbar-thumb:hover {
            background: ${theme.colors.primary};
          }
        `}
      </style>
    </div>
  );
};

export default PresetSelector;