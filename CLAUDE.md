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
│   ├── contexts/          # React contexts
│   │   └── ThemeContext.tsx       # Theme management context
│   ├── design/            # Design system
│   │   └── tokens.ts              # Design tokens and theming
│   ├── data/              # Static data
│   │   └── captionPresets.ts      # Predefined caption styling presets
│   └── components/        # React components
│       ├── VideoPanel.tsx         # Video preview with canvas overlay
│       ├── UnifiedTimeline.tsx    # Combined clip and subtitle timeline interface
│       ├── StylingPanel.tsx       # Caption styling controls
│       ├── TabbedRightPanel.tsx   # Tabbed interface for styling and AI panels
│       ├── TranscriptionModal.tsx # In-panel transcription progress modal
│       ├── UpdateModal.tsx        # Auto-update interface with changelog
│       ├── DependencyInstallModal.tsx # Automatic dependency installation
│       ├── ProjectManager.tsx     # Project save/load interface
│       ├── AISubtitlesPanel.tsx   # Advanced AI subtitle editing panel
│       ├── LoadingScreen.tsx      # Loading states
│       └── ui/                    # Reusable UI components
│           ├── LiquidModal.tsx    # Animated modal with liquid design
│           ├── Button.tsx         # Styled button component
│           ├── Card.tsx           # Card layout component
│           └── ...               # Other UI primitives
├── services/              # Core business logic
│   ├── ffmpeg.ts          # Video processing via FFmpeg
│   ├── whisper.ts         # Audio transcription via OpenAI Whisper with GPU detection
│   ├── videoEditor.ts     # Video editing operations (word deletions)
│   ├── ffmpegOverlayRenderer.ts # FFmpeg-based overlay rendering with timing precision
│   ├── ffmpegOverlayWithClips.ts # Advanced video rendering with clipping support
│   ├── srtExporter.ts     # SRT subtitle export for YouTube
│   ├── aiService.ts       # AI content generation (descriptions/titles)
│   ├── settingsManager.ts # Persistent settings storage
│   ├── projectManager.ts  # Project persistence and management
│   ├── clipManager.ts     # Video clip editing and timeline management
│   ├── updateService.ts   # Auto-update system with VS Code-like UX
│   ├── dependencyInstaller.ts # Automatic FFmpeg/Whisper installation
│   └── deviceDetector.ts  # GPU acceleration detection (CUDA/MPS/CPU)
├── utils/                 # Utility functions
│   └── timeFormatting.ts  # Time display and formatting utilities
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

1. **Application Startup**: 
   - System dependency detection (FFmpeg/Whisper availability)
   - GPU device detection and compatibility testing (CUDA/MPS/CPU)
   - Auto-update checks with VS Code-like notifications
   - Recent project loading and UI initialization

2. **Video Import**: 
   - Drag & drop or file selection → video metadata extraction
   - Automatic clip timeline initialization
   - Project structure setup with persistent storage

3. **Transcription Pipeline**: 
   - Video → Audio extraction with device-optimized processing
   - Hardware-accelerated Whisper transcription with progress tracking
   - Word-level timestamp generation → AI subtitle frame creation
   - Unified timeline population with intelligent track assignment

4. **Caption & Clip Editing**: 
   - Real-time styling updates with unified timeline interface
   - Clip management with automatic subtitle frame splitting
   - Word-level editing with advanced edit states (censored, silenced, removed)
   - Undo/redo system for all operations

5. **Video Export**: 
   - Export mode selection (complete, clipped, audio replacement, subtitles only)
   - FFmpeg-based overlay rendering with precise timing controls
   - Multi-threaded processing with progress tracking
   - Automatic cleanup of temporary files

### Key Services

#### UpdateService (`src/services/updateService.ts`)
- VS Code-like auto-updater with non-intrusive notifications
- Automatic update detection with changelog support
- Background downloads with progress tracking
- Install-on-quit functionality with user control

#### DependencyInstaller (`src/services/dependencyInstaller.ts`)
- Cross-platform automatic installation of FFmpeg and Whisper
- Platform detection (macOS/Homebrew, Linux/APT/YUM/DNF, Windows/portable)
- Real-time installation progress tracking with detailed status messages
- System capability assessment before installation attempts

#### DeviceDetector (`src/services/deviceDetector.ts`)
- Intelligent GPU acceleration detection for Whisper transcription
- CUDA, MPS (Apple Silicon), and CPU compatibility testing
- Real-world Whisper compatibility validation for hardware acceleration
- Automatic fallback to CPU when GPU acceleration is unavailable
- Performance optimization with up to 10x transcription speed improvements

#### ClipManager (`src/services/clipManager.ts`)
- Video clip editing and timeline management
- Clip splitting, deletion, and timeline reconstruction
- Time conversion between original and effective (clipped) timelines
- Integration with project persistence (.lvep files)
- Automatic subtitle frame adjustment when clips are modified

#### ProjectManager (`src/services/projectManager.ts`)
- Persistent project storage with comprehensive metadata
- Recent projects tracking with visual previews
- Project operations (save, load, delete) with user confirmations
- Integration with clip timeline and subtitle data

#### FFmpegService (`src/services/ffmpeg.ts`)
- Singleton service for video processing
- Auto-detects FFmpeg installation paths (macOS homebrew, system PATH)
- Handles video metadata extraction, audio extraction, and final video rendering
- Streamlined architecture with intelligent overlap detection

#### WhisperService (`src/services/whisper.ts`)
- Hardware-accelerated audio transcription with OpenAI Whisper
- Automatic device detection and optimal device selection (CUDA/MPS/CPU)
- Word-level timestamp generation for karaoke-style captions
- Supports multiple Whisper models (tiny, base, small, medium, large)
- Real-world compatibility testing for MPS devices with Whisper
- Auto-detects Whisper installation and handles model downloads
- Enhanced progress tracking with speed estimates and ETA calculations

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

#### FFmpegOverlayWithClips (`src/services/ffmpegOverlayWithClips.ts`)
- Advanced video rendering with clipping support for non-destructive editing
- Four-phase rendering pipeline: audio replacement → video clipping → caption timing adjustment → overlay rendering
- Intelligent caption timing adjustment for removed video segments
- Reuses FFmpegOverlayRenderer for optimized subtitle overlay processing
- Temporary file management in assets directory with automatic cleanup
- Full cancellation support with worker thread termination and FFmpeg process cleanup

#### CanvasVideoRenderer (`src/services/canvasRenderer.ts`)
- Web-compatible Canvas-based rendering system
- Three-step process: extract frames → render captions on Canvas → re-encode
- Ensures pixel-perfect caption rendering matching the preview
- Fallback system for failed renders

### UI Components

#### App.tsx - Main Application State
- Manages global state: video file, captions, clips, selection, history
- Implements undo/redo system with keyboard shortcuts (Cmd/Ctrl+Z)
- Handles dependency checking with automatic installation prompts
- Coordinates video processing pipeline with GPU acceleration
- Auto-update integration with progress tracking and user notifications
- Sets default caption styling: 85px font, transparent background, emphasis mode enabled
- Provides progress tracking for transcription and rendering operations
- Features 60/40 split layout between video preview and styling panels for balanced workspace
- Project management integration with recent projects and persistence

#### VideoPanel.tsx - Video Preview
- HTML5 video element with Canvas overlay for caption preview
- Handles drag & drop video import
- Real-time caption rendering synchronized with video playback
- Responsive canvas sizing matching video dimensions
- Video seeking synchronization when currentTime prop changes
- Modern UI with gradient headers and real-time indicators

#### TabbedRightPanel.tsx - Tabbed Interface
- Houses both styling and AI subtitle panels in a tabbed interface
- Intelligent tab switching prevention during transcription
- Visual feedback for disabled tabs (reduced opacity, cursor changes)
- Seamless integration of TranscriptionModal during processing
- Maintains active tab state across transcription sessions

#### TranscriptionModal.tsx - In-Panel Progress Display
- **Liquid design**: Gradient backgrounds and blur effects matching TranscriptionSettings
- **Real-time progress**: Animated progress bar with shimmer effects and percentage display
- **Status information**: Current transcription message, processing speed, and ETA
- **Visual elements**: Floating background decorations and pulsing activity icon
- **Tab overlay**: Completely replaces tab content during transcription to prevent interaction
- **Responsive design**: Adapts to right panel dimensions with proper centering

#### UnifiedTimeline.tsx - Combined Timeline Interface
- **Unified Architecture**: Combined clip and subtitle editing in a single timeline interface
- **Intelligent Track Assignment**: Automatic track allocation to prevent overlaps between clips and subtitles
- **Clip Editing Tools**: Split clips at playhead position (Ctrl+S) and delete clips (Delete/Backspace)
- **Subtitle Frame Splitting**: Automatic subtitle adjustment when clips are split to maintain sync
- **Visual Feedback**: Clear distinction between clips (top track) and subtitle segments (lower tracks)
- **Time Conversion**: Seamless conversion between original video time and effective timeline time
- **Real-time Updates**: Instant timeline updates as clips are modified
- **Click-to-Seek**: Click any segment to jump to that position
- **Double-click Selection**: Double-click segments to select and seek to middle time
- **Zoom and Scroll**: Advanced zoom controls with viewport position maintenance
- **Progress Integration**: Real-time transcription progress display within timeline

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

### Auto-Update System
- **UpdateService.tsx**: VS Code-like update notifications with detailed changelogs
- **Non-intrusive UX**: Background update checks with user control over downloads
- **Automatic Installation**: Install-on-quit functionality with progress tracking
- **GitHub Integration**: Direct links to release pages with formatted release notes
- **Update Modals**: Comprehensive update UI with download progress and error handling

### Dependency Management System
- **DependencyInstallModal.tsx**: Automated FFmpeg and Whisper installation
- **Platform Detection**: Smart installation methods per OS (Homebrew, APT, YUM, DNF, portable)
- **Progress Tracking**: Real-time installation progress with detailed status messages
- **Capability Assessment**: Pre-installation system requirements checking
- **Manual Fallback**: Detailed manual installation instructions when automatic fails

### Hardware Acceleration & Device Detection
- **DeviceDetector.ts**: Intelligent GPU acceleration detection for transcription
- **Multi-GPU Support**: CUDA (NVIDIA), MPS (Apple Silicon), and CPU optimization
- **Compatibility Testing**: Real-world Whisper compatibility validation for hardware
- **Performance Optimization**: Up to 10x transcription speed improvements on compatible hardware
- **Graceful Fallback**: Automatic CPU fallback when GPU acceleration unavailable

### Unified Timeline Architecture
- **UnifiedTimeline.tsx**: Revolutionary timeline combining clips and subtitles in one interface
- **Intelligent Track Management**: Automatic track allocation to prevent overlaps
- **Clip Editing Integration**: Split (Ctrl+S) and delete (Delete/Backspace) clips with timeline updates
- **Subtitle Frame Splitting**: Automatic subtitle adjustment when clips are modified
- **Time Conversion System**: Seamless original ↔ effective timeline time conversion
- **Advanced Zoom**: Viewport-aware zoom with position maintenance during timeline changes

### Project Management Enhancement
- **ProjectManager.tsx**: Comprehensive project persistence with visual interface
- **Recent Projects**: Quick access with thumbnails and metadata display
- **Clip Integration**: Full clip timeline data persistence in .lvep project files
- **Keyboard Shortcuts**: Cmd/Ctrl+S (save), Cmd/Ctrl+O (open) with native dialogs

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
- **Advanced Clipping Support**: New FFmpegOverlayWithClips service for video segment processing with subtitle timing adjustment
- **Precise timing control**: Millisecond-accurate overlay timing with exclusive `gte/lt` conditions
- **Improved maintainability**: Comprehensive code comments and cleaner service dependencies
- **Better performance**: Reduced complexity in video rendering pipeline

### UI Layout Enhancements
- **Balanced workspace**: Updated to 60/40 split between video preview and styling panels
- **Responsive design**: Improved panel sizing for better content visibility
- **Streamlined controls**: Optimized for both video editing and caption styling workflows
- **Tabbed right panel**: Integrated tabbed interface combining styling and AI subtitle panels
- **In-panel transcription modal**: Non-intrusive progress display within the right panel during processing

### Transcription User Experience Improvements
- **Seamless workflow integration**: TranscriptionModal appears directly in the tabbed right panel
- **Tab interaction prevention**: Automatic disabling of tab switching during transcription
- **Visual progress feedback**: Real-time progress tracking with animated elements and status updates
- **Liquid design consistency**: Matches the aesthetic of other modal components with gradient backgrounds
- **Non-blocking interface**: Users can still interact with video playback while transcription runs

### Advanced Export Modes
- **Complete Video**: Standard export with subtitles and optional audio replacement
- **Complete Video (Clipped)**: Export with removed video segments and automatic subtitle timing adjustment
- **Video with New Audio**: Replace original audio track without subtitles
- **Video with Subtitles Only**: Add subtitles while preserving original audio

### Keyboard Shortcuts
- **Cmd/Ctrl + ,**: Open AI Settings
- **Cmd/Ctrl + G**: Generate AI content (when captions exist)
- **Cmd/Ctrl + S**: Save project (or split clip in clip mode)
- **Cmd/Ctrl + O**: Open project manager
- **Cmd/Ctrl + Z**: Undo/Redo
- **Delete/Backspace**: Delete clip at playhead (in clip mode)
- **Spacebar**: Play/Pause video

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