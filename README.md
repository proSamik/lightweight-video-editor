# Karaoke-Style Caption Editor for macOS

A desktop application for macOS that automatically generates karaoke-style captions from video files using AI transcription, with a visual editor for customizing text appearance and positioning.

## Features

- **Video Import**: Support for MP4, MOV, AVI video formats
- **AI Transcription**: Automatic caption generation using OpenAI Whisper with word-level timestamps
- **Karaoke Highlighting**: Word-by-word highlighting synchronized with video playback
- **Visual Editor**: Customize fonts, colors, positioning, and sizing
- **Real-time Preview**: See your captions overlaid on the video as you edit
- **Export**: Render final video with burned-in subtitles

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

## Usage

1. **Import Video**: Click the drop zone or button to select a video file
2. **Auto-Generate Captions**: The app will automatically extract audio and generate captions using Whisper
3. **Edit Styling**: Select caption segments to customize:
   - Font (5 presets available)
   - Font size (16-72px)
   - Text color (5 options)
   - Highlighter color (5 options)
   - Background color (5 options including transparent)
   - Position (X/Y coordinates)
   - Text width
4. **Preview**: Watch your video with real-time karaoke-style highlighting
5. **Export**: Click "Export Video with Captions" to render the final video

## Architecture

- **Frontend**: Electron + TypeScript + React
- **Video Processing**: FFmpeg
- **Transcription**: OpenAI Whisper (local)
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

## License

ISC