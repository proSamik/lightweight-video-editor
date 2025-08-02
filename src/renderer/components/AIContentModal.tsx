import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { CaptionSegment, GeneratedContent } from '../../types';

interface AIContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  captions: CaptionSegment[];
  onSave: (content: GeneratedContent) => void;
  initialContent?: GeneratedContent;
}

const AIContentModal: React.FC<AIContentModalProps> = ({ 
  isOpen, 
  onClose, 
  captions, 
  onSave,
  initialContent 
}) => {
  const { theme } = useTheme();
  const [description, setDescription] = useState('');
  const [titles, setTitles] = useState<{ title: string; characterCount: number }[]>([]);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState<number | null>(null);
  const [showSrtSuccess, setShowSrtSuccess] = useState(false);
  const [exportedSrtPath, setExportedSrtPath] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (initialContent?.description) {
        setDescription(initialContent.description);
      }
      if (initialContent?.titles) {
        setTitles(initialContent.titles);
      }
    }
  }, [isOpen, initialContent]);

  const generateDescription = async () => {
    setIsGeneratingDescription(true);
    setError(null);
    
    try {
      const generatedDescription = await window.electronAPI.generateDescription(captions);
      setDescription(generatedDescription);
    } catch (error) {
      console.error('Failed to generate description:', error);
      setError('Failed to generate description. Please check your AI settings and try again.');
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const generateTitles = async () => {
    if (!description.trim()) {
      setError('Please generate or enter a description first.');
      return;
    }

    setIsGeneratingTitles(true);
    setError(null);
    
    try {
      const generatedTitles = await window.electronAPI.generateTitles(description, captions);
      setTitles(generatedTitles);
    } catch (error) {
      console.error('Failed to generate titles:', error);
      setError('Failed to generate titles. Please check your AI settings and try again.');
    } finally {
      setIsGeneratingTitles(false);
    }
  };

  const handleSave = () => {
    const content: GeneratedContent = {
      description: description.trim() || undefined,
      titles: titles.length > 0 ? titles : undefined
    };
    onSave(content);
    onClose();
  };

  const exportSRT = async () => {
    try {
      const result = await window.electronAPI.exportSrt(captions, 'subtitles.srt');
      if (result.success && !result.canceled) {
        setExportedSrtPath(result.filePath);
        setShowSrtSuccess(true);
      }
    } catch (error) {
      console.error('Failed to export SRT:', error);
      alert('Failed to export SRT file. Please try again.');
    }
  };

  const handleShowSrtInFinder = async () => {
    try {
      await window.electronAPI.showItemInFolder(exportedSrtPath);
    } catch (error) {
      console.error('Failed to show SRT in finder:', error);
    }
  };

  if (!isOpen) return null;

  const modalStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const contentStyle: React.CSSProperties = {
    backgroundColor: theme.colors.surface,
    borderRadius: '8px',
    padding: '30px',
    width: '800px',
    maxWidth: '90vw',
    maxHeight: '80vh',
    overflowY: 'auto',
    color: theme.colors.text,
  };

  return (
    <div style={modalStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={contentStyle}>
        <h2 style={{ margin: '0 0 25px 0', fontSize: '20px', fontWeight: 'bold', color: theme.colors.text }}>
          AI Content Generation for YouTube
        </h2>

        {error && (
          <div style={{
            backgroundColor: theme.colors.error,
            color: theme.colors.text,
            padding: '10px',
            borderRadius: '4px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {/* SRT Export Section */}
        <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: theme.colors.background, borderRadius: '6px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: theme.colors.text }}>Export Subtitles for YouTube</h3>
          <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: theme.colors.textSecondary }}>
            Export your subtitles as an SRT file to upload to YouTube for better accessibility and SEO.
          </p>
          <button
            onClick={exportSRT}
            style={{
              padding: '8px 16px',
              backgroundColor: theme.colors.success,
              color: theme.colors.text,
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            Export SRT File
          </button>
        </div>

        {/* Description Section */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: theme.colors.text }}>YouTube Description</h3>
            <button
              onClick={generateDescription}
              disabled={isGeneratingDescription}
              style={{
                padding: '8px 16px',
                backgroundColor: isGeneratingDescription ? theme.colors.secondary : theme.colors.primary,
                color: theme.colors.text,
                border: 'none',
                borderRadius: '4px',
                cursor: isGeneratingDescription ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {isGeneratingDescription ? 'Generating...' : 'Generate Description'}
            </button>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="AI-generated description will appear here, or you can write your own..."
            rows={8}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: '4px',
              fontSize: '14px',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
          <div style={{ marginTop: '8px', fontSize: '12px', color: theme.colors.textSecondary }}>
            Characters: {description.length} / 5000 (YouTube limit)
          </div>
        </div>

        {/* Title Generation Section */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: theme.colors.text }}>YouTube Titles</h3>
            <button
              onClick={generateTitles}
              disabled={isGeneratingTitles || !description.trim()}
              style={{
                padding: '8px 16px',
                backgroundColor: isGeneratingTitles || !description.trim() ? theme.colors.secondary : theme.colors.success,
                color: theme.colors.text,
                border: 'none',
                borderRadius: '4px',
                cursor: isGeneratingTitles || !description.trim() ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {isGeneratingTitles ? 'Generating...' : 'Generate Titles'}
            </button>
          </div>
          
          {titles.length === 0 ? (
            <div style={{
              padding: '20px',
              backgroundColor: theme.colors.background,
              borderRadius: '4px',
              textAlign: 'center',
              color: theme.colors.textSecondary,
              fontSize: '14px'
            }}>
              Generate titles after creating a description
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {titles.map((titleObj, index) => (
                <div
                  key={index}
                  style={{
                    padding: '12px',
                    backgroundColor: selectedTitleIndex === index ? theme.colors.primary : theme.colors.background,
                    border: '2px solid transparent',
                    borderColor: selectedTitleIndex === index ? theme.colors.primary : 'transparent',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setSelectedTitleIndex(selectedTitleIndex === index ? null : index)}
                >
                  <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                    {titleObj.title}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: titleObj.characterCount > 60 ? '#ff6b6b' : titleObj.characterCount < 40 ? '#ffd93d' : '#51cf66'
                  }}>
                    {titleObj.characterCount} characters 
                    {titleObj.characterCount > 60 ? ' (too long)' : 
                     titleObj.characterCount < 40 ? ' (could be longer)' : ' (optimal)'}
                  </div>
                </div>
              ))}
            </div>
          )}
          {titles.length > 0 && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
              Click on a title to select it. Optimal length: 40-60 characters
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            Save to Project
          </button>
        </div>

        {/* SRT Export Success Modal */}
        {showSrtSuccess && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001
          }}>
            <div style={{
              backgroundColor: '#2a2a2a',
              borderRadius: '8px',
              padding: '30px',
              width: '400px',
              maxWidth: '90vw',
              color: '#fff',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: 'bold' }}>
                SRT Export Successful!
              </h3>
              <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#ccc' }}>
                Your subtitle file has been saved successfully.
              </p>
              <div style={{
                backgroundColor: '#333',
                padding: '10px',
                borderRadius: '4px',
                marginBottom: '20px',
                fontSize: '12px',
                wordBreak: 'break-all',
                color: '#aaa'
              }}>
                {exportedSrtPath}
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  onClick={() => setShowSrtSuccess(false)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6c757d',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Close
                </button>
                <button
                  onClick={handleShowSrtInFinder}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#007bff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  Show in Finder
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIContentModal;