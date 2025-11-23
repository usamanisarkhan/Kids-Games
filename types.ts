
export enum GameState {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export interface Balloon {
  id: number;
  x: number;
  y: number;
  radius: number;
  speed: number;
  color: string;
  isPopped: boolean;
  popProgress: number; // 0 to 1
}

export interface Point {
  x: number;
  y: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
}

export interface PopEffect {
  id: number;
  x: number;
  y: number;
  scale: number;
  opacity: number;
  text: string;
  rotation: number;
}

export interface Reward {
  id: number;
  x: number;
  y: number;
  value: number;
  opacity: number;
  scale: number;
}
