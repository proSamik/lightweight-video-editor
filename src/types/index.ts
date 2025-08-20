
export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface VideoFile {
  name: string;
  path: string;
  duration?: number;
  width?: number;
  height?: number;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  words?: WordTimestamp[];
}

export enum FontOption {
  INTER = 'Inter',
  ROBOTO = 'Roboto',
  OPEN_SANS = 'Open Sans',
  SOURCE_SANS_PRO = 'Source Sans Pro',
  NOTO_SANS = 'Noto Sans',
  SF_PRO_DISPLAY = 'SF Pro Display',
  SEGOE_UI = 'Segoe UI',
  UBUNTU = 'Ubuntu',
  MONTSERRAT = 'Montserrat',
  POPPINS = 'Poppins',
  RALEWAY = 'Raleway',
  LATO = 'Lato',
  NUNITO = 'Nunito',
  QUICKSAND = 'Quicksand',
  ARIAL = 'Arial',
  HELVETICA = 'Helvetica'
}

export enum ColorOption {
  WHITE = '#ffffff',
  BLACK = '#000000',
  RED = '#ff0000',
  GREEN = '#00ff00',
  BLUE = '#0000ff',
  YELLOW = '#ffff00',
  CYAN = '#00ffff',
  MAGENTA = '#ff00ff',
  ORANGE = '#ffa500',
  PURPLE = '#800080',
  PINK = '#ffc0cb',
  BROWN = '#a52a2a',
  GRAY = '#808080',
  LIGHT_GRAY = '#d3d3d3',
  DARK_GRAY = '#404040',
  LIME_GREEN = '#32cd32',
  BLACK_SEMI = '#80000000',
  TRANSPARENT = 'transparent'
}

export interface ExportSettings {
  framerate: 30 | 60;
  quality: 'fast' | 'balanced' | 'high';
  exportMode: 'complete' | 'newAudio' | 'subtitlesOnly' | 'modifiedSegments';
}

export interface SearchResult {
  segmentId: string;
  segmentIndex: number;
  matchStart: number;
  matchEnd: number;
  context: string;
}

export interface TimelineSelection {
  startTime: number;
  endTime: number;
  selected: boolean;
}

export interface ProjectData {
  version: string;
  videoFile: VideoFile | null;
  aiSubtitleData?: AISubtitleData | null; // Primary subtitle data from AI processing
  timeline: TimelineSelection[];
  replacementAudioPath?: string | null;
  extractedAudioPath?: string | null; // Path to extracted audio file for waveform and transcription
  lastModified: number;
  description?: string;
  title?: string;
  aiGeneratedTitles?: string[];
  tweets?: { hook: string; lineCount: number; wordCount: number }[];
  thumbnails?: string[];
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  contextLength?: number;
  pricing?: {
    input: number;
    output: number;
  };
}

export interface AISettings {
  openrouterApiKey?: string;
  anthropicApiKey?: string;
  googleAiApiKey?: string;
  descriptionPrompt?: string;
  titlePrompt?: string;
  tweetPrompt?: string;
  thumbnailPrompt?: string;
  selectedProvider: 'openrouter' | 'anthropic' | 'google';
  selectedModel?: string;
  availableModels?: AIModel[];
}

export interface GeneratedContent {
  description?: string;
  titles?: { title: string; characterCount: number }[];
  tweets?: { hook: string; lineCount: number; wordCount: number }[];
  thumbnails?: string[];
}


// AI Subtitles enhanced types
export type WordEditState = 'normal' | 'strikethrough' | 'censored' | 'removedCaption' | 'silenced' | 'editing';

export interface SubtitleStyle {
  font: string;
  fontSize: number;
  textColor: string;
  highlighterColor: string;
  backgroundColor: string;
  strokeColor?: string;
  strokeWidth?: number;
  textTransform?: 'none' | 'capitalize' | 'uppercase' | 'lowercase';
  position: {
    x: number;
    y: number;
    z?: number;
  };
  scale?: number;
  emphasizeMode?: boolean;
  renderMode?: 'horizontal' | 'progressive';
  textAlign?: 'left' | 'center' | 'right';
  burnInSubtitles?: boolean;
}

export interface WordSegment extends WordTimestamp {
  id: string;
  editState: WordEditState;
  originalWord: string; // Keep track of original word for restore
  isKeyword?: boolean; // For keyword highlighting
  customStyle?: Partial<SubtitleStyle>; // Per-word style overrides
  isPause?: boolean; // For [.] pause markers
}

export interface SubtitleFrame {
  id: string;
  startTime: number;
  endTime: number;
  words: WordSegment[];
  isCustomBreak?: boolean; // True if manually separated with double-enter
  segmentId: string; // Reference to original segment
  style?: SubtitleStyle; // Style information for this frame
}

export interface WordStyle {
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  textDecoration?: 'none' | 'line-through' | 'underline';
  opacity?: number;
}

export interface AudioSegment {
  id: string;
  startTime: number;
  endTime: number;
  isRemoved: boolean; // If true, this segment should be excluded from final audio
  originalPath?: string; // Path to original audio segment
  replacementPath?: string; // Path to replacement audio if edited
}

export interface AISubtitleData {
  frames: SubtitleFrame[];
  audioSegments: AudioSegment[];
  maxWordsPerFrame: number; // From transcription settings
  maxCharsPerFrame: number; // From transcription settings
  lastModified: number;
}

// Caption preset types for styling UI
export interface CaptionPreset {
  id: string;
  name: string;
  description: string;
  category: 'modern' | 'creative' | 'professional' | 'classic';
  style: SubtitleStyle & {
    animation?: {
      type: 'bounce' | 'fade' | 'typewriter' | 'glow' | 'slide' | 'shake' | 'zoom' | 'wave';
      duration: number;
      delay: number;
      intensity: number;
      direction?: 'up' | 'down' | 'left' | 'right';
    };
  };
  tags?: string[];
  popularity?: number;
}

export interface PresetCategory {
  id: 'modern' | 'creative' | 'professional' | 'classic';
  name: string;
  description: string;
  presets: CaptionPreset[];
}