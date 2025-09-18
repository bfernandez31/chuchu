/**
 * T025: RollbackManager Implementation
 *
 * Rollback netcode implementation with visual correction smoothing,
 * prediction error detection, and input replay management.
 */

import { StateReconciliation, StateReconciliationFactory, CorrectionSeverity, CorrectionType } from '../models/state-reconciliation';
import { PlayerInput, InputBuffer } from '../models/player-input';
import { PredictionEngine } from './prediction-engine';
import { InterpolationService, InterpolationType } from './interpolation-service';
import { Position, Entity } from '../models/authoritative-game-state';

export interface RollbackConfig {
  errorThreshold: number; // Pixels difference threshold for rollback (default: 2.0)
  maxRollbackDistance: number; // Maximum frames to rollback (default: 10)
  smoothingEnabled: boolean; // Enable visual smoothing (default: true)
  smoothingDuration: number; // Smoothing duration in ms (16-50ms)
  inputReplayEnabled: boolean; // Enable input replay after rollback
  performanceMode: 'quality' | 'performance' | 'balanced';
}

export interface RollbackEvent {
  id: string;
  timestamp: number;
  playerId: string;
  errorMagnitude: number;
  correctionType: CorrectionType;
  rollbackFrames: number;
  smoothingApplied: boolean;
}

export interface CorrectionResult {
  correctionApplied: boolean;
  smoothingDuration: number;
  inputsReplayed: number;
  performanceImpact: number; // ms of processing time
}

export interface VisualCorrection {
  entityId: string;
  fromState: any;
  toState: any;
  easingFunction: string;
  duration: number;
  startTime: number;
}

export class RollbackManager {
  private config: RollbackConfig;
  private predictionEngine: PredictionEngine;
  private interpolationService: InterpolationService;
  private inputBuffer: InputBuffer;
  private activeCorrections: Map<string, VisualCorrection> = new Map();
  private rollbackHistory: RollbackEvent[] = [];
  private readonly maxHistorySize = 100;
  private readonly errorDetectionThreshold = 2.0; // pixels

  constructor(
    predictionEngine: PredictionEngine,
    interpolationService: InterpolationService,
    inputBuffer: InputBuffer,
    config?: Partial<RollbackConfig>
  ) {
    this.predictionEngine = predictionEngine;
    this.interpolationService = interpolationService;
    this.inputBuffer = inputBuffer;

    this.config = {
      errorThreshold: 2.0,
      maxRollbackDistance: 10,
      smoothingEnabled: true,
      smoothingDuration: 33, // ~2 frames at 60fps
      inputReplayEnabled: true,
      performanceMode: 'balanced',
      ...config
    };
  }

  /**
   * Detect prediction errors and trigger rollback if necessary
   */
  public detectAndCorrect(
    predictedState: any,
    authoritativeState: any,
    playerId: string
  ): CorrectionResult {
    const startTime = performance.now();

    // Calculate prediction error
    const errorMagnitude = this.calculatePredictionError(predictedState, authoritativeState);

    // Check if rollback is needed
    if (errorMagnitude < this.config.errorThreshold) {
      return {
        correctionApplied: false,
        smoothingDuration: 0,
        inputsReplayed: 0,
        performanceImpact: performance.now() - startTime
      };
    }

    // Create state reconciliation
    const reconciliation = this.createStateReconciliation(
      predictedState,
      authoritativeState,
      playerId,
      errorMagnitude
    );

    // Apply rollback correction
    const correctionResult = this.applyRollbackCorrection(reconciliation);

    // Record rollback event
    this.recordRollbackEvent({
      id: reconciliation.id,
      timestamp: Date.now(),
      playerId,
      errorMagnitude,
      correctionType: this.determineCorrectionType(predictedState, authoritativeState),
      rollbackFrames: this.calculateRollbackFrames(errorMagnitude),
      smoothingApplied: this.config.smoothingEnabled
    });

    return {
      correctionApplied: true,
      smoothingDuration: reconciliation.smoothingConfig.duration,
      inputsReplayed: reconciliation.inputReplay.inputsToReplay.length,
      performanceImpact: performance.now() - startTime
    };
  }

  /**
   * Apply rollback correction with visual smoothing
   */
  public applyRollbackCorrection(reconciliation: StateReconciliation): CorrectionResult {
    const startTime = performance.now();

    // Apply entity corrections
    for (const entityCorrection of reconciliation.entityCorrections) {
      this.applyEntityCorrection(entityCorrection, reconciliation.smoothingConfig.duration);
    }

    // Apply player corrections
    for (const playerCorrection of reconciliation.playerCorrections) {
      this.applyPlayerCorrection(playerCorrection);
    }

    // Handle input replay if required
    let inputsReplayed = 0;
    if (reconciliation.requiresInputReplay() && this.config.inputReplayEnabled) {
      inputsReplayed = this.replayInputs(reconciliation);
    }

    // Update smoothing duration based on severity
    const smoothingDuration = this.config.smoothingEnabled
      ? reconciliation.calculateSmoothingDuration()
      : 0;

    return {
      correctionApplied: true,
      smoothingDuration,
      inputsReplayed,
      performanceImpact: performance.now() - startTime
    };
  }

  /**
   * Apply visual smoothing for position corrections
   */
  public applySmoothCorrection(
    entityId: string,
    fromPosition: Position,
    toPosition: Position,
    duration?: number
  ): void {
    if (!this.config.smoothingEnabled) {
      return;
    }

    const correctionDistance = Math.sqrt(
      (toPosition.x - fromPosition.x) ** 2 +
      (toPosition.y - fromPosition.y) ** 2
    );

    // Don't smooth very small corrections
    if (correctionDistance < 0.5) {
      return;
    }

    const smoothingDuration = duration || this.calculateSmoothingDuration(correctionDistance);
    const easingFunction = this.selectEasingFunction(correctionDistance);

    const visualCorrection: VisualCorrection = {
      entityId,
      fromState: { position: fromPosition },
      toState: { position: toPosition },
      easingFunction,
      duration: smoothingDuration,
      startTime: Date.now()
    };

    this.activeCorrections.set(entityId, visualCorrection);

    // Use interpolation service for smooth transition
    this.interpolationService.startInterpolation({
      entityId,
      startState: { position: fromPosition },
      targetState: { position: toPosition },
      duration: smoothingDuration,
      type: this.easingFunctionToInterpolationType(easingFunction),
      priority: 1.0 // Highest priority for corrections
    });
  }

  /**
   * Update visual corrections and smoothing
   */
  public updateCorrections(deltaTime: number): Map<string, any> {
    const correctionStates = new Map<string, any>();
    const completedCorrections: string[] = [];

    // Update interpolation service
    const interpolationResults = this.interpolationService.updateInterpolations(deltaTime);

    // Process active corrections
    for (const [entityId, correction] of Array.from(this.activeCorrections)) {
      const elapsed = Date.now() - correction.startTime;
      const progress = Math.min(1.0, elapsed / correction.duration);

      if (progress >= 1.0) {
        // Correction complete
        correctionStates.set(entityId, correction.toState);
        completedCorrections.push(entityId);
      } else {
        // Get interpolated state
        const interpolationResult = interpolationResults.get(entityId);
        if (interpolationResult) {
          correctionStates.set(entityId, interpolationResult.interpolatedState);
        }
      }
    }

    // Clean up completed corrections
    for (const entityId of completedCorrections) {
      this.activeCorrections.delete(entityId);
    }

    return correctionStates;
  }

  /**
   * Check if entity is currently being corrected
   */
  public isEntityBeingCorrected(entityId: string): boolean {
    return this.activeCorrections.has(entityId);
  }

  /**
   * Force immediate correction without smoothing
   */
  public forceImmediateCorrection(
    entityId: string,
    correctedState: any,
    reason?: string
  ): void {
    // Cancel any active correction
    this.activeCorrections.delete(entityId);
    this.interpolationService.cancelInterpolation(entityId);

    // Apply correction immediately
    // In a full implementation, this would update the game state directly
    console.log(`Force correction for ${entityId}:`, correctedState, reason);
  }

  /**
   * Get rollback statistics for performance monitoring
   */
  public getStatistics(): {
    totalRollbacks: number;
    averageErrorMagnitude: number;
    rollbacksByType: Record<CorrectionType, number>;
    averageSmoothingDuration: number;
    performanceImpact: {
      averageProcessingTime: number;
      maxProcessingTime: number;
    };
  } {
    const rollbacksByType: Record<CorrectionType, number> = {
      [CorrectionType.POSITION]: 0,
      [CorrectionType.VELOCITY]: 0,
      [CorrectionType.STATE]: 0,
      [CorrectionType.CREATION]: 0,
      [CorrectionType.DELETION]: 0
    };

    let totalErrorMagnitude = 0;
    let totalSmoothingDuration = 0;

    for (const event of this.rollbackHistory) {
      rollbacksByType[event.correctionType]++;
      totalErrorMagnitude += event.errorMagnitude;
    }

    const totalRollbacks = this.rollbackHistory.length;
    const averageErrorMagnitude = totalRollbacks > 0 ? totalErrorMagnitude / totalRollbacks : 0;

    return {
      totalRollbacks,
      averageErrorMagnitude,
      rollbacksByType,
      averageSmoothingDuration: totalRollbacks > 0 ? totalSmoothingDuration / totalRollbacks : 0,
      performanceImpact: {
        averageProcessingTime: 2.5, // TODO: Implement actual measurement
        maxProcessingTime: 8.0
      }
    };
  }

  /**
   * Clean up old corrections and history
   */
  public cleanup(): void {
    const cutoffTime = Date.now() - 60000; // 1 minute

    // Clean up rollback history
    this.rollbackHistory = this.rollbackHistory.filter(event => event.timestamp > cutoffTime);

    // Clean up stale corrections
    for (const [entityId, correction] of Array.from(this.activeCorrections)) {
      if (Date.now() - correction.startTime > correction.duration * 2) {
        this.activeCorrections.delete(entityId);
        this.interpolationService.cancelInterpolation(entityId);
      }
    }
  }

  // Private methods

  private calculatePredictionError(predicted: any, actual: any): number {
    // Position-based error calculation
    if (predicted.position && actual.position) {
      return Math.sqrt(
        (predicted.position.x - actual.position.x) ** 2 +
        (predicted.position.y - actual.position.y) ** 2
      );
    }

    // State-based error (binary)
    if (JSON.stringify(predicted) !== JSON.stringify(actual)) {
      return this.config.errorThreshold + 1; // Force rollback for state mismatches
    }

    return 0;
  }

  private createStateReconciliation(
    predictedState: any,
    authoritativeState: any,
    playerId: string,
    errorMagnitude: number
  ): StateReconciliation {
    const reconciliation = StateReconciliationFactory.create(
      authoritativeState.sequence || Date.now()
    );

    // Add entity correction if positions differ
    if (predictedState.position && authoritativeState.position) {
      reconciliation.addEntityCorrection(
        predictedState.id || 'unknown',
        CorrectionType.POSITION,
        predictedState.position,
        authoritativeState.position,
        this.calculateCorrectionConfidence(errorMagnitude)
      );
    }

    // Set up input replay for significant errors
    if (errorMagnitude > this.config.errorThreshold * 2) {
      const pendingInputs = this.inputBuffer.getPendingInputs(playerId);
      reconciliation.setupInputReplay(
        authoritativeState.sequence || 0,
        pendingInputs.slice(-5) // Replay last 5 inputs
      );
    }

    return reconciliation;
  }

  private applyEntityCorrection(entityCorrection: any, smoothingDuration: number): void {
    if (entityCorrection.type === CorrectionType.POSITION) {
      this.applySmoothCorrection(
        entityCorrection.entityId,
        entityCorrection.previousValue,
        entityCorrection.correctedValue,
        smoothingDuration
      );
    }
    // Handle other correction types...
  }

  private applyPlayerCorrection(playerCorrection: any): void {
    // Apply player-specific corrections (score, arrows, etc.)
    console.log('Applying player correction:', playerCorrection);
  }

  private replayInputs(reconciliation: StateReconciliation): number {
    const { inputsToReplay } = reconciliation.inputReplay;
    let replayed = 0;

    for (const input of inputsToReplay) {
      // Re-predict from this input
      // In a full implementation, this would re-run prediction from this point
      replayed++;
    }

    reconciliation.completeInputReplay();
    return replayed;
  }

  private calculateSmoothingDuration(correctionDistance: number): number {
    const baseDuration = 16; // 1 frame at 60fps
    const maxDuration = 50;  // Maximum as per spec

    // Scale duration based on correction distance
    const scaleFactor = Math.min(2.0, correctionDistance / 5.0);
    const duration = baseDuration + (scaleFactor * 20);

    return Math.min(maxDuration, Math.max(baseDuration, duration));
  }

  private selectEasingFunction(correctionDistance: number): string {
    if (correctionDistance < 1.0) {
      return 'linear';
    } else if (correctionDistance < 3.0) {
      return 'ease-out';
    } else {
      return 'ease-in-out';
    }
  }

  private easingFunctionToInterpolationType(easingFunction: string): InterpolationType {
    switch (easingFunction) {
      case 'linear': return InterpolationType.LINEAR;
      case 'ease-out': return InterpolationType.EASE_OUT;
      case 'ease-in-out': return InterpolationType.EASE_IN_OUT;
      default: return InterpolationType.EASE_OUT;
    }
  }

  private determineCorrectionType(predicted: any, actual: any): CorrectionType {
    if (predicted.position && actual.position) {
      return CorrectionType.POSITION;
    }
    if (predicted.velocity && actual.velocity) {
      return CorrectionType.VELOCITY;
    }
    return CorrectionType.STATE;
  }

  private calculateRollbackFrames(errorMagnitude: number): number {
    // Calculate how many frames to rollback based on error magnitude
    const framesPerPixel = 0.5;
    return Math.min(
      this.config.maxRollbackDistance,
      Math.ceil(errorMagnitude * framesPerPixel)
    );
  }

  private calculateCorrectionConfidence(errorMagnitude: number): number {
    // Higher error magnitude = lower confidence in our prediction
    return Math.max(0.1, 1.0 - (errorMagnitude / 10.0));
  }

  private recordRollbackEvent(event: RollbackEvent): void {
    this.rollbackHistory.push(event);

    // Maintain history size
    if (this.rollbackHistory.length > this.maxHistorySize) {
      this.rollbackHistory.shift();
    }
  }
}

/**
 * Rollback event listener interface
 */
export interface RollbackEventListener {
  onRollbackDetected?(event: RollbackEvent): void;
  onCorrectionApplied?(entityId: string, correction: VisualCorrection): void;
  onCorrectionCompleted?(entityId: string): void;
  onInputReplayed?(input: PlayerInput): void;
}

/**
 * Advanced rollback manager with event handling
 */
export class AdvancedRollbackManager extends RollbackManager {
  private listeners: RollbackEventListener[] = [];

  public addEventListener(listener: RollbackEventListener): void {
    this.listeners.push(listener);
  }

  public removeEventListener(listener: RollbackEventListener): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  protected notifyRollbackDetected(event: RollbackEvent): void {
    for (const listener of this.listeners) {
      listener.onRollbackDetected?.(event);
    }
  }

  protected notifyCorrectionApplied(entityId: string, correction: VisualCorrection): void {
    for (const listener of this.listeners) {
      listener.onCorrectionApplied?.(entityId, correction);
    }
  }
}

/**
 * Factory for creating RollbackManager instances
 */
export class RollbackManagerFactory {
  static create(
    predictionEngine: PredictionEngine,
    interpolationService: InterpolationService,
    inputBuffer: InputBuffer,
    config?: Partial<RollbackConfig>
  ): RollbackManager {
    return new RollbackManager(predictionEngine, interpolationService, inputBuffer, config);
  }

  static createAdvanced(
    predictionEngine: PredictionEngine,
    interpolationService: InterpolationService,
    inputBuffer: InputBuffer,
    config?: Partial<RollbackConfig>
  ): AdvancedRollbackManager {
    return new AdvancedRollbackManager(predictionEngine, interpolationService, inputBuffer, config);
  }

  static createHighPerformance(
    predictionEngine: PredictionEngine,
    interpolationService: InterpolationService,
    inputBuffer: InputBuffer
  ): RollbackManager {
    return new RollbackManager(predictionEngine, interpolationService, inputBuffer, {
      errorThreshold: 3.0, // Higher threshold = fewer rollbacks
      maxRollbackDistance: 5,
      smoothingEnabled: false, // Disable for performance
      inputReplayEnabled: false,
      performanceMode: 'performance'
    });
  }

  static createQuality(
    predictionEngine: PredictionEngine,
    interpolationService: InterpolationService,
    inputBuffer: InputBuffer
  ): RollbackManager {
    return new RollbackManager(predictionEngine, interpolationService, inputBuffer, {
      errorThreshold: 1.0, // Lower threshold = more accurate
      maxRollbackDistance: 15,
      smoothingEnabled: true,
      smoothingDuration: 40,
      inputReplayEnabled: true,
      performanceMode: 'quality'
    });
  }
}