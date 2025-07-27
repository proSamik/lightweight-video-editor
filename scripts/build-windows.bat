@echo off
setlocal enabledelayedexpansion

REM Lightweight Video Editor - Windows Build Script
REM This script builds the Windows app with proper icons and packaging

echo 🪟 Building Lightweight Video Editor for Windows...

REM Check if we're on Windows
if not "%OS%"=="Windows_NT" (
    echo ❌ This script is designed for Windows only
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is required but not installed
    echo    Please install Node.js from https://nodejs.org/
    exit /b 1
)

REM Check if ImageMagick is installed
magick --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ImageMagick is required but not installed
    echo    Please install ImageMagick from https://imagemagick.org/
    echo    Or use Chocolatey: choco install imagemagick
    exit /b 1
)

REM Detect architecture
if "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
    set ARCH=x64
    echo 🏗️  Detected architecture: x64
) else if "%PROCESSOR_ARCHITECTURE%"=="ARM64" (
    set ARCH=arm64
    echo 🏗️  Detected architecture: ARM64
) else (
    set ARCH=x64
    echo 🏗️  Using default architecture: x64
)

REM Clean previous builds
echo 🧹 Cleaning previous builds...
if exist dist\ rmdir /s /q dist\
if exist build\icons\*.png del /q build\icons\*.png

REM Create build directories
echo 📁 Creating build directories...
if not exist build\icons\ mkdir build\icons

REM Generate icons from SVG
echo 🎨 Generating app icons...
magick assets\icon.svg -resize 512x512 build\icons\icon.png
magick assets\icon.svg -resize 256x256 build\icons\icon@2x.png
magick assets\icon.svg -resize 128x128 build\icons\icon@1x.png

REM Generate Windows-specific icons
echo 🪟 Generating Windows app icons...
magick assets\icon.svg -resize 16x16 build\icons\16x16.png
magick assets\icon.svg -resize 32x32 build\icons\32x32.png
magick assets\icon.svg -resize 48x48 build\icons\48x48.png
magick assets\icon.svg -resize 64x64 build\icons\64x64.png
magick assets\icon.svg -resize 128x128 build\icons\128x128.png
magick assets\icon.svg -resize 256x256 build\icons\256x256.png
magick assets\icon.svg -resize 512x512 build\icons\512x512.png

REM Generate ICO file for Windows
echo 🎯 Generating Windows ICO file...
magick assets\icon.svg -resize 256x256 build\icons\icon.ico

REM Install dependencies if needed
echo 📦 Installing dependencies...
call npm install

REM Build the application
echo 🔨 Building application...
call npm run build

REM Build Windows app
echo 🪟 Building Windows app...
call npm run dist:win

REM Check if build was successful
if exist "dist\Lightweight Video Editor Setup 1.0.0.exe" (
    echo ✅ Build successful!
    echo 📱 App packages created:
    
    REM Check for different package types
    if exist "dist\Lightweight Video Editor Setup 1.0.0.exe" (
        echo    - Installer: dist\Lightweight Video Editor Setup 1.0.0.exe
    )
    
    if exist "dist\Lightweight Video Editor-1.0.0.msi" (
        echo    - MSI Package: dist\Lightweight Video Editor-1.0.0.msi
    )
    
    if exist "dist\win-unpacked" (
        echo    - Portable App: dist\win-unpacked\
    )
    
    echo.
    echo 🎉 Ready to distribute!
    echo.
    echo 📋 Distribution Notes:
    echo    - .exe: Windows installer (recommended)
    echo    - .msi: Microsoft Installer package
    echo    - Portable: Unpacked app for portable use
    echo    - App works on Windows 10/11 (x64 and ARM64)
) else (
    echo ❌ Build failed!
    exit /b 1
)

pause 