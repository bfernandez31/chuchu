// Prediction engine exports
export * from './prediction-engine';
export * from './interpolation-service';
export * from './rollback-manager';

// Prediction system configuration
export const PREDICTION_CONFIG = {
  // Prediction parameters
  MAX_PREDICTION_TIME_MS: 100,
  PREDICTION_CONFIDENCE_THRESHOLD: 0.7,
  INPUT_BUFFER_SIZE: 10,

  // Interpolation settings
  INTERPOLATION_SMOOTHING_FACTOR: 0.8,
  VELOCITY_PREDICTION_WEIGHT: 0.6,
  POSITION_LERP_FACTOR: 0.3,

  // Rollback configuration
  MAX_ROLLBACK_FRAMES: 10,
  ROLLBACK_SMOOTHING_DURATION_MS: 33, // ~2 frames at 60fps
  PREDICTION_ERROR_THRESHOLD_PIXELS: 2,

  // Visual correction easing
  EASING_CURVES: {
    LINEAR: (t: number) => t,
    EASE_OUT: (t: number) => 1 - Math.pow(1 - t, 3),
    EASE_IN_OUT: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  },

  // Input rate limiting
  MAX_INPUTS_PER_SECOND: 60,
  INPUT_RATE_WINDOW_MS: 1000
} as const;

// Prediction confidence factors
export interface ConfidenceFactors {
  networkStability: number;    // 0-1 based on latency variance
  inputConsistency: number;    // 0-1 based on input pattern
  serverAgreement: number;     // 0-1 based on recent prediction accuracy
  gameStateComplexity: number; // 0-1 based on collision potential
}

// Prediction state management
export interface PredictionState {
  isActive: boolean;
  confidence: number;
  lastServerUpdate: number;
  pendingInputs: number;
  errorHistory: number[];
}

// Interpolation parameters
export interface InterpolationParams {
  startState: any;
  endState: any;
  startTime: number;
  endTime: number;
  easingFunction: (t: number) => number;
}

// Rollback correction data
export interface RollbackData {
  correctionId: string;
  rollbackToSequence: number;
  affectedEntities: string[];
  severity: 'MINOR' | 'MODERATE' | 'MAJOR';
  smoothingDuration: number;
  inputsToReplay: any[];
}