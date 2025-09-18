/**
 * T032: PredictiveRenderer Implementation
 *
 * Client-side prediction rendering with smooth interpolation display,
 * local input immediate feedback, and rollback visual correction.
 */

import { GameDisplay } from './game.display';
import { PredictiveGameState } from '../../src/models/predictive-game-state';
import { AuthoritativeGameState } from '../../src/models/authoritative-game-state';
import { PlayerInput } from '../common/player-input';
import { PredictionEngine } from '../../src/prediction/prediction-engine';
import { RollbackManager } from '../../src/prediction/rollback-manager';

export interface PredictiveRenderingState {
  authoritative: AuthoritativeGameState | null;
  predicted: PredictiveGameState | null;
  interpolated: any; // Current interpolated state for display
  rollbackActive: boolean;
  predictionConfidence: number;
}

export interface InterpolationOptions {
  method: 'linear' | 'cubic' | 'smooth';
  duration: number; // ms
  velocityPrediction: boolean;
  boundaryHandling: boolean;
}

export interface RollbackVisualOptions {
  smoothingDuration: number; // ms
  easingFunction: 'linear' | 'easeOut' | 'easeInOut';
  maxCorrectionDistance: number; // pixels
  imperceptibilityThreshold: number; // pixels
}

export class PredictiveRenderer {
  private gameDisplay: GameDisplay;
  private predictionEngine: PredictionEngine;
  private rollbackManager: RollbackManager;
  private renderingState: PredictiveRenderingState;
  private pendingInputs: PlayerInput[] = [];

  // Interpolation system
  private interpolationOptions: InterpolationOptions;
  private interpolationStartTime = 0;
  private interpolationStartState: any = null;
  private interpolationTargetState: any = null;

  // Rollback visual correction
  private rollbackOptions: RollbackVisualOptions;
  private rollbackStartTime = 0;
  private rollbackStartPositions: Map<string, { x: number; y: number }> = new Map();
  private rollbackTargetPositions: Map<string, { x: number; y: number }> = new Map();

  // Performance tracking
  private predictionFrameTime = 0;
  private interpolationFrameTime = 0;
  private rollbackCorrectionCount = 0;

  constructor(gameDisplay: GameDisplay) {
    this.gameDisplay = gameDisplay;
    this.predictionEngine = new PredictionEngine();
    this.rollbackManager = new RollbackManager();

    this.renderingState = {
      authoritative: null,
      predicted: null,
      interpolated: null,
      rollbackActive: false,
      predictionConfidence: 1.0
    };

    this.interpolationOptions = {
      method: 'smooth',
      duration: 100, // 100ms interpolation
      velocityPrediction: true,
      boundaryHandling: true
    };

    this.rollbackOptions = {
      smoothingDuration: 50, // 50ms rollback smoothing
      easingFunction: 'easeOut',
      maxCorrectionDistance: 100, // 100 pixels max correction
      imperceptibilityThreshold: 2 // 2 pixels imperceptibility threshold
    };

    // Enable predictive layer in GameDisplay
    this.gameDisplay.setPredictiveLayerEnabled(true);
  }

  /**
   * Process new authoritative state from server
   */
  processAuthoritativeState(newState: AuthoritativeGameState): void {
    const previousState = this.renderingState.authoritative;
    this.renderingState.authoritative = newState;

    // Check if rollback is needed
    if (this.renderingState.predicted && this.needsRollback(newState)) {
      this.performRollbackCorrection(newState);
    } else {
      // Start smooth interpolation to new state
      this.startInterpolation(this.renderingState.interpolated || previousState, newState);
    }

    // Update prediction engine with new authoritative state
    this.predictionEngine.updateAuthoritativeState(newState);
  }

  /**
   * Add local input for immediate prediction
   */
  addLocalInput(input: PlayerInput): void {
    const startTime = performance.now();

    // Add to pending inputs
    this.pendingInputs.push(input);

    // Generate immediate prediction
    const predictedState = this.predictionEngine.predictFromInput(
      input,
      this.renderingState.authoritative || this.createDefaultState(),
      this.pendingInputs
    );

    this.renderingState.predicted = predictedState;
    this.renderingState.predictionConfidence = predictedState.confidence;

    // Apply immediate visual feedback
    this.applyImmediateFeedback(input, predictedState);

    this.predictionFrameTime = performance.now() - startTime;
  }

  /**
   * Update rendering state and display
   */
  update(): void {
    const currentTime = performance.now();

    // Update interpolation
    if (this.isInterpolating()) {
      this.updateInterpolation(currentTime);
    }

    // Update rollback visual correction
    if (this.renderingState.rollbackActive) {
      this.updateRollbackCorrection(currentTime);
    }

    // Clean up old pending inputs
    this.cleanupPendingInputs();

    // Render current state
    this.render();
  }

  /**
   * Render current predictive state
   */
  private render(): void {
    const stateToRender = this.renderingState.interpolated ||
                         this.renderingState.predicted?.state ||
                         this.renderingState.authoritative;

    if (stateToRender) {
      // Render prediction confidence indicator
      this.renderPredictionConfidence();

      // Render predictive elements on the predictive layer
      this.renderPredictiveElements(stateToRender);

      // Update main display
      this.gameDisplay.display({ state: stateToRender });
    }
  }

  /**
   * Check if rollback correction is needed
   */
  private needsRollback(authoritativeState: AuthoritativeGameState): boolean {
    if (!this.renderingState.predicted) return false;

    return this.rollbackManager.detectPredictionError(
      this.renderingState.predicted,
      authoritativeState,
      2 // 2 pixel threshold
    );
  }

  /**
   * Perform rollback visual correction
   */
  private performRollbackCorrection(authoritativeState: AuthoritativeGameState): void {
    this.rollbackCorrectionCount++;

    const corrections = this.rollbackManager.calculateCorrections(
      this.renderingState.predicted!,
      authoritativeState
    );

    // Check if corrections are imperceptible
    const maxCorrection = Math.max(...corrections.map(c =>
      Math.sqrt(Math.pow(c.positionDelta.x, 2) + Math.pow(c.positionDelta.y, 2))
    ));

    if (maxCorrection <= this.rollbackOptions.imperceptibilityThreshold) {
      // Imperceptible correction - apply immediately
      this.renderingState.interpolated = authoritativeState;
      this.renderingState.rollbackActive = false;
      return;
    }

    // Start smooth rollback correction
    this.startRollbackCorrection(corrections, authoritativeState);
  }

  /**
   * Start smooth rollback correction
   */
  private startRollbackCorrection(corrections: any[], targetState: AuthoritativeGameState): void {
    this.renderingState.rollbackActive = true;
    this.rollbackStartTime = performance.now();

    // Store start and target positions for smooth correction
    corrections.forEach(correction => {
      const startPos = this.getEntityPosition(correction.entityId, this.renderingState.interpolated);
      const targetPos = this.getEntityPosition(correction.entityId, targetState);

      if (startPos && targetPos) {
        this.rollbackStartPositions.set(correction.entityId, startPos);
        this.rollbackTargetPositions.set(correction.entityId, targetPos);
      }
    });

    // Replay inputs after rollback
    this.replayInputsAfterRollback(targetState);
  }

  /**
   * Update rollback visual correction
   */
  private updateRollbackCorrection(currentTime: number): void {
    const elapsed = currentTime - this.rollbackStartTime;
    const progress = Math.min(1, elapsed / this.rollbackOptions.smoothingDuration);

    if (progress >= 1) {
      // Rollback correction complete
      this.renderingState.rollbackActive = false;
      this.rollbackStartPositions.clear();
      this.rollbackTargetPositions.clear();
      return;
    }

    // Apply easing function
    const easedProgress = this.applyEasing(progress, this.rollbackOptions.easingFunction);

    // Interpolate positions
    const correctedState = this.createCorrectedState(easedProgress);
    this.renderingState.interpolated = correctedState;
  }

  /**
   * Start smooth interpolation between states
   */
  private startInterpolation(fromState: any, toState: any): void {
    if (!fromState || !toState) {
      this.renderingState.interpolated = toState;
      return;
    }

    this.interpolationStartTime = performance.now();
    this.interpolationStartState = fromState;
    this.interpolationTargetState = toState;
  }

  /**
   * Update interpolation state
   */
  private updateInterpolation(currentTime: number): void {
    const startTime = performance.now();

    const elapsed = currentTime - this.interpolationStartTime;
    const progress = Math.min(1, elapsed / this.interpolationOptions.duration);

    if (progress >= 1) {
      this.renderingState.interpolated = this.interpolationTargetState;
      this.interpolationStartState = null;
      this.interpolationTargetState = null;
      return;
    }

    // Perform interpolation based on method
    this.renderingState.interpolated = this.interpolateStates(
      this.interpolationStartState,
      this.interpolationTargetState,
      progress
    );

    this.interpolationFrameTime = performance.now() - startTime;
  }

  /**
   * Interpolate between two game states
   */
  private interpolateStates(fromState: any, toState: any, progress: number): any {
    const result = JSON.parse(JSON.stringify(toState)); // Deep copy

    // Interpolate player positions
    if (fromState.players && toState.players) {
      result.players = toState.players.map((toPlayer: any) => {
        const fromPlayer = fromState.players.find((p: any) => p.id === toPlayer.id);
        if (!fromPlayer) return toPlayer;

        return {
          ...toPlayer,
          position: this.interpolatePosition(fromPlayer.position, toPlayer.position, progress)
        };
      });
    }

    // Interpolate entity positions
    if (fromState.strategy?.mouses && toState.strategy?.mouses) {
      result.strategy.mouses = toState.strategy.mouses.map((toMouse: any) => {
        const fromMouse = fromState.strategy.mouses.find((m: any) => m.id === toMouse.id);
        if (!fromMouse) return toMouse;

        const interpolatedPosition = this.interpolatePosition(fromMouse.position, toMouse.position, progress);

        // Add velocity prediction if enabled
        if (this.interpolationOptions.velocityPrediction) {
          const velocity = this.calculateVelocity(fromMouse.position, toMouse.position);
          return {
            ...toMouse,
            position: this.extrapolatePosition(interpolatedPosition, velocity, progress)
          };
        }

        return { ...toMouse, position: interpolatedPosition };
      });
    }

    // Similar interpolation for cats
    if (fromState.strategy?.cats && toState.strategy?.cats) {
      result.strategy.cats = toState.strategy.cats.map((toCat: any) => {
        const fromCat = fromState.strategy.cats.find((c: any) => c.id === toCat.id);
        if (!fromCat) return toCat;

        return {
          ...toCat,
          position: this.interpolatePosition(fromCat.position, toCat.position, progress)
        };
      });
    }

    return result;
  }

  /**
   * Interpolate position between two points
   */
  private interpolatePosition(from: number[], to: number[], progress: number): number[] {
    switch (this.interpolationOptions.method) {
      case 'linear':
        return [
          from[0] + (to[0] - from[0]) * progress,
          from[1] + (to[1] - from[1]) * progress
        ];
      case 'smooth':
        const smoothProgress = this.smoothStep(progress);
        return [
          from[0] + (to[0] - from[0]) * smoothProgress,
          from[1] + (to[1] - from[1]) * smoothProgress
        ];
      case 'cubic':
        const cubicProgress = progress * progress * (3 - 2 * progress);
        return [
          from[0] + (to[0] - from[0]) * cubicProgress,
          from[1] + (to[1] - from[1]) * cubicProgress
        ];
      default:
        return to;
    }
  }

  /**
   * Apply immediate visual feedback for local input
   */
  private applyImmediateFeedback(input: PlayerInput, predictedState: PredictiveGameState): void {
    // Update the current interpolated state with immediate feedback
    if (this.renderingState.interpolated) {
      // Find the player and update their predicted position
      const player = this.renderingState.interpolated.players?.find((p: any) => p.id === input.playerId);
      if (player && predictedState.predictedEntities.has(input.playerId)) {
        const prediction = predictedState.predictedEntities.get(input.playerId);
        if (prediction) {
          player.position = prediction.position;
        }
      }
    }
  }

  /**
   * Render prediction confidence indicator
   */
  private renderPredictionConfidence(): void {
    // This would render a confidence indicator on the UI layer
    // For now, we'll just log it in development mode
    if (this.renderingState.predictionConfidence < 0.8) {
      console.debug(`Low prediction confidence: ${this.renderingState.predictionConfidence.toFixed(2)}`);
    }
  }

  /**
   * Render predictive elements on the predictive layer
   */
  private renderPredictiveElements(state: any): void {
    // This method would be called by GameDisplay's renderPredictiveLayer
    // Add visual indicators for predictions, rollbacks, etc.
  }

  /**
   * Helper methods
   */
  private isInterpolating(): boolean {
    return this.interpolationStartState !== null && this.interpolationTargetState !== null;
  }

  private smoothStep(t: number): number {
    return t * t * (3 - 2 * t);
  }

  private applyEasing(t: number, easingFunction: string): number {
    switch (easingFunction) {
      case 'easeOut':
        return 1 - Math.pow(1 - t, 2);
      case 'easeInOut':
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      default:
        return t;
    }
  }

  private calculateVelocity(from: number[], to: number[]): { x: number; y: number } {
    return {
      x: to[0] - from[0],
      y: to[1] - from[1]
    };
  }

  private extrapolatePosition(position: number[], velocity: { x: number; y: number }, factor: number): number[] {
    return [
      position[0] + velocity.x * factor * 0.1, // Small extrapolation
      position[1] + velocity.y * factor * 0.1
    ];
  }

  private getEntityPosition(entityId: string, state: any): { x: number; y: number } | null {
    // Find entity position in state
    const player = state?.players?.find((p: any) => p.id === entityId);
    if (player) {
      return { x: player.position[0], y: player.position[1] };
    }

    const mouse = state?.strategy?.mouses?.find((m: any) => m.id === entityId);
    if (mouse) {
      return { x: mouse.position[0], y: mouse.position[1] };
    }

    const cat = state?.strategy?.cats?.find((c: any) => c.id === entityId);
    if (cat) {
      return { x: cat.position[0], y: cat.position[1] };
    }

    return null;
  }

  private createCorrectedState(progress: number): any {
    const state = JSON.parse(JSON.stringify(this.renderingState.authoritative));

    // Apply position corrections
    this.rollbackStartPositions.forEach((startPos, entityId) => {
      const targetPos = this.rollbackTargetPositions.get(entityId);
      if (targetPos) {
        const correctedPos = {
          x: startPos.x + (targetPos.x - startPos.x) * progress,
          y: startPos.y + (targetPos.y - startPos.y) * progress
        };

        // Update entity position in state
        this.updateEntityPosition(state, entityId, correctedPos);
      }
    });

    return state;
  }

  private updateEntityPosition(state: any, entityId: string, position: { x: number; y: number }): void {
    // Update player position
    const player = state?.players?.find((p: any) => p.id === entityId);
    if (player) {
      player.position = [position.x, position.y];
      return;
    }

    // Update mouse position
    const mouse = state?.strategy?.mouses?.find((m: any) => m.id === entityId);
    if (mouse) {
      mouse.position = [position.x, position.y];
      return;
    }

    // Update cat position
    const cat = state?.strategy?.cats?.find((c: any) => c.id === entityId);
    if (cat) {
      cat.position = [position.x, position.y];
    }
  }

  private replayInputsAfterRollback(authoritativeState: AuthoritativeGameState): void {
    // Re-predict from remaining pending inputs
    if (this.pendingInputs.length > 0) {
      const newPrediction = this.predictionEngine.predictFromInputs(
        this.pendingInputs,
        authoritativeState
      );
      this.renderingState.predicted = newPrediction;
    }
  }

  private cleanupPendingInputs(): void {
    // Remove inputs that are older than 1 second
    const cutoffTime = Date.now() - 1000;
    this.pendingInputs = this.pendingInputs.filter(input => input.timestamp > cutoffTime);
  }

  private createDefaultState(): AuthoritativeGameState {
    return {
      sequence: 0,
      timestamp: Date.now(),
      phase: 'WAITING',
      players: [],
      entities: [],
      arrows: [],
      gameTime: 0,
      validationRules: {
        timestampMonotonic: true,
        sequenceIncrement: true,
        maxTimeDelta: 5000,
        maxSequenceGap: 10
      }
    };
  }

  /**
   * Get performance statistics
   */
  public getPerformanceStats(): {
    predictionFrameTime: number;
    interpolationFrameTime: number;
    rollbackCorrectionCount: number;
    predictionConfidence: number;
    pendingInputsCount: number;
    rollbackActive: boolean;
  } {
    return {
      predictionFrameTime: this.predictionFrameTime,
      interpolationFrameTime: this.interpolationFrameTime,
      rollbackCorrectionCount: this.rollbackCorrectionCount,
      predictionConfidence: this.renderingState.predictionConfidence,
      pendingInputsCount: this.pendingInputs.length,
      rollbackActive: this.renderingState.rollbackActive
    };
  }

  /**
   * Update configuration options
   */
  public updateInterpolationOptions(options: Partial<InterpolationOptions>): void {
    this.interpolationOptions = { ...this.interpolationOptions, ...options };
  }

  public updateRollbackOptions(options: Partial<RollbackVisualOptions>): void {
    this.rollbackOptions = { ...this.rollbackOptions, ...options };
  }

  /**
   * Reset prediction state
   */
  public reset(): void {
    this.renderingState = {
      authoritative: null,
      predicted: null,
      interpolated: null,
      rollbackActive: false,
      predictionConfidence: 1.0
    };

    this.pendingInputs = [];
    this.rollbackStartPositions.clear();
    this.rollbackTargetPositions.clear();
    this.rollbackCorrectionCount = 0;
  }
}