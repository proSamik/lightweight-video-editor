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
      'whisper' // System PATH
    ];

    for (const whisperPath of commonPaths) {
      try {
        if (fs.existsSync(whisperPath) || whisperPath === 'whisper') {
          this.whisperPath = whisperPath;
          break;
        }
      } catch (error) {
        continue;
      }
    }

    // Set up model path (will download if needed)
    const homeDir = process.env.HOME || '';
    this.modelPath = path.join(homeDir, '.cache', 'whisper');
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
      const args = [
        audioPath,
        '--model', 'base',
        '--output_format', 'json',
        '--word_timestamps', 'True',
        '--output_dir', outputDir,
        '--verbose', 'False'
      ];

      const whisperProcess = spawn(this.whisperPath, args);
      
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

      whisperProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Whisper process failed with code ${code}: ${errorOutput}`));
          return;
        }

        // Read the generated JSON file
        const jsonPath = path.join(outputDir, `${outputName}.json`);
        
        try {
          if (!fs.existsSync(jsonPath)) {
            reject(new Error(`Whisper output file not found: ${jsonPath}`));
            return;
          }

          const jsonContent = fs.readFileSync(jsonPath, 'utf8');
          const whisperResult = JSON.parse(jsonContent);
          
          // Convert Whisper format to our format
          const result: TranscriptionResult = {
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

  public getAvailableModels(): string[] {
    return ['tiny', 'base', 'small', 'medium', 'large'];
  }
}

export default WhisperService;