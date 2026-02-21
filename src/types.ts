export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  index: number;
}

export interface TrendLine {
  id: string;
  startIndex: number;
  startPrice: number;
  endIndex: number | null;
  endPrice: number | null;
  color: string;
}

export interface TextElement {
  id: string;
  startIndex: number;
  startPrice: number;
  text: string;
  color: string;
}

export interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

export interface Settings {
  snapToGrid: boolean;
  continuity: boolean;
  timeframe: number; // width of a candle in pixels
  priceStep: number; // height of a price unit in pixels
  autoAdvance: boolean;
  continuousDraw: boolean;
  baseTimeframe: number; // in minutes
  activeTimeframe: number; // in minutes
  tool: 'draw' | 'hand' | 'line' | 'text';
  lineColor: string;
  theme: 'dark' | 'light';
  preventPastDrawing: boolean;
}

export interface SessionInfo {
  name: string;
  pair: string;
  baseTimeframe: string;
  startPrice: number;
  startTime: number; // epoch timestamp
}

export interface DrawingSession {
  id?: number;
  name: string;
  candles: Candle[];
  trendLines: TrendLine[];
  texts: TextElement[];
  settings: Settings;
  sessionInfo: SessionInfo;
}
