#!/bin/bash

# Lightweight Video Editor - Run App Script
# This script removes quarantine attributes and runs the app

echo "🎬 Running Lightweight Video Editor..."

# Check if app exists
if [ ! -d "dist/mac/Lightweight Video Editor.app" ]; then
    echo "❌ App not found. Please build the app first:"
    echo "   ./scripts/build-mac.sh"
    exit 1
fi

# Remove quarantine attributes
echo "🔓 Removing quarantine attributes..."
xattr -cr "dist/mac/Lightweight Video Editor.app"

# Run the app
echo "🚀 Starting Lightweight Video Editor..."
open "dist/mac/Lightweight Video Editor.app"

echo "✅ App started! Check your dock for the app icon."
echo ""
echo "💡 Tips:"
echo "   - If you still get a security warning, go to System Preferences > Security & Privacy"
echo "   - Click 'Open Anyway' next to 'Lightweight Video Editor'"
echo "   - Try dragging a video file onto the app window to test" 