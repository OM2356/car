export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

export interface CarColorConfig {
  id: string;
  name: string;
  hex: number;
  cssColor: string;
  secondaryHex: number;
}

export const CAR_COLORS: CarColorConfig[] = [
  { id: 'crimson', name: 'Inferno Red', hex: 0xd91b24, cssColor: '#d91b24', secondaryHex: 0x1a1a1a },
  { id: 'cyan', name: 'Cyber Neon', hex: 0x00d2ff, cssColor: '#00d2ff', secondaryHex: 0x0a192f },
  { id: 'yellow', name: 'Solar Strike', hex: 0xffb703, cssColor: '#ffb703', secondaryHex: 0x222222 },
  { id: 'lime', name: 'Toxic Lime', hex: 0x39ff14, cssColor: '#39ff14', secondaryHex: 0x112211 },
  { id: 'purple', name: 'Drift Violet', hex: 0x9d4edd, cssColor: '#9d4edd', secondaryHex: 0x240046 },
  { id: 'stealth', name: 'Phantom Black', hex: 0x212529, cssColor: '#212529', secondaryHex: 0x495057 },
  { id: 'orange', name: 'Blaze Orange', hex: 0xff5400, cssColor: '#ff5400', secondaryHex: 0x331000 },
];

export interface GameTelemetry {
  speedKmh: number;
  rpm: number;
  gear: number;
  distanceMeters: number;
  score: number;
  highScore: number;
  combo: number;
  turbo: number; // 0 to 100
  isBoosting: boolean;
  nearMissCount: number;
  laneIndex: number; // 0 = Left, 1 = Center, 2 = Right
  recentNearMiss: {
    points: number;
    text: string;
    timestamp: number;
  } | null;
}

export interface InputState {
  steerLeft: boolean;
  steerRight: boolean;
  accelerate: boolean;
  brake: boolean;
  turbo: boolean;
}
