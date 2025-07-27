# Build Scripts

This directory contains automated build scripts for the Lightweight Video Editor.

## Available Scripts

### Universal Scripts
- **`build-all.sh`** - Universal script that detects your platform and runs the appropriate build script

### Platform-Specific Scripts

#### macOS
- **`build-mac.sh`** - Builds macOS app with DMG installer
  - Supports both Intel and Apple Silicon
  - Creates universal binary
  - Generates professional app icon

#### Linux
- **`build-linux.sh`** - Builds Linux app with multiple package formats
  - AppImage (universal)
  - Debian package (.deb)
  - RPM package (.rpm)
  - Unpacked app directory

#### Windows
- **`build-windows.bat`** - Batch script for Windows (Command Prompt)
- **`build-windows.ps1`** - PowerShell script for Windows (PowerShell)

## Usage

### Quick Start
```bash
# From the project root, run the universal script
./scripts/build-all.sh
```

### Platform-Specific
```bash
# macOS
./scripts/build-mac.sh

# Linux
./scripts/build-linux.sh

# Windows (Command Prompt)
scripts\build-windows.bat

# Windows (PowerShell)
scripts\build-windows.ps1
```

## Prerequisites

All scripts require:
- **Node.js** and **npm**
- **ImageMagick** for icon generation

### Installing ImageMagick

#### macOS
```bash
brew install imagemagick
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get install imagemagick
```

#### Linux (Fedora)
```bash
sudo dnf install ImageMagick
```

#### Linux (Arch)
```bash
sudo pacman -S imagemagick
```

#### Windows
- Download from [ImageMagick.org](https://imagemagick.org/)
- Or use Chocolatey: `choco install imagemagick`

## What Each Script Does

1. **Detects platform and architecture**
2. **Checks for required tools** (Node.js, ImageMagick)
3. **Cleans previous builds**
4. **Generates app icons** from SVG source
5. **Installs dependencies** (npm install)
6. **Builds the application** (TypeScript + Webpack)
7. **Packages the app** using electron-builder
8. **Reports results** with file locations

## Output Files

### macOS
- `dist/mac/Lightweight Video Editor.app` (Intel)
- `dist/mac-arm64/Lightweight Video Editor.app` (Apple Silicon)
- `dist/Lightweight Video Editor-1.0.0.dmg` (Intel DMG)
- `dist/Lightweight Video Editor-1.0.0-arm64.dmg` (Apple Silicon DMG)

### Linux
- `dist/Lightweight Video Editor-1.0.0.AppImage`
- `dist/lightweight-video-editor_1.0.0_amd64.deb`
- `dist/lightweight-video-editor-1.0.0.x86_64.rpm`
- `dist/linux-unpacked/`

### Windows
- `dist/Lightweight Video Editor Setup 1.0.0.exe`
- `dist/Lightweight Video Editor-1.0.0.msi`
- `dist/win-unpacked/`

## Troubleshooting

### Common Issues

1. **ImageMagick not found**
   - Install ImageMagick for your platform
   - Ensure it's in your PATH

2. **Node.js not found**
   - Install Node.js from [nodejs.org](https://nodejs.org/)
   - Ensure it's in your PATH

3. **Permission denied**
   - Make scripts executable: `chmod +x scripts/*.sh`

4. **Build fails**
   - Check console output for specific errors
   - Ensure all dependencies are installed
   - Try running `npm install` manually first 