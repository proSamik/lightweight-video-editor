import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as os from 'os';
import FFmpegService from '../services/ffmpeg';
import WhisperService from '../services/whisper';
import VideoEditor from '../services/videoEditor';

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
      webSecurity: false, // Allow file:// protocol for local video files
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

  // Enable drag and drop
  mainWindow.webContents.on('dom-ready', () => {
    mainWindow.webContents.executeJavaScript(`
      document.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const files = Array.from(e.dataTransfer.files);
        const videoFile = files.find(file => 
          file.type.startsWith('video/') || 
          /\\.(mp4|mov|avi)$/i.test(file.name)
        );
        
        if (videoFile) {
          // In Electron, files from drag and drop have a path property
          const filePath = videoFile.path || videoFile.webkitRelativePath || videoFile.name;
          window.electronAPI.handleFileDrop(filePath);
        }
      });
      
      document.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      
      document.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    `);
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

ipcMain.handle('handle-file-drop', async (_event, filePath: string) => {
  // Send the dropped file path to the renderer
  mainWindow.webContents.send('file-dropped', filePath);
  return true;
});

ipcMain.handle('apply-word-deletions', async (_event, inputVideoPath: string, originalCaptions: any[], updatedCaptions: any[], outputPath: string) => {
  try {
    const videoEditor = VideoEditor.getInstance();
    return await videoEditor.applyWordDeletions(inputVideoPath, originalCaptions, updatedCaptions, outputPath);
  } catch (error) {
    throw new Error(`Failed to apply word deletions: ${error}`);
  }
});