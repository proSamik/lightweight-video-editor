import React from 'react';
import { 
  FolderOpen, 
  FileText, 
  Save, 
  Settings, 
  Bot, 
  Music, 
  Music2, 
  X, 
  ExternalLink,
  PartyPopper,
  Folder
} from 'lucide-react';

/**
 * Icon components to replace emojis throughout the application
 * All icons are sized to match the original emoji appearance
 */

// Project Manager icon
export const ProjectManagerIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <FolderOpen size={size} />
);

// New Project icon
export const NewProjectIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <FileText size={size} />
);

// Save Project icon
export const SaveProjectIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <Save size={size} />
);

// Save Project As icon (Save with plus)
export const SaveProjectAsIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <div style={{ position: 'relative', display: 'inline-flex' }}>
    <Save size={size} />
    <div style={{
      position: 'absolute',
      top: -2,
      right: -2,
      width: 6,
      height: 6,
      backgroundColor: 'currentColor',
      borderRadius: '50%',
      fontSize: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white'
    }}>
      +
    </div>
  </div>
);

// Settings icon
export const SettingsIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <Settings size={size} />
);

// AI/Bot icon
export const BotIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <Bot size={size} />
);

// Music/Audio icon
export const MusicIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <Music size={size} />
);

// Music with checkmark (for audio replacement set)
export const MusicWithCheckIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <div style={{ position: 'relative', display: 'inline-flex' }}>
    <Music size={size} />
    <div style={{
      position: 'absolute',
      top: -2,
      right: -2,
      width: 6,
      height: 6,
      backgroundColor: '#10b981',
      borderRadius: '50%',
      fontSize: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white'
    }}>
      ✓
    </div>
  </div>
);

// Music export icon (music with arrow)
export const MusicExportIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <div style={{ position: 'relative', display: 'inline-flex' }}>
    <Music2 size={size} />
    <ExternalLink size={size * 0.6} style={{ 
      position: 'absolute', 
      top: -2, 
      right: -2,
      transform: 'rotate(45deg)'
    }} />
  </div>
);

// Close/X icon
export const CloseIcon: React.FC<{ size?: number }> = ({ size = 12 }) => (
  <X size={size} />
);

// Celebration/Party icon
export const CelebrationIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <PartyPopper size={size} />
);

// Show in Finder icon
export const ShowInFinderIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <Folder size={size} />
);

// Export SRT icon
export const ExportSrtIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <FileText size={size} />
); 