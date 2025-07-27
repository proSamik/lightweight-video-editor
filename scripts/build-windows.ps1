# Lightweight Video Editor - Windows PowerShell Build Script
# This script builds the Windows app with proper icons and packaging

Write-Host "🪟 Building Lightweight Video Editor for Windows..." -ForegroundColor Green

# Check if we're on Windows
if ($env:OS -ne "Windows_NT") {
    Write-Host "❌ This script is designed for Windows only" -ForegroundColor Red
    exit 1
}

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is required but not installed" -ForegroundColor Red
    Write-Host "   Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if ImageMagick is installed
try {
    $magickVersion = magick --version
    Write-Host "✅ ImageMagick found" -ForegroundColor Green
} catch {
    Write-Host "❌ ImageMagick is required but not installed" -ForegroundColor Red
    Write-Host "   Please install ImageMagick from https://imagemagick.org/" -ForegroundColor Yellow
    Write-Host "   Or use Chocolatey: choco install imagemagick" -ForegroundColor Yellow
    exit 1
}

# Detect architecture
$arch = $env:PROCESSOR_ARCHITECTURE
if ($arch -eq "AMD64") {
    $BUILD_ARCH = "x64"
    Write-Host "🏗️  Detected architecture: x64" -ForegroundColor Cyan
} elseif ($arch -eq "ARM64") {
    $BUILD_ARCH = "arm64"
    Write-Host "🏗️  Detected architecture: ARM64" -ForegroundColor Cyan
} else {
    $BUILD_ARCH = "x64"
    Write-Host "⚠️  Unknown architecture: $arch, defaulting to x64" -ForegroundColor Yellow
}

# Clean previous builds
Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
}
if (Test-Path "build\icons\*.png") {
    Remove-Item "build\icons\*.png" -Force
}

# Create build directories
Write-Host "📁 Creating build directories..." -ForegroundColor Yellow
if (!(Test-Path "build\icons")) {
    New-Item -ItemType Directory -Path "build\icons" -Force | Out-Null
}

# Generate icons from SVG
Write-Host "🎨 Generating app icons..." -ForegroundColor Yellow
magick assets\icon.svg -resize 512x512 build\icons\icon.png
magick assets\icon.svg -resize 256x256 build\icons\icon@2x.png
magick assets\icon.svg -resize 128x128 build\icons\icon@1x.png

# Generate Windows-specific icons
Write-Host "🪟 Generating Windows app icons..." -ForegroundColor Yellow
magick assets\icon.svg -resize 16x16 build\icons\16x16.png
magick assets\icon.svg -resize 32x32 build\icons\32x32.png
magick assets\icon.svg -resize 48x48 build\icons\48x48.png
magick assets\icon.svg -resize 64x64 build\icons\64x64.png
magick assets\icon.svg -resize 128x128 build\icons\128x128.png
magick assets\icon.svg -resize 256x256 build\icons\256x256.png
magick assets\icon.svg -resize 512x512 build\icons\512x512.png

# Generate ICO file for Windows
Write-Host "🎯 Generating Windows ICO file..." -ForegroundColor Yellow
magick assets\icon.svg -resize 256x256 build\icons\icon.ico

# Install dependencies if needed
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

# Build the application
Write-Host "🔨 Building application..." -ForegroundColor Yellow
npm run build

# Build Windows app
Write-Host "🪟 Building Windows app..." -ForegroundColor Yellow
npm run dist:win

# Check if build was successful
if (Test-Path "dist\Lightweight Video Editor Setup 1.0.0.exe") {
    Write-Host "✅ Build successful!" -ForegroundColor Green
    Write-Host "📱 App packages created:" -ForegroundColor Cyan
    
    # Check for different package types
    if (Test-Path "dist\Lightweight Video Editor Setup 1.0.0.exe") {
        Write-Host "   - Installer: dist\Lightweight Video Editor Setup 1.0.0.exe" -ForegroundColor White
    }
    
    if (Test-Path "dist\Lightweight Video Editor-1.0.0.msi") {
        Write-Host "   - MSI Package: dist\Lightweight Video Editor-1.0.0.msi" -ForegroundColor White
    }
    
    if (Test-Path "dist\win-unpacked") {
        Write-Host "   - Portable App: dist\win-unpacked\" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "🎉 Ready to distribute!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Distribution Notes:" -ForegroundColor Cyan
    Write-Host "   - .exe: Windows installer (recommended)" -ForegroundColor White
    Write-Host "   - .msi: Microsoft Installer package" -ForegroundColor White
    Write-Host "   - Portable: Unpacked app for portable use" -ForegroundColor White
    Write-Host "   - App works on Windows 10/11 (x64 and ARM64)" -ForegroundColor White
} else {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 