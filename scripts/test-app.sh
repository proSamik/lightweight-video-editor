#!/bin/bash

# Lightweight Video Editor - Test App Script
# This script tests the app functionality and checks for issues

echo "🧪 Testing Lightweight Video Editor..."

# Check if app exists
if [ ! -d "dist/mac/Lightweight Video Editor.app" ]; then
    echo "❌ App not found. Please build the app first:"
    echo "   ./scripts/build-mac.sh"
    exit 1
fi

# Check app bundle structure
echo "📁 Checking app bundle structure..."
if [ -f "dist/mac/Lightweight Video Editor.app/Contents/MacOS/Lightweight Video Editor" ]; then
    echo "✅ Executable found"
else
    echo "❌ Executable not found"
    exit 1
fi

if [ -f "dist/mac/Lightweight Video Editor.app/Contents/Info.plist" ]; then
    echo "✅ Info.plist found"
else
    echo "❌ Info.plist not found"
    exit 1
fi

# Check app permissions
echo "🔐 Checking app permissions..."
ls -la "dist/mac/Lightweight Video Editor.app/Contents/MacOS/"

# Check for quarantine attributes
echo "🔍 Checking for quarantine attributes..."
xattr "dist/mac/Lightweight Video Editor.app"

# Test app launch (non-interactive)
echo "🚀 Testing app launch..."
timeout 10s open "dist/mac/Lightweight Video Editor.app" 2>/dev/null

# Check if app process is running
sleep 2
if pgrep -f "Lightweight Video Editor" > /dev/null; then
    echo "✅ App process is running"
    
    # Get app process info
    echo "📊 App process info:"
    ps aux | grep "Lightweight Video Editor" | grep -v grep
    
    # Kill the app for testing
    echo "🛑 Stopping app for testing..."
    pkill -f "Lightweight Video Editor"
else
    echo "❌ App process not found"
fi

echo ""
echo "🎉 App test completed!"
echo ""
echo "📋 Next steps:"
echo "   1. Run: ./scripts/run-app.sh"
echo "   2. Try dragging a video file onto the app"
echo "   3. Check console for any errors (Cmd+Option+I)"
echo "   4. Test the transcription settings dialog" 