import { contextBridge, ipcRenderer, webUtils } from 'electron';

const electronAPI = {
  selectVideoFile: () => ipcRenderer.invoke('select-video-file'),
  exportVideo: (outputPath: string) => ipcRenderer.invoke('export-video', outputPath),
  getVideoMetadata: (videoPath: string) => ipcRenderer.invoke('get-video-metadata', videoPath),
  extractAudio: (videoPath: string) => ipcRenderer.invoke('extract-audio', videoPath),
  transcribeAudio: (audioPath: string) => ipcRenderer.invoke('transcribe-audio', audioPath),
  transcribeAudioSegments: (audioPath: string, timelineSelections: any[]) => 
    ipcRenderer.invoke('transcribe-audio-segments', audioPath, timelineSelections),
  checkDependencies: () => ipcRenderer.invoke('check-dependencies'),
  testWhisperInstallation: () => ipcRenderer.invoke('test-whisper-installation'),
  renderVideoWithCaptions: (videoPath: string, captionsData: any[], outputPath: string, exportSettings?: any) => 
    ipcRenderer.invoke('render-video-with-captions', videoPath, captionsData, outputPath, exportSettings),
  handleFileDrop: (filePath: string) => ipcRenderer.invoke('handle-file-drop', filePath),
  onFileDropped: (callback: (filePath: string) => void) => {
    ipcRenderer.on('file-dropped', (_event, filePath) => callback(filePath));
  },
  // New method to get file path from File object using webUtils
  getFilePath: (file: File) => webUtils.getPathForFile(file),
  showItemInFolder: (filePath: string) => ipcRenderer.invoke('show-item-in-folder', filePath),
  applyWordDeletions: (inputVideoPath: string, originalCaptions: any[], updatedCaptions: any[], outputPath: string) =>
    ipcRenderer.invoke('apply-word-deletions', inputVideoPath, originalCaptions, updatedCaptions, outputPath),
  onTranscriptionProgress: (callback: (progress: number) => void) => {
    ipcRenderer.on('transcription-progress', (_, progress) => callback(progress));
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
  getAvailableModels: (settings: any) =>
    ipcRenderer.invoke('get-available-models', settings)
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;