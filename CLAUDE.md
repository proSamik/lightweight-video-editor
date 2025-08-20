# Lightweight Video Editor - Development Guide

## Overview

This is an Electron-based video editor application that specializes in adding captions to videos with word-level timing. The application combines React frontend with Node.js backend services to provide drag-and-drop video processing, automatic transcription, caption styling, and video export capabilities.

## Project Structure

```
src/
├── main/                    # Electron main process
│   ├── main.ts             # Main window setup & IPC handlers
│   ├── preload.ts          # Context bridge for renderer-main communication
│   └── tsconfig.json       # TypeScript config for main process
├── renderer/               # React frontend (renderer process)
│   ├── App.tsx            # Main application component
│   ├── index.tsx          # Entry point
│   ├── index.html         # HTML template
│   ├── global.d.ts        # Type definitions
│   └── components/        # React components
│       ├── VideoPanel.tsx      # Video preview with canvas overlay
│       ├── TimelinePanel.tsx   # Caption timeline interface
│       ├── StylingPanel.tsx    # Caption styling controls
│       └── LoadingScreen.tsx   # Loading states
├── services/              # Core business logic
│   ├── ffmpeg.ts          # Video processing via FFmpeg
│   ├── whisper.ts         # Audio transcription via OpenAI Whisper
│   ├── videoEditor.ts     # Video editing operations (word deletions)
│   ├── canvasRenderer.ts  # Canvas-based caption rendering
│   ├── ffmpegOverlayRenderer.ts # FFmpeg-based overlay rendering with timing precision
│   ├── srtExporter.ts     # SRT subtitle export for YouTube
│   ├── aiService.ts       # AI content generation (descriptions/titles)
│   └── settingsManager.ts # Persistent settings storage
└── types/
    └── index.ts           # TypeScript type definitions
```

## Development Commands

### Build & Run
```bash
npm run build          # Build both main and renderer
npm run build-main     # Build Electron main process only
npm run build-renderer # Build React renderer only
npm start             # Build and start the app
```

### Development
```bash
npm run dev           # Start development with hot reload
npm run watch-main    # Watch main process changes
npm run dev-renderer  # Start webpack dev server for renderer
```

## Architecture Overview

### Electron Process Architecture
- **Main Process** (`src/main/main.ts`): Window management, file dialogs, IPC handlers
- **Renderer Process** (`src/renderer/`): React UI running in Chromium
- **Preload Script** (`src/main/preload.ts`): Secure bridge between processes

### Core Data Flow

1. **Video Import**: Drag & drop or file selection → video metadata extraction
2. **Transcription Pipeline**: Video → Audio extraction → Whisper transcription → Caption segments
3. **Caption Editing**: Real-time styling updates with undo/redo system
4. **Video Export**: Canvas-based caption rendering → FFmpeg video encoding

### Key Services

#### FFmpegService (`src/services/ffmpeg.ts`)
- Singleton service for video processing
- Auto-detects FFmpeg installation paths (macOS homebrew, system PATH)
- Handles video metadata extraction, audio extraction, and final video rendering
- Streamlined architecture with removed legacy Canvas and GPU renderers

#### WhisperService (`src/services/whisper.ts`)
- Interfaces with OpenAI Whisper for audio transcription
- Provides word-level timestamps for karaoke-style captions
- Supports multiple Whisper models (tiny, base, small, medium, large)
- Auto-detects Whisper installation and handles model downloads

#### VideoEditor (`src/services/videoEditor.ts`)
- Handles complex video editing operations
- Supports word-level deletions by comparing caption states
- Uses FFmpeg for segment extraction and concatenation
- Merges overlapping time segments for efficient processing

#### FFmpegOverlayRenderer (`src/services/ffmpegOverlayRenderer.ts`)
- High-performance FFmpeg-based overlay rendering system
- Prevents timing conflicts between overlay files with intelligent overlap detection
- Precise millisecond-level timing conversion with `msToSeconds()` helper
- Optimized filter chain building for multiple PNG overlays with exclusive timing
- Enhanced caption word timing with gap enforcement to prevent visual conflicts

#### CanvasVideoRenderer (`src/services/canvasRenderer.ts`)
- Web-compatible Canvas-based rendering system
- Three-step process: extract frames → render captions on Canvas → re-encode
- Ensures pixel-perfect caption rendering matching the preview
- Fallback system for failed renders

### UI Components

#### App.tsx - Main Application State
- Manages global state: video file, captions, selection, history
- Implements undo/redo system with keyboard shortcuts (Cmd/Ctrl+Z)
- Handles dependency checking (FFmpeg/Whisper availability)
- Coordinates video processing pipeline
- Sets default caption styling: 85px font, transparent background, emphasis mode enabled
- Provides progress tracking for transcription and rendering operations
- Features 60/40 split layout between video preview and styling panels for balanced workspace

#### VideoPanel.tsx - Video Preview
- HTML5 video element with Canvas overlay for caption preview
- Handles drag & drop video import
- Real-time caption rendering synchronized with video playback
- Responsive canvas sizing matching video dimensions
- Video seeking synchronization when currentTime prop changes
- Modern UI with gradient headers and real-time indicators

#### TimelinePanel.tsx - Caption Timeline
- Visual timeline representation of caption segments
- Click-to-seek functionality
- Double-click segment synchronization (selects segment and seeks to start time)
- Current time indicator and segment highlighting
- Scroll support for long videos
- Segment deletion functionality with confirmation

#### StylingPanel.tsx - Caption Controls
- Font, color, and positioning controls
- Word-level editing with deletion support
- Font size slider control (16-200px range)
- Scale control slider (50%-200%)
- Render mode toggle (horizontal/progressive)
- Emphasis mode for font size enhancement
- Export functionality with progress tracking
- Real-time style preview updates

### Type System

#### Core Types (`src/types/index.ts`)
- `CaptionSegment`: Individual caption with timing, text, and styling
- `CaptionStyle`: Includes renderMode ('horizontal' | 'progressive'), scale, emphasizeMode
- `WordTimestamp`: Word-level timing for karaoke effects
- `FontOption` & `ColorOption`: Styling enums including transparent background option
- `VideoFile` & `TranscriptionResult`: File and processing interfaces

### Dependencies & External Tools

#### Required System Dependencies
- **FFmpeg**: Video processing, metadata extraction, encoding
- **OpenAI Whisper**: Audio transcription with word-level timestamps

#### Key npm Dependencies
- `electron`: Desktop app framework
- `react`: UI framework
- `fluent-ffmpeg`: FFmpeg Node.js wrapper
- `canvas`: Server-side Canvas implementation for rendering
- `typescript`: Type safety and development tooling
- `webpack`: Module bundling for renderer process

## Development Patterns

### IPC Communication
- Preload script exposes safe API via `contextBridge`
- Main process handles file system operations and external tool calls
- Renderer process manages UI state and user interactions

### State Management
- React useState for local component state
- History system for undo/redo functionality
- Comparison-based change detection for video editing

### Error Handling
- Graceful fallbacks for missing dependencies
- Progress tracking for long-running operations
- Temporary file cleanup with try/finally blocks

### Performance Considerations
- Singleton pattern for service instances
- Canvas-based rendering for precision
- Frame-by-frame processing with progress updates
- Efficient segment merging for video editing

## Recent Features & Improvements

### Transcription Settings
- **TranscriptionSettings.tsx**: Dialog for configuring caption segmentation
- Character-based line wrapping (12-200 characters per line)
- Word-based line wrapping (3-20 words per line)
- Range slider controls with visual feedback
- Minimum character validation (12 char minimum)

### Enhanced Timeline Navigation
- **Double-click functionality**: Click any caption segment to select and seek to its end time
- **Video synchronization**: Automatic video seeking when timeline position changes
- **Real-time progress tracking**: Visual progress indicators during transcription and rendering

### Default Caption Styling
- **Modern defaults**: 85px font size, transparent background, emphasis mode enabled
- **Progressive text rendering**: Optional vertical line-by-line text reveal
- **Emphasis mode**: 1.05x font size multiplier for highlighted words
- **Scale controls**: 50%-200% scaling with independent font size control

### Canvas Rendering Improvements
- **Pixel-perfect preview**: Canvas overlay matches export rendering exactly
- **Progressive rendering**: Cumulative word display for vertical text reveal
- **Smart audio preservation**: Distinguishes between text edits and actual word deletions
- **Real-time synchronization**: Video seeking integration with timeline controls

### AI-Powered Content Generation
- **Multi-provider support**: OpenRouter, Anthropic (Claude), and Google AI (Gemini)
- **YouTube description generation**: AI generates SEO-optimized descriptions from captions
- **Title generation**: Creates 4 optimized title options with character counts
- **Custom prompts**: User-configurable prompts for description and title generation
- **Secure storage**: Encrypted API key storage in user's home directory
- **Project integration**: Generated content saved with projects for future reference

### Enhanced Export Options
- **SRT subtitle export**: Export captions as SRT files for YouTube uploads
- **Montserrat font support**: Added popular web font for modern styling
- **Improved video rendering**: Fixed frame mixing and timeline synchronization issues
- **Smart text filtering**: Automatic cleanup of empty captions in exports

### Video Rendering Architecture Improvements
- **Streamlined rendering services**: Removed legacy CanvasVideoRenderer and GPUCanvasVideoRenderer classes to simplify architecture
- **Enhanced FFmpegOverlayRenderer**: Intelligent overlap prevention with `ensureNoOverlaps()` method
- **Precise timing control**: Millisecond-accurate overlay timing with exclusive `gte/lt` conditions
- **Improved maintainability**: Comprehensive code comments and cleaner service dependencies
- **Better performance**: Reduced complexity in video rendering pipeline

### UI Layout Enhancements
- **Balanced workspace**: Updated to 60/40 split between video preview and styling panels
- **Responsive design**: Improved panel sizing for better content visibility
- **Streamlined controls**: Optimized for both video editing and caption styling workflows

### Keyboard Shortcuts
- **Cmd/Ctrl + ,**: Open AI Settings
- **Cmd/Ctrl + G**: Generate AI content (when captions exist)
- **Cmd/Ctrl + S**: Save project
- **Cmd/Ctrl + O**: Open project manager
- **Cmd/Ctrl + Z**: Undo/Redo

## Word Editing States & Behavior

The AI subtitle editor supports multiple word editing states that affect both preview and export:

### Word Edit States

1. **Normal** (`'normal'`)
   - **Preview**: Full audio and text display
   - **Export**: Included in final video with full audio and subtitles
   - **Use case**: Default state for all words

2. **Censored** (`'censored'`)
   - **Preview**: Text replaced with asterisks (e.g., "hello" → "h****"), full audio
   - **Export**: Censored text in subtitles, original audio preserved
   - **Use case**: Obscure inappropriate words while keeping audio timing

3. **Removed Caption** (`'removedCaption'`)
   - **Preview**: Text hidden from subtitles, full audio plays
   - **Export**: No text in subtitles, original audio preserved
   - **Use case**: Hide specific words from captions but keep them audible

4. **Silenced** (`'silenced'`)
   - **Preview**: Audio muted during word timing, text hidden
   - **Export**: Audio and video segments completely removed (shorter video)
   - **Use case**: Remove inappropriate audio while shortening timeline

5. **Cut from Video** (`'strikethrough'`)
   - **Preview**: Audio muted during word timing, text hidden  
   - **Export**: Audio and video segments completely removed (shorter video)
   - **Use case**: Remove segments entirely from final video

### Export Processing Pipeline

The export system handles word states through a two-stage process:

1. **Segment Extraction**: Only words with `normal`, `censored`, and `removedCaption` states are kept
2. **Timeline Reconstruction**: Video and audio segments are extracted and concatenated
3. **Subtitle Generation**: Text rendering respects each word's edit state

```typescript
// Words that result in segment removal
const removedStates = ['silenced', 'strikethrough'];

// Words that affect only text display
const textOnlyStates = ['censored', 'removedCaption'];
```

### Technical Implementation

**FFmpeg Operations**:
- `extractVideoSegment()`: Extracts video clips for kept segments
- `concatenateVideoSegments()`: Joins video clips into final timeline
- `extractAudioSegments()`: Extracts audio clips for kept segments
- `concatenateAudioSegments()`: Joins audio clips into final timeline

**Preview Synchronization**:
- Real-time audio muting based on `getCurrentPlayingWord()`
- Visual feedback through text styling and highlighting
- Word-level precision timing for accurate preview

## Common Development Tasks

### Adding New Caption Styles
1. Add enum values to `ColorOption` or `FontOption` in `src/types/index.ts`
2. Update styling controls in `StylingPanel.tsx`
3. Implement rendering logic in `canvasRenderer.ts`

### Extending Video Processing
1. Add new methods to appropriate service classes
2. Create IPC handlers in `main.ts`
3. Expose API through `preload.ts`
4. Call from renderer components

### UI Component Development
- Use consistent styling patterns (dark theme, #1a1a1a background)
- Implement proper TypeScript interfaces for props
- Handle loading states and error conditions
- Maintain responsive design principles

## Testing & Debugging

### Development Tools
- Chrome DevTools available in development mode
- Electron debugging via VS Code or Chrome
- Console logging throughout the processing pipeline

### Common Issues
- FFmpeg/Whisper installation and PATH detection
- Video codec compatibility
- Memory management for large videos
- Canvas rendering performance optimization

This architecture provides a solid foundation for video editing capabilities while maintaining clean separation of concerns and type safety throughout the application.