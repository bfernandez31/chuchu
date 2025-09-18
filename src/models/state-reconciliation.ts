/**
 * T021: StateReconciliation Model
 *
 * Rollback correction structure with severity classification,
 * smoothing duration calculation, and input replay management.
 */

import { PlayerInput } from './player-input';
import { Position } from './authoritative-game-state';

export enum CorrectionSeverity {
  MINOR = 'MINOR',     // <1 pixel difference
  MODERATE = 'MODERATE', // 1-5 pixel difference
  MAJOR = 'MAJOR'      // >5 pixel difference
}

export enum CorrectionType {
  POSITION = 'POSITION',
  VELOCITY = 'VELOCITY',
  STATE = 'STATE',
  CREATION = 'CREATION',
  DELETION = 'DELETION'
}

export interface EntityCorrection {
  entityId: string;
  type: CorrectionType;
  previousValue: any;
  correctedValue: any;
  confidence: number; // 0.0-1.0
}

export interface PlayerCorrection {
  playerId: string;
  previousScore: number;
  correctedScore: number;
  previousArrowCount: number;
  correctedArrowCount: number;
}

export interface VisualSmoothingConfig {
  duration: number; // 16-50ms as per spec
  easingFunction: string; // 'linear', 'ease-out', 'ease-in-out'
  enabled: boolean;
}

export interface InputReplay {
  startFromSequence: number;
  inputsToReplay: PlayerInput[];
  replayTimestamp: number;
  completed: boolean;
}

export interface RollbackMetrics {
  correctionCount: number;
  averageCorrectionTime: number;
  totalRollbackDistance: number; // How far back we rolled
  performanceImpact: number; // ms of additional processing
}

export interface StateReconciliation {
  // Core identification
  id: string;
  timestamp: number;
  gameStateSequence: number;

  // Correction details
  severity: CorrectionSeverity;
  entityCorrections: EntityCorrection[];
  playerCorrections: PlayerCorrection[];

  // Smoothing configuration
  smoothingConfig: VisualSmoothingConfig;

  // Input management
  inputReplay: InputReplay;
  causedByInput?: string; // Input ID that caused the divergence

  // Performance tracking
  metrics: RollbackMetrics;

  // Validation and processing
  isValid(): boolean;
  calculateSmoothingDuration(): number;
  requiresInputReplay(): boolean;

  // Input replay management
  setupInputReplay(startSequence: number, inputs: PlayerInput[]): void;
  completeInputReplay(): void;

  // Correction management
  addEntityCorrection(
    entityId: string,
    type: CorrectionType,
    previousValue: any,
    correctedValue: any,
    confidence?: number
  ): void;
  addPlayerCorrection(
    playerId: string,
    previousScore: number,
    correctedScore: number,
    previousArrowCount: number,
    correctedArrowCount: number
  ): void;
}

export class StateReconciliationImpl implements StateReconciliation {
  public id: string;
  public timestamp: number;
  public gameStateSequence: number;
  public severity: CorrectionSeverity;
  public entityCorrections: EntityCorrection[];
  public playerCorrections: PlayerCorrection[];
  public smoothingConfig: VisualSmoothingConfig;
  public inputReplay: InputReplay;
  public causedByInput?: string;
  public metrics: RollbackMetrics;

  constructor(data: Partial<StateReconciliation> & { gameStateSequence: number }) {
    this.id = data.id || this.generateReconciliationId();
    this.timestamp = data.timestamp || Date.now();
    this.gameStateSequence = data.gameStateSequence;
    this.entityCorrections = data.entityCorrections || [];
    this.playerCorrections = data.playerCorrections || [];
    this.causedByInput = data.causedByInput;

    // Calculate severity based on corrections
    this.severity = data.severity || this.calculateSeverity();

    // Configure smoothing based on severity
    this.smoothingConfig = data.smoothingConfig || this.createSmoothingConfig();

    // Initialize input replay
    this.inputReplay = data.inputReplay || {
      startFromSequence: 0,
      inputsToReplay: [],
      replayTimestamp: 0,
      completed: false
    };

    // Initialize metrics
    this.metrics = data.metrics || {
      correctionCount: this.entityCorrections.length + this.playerCorrections.length,
      averageCorrectionTime: 0,
      totalRollbackDistance: 0,
      performanceImpact: 0
    };
  }

  /**
   * Validate reconciliation data and constraints
   */
  public isValid(): boolean {
    try {
      // Basic validation
      if (!this.id || this.timestamp <= 0 || this.gameStateSequence < 0) return false;

      // Severity validation
      if (!Object.values(CorrectionSeverity).includes(this.severity)) return false;

      // Smoothing duration validation (16-50ms as per spec)
      const duration = this.smoothingConfig.duration;
      if (duration < 16 || duration > 50) return false;

      // Entity corrections validation
      for (const correction of this.entityCorrections) {
        if (!this.isValidEntityCorrection(correction)) return false;
      }

      // Player corrections validation
      for (const correction of this.playerCorrections) {
        if (!this.isValidPlayerCorrection(correction)) return false;
      }

      // Input replay validation
      if (!this.isValidInputReplay()) return false;

      return true;
    } catch (error) {
      console.error('Reconciliation validation error:', error);
      return false;
    }
  }

  /**
   * Calculate optimal smoothing duration based on severity and corrections
   */
  public calculateSmoothingDuration(): number {
    const baseDuration = 16; // Minimum 16ms (1 frame at 60fps)
    const maxDuration = 50;  // Maximum 50ms as per spec

    let duration = baseDuration;

    // Adjust based on severity
    switch (this.severity) {
      case CorrectionSeverity.MINOR:
        duration = 16; // Single frame for minor corrections
        break;
      case CorrectionSeverity.MODERATE:
        duration = 33; // ~2 frames for moderate corrections
        break;
      case CorrectionSeverity.MAJOR:
        duration = 50; // Maximum smoothing for major corrections
        break;
    }

    // Adjust based on correction count
    const correctionCount = this.entityCorrections.length + this.playerCorrections.length;
    if (correctionCount > 5) {
      duration = Math.min(maxDuration, duration + 10);
    }

    // Adjust based on position difference for position corrections
    const maxPositionDiff = this.getMaxPositionDifference();
    if (maxPositionDiff > 3) {
      duration = Math.min(maxDuration, duration + Math.floor(maxPositionDiff * 2));
    }

    return Math.max(baseDuration, Math.min(maxDuration, duration));
  }

  /**
   * Check if input replay is required
   */
  public requiresInputReplay(): boolean {
    // Input replay is required for MAJOR corrections or when specific conditions are met
    return this.severity === CorrectionSeverity.MAJOR ||
           this.entityCorrections.some(c => c.type === CorrectionType.CREATION || c.type === CorrectionType.DELETION) ||
           this.playerCorrections.length > 0;
  }

  /**
   * Add entity correction
   */
  public addEntityCorrection(
    entityId: string,
    type: CorrectionType,
    previousValue: any,
    correctedValue: any,
    confidence: number = 1.0
  ): void {
    const correction: EntityCorrection = {
      entityId,
      type,
      previousValue,
      correctedValue,
      confidence: Math.max(0.0, Math.min(1.0, confidence))
    };

    this.entityCorrections.push(correction);
    this.updateSeverity();
    this.updateSmoothingConfig();
    this.updateMetrics();
  }

  /**
   * Add player correction
   */
  public addPlayerCorrection(
    playerId: string,
    previousScore: number,
    correctedScore: number,
    previousArrowCount: number,
    correctedArrowCount: number
  ): void {
    const correction: PlayerCorrection = {
      playerId,
      previousScore,
      correctedScore,
      previousArrowCount,
      correctedArrowCount
    };

    this.playerCorrections.push(correction);
    this.updateSeverity();
    this.updateSmoothingConfig();
    this.updateMetrics();
  }

  /**
   * Setup input replay from specific sequence
   */
  public setupInputReplay(startSequence: number, inputs: PlayerInput[]): void {
    this.inputReplay = {
      startFromSequence: startSequence,
      inputsToReplay: [...inputs],
      replayTimestamp: Date.now(),
      completed: false
    };
  }

  /**
   * Mark input replay as completed
   */
  public completeInputReplay(): void {
    this.inputReplay.completed = true;
    this.updateMetrics();
  }

  /**
   * Get visual smoothing parameters for specific entity
   */
  public getSmoothingParameters(entityId: string): VisualSmoothingConfig | null {
    const hasEntityCorrection = this.entityCorrections.some(c => c.entityId === entityId);
    if (!hasEntityCorrection) return null;

    return { ...this.smoothingConfig };
  }

  /**
   * Calculate performance impact of this reconciliation
   */
  public calculatePerformanceImpact(): number {
    const baseImpact = 5; // Base 5ms overhead
    const correctionImpact = (this.entityCorrections.length + this.playerCorrections.length) * 2;
    const replayImpact = this.inputReplay.inputsToReplay.length * 1;
    const smoothingImpact = this.smoothingConfig.enabled ? 3 : 0;

    return baseImpact + correctionImpact + replayImpact + smoothingImpact;
  }

  // Private methods

  private calculateSeverity(): CorrectionSeverity {
    let maxPositionDiff = 0;
    let hasStateChanges = false;
    let hasCreationDeletion = false;

    for (const correction of this.entityCorrections) {
      if (correction.type === CorrectionType.POSITION) {
        const diff = this.calculatePositionDifference(correction.previousValue, correction.correctedValue);
        maxPositionDiff = Math.max(maxPositionDiff, diff);
      } else if (correction.type === CorrectionType.STATE) {
        hasStateChanges = true;
      } else if (correction.type === CorrectionType.CREATION || correction.type === CorrectionType.DELETION) {
        hasCreationDeletion = true;
      }
    }

    // Player corrections are always significant
    if (this.playerCorrections.length > 0) {
      return CorrectionSeverity.MAJOR;
    }

    // Entity creation/deletion is major
    if (hasCreationDeletion) {
      return CorrectionSeverity.MAJOR;
    }

    // State changes are moderate
    if (hasStateChanges) {
      return CorrectionSeverity.MODERATE;
    }

    // Position-based severity
    if (maxPositionDiff > 5) {
      return CorrectionSeverity.MAJOR;
    } else if (maxPositionDiff > 1) {
      return CorrectionSeverity.MODERATE;
    } else {
      return CorrectionSeverity.MINOR;
    }
  }

  private createSmoothingConfig(): VisualSmoothingConfig {
    const duration = this.calculateSmoothingDuration();

    let easingFunction = 'ease-out'; // Default
    switch (this.severity) {
      case CorrectionSeverity.MINOR:
        easingFunction = 'linear';
        break;
      case CorrectionSeverity.MODERATE:
        easingFunction = 'ease-out';
        break;
      case CorrectionSeverity.MAJOR:
        easingFunction = 'ease-in-out';
        break;
    }

    return {
      duration,
      easingFunction,
      enabled: true
    };
  }

  private isValidEntityCorrection(correction: EntityCorrection): boolean {
    return correction.entityId.length > 0 &&
           Object.values(CorrectionType).includes(correction.type) &&
           correction.confidence >= 0.0 && correction.confidence <= 1.0 &&
           correction.previousValue !== undefined &&
           correction.correctedValue !== undefined;
  }

  private isValidPlayerCorrection(correction: PlayerCorrection): boolean {
    return correction.playerId.length > 0 &&
           correction.previousScore >= 0 &&
           correction.correctedScore >= 0 &&
           correction.previousArrowCount >= 0 &&
           correction.correctedArrowCount >= 0;
  }

  private isValidInputReplay(): boolean {
    return this.inputReplay.startFromSequence >= 0 &&
           Array.isArray(this.inputReplay.inputsToReplay) &&
           this.inputReplay.replayTimestamp >= 0;
  }

  private calculatePositionDifference(pos1: Position, pos2: Position): number {
    if (!pos1 || !pos2) return 0;
    return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
  }

  private getMaxPositionDifference(): number {
    let maxDiff = 0;

    for (const correction of this.entityCorrections) {
      if (correction.type === CorrectionType.POSITION) {
        const diff = this.calculatePositionDifference(correction.previousValue, correction.correctedValue);
        maxDiff = Math.max(maxDiff, diff);
      }
    }

    return maxDiff;
  }

  private updateSeverity(): void {
    this.severity = this.calculateSeverity();
  }

  private updateSmoothingConfig(): void {
    this.smoothingConfig = this.createSmoothingConfig();
  }

  private updateMetrics(): void {
    this.metrics.correctionCount = this.entityCorrections.length + this.playerCorrections.length;
    this.metrics.performanceImpact = this.calculatePerformanceImpact();
  }

  private generateReconciliationId(): string {
    return `reconcile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Reconciliation manager for handling multiple corrections
 */
export class ReconciliationManager {
  private activeReconciliations: Map<string, StateReconciliation> = new Map();
  private reconciliationHistory: StateReconciliation[] = [];
  private readonly maxHistorySize = 100;

  /**
   * Create new reconciliation
   */
  public createReconciliation(gameStateSequence: number, causedByInput?: string): StateReconciliation {
    const reconciliation = new StateReconciliationImpl({
      gameStateSequence,
      causedByInput
    });

    this.activeReconciliations.set(reconciliation.id, reconciliation);
    return reconciliation;
  }

  /**
   * Complete reconciliation and move to history
   */
  public completeReconciliation(reconciliationId: string): boolean {
    const reconciliation = this.activeReconciliations.get(reconciliationId);
    if (!reconciliation) return false;

    // Mark input replay as completed if it was started
    if (reconciliation.requiresInputReplay() && !reconciliation.inputReplay.completed) {
      reconciliation.completeInputReplay();
    }

    // Move to history
    this.addToHistory(reconciliation);
    this.activeReconciliations.delete(reconciliationId);

    return true;
  }

  /**
   * Get active reconciliation by ID
   */
  public getReconciliation(reconciliationId: string): StateReconciliation | null {
    return this.activeReconciliations.get(reconciliationId) || null;
  }

  /**
   * Get all active reconciliations
   */
  public getActiveReconciliations(): StateReconciliation[] {
    return Array.from(this.activeReconciliations.values());
  }

  /**
   * Get reconciliation statistics
   */
  public getStatistics(): {
    activeCount: number;
    totalProcessed: number;
    averageSmoothingDuration: number;
    severityDistribution: Record<CorrectionSeverity, number>;
  } {
    const allReconciliations = [...Array.from(this.activeReconciliations.values()), ...this.reconciliationHistory];

    const severityDistribution = {
      [CorrectionSeverity.MINOR]: 0,
      [CorrectionSeverity.MODERATE]: 0,
      [CorrectionSeverity.MAJOR]: 0
    };

    let totalSmoothingDuration = 0;

    for (const reconciliation of allReconciliations) {
      severityDistribution[reconciliation.severity]++;
      totalSmoothingDuration += reconciliation.smoothingConfig.duration;
    }

    return {
      activeCount: this.activeReconciliations.size,
      totalProcessed: allReconciliations.length,
      averageSmoothingDuration: allReconciliations.length > 0 ? totalSmoothingDuration / allReconciliations.length : 0,
      severityDistribution
    };
  }

  /**
   * Cleanup old reconciliations
   */
  public cleanup(): void {
    const cutoffTime = Date.now() - 300000; // 5 minutes

    // Remove old active reconciliations (they should be completed by now)
    for (const [id, reconciliation] of Array.from(this.activeReconciliations)) {
      if (reconciliation.timestamp < cutoffTime) {
        this.addToHistory(reconciliation);
        this.activeReconciliations.delete(id);
      }
    }

    // Maintain history size
    if (this.reconciliationHistory.length > this.maxHistorySize) {
      this.reconciliationHistory = this.reconciliationHistory.slice(-this.maxHistorySize);
    }
  }

  private addToHistory(reconciliation: StateReconciliation): void {
    this.reconciliationHistory.push(reconciliation);

    // Maintain history size
    if (this.reconciliationHistory.length > this.maxHistorySize) {
      this.reconciliationHistory.shift();
    }
  }
}

/**
 * Factory for creating StateReconciliation instances
 */
export class StateReconciliationFactory {
  static create(gameStateSequence: number, causedByInput?: string): StateReconciliation {
    return new StateReconciliationImpl({
      gameStateSequence,
      causedByInput
    });
  }

  static createWithCorrections(
    gameStateSequence: number,
    entityCorrections: EntityCorrection[],
    playerCorrections: PlayerCorrection[] = []
  ): StateReconciliation {
    return new StateReconciliationImpl({
      gameStateSequence,
      entityCorrections,
      playerCorrections
    });
  }

  static createMinorCorrection(
    gameStateSequence: number,
    entityId: string,
    previousPosition: Position,
    correctedPosition: Position
  ): StateReconciliation {
    const reconciliation = new StateReconciliationImpl({ gameStateSequence });

    reconciliation.addEntityCorrection(
      entityId,
      CorrectionType.POSITION,
      previousPosition,
      correctedPosition,
      0.95
    );

    return reconciliation;
  }
}