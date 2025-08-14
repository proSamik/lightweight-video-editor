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
  generateDescription: (captions: any[], customPrompt?: string) =>
    ipcRenderer.invoke('generate-description', captions, customPrompt),
  generateTitles: (description: string, captions: any[], customPrompt?: string) =>
    ipcRenderer.invoke('generate-titles', description, captions, customPrompt),
  generateTweetHooks: (captions: any[], customPrompt?: string) =>
    ipcRenderer.invoke('generate-tweet-hooks', captions, customPrompt),
  generateThumbnailIdeas: (captions: any[], customPrompt?: string) =>
    ipcRenderer.invoke('generate-thumbnail-ideas', captions, customPrompt),
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
    ipcRenderer.invoke('extract-audio-for-project', videoPath, projectPath)
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;