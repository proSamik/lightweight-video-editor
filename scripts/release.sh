#!/bin/bash

# Release script for Lightweight Video Editor
# This script builds and publishes the app with auto-update support

set -e

echo "🚀 Starting release process for Lightweight Video Editor..."

# Check if we're on the main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ Error: Must be on main branch to release. Current branch: $CURRENT_BRANCH"
    exit 1
fi

# Check if working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Error: Working directory is not clean. Please commit or stash changes."
    git status --short
    exit 1
fi

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
echo "📦 Current version: $VERSION"

# Ask user to confirm version or enter new version
echo ""
read -p "Enter new version (current: $VERSION) or press Enter to keep current: " NEW_VERSION

if [ -n "$NEW_VERSION" ]; then
    echo "📝 Updating version to $NEW_VERSION..."
    npm version $NEW_VERSION --no-git-tag-version
    VERSION=$NEW_VERSION
fi

# Update version in package.json
echo "📦 Building application for version $VERSION..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/

# Generate icons
echo "🎨 Generating icons..."
npm run generate-icons

# Build the application
echo "🔨 Building application..."
npm run build

echo "📋 Build configuration:"
echo "  - Auto-updater: electron-updater"
echo "  - Publish to: GitHub Releases"
echo "  - Repository: proSamik/lightweight-video-editor"
echo "  - Code signing: ${CSC_IDENTITY_AUTO_DISCOVERY:-"Auto-discovery"}"
echo ""

# Ask for confirmation before publishing
read -p "Proceed with publishing to GitHub Releases? (y/N): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "❌ Release cancelled by user"
    exit 1
fi

# Build and publish
echo "🚀 Building and publishing release..."

# Check if GH_TOKEN is set for publishing
if [ -z "$GH_TOKEN" ]; then
    echo "⚠️  Warning: GH_TOKEN not set. Publishing may fail."
    echo "   To set it: export GH_TOKEN=your_github_token"
    echo ""
    read -p "Continue anyway? (y/N): " CONTINUE
    if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
        echo "❌ Release cancelled"
        exit 1
    fi
fi

# Publish the release
npm run release

echo ""
echo "✅ Release completed successfully!"
echo "🎉 Version $VERSION has been published to GitHub Releases"
echo ""
echo "📱 Users will be automatically notified of the update within 4 hours"
echo "🔗 Release URL: https://github.com/proSamik/lightweight-video-editor/releases/tag/v$VERSION"
echo ""
echo "💡 Next steps:"
echo "  1. Create a git tag: git tag v$VERSION && git push origin v$VERSION"
echo "  2. Update changelog or release notes on GitHub"
echo "  3. Announce the release to users"
