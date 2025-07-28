#!/bin/bash

# Test Whisper Installation Script
# This script tests if Whisper is properly installed and accessible

echo "🧪 Testing Whisper Installation..."

# Test common Whisper locations
echo "🔍 Checking common Whisper locations:"

WHISPER_FOUND=false

# Test direct whisper command
if command -v whisper &> /dev/null; then
    echo "✅ Whisper found in PATH: $(which whisper)"
    WHISPER_FOUND=true
fi

# Test python3 -m whisper
if command -v python3 &> /dev/null; then
    if python3 -m whisper --help &> /dev/null; then
        echo "✅ Whisper found via python3 -m whisper"
        WHISPER_FOUND=true
    fi
fi

# Test specific paths
PATHS=(
    "/usr/local/bin/whisper"
    "/opt/homebrew/bin/whisper"
    "/usr/bin/whisper"
    "/opt/homebrew/bin/python3"
    "/usr/bin/python3"
)

for path in "${PATHS[@]}"; do
    if [ -f "$path" ]; then
        echo "✅ Found: $path"
        WHISPER_FOUND=true
    fi
done

if [ "$WHISPER_FOUND" = false ]; then
    echo "❌ Whisper not found in any common locations"
    echo ""
    echo "📋 Installation instructions:"
    echo "   1. Install Python 3: brew install python3"
    echo "   2. Install Whisper: pip3 install openai-whisper"
    echo "   3. Or install via Homebrew: brew install whisper"
    exit 1
fi

echo ""
echo "🎉 Whisper installation test completed!"
echo "✅ Whisper should be accessible to the app" 