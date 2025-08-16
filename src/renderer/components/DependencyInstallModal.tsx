import React, { useState, useEffect } from 'react';
import { Button, Card } from './ui';
import { CloseIcon } from './IconComponents';
import { InstallationProgress } from '../../services/dependencyInstaller';

interface DependencyInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  missingDependencies: {
    ffmpeg: boolean;
    whisper: boolean;
  };
  onInstallComplete: () => void;
}

const DependencyInstallModal: React.FC<DependencyInstallModalProps> = ({
  isOpen,
  onClose,
  missingDependencies,
  onInstallComplete
}) => {
  const [installationCapabilities, setInstallationCapabilities] = useState<any>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [currentInstallation, setCurrentInstallation] = useState<'ffmpeg' | 'whisper' | null>(null);
  const [installationProgress, setInstallationProgress] = useState<{
    ffmpeg?: InstallationProgress;
    whisper?: InstallationProgress;
  }>({});
  const [completedInstallations, setCompletedInstallations] = useState<{
    ffmpeg: boolean;
    whisper: boolean;
  }>({ ffmpeg: false, whisper: false });

  useEffect(() => {
    if (isOpen) {
      checkCapabilities();
      
      // Listen for installation progress
      window.electronAPI.onInstallationProgress?.((dependency: string, progress: InstallationProgress) => {
        setInstallationProgress(prev => ({
          ...prev,
          [dependency]: progress
        }));
        
        if (progress.isComplete && !progress.error) {
          setCompletedInstallations(prev => ({
            ...prev,
            [dependency]: true
          }));
          setCurrentInstallation(null);
          setIsInstalling(false);
        } else if (progress.error) {
          setCurrentInstallation(null);
          setIsInstalling(false);
        }
      });
    }
  }, [isOpen]);

  const checkCapabilities = async () => {
    try {
      const capabilities = await window.electronAPI.checkInstallationCapabilities();
      setInstallationCapabilities(capabilities);
    } catch (error) {
      console.error('Failed to check installation capabilities:', error);
    }
  };

  const handleInstallFFmpeg = async () => {
    if (!installationCapabilities?.canInstallFFmpeg) return;
    
    setIsInstalling(true);
    setCurrentInstallation('ffmpeg');
    
    try {
      const success = await window.electronAPI.installFFmpeg();
      if (success) {
        setCompletedInstallations(prev => ({ ...prev, ffmpeg: true }));
      }
    } catch (error) {
      console.error('FFmpeg installation failed:', error);
      alert(`FFmpeg installation failed: ${error}`);
    } finally {
      setIsInstalling(false);
      setCurrentInstallation(null);
    }
  };

  const handleInstallWhisper = async () => {
    if (!installationCapabilities?.canInstallWhisper) return;
    
    setIsInstalling(true);
    setCurrentInstallation('whisper');
    
    try {
      const success = await window.electronAPI.installWhisper();
      if (success) {
        setCompletedInstallations(prev => ({ ...prev, whisper: true }));
      }
    } catch (error) {
      console.error('Whisper installation failed:', error);
      alert(`Whisper installation failed: ${error}`);
    } finally {
      setIsInstalling(false);
      setCurrentInstallation(null);
    }
  };

  const handleClose = () => {
    if (completedInstallations.ffmpeg || completedInstallations.whisper) {
      onInstallComplete();
    }
    onClose();
  };

  const allDependenciesInstalled = () => {
    return (!missingDependencies.ffmpeg || completedInstallations.ffmpeg) &&
           (!missingDependencies.whisper || completedInstallations.whisper);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Install Missing Dependencies</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isInstalling}
          >
            <CloseIcon size={20} />
          </Button>
        </div>

        <div className="space-y-6">
          <p className="text-gray-300">
            This application requires FFmpeg and OpenAI Whisper to function properly. 
            You can install them automatically using the buttons below.
          </p>

          {/* FFmpeg Installation */}
          {missingDependencies.ffmpeg && !completedInstallations.ffmpeg && (
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-medium text-white">FFmpeg</h3>
                  <p className="text-sm text-gray-400">
                    Required for video processing and encoding
                  </p>
                  {installationCapabilities && (
                    <p className="text-xs text-gray-500 mt-1">
                      Method: {installationCapabilities.ffmpegMethod}
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleInstallFFmpeg}
                  disabled={!installationCapabilities?.canInstallFFmpeg || isInstalling}
                  className="min-w-[100px]"
                >
                  {currentInstallation === 'ffmpeg' ? 'Installing...' : 'Install'}
                </Button>
              </div>
              
              {currentInstallation === 'ffmpeg' && installationProgress.ffmpeg && (
                <div className="mt-3">
                  <div className="flex justify-between text-sm text-gray-400 mb-1">
                    <span>{installationProgress.ffmpeg.message}</span>
                    <span>{installationProgress.ffmpeg.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${installationProgress.ffmpeg.progress}%` }}
                    />
                  </div>
                  {installationProgress.ffmpeg.error && (
                    <p className="text-red-400 text-sm mt-2">
                      Error: {installationProgress.ffmpeg.error}
                    </p>
                  )}
                </div>
              )}
              
              {!installationCapabilities?.canInstallFFmpeg && installationCapabilities && (
                <div className="mt-3 p-3 bg-yellow-900 bg-opacity-50 rounded border border-yellow-600">
                  <p className="text-yellow-200 text-sm">
                    Automatic installation not available. Requirements:
                  </p>
                  <ul className="text-yellow-300 text-xs mt-1 ml-4">
                    {installationCapabilities.requirements.map((req: string, index: number) => (
                      <li key={index}>• {req}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Whisper Installation */}
          {missingDependencies.whisper && !completedInstallations.whisper && (
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-medium text-white">OpenAI Whisper</h3>
                  <p className="text-sm text-gray-400">
                    Required for audio transcription and caption generation
                  </p>
                  {installationCapabilities && (
                    <p className="text-xs text-gray-500 mt-1">
                      Method: {installationCapabilities.whisperMethod}
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleInstallWhisper}
                  disabled={!installationCapabilities?.canInstallWhisper || isInstalling}
                  className="min-w-[100px]"
                >
                  {currentInstallation === 'whisper' ? 'Installing...' : 'Install'}
                </Button>
              </div>
              
              {currentInstallation === 'whisper' && installationProgress.whisper && (
                <div className="mt-3">
                  <div className="flex justify-between text-sm text-gray-400 mb-1">
                    <span>{installationProgress.whisper.message}</span>
                    <span>{installationProgress.whisper.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${installationProgress.whisper.progress}%` }}
                    />
                  </div>
                  {installationProgress.whisper.error && (
                    <p className="text-red-400 text-sm mt-2">
                      Error: {installationProgress.whisper.error}
                    </p>
                  )}
                </div>
              )}
              
              {!installationCapabilities?.canInstallWhisper && installationCapabilities && (
                <div className="mt-3 p-3 bg-yellow-900 bg-opacity-50 rounded border border-yellow-600">
                  <p className="text-yellow-200 text-sm">
                    Automatic installation not available. Requirements:
                  </p>
                  <ul className="text-yellow-300 text-xs mt-1 ml-4">
                    {installationCapabilities.requirements.map((req: string, index: number) => (
                      <li key={index}>• {req}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Success Messages */}
          {completedInstallations.ffmpeg && (
            <div className="bg-green-900 bg-opacity-50 rounded-lg p-4 border border-green-600">
              <p className="text-green-200 font-medium">✅ FFmpeg installed successfully!</p>
            </div>
          )}
          
          {completedInstallations.whisper && (
            <div className="bg-green-900 bg-opacity-50 rounded-lg p-4 border border-green-600">
              <p className="text-green-200 font-medium">✅ Whisper installed successfully!</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isInstalling}
            >
              {allDependenciesInstalled() ? 'Continue' : 'Cancel'}
            </Button>
            
            {allDependenciesInstalled() && (
              <Button
                onClick={onInstallComplete}
                className="bg-green-600 hover:bg-green-700"
              >
                All Set! Continue
              </Button>
            )}
          </div>

          {/* Manual Installation Instructions */}
          <details className="mt-6">
            <summary className="text-gray-400 cursor-pointer hover:text-white">
              Manual Installation Instructions
            </summary>
            <div className="mt-3 p-4 bg-gray-800 rounded-lg text-sm text-gray-300">
              <h4 className="font-medium mb-2">FFmpeg:</h4>
              <ul className="list-disc ml-4 mb-4">
                <li>macOS: <code className="bg-gray-700 px-1 rounded">brew install ffmpeg</code></li>
                <li>Windows: Download from <a href="https://ffmpeg.org" className="text-blue-400">ffmpeg.org</a></li>
                <li>Linux: <code className="bg-gray-700 px-1 rounded">sudo apt install ffmpeg</code></li>
              </ul>
              
              <h4 className="font-medium mb-2">OpenAI Whisper:</h4>
              <ul className="list-disc ml-4">
                <li>Install Python 3.7+ first</li>
                <li>Run: <code className="bg-gray-700 px-1 rounded">pip install openai-whisper</code></li>
              </ul>
            </div>
          </details>
        </div>
      </Card>
    </div>
  );
};

export default DependencyInstallModal;