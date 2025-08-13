import React, { useState, useEffect } from 'react';
import { AISettings, AIModel } from '../../types';
import { useTheme } from '../contexts/ThemeContext';
import { Button, IconButton } from './ui';
import { 
  FiX, 
  FiSettings
} from 'react-icons/fi';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: AISettings) => void;
}

const AISettingsModal: React.FC<AISettingsModalProps> = ({ isOpen, onClose, onSave }) => {
  const { theme } = useTheme();
  const [settings, setSettings] = useState<AISettings>({
    selectedProvider: 'anthropic',
    descriptionPrompt: '',
    titlePrompt: '',
    tweetPrompt: '',
    thumbnailPrompt: ''
  });
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const loadedSettings = await window.electronAPI.loadAISettings();
      setSettings(loadedSettings);
      if (loadedSettings.availableModels) {
        setAvailableModels(loadedSettings.availableModels);
      } else {
        await loadModels(loadedSettings);
      }
    } catch (error) {
      console.error('Failed to load AI settings:', error);
    }
  };

  const loadModels = async (currentSettings: AISettings) => {
    if (!hasValidApiKey(currentSettings)) {
      setAvailableModels([]);
      return;
    }

    setLoadingModels(true);
    try {
      const models = await window.electronAPI.getAvailableModels(currentSettings);
      setAvailableModels(models);
      setSettings(prev => ({ ...prev, availableModels: models }));
    } catch (error) {
      console.error('Failed to load models:', error);
      setAvailableModels([]);
    } finally {
      setLoadingModels(false);
    }
  };

  const hasValidApiKey = (currentSettings: AISettings): boolean => {
    switch (currentSettings.selectedProvider) {
      case 'anthropic':
        return !!currentSettings.anthropicApiKey;
      case 'google':
        return !!currentSettings.googleAiApiKey;
      case 'openrouter':
        return !!currentSettings.openrouterApiKey;
      default:
        return false;
    }
  };

  const handleProviderChange = async (newProvider: 'anthropic' | 'google' | 'openrouter') => {
    const newSettings = { ...settings, selectedProvider: newProvider, selectedModel: undefined };
    setSettings(newSettings);
    await loadModels(newSettings);
  };

  const handleSave = async () => {
    try {
      await window.electronAPI.saveAISettings(settings);
      onSave(settings);
      onClose();
    } catch (error) {
      console.error('Failed to save AI settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  };

  const testConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus('idle');
    
    try {
      const isConnected = await window.electronAPI.testAIConnection(settings);
      setConnectionStatus(isConnected ? 'success' : 'error');
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus('error');
    } finally {
      setTestingConnection(false);
    }
  };

  if (!isOpen) return null;

  const modalStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.modal.overlay,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(8px)',
  };

  const contentStyle: React.CSSProperties = {
    backgroundColor: theme.colors.modal.background,
    borderRadius: '12px',
    border: `1px solid ${theme.colors.modal.border}`,
    padding: '0',
    width: '700px',
    maxWidth: '95vw',
    maxHeight: '90vh',
    overflowY: 'auto',
    color: theme.colors.text,
    boxShadow: theme.colors.modal.shadow,
  };

  return (
    <div style={modalStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={contentStyle}>
        {/* Modal Header */}
        <div style={{
          padding: '24px 32px',
          borderBottom: `1px solid ${theme.colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: theme.colors.modal.background
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: theme.colors.primary,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FiSettings size={20} color={theme.colors.primaryForeground} />
            </div>
            <div>
              <h2 style={{ 
                margin: 0, 
                fontSize: '24px', 
                fontWeight: '600', 
                lineHeight: '1.2'
              }}>
                AI Settings
              </h2>
              <p style={{
                margin: '2px 0 0 0',
                fontSize: '14px',
                color: theme.colors.textSecondary
              }}>
                Configure AI providers and custom prompts
              </p>
            </div>
          </div>
          <IconButton
            icon={<FiX size={18} />}
            onClick={onClose}
            variant="ghost"
            size="sm"
            aria-label="Close modal"
          />
        </div>

        {/* Modal Content */}
        <div style={{ padding: '32px', background: theme.colors.modal.background }}>

        {/* Provider Selection */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              backgroundColor: theme.colors.accent,
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FiSettings size={16} color={theme.colors.accentForeground} />
            </div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: theme.colors.text }}>
              AI Provider
            </h3>
          </div>
          <select
            value={settings.selectedProvider}
            onChange={(e) => handleProviderChange(e.target.value as any)}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: theme.colors.modal.background,
              color: theme.colors.text,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: '8px',
              fontSize: '14px',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = theme.colors.borderFocus;
              e.currentTarget.style.backgroundColor = theme.colors.modal.background;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = theme.colors.border;
              e.currentTarget.style.backgroundColor = theme.colors.modal.background;
            }}
          >
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="google">Google AI (Gemini)</option>
            <option value="openrouter">OpenRouter</option>
          </select>
        </div>

        {/* API Key Fields */}
        {settings.selectedProvider === 'anthropic' && (
          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
              Anthropic API Key
            </label>
            <input
              type="password"
              value={settings.anthropicApiKey || ''}
              onChange={async (e) => {
                const newSettings = { ...settings, anthropicApiKey: e.target.value };
                setSettings(newSettings);
                if (e.target.value) {
                  await loadModels(newSettings);
                } else {
                  setAvailableModels([]);
                }
              }}
              placeholder="sk-ant-..."
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: theme.colors.modal.background,
                color: theme.colors.text,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <div style={{ marginTop: '4px', fontSize: '12px', color: theme.colors.textSecondary }}>
              Get your API key from <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" style={{ color: theme.colors.primary }}>Anthropic Console</a>
            </div>
          </div>
        )}

        {settings.selectedProvider === 'google' && (
          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
              Google AI API Key
            </label>
            <input
              type="password"
              value={settings.googleAiApiKey || ''}
              onChange={async (e) => {
                const newSettings = { ...settings, googleAiApiKey: e.target.value };
                setSettings(newSettings);
                if (e.target.value) {
                  await loadModels(newSettings);
                } else {
                  setAvailableModels([]);
                }
              }}
              placeholder="AIza..."
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: theme.colors.modal.background,
                color: theme.colors.text,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <div style={{ marginTop: '4px', fontSize: '12px', color: theme.colors.textSecondary }}>
              Get your API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: theme.colors.primary }}>Google AI Studio</a>
            </div>
          </div>
        )}

        {settings.selectedProvider === 'openrouter' && (
          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
              OpenRouter API Key
            </label>
            <input
              type="password"
              value={settings.openrouterApiKey || ''}
              onChange={async (e) => {
                const newSettings = { ...settings, openrouterApiKey: e.target.value };
                setSettings(newSettings);
                if (e.target.value) {
                  await loadModels(newSettings);
                } else {
                  setAvailableModels([]);
                }
              }}
              placeholder="sk-or-..."
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: theme.colors.modal.background,
                color: theme.colors.text,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <div style={{ marginTop: '4px', fontSize: '12px', color: theme.colors.textSecondary }}>
              Get your API key from <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" style={{ color: theme.colors.primary }}>OpenRouter Dashboard</a>
            </div>
          </div>
        )}

        {/* Model Selection */}
        {hasValidApiKey(settings) && (
          <div style={{ marginBottom: '25px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: 'bold' }}>
                AI Model
              </label>
              {loadingModels && (
                <span style={{ fontSize: '12px', color: theme.colors.textSecondary }}>Loading models...</span>
              )}
            </div>
            {availableModels.length > 0 ? (
              <select
                value={settings.selectedModel || ''}
                onChange={(e) => setSettings({ ...settings, selectedModel: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: theme.colors.modal.background,
                  color: theme.colors.text,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: '4px',
                  fontSize: '14px',
                  marginBottom: '8px'
                }}
              >
                <option value="">Select a model...</option>
                {availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} 
                    {model.contextLength && ` (${Math.floor(model.contextLength / 1000)}K context)`}
                    {model.pricing && ` - $${model.pricing.input}/M tokens`}
                  </option>
                ))}
              </select>
            ) : (
              <div style={{
                padding: '10px',
                backgroundColor: theme.colors.modal.background,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '4px',
                fontSize: '12px',
                color: theme.colors.textSecondary,
                textAlign: 'center'
              }}>
                {loadingModels ? 'Loading available models...' : 'Enter API key to load models'}
              </div>
            )}
            {settings.selectedModel && availableModels.find(m => m.id === settings.selectedModel) && (
              <div style={{ fontSize: '12px', color: theme.colors.textSecondary }}>
                {(() => {
                  const model = availableModels.find(m => m.id === settings.selectedModel);
                  return model ? (
                    <div>
                      <strong>{model.name}</strong>
                      {model.contextLength && <div>Context: {model.contextLength.toLocaleString()} tokens</div>}
                      {model.pricing && (
                        <div>Pricing: ${model.pricing.input}/M input, ${model.pricing.output}/M output</div>
                      )}
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        )}

        {/* Connection Test */}
        <div style={{ marginBottom: '25px' }}>
          <Button
            onClick={testConnection}
            disabled={testingConnection}
            variant={connectionStatus === 'success' ? 'success' : connectionStatus === 'error' ? 'destructive' : 'secondary'}
            size="sm"
            isLoading={testingConnection}
          >
            {testingConnection ? 'Testing...' : 'Test Connection'}
          </Button>
          {connectionStatus === 'success' && (
            <span style={{ marginLeft: '10px', color: theme.colors.success, fontSize: '12px' }}>✓ Connection successful</span>
          )}
          {connectionStatus === 'error' && (
            <span style={{ marginLeft: '10px', color: theme.colors.error, fontSize: '12px' }}>✗ Connection failed</span>
          )}
        </div>

        {/* Custom Prompts */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
            Custom Description Prompt (Optional)
          </label>
          <textarea
            value={settings.descriptionPrompt || ''}
            onChange={(e) => setSettings({ ...settings, descriptionPrompt: e.target.value })}
            placeholder="Custom prompt for generating YouTube descriptions... (leave empty for default)"
            rows={4}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: theme.colors.modal.background,
              color: theme.colors.text,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: '4px',
              fontSize: '12px',
              resize: 'vertical'
            }}
          />
          <div style={{ marginTop: '4px', fontSize: '11px', color: theme.colors.textSecondary }}>
            🔒 System prompts include security measures to prevent override
          </div>
        </div>

        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
            Custom Title Prompt (Optional)
          </label>
          <textarea
            value={settings.titlePrompt || ''}
            onChange={(e) => setSettings({ ...settings, titlePrompt: e.target.value })}
            placeholder="Custom prompt for generating YouTube titles... (leave empty for default)"
            rows={4}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: theme.colors.modal.background,
              color: theme.colors.text,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: '4px',
              fontSize: '12px',
              resize: 'vertical'
            }}
          />
          <div style={{ marginTop: '4px', fontSize: '11px', color: theme.colors.textSecondary }}>
            🔒 System prompts include security measures to prevent override
          </div>
        </div>

        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
            Custom Tweet Hooks Prompt (Optional)
          </label>
          <textarea
            value={settings.tweetPrompt || ''}
            onChange={(e) => setSettings({ ...settings, tweetPrompt: e.target.value })}
            placeholder="Custom prompt for generating Twitter video hooks... (leave empty for default)"
            rows={4}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: theme.colors.modal.background,
              color: theme.colors.text,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: '4px',
              fontSize: '12px',
              resize: 'vertical'
            }}
          />
          <div style={{ marginTop: '4px', fontSize: '11px', color: theme.colors.textSecondary }}>
            Format: 4 hooks, max 4-5 lines each, 5-6 words per line for optimal Twitter engagement
          </div>
        </div>

        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
            Custom Thumbnail Ideas Prompt (Optional)
          </label>
          <textarea
            value={settings.thumbnailPrompt || ''}
            onChange={(e) => setSettings({ ...settings, thumbnailPrompt: e.target.value })}
            placeholder="Custom prompt for generating thumbnail concept ideas... (leave empty for default)"
            rows={4}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: theme.colors.modal.background,
              color: theme.colors.text,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: '4px',
              fontSize: '12px',
              resize: 'vertical'
            }}
          />
          <div style={{ marginTop: '4px', fontSize: '11px', color: theme.colors.textSecondary }}>
            Generate visual concept descriptions with colors, emotions, and CTR optimization tips
          </div>
        </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Button
            onClick={onClose}
            variant="secondary"
            size="md"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="primary"
            size="md"
          >
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AISettingsModal;