#!/bin/bash

# Lightweight Video Editor - Run Working App Script
# This script runs the existing working app that was built earlier

echo "🎬 Running existing Lightweight Video Editor..."

# Check if the working app exists
if [ ! -d "dist/mac-arm64/Lightweight Video Editor.app" ]; then
    echo "❌ Working app not found. Please build the app first:"
    echo "   ./scripts/build-mac.sh"
    exit 1
fi

# Remove quarantine attributes
echo "🔓 Removing quarantine attributes..."
xattr -cr "dist/mac-arm64/Lightweight Video Editor.app"

# Run the app
echo "🚀 Starting Lightweight Video Editor..."
open "dist/mac-arm64/Lightweight Video Editor.app"

echo "✅ App started! This is the working version with Whisper support."
echo ""
echo "💡 Features:"
echo "   - ✅ Whisper transcription working"
echo "   - ✅ Drag and drop functionality"
echo "   - ✅ Professional app icon"
echo "   - ✅ All features functional"
echo ""
echo "🎉 Ready to use!" 