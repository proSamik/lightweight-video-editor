# Lightweight Video Editor

A professional Electron-based video editor that specializes in adding captions to videos with word-level timing. Create karaoke-style subtitles with AI transcription, real-time editing, and pixel-perfect preview.

## Features

- **Video Import**: Support for MP4, MOV, AVI video formats with drag-and-drop interface
- **AI Transcription**: Automatic caption generation using OpenAI Whisper with word-level timestamps
- **Karaoke Highlighting**: Word-by-word highlighting synchronized with video playback
- **Visual Editor**: Customize fonts, colors, positioning, and sizing with real-time preview
- **Advanced Timeline**: Interactive timeline with click-to-seek and double-click segment selection
- **Transcription Settings**: Configurable caption segmentation (character/word-based line wrapping)
- **Progressive Rendering**: Optional vertical line-by-line text reveal for dynamic captions
- **Word-Level Editing**: Delete individual words with automatic video segment processing
- **Export**: Render final video with burned-in subtitles using canvas-based rendering

## Prerequisites

Before running the application, you need to install:

### FFmpeg
```bash
brew install ffmpeg
```

### OpenAI Whisper
```bash
pip install openai-whisper
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd lightweight-video-editor
```

2. Install dependencies:
```bash
npm install
```

3. Build the application:
```bash
npm run build
```

4. Start the application:
```bash
npm start
```

## Development

For development with hot reload:

```bash
# Start the development server
npm run dev
```

This will start both the main process and renderer development servers.

### Build Commands
```bash
npm run build          # Build both main and renderer
npm run build-main     # Build Electron main process only
npm run build-renderer # Build React renderer only
npm run watch-main     # Watch main process changes
npm run dev-renderer   # Start webpack dev server for renderer
```

## Building Apps for All Platforms

### Prerequisites
- **macOS**: ImageMagick (`brew install imagemagick`)
- **Linux**: ImageMagick (`sudo apt-get install imagemagick` or equivalent)
- **Windows**: ImageMagick (download from imagemagick.org or `choco install imagemagick`)
- Node.js and npm on all platforms

### Universal Build Script
```bash
# Automatically detects your platform and runs the appropriate build script
./scripts/build-all.sh
```

### Platform-Specific Build Scripts

#### macOS
```bash
# Automated build script
./scripts/build-mac.sh

# Manual build
npm run dist:mac
```

#### Linux
```bash
# Automated build script
./scripts/build-linux.sh

# Manual build
npm run dist:linux
```

#### Windows
```bash
# Automated build script (run in Command Prompt)
scripts\build-windows.bat

# Automated build script (run in PowerShell)
scripts\build-windows.ps1

# Manual build
npm run dist:win
```

### Build All Platforms
```bash
# Build for all platforms at once
npm run dist:all
```

### Build Outputs

#### macOS
- **App Bundles**: `dist/mac/` and `dist/mac-arm64/`
- **DMG Installers**: 
  - Intel Mac: `dist/Lightweight Video Editor-1.0.0.dmg` (288MB)
  - Apple Silicon: `dist/Lightweight Video Editor-1.0.0-arm64.dmg` (594MB)

#### Linux
- **AppImage**: `dist/Lightweight Video Editor-1.0.0.AppImage`
- **Debian Package**: `dist/lightweight-video-editor_1.0.0_amd64.deb`
- **RPM Package**: `dist/lightweight-video-editor-1.0.0.x86_64.rpm`
- **Unpacked App**: `dist/linux-unpacked/`

#### Windows
- **Installer**: `dist/Lightweight Video Editor Setup 1.0.0.exe`
- **MSI Package**: `dist/Lightweight Video Editor-1.0.0.msi`
- **Portable App**: `dist/win-unpacked/`

### App Features
- ✅ **Universal Support**: Intel and ARM64 architectures
- ✅ **Professional Icons**: Custom icons for each platform
- ✅ **Native Packaging**: Platform-specific installers
- ✅ **Cross-Platform**: Works on macOS, Linux, and Windows
- ✅ **Security**: Proper entitlements and code signing ready

## Usage

1. **Import Video**: Drag and drop a video file or click the drop zone to select a video file
2. **Configure Transcription**: Use the transcription settings dialog to customize:
   - Character-based line wrapping (12-200 characters per line)
   - Word-based line wrapping (3-20 words per line)
   - Minimum character validation (12 char minimum)
3. **Auto-Generate Captions**: The app will automatically extract audio and generate captions using Whisper
4. **Edit Styling**: Select caption segments to customize:
   - Font (5 presets available)
   - Font size (16-200px with 85px default)
   - Text color (5 options)
   - Highlighter color (5 options)
   - Background color (5 options including transparent)
   - Position (X/Y coordinates)
   - Scale control (50%-200%)
   - Render mode (horizontal/progressive)
   - Emphasis mode (1.05x font size multiplier)
5. **Timeline Navigation**: 
   - Click any segment to seek to that position
   - Double-click segments to select and seek to start time
   - Visual progress indicators during processing
6. **Preview**: Watch your video with real-time karaoke-style highlighting
7. **Export**: Click "Export Video with Captions" to render the final video with pixel-perfect caption rendering

## Architecture

- **Frontend**: Electron + TypeScript + React
- **Video Processing**: FFmpeg with canvas-based rendering fallback
- **Transcription**: OpenAI Whisper (local) with word-level timestamps
- **Rendering**: Canvas-based caption rendering for pixel-perfect output
- **Platform**: macOS only

## Styling Options

### Fonts
- Arial Bold
- Helvetica Neue Medium
- SF Pro Display Semibold (macOS native)
- Futura Bold
- Impact

### Colors
**Text Colors**: White, Black, Yellow, Red, Blue
**Highlighter Colors**: Bright Yellow, Orange, Green, Pink, Cyan
**Background Colors**: Transparent, Black Semi-transparent, White Semi-transparent, Dark Gray, Navy Blue

### Default Styling
- **Font Size**: 85px (default)
- **Background**: Transparent
- **Emphasis Mode**: Enabled (1.05x font size multiplier)
- **Render Mode**: Horizontal (with progressive option available)
- **Scale Control**: 100% (50%-200% range available)

## Advanced Features

### Transcription Settings
- **Character-based Wrapping**: 12-200 characters per line with range slider controls
- **Word-based Wrapping**: 3-20 words per line with visual feedback
- **Minimum Validation**: Ensures at least 12 characters per line
- **Real-time Preview**: See changes immediately in the timeline

### Enhanced Timeline Navigation
- **Click-to-Seek**: Click any caption segment to jump to that position
- **Double-click Selection**: Double-click segments to select and seek to start time
- **Video Synchronization**: Automatic video seeking when timeline position changes
- **Progress Tracking**: Visual indicators during transcription and rendering operations

### Canvas Rendering System
- **Pixel-perfect Preview**: Canvas overlay matches export rendering exactly
- **Progressive Rendering**: Cumulative word display for vertical text reveal
- **Smart Audio Preservation**: Distinguishes between text edits and actual word deletions
- **Fallback System**: Graceful handling of failed renders with alternative methods

### Word-Level Editing
- **Individual Word Deletion**: Remove specific words with automatic video segment processing
- **Segment Merging**: Efficient processing of overlapping time segments
- **Change Detection**: Comparison-based system for identifying word-level modifications

## Keyboard Shortcuts

- **Undo**: Cmd/Ctrl + Z
- **Redo**: Cmd/Ctrl + Shift + Z (when available)

## Troubleshooting

### Dependencies Not Found
If you see dependency errors:
1. Ensure FFmpeg is installed: `ffmpeg -version`
2. Ensure Whisper is installed: `whisper --help`
3. Restart the application after installing dependencies

### Video Won't Load
- Ensure your video is in a supported format (MP4, MOV, AVI)
- Check that the file isn't corrupted
- Try with a smaller video file first

### Transcription Fails
- Check your internet connection (Whisper may need to download models)
- Ensure the video has clear audio
- Try with a shorter video file first
- Verify transcription settings are appropriate for your content

### Rendering Issues
- The app uses canvas-based rendering for precise caption placement
- If rendering fails, the system will attempt fallback methods
- Check available disk space for temporary files during processing

## Development Patterns

### IPC Communication
- Secure bridge between main and renderer processes
- File system operations handled in main process
- UI state management in renderer process

### State Management
- React useState for local component state
- History system for undo/redo functionality
- Comparison-based change detection for video editing

### Performance Considerations
- Singleton pattern for service instances
- Canvas-based rendering for precision
- Frame-by-frame processing with progress updates
- Efficient segment merging for video editing

## License

ISC