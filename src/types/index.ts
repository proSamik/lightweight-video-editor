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
  position: {
    x: number;
    y: number;
    z?: number; // Added z rotation
  };
  width: number;
  emphasizeMode?: boolean; // When true, highlighted words get emphasized instead of background highlight
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
  BRIGHT_YELLOW = '#ffff00',
  BLACK_SEMI = '#80000000',
  TRANSPARENT = 'transparent'
}