import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import FFmpegService from '../services/ffmpeg';
import WhisperService from '../services/whisper';
import VideoEditor from '../services/videoEditor';
import ProjectManager from '../services/projectManager';
import { SrtExporter } from '../services/srtExporter';
import { AIService } from '../services/aiService';
import { SettingsManager } from '../services/settingsManager';

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
    resizable: true, // Explicitly enable resizing
    trafficLightPosition: { x: 20, y: 20 }
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

app.whenReady().then(async () => {
  createWindow();
  
  // Initialize AI service with saved settings
  try {
    const settingsManager = SettingsManager.getInstance();
    const savedSettings = settingsManager.loadDecryptedSettings();
    
    // Check if we have at least one API key configured
    const hasApiKey = savedSettings.openrouterApiKey || 
                     savedSettings.anthropicApiKey || 
                     savedSettings.googleAiApiKey;
    
    if (hasApiKey) {
      const aiService = AIService.getInstance();
      aiService.setSettings(savedSettings);
      console.log('AI settings loaded successfully on startup');
    }
  } catch (error) {
    console.error('Failed to load AI settings on startup:', error);
  }
});

// Handle app lifecycle events for proper cleanup
app.on('window-all-closed', () => {
  // Cleanup FFmpeg processes before quitting
  try {
    const ffmpegService = FFmpegService.getInstance();
    ffmpegService.cleanup();
    
    const { StreamingVideoRenderer } = require('../services/streamingRenderer');
    const renderer = StreamingVideoRenderer.getInstance();
    renderer.cleanup();
  } catch (error) {
    console.warn('Error during cleanup:', error);
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  // Ensure cleanup happens before app quits
  try {
    const ffmpegService = FFmpegService.getInstance();
    ffmpegService.cleanup();
    
    const { StreamingVideoRenderer } = require('../services/streamingRenderer');
    const renderer = StreamingVideoRenderer.getInstance();
    renderer.cleanup();
  } catch (error) {
    console.warn('Error during cleanup:', error);
  }
});

// Handle process termination signals
process.on('SIGINT', () => {
  console.log('Received SIGINT, cleaning up...');
  try {
    const ffmpegService = FFmpegService.getInstance();
    ffmpegService.cleanup();
    
    const { StreamingVideoRenderer } = require('../services/streamingRenderer');
    const renderer = StreamingVideoRenderer.getInstance();
    renderer.cleanup();
  } catch (error) {
    console.warn('Error during cleanup:', error);
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, cleaning up...');
  try {
    const ffmpegService = FFmpegService.getInstance();
    ffmpegService.cleanup();
    
    const { StreamingVideoRenderer } = require('../services/streamingRenderer');
    const renderer = StreamingVideoRenderer.getInstance();
    renderer.cleanup();
  } catch (error) {
    console.warn('Error during cleanup:', error);
  }
  process.exit(0);
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

// Handle file URL conversion for WaveSurfer and other components
ipcMain.handle('get-file-url', async (_event, filePath: string) => {
  try {
    // Convert to file:// URL for use in renderer process
    return `file://${filePath}`;
  } catch (error) {
    console.error('Error creating file URL:', error);
    return null;
  }
});

// Get audio buffer for WaveSurfer
ipcMain.handle('get-audio-buffer', async (_event, filePath: string) => {
  try {
    if (!fs.existsSync(filePath)) {
      console.error('File does not exist:', filePath);
      return null;
    }
    
    // Check file size first - Node.js has 2GB limit for buffers
    const stats = fs.statSync(filePath);
    const fileSizeInBytes = stats.size;
    const maxSizeInBytes = 2 * 1024 * 1024 * 1024 - 1; // 2GB - 1 byte
    
    if (fileSizeInBytes > maxSizeInBytes) {
      console.warn(`File too large for audio buffer (${(fileSizeInBytes / (1024 * 1024 * 1024)).toFixed(1)}GB). Waveform will be skipped.`);
      return null;
    }
    
    // Also skip very large files that might cause memory issues (>500MB)
    const reasonableSizeLimit = 500 * 1024 * 1024; // 500MB
    if (fileSizeInBytes > reasonableSizeLimit) {
      console.warn(`File size (${(fileSizeInBytes / (1024 * 1024)).toFixed(1)}MB) exceeds reasonable limit for waveform generation. Skipping.`);
      return null;
    }
    
    // Read file as buffer
    const buffer = fs.readFileSync(filePath);
    return buffer;
  } catch (error) {
    console.error('Error reading audio buffer:', error);
    return null;
  }
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

// Audio file handlers
ipcMain.handle('select-audio-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      {
        name: 'Audio Files',
        extensions: ['mp3', 'wav', 'aac', 'm4a', 'flac', 'ogg'],
      },
    ],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('export-audio', async (_event, videoPath: string, outputName?: string) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: outputName || 'extracted_audio.mp3',
    filters: [
      {
        name: 'MP3 Audio',
        extensions: ['mp3'],
      },
      {
        name: 'WAV Audio',
        extensions: ['wav'],
      },
      {
        name: 'All Audio Files',
        extensions: ['mp3', 'wav', 'aac', 'm4a'],
      },
    ],
  });

  if (!result.canceled && result.filePath) {
    try {
      const ffmpegService = FFmpegService.getInstance();
      await ffmpegService.extractAudioToFile(videoPath, result.filePath);
      return result.filePath;
    } catch (error) {
      throw new Error(`Failed to export audio: ${error}`);
    }
  }
  return null;
});

ipcMain.handle('replace-audio-track', async (_event, videoPath: string, audioPath: string, outputName?: string) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: outputName || 'video_with_new_audio.mp4',
    filters: [
      {
        name: 'Video Files',
        extensions: ['mp4'],
      },
    ],
  });

  if (!result.canceled && result.filePath) {
    try {
      const ffmpegService = FFmpegService.getInstance();
      await ffmpegService.replaceAudioTrack(videoPath, audioPath, result.filePath);
      return result.filePath;
    } catch (error) {
      throw new Error(`Failed to replace audio track: ${error}`);
    }
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

ipcMain.handle('extract-audio-for-project', async (_event, videoPath: string, projectPath: string) => {
  try {
    const ffmpegService = FFmpegService.getInstance();
    const projectManager = ProjectManager.getInstance();
    
    // Ensure the project assets directory exists
    const assetsDir = projectManager.ensureProjectAssetsDirectory(projectPath);
    
    // Extract audio to the project assets directory
    return await ffmpegService.extractAudioForProject(videoPath, assetsDir);
  } catch (error) {
    throw new Error(`Failed to extract audio for project: ${error}`);
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

ipcMain.handle('render-video-with-captions', async (event, videoPath: string, captionsData: any[], outputPath: string, exportSettings?: any, replacementAudioPath?: string) => {
  try {
    const ffmpegService = FFmpegService.getInstance();
    
    if (replacementAudioPath) {
      // First render video with captions to a temp file
      const tempVideoPath = outputPath.replace('.mp4', '_temp_with_captions.mp4');
      await ffmpegService.renderVideoWithBurnedCaptions(videoPath, captionsData, tempVideoPath, (progress: number) => {
        // Send progress updates to renderer (first 80% for caption rendering)
        event.sender.send('rendering-progress', progress * 0.8);
      }, exportSettings);
      
      // Then replace the audio track
      await ffmpegService.replaceAudioTrack(tempVideoPath, replacementAudioPath, outputPath);
      
      // Send final progress
      event.sender.send('rendering-progress', 100);
      
      // Clean up temp file
      const fs = require('fs');
      try {
        fs.unlinkSync(tempVideoPath);
      } catch (cleanupError) {
        console.warn('Failed to clean up temp file:', cleanupError);
      }
      
      return outputPath;
    } else {
      // Normal rendering without audio replacement
      return await ffmpegService.renderVideoWithBurnedCaptions(videoPath, captionsData, outputPath, (progress: number) => {
        // Send progress updates to renderer
        event.sender.send('rendering-progress', progress);
      }, exportSettings);
    } 
  } catch (error) {
    throw new Error(`Failed to render video: ${error}`);
  }
});

ipcMain.handle('export-video-with-new-audio', async (event, videoPath: string, newAudioPath: string, outputPath: string) => {
  try {
    const ffmpegService = FFmpegService.getInstance();
    
    return await ffmpegService.exportVideoWithNewAudio(
      videoPath,
      newAudioPath,
      outputPath,
      (progress: number) => {
        // Send progress updates to renderer
        event.sender.send('rendering-progress', progress);
      }
    );
  } catch (error) {
    throw new Error(`Failed to export video with new audio: ${error}`);
  }
});

ipcMain.handle('handle-file-drop', async (_event, filePath: string) => {
  // Send the dropped file path to the renderer
  mainWindow.webContents.send('file-dropped', filePath);
  return true;
});

ipcMain.handle('transcribe-audio-segments', async (event, audioPath: string, timelineSelections: any[]) => {
  try {
    const whisperService = WhisperService.getInstance();
    return await whisperService.transcribeAudioSegments(audioPath, timelineSelections, (progress: number) => {
      // Send progress updates to renderer
      event.sender.send('transcription-progress', progress);
    });
  } catch (error) {
    throw new Error(`Failed to transcribe audio segments: ${error}`);
  }
});

ipcMain.handle('show-item-in-folder', async (_event, filePath: string) => {
  try {
    shell.showItemInFolder(filePath);
    return true;
  } catch (error) {
    console.error('Failed to show item in folder:', error);
    return false;
  }
});

// Project management handlers
ipcMain.handle('save-project', async (_event, projectData: any, fileName?: string) => {
  try {
    const projectManager = ProjectManager.getInstance();
    return await projectManager.saveProject(projectData, fileName);
  } catch (error) {
    throw new Error(`Failed to save project: ${error}`);
  }
});

ipcMain.handle('load-project', async (_event, filePath: string) => {
  try {
    const projectManager = ProjectManager.getInstance();
    return await projectManager.loadProject(filePath);
  } catch (error) {
    throw new Error(`Failed to load project: ${error}`);
  }
});

ipcMain.handle('list-recent-projects', async () => {
  try {
    const projectManager = ProjectManager.getInstance();
    return await projectManager.listRecentProjects();
  } catch (error) {
    throw new Error(`Failed to list recent projects: ${error}`);
  }
});

ipcMain.handle('delete-project', async (_event, filePath: string) => {
  try {
    const projectManager = ProjectManager.getInstance();
    return await projectManager.deleteProject(filePath);
  } catch (error) {
    throw new Error(`Failed to delete project: ${error}`);
  }
});

ipcMain.handle('rename-project', async (_event, filePath: string, newName: string) => {
  try {
    const projectManager = ProjectManager.getInstance();
    return await projectManager.renameProject(filePath, newName);
  } catch (error) {
    throw new Error(`Failed to rename project: ${error}`);
  }
});

// Enhanced project management handlers
ipcMain.handle('save-project-as', async (_event, projectData: any, fileName?: string) => {
  try {
    const projectManager = ProjectManager.getInstance();
    return await projectManager.saveProjectAs(projectData, fileName);
  } catch (error) {
    throw new Error(`Failed to save project as: ${error}`);
  }
});

ipcMain.handle('get-current-project-info', async () => {
  try {
    const projectManager = ProjectManager.getInstance();
    return {
      projectPath: projectManager.getCurrentProjectPath(),
      projectName: projectManager.getCurrentProjectName(),
      isModified: projectManager.isProjectModified()
    };
  } catch (error) {
    console.error('Failed to get current project info:', error);
    return {
      projectPath: null,
      projectName: 'Untitled Project',
      isModified: false
    };
  }
});

ipcMain.handle('mark-project-modified', async () => {
  try {
    const projectManager = ProjectManager.getInstance();
    projectManager.markProjectModified();
    return true;
  } catch (error) {
    console.error('Failed to mark project as modified:', error);
    return false;
  }
});

ipcMain.handle('create-new-project', async () => {
  try {
    const projectManager = ProjectManager.getInstance();
    projectManager.createNewProject();
    return true;
  } catch (error) {
    console.error('Failed to create new project:', error);
    return false;
  }
});

ipcMain.handle('apply-word-deletions', async (_event, inputVideoPath: string, originalCaptions: any[], updatedCaptions: any[], outputPath: string) => {
  try {
    const videoEditor = VideoEditor.getInstance();
    return await videoEditor.applyWordDeletions(inputVideoPath, originalCaptions, updatedCaptions, outputPath);
  } catch (error) {
    throw new Error(`Failed to apply word deletions: ${error}`);
  }
});

// SRT export handler
ipcMain.handle('export-srt', async (_event, captions: any[], defaultFileName?: string) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultFileName || 'subtitles.srt',
      filters: [
        { name: 'SubRip Subtitle', extensions: ['srt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true };
    }

    const srtContent = SrtExporter.exportToSrt(captions);
    fs.writeFileSync(result.filePath, srtContent, 'utf8');

    return { success: true, filePath: result.filePath };
  } catch (error) {
    console.error('Failed to export SRT:', error);
    throw new Error(`Failed to export SRT: ${error}`);
  }
});

// AI and Settings handlers
ipcMain.handle('load-ai-settings', async () => {
  try {
    const settingsManager = SettingsManager.getInstance();
    return settingsManager.loadDecryptedSettings();
  } catch (error) {
    console.error('Failed to load AI settings:', error);
    throw new Error(`Failed to load AI settings: ${error}`);
  }
});

ipcMain.handle('save-ai-settings', async (_event, settings: any) => {
  try {
    const settingsManager = SettingsManager.getInstance();
    settingsManager.saveSettings(settings);
    
    // Update AI service with new settings
    const aiService = AIService.getInstance();
    aiService.setSettings(settings);
    
    return { success: true };
  } catch (error) {
    console.error('Failed to save AI settings:', error);
    throw new Error(`Failed to save AI settings: ${error}`);
  }
});

ipcMain.handle('test-ai-connection', async (_event, settings: any) => {
  try {
    const aiService = AIService.getInstance();
    aiService.setSettings(settings);
    return await aiService.testConnection();
  } catch (error) {
    console.error('AI connection test failed:', error);
    return false;
  }
});

ipcMain.handle('generate-description', async (_event, captions: any[], customPrompt?: string) => {
  try {
    const aiService = AIService.getInstance();
    return await aiService.generateDescription(captions, customPrompt);
  } catch (error) {
    console.error('Failed to generate description:', error);
    throw new Error(`Failed to generate description: ${error}`);
  }
});

ipcMain.handle('generate-titles', async (_event, description: string, captions: any[], customPrompt?: string) => {
  try {
    const aiService = AIService.getInstance();
    return await aiService.generateTitles(description, captions, customPrompt);
  } catch (error) {
    console.error('Failed to generate titles:', error);
    throw new Error(`Failed to generate titles: ${error}`);
  }
});

ipcMain.handle('generate-tweet-hooks', async (_event, captions: any[], customPrompt?: string) => {
  try {
    const aiService = AIService.getInstance();
    return await aiService.generateTweetHooks(captions, customPrompt);
  } catch (error) {
    console.error('Failed to generate tweet hooks:', error);
    throw new Error(`Failed to generate tweet hooks: ${error}`);
  }
});

ipcMain.handle('generate-thumbnail-ideas', async (_event, captions: any[], customPrompt?: string) => {
  try {
    const aiService = AIService.getInstance();
    return await aiService.generateThumbnailIdeas(captions, customPrompt);
  } catch (error) {
    console.error('Failed to generate thumbnail ideas:', error);
    throw new Error(`Failed to generate thumbnail ideas: ${error}`);
  }
});

ipcMain.handle('get-available-models', async (_event, settings: any) => {
  try {
    const aiService = AIService.getInstance();
    aiService.setSettings(settings);
    return await aiService.getAvailableModels();
  } catch (error) {
    console.error('Failed to get available models:', error);
    throw new Error(`Failed to get available models: ${error}`);
  }
});

ipcMain.handle('cancel-rendering', async () => {
  try {
    const ffmpegService = FFmpegService.getInstance();
    ffmpegService.cancelRendering();
    return { success: true };
  } catch (error) {
    console.error('Failed to cancel rendering:', error);
    throw new Error(`Failed to cancel rendering: ${error}`);
  }
});

ipcMain.handle('rename-project-file', async (_event, filePath: string, newName: string) => {
  try {
    const projectManager = ProjectManager.getInstance();
    await projectManager.renameProject(filePath, newName);
    return { success: true };
  } catch (error) {
    console.error('Failed to rename project file:', error);
    throw new Error(`Failed to rename project file: ${error}`);
  }
});

ipcMain.handle('rename-current-project', async (_event, newName: string) => {
  try {
    const projectManager = ProjectManager.getInstance();
    await projectManager.renameCurrentProject(newName);
    return { success: true };
  } catch (error) {
    console.error('Failed to rename current project:', error);
    throw new Error(`Failed to rename current project: ${error}`);
  }
});