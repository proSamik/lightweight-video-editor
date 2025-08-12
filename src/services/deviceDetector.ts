import { spawn, execSync } from 'child_process';
import * as os from 'os';

export interface DeviceInfo {
  type: 'cuda' | 'mps' | 'cpu';
  available: boolean;
  name?: string;
  memoryMB?: number;
  errorMessage?: string;
}

export class DeviceDetector {
  private static instance: DeviceDetector;
  private detectedDevices: DeviceInfo[] = [];
  private bestDevice: DeviceInfo | null = null;

  private constructor() {}

  public static getInstance(): DeviceDetector {
    if (!DeviceDetector.instance) {
      DeviceDetector.instance = new DeviceDetector();
    }
    return DeviceDetector.instance;
  }

  /**
   * Detects available GPU/MPS devices and returns the best one for Whisper
   */
  public async detectBestDevice(): Promise<DeviceInfo> {
    this.detectedDevices = [];

    // Detect devices in order of preference: CUDA > MPS > CPU
    await this.detectCUDA();
    await this.detectMPS();
    this.detectCPU();

    // Select the best available device
    this.bestDevice = this.selectBestDevice();
    console.log(`Best device detected: ${this.bestDevice.type}`, this.bestDevice);
    
    return this.bestDevice;
  }

  /**
   * Detect NVIDIA CUDA GPU availability
   */
  private async detectCUDA(): Promise<void> {
    try {
      // Check if PyTorch with CUDA is available
      const pythonCode = `
import torch
import json
result = {
  'available': torch.cuda.is_available(),
  'device_count': torch.cuda.device_count() if torch.cuda.is_available() else 0,
  'devices': []
}
if torch.cuda.is_available():
  for i in range(torch.cuda.device_count()):
    props = torch.cuda.get_device_properties(i)
    result['devices'].append({
      'id': i,
      'name': props.name,
      'memory_mb': props.total_memory // (1024 * 1024),
      'compute_capability': f"{props.major}.{props.minor}"
    })
print(json.dumps(result))
      `;

      const result = await this.runPythonCode(pythonCode);
      const cudaInfo = JSON.parse(result);

      if (cudaInfo.available && cudaInfo.device_count > 0) {
        const primaryDevice = cudaInfo.devices[0];
        this.detectedDevices.push({
          type: 'cuda',
          available: true,
          name: primaryDevice.name,
          memoryMB: primaryDevice.memory_mb
        });
      } else {
        this.detectedDevices.push({
          type: 'cuda',
          available: false,
          errorMessage: 'CUDA not available or no CUDA devices found'
        });
      }
    } catch (error) {
      this.detectedDevices.push({
        type: 'cuda',
        available: false,
        errorMessage: `CUDA detection failed: ${(error as Error).message}`
      });
    }
  }

  /**
   * Detect Apple MPS (Metal Performance Shaders) availability and Whisper compatibility
   */
  private async detectMPS(): Promise<void> {
    // Only check MPS on macOS
    if (os.platform() !== 'darwin') {
      this.detectedDevices.push({
        type: 'mps',
        available: false,
        errorMessage: 'MPS only available on macOS'
      });
      return;
    }

    try {
      // Check if PyTorch with MPS is available and test Whisper compatibility
      const pythonCode = `
import torch
import json
result = {
  'available': torch.backends.mps.is_available() if hasattr(torch.backends, 'mps') else False,
  'built': torch.backends.mps.is_built() if hasattr(torch.backends, 'mps') else False,
  'whisper_compatible': False
}

if result['available'] and result['built']:
  try:
    # Test basic MPS functionality
    test_tensor = torch.tensor([1.0], device='mps')
    result['basic_functional'] = True
    
    # Test Whisper-specific operations that might fail on MPS
    try:
      # Test sparse tensor operations similar to what Whisper uses
      # This is a simplified test for the operation that fails in Whisper
      import whisper
      # Try to load a tiny model on MPS to test compatibility
      try:
        model = whisper.load_model("tiny", device="mps")
        result['whisper_compatible'] = True
        result['whisper_test'] = 'success'
        # Clean up model to free memory
        del model
        torch.mps.empty_cache()
      except Exception as whisper_error:
        result['whisper_compatible'] = False
        result['whisper_test'] = f'whisper_load_failed: {str(whisper_error)}'
        
    except ImportError:
      result['whisper_compatible'] = False  
      result['whisper_test'] = 'whisper_not_installed'
      
  except Exception as e:
    result['basic_functional'] = False
    result['whisper_compatible'] = False
    result['error'] = str(e)

print(json.dumps(result))
      `;

      const result = await this.runPythonCode(pythonCode);
      const mpsInfo = JSON.parse(result);

      // Only mark MPS as available if it's compatible with Whisper
      if (mpsInfo.available && mpsInfo.built && mpsInfo.whisper_compatible) {
        this.detectedDevices.push({
          type: 'mps',
          available: true,
          name: 'Apple MPS (Whisper Compatible)'
        });
      } else {
        let errorMessage = 'MPS not compatible with Whisper';
        if (!mpsInfo.available) {
          errorMessage = 'MPS not available';
        } else if (!mpsInfo.built) {
          errorMessage = 'MPS not built';
        } else if (mpsInfo.whisper_test) {
          errorMessage = `MPS incompatible with Whisper: ${mpsInfo.whisper_test}`;
        } else if (mpsInfo.error) {
          errorMessage = `MPS error: ${mpsInfo.error}`;
        }
        
        this.detectedDevices.push({
          type: 'mps',
          available: false,
          errorMessage: errorMessage
        });
      }
    } catch (error) {
      this.detectedDevices.push({
        type: 'mps',
        available: false,
        errorMessage: `MPS detection failed: ${(error as Error).message}`
      });
    }
  }

  /**
   * CPU is always available as fallback
   */
  private detectCPU(): void {
    const cpuInfo = os.cpus();
    const cpuName = cpuInfo.length > 0 ? cpuInfo[0].model : 'Unknown CPU';
    
    this.detectedDevices.push({
      type: 'cpu',
      available: true,
      name: cpuName
    });
  }

  /**
   * Select the best available device based on priority: CUDA > MPS > CPU
   */
  private selectBestDevice(): DeviceInfo {
    // Priority order: CUDA > MPS > CPU
    const priority = ['cuda', 'mps', 'cpu'] as const;
    
    for (const deviceType of priority) {
      const device = this.detectedDevices.find(d => d.type === deviceType && d.available);
      if (device) {
        return device;
      }
    }

    // Fallback to CPU (should always be available)
    return this.detectedDevices.find(d => d.type === 'cpu') || {
      type: 'cpu',
      available: true,
      name: 'CPU Fallback'
    };
  }

  /**
   * Run Python code and return the output
   */
  private async runPythonCode(code: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Set up enhanced environment for Python execution
      const env = {
        ...process.env,
        PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:${process.env.PATH || ''}`,
        PYTHONPATH: `/opt/homebrew/lib/python3.*/site-packages:${process.env.PYTHONPATH || ''}`
      };

      // Try different Python executables
      const pythonExecutables = ['python3', 'python'];
      let pythonPath = '';

      // Find available Python executable
      for (const executable of pythonExecutables) {
        try {
          execSync(`which ${executable}`, { stdio: 'pipe', env });
          pythonPath = executable;
          break;
        } catch {
          continue;
        }
      }

      if (!pythonPath) {
        reject(new Error('Python not found'));
        return;
      }

      const pythonProcess = spawn(pythonPath, ['-c', code], { env });
      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(`Python execution failed: ${errorOutput}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python: ${error.message}`));
      });
    });
  }

  /**
   * Get all detected devices
   */
  public getDetectedDevices(): DeviceInfo[] {
    return [...this.detectedDevices];
  }

  /**
   * Get the best device (must call detectBestDevice first)
   */
  public getBestDevice(): DeviceInfo | null {
    return this.bestDevice;
  }

  /**
   * Get device type string for Whisper --device parameter
   */
  public getWhisperDeviceString(device?: DeviceInfo): string {
    const targetDevice = device || this.bestDevice;
    if (!targetDevice) return 'cpu';

    switch (targetDevice.type) {
      case 'cuda':
        return 'cuda';
      case 'mps':
        return 'mps';
      case 'cpu':
      default:
        return 'cpu';
    }
  }

  /**
   * Test device availability with a simple operation
   */
  public async testDevice(deviceType: 'cuda' | 'mps' | 'cpu'): Promise<boolean> {
    try {
      const pythonCode = `
import torch
device = '${deviceType}'
try:
  test_tensor = torch.tensor([1.0], device=device)
  result = test_tensor.cpu().numpy()[0] == 1.0
  print("success" if result else "failed")
except Exception as e:
  print(f"error: {e}")
      `;

      const result = await this.runPythonCode(pythonCode);
      return result.trim() === 'success';
    } catch (error) {
      console.log(`Device test failed for ${deviceType}:`, error);
      return false;
    }
  }
}

export default DeviceDetector;