#!/bin/bash

# Lightweight Video Editor - macOS Build Script
# This script builds the macOS app with proper icons and packaging

echo "🎬 Building Lightweight Video Editor for macOS..."

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script is designed for macOS only"
    exit 1
fi

# Check if required tools are installed
if ! command -v magick &> /dev/null; then
    echo "❌ ImageMagick is required but not installed. Please install it with: brew install imagemagick"
    exit 1
fi

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

# Generate DMG background
echo "🖼️  Generating DMG background..."
magick build/background.svg build/background.png

# Install dependencies if needed
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🔨 Building application..."
npm run build

# Build macOS app
echo "🍎 Building macOS app..."
npm run dist:mac

# Check if build was successful
if [ -f "dist/Lightweight Video Editor-1.0.0.dmg" ]; then
    echo "✅ Build successful!"
    echo "📱 App bundles created:"
    echo "   - Intel Mac: dist/mac/Lightweight Video Editor.app"
    echo "   - Apple Silicon: dist/mac-arm64/Lightweight Video Editor.app"
    echo "📦 DMG installers created:"
    echo "   - Intel Mac: dist/Lightweight Video Editor-1.0.0.dmg"
    echo "   - Apple Silicon: dist/Lightweight Video Editor-1.0.0-arm64.dmg"
    echo ""
    echo "🎉 Ready to distribute!"
else
    echo "❌ Build failed!"
    exit 1
fi 