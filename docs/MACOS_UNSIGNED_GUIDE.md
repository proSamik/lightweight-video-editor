# 🍎 macOS Unsigned App Guide

## Running Lightweight Video Editor on macOS

Since this app is distributed without code signing (to keep it free), macOS will show a security warning. Here's how to run it safely:

## Method 1: Right-Click Open (Recommended)

1. **Download** the `.dmg` file from GitHub Releases
2. **Double-click** the `.dmg` file to mount it
3. **Right-click** on the app icon in the mounted volume
4. Select **"Open"** from the context menu
5. Click **"Open"** in the security dialog that appears

## Method 2: System Preferences

1. **Download and mount** the `.dmg` file
2. **Try to open** the app normally
3. When the security warning appears, click **"Cancel"**
4. Go to **System Preferences** → **Security & Privacy**
5. Click the **"Open Anyway"** button next to the app name
6. **Try opening** the app again

## Method 3: Terminal (Advanced)

```bash
# Navigate to the app location
cd /Applications

# Remove quarantine attribute
sudo xattr -rd com.apple.quarantine "Lightweight Video Editor.app"

# Now you can open normally
open "Lightweight Video Editor.app"
```

## Why This Happens

- **Code signing** costs $99/year from Apple
- **Unsigned apps** are safe but require user approval
- **This is normal** for free, open-source applications
- **VS Code, Discord, and many other apps** work the same way

## Security Note

This app is **open source** and **safe to run**. The security warning is just macOS being cautious about unsigned applications. You can verify the source code at: https://github.com/proSamik/lightweight-video-editor

## Auto-Updates

Once you've opened the app once, **auto-updates will work normally**. The app will:
- ✅ Check for updates automatically
- ✅ Download new versions
- ✅ Install updates seamlessly
- ✅ Show beautiful update notifications

## Troubleshooting

### "App is damaged" error
```bash
# Remove quarantine and try again
sudo xattr -rd com.apple.quarantine "/Applications/Lightweight Video Editor.app"
```

### Can't find "Open Anyway" button
- Make sure you tried to open the app first
- The button only appears after a failed launch attempt

### Still having issues?
- Check the [GitHub Issues](https://github.com/proSamik/lightweight-video-editor/issues)
- Or try the Windows/Linux version instead

## Future Plans

If the app becomes popular, we may add code signing in the future. For now, this approach keeps the app **free and accessible** to everyone! 🎉
