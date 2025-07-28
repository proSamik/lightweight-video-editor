import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { TranscriptionResult } from '../types';

export class WhisperService {
  private static instance: WhisperService;
  private whisperPath: string = '';
  private modelPath: string = '';

  private constructor() {
    this.detectWhisperPaths();
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
          this.whisperPath = whisperPath;
          console.log(`Whisper found at: ${whisperPath}`);
          break;
        }
      } catch (error) {
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
          this.whisperPath = 'whisper';
          console.log('Whisper found in PATH');
        } catch (e) {
          // Try python3 -m whisper
          try {
            execSync('which python3', { stdio: 'pipe', env });
            this.whisperPath = 'python3 -m whisper';
            console.log('Python3 found in PATH, will use python3 -m whisper');
          } catch (e2) {
            console.log('Neither whisper nor python3 found in PATH');
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

  public async transcribeAudio(
    audioPath: string,
    onProgress?: (progress: number) => void
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
      
      // Set up enhanced environment for Whisper execution
      const env = {
        ...process.env,
        PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:${process.env.PATH || ''}`,
        PYTHONPATH: `/opt/homebrew/lib/python3.*/site-packages:${process.env.PYTHONPATH || ''}`
      };

      if (this.whisperPath.includes('python3 -m whisper')) {
        // Use python3 -m whisper
        const args = [
          '-m', 'whisper',
          audioPath,
          '--model', 'base',
          '--output_format', 'json',
          '--word_timestamps', 'True',
          '--output_dir', outputDir,
          '--verbose', 'False'
        ];
        console.log(`Running: python3 ${args.join(' ')}`);
        whisperProcess = spawn('python3', args, { env });
      } else {
        // Use direct whisper command
        const args = [
          audioPath,
          '--model', 'base',
          '--output_format', 'json',
          '--word_timestamps', 'True',
          '--output_dir', outputDir,
          '--verbose', 'False'
        ];
        console.log(`Running: ${this.whisperPath} ${args.join(' ')}`);
        whisperProcess = spawn(this.whisperPath, args, { env });
      }
      
      let errorOutput = '';
      let stdoutOutput = '';

      whisperProcess.stdout.on('data', (data) => {
        stdoutOutput += data.toString();
        // Simple progress estimation based on output
        if (onProgress) {
          const lines = stdoutOutput.split('\n');
          const progressMatch = lines.find(line => line.includes('%'));
          if (progressMatch) {
            const match = progressMatch.match(/(\d+)%/);
            if (match) {
              onProgress(parseInt(match[1]));
            }
          }
        }
      });

      whisperProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.log('Whisper stderr:', data.toString());
      });

      whisperProcess.on('error', (error) => {
        console.error('Whisper process error:', error);
        reject(new Error(`Failed to start Whisper process: ${error.message}`));
      });

      whisperProcess.on('close', (code) => {
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

  public getAvailableModels(): string[] {
    return ['tiny', 'base', 'small', 'medium', 'large'];
  }
}

export default WhisperService;