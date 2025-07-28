#!/bin/bash

# Whisper Debug Test Script
# This script tests Whisper installation and functionality in detail

echo "🔍 Whisper Debug Test Script"
echo "============================"

# Test 1: Check Python installation
echo ""
echo "1️⃣ Testing Python installation..."
if command -v python3 &> /dev/null; then
    echo "✅ Python3 found: $(which python3)"
    echo "   Version: $(python3 --version)"
else
    echo "❌ Python3 not found"
    exit 1
fi

# Test 2: Check Whisper installation
echo ""
echo "2️⃣ Testing Whisper installation..."
if python3 -m whisper --help &> /dev/null; then
    echo "✅ Whisper found via python3 -m whisper"
    echo "   Version: $(python3 -m whisper --version 2>/dev/null || echo 'Version info not available')"
else
    echo "❌ Whisper not found via python3 -m whisper"
    echo "   Installing Whisper..."
    pip3 install openai-whisper
fi

# Test 3: Check direct whisper command
echo ""
echo "3️⃣ Testing direct whisper command..."
if command -v whisper &> /dev/null; then
    echo "✅ Whisper found in PATH: $(which whisper)"
    echo "   Version: $(whisper --version 2>/dev/null || echo 'Version info not available')"
else
    echo "⚠️  Whisper not found in PATH (this is normal if using python3 -m whisper)"
fi

# Test 4: Test Whisper with a simple audio file
echo ""
echo "4️⃣ Testing Whisper functionality..."
echo "   Creating a test audio file..."

# Create a simple test audio file using ffmpeg
if command -v ffmpeg &> /dev/null; then
    echo "   Using ffmpeg to create test audio..."
    ffmpeg -f lavfi -i "sine=frequency=1000:duration=3" -acodec pcm_s16le -ar 16000 -ac 1 test_audio.wav -y 2>/dev/null
    
    if [ -f "test_audio.wav" ]; then
        echo "✅ Test audio file created: test_audio.wav"
        
        echo "   Running Whisper transcription test..."
        if python3 -m whisper test_audio.wav --model tiny --output_format json --output_dir . --verbose False 2>/dev/null; then
            echo "✅ Whisper transcription successful!"
            
            if [ -f "test_audio.json" ]; then
                echo "✅ Output JSON file created: test_audio.json"
                echo "   File size: $(ls -lh test_audio.json | awk '{print $5}')"
                
                # Show first few lines of JSON
                echo "   JSON preview:"
                head -5 test_audio.json
            else
                echo "❌ Output JSON file not found"
            fi
        else
            echo "❌ Whisper transcription failed"
        fi
        
        # Cleanup
        rm -f test_audio.wav test_audio.json
    else
        echo "❌ Failed to create test audio file"
    fi
else
    echo "⚠️  FFmpeg not found, skipping audio test"
fi

# Test 5: Check environment variables
echo ""
echo "5️⃣ Checking environment variables..."
echo "   PATH: $PATH"
echo "   PYTHONPATH: $PYTHONPATH"
echo "   HOME: $HOME"

# Test 6: Check common Whisper paths
echo ""
echo "6️⃣ Checking common Whisper paths..."
PATHS=(
    "/usr/local/bin/whisper"
    "/opt/homebrew/bin/whisper"
    "/usr/bin/whisper"
    "/usr/local/bin/python3"
    "/opt/homebrew/bin/python3"
    "/usr/bin/python3"
)

for path in "${PATHS[@]}"; do
    if [ -f "$path" ]; then
        echo "✅ Found: $path"
    else
        echo "❌ Not found: $path"
    fi
done

echo ""
echo "🎉 Whisper debug test completed!"
echo ""
echo "💡 If Whisper is working but the app still fails:"
echo "   1. Check the app's console logs for detailed error messages"
echo "   2. Ensure the app has proper permissions to write to temp directories"
echo "   3. Try running the app with the environment script: ./scripts/run-app-with-env.sh" 