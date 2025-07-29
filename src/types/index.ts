export interface CaptionSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  words?: WordTimestamp[];
  style: CaptionStyle;
}

export interface CaptionStyle {
  font: string; // Changed from FontOption to string for more flexibility
  fontSize: number;
  textColor: string; // Changed from ColorOption to string
  highlighterColor: string; // Changed from ColorOption to string
  backgroundColor: string; // Changed from ColorOption to string
  strokeColor?: string; // Text stroke color
  strokeWidth?: number; // Text stroke width
  textTransform?: 'none' | 'capitalize' | 'uppercase' | 'lowercase'; // Text transformation
  position: {
    x: number;
    y: number;
    z?: number; // Added z rotation
  };
  scale?: number; // Scale factor for subtitle size (0.5 - 2.0)
  emphasizeMode?: boolean; // When true, highlighted words get emphasized instead of background highlight
  renderMode?: 'horizontal' | 'progressive'; // New: horizontal (default) or progressive reveal
}

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
  SF_PRO_DISPLAY_SEMIBOLD = 'SF Pro Display Semibold',
  ARIAL = 'Arial',
  HELVETICA = 'Helvetica',
  TIMES_NEW_ROMAN = 'Times New Roman',
  GEORGIA = 'Georgia'
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
  captions: CaptionSegment[];
  timeline: TimelineSelection[];
  lastModified: number;
}