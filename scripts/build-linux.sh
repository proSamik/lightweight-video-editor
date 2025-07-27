#!/bin/bash

# Lightweight Video Editor - Linux Build Script
# This script builds the Linux app with proper icons and packaging

echo "🐧 Building Lightweight Video Editor for Linux..."

# Check if we're on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "❌ This script is designed for Linux only"
    exit 1
fi

# Check if required tools are installed
if ! command -v magick &> /dev/null; then
    echo "❌ ImageMagick is required but not installed."
    echo "   Ubuntu/Debian: sudo apt-get install imagemagick"
    echo "   Fedora: sudo dnf install ImageMagick"
    echo "   Arch: sudo pacman -S imagemagick"
    exit 1
fi

# Detect architecture
ARCH=$(uname -m)
echo "🏗️  Detected architecture: $ARCH"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
rm -rf build/icons/*.png

# Create build directories
echo "📁 Creating build directories..."
mkdir -p build/icons

# Generate icons from SVG
echo "🎨 Generating app icons..."
magick assets/icon.svg -resize 512x512 build/icons/icon.png
magick assets/icon.svg -resize 256x256 build/icons/icon@2x.png
magick assets/icon.svg -resize 128x128 build/icons/icon@1x.png

# Generate Linux-specific icons
echo "🐧 Generating Linux app icons..."
magick assets/icon.svg -resize 16x16 build/icons/16x16.png
magick assets/icon.svg -resize 32x32 build/icons/32x32.png
magick assets/icon.svg -resize 48x48 build/icons/48x48.png
magick assets/icon.svg -resize 64x64 build/icons/64x64.png
magick assets/icon.svg -resize 128x128 build/icons/128x128.png
magick assets/icon.svg -resize 256x256 build/icons/256x256.png
magick assets/icon.svg -resize 512x512 build/icons/512x512.png

# Install dependencies if needed
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🔨 Building application..."
npm run build

# Build Linux app
echo "🐧 Building Linux app..."
npm run dist:linux

# Check if build was successful
if [ -f "dist/Lightweight Video Editor-1.0.0.AppImage" ] || [ -f "dist/lightweight-video-editor_1.0.0_amd64.deb" ]; then
    echo "✅ Build successful!"
    echo "📱 App packages created:"
    
    # Check for different package types
    if [ -f "dist/Lightweight Video Editor-1.0.0.AppImage" ]; then
        echo "   - AppImage: dist/Lightweight Video Editor-1.0.0.AppImage"
    fi
    
    if [ -f "dist/lightweight-video-editor_1.0.0_amd64.deb" ]; then
        echo "   - Debian Package: dist/lightweight-video-editor_1.0.0_amd64.deb"
    fi
    
    if [ -f "dist/lightweight-video-editor-1.0.0.x86_64.rpm" ]; then
        echo "   - RPM Package: dist/lightweight-video-editor-1.0.0.x86_64.rpm"
    fi
    
    if [ -d "dist/linux-unpacked" ]; then
        echo "   - Unpacked App: dist/linux-unpacked/"
    fi
    
    echo ""
    echo "🎉 Ready to distribute!"
    echo ""
    echo "📋 Distribution Notes:"
    echo "   - AppImage: Works on most Linux distributions"
    echo "   - .deb: For Ubuntu, Debian, and derivatives"
    echo "   - .rpm: For Fedora, RHEL, and derivatives"
    echo "   - Unpacked: For manual installation"
else
    echo "❌ Build failed!"
    exit 1
fi 