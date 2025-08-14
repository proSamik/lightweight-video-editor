import React, { useState, useEffect } from 'react';
import { X, Download, RotateCcw, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { Modal } from './ui/Modal';
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
        return `What's New in v${updateInfo?.version}`;
      default:
        return 'Update';
    }
  };

  const getModalIcon = () => {
    switch (type) {
      case 'available':
        return <Download className="w-6 h-6 text-blue-500" />;
      case 'downloaded':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'changelog':
        return <ExternalLink className="w-6 h-6 text-purple-500" />;
      default:
        return <AlertCircle className="w-6 h-6 text-gray-500" />;
    }
  };

  return (
          <Modal isOpen={isOpen} onClose={onClose} maxWidth={600}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-3">
            {getModalIcon()}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {getModalTitle()}
              </h2>
              {updateInfo && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Version {updateInfo.version}
                  {updateInfo.releaseDate && (
                    <span className="ml-2">
                      • {new Date(updateInfo.releaseDate).toLocaleDateString()}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Download Progress */}
        {isDownloading && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Downloading update...
              </span>
              <span className="text-sm text-blue-600 dark:text-blue-400">
                {downloadProgress}%
              </span>
            </div>
            <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
              <div
                className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="mb-6">
          {type === 'available' && (
            <div className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300">
                A new version of Lightweight Video Editor is available. This update includes
                new features, improvements, and bug fixes.
              </p>
              {updateInfo?.releaseNotes && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Release Notes:
                  </h4>
                  <div
                    className="text-sm prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: formatReleaseNotes(updateInfo.releaseNotes)
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {type === 'downloaded' && (
            <div className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300">
                The update has been downloaded and is ready to install. The application
                will restart to apply the update.
              </p>
              <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm text-green-700 dark:text-green-300">
                    Update downloaded successfully
                  </span>
                </div>
              </div>
            </div>
          )}

          {type === 'changelog' && updateInfo?.releaseNotes && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-h-96 overflow-y-auto">
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{
                  __html: formatReleaseNotes(updateInfo.releaseNotes)
                }}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handleViewOnGitHub}
              className="flex items-center space-x-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span>View on GitHub</span>
            </Button>
          </div>

          <div className="flex space-x-3">
            {type === 'available' && !isDownloading && (
              <>
                <Button variant="outline" onClick={onClose}>
                  Remind Me Later
                </Button>
                <Button onClick={handleDownload} disabled={isDownloading}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Update
                </Button>
              </>
            )}

            {type === 'downloaded' && (
              <>
                <Button variant="outline" onClick={onClose}>
                  Install Later
                </Button>
                <Button onClick={handleInstall}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restart & Install
                </Button>
              </>
            )}

            {(type === 'changelog' || isDownloading) && (
              <Button onClick={onClose}>Close</Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
