/**
 * Browser-compatible PlayerInput interface for T037/T038 implementations
 * This interface matches what the browser components expect
 */

export interface PlayerInput {
  playerId: string;
  timestamp: number;
  sequence: number;
  inputType: 'ARROW_PLACE' | 'MOVE' | 'ACTION';
  data: any;
  rateLimitingInfo: {
    windowStart: number;
    windowEnd: number;
    inputCount: number;
    allowedCount: number;
  };
  acknowledged: boolean;
  acknowledgmentTimeout: number;
}

export interface InputData {
  // Arrow placement
  position?: { x: number; y: number };
  direction?: string;

  // Movement
  targetPosition?: { x: number; y: number };
  velocity?: { x: number; y: number };

  // General action
  action?: string;
  parameters?: Record<string, any>;

  // Browser-specific properties
  x?: number;
  y?: number;
}