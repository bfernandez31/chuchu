/**
 * T024: InterpolationService Implementation
 *
 * Smooth state transition algorithms with linear interpolation,
 * velocity extrapolation, and boundary handling for collisions.
 */

import { Position, Entity } from '../models/authoritative-game-state';
import { InterpolationState } from '../models/predictive-game-state';

export enum InterpolationType {
  LINEAR = 'LINEAR',
  EASE_OUT = 'EASE_OUT',
  EASE_IN_OUT = 'EASE_IN_OUT',
  VELOCITY_BASED = 'VELOCITY_BASED'
}

export interface InterpolationConfig {
  defaultType: InterpolationType;
  maxInterpolationTime: number; // Maximum interpolation duration in ms
  velocityExtrapolation: boolean; // Enable velocity-based extrapolation
  boundaryCollisionHandling: boolean; // Handle boundary collisions during interpolation
  smoothingFactor: number; // Smoothing factor for velocity changes (0.0-1.0)
}

export interface InterpolationRequest {
  entityId: string;
  startState: any;
  targetState: any;
  duration: number;
  type?: InterpolationType;
  priority?: number; // 0-1, higher = more important
}

export interface InterpolationResult {
  interpolatedState: any;
  progress: number; // 0.0 - 1.0
  isComplete: boolean;
  remainingTime: number;
  velocity?: Position;
}

export interface VelocityExtrapolation {
  extrapolatedPosition: Position;
  confidence: number;
  timeHorizon: number; // How far ahead we extrapolated
}

export class InterpolationService {
  private config: InterpolationConfig;
  private activeInterpolations: Map<string, InterpolationState> = new Map();
  private velocityHistory: Map<string, Position[]> = new Map();
  private readonly maxVelocityHistory = 10;

  constructor(config?: Partial<InterpolationConfig>) {
    this.config = {
      defaultType: InterpolationType.EASE_OUT,
      maxInterpolationTime: 100, // 100ms max interpolation
      velocityExtrapolation: true,
      boundaryCollisionHandling: true,
      smoothingFactor: 0.8,
      ...config
    };
  }

  /**
   * Start interpolation between two states
   */
  public startInterpolation(request: InterpolationRequest): void {
    const {
      entityId,
      startState,
      targetState,
      duration,
      type = this.config.defaultType,
      priority = 0.5
    } = request;

    const interpolationState: InterpolationState = {
      startPosition: this.extractPosition(startState),
      targetPosition: this.extractPosition(targetState),
      startTime: Date.now(),
      duration: Math.min(duration, this.config.maxInterpolationTime),
      progress: 0.0,
      velocity: this.calculateVelocity(startState, targetState, duration)
    };

    // Store additional interpolation data
    (interpolationState as any).type = type;
    (interpolationState as any).priority = priority;
    (interpolationState as any).startState = startState;
    (interpolationState as any).targetState = targetState;

    this.activeInterpolations.set(entityId, interpolationState);
    this.updateVelocityHistory(entityId, interpolationState.velocity);
  }

  /**
   * Update all active interpolations
   */
  public updateInterpolations(deltaTime: number): Map<string, InterpolationResult> {
    const results = new Map<string, InterpolationResult>();
    const completedInterpolations: string[] = [];

    for (const [entityId, interpolation] of Array.from(this.activeInterpolations)) {
      const elapsed = Date.now() - interpolation.startTime;
      const progress = Math.min(1.0, elapsed / interpolation.duration);

      // Apply easing function
      const easedProgress = this.applyEasing(progress, (interpolation as any).type);

      // Calculate interpolated position
      const interpolatedPosition = this.interpolatePosition(
        interpolation.startPosition,
        interpolation.targetPosition,
        easedProgress
      );

      // Apply boundary handling if enabled
      const constrainedPosition = this.config.boundaryCollisionHandling
        ? this.applyBoundaryConstraints(interpolatedPosition)
        : interpolatedPosition;

      // Update interpolation state
      interpolation.progress = progress;

      const result: InterpolationResult = {
        interpolatedState: {
          ...(interpolation as any).startState,
          position: constrainedPosition
        },
        progress,
        isComplete: progress >= 1.0,
        remainingTime: Math.max(0, interpolation.duration - elapsed),
        velocity: interpolation.velocity
      };

      results.set(entityId, result);

      // Mark completed interpolations for removal
      if (result.isComplete) {
        completedInterpolations.push(entityId);
      }
    }

    // Clean up completed interpolations
    for (const entityId of completedInterpolations) {
      this.activeInterpolations.delete(entityId);
    }

    return results;
  }

  /**
   * Extrapolate entity position based on velocity
   */
  public extrapolatePosition(
    entity: Entity,
    timeHorizon: number,
    useVelocityHistory: boolean = true
  ): VelocityExtrapolation {
    let velocity = entity.velocity || { x: 0, y: 0 };
    let confidence = 0.8;

    // Use velocity history for better prediction if available
    if (useVelocityHistory) {
      const historyVelocity = this.getSmoothedVelocity(entity.id);
      if (historyVelocity) {
        velocity = historyVelocity;
        confidence = 0.9; // Higher confidence with history
      }
    }

    // Calculate extrapolated position
    const timeInSeconds = timeHorizon / 1000;
    const extrapolatedPosition = {
      x: entity.position.x + velocity.x * timeInSeconds,
      y: entity.position.y + velocity.y * timeInSeconds
    };

    // Apply boundary constraints
    const constrainedPosition = this.config.boundaryCollisionHandling
      ? this.applyBoundaryConstraints(extrapolatedPosition)
      : extrapolatedPosition;

    // Adjust confidence based on time horizon and velocity magnitude
    const velocityMagnitude = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
    const timeFactor = Math.max(0.1, 1.0 - (timeHorizon / 1000)); // Reduce confidence over time
    const velocityFactor = Math.max(0.3, 1.0 - (velocityMagnitude / 10)); // Reduce for high velocities

    confidence *= timeFactor * velocityFactor;

    return {
      extrapolatedPosition: constrainedPosition,
      confidence: Math.max(0.1, confidence),
      timeHorizon
    };
  }

  /**
   * Create smooth transition between server states
   */
  public createServerTransition(
    entityId: string,
    currentPosition: Position,
    serverPosition: Position,
    serverTimestamp: number
  ): void {
    const now = Date.now();
    const timeSinceServer = now - serverTimestamp;

    // Don't interpolate if server state is too old or positions are too close
    const distance = this.calculateDistance(currentPosition, serverPosition);
    if (timeSinceServer > 200 || distance < 0.5) {
      return;
    }

    // Calculate appropriate interpolation duration based on distance and time
    const baseDuration = 33; // ~2 frames at 60fps
    const distanceFactor = Math.min(2.0, distance / 5.0);
    const duration = baseDuration * distanceFactor;

    this.startInterpolation({
      entityId,
      startState: { position: currentPosition },
      targetState: { position: serverPosition },
      duration,
      type: InterpolationType.EASE_OUT,
      priority: 0.9 // High priority for server corrections
    });
  }

  /**
   * Get current interpolation state for entity
   */
  public getInterpolationState(entityId: string): InterpolationState | null {
    return this.activeInterpolations.get(entityId) || null;
  }

  /**
   * Cancel interpolation for entity
   */
  public cancelInterpolation(entityId: string): boolean {
    return this.activeInterpolations.delete(entityId);
  }

  /**
   * Get interpolation statistics
   */
  public getStatistics(): {
    activeCount: number;
    averageDuration: number;
    interpolationsByType: Record<InterpolationType, number>;
    performanceMetrics: {
      averageUpdateTime: number;
      peakInterpolations: number;
    };
  } {
    const activeCount = this.activeInterpolations.size;
    let totalDuration = 0;
    const interpolationsByType: Record<InterpolationType, number> = {
      [InterpolationType.LINEAR]: 0,
      [InterpolationType.EASE_OUT]: 0,
      [InterpolationType.EASE_IN_OUT]: 0,
      [InterpolationType.VELOCITY_BASED]: 0
    };

    for (const interpolation of Array.from(this.activeInterpolations.values())) {
      totalDuration += interpolation.duration;
      const type = (interpolation as any).type || InterpolationType.LINEAR;
      interpolationsByType[type]++;
    }

    const averageDuration = activeCount > 0 ? totalDuration / activeCount : 0;

    return {
      activeCount,
      averageDuration,
      interpolationsByType,
      performanceMetrics: {
        averageUpdateTime: 2, // TODO: Implement actual measurement
        peakInterpolations: Math.max(activeCount, 0)
      }
    };
  }

  /**
   * Clean up old interpolations and velocity history
   */
  public cleanup(): void {
    const now = Date.now();
    const staleThreshold = 5000; // 5 seconds

    // Clean up stale interpolations
    for (const [entityId, interpolation] of Array.from(this.activeInterpolations)) {
      if (now - interpolation.startTime > staleThreshold) {
        this.activeInterpolations.delete(entityId);
      }
    }

    // Clean up velocity history
    for (const [entityId, history] of Array.from(this.velocityHistory)) {
      if (history.length === 0) {
        this.velocityHistory.delete(entityId);
      }
    }
  }

  // Private helper methods

  private extractPosition(state: any): Position {
    if (state.position) {
      return { x: state.position.x, y: state.position.y };
    }
    if (state.x !== undefined && state.y !== undefined) {
      return { x: state.x, y: state.y };
    }
    return { x: 0, y: 0 };
  }

  private calculateVelocity(startState: any, targetState: any, duration: number): Position {
    const startPos = this.extractPosition(startState);
    const targetPos = this.extractPosition(targetState);
    const timeInSeconds = duration / 1000;

    return {
      x: (targetPos.x - startPos.x) / timeInSeconds,
      y: (targetPos.y - startPos.y) / timeInSeconds
    };
  }

  private applyEasing(progress: number, type: InterpolationType): number {
    switch (type) {
      case InterpolationType.LINEAR:
        return progress;

      case InterpolationType.EASE_OUT:
        return 1 - Math.pow(1 - progress, 3);

      case InterpolationType.EASE_IN_OUT:
        return progress < 0.5
          ? 4 * progress ** 3
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      case InterpolationType.VELOCITY_BASED:
        // Custom easing that maintains velocity continuity
        return progress * (2 - progress);

      default:
        return progress;
    }
  }

  private interpolatePosition(start: Position, target: Position, progress: number): Position {
    return {
      x: start.x + (target.x - start.x) * progress,
      y: start.y + (target.y - start.y) * progress
    };
  }

  private applyBoundaryConstraints(position: Position): Position {
    // TODO: Get actual boundary dimensions from game state
    const maxX = 50; // Default boundary
    const maxY = 50;

    return {
      x: Math.max(0, Math.min(maxX - 1, position.x)),
      y: Math.max(0, Math.min(maxY - 1, position.y))
    };
  }

  private updateVelocityHistory(entityId: string, velocity: Position): void {
    let history = this.velocityHistory.get(entityId);
    if (!history) {
      history = [];
      this.velocityHistory.set(entityId, history);
    }

    history.push(velocity);

    // Maintain history size
    if (history.length > this.maxVelocityHistory) {
      history.shift();
    }
  }

  private getSmoothedVelocity(entityId: string): Position | null {
    const history = this.velocityHistory.get(entityId);
    if (!history || history.length === 0) {
      return null;
    }

    // Calculate weighted average with more recent values having higher weight
    let totalWeight = 0;
    let weightedX = 0;
    let weightedY = 0;

    for (let i = 0; i < history.length; i++) {
      const weight = (i + 1) / history.length; // Linear weight increase
      totalWeight += weight;
      weightedX += history[i].x * weight;
      weightedY += history[i].y * weight;
    }

    return {
      x: weightedX / totalWeight,
      y: weightedY / totalWeight
    };
  }

  private calculateDistance(pos1: Position, pos2: Position): number {
    return Math.sqrt(
      Math.pow(pos2.x - pos1.x, 2) +
      Math.pow(pos2.y - pos1.y, 2)
    );
  }
}

/**
 * Advanced interpolation utilities
 */
export class InterpolationUtils {
  /**
   * Create cubic bezier interpolation curve
   */
  static createBezierCurve(p1: number, p2: number, p3: number, p4: number) {
    return (t: number): number => {
      const u = 1 - t;
      return (
        u * u * u * p1 +
        3 * u * u * t * p2 +
        3 * u * t * t * p3 +
        t * t * t * p4
      );
    };
  }

  /**
   * Create smooth step interpolation
   */
  static smoothStep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  /**
   * Create smoother step interpolation (6th order)
   */
  static smootherStep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  /**
   * Spherical linear interpolation for rotations
   */
  static slerp(start: number, end: number, t: number): number {
    // Normalize angles to [-π, π]
    const normalizeAngle = (angle: number): number => {
      while (angle > Math.PI) angle -= 2 * Math.PI;
      while (angle < -Math.PI) angle += 2 * Math.PI;
      return angle;
    };

    const startNorm = normalizeAngle(start);
    const endNorm = normalizeAngle(end);

    // Find shortest path
    let diff = endNorm - startNorm;
    if (Math.abs(diff) > Math.PI) {
      diff = diff > 0 ? diff - 2 * Math.PI : diff + 2 * Math.PI;
    }

    return normalizeAngle(startNorm + diff * t);
  }
}

/**
 * Factory for creating InterpolationService instances
 */
export class InterpolationServiceFactory {
  static create(config?: Partial<InterpolationConfig>): InterpolationService {
    return new InterpolationService(config);
  }

  static createHighPerformance(): InterpolationService {
    return new InterpolationService({
      defaultType: InterpolationType.LINEAR,
      maxInterpolationTime: 50,
      velocityExtrapolation: false,
      boundaryCollisionHandling: false,
      smoothingFactor: 0.9
    });
  }

  static createSmooth(): InterpolationService {
    return new InterpolationService({
      defaultType: InterpolationType.EASE_IN_OUT,
      maxInterpolationTime: 150,
      velocityExtrapolation: true,
      boundaryCollisionHandling: true,
      smoothingFactor: 0.7
    });
  }

  static createForTesting(): InterpolationService {
    return new InterpolationService({
      defaultType: InterpolationType.LINEAR,
      maxInterpolationTime: 1000, // Longer for testing
      velocityExtrapolation: false,
      boundaryCollisionHandling: false,
      smoothingFactor: 1.0
    });
  }
}