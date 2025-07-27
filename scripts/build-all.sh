#!/bin/bash

# Lightweight Video Editor - Universal Build Script
# This script detects the platform and runs the appropriate build script

echo "🎬 Lightweight Video Editor - Universal Build Script"
echo "=================================================="

# Detect operating system
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 Detected macOS"
    echo "Running macOS build script..."
    ./scripts/build-mac.sh
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 Detected Linux"
    echo "Running Linux build script..."
    ./scripts/build-linux.sh
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    echo "🪟 Detected Windows (Git Bash/WSL)"
    echo "Please run the Windows batch script instead:"
    echo "   scripts/build-windows.bat"
    echo ""
    echo "Or use the npm command directly:"
    echo "   npm run dist:win"
    exit 1
else
    echo "❌ Unsupported operating system: $OSTYPE"
    echo ""
    echo "Supported platforms:"
    echo "   - macOS (darwin)"
    echo "   - Linux (linux-gnu)"
    echo "   - Windows (use build-windows.bat)"
    echo ""
    echo "Manual build commands:"
    echo "   npm run dist:mac    # macOS"
    echo "   npm run dist:linux  # Linux"
    echo "   npm run dist:win    # Windows"
    echo "   npm run dist:all    # All platforms"
    exit 1
fi 