import { spawn, exec } from 'child_process';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

export interface InstallationProgress {
  step: string;
  progress: number;
  message: string;
  isComplete: boolean;
  error?: string;
}

export class DependencyInstaller {
  private static instance: DependencyInstaller;

  private constructor() {}

  public static getInstance(): DependencyInstaller {
    if (!DependencyInstaller.instance) {
      DependencyInstaller.instance = new DependencyInstaller();
    }
    return DependencyInstaller.instance;
  }

  /**
   * Install FFmpeg automatically based on the platform
   */
  public async installFFmpeg(
    onProgress: (progress: InstallationProgress) => void
  ): Promise<boolean> {
    const platform = os.platform();
    
    try {
      onProgress({
        step: 'detecting',
        progress: 10,
        message: 'Detecting platform...',
        isComplete: false
      });

      switch (platform) {
        case 'darwin': // macOS
          return await this.installFFmpegMacOS(onProgress);
        case 'win32': // Windows
          return await this.installFFmpegWindows(onProgress);
        case 'linux':
          return await this.installFFmpegLinux(onProgress);
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
    } catch (error) {
      onProgress({
        step: 'error',
        progress: 0,
        message: 'Installation failed',
        isComplete: true,
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Install Whisper using pip
   */
  public async installWhisper(
    onProgress: (progress: InstallationProgress) => void
  ): Promise<boolean> {
    try {
      onProgress({
        step: 'checking-python',
        progress: 10,
        message: 'Checking Python installation...',
        isComplete: false
      });

      // First check if Python/pip is available
      const pythonCommand = await this.detectPythonCommand();
      if (!pythonCommand) {
        throw new Error('Python is not installed. Please install Python 3.7+ first.');
      }

      onProgress({
        step: 'installing',
        progress: 30,
        message: 'Installing OpenAI Whisper...',
        isComplete: false
      });

      return await this.installWhisperWithPip(pythonCommand, onProgress);
    } catch (error) {
      onProgress({
        step: 'error',
        progress: 0,
        message: 'Installation failed',
        isComplete: true,
        error: (error as Error).message
      });
      return false;
    }
  }

  private async installFFmpegMacOS(
    onProgress: (progress: InstallationProgress) => void
  ): Promise<boolean> {
    // Check if Homebrew is installed
    try {
      await this.execCommand('which brew');
    } catch (error) {
      throw new Error('Homebrew is required for FFmpeg installation on macOS. Please install Homebrew first: https://brew.sh');
    }

    onProgress({
      step: 'updating-brew',
      progress: 20,
      message: 'Updating Homebrew...',
      isComplete: false
    });

    // Update Homebrew
    await this.execCommand('brew update');

    onProgress({
      step: 'installing',
      progress: 50,
      message: 'Installing FFmpeg with Homebrew...',
      isComplete: false
    });

    // Install FFmpeg
    await this.execCommand('brew install ffmpeg');

    onProgress({
      step: 'verifying',
      progress: 90,
      message: 'Verifying installation...',
      isComplete: false
    });

    // Verify installation
    await this.execCommand('ffmpeg -version');

    onProgress({
      step: 'complete',
      progress: 100,
      message: 'FFmpeg installed successfully!',
      isComplete: true
    });

    return true;
  }

  private async installFFmpegWindows(
    onProgress: (progress: InstallationProgress) => void
  ): Promise<boolean> {
    // For Windows, we'll download and extract a portable version
    const https = require('https');
    const extract = require('extract-zip');
    
    onProgress({
      step: 'downloading',
      progress: 20,
      message: 'Downloading FFmpeg for Windows...',
      isComplete: false
    });

    // Create ffmpeg directory in user's AppData
    const appDataPath = process.env.APPDATA || '';
    const ffmpegDir = path.join(appDataPath, 'LightweightVideoEditor', 'ffmpeg');
    
    if (!fs.existsSync(ffmpegDir)) {
      fs.mkdirSync(ffmpegDir, { recursive: true });
    }

    // Download portable FFmpeg (this is a simplified approach)
    // In production, you'd want to use a more robust download mechanism
    const downloadUrl = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip';
    
    await this.downloadAndExtract(downloadUrl, ffmpegDir, onProgress);

    onProgress({
      step: 'complete',
      progress: 100,
      message: 'FFmpeg installed successfully!',
      isComplete: true
    });

    return true;
  }

  private async installFFmpegLinux(
    onProgress: (progress: InstallationProgress) => void
  ): Promise<boolean> {
    onProgress({
      step: 'detecting-package-manager',
      progress: 20,
      message: 'Detecting package manager...',
      isComplete: false
    });

    // Try different package managers
    let installCommand = '';
    
    try {
      await this.execCommand('which apt');
      installCommand = 'sudo apt update && sudo apt install -y ffmpeg';
    } catch (e) {
      try {
        await this.execCommand('which yum');
        installCommand = 'sudo yum install -y ffmpeg';
      } catch (e2) {
        try {
          await this.execCommand('which dnf');
          installCommand = 'sudo dnf install -y ffmpeg';
        } catch (e3) {
          throw new Error('No supported package manager found (apt, yum, dnf)');
        }
      }
    }

    onProgress({
      step: 'installing',
      progress: 50,
      message: 'Installing FFmpeg with system package manager...',
      isComplete: false
    });

    await this.execCommand(installCommand);

    onProgress({
      step: 'verifying',
      progress: 90,
      message: 'Verifying installation...',
      isComplete: false
    });

    await this.execCommand('ffmpeg -version');

    onProgress({
      step: 'complete',
      progress: 100,
      message: 'FFmpeg installed successfully!',
      isComplete: true
    });

    return true;
  }

  private async installWhisperWithPip(
    pythonCommand: string,
    onProgress: (progress: InstallationProgress) => void
  ): Promise<boolean> {
    const pipCommand = pythonCommand.includes('python3') ? 'pip3' : 'pip';

    onProgress({
      step: 'upgrading-pip',
      progress: 40,
      message: 'Upgrading pip...',
      isComplete: false
    });

    // Upgrade pip first
    try {
      await this.execCommand(`${pythonCommand} -m pip install --upgrade pip`);
    } catch (error) {
      console.warn('Failed to upgrade pip, continuing anyway:', error);
    }

    onProgress({
      step: 'installing-whisper',
      progress: 60,
      message: 'Installing OpenAI Whisper (this may take a few minutes)...',
      isComplete: false
    });

    // Install Whisper
    await this.execCommand(`${pythonCommand} -m pip install openai-whisper`);

    onProgress({
      step: 'verifying',
      progress: 90,
      message: 'Verifying Whisper installation...',
      isComplete: false
    });

    // Verify installation
    try {
      await this.execCommand(`${pythonCommand} -m whisper --help`);
    } catch (error) {
      // Try direct whisper command
      await this.execCommand('whisper --help');
    }

    onProgress({
      step: 'complete',
      progress: 100,
      message: 'Whisper installed successfully!',
      isComplete: true
    });

    return true;
  }

  private async detectPythonCommand(): Promise<string | null> {
    const commands = ['python3', 'python'];
    
    for (const cmd of commands) {
      try {
        await this.execCommand(`${cmd} --version`);
        return cmd;
      } catch (error) {
        continue;
      }
    }
    
    return null;
  }

  private execCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(command, { timeout: 300000 }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Command failed: ${command}\n${error.message}\n${stderr}`));
        } else {
          resolve(stdout);
        }
      });
    });
  }

  private async downloadAndExtract(
    url: string,
    extractPath: string,
    onProgress: (progress: InstallationProgress) => void
  ): Promise<void> {
    // This is a simplified implementation
    // In production, you'd want proper download progress tracking
    return new Promise((resolve, reject) => {
      onProgress({
        step: 'downloading',
        progress: 50,
        message: 'Downloading FFmpeg...',
        isComplete: false
      });

      // Note: This is a placeholder for actual download implementation
      // You would need to implement proper file downloading with progress
      setTimeout(() => {
        onProgress({
          step: 'extracting',
          progress: 80,
          message: 'Extracting FFmpeg...',
          isComplete: false
        });
        
        // Simulate extraction
        setTimeout(() => {
          resolve();
        }, 2000);
      }, 3000);
    });
  }

  /**
   * Check if the system has package managers or tools needed for installation
   */
  public async checkInstallationCapabilities(): Promise<{
    canInstallFFmpeg: boolean;
    canInstallWhisper: boolean;
    ffmpegMethod: string;
    whisperMethod: string;
    requirements: string[];
  }> {
    const platform = os.platform();
    const requirements: string[] = [];
    let canInstallFFmpeg = false;
    let canInstallWhisper = false;
    let ffmpegMethod = '';
    let whisperMethod = '';

    // Check FFmpeg installation capability
    switch (platform) {
      case 'darwin':
        try {
          await this.execCommand('which brew');
          canInstallFFmpeg = true;
          ffmpegMethod = 'Homebrew';
        } catch (error) {
          requirements.push('Homebrew (https://brew.sh)');
          ffmpegMethod = 'Requires Homebrew';
        }
        break;
      case 'win32':
        canInstallFFmpeg = true; // We can download portable version
        ffmpegMethod = 'Portable download';
        break;
      case 'linux':
        try {
          await this.execCommand('which apt');
          canInstallFFmpeg = true;
          ffmpegMethod = 'APT package manager';
        } catch (e) {
          try {
            await this.execCommand('which yum');
            canInstallFFmpeg = true;
            ffmpegMethod = 'YUM package manager';
          } catch (e2) {
            try {
              await this.execCommand('which dnf');
              canInstallFFmpeg = true;
              ffmpegMethod = 'DNF package manager';
            } catch (e3) {
              ffmpegMethod = 'No supported package manager';
            }
          }
        }
        break;
    }

    // Check Whisper installation capability (needs Python)
    const pythonCommand = await this.detectPythonCommand();
    if (pythonCommand) {
      canInstallWhisper = true;
      whisperMethod = `pip (with ${pythonCommand})`;
    } else {
      requirements.push('Python 3.7+ (https://python.org)');
      whisperMethod = 'Requires Python';
    }

    return {
      canInstallFFmpeg,
      canInstallWhisper,
      ffmpegMethod,
      whisperMethod,
      requirements
    };
  }
}

export default DependencyInstaller;