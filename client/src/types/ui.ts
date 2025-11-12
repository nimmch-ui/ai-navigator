export enum UiMode {
  CLASSIC = 'CLASSIC',
  THREED = 'THREED',
  CINEMATIC = 'CINEMATIC',
  AR = 'AR',
  VR = 'VR',
  ECO = 'ECO'
}

export interface DriverState {
  focus: number; // 0-100
  stress: number; // 0-100
  mood: 'calm' | 'neutral' | 'excited' | 'anxious';
}

export interface ImmersionSettings {
  uiMode: UiMode;
  hapticsEnabled: boolean;
  spatialAudio: boolean;
  ambientMusic: boolean;
  arEnabled: boolean;
}

export interface EmotionState {
  driverState: DriverState;
  timestamp: number;
}
