# Auto-Update Implementation Guide

This document explains how the auto-update feature is implemented in Lightweight Video Editor and how to set it up for production use.

## Overview

The app uses **electron-updater** to provide VS Code-like auto-update functionality:

- ✅ Non-intrusive update notifications
- ✅ User choice: "Download Now", "View Details", or "Remind Me Later"  
- ✅ Download progress indicators
- ✅ Changelog display in beautiful modal
- ✅ Periodic update checks (every 4 hours)
- ✅ GitHub Releases integration
- ✅ Code signing support for macOS

## Architecture

### Components

1. **UpdateService** (`src/services/updateService.ts`)
   - Manages electron-updater configuration
   - Handles update lifecycle events
   - Provides VS Code-like notification behavior

2. **UpdateModal** (`src/renderer/components/UpdateModal.tsx`)
   - Beautiful modal for displaying changelogs
   - Handles download progress and installation
   - Supports markdown-like formatting for release notes

3. **UpdateNotification** (`src/renderer/components/UpdateNotification.tsx`)
   - Non-intrusive notification in top-right corner
   - Quick actions: Download, View Details, Dismiss
   - Real-time download progress

### IPC Communication

The main and renderer processes communicate via these IPC channels:

**Main → Renderer:**
- `update-available` - New version detected
- `update-downloaded` - Update ready to install
- `update-download-progress` - Download progress updates
- `update-error` - Error occurred
- `show-update-changelog` - Show changelog modal

**Renderer → Main:**
- `check-for-updates` - Manual update check
- `download-update` - Start downloading update
- `install-update` - Install and restart
- `get-update-status` - Get current update state

## Setup Instructions

### 1. GitHub Repository Configuration

The app is configured to use GitHub Releases for update distribution:

```json
{
  "build": {
    "publish": [
      {
        "provider": "github",
        "owner": "proSamik",
        "repo": "lightweight-video-editor"
      }
    ]
  }
}
```

### 2. Code Signing (macOS)

Auto-updates require code signing on macOS. Set these environment variables:

```bash
export CSC_IDENTITY_AUTO_DISCOVERY=false
export CSC_NAME="Developer ID Application: Your Name (TEAM_ID)"
export CSC_IDENTITY="Developer ID Application: Your Name (TEAM_ID)"
```

Or for auto-discovery:
```bash
export CSC_IDENTITY_AUTO_DISCOVERY=true
```

### 3. GitHub Token

For publishing releases, set your GitHub token:

```bash
export GH_TOKEN="your_github_personal_access_token"
```

The token needs these permissions:
- `repo` (full repository access)
- `write:packages` (if using GitHub Packages)

### 4. Release Process

### Option 1: GitHub Actions (Recommended)

The easiest way to create releases is using GitHub Actions:

```bash
# Simple one-command release
./scripts/create-release.sh
```

This will:
1. ✅ Ask for new version number
2. ✅ Update package.json
3. ✅ Create git tag
4. ✅ Push to GitHub
5. ✅ Trigger automated build and release

### Option 2: Manual Release Script

```bash
./scripts/release.sh
```

### Option 3: Direct Commands

```bash
# For production release
npm run release

# For draft release (testing)
npm run release:draft
```

## How It Works

### Update Detection

1. App checks for updates on startup (5-second delay)
2. Periodic checks every 4 hours
3. Manual checks via IPC calls

### Update Flow

1. **Update Available**
   - User sees notification in top-right corner
   - Options: Download Now, View Details, Remind Later
   - Native dialog as fallback

2. **Downloading**
   - Progress bar shows download progress
   - Can view details/changelog during download
   - Download happens in background

3. **Downloaded**
   - Notification changes to "Install & Restart"
   - User can install immediately or later
   - Update installs automatically on next quit

### Release Notes Display

The app supports rich release notes formatting:

```markdown
# Major Update v2.0.0

## New Features
* **AI-powered transcription** - Better accuracy
* Timeline improvements
* Export optimization

## Bug Fixes
* Fixed rendering issues
* Memory leaks resolved

## Breaking Changes
* Config file format updated
```

This gets rendered with proper styling and formatting.

## Testing Auto-Updates

### Local Testing

1. Build a version with a lower version number:
   ```bash
   npm version 1.0.0
   npm run dist
   ```

2. Create a GitHub release with version 1.0.1

3. Run the 1.0.0 build - it should detect and offer the 1.0.1 update

### Testing Without Publishing

Use `release:draft` to build without publishing:

```bash
npm run release:draft
```

Then manually create a GitHub release for testing.

## GitHub Actions Setup

### Repository Secrets

For signed releases, add these secrets to your GitHub repository:

1. Go to: `GitHub.com → Your Repo → Settings → Secrets and variables → Actions`
2. Add these secrets:

| Secret Name | Description | Required |
|-------------|-------------|----------|
| `MACOS_CERT_P12` | Base64-encoded macOS certificate | For signed macOS builds |
| `MACOS_CERT_PASSWORD` | Certificate password | For signed macOS builds |
| `APPLE_ID` | Apple ID email | For notarization |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password | For notarization |

### Workflow Files

The repository includes two workflow files:

- **`.github/workflows/release.yml`** - Basic multi-platform release
- **`.github/workflows/release-signed.yml`** - Signed macOS release with notarization

### Automatic Triggers

Releases are triggered by pushing version tags:

```bash
git tag v1.0.1
git push origin v1.0.1
```

## Environment Variables (Local Development)

| Variable | Description | Required |
|----------|-------------|----------|
| `GH_TOKEN` | GitHub personal access token | Yes (for publishing) |
| `CSC_NAME` | macOS code signing certificate name | Yes (macOS) |
| `CSC_IDENTITY` | macOS code signing identity | Yes (macOS) |
| `CSC_IDENTITY_AUTO_DISCOVERY` | Auto-find certificates | Optional |
| `CSC_KEY_PASSWORD` | Certificate password | If needed |
| `APPLE_ID` | Apple ID for notarization | Optional |
| `APPLE_ID_PASSWORD` | App-specific password | Optional |

## Troubleshooting

### Common Issues

1. **Updates not detected**
   - Check GitHub repository settings
   - Verify `publish` configuration in package.json
   - Ensure releases are marked as published (not draft)

2. **Code signing failures**
   - Verify certificate is installed
   - Check CSC_* environment variables
   - Ensure entitlements.mac.plist is correct

3. **Auto-updater errors**
   - Check network connectivity
   - Verify release artifacts are uploaded
   - Check console logs for specific errors

### Debug Mode

Enable debug logs for electron-updater:

```bash
export DEBUG=electron-updater
```

Or in the app:
```javascript
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';
```

## Security Considerations

1. **Code Signing**: Required on macOS for auto-updates to work
2. **HTTPS**: All update checks use HTTPS via GitHub
3. **Verification**: electron-updater verifies signatures automatically
4. **Sandboxing**: App follows electron security best practices

## Future Enhancements

- [ ] Delta updates for faster downloads
- [ ] Update channels (stable, beta, alpha)
- [ ] Rollback capability
- [ ] Custom update server option
- [ ] Update scheduling preferences
- [ ] Bandwidth limiting

## Resources

- [electron-updater documentation](https://www.electron.build/auto-update)
- [Code signing guide](https://www.electron.build/code-signing)
- [GitHub Releases API](https://docs.github.com/en/rest/releases)
- [Electron security guide](https://www.electronjs.org/docs/tutorial/security)
