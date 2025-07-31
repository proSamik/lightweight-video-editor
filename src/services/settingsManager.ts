import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AISettings } from '../types';

export class SettingsManager {
  private static instance: SettingsManager;
  private settingsPath: string;

  constructor() {
    // Store settings in user's home directory
    const appDataDir = path.join(os.homedir(), '.lightweight-video-editor');
    if (!fs.existsSync(appDataDir)) {
      fs.mkdirSync(appDataDir, { recursive: true });
    }
    this.settingsPath = path.join(appDataDir, 'settings.json');
  }

  static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  /**
   * Load AI settings from disk
   */
  loadSettings(): AISettings {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf8');
        const settings = JSON.parse(data);
        return {
          selectedProvider: 'anthropic', // default
          ...settings
        };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }

    // Return default settings
    return {
      selectedProvider: 'anthropic',
      descriptionPrompt: undefined,
      titlePrompt: undefined
    };
  }

  /**
   * Save AI settings to disk
   */
  saveSettings(settings: AISettings): void {
    try {
      // Create a copy without sensitive data for logging
      const settingsToSave = { ...settings };
      
      // Encrypt or mask API keys before saving (basic implementation)
      if (settingsToSave.openrouterApiKey) {
        settingsToSave.openrouterApiKey = this.encryptApiKey(settingsToSave.openrouterApiKey);
      }
      if (settingsToSave.anthropicApiKey) {
        settingsToSave.anthropicApiKey = this.encryptApiKey(settingsToSave.anthropicApiKey);
      }
      if (settingsToSave.googleAiApiKey) {
        settingsToSave.googleAiApiKey = this.encryptApiKey(settingsToSave.googleAiApiKey);
      }

      fs.writeFileSync(this.settingsPath, JSON.stringify(settingsToSave, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving settings:', error);
      throw new Error('Failed to save settings');
    }
  }

  /**
   * Load settings and decrypt API keys
   */
  loadDecryptedSettings(): AISettings {
    const settings = this.loadSettings();
    
    // Decrypt API keys
    if (settings.openrouterApiKey) {
      settings.openrouterApiKey = this.decryptApiKey(settings.openrouterApiKey);
    }
    if (settings.anthropicApiKey) {
      settings.anthropicApiKey = this.decryptApiKey(settings.anthropicApiKey);
    }
    if (settings.googleAiApiKey) {
      settings.googleAiApiKey = this.decryptApiKey(settings.googleAiApiKey);
    }

    return settings;
  }

  /**
   * Basic encryption for API keys (in production, use proper encryption)
   */
  private encryptApiKey(apiKey: string): string {
    // Simple base64 encoding - in production, use proper encryption with a key
    return Buffer.from(apiKey).toString('base64');
  }

  /**
   * Basic decryption for API keys
   */
  private decryptApiKey(encryptedKey: string): string {
    try {
      return Buffer.from(encryptedKey, 'base64').toString('utf8');
    } catch (error) {
      console.error('Error decrypting API key:', error);
      return encryptedKey; // Return as-is if decryption fails
    }
  }

  /**
   * Clear all settings
   */
  clearSettings(): void {
    try {
      if (fs.existsSync(this.settingsPath)) {
        fs.unlinkSync(this.settingsPath);
      }
    } catch (error) {
      console.error('Error clearing settings:', error);
    }
  }

  /**
   * Check if settings file exists
   */
  hasSettings(): boolean {
    return fs.existsSync(this.settingsPath);
  }
}