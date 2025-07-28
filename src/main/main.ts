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

  // Enable drag and drop using Electron's native support
  mainWindow.webContents.on('dom-ready', () => {
    // Handle file drops at the window level
    mainWindow.webContents.on('will-navigate', (event) => {
      event.preventDefault();
    });
    
    // Inject simpler drag and drop handler
    mainWindow.webContents.executeJavaScript(`
      console.log('Setting up drag and drop handlers...');
      
      document.addEventListener('drop', (e) => {
        console.log('Drop event triggered');
        e.preventDefault();
        e.stopPropagation();
        
        const files = Array.from(e.dataTransfer.files);
        console.log('Dropped files:', files.length);
        
        const videoFile = files.find(file => {
          const isVideoType = file.type.startsWith('video/');
          const isVideoExtension = /\.(mp4|mov|avi)$/i.test(file.name);
          console.log('Checking file:', file.name, 'type:', file.type, 'isVideo:', isVideoType || isVideoExtension);
          return isVideoType || isVideoExtension;
        });
        
        if (videoFile) {
          console.log('Video file found:', videoFile.name);
          try {
            const filePath = window.electronAPI.getFilePath(videoFile);
            console.log('File path obtained via webUtils:', filePath);
            window.electronAPI.handleFileDrop(filePath);
            console.log('handleFileDrop called successfully');
          } catch (error) {
            console.error('Error getting file path or calling handleFileDrop:', error);
          }
        } else {
          console.log('No video file found in drop');
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
      
      console.log('Drag and drop handlers set up successfully');
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

ipcMain.handle('transcribe-audio', async (event, audioPath: string) => {
  try {
    const whisperService = WhisperService.getInstance();
    return await whisperService.transcribeAudio(audioPath, (progress: number) => {
      // Send progress updates to renderer
      event.sender.send('transcription-progress', progress);
    });
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

ipcMain.handle('test-whisper-installation', async () => {
  const whisperService = WhisperService.getInstance();
  return await whisperService.testWhisperInstallation();
});

ipcMain.handle('render-video-with-captions', async (event, videoPath: string, captionsData: any[], outputPath: string) => {
  try {
    const ffmpegService = FFmpegService.getInstance();
    return await ffmpegService.renderVideoWithBurnedCaptions(videoPath, captionsData, outputPath, (progress: number) => {
      // Send progress updates to renderer
      event.sender.send('rendering-progress', progress);
    });
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