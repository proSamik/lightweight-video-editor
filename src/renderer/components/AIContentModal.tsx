import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { CaptionSegment, GeneratedContent } from '../../types';
import { Button, IconButton } from './ui';
import { 
  FiCheckCircle, 
  FiX, 
  FiFileText, 
  FiEdit3, 
  FiCopy, 
  FiLoader, 
  FiDownload,
  FiAlertTriangle,
  FiYoutube,
  FiTwitter,
  FiImage
} from 'react-icons/fi';

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
  const [tweets, setTweets] = useState<{ hook: string; lineCount: number; wordCount: number }[]>([]);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [isGeneratingTweets, setIsGeneratingTweets] = useState(false);
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState<number | null>(null);
  const [selectedTweetIndex, setSelectedTweetIndex] = useState<number | null>(null);
  const [showSrtSuccess, setShowSrtSuccess] = useState(false);
  const [exportedSrtPath, setExportedSrtPath] = useState<string>('');
  const [copiedDescription, setCopiedDescription] = useState(false);
  const [copiedTitleIndex, setCopiedTitleIndex] = useState<number | null>(null);
  const [copiedTweetIndex, setCopiedTweetIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset states first
      setDescription('');
      setTitles([]);
      setTweets([]);
      setThumbnails([]);
      
      // Then load initial content if available
      if (initialContent?.description) {
        setDescription(initialContent.description);
      }
      if (initialContent?.titles) {
        setTitles(initialContent.titles);
      }
      if (initialContent?.tweets) {
        setTweets(initialContent.tweets);
      }
      if (initialContent?.thumbnails) {
        setThumbnails(initialContent.thumbnails);
      }
      
      console.log('AIContentModal - Loading initial content:', initialContent);
    }
  }, [isOpen, initialContent]);

  const handleCopyDescription = async () => {
    await navigator.clipboard.writeText(description);
    setCopiedDescription(true);
    setTimeout(() => setCopiedDescription(false), 1000);
  };

  const handleCopyTitle = async (title: string, index: number) => {
    await navigator.clipboard.writeText(title);
    setCopiedTitleIndex(index);
    setTimeout(() => setCopiedTitleIndex(null), 1000);
  };

  const handleCopyTweet = async (tweet: string, index: number) => {
    await navigator.clipboard.writeText(tweet);
    setCopiedTweetIndex(index);
    setTimeout(() => setCopiedTweetIndex(null), 1000);
  };

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

  const generateTweets = async () => {
    setIsGeneratingTweets(true);
    setError(null);
    
    try {
      const generatedTweets = await window.electronAPI.generateTweetHooks(captions);
      setTweets(generatedTweets);
    } catch (error) {
      console.error('Failed to generate tweet hooks:', error);
      setError('Failed to generate tweet hooks. Please check your AI settings and try again.');
    } finally {
      setIsGeneratingTweets(false);
    }
  };

  const generateThumbnails = async () => {
    setIsGeneratingThumbnails(true);
    setError(null);
    
    try {
      const generatedThumbnails = await window.electronAPI.generateThumbnailIdeas(captions);
      setThumbnails(generatedThumbnails);
    } catch (error) {
      console.error('Failed to generate thumbnail ideas:', error);
      setError('Failed to generate thumbnail ideas. Please check your AI settings and try again.');
    } finally {
      setIsGeneratingThumbnails(false);
    }
  };

  const handleSave = () => {
    const content: GeneratedContent = {
      description: description.trim() || undefined,
      titles: titles.length > 0 ? titles : undefined,
      tweets: tweets.length > 0 ? tweets : undefined,
      thumbnails: thumbnails.length > 0 ? thumbnails : undefined
    };
    console.log('AIContentModal - Saving content:', content);
    console.log('AIContentModal - tweets state:', tweets);
    console.log('AIContentModal - thumbnails state:', thumbnails);
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
    backgroundColor: theme.colors.modal.overlay,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(8px)',
  };

  const contentStyle: React.CSSProperties = {
    backgroundColor: theme.colors.modal.background,
    borderRadius: '12px',
    border: `1px solid ${theme.colors.modal.border}`,
    padding: '0',
    width: '900px',
    maxWidth: '95vw',
    maxHeight: '90vh',
    overflowY: 'auto',
    color: theme.colors.text,
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  };

  return (
    <div style={modalStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={contentStyle}>
        {/* Modal Header */}
        <div style={{
          padding: '24px 32px',
          borderBottom: `1px solid ${theme.colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{ 
              margin: 0, 
              fontSize: '24px', 
              fontWeight: '600', 
              color: theme.colors.text,
              lineHeight: '1.2'
            }}>
              AI Content Generation
            </h2>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '14px',
              color: theme.colors.textSecondary,
              fontWeight: '400'
            }}>
              Generate YouTube descriptions, titles, and more with AI
            </p>
          </div>
          <IconButton
            icon={<FiX size={18} />}
            onClick={onClose}
            variant="ghost"
            size="sm"
            aria-label="Close modal"
          />
        </div>

        {/* Modal Content */}
        <div style={{ padding: '32px' }}>

        {error && (
          <div style={{
            backgroundColor: theme.colors.error,
            color: theme.colors.errorForeground,
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '14px',
            border: `1px solid ${theme.colors.error}`,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <FiAlertTriangle size={16} />
            {error}
          </div>
        )}

        {/* SRT Export Section */}
        <div style={{ 
          marginBottom: '32px', 
          padding: '20px', 
          backgroundColor: theme.colors.surface, 
          borderRadius: '12px',
          border: `1px solid ${theme.colors.border}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: theme.colors.primary,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px'
            }}>
              <FiFileText size={18} color={theme.colors.primaryForeground} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: theme.colors.text }}>
                Export Subtitles
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '14px', color: theme.colors.textSecondary }}>
                Generate SRT file for YouTube upload
              </p>
            </div>
          </div>
          <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: theme.colors.textMuted, lineHeight: '1.5' }}>
            Export your subtitles as an SRT file to upload to YouTube for better accessibility and SEO.
          </p>
          <Button
            onClick={exportSRT}
            variant="primary"
            size="md"
            leftIcon={<FiDownload size={16} />}
          >
            Export SRT File
          </Button>
        </div>

        {/* Description Section */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: theme.colors.accent,
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px'
              }}>
                <FiEdit3 size={16} color={theme.colors.accentForeground} />
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: theme.colors.text }}>
                YouTube Description
              </h3>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {description.trim() && (
                <Button
                  onClick={handleCopyDescription}
                  variant="outline"
                  size="sm"
                  leftIcon={copiedDescription ? <FiCheckCircle size={14} /> : <FiCopy size={14} />}
                >
                  {copiedDescription ? 'Copied!' : 'Copy'}
                </Button>
              )}
              <Button
                onClick={generateDescription}
                disabled={isGeneratingDescription}
                variant="primary"
                size="sm"
                isLoading={isGeneratingDescription}
                leftIcon={!isGeneratingDescription && <FiEdit3 size={14} />}
              >
                {isGeneratingDescription ? 'Generating...' : 'Generate Description'}
              </Button>
            </div>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="AI-generated description will appear here, or you can write your own..."
            rows={8}
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: theme.colors.input.background,
              color: theme.colors.text,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: '8px',
              fontSize: '14px',
              resize: 'vertical',
              fontFamily: 'inherit',
              lineHeight: '1.5',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = theme.colors.borderFocus;
              e.currentTarget.style.backgroundColor = theme.colors.input.backgroundFocus;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = theme.colors.border;
              e.currentTarget.style.backgroundColor = theme.colors.input.background;
            }}
          />
          <div style={{ 
            marginTop: '12px', 
            fontSize: '12px', 
            color: theme.colors.textSecondary,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>Characters: {description.length} / 5000</span>
            <span style={{ 
              color: description.length > 5000 ? theme.colors.error : 
                     description.length > 4500 ? theme.colors.warning : theme.colors.textSecondary
            }}>
              {description.length > 5000 ? 'Exceeds YouTube limit' : 
               description.length > 4500 ? 'Approaching limit' : 'Within YouTube limit'}
            </span>
          </div>
        </div>

        {/* Title Generation Section */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: theme.colors.text }}>YouTube Titles</h3>
            <Button
              onClick={generateTitles}
              disabled={isGeneratingTitles || !description.trim()}
              variant="primary"
              size="sm"
              isLoading={isGeneratingTitles}
            >
              {isGeneratingTitles ? 'Generating...' : 'Generate Titles'}
            </Button>
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
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                  onClick={() => setSelectedTitleIndex(selectedTitleIndex === index ? null : index)}
                >
                  <div style={{ fontSize: '14px', marginBottom: '4px', paddingRight: '35px' }}>
                    {titleObj.title}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: titleObj.characterCount > 60 ? theme.colors.error : titleObj.characterCount < 40 ? theme.colors.warning : theme.colors.success
                  }}>
                    {titleObj.characterCount} characters 
                    {titleObj.characterCount > 60 ? ' (too long)' : 
                     titleObj.characterCount < 40 ? ' (could be longer)' : ' (optimal)'}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyTitle(titleObj.title, index);
                    }}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      padding: '4px',
                      backgroundColor: 'transparent',
                      color: copiedTitleIndex === index ? theme.colors.success : theme.colors.text,
                      border: 'none',
                      borderRadius: '3px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                    title={copiedTitleIndex === index ? "Copied!" : "Copy title"}
                  >
                    {copiedTitleIndex === index ? <FiCheckCircle size={12} /> : <FiCopy size={12} />}
                  </button>
                </div>
              ))}
            </div>
          )}
          {titles.length > 0 && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: theme.colors.textSecondary }}>
              Click on a title to select it. Optimal length: 60-70 characters
            </div>
          )}
        </div>

        {/* Twitter Hooks Generation Section */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: theme.colors.text }}>Twitter Video Hooks</h3>
            <Button
              onClick={generateTweets}
              disabled={isGeneratingTweets || !description.trim()}
              variant="primary"
              size="sm"
              isLoading={isGeneratingTweets}
            >
              {isGeneratingTweets ? 'Generating...' : 'Generate Tweet Hooks'}
            </Button>
          </div>
          
          {tweets.length === 0 ? (
            <div style={{
              padding: '20px',
              backgroundColor: theme.colors.background,
              borderRadius: '4px',
              textAlign: 'center',
              color: theme.colors.textSecondary,
              fontSize: '14px'
            }}>
              Generate viral Twitter hooks to promote your video
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {tweets.map((tweetObj, index) => (
                <div
                  key={index}
                  style={{
                    padding: '15px',
                    backgroundColor: selectedTweetIndex === index ? theme.colors.primary : theme.colors.background,
                    border: '2px solid transparent',
                    borderColor: selectedTweetIndex === index ? theme.colors.primary : 'transparent',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                  onClick={() => setSelectedTweetIndex(selectedTweetIndex === index ? null : index)}
                >
                  <div style={{ 
                    fontSize: '14px', 
                    marginBottom: '8px',
                    whiteSpace: 'pre-line',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    paddingRight: '35px'
                  }}>
                    {tweetObj.hook}
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    color: selectedTweetIndex === index ? 'rgba(255,255,255,0.8)' : theme.colors.textSecondary,
                    display: 'flex',
                    gap: '15px'
                  }}>
                    <span>{tweetObj.lineCount} lines</span>
                    <span>{tweetObj.wordCount} words</span>
                    <span>{tweetObj.lineCount <= 5 && tweetObj.wordCount <= 30 ? '✓ Optimal' : '⚠ Review format'}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyTweet(tweetObj.hook, index);
                    }}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      padding: '4px',
                      backgroundColor: 'transparent',
                      color: copiedTweetIndex === index ? theme.colors.success : theme.colors.text,
                      border: 'none',
                      borderRadius: '3px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                    title={copiedTweetIndex === index ? "Copied!" : "Copy tweet hook"}
                  >
                    {copiedTweetIndex === index ? <FiCheckCircle size={12} /> : <FiCopy size={12} />}
                  </button>
                </div>
              ))}
            </div>
          )}
          {tweets.length > 0 && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: theme.colors.textSecondary }}>
              Click to select a hook. Optimal: 4-5 lines, 5-6 words per line
            </div>
          )}
        </div>

        {/* Thumbnail Ideas Generation Section */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: theme.colors.text }}>Thumbnail Ideas</h3>
            <Button
              onClick={generateThumbnails}
              disabled={isGeneratingThumbnails || !description.trim()}
              variant="primary"
              size="sm"
              isLoading={isGeneratingThumbnails}
            >
              {isGeneratingThumbnails ? 'Generating...' : 'Generate Thumbnail Ideas'}
            </Button>
          </div>
          
          {thumbnails.length === 0 ? (
            <div style={{
              padding: '20px',
              backgroundColor: theme.colors.background,
              borderRadius: '4px',
              textAlign: 'center',
              color: theme.colors.textSecondary,
              fontSize: '14px'
            }}>
              Generate thumbnail concept ideas to maximize CTR
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {thumbnails.map((thumbnail, index) => (
                <div
                  key={index}
                  style={{
                    padding: '15px',
                    backgroundColor: theme.colors.background,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: '6px',
                    position: 'relative'
                  }}
                >
                  <div style={{ 
                    fontSize: '13px', 
                    lineHeight: '1.5'
                  }}>
                    <strong style={{ color: theme.colors.primary }}>Concept {index + 1}:</strong> {thumbnail}
                  </div>
                </div>
              ))}
            </div>
          )}
          {thumbnails.length > 0 && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: theme.colors.textSecondary }}>
              Visual concepts optimized for 2025 CTR trends.
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Button
            onClick={onClose}
            variant="secondary"
            size="md"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="success"
            size="md"
          >
            Save to Project
          </Button>
        </div>
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
              backgroundColor: theme.colors.surface,
              borderRadius: '8px',
              padding: '30px',
              width: '400px',
              maxWidth: '90vw',
              color: theme.colors.text,
              textAlign: 'center'
            }}>
              <div style={{ marginBottom: '20px' }}>
                <FiCheckCircle size={48} color={theme.colors.text} />
              </div>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: 'bold' }}>
                SRT Export Successful!
              </h3>
              <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: theme.colors.textSecondary }}>
                Your subtitle file has been saved successfully.
              </p>
              <div style={{
                backgroundColor: theme.colors.background,
                padding: '10px',
                borderRadius: '4px',
                marginBottom: '20px',
                fontSize: '12px',
                wordBreak: 'break-all',
                color: theme.colors.textSecondary
              }}>
                {exportedSrtPath}
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <Button
                  onClick={() => setShowSrtSuccess(false)}
                  variant="secondary"
                  size="md"
                >
                  Close
                </Button>
                <Button
                  onClick={handleShowSrtInFinder}
                  variant="primary"
                  size="md"
                >
                  Show in Finder
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIContentModal;