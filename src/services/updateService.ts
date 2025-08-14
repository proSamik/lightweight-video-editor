import { BrowserWindow, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';

/**
 * Service for handling application auto-updates
 * Provides VS Code-like update notifications with changelog support
 */
export class UpdateService {
  private static instance: UpdateService;
  private mainWindow: BrowserWindow | null = null;
  private updateAvailable = false;
  private updateInfo: any = null;

  private constructor() {
    this.setupAutoUpdater();
  }

  /**
   * Get singleton instance of UpdateService
   * @returns UpdateService instance
   */
  public static getInstance(): UpdateService {
    if (!UpdateService.instance) {
      UpdateService.instance = new UpdateService();
    }
    return UpdateService.instance;
  }

  /**
   * Set the main window reference for dialog handling
   * @param window - Main BrowserWindow instance
   */
  public setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * Setup auto-updater event handlers with VS Code-like behavior
   */
  private setupAutoUpdater(): void {
    // Configure auto-updater settings
    autoUpdater.autoDownload = false; // Don't auto-download, let user choose
    autoUpdater.autoInstallOnAppQuit = true; // Install on quit if downloaded

    // Handle update available event
    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info);
      this.updateAvailable = true;
      this.updateInfo = info;
      this.notifyUpdateAvailable(info);
    });

    // Handle update not available
    autoUpdater.on('update-not-available', (info) => {
      console.log('Update not available:', info);
      this.updateAvailable = false;
      this.updateInfo = null;
    });

    // Handle update downloaded
    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info);
      this.notifyUpdateDownloaded(info);
    });

    // Handle download progress
    autoUpdater.on('download-progress', (progressObj) => {
      console.log(`Download progress: ${progressObj.percent}%`);
      if (this.mainWindow) {
        this.mainWindow.webContents.send('update-download-progress', progressObj);
      }
    });

    // Handle errors
    autoUpdater.on('error', (error) => {
      console.error('Auto-updater error:', error);
      if (this.mainWindow) {
        this.mainWindow.webContents.send('update-error', error.message);
      }
    });
  }

  /**
   * Check for updates manually
   * @returns Promise that resolves when check is complete
   */
  public async checkForUpdates(): Promise<void> {
    try {
      console.log('Checking for updates...');
      await autoUpdater.checkForUpdates();
    } catch (error) {
      console.error('Error checking for updates:', error);
      throw error;
    }
  }

  /**
   * Download the available update
   */
  public async downloadUpdate(): Promise<void> {
    if (!this.updateAvailable) {
      throw new Error('No update available to download');
    }
    try {
      await autoUpdater.downloadUpdate();
    } catch (error) {
      console.error('Error downloading update:', error);
      throw error;
    }
  }

  /**
   * Install the downloaded update and restart the app
   */
  public quitAndInstall(): void {
    autoUpdater.quitAndInstall();
  }

  /**
   * Show update available notification with changelog
   * @param info - Update information from electron-updater
   */
  private notifyUpdateAvailable(info: any): void {
    if (!this.mainWindow) return;

    // Send update info to renderer for custom UI
    this.mainWindow.webContents.send('update-available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
      releaseName: info.releaseName,
      releaseDate: info.releaseDate
    });

    // Also show native dialog as fallback
    const dialogOpts = {
      type: 'info' as const,
      buttons: ['Download Update', 'View Details', 'Remind Me Later'],
      defaultId: 0,
      title: 'Update Available',
      message: `Version ${info.version} is available`,
      detail: `A new version of Lightweight Video Editor is ready to download.\n\nCurrent version: ${process.env.npm_package_version || 'Unknown'}\nNew version: ${info.version}\n\nWould you like to download it now?`
    };

    dialog.showMessageBox(this.mainWindow, dialogOpts).then((result) => {
      if (result.response === 0) {
        // Download Update
        this.downloadUpdate().catch(console.error);
      } else if (result.response === 1) {
        // View Details - send to renderer for changelog modal
        this.mainWindow?.webContents.send('show-update-changelog', {
          version: info.version,
          releaseNotes: info.releaseNotes,
          releaseName: info.releaseName,
          releaseDate: info.releaseDate
        });
      }
      // Remind Me Later - do nothing, will check again on next startup
    });
  }

  /**
   * Show update downloaded notification
   * @param info - Update information from electron-updater
   */
  private notifyUpdateDownloaded(info: any): void {
    if (!this.mainWindow) return;

    // Send to renderer for custom UI
    this.mainWindow.webContents.send('update-downloaded', {
      version: info.version,
      releaseNotes: info.releaseNotes
    });

    // Also show native dialog
    const dialogOpts = {
      type: 'info' as const,
      buttons: ['Restart Now', 'Restart Later'],
      defaultId: 0,
      title: 'Update Ready',
      message: `Version ${info.version} has been downloaded`,
      detail: 'The update has been downloaded and is ready to install. The application will restart to apply the update.'
    };

    dialog.showMessageBox(this.mainWindow, dialogOpts).then((result) => {
      if (result.response === 0) {
        // Restart Now
        this.quitAndInstall();
      }
      // Restart Later - update will be installed on next quit
    });
  }

  /**
   * Get current update status
   * @returns Object with update availability and info
   */
  public getUpdateStatus() {
    return {
      updateAvailable: this.updateAvailable,
      updateInfo: this.updateInfo
    };
  }

  /**
   * Set up periodic update checks (every 4 hours)
   */
  public setupPeriodicChecks(): void {
    // Check for updates every 4 hours (like VS Code)
    setInterval(() => {
      this.checkForUpdates().catch(console.error);
    }, 4 * 60 * 60 * 1000); // 4 hours in milliseconds
  }
}
