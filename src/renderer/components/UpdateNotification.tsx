import React, { useState, useEffect } from 'react';
import { Download, X, Bell, ExternalLink } from 'lucide-react';

interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseName?: string;
  releaseDate?: string;
}

interface UpdateNotificationProps {
  onShowModal: (type: 'available' | 'changelog', updateInfo: UpdateInfo) => void;
}

/**
 * Non-intrusive update notification component that appears in the top-right corner
 * Similar to VS Code's update notification behavior
 */
export const UpdateNotification: React.FC<UpdateNotificationProps> = ({
  onShowModal
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    // Listen for update events
    const handleUpdateAvailable = (info: UpdateInfo) => {
      console.log('Update available notification:', info);
      setUpdateInfo(info);
      setIsVisible(true);
    };

    const handleUpdateDownloaded = (info: UpdateInfo) => {
      console.log('Update downloaded notification:', info);
      setIsDownloading(false);
      setUpdateInfo(info);
      // Keep notification visible to show "Install" option
    };

    const handleDownloadProgress = (progress: any) => {
      setDownloadProgress(Math.round(progress.percent || 0));
    };

    const handleUpdateError = (error: string) => {
      console.error('Update error:', error);
      setIsDownloading(false);
    };

    // Set up event listeners
    window.electronAPI?.onUpdateAvailable(handleUpdateAvailable);
    window.electronAPI?.onUpdateDownloaded(handleUpdateDownloaded);
    window.electronAPI?.onUpdateDownloadProgress(handleDownloadProgress);
    window.electronAPI?.onUpdateError(handleUpdateError);

    return () => {
      window.electronAPI?.removeUpdateListeners();
    };
  }, []);

  const handleDownload = async () => {
    if (!updateInfo) return;
    
    try {
      setIsDownloading(true);
      await window.electronAPI?.downloadUpdate();
    } catch (error) {
      console.error('Failed to download update:', error);
      setIsDownloading(false);
    }
  };

  const handleInstall = async () => {
    try {
      await window.electronAPI?.installUpdate();
    } catch (error) {
      console.error('Failed to install update:', error);
    }
  };

  const handleViewDetails = () => {
    if (updateInfo) {
      onShowModal('changelog', updateInfo);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible || !updateInfo) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg animate-in slide-in-from-top-2 duration-300">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded">
              <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Update Available
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Version {updateInfo.version}
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Download Progress */}
        {isDownloading && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-700 dark:text-gray-300">
                Downloading...
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {downloadProgress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-blue-600 dark:bg-blue-400 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Content */}
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
          {downloadProgress === 100 && !isDownloading
            ? 'Update downloaded and ready to install.'
            : 'A new version with improvements and bug fixes is available.'
          }
        </p>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {downloadProgress === 100 && !isDownloading ? (
            <>
              <button
                onClick={handleInstall}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-2 px-3 rounded transition-colors"
              >
                Install & Restart
              </button>
              <button
                onClick={handleViewDetails}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                title="View Details"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </>
          ) : !isDownloading ? (
            <>
              <button
                onClick={handleDownload}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-2 px-3 rounded transition-colors flex items-center justify-center space-x-1"
              >
                <Download className="w-3 h-3" />
                <span>Download</span>
              </button>
              <button
                onClick={handleViewDetails}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                title="View Details"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex-1 text-center text-xs text-gray-600 dark:text-gray-400 py-2">
              Downloading update...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
