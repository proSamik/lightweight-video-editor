import { contextBridge, ipcRenderer, webUtils } from 'electron';

const electronAPI = {
  selectVideoFile: () => ipcRenderer.invoke('select-video-file'),
  selectAudioFile: () => ipcRenderer.invoke('select-audio-file'),
  exportVideo: (outputPath: string) => ipcRenderer.invoke('export-video', outputPath),
  exportAudio: (videoPath: string, outputName?: string) => ipcRenderer.invoke('export-audio', videoPath, outputName),
  replaceAudioTrack: (videoPath: string, audioPath: string, outputName?: string) => ipcRenderer.invoke('replace-audio-track', videoPath, audioPath, outputName),
  getVideoMetadata: (videoPath: string) => ipcRenderer.invoke('get-video-metadata', videoPath),
  extractAudio: (videoPath: string) => ipcRenderer.invoke('extract-audio', videoPath),
  transcribeAudio: (audioPath: string, model?: string) => ipcRenderer.invoke('transcribe-audio', audioPath, model),
  transcribeAudioSegments: (audioPath: string, timelineSelections: any[], model?: string) => 
    ipcRenderer.invoke('transcribe-audio-segments', audioPath, timelineSelections, model),
  checkDependencies: () => ipcRenderer.invoke('check-dependencies'),
  testWhisperInstallation: () => ipcRenderer.invoke('test-whisper-installation'),
  renderVideoWithCaptions: (videoPath: string, captionsData: any[], outputPath: string, exportSettings?: any, replacementAudioPath?: string) => 
    ipcRenderer.invoke('render-video-with-captions', videoPath, captionsData, outputPath, exportSettings, replacementAudioPath),
  renderVideoWithAISubtitles: (videoPath: string, aiSubtitleData: any, outputPath: string, exportSettings?: any, replacementAudioPath?: string) =>
    ipcRenderer.invoke('render-video-with-ai-subtitles', videoPath, aiSubtitleData, outputPath, exportSettings, replacementAudioPath),
  renderVideoWithClipsAndSubtitles: (videoPath: string, clips: any[], aiSubtitleData: any, outputPath: string, exportSettings?: any, replacementAudioPath?: string) =>
    ipcRenderer.invoke('render-video-with-clips-and-subtitles', videoPath, clips, aiSubtitleData, outputPath, exportSettings, replacementAudioPath),
  exportVideoWithNewAudio: (videoPath: string, newAudioPath: string, outputPath: string) =>
    ipcRenderer.invoke('export-video-with-new-audio', videoPath, newAudioPath, outputPath),
  handleFileDrop: (filePath: string) => ipcRenderer.invoke('handle-file-drop', filePath),
  onFileDropped: (callback: (filePath: string) => void) => {
    ipcRenderer.on('file-dropped', (_event, filePath) => callback(filePath));
  },
  // New method to get file path from File object using webUtils
  getFilePath: (file: File) => webUtils.getPathForFile(file),
  showItemInFolder: (filePath: string) => ipcRenderer.invoke('show-item-in-folder', filePath),
  applyWordDeletions: (inputVideoPath: string, originalCaptions: any[], updatedCaptions: any[], outputPath: string) =>
    ipcRenderer.invoke('apply-word-deletions', inputVideoPath, originalCaptions, updatedCaptions, outputPath),
  onTranscriptionProgress: (callback: (progress: number, speed?: string, eta?: string) => void) => {
    ipcRenderer.on('transcription-progress', (_, progress, speed, eta) => callback(progress, speed, eta));
  },
  removeTranscriptionProgressListener: () => {
    ipcRenderer.removeAllListeners('transcription-progress');
  },
  onRenderingProgress: (callback: (progress: number) => void) => {
    ipcRenderer.on('rendering-progress', (_, progress) => callback(progress));
  },
  onInstallationProgress: (callback: (dependency: string, progress: any) => void) => {
    ipcRenderer.on('installation-progress', (_, dependency, progress) => callback(dependency, progress));
  },
  removeRenderingProgressListener: () => {
    ipcRenderer.removeAllListeners('rendering-progress');
  },
  // Project management
  saveProject: (projectData: any, fileName?: string) => 
    ipcRenderer.invoke('save-project', projectData, fileName),
  loadProject: (filePath: string) => 
    ipcRenderer.invoke('load-project', filePath),
  listRecentProjects: () => 
    ipcRenderer.invoke('list-recent-projects'),
  deleteProject: (filePath: string) => 
    ipcRenderer.invoke('delete-project', filePath),
  renameProject: (filePath: string, newName: string) => 
    ipcRenderer.invoke('rename-project-file', filePath, newName),
  renameCurrentProject: (newName: string) => 
    ipcRenderer.invoke('rename-current-project', newName),
  // Enhanced project management
  saveProjectAs: (projectData: any, fileName?: string) =>
    ipcRenderer.invoke('save-project-as', projectData, fileName),
  getCurrentProjectInfo: () =>
    ipcRenderer.invoke('get-current-project-info'),
  markProjectModified: () =>
    ipcRenderer.invoke('mark-project-modified'),
  createNewProject: () =>
    ipcRenderer.invoke('create-new-project'),
  // SRT export
  exportSrt: (captions: any[], defaultFileName?: string) =>
    ipcRenderer.invoke('export-srt', captions, defaultFileName),
  // AI and Settings
  loadAISettings: () => 
    ipcRenderer.invoke('load-ai-settings'),
  saveAISettings: (settings: any) =>
    ipcRenderer.invoke('save-ai-settings', settings),
  testAIConnection: (settings: any) =>
    ipcRenderer.invoke('test-ai-connection', settings),
  generateDescription: (captionText: string, customPrompt?: string) =>
    ipcRenderer.invoke('generate-description', captionText, customPrompt),
  generateTitles: (description: string, captionText: string, customPrompt?: string) =>
    ipcRenderer.invoke('generate-titles', description, captionText, customPrompt),
  generateTweetHooks: (captionText: string, customPrompt?: string) =>
    ipcRenderer.invoke('generate-tweet-hooks', captionText, customPrompt),
  generateThumbnailIdeas: (captionText: string, customPrompt?: string) =>
    ipcRenderer.invoke('generate-thumbnail-ideas', captionText, customPrompt),
  getAvailableModels: (settings: any) =>
    ipcRenderer.invoke('get-available-models', settings),
  cancelRendering: () =>
    ipcRenderer.invoke('cancel-rendering'),
  // File access for WaveSurfer and other components
  getFileUrl: (filePath: string) => 
    ipcRenderer.invoke('get-file-url', filePath),
  // Get audio buffer for WaveSurfer
  getAudioBuffer: (filePath: string) => 
    ipcRenderer.invoke('get-audio-buffer', filePath),
  // Extract audio for project (persistent audio file)
  extractAudioForProject: (videoPath: string, projectPath: string) =>
    ipcRenderer.invoke('extract-audio-for-project', videoPath, projectPath),
  // Check if file exists
  fileExists: (filePath: string) =>
    ipcRenderer.invoke('file-exists', filePath),
  // AI Subtitles export
  exportAISubtitlesSRT: (aiSubtitleData: any) =>
    ipcRenderer.invoke('export-ai-subtitles-srt', aiSubtitleData),
  exportModifiedVideo: (aiSubtitleData: any, videoPath: string, audioPath?: string) =>
    ipcRenderer.invoke('export-modified-video', aiSubtitleData, videoPath, audioPath),
  
  // Update-related APIs
  checkForUpdates: () => 
    ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () =>
    ipcRenderer.invoke('download-update'),
  installUpdate: () =>
    ipcRenderer.invoke('install-update'),
  getUpdateStatus: () =>
    ipcRenderer.invoke('get-update-status'),

  // Dependency installation
  checkInstallationCapabilities: () => 
    ipcRenderer.invoke('check-installation-capabilities'),
  installFFmpeg: () => 
    ipcRenderer.invoke('install-ffmpeg'),
  installWhisper: () => 
    ipcRenderer.invoke('install-whisper'),
  refreshDependencyDetection: () =>
    ipcRenderer.invoke('refresh-dependency-detection'),
  
  // Update event listeners
  onUpdateAvailable: (callback: (updateInfo: any) => void) => {
    ipcRenderer.on('update-available', (_, updateInfo) => callback(updateInfo));
  },
  onUpdateDownloaded: (callback: (updateInfo: any) => void) => {
    ipcRenderer.on('update-downloaded', (_, updateInfo) => callback(updateInfo));
  },
  onUpdateDownloadProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('update-download-progress', (_, progress) => callback(progress));
  },
  onUpdateError: (callback: (error: string) => void) => {
    ipcRenderer.on('update-error', (_, error) => callback(error));
  },
  onShowUpdateChangelog: (callback: (updateInfo: any) => void) => {
    ipcRenderer.on('show-update-changelog', (_, updateInfo) => callback(updateInfo));
  },
  
  // Remove update event listeners
  removeUpdateListeners: () => {
    ipcRenderer.removeAllListeners('update-available');
    ipcRenderer.removeAllListeners('update-downloaded');
    ipcRenderer.removeAllListeners('update-download-progress');
    ipcRenderer.removeAllListeners('update-error');
    ipcRenderer.removeAllListeners('show-update-changelog');
  }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;