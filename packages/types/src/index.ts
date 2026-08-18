export type TrackType = 'video' | 'audio' | 'text' | 'sticker';

export interface Transform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface Effect {
  id: string;
  type: 'brightness' | 'contrast' | 'saturation' | 'lut';
  value: number;
  lutUrl?: string;
}

export interface Transition {
  type: 'fade' | 'slide' | 'zoom';
  durationFrames: number;
}

export interface Clip {
  id: string;
  assetId: string;
  trackId: string;
  startFrame: number;
  durationFrames: number;
  trimStart: number;
  trimEnd: number;
  speed: number;
  volume: number;
  fadeInFrames: number;
  fadeOutFrames: number;
  transform?: Transform;
  effects: Effect[];
  transitionIn?: Transition;
  transitionOut?: Transition;
  text?: string;
  textColor?: string;
  fontSize?: number;
}

export interface Track {
  id: string;
  type: TrackType;
  clips: Clip[];
  muted?: boolean;
  locked?: boolean;
  order: number;
}

export interface Asset {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'image';
  url: string;
  durationFrames?: number;
  width?: number;
  height?: number;
}

export interface Project {
  id: string;
  name: string;
  fps: number;
  resolution: { width: number; height: number };
  tracks: Track[];
  assets: Record<string, Asset>;
}
