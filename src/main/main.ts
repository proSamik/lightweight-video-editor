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
import { UpdateService } from '../services/updateService';
import DependencyInstaller from '../services/dependencyInstaller';
import AISubtitleExporter from '../services/aiSubtitleExporter';

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
  
  // Initialize update service
  try {
    const updateService = UpdateService.getInstance();
    updateService.setMainWindow(mainWindow);
    
    // Check for updates on startup (after a delay to let the app fully load)
    setTimeout(() => {
      updateService.checkForUpdates().catch(console.error);
    }, 5000); // 5 second delay
    
    // Setup periodic update checks
    updateService.setupPeriodicChecks();
    
    console.log('Update service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize update service:', error);
  }
});

// Handle app lifecycle events for proper cleanup
app.on('window-all-closed', () => {
  // Cleanup FFmpeg processes before quitting
  try {
    const ffmpegService = FFmpegService.getInstance();
    ffmpegService.cleanup();
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

// Check if file exists
ipcMain.handle('file-exists', async (_event, filePath: string) => {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    console.error('Error checking file existence:', error);
    return false;
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
    defaultPath: outputName || 'extracted_audio.wav',
    filters: [
      {
        name: 'WAV Audio',
        extensions: ['wav'],
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

ipcMain.handle('transcribe-audio', async (event, audioPath: string, model: string = 'base') => {
  try {
    const whisperService = WhisperService.getInstance();
    return await whisperService.transcribeAudio(audioPath, (progress: number, speed?: string, eta?: string) => {
      // Send progress updates to renderer
      event.sender.send('transcription-progress', progress, speed, eta);
    }, model);
  } catch (error) {
    throw new Error(`Failed to transcribe audio: ${error}`);
  }
});

ipcMain.handle('check-dependencies', async () => {
  const ffmpegService = FFmpegService.getInstance();
  const whisperService = WhisperService.getInstance();
  
  const ffmpegStatus = ffmpegService.getDetailedAvailability();
  const whisperStatus = whisperService.getDetailedAvailability();
  
  return {
    ffmpeg: ffmpegStatus.available,
    whisper: whisperStatus.available,
    ffmpegDetails: ffmpegStatus,
    whisperDetails: whisperStatus
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
    // Check if this is a cancellation (expected behavior)
    if (error instanceof Error && error.message.includes('cancelled')) {
      throw error; // Re-throw cancellation errors as-is
    }
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

ipcMain.handle('render-video-with-ai-subtitles', async (event, videoPath: string, aiSubtitleData: any, outputPath: string, exportSettings?: any, replacementAudioPath?: string) => {
  try {
    // Convert AI subtitle data to captions format for now
    // TODO: Update FFmpeg services to work directly with AI subtitles
    const captionsData = aiSubtitleData.frames.map((frame: any) => {
      const visibleWords = Array.isArray(frame.words)
        ? frame.words.filter((w: any) => w && !w.isPause && w.editState !== 'removedCaption')
        : [];

      const mergedStyle = {
        font: frame.style?.font || 'Arial',
        fontSize: frame.style?.fontSize ?? 85,
        textColor: frame.style?.textColor || '#ffffff',
        highlighterColor: frame.style?.highlighterColor || '#ffff00',
        backgroundColor: frame.style?.backgroundColor ?? 'transparent',
        strokeColor: frame.style?.strokeColor,
        strokeWidth: frame.style?.strokeWidth,
        textTransform: frame.style?.textTransform,
        position: {
          x: frame.style?.position?.x ?? 50,
          y: frame.style?.position?.y ?? 85,
          z: frame.style?.position?.z ?? 0,
        },
        scale: frame.style?.scale ?? 1,
        emphasizeMode: frame.style?.emphasizeMode ?? true,
        renderMode: frame.style?.renderMode || 'horizontal',
        textAlign: frame.style?.textAlign || 'center',
        burnInSubtitles: frame.style?.burnInSubtitles !== false,
      };

      return {
        id: frame.id,
        startTime: Math.round(frame.startTime * 1000),
        endTime: Math.round(frame.endTime * 1000),
        text: visibleWords.map((w: any) => w.word).join(' '),
        words: visibleWords.map((w: any) => ({
          word: w.word,
          start: Math.round(w.start * 1000),
          end: Math.round(w.end * 1000),
          editState: w.editState || 'normal',
        })),
        style: mergedStyle,
      };
    });

    const ffmpegService = FFmpegService.getInstance();
    
    if (replacementAudioPath) {
      // First render video with captions to a temp file
      const tempVideoPath = outputPath.replace('.mp4', '_temp_with_subtitles.mp4');
      await ffmpegService.renderVideoWithBurnedCaptions(videoPath, captionsData, tempVideoPath, (progress: number) => {
        // Send progress updates to renderer (first 80% for subtitle rendering)
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
    // Check if this is a cancellation (expected behavior)
    if (error instanceof Error && error.message.includes('cancelled')) {
      throw error; // Re-throw cancellation errors as-is
    }
    throw new Error(`Failed to render video with AI subtitles: ${error}`);
  }
});

ipcMain.handle('handle-file-drop', async (_event, filePath: string) => {
  // Send the dropped file path to the renderer
  mainWindow.webContents.send('file-dropped', filePath);
  return true;
});

ipcMain.handle('transcribe-audio-segments', async (event, audioPath: string, timelineSelections: any[], model: string = 'base') => {
  try {
    const whisperService = WhisperService.getInstance();
    return await whisperService.transcribeAudioSegments(audioPath, timelineSelections, (progress: number, speed?: string, eta?: string) => {
      // Send progress updates to renderer
      event.sender.send('transcription-progress', progress, speed, eta);
    }, model);
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
    console.log(`[MAIN] Loading project: ${filePath}`);
    const projectManager = ProjectManager.getInstance();
    const result = await projectManager.loadProject(filePath);
    console.log(`[MAIN] Project loaded successfully: ${filePath}`);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[MAIN] Project loading failed for ${filePath}:`, errorMessage);
    throw new Error(`Failed to load project: ${errorMessage}`);
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

ipcMain.handle('generate-description', async (_event, captionText: string, customPrompt?: string) => {
  try {
    const aiService = AIService.getInstance();
    return await aiService.generateDescription(captionText, customPrompt);
  } catch (error) {
    console.error('Failed to generate description:', error);
    throw new Error(`Failed to generate description: ${error}`);
  }
});

ipcMain.handle('generate-titles', async (_event, description: string, captionText: string, customPrompt?: string) => {
  try {
    const aiService = AIService.getInstance();
    return await aiService.generateTitles(description, captionText, customPrompt);
  } catch (error) {
    console.error('Failed to generate titles:', error);
    throw new Error(`Failed to generate titles: ${error}`);
  }
});

ipcMain.handle('generate-tweet-hooks', async (_event, captionText: string, customPrompt?: string) => {
  try {
    const aiService = AIService.getInstance();
    return await aiService.generateTweetHooks(captionText, customPrompt);
  } catch (error) {
    console.error('Failed to generate tweet hooks:', error);
    throw new Error(`Failed to generate tweet hooks: ${error}`);
  }
});

ipcMain.handle('generate-thumbnail-ideas', async (_event, captionText: string, customPrompt?: string) => {
  try {
    const aiService = AIService.getInstance();
    return await aiService.generateThumbnailIdeas(captionText, customPrompt);
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

// Update-related IPC handlers
ipcMain.handle('check-for-updates', async () => {
  try {
    const updateService = UpdateService.getInstance();
    await updateService.checkForUpdates();
    return { success: true };
  } catch (error) {
    console.error('Failed to check for updates:', error);
    throw new Error(`Failed to check for updates: ${error}`);
  }
});

ipcMain.handle('download-update', async () => {
  try {
    const updateService = UpdateService.getInstance();
    await updateService.downloadUpdate();
    return { success: true };
  } catch (error) {
    console.error('Failed to download update:', error);
    throw new Error(`Failed to download update: ${error}`);
  }
});

ipcMain.handle('install-update', async () => {
  try {
    const updateService = UpdateService.getInstance();
    updateService.quitAndInstall();
    return { success: true };
  } catch (error) {
    console.error('Failed to install update:', error);
    throw new Error(`Failed to install update: ${error}`);
  }
});

ipcMain.handle('get-update-status', async () => {
  try {
    const updateService = UpdateService.getInstance();
    return updateService.getUpdateStatus();
  } catch (error) {
    console.error('Failed to get update status:', error);
    throw new Error(`Failed to get update status: ${error}`);
  }
});

// Dependency installation handlers
ipcMain.handle('check-installation-capabilities', async () => {
  try {
    const installer = DependencyInstaller.getInstance();
    return await installer.checkInstallationCapabilities();
  } catch (error) {
    console.error('Failed to check installation capabilities:', error);
    throw new Error(`Failed to check installation capabilities: ${error}`);
  }
});

ipcMain.handle('install-ffmpeg', async (event) => {
  try {
    const installer = DependencyInstaller.getInstance();
    return await installer.installFFmpeg((progress) => {
      event.sender.send('installation-progress', 'ffmpeg', progress);
    });
  } catch (error) {
    console.error('Failed to install FFmpeg:', error);
    throw new Error(`Failed to install FFmpeg: ${error}`);
  }
});

ipcMain.handle('install-whisper', async (event) => {
  try {
    const installer = DependencyInstaller.getInstance();
    return await installer.installWhisper((progress) => {
      event.sender.send('installation-progress', 'whisper', progress);
    });
  } catch (error) {
    console.error('Failed to install Whisper:', error);
    throw new Error(`Failed to install Whisper: ${error}`);
  }
});

ipcMain.handle('refresh-dependency-detection', async () => {
  try {
    // Force re-detection of dependencies by creating new service instances
    // Note: This is a simplified approach - in production you'd want more sophisticated instance management
    
    // Get new instances (which will trigger path detection)
    const ffmpegService = FFmpegService.getInstance();
    const whisperService = WhisperService.getInstance();
    
    // Return updated status
    const ffmpegStatus = ffmpegService.getDetailedAvailability();
    const whisperStatus = whisperService.getDetailedAvailability();
    
    return {
      ffmpeg: ffmpegStatus.available,
      whisper: whisperStatus.available,
      ffmpegDetails: ffmpegStatus,
      whisperDetails: whisperStatus
    };
  } catch (error) {
    console.error('Failed to refresh dependency detection:', error);
    throw new Error(`Failed to refresh dependency detection: ${error}`);
  }
});

// AI Subtitles export handlers
ipcMain.handle('export-ai-subtitles-srt', async (_event, aiSubtitleData: any) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export AI Subtitles as SRT',
      defaultPath: 'ai-subtitles.srt',
      filters: [
        { name: 'SRT Files', extensions: ['srt'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Export cancelled' };
    }

    const exporter = AISubtitleExporter.getInstance();
    const defaultStyle = {
      font: 'Arial',
      fontSize: 24,
      textColor: '#ffffff',
      highlighterColor: '#ffff00',
      backgroundColor: 'transparent',
      position: { x: 50, y: 85 }
    };
    const outputPath = await exporter.exportModifiedVideo(
      '', // No video path needed for SRT only
      '', // No audio path needed for SRT only
      aiSubtitleData,
      defaultStyle,
      result.filePath,
      { exportMode: 'subtitlesOnly', framerate: 30, quality: 'balanced' },
      (progress, message) => {
        _event.sender.send('export-progress', progress, message);
      }
    );

    return { success: true, path: outputPath };
  } catch (error) {
    console.error('Failed to export AI subtitles as SRT:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('export-modified-video', async (event, aiSubtitleData: any, videoPath: string, audioPath?: string) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Modified Video',
      defaultPath: 'modified-video.mp4',
      filters: [
        { name: 'Video Files', extensions: ['mp4'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Export cancelled' };
    }

    const exporter = AISubtitleExporter.getInstance();
    const defaultStyle = {
      font: 'Arial',
      fontSize: 85,
      textColor: '#ffffff',
      highlighterColor: '#ffff00',
      backgroundColor: 'transparent',
      strokeColor: '#000000',
      strokeWidth: 2,
      textTransform: 'none' as const,
      position: { x: 50, y: 80, z: 0 },
      renderMode: 'horizontal' as const,
      textAlign: 'center' as const,
      scale: 1,
      emphasizeMode: true,
      burnInSubtitles: true,
    };
    
    const exportSettings = { 
      exportMode: 'complete' as const, 
      framerate: 30 as const, 
      quality: 'balanced' as const 
    };

    console.log(`[Main] Starting modified video export with videoPath: ${videoPath}, audioPath: ${audioPath}`);
    
    const outputPath = await exporter.exportModifiedVideo(
      videoPath,
      audioPath || '', // Use empty string if no audio path provided
      aiSubtitleData,
      defaultStyle,
      result.filePath,
      exportSettings,
      (progress, message) => {
        event.sender.send('export-progress', progress, message);
      }
    );

    return { success: true, path: outputPath };
  } catch (error) {
    console.error('Failed to export modified video:', error);
    return { success: false, error: (error as Error).message };
  }
});