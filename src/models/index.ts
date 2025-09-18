// Model exports for hybrid predictive rendering system
export * from './authoritative-game-state';
export * from './predictive-game-state';
export * from './player-input';
export * from './state-reconciliation';
export * from './performance-metrics';

// Type definitions for enhanced game state management
export type GamePhase = 'WAITING' | 'ACTIVE' | 'ENDING';
export type InputType = 'ARROW_PLACE' | 'MOVE' | 'ACTION';
export type Priority = 'MINOR' | 'MODERATE' | 'MAJOR';
export type ReconciliationType = 'PREDICTION_MISMATCH' | 'LATENCY_COMPENSATION' | 'AUTHORITY_OVERRIDE';

// Common interfaces used across the hybrid rendering system
export interface Timestamp {
  value: number;
  source: 'client' | 'server';
}

export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  dx: number;
  dy: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Validation ranges for performance metrics
export const PERFORMANCE_RANGES = {
  FPS: { min: 1, max: 120 },
  LATENCY_MS: { min: 0, max: 1000 },
  CPU_USAGE: { min: 0, max: 100 },
  MEMORY_MB: { min: 0, max: 8192 },
  BANDWIDTH_KBPS: { min: 0, max: 10000 },
  COMPRESSION_RATIO: { min: 0, max: 1 }
} as const;