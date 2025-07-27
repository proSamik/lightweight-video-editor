export interface CaptionSegment {
  id: string;
  startTime: number; // milliseconds
  endTime: number;
  text: string;
  words?: WordTimestamp[]; // Word-level timestamps for karaoke
  style: {
    font: FontOption;
    fontSize: number;
    textColor: ColorOption;
    highlighterColor: ColorOption;
    backgroundColor: ColorOption;
    position: { x: number; y: number };
    width: number; // pixels
  };
}

export interface WordTimestamp {
  start: number; // milliseconds
  end: number;
  word: string;
}

export enum FontOption {
  ARIAL_BOLD = 'Arial Bold',
  HELVETICA_NEUE_MEDIUM = 'Helvetica Neue Medium',
  SF_PRO_DISPLAY_SEMIBOLD = 'SF Pro Display Semibold',
  FUTURA_BOLD = 'Futura Bold',
  IMPACT = 'Impact',
}

export enum ColorOption {
  WHITE = '#FFFFFF',
  BLACK = '#000000',
  YELLOW = '#FFD700',
  RED = '#FF0000',
  BLUE = '#0080FF',
  BRIGHT_YELLOW = '#FFFF00',
  ORANGE = '#FF8C00',
  GREEN = '#00FF00',
  PINK = '#FF69B4',
  CYAN = '#00FFFF',
  TRANSPARENT = 'transparent',
  BLACK_SEMI = '#00000080',
  WHITE_SEMI = '#FFFFFF80',
  DARK_GRAY = '#333333',
  NAVY_BLUE = '#000080',
}

export interface VideoFile {
  path: string;
  name: string;
  duration: number;
  size: number;
}

export interface TranscriptionResult {
  segments: Array<{
    start: number;
    end: number;
    text: string;
    words: Array<{
      start: number;
      end: number;
      word: string;
    }>;
  }>;
}