/**
 * T029: DeltaCompression Implementation
 *
 * Delta state calculation algorithms with protobuf field presence optimization,
 * change detection for players and entities, and compression efficiency monitoring.
 */

import { AuthoritativeGameState } from '../models/authoritative-game-state';

export interface DeltaState {
  baseSequence: number;
  deltaSequence: number;
  timestamp: number;
  changedPlayers: PlayerDelta[];
  changedEntities: EntityDelta[];
  newArrows: ArrowDelta[];
  removedEntityIds: string[];
  compressionRatio: number;
  hasChanges: boolean;
}

export interface PlayerDelta {
  playerId: string;
  position?: { x: number; y: number };
  score?: number;
  status?: string;
  color?: string;
  arrows?: any[];
  changedFields: string[];
}

export interface EntityDelta {
  entityId: string;
  entityType: 'MOUSE' | 'CAT' | 'WALL' | 'GOAL';
  position?: { x: number; y: number };
  direction?: string;
  velocity?: { x: number; y: number };
  status?: string;
  changedFields: string[];
}

export interface ArrowDelta {
  id: string;
  position: { x: number; y: number };
  direction: string;
  playerId: string;
  timestamp: number;
}

export interface CompressionMetrics {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  fieldsChanged: number;
  totalFields: number;
  timestamp: number;
}

export class DeltaCompression {
  private compressionHistory: CompressionMetrics[] = [];
  private maxHistorySize = 100;

  /**
   * Create delta state calculation between two game states
   */
  calculateDelta(previousState: AuthoritativeGameState, currentState: AuthoritativeGameState): DeltaState {
    const startTime = performance.now();

    const delta: DeltaState = {
      baseSequence: previousState.sequence,
      deltaSequence: currentState.sequence,
      timestamp: currentState.timestamp,
      changedPlayers: [],
      changedEntities: [],
      newArrows: [],
      removedEntityIds: [],
      compressionRatio: 0,
      hasChanges: false
    };

    // Calculate player changes
    delta.changedPlayers = this.calculatePlayerDeltas(
      Array.from(previousState.players.values()),
      Array.from(currentState.players.values())
    );

    // Calculate entity changes
    delta.changedEntities = this.calculateEntityDeltas(
      Array.from(previousState.board.entities.values()),
      Array.from(currentState.board.entities.values())
    );

    // Calculate arrow changes
    delta.newArrows = this.calculateArrowDeltas(previousState.board.arrows, currentState.board.arrows);

    // Find removed entities
    delta.removedEntityIds = this.findRemovedEntities(
      Array.from(previousState.board.entities.values()),
      Array.from(currentState.board.entities.values())
    );

    // Determine if there are changes
    delta.hasChanges = delta.changedPlayers.length > 0 ||
                      delta.changedEntities.length > 0 ||
                      delta.newArrows.length > 0 ||
                      delta.removedEntityIds.length > 0;

    // Calculate compression metrics
    if (delta.hasChanges) {
      const metrics = this.calculateCompressionMetrics(delta, currentState, performance.now() - startTime);
      delta.compressionRatio = metrics.compressionRatio;
      this.recordCompressionMetrics(metrics);
    }

    return delta;
  }

  /**
   * Calculate player deltas with field-level change detection
   */
  private calculatePlayerDeltas(previousPlayers: any[], currentPlayers: any[]): PlayerDelta[] {
    const playerDeltas: PlayerDelta[] = [];

    for (const currentPlayer of currentPlayers) {
      const previousPlayer = previousPlayers.find(p => p.id === currentPlayer.id);

      if (!previousPlayer) {
        // New player - include all fields
        playerDeltas.push({
          playerId: currentPlayer.id,
          position: currentPlayer.position,
          score: currentPlayer.score,
          status: currentPlayer.status,
          color: currentPlayer.color,
          arrows: currentPlayer.arrows,
          changedFields: ['position', 'score', 'status', 'color', 'arrows']
        });
        continue;
      }

      // Compare fields and build delta
      const delta: PlayerDelta = {
        playerId: currentPlayer.id,
        changedFields: []
      };

      if (!this.isEqual(previousPlayer.position, currentPlayer.position)) {
        delta.position = currentPlayer.position;
        delta.changedFields.push('position');
      }

      if (previousPlayer.score !== currentPlayer.score) {
        delta.score = currentPlayer.score;
        delta.changedFields.push('score');
      }

      if (previousPlayer.status !== currentPlayer.status) {
        delta.status = currentPlayer.status;
        delta.changedFields.push('status');
      }

      if (previousPlayer.color !== currentPlayer.color) {
        delta.color = currentPlayer.color;
        delta.changedFields.push('color');
      }

      if (!this.arraysEqual(previousPlayer.arrows, currentPlayer.arrows)) {
        delta.arrows = currentPlayer.arrows;
        delta.changedFields.push('arrows');
      }

      // Only include delta if there are changes
      if (delta.changedFields.length > 0) {
        playerDeltas.push(delta);
      }
    }

    return playerDeltas;
  }

  /**
   * Calculate entity deltas with field-level change detection
   */
  private calculateEntityDeltas(previousEntities: any[], currentEntities: any[]): EntityDelta[] {
    const entityDeltas: EntityDelta[] = [];

    for (const currentEntity of currentEntities) {
      const previousEntity = previousEntities.find(e => e.id === currentEntity.id);

      if (!previousEntity) {
        // New entity - include all fields
        entityDeltas.push({
          entityId: currentEntity.id,
          entityType: currentEntity.type,
          position: currentEntity.position,
          direction: currentEntity.direction,
          velocity: currentEntity.velocity,
          status: currentEntity.status,
          changedFields: ['position', 'direction', 'velocity', 'status']
        });
        continue;
      }

      // Compare fields and build delta
      const delta: EntityDelta = {
        entityId: currentEntity.id,
        entityType: currentEntity.type,
        changedFields: []
      };

      if (!this.isEqual(previousEntity.position, currentEntity.position)) {
        delta.position = currentEntity.position;
        delta.changedFields.push('position');
      }

      if (previousEntity.direction !== currentEntity.direction) {
        delta.direction = currentEntity.direction;
        delta.changedFields.push('direction');
      }

      if (!this.isEqual(previousEntity.velocity, currentEntity.velocity)) {
        delta.velocity = currentEntity.velocity;
        delta.changedFields.push('velocity');
      }

      if (previousEntity.status !== currentEntity.status) {
        delta.status = currentEntity.status;
        delta.changedFields.push('status');
      }

      // Only include delta if there are changes
      if (delta.changedFields.length > 0) {
        entityDeltas.push(delta);
      }
    }

    return entityDeltas;
  }

  /**
   * Calculate arrow deltas (new arrows only)
   */
  private calculateArrowDeltas(previousArrows: any[], currentArrows: any[]): ArrowDelta[] {
    const newArrows: ArrowDelta[] = [];

    for (const currentArrow of currentArrows) {
      const previousArrow = previousArrows.find(a => a.id === currentArrow.id);

      if (!previousArrow) {
        newArrows.push({
          id: currentArrow.id,
          position: currentArrow.position,
          direction: currentArrow.direction,
          playerId: currentArrow.playerId,
          timestamp: currentArrow.timestamp
        });
      }
    }

    return newArrows;
  }

  /**
   * Find entities that were removed
   */
  private findRemovedEntities(previousEntities: any[], currentEntities: any[]): string[] {
    const removedIds: string[] = [];

    for (const previousEntity of previousEntities) {
      const currentEntity = currentEntities.find(e => e.id === previousEntity.id);
      if (!currentEntity) {
        removedIds.push(previousEntity.id);
      }
    }

    return removedIds;
  }

  /**
   * Calculate compression metrics and efficiency
   */
  private calculateCompressionMetrics(delta: DeltaState, fullState: AuthoritativeGameState, processingTime: number): CompressionMetrics {
    const originalSize = this.getStateSize(fullState);
    const compressedSize = this.getDeltaSize(delta);
    const compressionRatio = originalSize > 0 ? 1 - (compressedSize / originalSize) : 0;

    // Count changed fields vs total fields
    let fieldsChanged = 0;
    let totalFields = 0;

    // Count player fields
    delta.changedPlayers.forEach(playerDelta => {
      fieldsChanged += playerDelta.changedFields.length;
      totalFields += 5; // position, score, status, color, arrows
    });

    // Count entity fields
    delta.changedEntities.forEach(entityDelta => {
      fieldsChanged += entityDelta.changedFields.length;
      totalFields += 4; // position, direction, velocity, status
    });

    // Add new arrows and removed entities
    fieldsChanged += delta.newArrows.length + delta.removedEntityIds.length;
    totalFields += fullState.board.arrows.length + fullState.board.entities.size;

    return {
      originalSize,
      compressedSize,
      compressionRatio: Math.max(0, Math.min(1, compressionRatio)),
      fieldsChanged,
      totalFields,
      timestamp: Date.now()
    };
  }

  /**
   * Estimate size of full state in bytes
   */
  private getStateSize(state: AuthoritativeGameState): number {
    return JSON.stringify(state).length;
  }

  /**
   * Estimate size of delta in bytes
   */
  private getDeltaSize(delta: DeltaState): number {
    return JSON.stringify(delta).length;
  }

  /**
   * Record compression metrics for monitoring
   */
  private recordCompressionMetrics(metrics: CompressionMetrics): void {
    this.compressionHistory.push(metrics);

    // Maintain history size limit
    if (this.compressionHistory.length > this.maxHistorySize) {
      this.compressionHistory = this.compressionHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get compression efficiency statistics
   */
  getCompressionStats(): {
    averageCompressionRatio: number;
    averageFieldsChanged: number;
    averageProcessingTime: number;
    totalDeltas: number;
    efficiencyTrend: 'improving' | 'stable' | 'declining';
  } {
    if (this.compressionHistory.length === 0) {
      return {
        averageCompressionRatio: 0,
        averageFieldsChanged: 0,
        averageProcessingTime: 0,
        totalDeltas: 0,
        efficiencyTrend: 'stable'
      };
    }

    const recent = this.compressionHistory;
    const averageCompressionRatio = recent.reduce((sum, m) => sum + m.compressionRatio, 0) / recent.length;
    const averageFieldsChanged = recent.reduce((sum, m) => sum + (m.totalFields > 0 ? m.fieldsChanged / m.totalFields : 0), 0) / recent.length;

    // Calculate trend (compare first half vs second half)
    let efficiencyTrend: 'improving' | 'stable' | 'declining' = 'stable';
    if (recent.length >= 10) {
      const midpoint = Math.floor(recent.length / 2);
      const firstHalf = recent.slice(0, midpoint);
      const secondHalf = recent.slice(midpoint);

      const firstAvg = firstHalf.reduce((sum, m) => sum + m.compressionRatio, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, m) => sum + m.compressionRatio, 0) / secondHalf.length;

      const difference = secondAvg - firstAvg;
      if (difference > 0.05) {
        efficiencyTrend = 'improving';
      } else if (difference < -0.05) {
        efficiencyTrend = 'declining';
      }
    }

    return {
      averageCompressionRatio,
      averageFieldsChanged,
      averageProcessingTime: 0, // Would need to track this separately
      totalDeltas: recent.length,
      efficiencyTrend
    };
  }

  /**
   * Optimize delta based on field importance and frequency
   */
  optimizeDelta(delta: DeltaState): DeltaState {
    const optimized = { ...delta };

    // Priority-based field filtering
    // High priority: position, status changes
    // Medium priority: score, direction changes
    // Low priority: color, minor state changes

    optimized.changedPlayers = optimized.changedPlayers.map(playerDelta => {
      const optimizedFields = playerDelta.changedFields.filter(field => {
        // Always include high-priority fields
        if (['position', 'status'].includes(field)) return true;

        // Include medium-priority fields if compression ratio is good
        if (['score', 'direction'].includes(field) && delta.compressionRatio > 0.3) return true;

        // Include low-priority fields only if compression ratio is excellent
        if (['color'].includes(field) && delta.compressionRatio > 0.7) return true;

        return false;
      });

      return {
        ...playerDelta,
        changedFields: optimizedFields
      };
    });

    return optimized;
  }

  /**
   * Helper method to compare objects for equality
   */
  private isEqual(obj1: any, obj2: any): boolean {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  }

  /**
   * Helper method to compare arrays for equality
   */
  private arraysEqual(arr1: any[], arr2: any[]): boolean {
    if (arr1.length !== arr2.length) return false;
    return JSON.stringify(arr1) === JSON.stringify(arr2);
  }

  /**
   * Reset compression history (for testing)
   */
  resetHistory(): void {
    this.compressionHistory = [];
  }

  /**
   * Get recent compression metrics
   */
  getRecentMetrics(count: number = 10): CompressionMetrics[] {
    return this.compressionHistory.slice(-count);
  }
}

/**
 * Global delta compression instance
 */
let globalDeltaCompression: DeltaCompression | null = null;

export class DeltaCompressionManager {
  /**
   * Get or create global delta compression instance
   */
  static getInstance(): DeltaCompression {
    if (!globalDeltaCompression) {
      globalDeltaCompression = new DeltaCompression();
    }
    return globalDeltaCompression;
  }

  /**
   * Reset global instance (for testing)
   */
  static reset(): void {
    globalDeltaCompression = null;
  }
}