# Multi-Threaded GPU Canvas Renderer

## Overview

The GPU Canvas Renderer has been enhanced with multi-threading capabilities to significantly improve performance for video rendering with captions. This implementation utilizes multiple CPU cores to process frames in parallel while maintaining GPU acceleration for text rendering.

## Key Features

### 🚀 Performance Improvements
- **Multi-CPU Core Utilization**: Automatically detects and utilizes up to 75% of available CPU cores
- **Parallel Frame Processing**: Processes multiple frames simultaneously across worker threads
- **GPU Acceleration**: Each worker thread uses Skia Canvas for hardware-accelerated text rendering
- **Memory Optimization**: Dynamically adjusts worker count based on available system memory
- **Fallback Mechanism**: Automatically falls back to single-threaded processing if multi-threading fails

### 🎯 Smart Resource Management
- **Optimal Worker Count**: Calculates the best number of worker threads based on:
  - CPU core count (75% of available cores)
  - Available system memory (150MB per worker)
  - Maximum limit of 16 workers to prevent system overload
- **Batch Processing**: Divides frames into optimal batches for parallel processing
- **Progress Tracking**: Real-time progress updates from all worker threads

## Architecture

### Main Thread (Coordinator)
```
┌─────────────────────────────────────────────────────────────┐
│                    Main Thread                              │
├─────────────────────────────────────────────────────────────┤
│ • Video frame extraction (FFmpeg)                          │
│ • Worker thread management                                  │
│ • Batch creation and distribution                          │
│ • Progress aggregation and reporting                       │
│ • Video encoding (FFmpeg with hardware acceleration)       │
└─────────────────────────────────────────────────────────────┘
```

### Worker Threads (Frame Processors)
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Worker 1      │  │   Worker 2      │  │   Worker N      │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ • Frame loading │  │ • Frame loading │  │ • Frame loading │
│ • Text rendering│  │ • Text rendering│  │ • Text rendering│
│ • GPU Canvas    │  │ • GPU Canvas    │  │ • GPU Canvas    │
│ • Frame saving  │  │ • Frame saving  │  │ • Frame saving  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Implementation Details

### CPU Core Detection
```typescript
private getOptimalWorkerCount(): number {
  const cpuCores = os.cpus().length;
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  
  // Base calculation: use 75% of available CPU cores
  let optimalWorkers = Math.max(1, Math.floor(cpuCores * 0.75));
  
  // Adjust based on available memory (each worker needs ~100-200MB)
  const memoryBasedWorkers = Math.floor(freeMemory / (150 * 1024 * 1024));
  optimalWorkers = Math.min(optimalWorkers, memoryBasedWorkers);
  
  // Cap at reasonable maximum to prevent system overload
  optimalWorkers = Math.min(optimalWorkers, 16);
  
  return optimalWorkers;
}
```

### Batch Processing
```typescript
private createBatches(frameFiles: string[], batchSize: number): string[][] {
  const batches: string[][] = [];
  
  for (let i = 0; i < frameFiles.length; i += batchSize) {
    batches.push(frameFiles.slice(i, i + batchSize));
  }
  
  return batches;
}
```

### Worker Thread Communication
```typescript
// Main thread creates workers
const worker = new Worker(__filename, {
  workerData: {
    frameBatch,
    framesDir,
    captions,
    metadata,
    batchIndex,
    isWorker: true
  }
});

// Worker reports progress
parentPort?.postMessage({
  type: 'progress',
  processedFrames,
  batchIndex
});
```

## Performance Characteristics

### Expected Performance Improvements
- **8-Core System**: ~6x faster than single-threaded
- **16-Core System**: ~12x faster than single-threaded
- **Memory-constrained systems**: Automatically reduces worker count

### Resource Usage
- **CPU**: 75% of available cores (configurable)
- **Memory**: ~150MB per worker thread
- **GPU**: Shared GPU resources for text rendering
- **Disk I/O**: Parallel read/write operations

## Usage

### Basic Usage
```typescript
import { GPUCanvasVideoRenderer } from './services/gpuCanvasRenderer';

const renderer = GPUCanvasVideoRenderer.getInstance();

await renderer.renderVideoWithCaptions(
  videoPath,
  captions,
  outputPath,
  (progress) => console.log(`Progress: ${progress}%`),
  { framerate: 30, quality: 'high' }
);
```

### Automatic Fallback
The renderer automatically falls back to single-threaded processing if:
- Worker thread creation fails
- Memory constraints prevent multi-threading
- System doesn't support worker threads

## Error Handling

### Worker Thread Errors
- Individual worker errors don't stop the entire process
- Failed frames are logged but processing continues
- Main thread aggregates errors and provides fallback

### Memory Management
- Automatic cleanup of temporary files
- Worker threads are properly terminated
- Memory usage is monitored and optimized

## Testing

### Test Script
Run the test script to verify the implementation:
```bash
node scripts/test-multithreaded-renderer.js
```

### Expected Output
```
=== Testing Multi-Threaded GPU Canvas Renderer ===
✓ System Info:
  - CPU Cores: 8
  - Total Memory: 24GB
  - Free Memory: 4GB
✓ Optimal Worker Count: 6
✓ Expected performance improvement: ~6x faster than single-threaded
```

## Configuration

### Environment Variables
- `GPU_RENDERER_MAX_WORKERS`: Override maximum worker count
- `GPU_RENDERER_MEMORY_PER_WORKER`: Override memory per worker (in MB)

### Runtime Configuration
- Worker count is calculated at runtime based on system resources
- No manual configuration required
- Automatically adapts to different system capabilities

## Troubleshooting

### Common Issues

1. **Worker threads not starting**
   - Check if Node.js version supports worker threads (v10.5.0+)
   - Verify system has sufficient memory

2. **Performance not improving**
   - Check CPU usage during rendering
   - Verify worker count calculation
   - Monitor memory usage

3. **Rendering fails**
   - Check fallback to single-threaded mode
   - Verify Skia Canvas installation
   - Check FFmpeg availability

### Debug Information
The renderer provides detailed logging:
```
GPU Canvas Renderer initialized with 6 worker threads
Created 6 batches with 167 frames per batch
Batch 0 completed: 167 frames
Multi-threaded GPU rendering completed: 1000 frames processed in 45.2s
Average processing speed: 22.1 frames/second
```

## Future Enhancements

### Planned Improvements
- **Dynamic worker scaling**: Adjust worker count based on load
- **GPU memory optimization**: Better GPU resource sharing
- **Advanced batching**: Intelligent frame grouping for optimal performance
- **Progress visualization**: Real-time performance metrics

### Performance Targets
- **Short videos (< 1 minute)**: 2-4x improvement
- **Medium videos (1-5 minutes)**: 4-8x improvement  
- **Long videos (> 5 minutes)**: 6-12x improvement

## Technical Notes

### Dependencies
- **Node.js**: v10.5.0+ (for worker threads)
- **Skia Canvas**: For GPU-accelerated text rendering
- **FFmpeg**: For video frame extraction and encoding
- **Worker Threads**: Built-in Node.js module

### Platform Support
- **macOS**: Full support with hardware acceleration
- **Windows**: Full support with hardware acceleration
- **Linux**: Full support with hardware acceleration

### Memory Considerations
- Each worker thread requires ~150MB of RAM
- Total memory usage scales with worker count
- Automatic memory-based worker count adjustment 