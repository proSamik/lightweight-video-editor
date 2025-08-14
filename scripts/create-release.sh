#!/bin/bash

# Simple script to create a new release
# This will trigger the GitHub Actions workflow automatically

set -e

echo "🚀 Creating a new release for Lightweight Video Editor..."

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📦 Current version: $CURRENT_VERSION"

# Auto-suggest next version
SUGGESTED_PATCH=""
SUGGESTED_MINOR=""
SUGGESTED_MAJOR=""

if [[ $CURRENT_VERSION =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
    MAJOR="${BASH_REMATCH[1]}"
    MINOR="${BASH_REMATCH[2]}"
    PATCH="${BASH_REMATCH[3]}"
    SUGGESTED_PATCH="$MAJOR.$MINOR.$((PATCH + 1))"
    SUGGESTED_MINOR="$MAJOR.$((MINOR + 1)).0"
    SUGGESTED_MAJOR="$((MAJOR + 1)).0.0"
else
    # Fallback if version format is unexpected
    SUGGESTED_PATCH="${CURRENT_VERSION}.1"
    SUGGESTED_MINOR="${CURRENT_VERSION}.1"
    SUGGESTED_MAJOR="${CURRENT_VERSION}.1"
fi

echo "🚀 Version suggestions:"
echo "   Patch (bug fixes): $SUGGESTED_PATCH"
echo "   Minor (new features): $SUGGESTED_MINOR"
echo "   Major (breaking changes): $SUGGESTED_MAJOR"

# Ask for version type or custom version
echo ""
echo "Choose version type:"
echo "  1) Patch (bug fixes) - $SUGGESTED_PATCH"
echo "  2) Minor (new features) - $SUGGESTED_MINOR"
echo "  3) Major (breaking changes) - $SUGGESTED_MAJOR"
echo "  4) Custom version"
echo ""
read -p "Enter choice [1]: " VERSION_CHOICE

# Set version based on choice
case $VERSION_CHOICE in
    "2")
        NEW_VERSION=$SUGGESTED_MINOR
        echo "✅ Using minor version: $NEW_VERSION"
        ;;
    "3")
        NEW_VERSION=$SUGGESTED_MAJOR
        echo "✅ Using major version: $NEW_VERSION"
        ;;
    "4")
        read -p "Enter custom version: " NEW_VERSION
        ;;
    *)
        NEW_VERSION=$SUGGESTED_PATCH
        echo "✅ Using patch version: $NEW_VERSION"
        ;;
esac

if [ -z "$NEW_VERSION" ]; then
    echo "❌ No version provided. Exiting."
    exit 1
fi

# Check if working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Working directory is not clean. Please commit your changes first."
    git status --short
    exit 1
fi

# Update version in package.json
echo "📝 Updating version to $NEW_VERSION..."
npm version $NEW_VERSION --no-git-tag-version

# Commit the version change
echo "💾 Committing version change..."
git add package.json package-lock.json
git commit -m "chore: bump version to $NEW_VERSION"

# Create and push tag
echo "🏷️  Creating tag v$NEW_VERSION..."
git tag v$NEW_VERSION
git push origin main
git push origin v$NEW_VERSION

echo ""
echo "✅ Release process started!"
echo "🎉 Version $NEW_VERSION has been tagged and pushed"
echo ""
echo "📋 What happens next:"
echo "   1. GitHub Actions will automatically build the app (unsigned)"
echo "   2. Multi-platform builds will be created"
echo "   3. A GitHub release will be created with installers"
echo "   4. Auto-update metadata will be generated"
echo ""
echo "ℹ️  Note: macOS builds will be unsigned (users can still run them)"
echo ""
echo "🔗 Monitor progress at:"
echo "   https://github.com/proSamik/lightweight-video-editor/actions"
echo ""
echo "📱 Users will be notified of the update within 4 hours"
