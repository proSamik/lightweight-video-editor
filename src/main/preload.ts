import { contextBridge, ipcRenderer, webUtils } from 'electron';

const electronAPI = {
  selectVideoFile: () => ipcRenderer.invoke('select-video-file'),
  exportVideo: (outputPath: string) => ipcRenderer.invoke('export-video', outputPath),
  getVideoMetadata: (videoPath: string) => ipcRenderer.invoke('get-video-metadata', videoPath),
  extractAudio: (videoPath: string) => ipcRenderer.invoke('extract-audio', videoPath),
  transcribeAudio: (audioPath: string) => ipcRenderer.invoke('transcribe-audio', audioPath),
  checkDependencies: () => ipcRenderer.invoke('check-dependencies'),
  renderVideoWithCaptions: (videoPath: string, captionsData: any[], outputPath: string) => 
    ipcRenderer.invoke('render-video-with-captions', videoPath, captionsData, outputPath),
  handleFileDrop: (filePath: string) => ipcRenderer.invoke('handle-file-drop', filePath),
  onFileDropped: (callback: (filePath: string) => void) => {
    ipcRenderer.on('file-dropped', (_event, filePath) => callback(filePath));
  },
  // New method to get file path from File object using webUtils
  getFilePath: (file: File) => webUtils.getPathForFile(file),
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
  }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;