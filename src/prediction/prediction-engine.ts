/**
 * T023: PredictionEngine Implementation
 *
 * Client-side state prediction algorithms with linear interpolation,
 * velocity prediction, confidence scoring, and input buffer integration.
 */

import { AuthoritativeGameState, Entity, Player, Position } from '../models/authoritative-game-state';
import { PredictiveGameState, PredictionType, ClientMetrics } from '../models/predictive-game-state';
import { PlayerInput, InputType } from '../models/player-input';

export interface PredictionResult {
  predictedState: any;
  confidence: number; // 0.0 - 1.0
  timestamp: number;
  predictionId: string;
}

export interface PredictionConfig {
  maxPredictionTime: number; // Maximum prediction time in ms (default: 200)
  confidenceThreshold: number; // Minimum confidence for predictions (default: 0.7)
  velocitySmoothing: number; // Velocity smoothing factor (default: 0.8)
  collisionPrediction: boolean; // Enable collision prediction (default: true)
  boundaryHandling: boolean; // Enable boundary collision handling (default: true)
}

export interface CollisionPrediction {
  willCollide: boolean;
  collisionTime: number; // ms until collision
  collisionPoint: Position;
  entityIds: string[];
}

export interface VelocityPrediction {
  predicted: Position;
  confidence: number;
  factors: {
    momentum: number;
    acceleration: number;
    external: number; // External forces (walls, goals, etc.)
  };
}

export class PredictionEngine {
  private config: PredictionConfig;
  private predictionHistory: Map<string, PredictionResult[]> = new Map();
  private velocityHistory: Map<string, Position[]> = new Map();
  private readonly maxHistorySize = 50;
  private readonly maxPredictionDistance = 10.0; // Max pixels to predict ahead

  constructor(config?: Partial<PredictionConfig>) {
    this.config = {
      maxPredictionTime: 200,
      confidenceThreshold: 0.7,
      velocitySmoothing: 0.8,
      collisionPrediction: true,
      boundaryHandling: true,
      ...config
    };
  }

  /**
   * Predict future state based on current input and game state
   */
  public predictFromInput(
    input: PlayerInput,
    currentState: AuthoritativeGameState,
    predictiveState: PredictiveGameState
  ): PredictionResult {
    const predictionId = this.generatePredictionId();
    const timestamp = Date.now();

    let predictedState: any;
    let confidence: number;

    switch (input.type) {
      case InputType.ARROW_PLACE:
        const arrowPrediction = this.predictArrowPlacement(input, currentState);
        predictedState = arrowPrediction.state;
        confidence = arrowPrediction.confidence;
        break;

      case InputType.MOVE:
        const movePrediction = this.predictMovement(input, currentState);
        predictedState = movePrediction.state;
        confidence = movePrediction.confidence;
        break;

      case InputType.ACTION:
        const actionPrediction = this.predictAction(input, currentState);
        predictedState = actionPrediction.state;
        confidence = actionPrediction.confidence;
        break;

      default:
        throw new Error(`Unsupported input type: ${input.type}`);
    }

    const result: PredictionResult = {
      predictedState,
      confidence,
      timestamp,
      predictionId
    };

    this.storePredictionResult(input.playerId, result);
    return result;
  }

  /**
   * Predict entity position based on velocity and time
   */
  public predictEntityPosition(
    entity: Entity,
    deltaTime: number,
    gameState: AuthoritativeGameState
  ): VelocityPrediction {
    if (!entity.velocity) {
      return {
        predicted: { ...entity.position },
        confidence: 1.0,
        factors: { momentum: 0, acceleration: 0, external: 0 }
      };
    }

    const velocity = { ...entity.velocity };
    const predicted = { ...entity.position };

    // Apply momentum-based prediction
    const momentumFactor = this.calculateMomentumFactor(entity);
    predicted.x += velocity.x * deltaTime * momentumFactor;
    predicted.y += velocity.y * deltaTime * momentumFactor;

    // Apply boundary constraints
    const boundaryConstraints = this.applyBoundaryConstraints(predicted, gameState);
    predicted.x = boundaryConstraints.x;
    predicted.y = boundaryConstraints.y;

    // Calculate external forces (walls, collisions)
    const externalForces = this.calculateExternalForces(entity, predicted, gameState);
    predicted.x += externalForces.x;
    predicted.y += externalForces.y;

    // Calculate prediction confidence
    const confidence = this.calculatePositionConfidence(entity, deltaTime);

    return {
      predicted,
      confidence,
      factors: {
        momentum: momentumFactor,
        acceleration: 0, // TODO: Implement acceleration prediction
        external: Math.sqrt(externalForces.x ** 2 + externalForces.y ** 2)
      }
    };
  }

  /**
   * Predict collision between entities
   */
  public predictCollision(
    entity1: Entity,
    entity2: Entity,
    timeHorizon: number = 100
  ): CollisionPrediction {
    if (!entity1.velocity || !entity2.velocity) {
      return {
        willCollide: false,
        collisionTime: Infinity,
        collisionPoint: { x: 0, y: 0 },
        entityIds: [entity1.id, entity2.id]
      };
    }

    const relativeVelocity = {
      x: entity1.velocity.x - entity2.velocity.x,
      y: entity1.velocity.y - entity2.velocity.y
    };

    const relativePosition = {
      x: entity1.position.x - entity2.position.x,
      y: entity1.position.y - entity2.position.y
    };

    // Calculate collision time using relative motion
    const a = relativeVelocity.x ** 2 + relativeVelocity.y ** 2;
    const b = 2 * (relativePosition.x * relativeVelocity.x + relativePosition.y * relativeVelocity.y);
    const c = relativePosition.x ** 2 + relativePosition.y ** 2 - 1; // Assuming 1 unit collision radius

    const discriminant = b ** 2 - 4 * a * c;

    if (discriminant < 0 || a === 0) {
      return {
        willCollide: false,
        collisionTime: Infinity,
        collisionPoint: { x: 0, y: 0 },
        entityIds: [entity1.id, entity2.id]
      };
    }

    const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
    const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);

    const collisionTime = Math.min(t1, t2);

    if (collisionTime < 0 || collisionTime > timeHorizon) {
      return {
        willCollide: false,
        collisionTime: Infinity,
        collisionPoint: { x: 0, y: 0 },
        entityIds: [entity1.id, entity2.id]
      };
    }

    const collisionPoint = {
      x: entity1.position.x + entity1.velocity.x * collisionTime,
      y: entity1.position.y + entity1.velocity.y * collisionTime
    };

    return {
      willCollide: true,
      collisionTime,
      collisionPoint,
      entityIds: [entity1.id, entity2.id]
    };
  }

  /**
   * Validate prediction against actual server result
   */
  public validatePrediction(
    predictionId: string,
    actualState: any,
    playerId?: string
  ): { accuracy: number; error: number } {
    let predictionResult: PredictionResult | null = null;

    if (playerId) {
      const history = this.predictionHistory.get(playerId);
      if (history) {
        predictionResult = history.find(p => p.predictionId === predictionId) || null;
      }
    } else {
      // Search all player histories
      for (const history of Array.from(this.predictionHistory.values())) {
        const found = history.find(p => p.predictionId === predictionId);
        if (found) {
          predictionResult = found;
          break;
        }
      }
    }

    if (!predictionResult) {
      return { accuracy: 0, error: Infinity };
    }

    const error = this.calculatePredictionError(predictionResult.predictedState, actualState);
    const accuracy = Math.max(0, 1.0 - (error / this.maxPredictionDistance));

    return { accuracy, error };
  }

  /**
   * Get prediction statistics for performance monitoring
   */
  public getStatistics(): {
    totalPredictions: number;
    averageAccuracy: number;
    predictionsByType: Record<string, number>;
    confidenceDistribution: { low: number; medium: number; high: number };
  } {
    let totalPredictions = 0;
    let totalAccuracy = 0;
    const predictionsByType: Record<string, number> = {};
    const confidenceDistribution = { low: 0, medium: 0, high: 0 };

    for (const history of Array.from(this.predictionHistory.values())) {
      for (const prediction of history) {
        totalPredictions++;

        // Confidence distribution
        if (prediction.confidence < 0.5) confidenceDistribution.low++;
        else if (prediction.confidence < 0.8) confidenceDistribution.medium++;
        else confidenceDistribution.high++;
      }
    }

    const averageAccuracy = totalPredictions > 0 ? totalAccuracy / totalPredictions : 0;

    return {
      totalPredictions,
      averageAccuracy,
      predictionsByType,
      confidenceDistribution
    };
  }

  /**
   * Clean up old predictions
   */
  public cleanup(): void {
    const cutoffTime = Date.now() - 30000; // 30 seconds

    for (const [playerId, history] of Array.from(this.predictionHistory)) {
      const filteredHistory = history.filter(p => p.timestamp > cutoffTime);

      if (filteredHistory.length === 0) {
        this.predictionHistory.delete(playerId);
        this.velocityHistory.delete(playerId);
      } else {
        this.predictionHistory.set(playerId, filteredHistory);
      }
    }
  }

  // Private prediction methods

  private predictArrowPlacement(
    input: PlayerInput,
    gameState: AuthoritativeGameState
  ): { state: any; confidence: number } {
    if (!input.data.position || !input.data.direction) {
      throw new Error('Arrow placement input missing position or direction');
    }

    const position = input.data.position;
    const direction = input.data.direction;

    // Check if position is valid
    if (!this.isValidPosition(position, gameState)) {
      return {
        state: { success: false, reason: 'Invalid position' },
        confidence: 0.0
      };
    }

    // Check for existing arrows at position
    const existingArrow = this.findEntityAtPosition(position, gameState);
    if (existingArrow && existingArrow.type === 'ARROW') {
      return {
        state: { success: false, reason: 'Position occupied' },
        confidence: 0.1
      };
    }

    // High confidence for arrow placement if position is valid
    const confidence = 0.95;

    return {
      state: {
        success: true,
        arrow: {
          id: this.generateEntityId(),
          position,
          direction,
          playerId: input.playerId,
          timestamp: Date.now()
        }
      },
      confidence
    };
  }

  private predictMovement(
    input: PlayerInput,
    gameState: AuthoritativeGameState
  ): { state: any; confidence: number } {
    if (!input.data.targetPosition) {
      throw new Error('Movement input missing target position');
    }

    const targetPosition = input.data.targetPosition;
    const player = gameState.players.get(input.playerId);

    if (!player) {
      return {
        state: { success: false, reason: 'Player not found' },
        confidence: 0.0
      };
    }

    // Calculate movement distance and validate
    const currentPos = { x: 0, y: 0 }; // TODO: Get actual player position
    const distance = Math.sqrt(
      (targetPosition.x - currentPos.x) ** 2 +
      (targetPosition.y - currentPos.y) ** 2
    );

    // Movement predictions have medium confidence due to collision possibilities
    let confidence = 0.8;

    // Reduce confidence based on distance and obstacles
    if (distance > 3) confidence *= 0.8;
    if (this.hasObstaclesInPath(currentPos, targetPosition, gameState)) {
      confidence *= 0.6;
    }

    return {
      state: {
        success: true,
        newPosition: targetPosition,
        movementDistance: distance
      },
      confidence
    };
  }

  private predictAction(
    input: PlayerInput,
    gameState: AuthoritativeGameState
  ): { state: any; confidence: number } {
    if (!input.data.action) {
      throw new Error('Action input missing action type');
    }

    const action = input.data.action;
    let confidence = 0.7; // Default confidence for actions

    switch (action) {
      case 'JOIN_GAME':
        confidence = gameState.phase === 'WAITING' ? 0.9 : 0.3;
        break;
      case 'READY':
        confidence = 0.95;
        break;
      case 'PAUSE':
      case 'RESUME':
        confidence = 0.8;
        break;
      default:
        confidence = 0.5;
    }

    return {
      state: {
        success: true,
        action,
        processed: true
      },
      confidence
    };
  }

  private calculateMomentumFactor(entity: Entity): number {
    if (!entity.velocity) return 0;

    const speed = Math.sqrt(entity.velocity.x ** 2 + entity.velocity.y ** 2);
    const maxSpeed = 5.0; // Maximum entity speed

    // Higher speed = higher momentum factor (up to 1.0)
    return Math.min(1.0, speed / maxSpeed);
  }

  private applyBoundaryConstraints(position: Position, gameState: AuthoritativeGameState): Position {
    const constrained = { ...position };

    // Clamp to board boundaries
    constrained.x = Math.max(0, Math.min(gameState.board.width - 1, position.x));
    constrained.y = Math.max(0, Math.min(gameState.board.height - 1, position.y));

    return constrained;
  }

  private calculateExternalForces(
    entity: Entity,
    predictedPosition: Position,
    gameState: AuthoritativeGameState
  ): Position {
    const forces = { x: 0, y: 0 };

    if (!this.config.collisionPrediction) return forces;

    // Check for wall collisions
    for (const wall of gameState.board.walls) {
      const distance = Math.sqrt(
        (predictedPosition.x - wall.position.x) ** 2 +
        (predictedPosition.y - wall.position.y) ** 2
      );

      if (distance < 1.5) { // Wall repulsion radius
        const repulsionStrength = (1.5 - distance) / 1.5;
        const direction = {
          x: predictedPosition.x - wall.position.x,
          y: predictedPosition.y - wall.position.y
        };
        const length = Math.sqrt(direction.x ** 2 + direction.y ** 2);

        if (length > 0) {
          forces.x += (direction.x / length) * repulsionStrength * 0.5;
          forces.y += (direction.y / length) * repulsionStrength * 0.5;
        }
      }
    }

    return forces;
  }

  private calculatePositionConfidence(entity: Entity, deltaTime: number): number {
    let confidence = 0.9; // Base confidence

    // Reduce confidence for longer prediction times
    const timeFactor = Math.max(0.1, 1.0 - (deltaTime / this.config.maxPredictionTime));
    confidence *= timeFactor;

    // Reduce confidence for fast-moving entities
    if (entity.velocity) {
      const speed = Math.sqrt(entity.velocity.x ** 2 + entity.velocity.y ** 2);
      const speedFactor = Math.max(0.3, 1.0 - (speed / 10.0));
      confidence *= speedFactor;
    }

    return Math.max(0.1, confidence);
  }

  private calculatePredictionError(predicted: any, actual: any): number {
    // Handle different prediction types
    if (predicted.position && actual.position) {
      return Math.sqrt(
        (predicted.position.x - actual.position.x) ** 2 +
        (predicted.position.y - actual.position.y) ** 2
      );
    }

    if (predicted.success !== actual.success) {
      return this.maxPredictionDistance; // Maximum error for wrong success prediction
    }

    return 0; // No error for matching non-positional predictions
  }

  private isValidPosition(position: Position, gameState: AuthoritativeGameState): boolean {
    return position.x >= 0 && position.x < gameState.board.width &&
           position.y >= 0 && position.y < gameState.board.height;
  }

  private findEntityAtPosition(position: Position, gameState: AuthoritativeGameState): Entity | null {
    for (const [id, entity] of Array.from(gameState.board.entities)) {
      if (Math.abs(entity.position.x - position.x) < 0.5 &&
          Math.abs(entity.position.y - position.y) < 0.5) {
        return entity;
      }
    }
    return null;
  }

  private hasObstaclesInPath(start: Position, end: Position, gameState: AuthoritativeGameState): boolean {
    // Simple line-of-sight check for obstacles
    const steps = Math.ceil(Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2));

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const checkPos = {
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t
      };

      if (this.findEntityAtPosition(checkPos, gameState)) {
        return true;
      }
    }

    return false;
  }

  private storePredictionResult(playerId: string, result: PredictionResult): void {
    let history = this.predictionHistory.get(playerId);
    if (!history) {
      history = [];
      this.predictionHistory.set(playerId, history);
    }

    history.push(result);

    // Maintain history size
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }

  private generatePredictionId(): string {
    return `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEntityId(): string {
    return `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Factory for creating PredictionEngine instances
 */
export class PredictionEngineFactory {
  static create(config?: Partial<PredictionConfig>): PredictionEngine {
    return new PredictionEngine(config);
  }

  static createForTesting(): PredictionEngine {
    return new PredictionEngine({
      maxPredictionTime: 100,
      confidenceThreshold: 0.5,
      velocitySmoothing: 0.9,
      collisionPrediction: false,
      boundaryHandling: true
    });
  }

  static createHighPerformance(): PredictionEngine {
    return new PredictionEngine({
      maxPredictionTime: 150,
      confidenceThreshold: 0.8,
      velocitySmoothing: 0.7,
      collisionPrediction: true,
      boundaryHandling: true
    });
  }
}