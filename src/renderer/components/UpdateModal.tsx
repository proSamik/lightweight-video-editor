import React, { useState, useEffect } from 'react';
import { Download, RotateCcw, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import LiquidModal from './ui/LiquidModal';
import { Button } from './ui/Button';

interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseName?: string;
  releaseDate?: string;
}

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: UpdateInfo | null;
  type: 'available' | 'downloaded' | 'changelog';
}

/**
 * Modal component for displaying update notifications and changelogs
 * Provides VS Code-like update experience with detailed release notes
 */
export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  updateInfo,
  type
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Listen for download progress updates
    const handleDownloadProgress = (progress: any) => {
      setDownloadProgress(Math.round(progress.percent || 0));
    };

    const handleUpdateError = (errorMessage: string) => {
      setError(errorMessage);
      setIsDownloading(false);
    };

    const handleUpdateDownloaded = () => {
      setIsDownloading(false);
      setDownloadProgress(100);
    };

    if (isOpen) {
      window.electronAPI?.onUpdateDownloadProgress(handleDownloadProgress);
      window.electronAPI?.onUpdateError(handleUpdateError);
      window.electronAPI?.onUpdateDownloaded(handleUpdateDownloaded);
    }

    return () => {
      window.electronAPI?.removeUpdateListeners();
    };
  }, [isOpen]);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      setError(null);
      await window.electronAPI?.downloadUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download update');
      setIsDownloading(false);
    }
  };

  const handleInstall = async () => {
    try {
      await window.electronAPI?.installUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to install update');
    }
  };

  const handleViewOnGitHub = () => {
    if (updateInfo?.version) {
      const url = `https://github.com/proSamik/lightweight-video-editor/releases/tag/v${updateInfo.version}`;
      window.open(url, '_blank');
    }
  };

  const formatReleaseNotes = (notes?: string) => {
    if (!notes) return 'No release notes available.';
    
    // Basic markdown-like formatting for release notes
    return notes
      .replace(/^#\s+(.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2 text-gray-900 dark:text-gray-100">$1</h3>')
      .replace(/^##\s+(.+)$/gm, '<h4 class="text-md font-medium mt-3 mb-1 text-gray-800 dark:text-gray-200">$1</h4>')
      .replace(/^\*\s+(.+)$/gm, '<li class="ml-4 text-gray-700 dark:text-gray-300">$1</li>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/`(.+?)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      .replace(/\n/g, '<br>');
  };

  const getModalTitle = () => {
    switch (type) {
      case 'available':
        return 'Update Available';
      case 'downloaded':
        return 'Update Ready to Install';
      case 'changelog':
        return 'Release Notes';
      default:
        return 'Update';
    }
  };

  const getModalSubtitle = () => {
    switch (type) {
      case 'available':
        return `Version ${updateInfo?.version} is now available for download`;
      case 'downloaded':
        return `Version ${updateInfo?.version} has been downloaded and is ready to install`;
      case 'changelog':
        return `What's new in version ${updateInfo?.version}`;
      default:
        return '';
    }
  };

  const getModalIcon = () => {
    switch (type) {
      case 'available':
        return <Download size={24} />;
      case 'downloaded':
        return <CheckCircle size={24} />;
      case 'changelog':
        return <AlertCircle size={24} />;
      default:
        return <Download size={24} />;
    }
  };

  const getActionButton = () => {
    if (error) {
      return (
        <Button
          onClick={handleDownload}
          variant="primary"
          size="lg"
          leftIcon={<RotateCcw size={16} />}
        >
          Retry Download
        </Button>
      );
    }

    switch (type) {
      case 'available':
        return (
          <Button
            onClick={handleDownload}
            variant="primary"
            size="lg"
            leftIcon={<Download size={16} />}
            isLoading={isDownloading}
            disabled={isDownloading}
          >
            {isDownloading ? `Downloading... ${downloadProgress}%` : 'Download Update'}
          </Button>
        );
      case 'downloaded':
        return (
          <Button
            onClick={handleInstall}
            variant="primary"
            size="lg"
            leftIcon={<CheckCircle size={16} />}
          >
            Install Update
          </Button>
        );
      case 'changelog':
        return (
          <Button
            onClick={onClose}
            variant="primary"
            size="lg"
          >
            Close
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <LiquidModal
      isOpen={isOpen}
      onClose={onClose}
      title={getModalTitle()}
      subtitle={getModalSubtitle()}
      icon={getModalIcon()}
      maxWidth="700px"
    >
      <div style={{ padding: '32px' }}>
        {/* Error Display */}
        {error && (
          <div style={{
            padding: '16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            marginBottom: '24px',
            color: '#dc2626'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {/* Download Progress */}
        {isDownloading && type === 'available' && (
          <div style={{
            padding: '16px',
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '8px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Download size={16} />
              <strong>Downloading update...</strong>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#e0f2fe',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${downloadProgress}%`,
                height: '100%',
                backgroundColor: '#0284c7',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <div style={{ marginTop: '8px', fontSize: '14px', color: '#0369a1' }}>
              {downloadProgress}% complete
            </div>
          </div>
        )}

        {/* Release Notes */}
        {updateInfo?.releaseNotes && (
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              What's New
            </h3>
            <div 
              style={{
                padding: '16px',
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                lineHeight: '1.6',
                color: '#374151',
                maxHeight: '300px',
                overflowY: 'auto'
              }}
              dangerouslySetInnerHTML={{ __html: formatReleaseNotes(updateInfo.releaseNotes) }}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          alignItems: 'center',
          borderTop: '1px solid #e5e7eb',
          paddingTop: '24px'
        }}>
          <Button
            onClick={handleViewOnGitHub}
            variant="ghost"
            size="md"
            leftIcon={<ExternalLink size={16} />}
          >
            View on GitHub
          </Button>
          {getActionButton()}
        </div>
      </div>
    </LiquidModal>
  );
};
