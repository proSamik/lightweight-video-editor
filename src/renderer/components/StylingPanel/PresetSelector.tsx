import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { CaptionPreset, CaptionStyle } from '../../../types';
import { presetCategories } from '../../data/captionPresets';
import { PresetPreview } from '../PresetPreview';

interface PresetSelectorProps {
  selectedPresetId?: string;
  onPresetSelect: (preset: CaptionPreset) => void;
  onStyleUpdate: (style: Partial<CaptionStyle>) => void;
  onApplyToAll?: (style: Partial<CaptionStyle>) => void;
}

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  selectedPresetId,
  onPresetSelect,
  onStyleUpdate,
  onApplyToAll
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
      preset.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
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
    padding: '8px 16px',
    backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
    color: isSelected ? theme.colors.primaryForeground : theme.colors.text,
    border: `1px solid ${isSelected ? theme.colors.primary : theme.colors.border}`,
    borderRadius: theme.radius.md,
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap'
  });

  const searchInputStyles: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: theme.colors.surface,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.lg,
    fontSize: '14px',
    color: theme.colors.text,
    outline: 'none',
    transition: 'border-color 0.2s ease'
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '20px',
      padding: '20px',
      backgroundColor: theme.colors.background,
      borderRadius: theme.radius.lg,
      border: `1px solid ${theme.colors.border}`
    }}>
      {/* Header */}
      <div>
        <h3 style={{
          margin: '0 0 8px 0',
          fontSize: '18px',
          fontWeight: '600',
          color: theme.colors.text
        }}>
          Style Presets
        </h3>
        <p style={{
          margin: 0,
          fontSize: '14px',
          color: theme.colors.textSecondary,
          lineHeight: '1.5'
        }}>
          Choose from trending animated caption styles or customize your own
        </p>
      </div>

      {/* Apply to All Checkbox */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: theme.colors.primarySubtle,
        border: `1px solid ${theme.colors.primary}20`,
        borderRadius: theme.radius.lg
      }}>
        <input
          type="checkbox"
          id="applyToAll"
          checked={applyToAll}
          onChange={(e) => setApplyToAll(e.target.checked)}
          style={{
            width: '16px',
            height: '16px',
            accentColor: theme.colors.primary
          }}
        />
        <label htmlFor="applyToAll" style={{
          fontSize: '14px',
          fontWeight: '500',
          color: theme.colors.primary,
          cursor: 'pointer',
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Apply to All Captions
        </label>
        <span style={{
          fontSize: '12px',
          color: theme.colors.textSecondary,
          marginLeft: 'auto'
        }}>
          {applyToAll ? 'Will apply to all segments' : 'Will apply to selected segment only'}
        </span>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search presets by name, style, or tags..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(0); // Reset to first page when searching
          }}
          style={searchInputStyles}
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
        gap: '8px'
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
                e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
              }
            }}
            onMouseLeave={(e) => {
              if (selectedCategory !== category.id) {
                e.currentTarget.style.backgroundColor = theme.colors.surface;
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
          padding: '12px 16px',
          backgroundColor: theme.colors.primarySubtle,
          borderRadius: theme.radius.md,
          border: `1px solid ${theme.colors.primary}20`
        }}>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: theme.colors.primary,
            fontWeight: '500'
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
            gap: '24px'
          }}>
            {currentPresets.map((preset) => (
              <div key={preset.id} style={{ position: 'relative' }}>
                <PresetPreview
                  preset={preset}
                  isSelected={selectedPresetId === preset.id}
                  onClick={() => handlePresetSelect(preset)}
                  size="medium"
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
                  backgroundColor: currentPage === 0 ? theme.colors.surface : theme.colors.primary,
                  color: currentPage === 0 ? theme.colors.textSecondary : theme.colors.primaryForeground,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radius.md,
                  cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
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
                fontSize: '12px',
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
                  backgroundColor: currentPage === totalPages - 1 ? theme.colors.surface : theme.colors.primary,
                  color: currentPage === totalPages - 1 ? theme.colors.textSecondary : theme.colors.primaryForeground,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radius.md,
                  cursor: currentPage === totalPages - 1 ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
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
            fontSize: '16px',
            fontWeight: '600',
            color: theme.colors.text
          }}>
            No presets found
          </h4>
          <p style={{
            margin: 0,
            fontSize: '14px',
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
            background: ${theme.colors.surface};
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