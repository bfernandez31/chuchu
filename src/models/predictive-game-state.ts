/**
 * T019: PredictiveGameState Model
 *
 * Client-side predicted state structure with confidence calculation,
 * interpolation management, and input buffer handling.
 */

import { AuthoritativeGameState, Entity, Player, Position, GamePhase } from './authoritative-game-state';

export enum PredictionType {
  MOVEMENT = 'MOVEMENT',
  ARROW_PLACEMENT = 'ARROW_PLACEMENT',
  COLLISION = 'COLLISION',
  SCORE_UPDATE = 'SCORE_UPDATE'
}

export interface PredictionEntry {
  id: string;
  type: PredictionType;
  timestamp: number;
  confidence: number; // 0.0 - 1.0
  data: any;
  validated: boolean;
  correction?: any;
}

export interface InterpolationState {
  startPosition: Position;
  targetPosition: Position;
  startTime: number;
  duration: number;
  progress: number; // 0.0 - 1.0
  velocity: Position;
}

export interface InputBufferEntry {
  timestamp: number;
  inputType: string;
  data: any;
  sequence: number;
  acknowledged: boolean;
  predicted: boolean;
}

export interface ClientMetrics {
  frameRate: number;
  renderTime: number;
  predictionAccuracy: number;
  rollbackCount: number;
  interpolationErrors: number;
}

export interface PredictiveGameState {
  // Base state reference
  authoritative: AuthoritativeGameState;

  // Prediction system
  predictions: Map<string, PredictionEntry>;
  confidence: number; // Overall prediction confidence 0.0-1.0
  lastServerUpdate: number;

  // Interpolation system
  interpolations: Map<string, InterpolationState>;
  smoothingEnabled: boolean;

  // Input management
  inputBuffer: InputBufferEntry[];
  maxBufferSize: number; // Max 10 entries as per spec
  lastInputSequence: number;

  // Client performance
  clientMetrics: ClientMetrics;

  // Validation
  isValid(): boolean;
  isDivergent(): boolean;
}

export class PredictiveGameStateImpl implements PredictiveGameState {
  public authoritative: AuthoritativeGameState;
  public predictions: Map<string, PredictionEntry>;
  public confidence: number;
  public lastServerUpdate: number;
  public interpolations: Map<string, InterpolationState>;
  public smoothingEnabled: boolean;
  public inputBuffer: InputBufferEntry[];
  public maxBufferSize: number;
  public lastInputSequence: number;
  public clientMetrics: ClientMetrics;

  constructor(authoritativeState: AuthoritativeGameState) {
    this.authoritative = authoritativeState;
    this.predictions = new Map();
    this.confidence = 1.0;
    this.lastServerUpdate = Date.now();
    this.interpolations = new Map();
    this.smoothingEnabled = true;
    this.inputBuffer = [];
    this.maxBufferSize = 10;
    this.lastInputSequence = 0;

    this.clientMetrics = {
      frameRate: 60,
      renderTime: 16,
      predictionAccuracy: 1.0,
      rollbackCount: 0,
      interpolationErrors: 0
    };
  }

  /**
   * Validate predictive state consistency
   */
  public isValid(): boolean {
    try {
      // Confidence must be in valid range
      if (this.confidence < 0.0 || this.confidence > 1.0) return false;

      // Input buffer size constraint
      if (this.inputBuffer.length > this.maxBufferSize) return false;

      // Predictions must have valid confidence
      for (const [id, prediction] of Array.from(this.predictions)) {
        if (prediction.confidence < 0.0 || prediction.confidence > 1.0) return false;
        if (prediction.timestamp <= 0) return false;
      }

      // Interpolations must have valid progress
      for (const [id, interpolation] of Array.from(this.interpolations)) {
        if (interpolation.progress < 0.0 || interpolation.progress > 1.0) return false;
        if (interpolation.duration <= 0) return false;
      }

      // Input buffer entries must be ordered by timestamp
      for (let i = 1; i < this.inputBuffer.length; i++) {
        if (this.inputBuffer[i].timestamp < this.inputBuffer[i - 1].timestamp) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Predictive state validation error:', error);
      return false;
    }
  }

  /**
   * Check if predicted state has diverged significantly from server
   */
  public isDivergent(): boolean {
    const divergenceThreshold = 0.7; // Below this confidence indicates divergence
    const timeThreshold = 500; // 500ms without server update indicates potential divergence

    const timeSinceUpdate = Date.now() - this.lastServerUpdate;

    return this.confidence < divergenceThreshold || timeSinceUpdate > timeThreshold;
  }

  /**
   * Add prediction for future state
   */
  public addPrediction(type: PredictionType, data: any, confidence: number = 0.8): string {
    const predictionId = this.generatePredictionId();

    const prediction: PredictionEntry = {
      id: predictionId,
      type,
      timestamp: Date.now(),
      confidence: Math.max(0.0, Math.min(1.0, confidence)),
      data,
      validated: false
    };

    this.predictions.set(predictionId, prediction);
    this.updateOverallConfidence();

    return predictionId;
  }

  /**
   * Validate prediction against server state
   */
  public validatePrediction(predictionId: string, serverData: any): boolean {
    const prediction = this.predictions.get(predictionId);
    if (!prediction) return false;

    prediction.validated = true;

    // Calculate prediction accuracy
    const accuracy = this.calculatePredictionAccuracy(prediction.data, serverData);

    if (accuracy < 0.9) {
      // Prediction was incorrect, store correction
      prediction.correction = serverData;
      this.clientMetrics.rollbackCount++;
    }

    // Update prediction accuracy metric
    this.updatePredictionAccuracy(accuracy);
    this.updateOverallConfidence();

    return accuracy >= 0.9;
  }

  /**
   * Start interpolation for smooth movement
   */
  public startInterpolation(entityId: string, startPos: Position, targetPos: Position, duration: number): void {
    const velocity = {
      x: (targetPos.x - startPos.x) / duration,
      y: (targetPos.y - startPos.y) / duration
    };

    const interpolation: InterpolationState = {
      startPosition: { ...startPos },
      targetPosition: { ...targetPos },
      startTime: Date.now(),
      duration: Math.max(16, duration), // Minimum 16ms (1 frame at 60fps)
      progress: 0.0,
      velocity
    };

    this.interpolations.set(entityId, interpolation);
  }

  /**
   * Update interpolation progress
   */
  public updateInterpolations(deltaTime: number): void {
    for (const [entityId, interpolation] of Array.from(this.interpolations)) {
      const elapsed = Date.now() - interpolation.startTime;
      interpolation.progress = Math.min(1.0, elapsed / interpolation.duration);

      if (interpolation.progress >= 1.0) {
        // Interpolation complete
        this.interpolations.delete(entityId);
      }
    }
  }

  /**
   * Add input to buffer with prediction
   */
  public addInput(inputType: string, data: any, predict: boolean = true): void {
    // Maintain buffer size limit
    if (this.inputBuffer.length >= this.maxBufferSize) {
      this.inputBuffer.shift(); // Remove oldest
    }

    const inputEntry: InputBufferEntry = {
      timestamp: Date.now(),
      inputType,
      data,
      sequence: ++this.lastInputSequence,
      acknowledged: false,
      predicted: predict
    };

    this.inputBuffer.push(inputEntry);

    // If prediction enabled, create immediate prediction
    if (predict) {
      this.createInputPrediction(inputEntry);
    }
  }

  /**
   * Acknowledge input from server
   */
  public acknowledgeInput(sequence: number, serverData?: any): boolean {
    const input = this.inputBuffer.find(entry => entry.sequence === sequence);
    if (!input) return false;

    input.acknowledged = true;

    // If server data differs from prediction, handle rollback
    if (serverData && input.predicted) {
      const accuracy = this.calculatePredictionAccuracy(input.data, serverData);
      if (accuracy < 0.9) {
        this.handleInputRollback(input, serverData);
      }
    }

    return true;
  }

  /**
   * Clear acknowledged inputs from buffer
   */
  public cleanupBuffer(): void {
    const cutoffTime = Date.now() - 5000; // Keep last 5 seconds
    this.inputBuffer = this.inputBuffer.filter(entry =>
      !entry.acknowledged || entry.timestamp > cutoffTime
    );
  }

  /**
   * Get interpolated position for entity
   */
  public getInterpolatedPosition(entityId: string): Position | null {
    const interpolation = this.interpolations.get(entityId);
    if (!interpolation) return null;

    const t = interpolation.progress;

    // Use easing for smoother interpolation
    const easedT = this.easeOutCubic(t);

    return {
      x: interpolation.startPosition.x + (interpolation.targetPosition.x - interpolation.startPosition.x) * easedT,
      y: interpolation.startPosition.y + (interpolation.targetPosition.y - interpolation.startPosition.y) * easedT
    };
  }

  /**
   * Update with new authoritative state from server
   */
  public updateFromServer(authoritativeState: AuthoritativeGameState): void {
    this.authoritative = authoritativeState;
    this.lastServerUpdate = Date.now();

    // Validate existing predictions against server state
    this.validateExistingPredictions();

    // Update client metrics
    this.updateClientMetrics();
  }

  // Private methods

  private createInputPrediction(input: InputBufferEntry): void {
    let confidence = 0.9; // High confidence for input predictions

    switch (input.inputType) {
      case 'ARROW_PLACE':
        confidence = 0.95; // Very high confidence for arrow placement
        break;
      case 'MOVE':
        confidence = 0.85; // Lower confidence for movement due to collision possibilities
        break;
      case 'ACTION':
        confidence = 0.8; // Medium confidence for general actions
        break;
    }

    this.addPrediction(PredictionType.MOVEMENT, input.data, confidence);
  }

  private calculatePredictionAccuracy(predicted: any, actual: any): number {
    if (!predicted || !actual) return 0.0;

    // For position-based predictions
    if (predicted.x !== undefined && predicted.y !== undefined &&
        actual.x !== undefined && actual.y !== undefined) {
      const distance = Math.sqrt(
        Math.pow(predicted.x - actual.x, 2) +
        Math.pow(predicted.y - actual.y, 2)
      );

      // Convert distance to accuracy (0-1), where 0 distance = 1.0 accuracy
      return Math.max(0.0, 1.0 - (distance / 10.0)); // 10 units = 0 accuracy
    }

    // For other data types, use simple equality
    return JSON.stringify(predicted) === JSON.stringify(actual) ? 1.0 : 0.0;
  }

  private updatePredictionAccuracy(newAccuracy: number): void {
    const alpha = 0.1; // Smoothing factor
    this.clientMetrics.predictionAccuracy =
      this.clientMetrics.predictionAccuracy * (1 - alpha) + newAccuracy * alpha;
  }

  private updateOverallConfidence(): void {
    if (this.predictions.size === 0) {
      this.confidence = 1.0;
      return;
    }

    let totalConfidence = 0;
    let recentPredictions = 0;
    const recentThreshold = Date.now() - 1000; // Last 1 second

    for (const [id, prediction] of Array.from(this.predictions)) {
      if (prediction.timestamp >= recentThreshold) {
        totalConfidence += prediction.confidence;
        recentPredictions++;
      }
    }

    if (recentPredictions > 0) {
      this.confidence = totalConfidence / recentPredictions;
    }
  }

  private validateExistingPredictions(): void {
    // Clean up old predictions
    const cutoffTime = Date.now() - 2000; // 2 seconds
    for (const [id, prediction] of Array.from(this.predictions)) {
      if (prediction.timestamp < cutoffTime) {
        this.predictions.delete(id);
      }
    }
  }

  private handleInputRollback(input: InputBufferEntry, serverData: any): void {
    this.clientMetrics.rollbackCount++;

    // In a full implementation, this would trigger visual rollback
    console.log('Input rollback required', {
      sequence: input.sequence,
      predicted: input.data,
      actual: serverData
    });
  }

  private updateClientMetrics(): void {
    this.clientMetrics.renderTime = performance.now() % 100; // Simplified

    // Update frame rate based on recent performance
    if (this.clientMetrics.renderTime > 20) {
      this.clientMetrics.frameRate = Math.max(30, this.clientMetrics.frameRate - 1);
    } else if (this.clientMetrics.renderTime < 14) {
      this.clientMetrics.frameRate = Math.min(60, this.clientMetrics.frameRate + 1);
    }
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private generatePredictionId(): string {
    return `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Factory for creating PredictiveGameState instances
 */
export class PredictiveGameStateFactory {
  static create(authoritativeState: AuthoritativeGameState): PredictiveGameState {
    return new PredictiveGameStateImpl(authoritativeState);
  }

  static createWithConfig(
    authoritativeState: AuthoritativeGameState,
    config: {
      maxBufferSize?: number;
      smoothingEnabled?: boolean;
      initialConfidence?: number;
    }
  ): PredictiveGameState {
    const state = new PredictiveGameStateImpl(authoritativeState);

    if (config.maxBufferSize !== undefined) {
      state.maxBufferSize = Math.max(1, Math.min(10, config.maxBufferSize));
    }

    if (config.smoothingEnabled !== undefined) {
      state.smoothingEnabled = config.smoothingEnabled;
    }

    if (config.initialConfidence !== undefined) {
      state.confidence = Math.max(0.0, Math.min(1.0, config.initialConfidence));
    }

    return state;
  }
}