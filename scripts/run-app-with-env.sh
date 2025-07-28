#!/bin/bash

# Lightweight Video Editor - Run App with Environment Script
# This script runs the app with proper environment variables to ensure Whisper is accessible

echo "🎬 Running Lightweight Video Editor with proper environment..."

# Check if app exists
if [ ! -d "dist/mac-arm64/Lightweight Video Editor.app" ]; then
    echo "❌ App not found. Please build the app first:"
    echo "   ./scripts/build-mac.sh"
    exit 1
fi

# Remove quarantine attributes
echo "🔓 Removing quarantine attributes..."
xattr -cr "dist/mac-arm64/Lightweight Video Editor.app"

# Set up environment variables to ensure Whisper is accessible
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:$PATH"
export PYTHONPATH="/opt/homebrew/lib/python3.*/site-packages:$PYTHONPATH"

echo "🔧 Environment setup:"
echo "   PATH: $PATH"
echo "   PYTHONPATH: $PYTHONPATH"

# Run the app with environment variables
echo "🚀 Starting Lightweight Video Editor..."
open "dist/mac-arm64/Lightweight Video Editor.app"

echo "✅ App started with proper environment!"
echo ""
echo "💡 If Whisper still doesn't work:"
echo "   1. Try installing Whisper globally: pip3 install openai-whisper"
echo "   2. Or install via Homebrew: brew install whisper"
echo "   3. Check the console for detailed error messages" 