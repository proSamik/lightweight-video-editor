import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as os from 'os';
import FFmpegService from '../services/ffmpeg';
import WhisperService from '../services/whisper';

let mainWindow: BrowserWindow;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hiddenInset',
    show: false,
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle('select-video-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      {
        name: 'Video Files',
        extensions: ['mp4', 'mov', 'avi'],
      },
    ],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('export-video', async (_event, outputPath: string) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: outputPath,
    filters: [
      {
        name: 'Video Files',
        extensions: ['mp4'],
      },
    ],
  });

  if (!result.canceled && result.filePath) {
    return result.filePath;
  }
  return null;
});

// Video processing handlers
ipcMain.handle('get-video-metadata', async (_event, videoPath: string) => {
  try {
    const ffmpegService = FFmpegService.getInstance();
    return await ffmpegService.getVideoMetadata(videoPath);
  } catch (error) {
    throw new Error(`Failed to get video metadata: ${error}`);
  }
});

ipcMain.handle('extract-audio', async (_event, videoPath: string) => {
  try {
    const ffmpegService = FFmpegService.getInstance();
    const tempDir = os.tmpdir();
    return await ffmpegService.extractAudio(videoPath, tempDir);
  } catch (error) {
    throw new Error(`Failed to extract audio: ${error}`);
  }
});

ipcMain.handle('transcribe-audio', async (_event, audioPath: string) => {
  try {
    const whisperService = WhisperService.getInstance();
    return await whisperService.transcribeAudio(audioPath);
  } catch (error) {
    throw new Error(`Failed to transcribe audio: ${error}`);
  }
});

ipcMain.handle('check-dependencies', async () => {
  const ffmpegService = FFmpegService.getInstance();
  const whisperService = WhisperService.getInstance();
  
  return {
    ffmpeg: ffmpegService.checkFFmpegAvailability(),
    whisper: whisperService.checkWhisperAvailability()
  };
});

ipcMain.handle('render-video-with-captions', async (_event, videoPath: string, captionsData: any[], outputPath: string) => {
  try {
    const ffmpegService = FFmpegService.getInstance();
    return await ffmpegService.renderVideoWithBurnedCaptions(videoPath, captionsData, outputPath);
  } catch (error) {
    throw new Error(`Failed to render video: ${error}`);
  }
});