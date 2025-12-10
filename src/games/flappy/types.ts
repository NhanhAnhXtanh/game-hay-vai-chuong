import type { PipeSnapshot } from "./logic/flappyEngine";

export type FlappyRoomStatus = "LOBBY" | "PLAYING" | "FINISHED";

export interface FlappyPlayer {
  uid: string;
  name: string;
  ready: boolean;
  wins: number;
  best: number;
  lastScore?: number;
}

export interface FlappyRoom {
  id: string;
  name: string;
  status: FlappyRoomStatus;
  round: number;
  seed: number;
  roundStartedAt?: number | object | null;
  lastResult?: { winners: string[]; score: number; round: number };
  players: Record<string, FlappyPlayer>;
  createdAt: number | object;
  updatedAt: number | object;
}

export interface FlappyPlayerState {
  uid: string;
  name: string;
  round: number;
  alive: boolean;
  started: boolean;
  score: number;
  birdY: number;
  velocity: number;
  pipes: PipeSnapshot[];
  updatedAt: number;
}
