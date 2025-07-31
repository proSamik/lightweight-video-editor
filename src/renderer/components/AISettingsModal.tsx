import React, { useState, useEffect } from 'react';
import { AISettings, AIModel } from '../../types';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: AISettings) => void;
}

const AISettingsModal: React.FC<AISettingsModalProps> = ({ isOpen, onClose, onSave }) => {
  const [settings, setSettings] = useState<AISettings>({
    selectedProvider: 'anthropic',
    descriptionPrompt: '',
    titlePrompt: ''
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const contentStyle: React.CSSProperties = {
    backgroundColor: '#2a2a2a',
    borderRadius: '8px',
    padding: '30px',
    width: '600px',
    maxWidth: '90vw',
    maxHeight: '80vh',
    overflowY: 'auto',
    color: '#fff',
  };

  return (
    <div style={modalStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={contentStyle}>
        <h2 style={{ margin: '0 0 25px 0', fontSize: '20px', fontWeight: 'bold' }}>
          AI Settings
        </h2>

        {/* Provider Selection */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
            AI Provider
          </label>
          <select
            value={settings.selectedProvider}
            onChange={(e) => handleProviderChange(e.target.value as any)}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#333',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '4px',
              fontSize: '14px'
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
                backgroundColor: '#333',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <div style={{ marginTop: '4px', fontSize: '12px', color: '#888' }}>
              Get your API key from <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" style={{ color: '#4a9eff' }}>Anthropic Console</a>
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
                backgroundColor: '#333',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <div style={{ marginTop: '4px', fontSize: '12px', color: '#888' }}>
              Get your API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: '#4a9eff' }}>Google AI Studio</a>
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
                backgroundColor: '#333',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <div style={{ marginTop: '4px', fontSize: '12px', color: '#888' }}>
              Get your API key from <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" style={{ color: '#4a9eff' }}>OpenRouter Dashboard</a>
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
                <span style={{ fontSize: '12px', color: '#888' }}>Loading models...</span>
              )}
            </div>
            {availableModels.length > 0 ? (
              <select
                value={settings.selectedModel || ''}
                onChange={(e) => setSettings({ ...settings, selectedModel: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#333',
                  color: '#fff',
                  border: '1px solid #555',
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
                backgroundColor: '#333',
                border: '1px solid #555',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#888',
                textAlign: 'center'
              }}>
                {loadingModels ? 'Loading available models...' : 'Enter API key to load models'}
              </div>
            )}
            {settings.selectedModel && availableModels.find(m => m.id === settings.selectedModel) && (
              <div style={{ fontSize: '12px', color: '#888' }}>
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
          <button
            onClick={testConnection}
            disabled={testingConnection}
            style={{
              padding: '8px 16px',
              backgroundColor: connectionStatus === 'success' ? '#28a745' : connectionStatus === 'error' ? '#dc3545' : '#6c757d',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: testingConnection ? 'not-allowed' : 'pointer',
              fontSize: '12px'
            }}
          >
            {testingConnection ? 'Testing...' : 'Test Connection'}
          </button>
          {connectionStatus === 'success' && (
            <span style={{ marginLeft: '10px', color: '#28a745', fontSize: '12px' }}>✓ Connection successful</span>
          )}
          {connectionStatus === 'error' && (
            <span style={{ marginLeft: '10px', color: '#dc3545', fontSize: '12px' }}>✗ Connection failed</span>
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
              backgroundColor: '#333',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '4px',
              fontSize: '12px',
              resize: 'vertical'
            }}
          />
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
              backgroundColor: '#333',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '4px',
              fontSize: '12px',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default AISettingsModal;