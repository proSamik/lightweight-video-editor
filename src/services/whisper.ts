import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { TranscriptionResult } from '../types';
import DeviceDetector, { DeviceInfo } from './deviceDetector';

export class WhisperService {
  private static instance: WhisperService;
  private whisperPath: string = '';
  private modelPath: string = '';
  private deviceDetector: DeviceDetector;
  private bestDevice: DeviceInfo | null = null;
  private deviceDetectionCompleted: boolean = false;

  private constructor() {
    this.deviceDetector = DeviceDetector.getInstance();
    this.detectWhisperPaths();
    this.initializeDeviceDetection();
  }

  private async initializeDeviceDetection(): Promise<void> {
    try {
      this.bestDevice = await this.deviceDetector.detectBestDevice();
      this.deviceDetectionCompleted = true;
      console.log(`Whisper will use device: ${this.bestDevice.type}`, this.bestDevice);
    } catch (error) {
      console.warn('Device detection failed, falling back to CPU:', error);
      this.bestDevice = { type: 'cpu', available: true, name: 'CPU Fallback' };
      this.deviceDetectionCompleted = true;
    }
  }

  public static getInstance(): WhisperService {
    if (!WhisperService.instance) {
      WhisperService.instance = new WhisperService();
    }
    return WhisperService.instance;
  }

  private detectWhisperPaths(): void {
    // Check common paths for Whisper installation
    const commonPaths = [
      '/usr/local/bin/whisper',
      '/opt/homebrew/bin/whisper',
      '/usr/bin/whisper',
      '/opt/homebrew/bin/python3',
      '/usr/bin/python3'
    ];

    // First try absolute paths
    for (const whisperPath of commonPaths) {
      try {
        if (fs.existsSync(whisperPath)) {
          // Test that the whisper path actually works
          const { execSync } = require('child_process');
          const env = {
            ...process.env,
            PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:${process.env.PATH || ''}`,
            PYTHONPATH: `/opt/homebrew/lib/python3.*/site-packages:${process.env.PYTHONPATH || ''}`
          };
          
          if (whisperPath.includes('python3')) {
            execSync(`"${whisperPath}" -m whisper --help`, { stdio: 'pipe', env, timeout: 10000 });
            this.whisperPath = `${whisperPath} -m whisper`;
          } else {
            execSync(`"${whisperPath}" --help`, { stdio: 'pipe', env, timeout: 10000 });
            this.whisperPath = whisperPath;
          }
          console.log(`Whisper found at: ${whisperPath}`);
          break;
        }
      } catch (error) {
        console.log(`Whisper test failed for path ${whisperPath}:`, (error as Error).message);
        continue;
      }
    }

    // If no absolute path found, try system PATH with enhanced environment
    if (!this.whisperPath) {
      try {
        const { execSync } = require('child_process');
        
        // Set up enhanced environment for PATH detection
        const env = {
          ...process.env,
          PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:${process.env.PATH || ''}`
        };
        
        // Try whisper command
        try {
          execSync('which whisper', { stdio: 'pipe', env });
          // Test that whisper actually works
          execSync('whisper --help', { stdio: 'pipe', env, timeout: 10000 });
          this.whisperPath = 'whisper';
          console.log('Whisper found in PATH');
        } catch (e) {
          // Try python3 -m whisper
          try {
            execSync('which python3', { stdio: 'pipe', env });
            // Test that python3 -m whisper actually works
            execSync('python3 -m whisper --help', { stdio: 'pipe', env, timeout: 10000 });
            this.whisperPath = 'python3 -m whisper';
            console.log('Python3 found in PATH, will use python3 -m whisper');
          } catch (e2) {
            console.log('Neither whisper nor python3 -m whisper working. Error:', (e2 as Error).message);
          }
        }
      } catch (error) {
        console.log('Error checking system PATH:', error);
      }
    }

    // Set up model path (will download if needed)
    const homeDir = process.env.HOME || '';
    this.modelPath = path.join(homeDir, '.cache', 'whisper');
    
    console.log(`Final whisper path: ${this.whisperPath}`);
  }

  private async waitForDeviceDetection(): Promise<void> {
    if (this.deviceDetectionCompleted) {
      return;
    }

    // Wait up to 10 seconds for device detection to complete
    const timeout = 10000;
    const interval = 100;
    let elapsed = 0;

    while (!this.deviceDetectionCompleted && elapsed < timeout) {
      await new Promise(resolve => setTimeout(resolve, interval));
      elapsed += interval;
    }

    if (!this.deviceDetectionCompleted) {
      console.warn('Device detection timed out, falling back to CPU');
      this.bestDevice = { type: 'cpu', available: true, name: 'CPU Fallback' };
      this.deviceDetectionCompleted = true;
    }
  }

  public async transcribeAudio(
    audioPath: string,
    onProgress?: (progress: number, speed?: string, eta?: string) => void,
    model: string = 'base',
    language: string = 'auto'
  ): Promise<TranscriptionResult> {
    // Wait for device detection to complete
    await this.waitForDeviceDetection();
    
    // Try with best device first, then fall back to CPU if it fails
    try {
      return await this.attemptTranscription(audioPath, this.bestDevice, onProgress, model, language);
    } catch (error) {
      const errorMessage = (error as Error).message;
      
      // Check if it's a device-specific error that might be fixed with CPU fallback
      if (this.isDeviceSpecificError(errorMessage) && this.bestDevice?.type !== 'cpu') {
        console.warn(`Transcription failed with ${this.bestDevice?.type}, falling back to CPU:`, errorMessage);
        
        // Force CPU fallback
        const cpuDevice = { type: 'cpu' as const, available: true, name: 'CPU Fallback' };
        try {
          return await this.attemptTranscription(audioPath, cpuDevice, onProgress, model, language);
        } catch (cpuError) {
          throw new Error(`Transcription failed on both ${this.bestDevice?.type} and CPU: ${(cpuError as Error).message}`);
        }
      } else {
        throw error;
      }
    }
  }

  private isDeviceSpecificError(errorMessage: string): boolean {
    const deviceErrorPatterns = [
      'NotImplementedError',
      'aten::_sparse_coo_tensor_with_dims_and_tensors',
      'SparseMPS backend',
      'MPS backend',
      'CUDA',
      'device'
    ];
    
    return deviceErrorPatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  private async attemptTranscription(
    audioPath: string,
    device: DeviceInfo | null,
    onProgress?: (progress: number, speed?: string, eta?: string) => void,
    model: string = 'base',
    language: string = 'auto'
  ): Promise<TranscriptionResult> {
    return new Promise((resolve, reject) => {
      if (!this.whisperPath) {
        reject(new Error('Whisper not found. Please install OpenAI Whisper: pip install openai-whisper'));
        return;
      }

      const outputDir = path.dirname(audioPath);
      const outputName = path.basename(audioPath, path.extname(audioPath));
      
      // Run whisper with word-level timestamps
      let whisperProcess;
      
      console.log(`Using Whisper path: ${this.whisperPath}`);
      console.log(`Audio file: ${audioPath}`);
      console.log(`Output directory: ${outputDir}`);
      console.log(`Using device: ${device?.type || 'cpu'}`, device);
      
      // Set up enhanced environment for Whisper execution
      const env = {
        ...process.env,
        PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:${process.env.PATH || ''}`,
        PYTHONPATH: `/opt/homebrew/lib/python3.*/site-packages:${process.env.PYTHONPATH || ''}`
      };

      // Get device string for Whisper
      const deviceString = this.deviceDetector.getWhisperDeviceString(device || undefined);

      if (this.whisperPath.includes('python3 -m whisper')) {
        // Use python3 -m whisper
        const args = [
          '-m', 'whisper',
          audioPath,
          '--model', model,
          '--device', deviceString,
          '--output_format', 'json',
          '--word_timestamps', 'True',
          '--output_dir', outputDir,
          '--verbose', 'False'
        ];
        
        // Add language parameter if not auto-detect
        if (language !== 'auto') {
          args.push('--language', language);
        }
        
        console.log(`Running: python3 ${args.join(' ')}`);
        whisperProcess = spawn('python3', args, { env });
      } else {
        // Use direct whisper command
        const args = [
          audioPath,
          '--model', model,
          '--device', deviceString,
          '--output_format', 'json',
          '--word_timestamps', 'True',
          '--output_dir', outputDir,
          '--verbose', 'False'
        ];
        
        // Add language parameter if not auto-detect
        if (language !== 'auto') {
          args.push('--language', language);
        }
        
        console.log(`Running: ${this.whisperPath} ${args.join(' ')}`);
        whisperProcess = spawn(this.whisperPath, args, { env });
      }
      
      let errorOutput = '';
      let stdoutOutput = '';
      let progressStarted = false;
      let segmentCount = 0;
      let processedSegments = 0;
      let progressTimer: NodeJS.Timeout | null = null;
      let lastProgressUpdate = 0;
      let currentProcessingSpeed = '';
      let currentETA = '';

      // Start a timer to provide regular progress updates
      if (onProgress) {
        progressTimer = setInterval(() => {
          if (progressStarted && lastProgressUpdate < 85) {
            // Gradually increase progress over time to show activity
            lastProgressUpdate = Math.min(lastProgressUpdate + 1, 85);
            onProgress(lastProgressUpdate, currentProcessingSpeed, currentETA);
          }
        }, 2000); // Update every 2 seconds
      }

      whisperProcess.stdout.on('data', (data) => {
        stdoutOutput += data.toString();
        const output = data.toString();
        
        // Track progress based on Whisper's actual output patterns
        if (onProgress) {
          // Look for segment processing indicators in stderr/stdout
          if (output.includes('segment')) {
            segmentCount++;
          }
          
          // Estimate progress based on output activity
          if (!progressStarted && output.length > 0) {
            progressStarted = true;
            lastProgressUpdate = 10;
            onProgress(lastProgressUpdate); // Start at 10%
          }
          
          // Increment progress gradually as we see output
          if (progressStarted) {
            processedSegments++;
            lastProgressUpdate = Math.min(10 + (processedSegments * 2), 80);
            onProgress(lastProgressUpdate, currentProcessingSpeed, currentETA);
          }
        }
      });

      whisperProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
        const output = data.toString();
        console.log('Whisper stderr:', output);
        
        // Track progress from stderr output as well
        if (onProgress) {
          // Look for progress bar with ETA: 44%|████▎     | 29640/67955 [08:40<10:53, 58.64frames/s]
          const progressMatch = output.match(/(\d+)%\|[^|]+\|\s*\d+\/\d+\s*\[([^<]+)<([^,]+),\s*([\d.]+)frames?\/s\]/i);
          if (progressMatch) {
            const [, progressPercent, elapsed, remaining, framesPerSec] = progressMatch;
            
            // Update progress percentage
            const newProgress = parseInt(progressPercent);
            if (newProgress > lastProgressUpdate) {
              lastProgressUpdate = newProgress;
            }
            
            // Format ETA
            currentETA = remaining.trim();
            
            // Format processing speed
            currentProcessingSpeed = `${framesPerSec} fps`;
            
            onProgress(lastProgressUpdate, currentProcessingSpeed, currentETA);
            return; // Skip other progress logic when we have detailed progress
          }

          // Fallback: Look for processing speed information in output
          const speedMatch = output.match(/(\d+\.\d+)x\s+realtime/i) || 
                           output.match(/(\d+\.\d+)\s*fps/i) ||
                           output.match(/(\d+\.\d+)\s*frames?\s*\/\s*sec/i);
          if (speedMatch) {
            if (output.includes('realtime')) {
              currentProcessingSpeed = `${speedMatch[1]}x realtime`;
            } else {
              currentProcessingSpeed = `${speedMatch[1]} fps`;
            }
          }

          // Look for Whisper's actual progress indicators
          if (output.includes('Loading model') || output.includes('Detecting language')) {
            lastProgressUpdate = 15;
            onProgress(lastProgressUpdate, currentProcessingSpeed, currentETA);
          } else if (output.includes('transcribing')) {
            lastProgressUpdate = 25;
            onProgress(lastProgressUpdate, currentProcessingSpeed, currentETA);
          } else if (output.includes('segment') || output.includes('words')) {
            processedSegments++;
            lastProgressUpdate = Math.min(25 + (processedSegments * 3), 85);
            onProgress(lastProgressUpdate, currentProcessingSpeed, currentETA);
          } else if (output.includes('Processing')) {
            // Increment progress for any processing activity
            processedSegments++;
            lastProgressUpdate = Math.min(25 + (processedSegments * 2), 85);
            onProgress(lastProgressUpdate, currentProcessingSpeed, currentETA);
          }
        }
      });

      whisperProcess.on('error', (error) => {
        // Clean up the progress timer
        if (progressTimer) {
          clearInterval(progressTimer);
          progressTimer = null;
        }

        console.error('Whisper process error:', error);
        reject(new Error(`Failed to start Whisper process: ${error.message}`));
      });

      whisperProcess.on('close', (code) => {
        // Clean up the progress timer
        if (progressTimer) {
          clearInterval(progressTimer);
          progressTimer = null;
        }

        console.log(`Whisper process exited with code: ${code}`);
        console.log(`Error output: ${errorOutput}`);
        console.log(`Stdout output: ${stdoutOutput}`);
        
        if (code !== 0) {
          reject(new Error(`Whisper process failed with code ${code}: ${errorOutput}`));
          return;
        }

        // Read the generated JSON file
        const jsonPath = path.join(outputDir, `${outputName}.json`);
        console.log(`Looking for Whisper output file: ${jsonPath}`);
        
        try {
          if (!fs.existsSync(jsonPath)) {
            console.log(`JSON file not found at: ${jsonPath}`);
            console.log(`Checking directory contents: ${outputDir}`);
            
            // List files in output directory for debugging
            try {
              const files = fs.readdirSync(outputDir);
              console.log(`Files in output directory: ${files.join(', ')}`);
            } catch (e) {
              console.log(`Could not read output directory: ${e}`);
            }
            
            reject(new Error(`Whisper output file not found: ${jsonPath}`));
            return;
          }

          console.log(`Found Whisper output file: ${jsonPath}`);
          const jsonContent = fs.readFileSync(jsonPath, 'utf8');
          const whisperResult = JSON.parse(jsonContent);
          
          // Convert Whisper format to our format
          const result: TranscriptionResult = {
            text: whisperResult.segments.map((s: any) => s.text).join(' '),
            segments: whisperResult.segments.map((segment: any) => ({
              start: segment.start * 1000, // Convert to milliseconds
              end: segment.end * 1000,
              text: segment.text.trim(),
              words: segment.words ? segment.words.map((word: any) => ({
                start: word.start * 1000,
                end: word.end * 1000,
                word: word.word.trim()
              })) : []
            }))
          };

          // Clean up the JSON file
          fs.unlinkSync(jsonPath);
          
          // Final progress update
          if (onProgress) {
            onProgress(100, currentProcessingSpeed, currentETA);
          }
          
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse Whisper output: ${error}`));
        }
      });

      whisperProcess.on('error', (error) => {
        reject(new Error(`Failed to start Whisper process: ${error.message}`));
      });
    });
  }

  public async downloadModel(modelName: string = 'base'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.whisperPath) {
        reject(new Error('Whisper not found'));
        return;
      }

      // Download model by running whisper with a dummy command
      const dummyAudio = path.join(__dirname, 'dummy.wav');
      
      // Create a 1-second silent audio file for model download
      const args = [
        '--model', modelName,
        '--help'
      ];

      const whisperProcess = spawn(this.whisperPath, args);
      
      whisperProcess.on('close', (code) => {
        resolve();
      });

      whisperProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  public checkWhisperAvailability(): boolean {
    return this.whisperPath !== '';
  }

  public getDetailedAvailability(): { available: boolean; path: string; error?: string } {
    if (this.whisperPath === '') {
      return { 
        available: false, 
        path: '', 
        error: 'Whisper not found. Please install OpenAI Whisper: pip install openai-whisper' 
      };
    }

    // Test if the Whisper path actually works
    try {
      const { execSync } = require('child_process');
      const env = {
        ...process.env,
        PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:${process.env.PATH || ''}`,
        PYTHONPATH: `/opt/homebrew/lib/python3.*/site-packages:${process.env.PYTHONPATH || ''}`
      };

      if (this.whisperPath.includes('python3 -m whisper')) {
        execSync('python3 -m whisper --help', { stdio: 'pipe', env, timeout: 10000 });
      } else {
        execSync(`"${this.whisperPath}" --help`, { stdio: 'pipe', env, timeout: 10000 });
      }
      return { available: true, path: this.whisperPath };
    } catch (error) {
      return { 
        available: false, 
        path: this.whisperPath, 
        error: `Whisper found at ${this.whisperPath} but failed to execute: ${(error as Error).message}` 
      };
    }
  }

  public getWhisperPath(): string {
    return this.whisperPath;
  }

  public async testWhisperInstallation(): Promise<{ available: boolean; path: string; error?: string }> {
    if (!this.whisperPath) {
      return { available: false, path: '', error: 'Whisper not found in any common locations' };
    }

    try {
      const { execSync } = require('child_process');
      if (this.whisperPath.includes('python3 -m whisper')) {
        execSync('python3 -m whisper --help', { stdio: 'pipe' });
      } else {
        execSync(`${this.whisperPath} --help`, { stdio: 'pipe' });
      }
      return { available: true, path: this.whisperPath };
    } catch (error) {
      return { available: false, path: this.whisperPath, error: (error as Error).message };
    }
  }

  public async transcribeAudioSegments(
    audioPath: string,
    timelineSelections: any[],
    onProgress?: (progress: number, speed?: string, eta?: string) => void,
    model: string = 'base',
    language: string = 'auto'
  ): Promise<TranscriptionResult[]> {
    // For now, we'll transcribe the whole audio and then filter the results
    // This is simpler than extracting audio segments
    const fullTranscription = await this.transcribeAudio(audioPath, onProgress, model, language);
    
    // Filter segments to only include those within selected timeline ranges
    const filteredSegments = fullTranscription.segments.filter(segment => {
      return timelineSelections.some(selection => {
        const segmentStart = segment.start; // Already in milliseconds from transcribeAudio
        const segmentEnd = segment.end; // Already in milliseconds from transcribeAudio
        const selectionStart = selection.startTime; // Already in milliseconds
        const selectionEnd = selection.endTime; // Already in milliseconds
        
        // Check if segment overlaps with any selection
        return (segmentStart < selectionEnd && segmentEnd > selectionStart);
      });
    });

    // Adjust timing for filtered segments if needed
    const adjustedSegments = filteredSegments.map(segment => {
      // Find which selection this segment belongs to
      const matchingSelection = timelineSelections.find(selection => {
        const segmentStart = segment.start; // Already in milliseconds
        const segmentEnd = segment.end; // Already in milliseconds
        const selectionStart = selection.startTime; // Already in milliseconds
        const selectionEnd = selection.endTime; // Already in milliseconds
        
        return (segmentStart < selectionEnd && segmentEnd > selectionStart);
      });

      // Keep original timing - user selected these specific time ranges
      return segment;
    });

    // Return as array of TranscriptionResult objects, one for each timeline selection
    return timelineSelections.map(selection => ({
      text: adjustedSegments.map(s => s.text).join(' '),
      segments: adjustedSegments
    }));
  }

  public getAvailableModels(): string[] {
    return ['tiny', 'base', 'small', 'medium', 'large'];
  }

  /**
   * Get information about the currently selected device
   */
  public getCurrentDevice(): DeviceInfo | null {
    return this.bestDevice;
  }

  /**
   * Get all detected devices
   */
  public getDetectedDevices(): DeviceInfo[] {
    return this.deviceDetector.getDetectedDevices();
  }

  /**
   * Force device detection refresh
   */
  public async refreshDeviceDetection(): Promise<DeviceInfo> {
    this.deviceDetectionCompleted = false;
    this.bestDevice = await this.deviceDetector.detectBestDevice();
    this.deviceDetectionCompleted = true;
    console.log(`Device detection refreshed. Using: ${this.bestDevice.type}`, this.bestDevice);
    return this.bestDevice;
  }

  /**
   * Check if GPU acceleration is being used
   */
  public isUsingGPU(): boolean {
    return this.bestDevice?.type === 'cuda' || this.bestDevice?.type === 'mps';
  }

  /**
   * Test if the currently selected device is working
   */
  public async testCurrentDevice(): Promise<boolean> {
    if (!this.bestDevice) return false;
    return this.deviceDetector.testDevice(this.bestDevice.type);
  }
}

export default WhisperService;