/**
 * Game State Manager for Hybrid Predictive Rendering
 *
 * Manages server-authoritative states and client-side predictions
 * Part of Phase 1: Logic/Rendering Separation
 */

import {GameState, PlayerState} from "../messages_pb";

export interface TimestampedGameState {
  state: GameState;
  timestamp: number;
  sequence: number;
}

export interface PredictionConfig {
  maxHistorySize: number;
  interpolationDelayMs: number;
  extrapolationLimitMs: number;
  rollbackThresholdMs: number;
}

export class GameStateManager {
  private serverStates: TimestampedGameState[] = [];
  private clientPredictions: TimestampedGameState[] = [];
  private readonly config: PredictionConfig;
  private currentSequence: number = 0;

  constructor(config: Partial<PredictionConfig> = {}) {
    this.config = {
      maxHistorySize: 60, // Keep 60 states (~3 seconds at 20 FPS)
      interpolationDelayMs: 100, // 100ms delay for smooth interpolation
      extrapolationLimitMs: 200, // Max 200ms extrapolation
      rollbackThresholdMs: 50, // Rollback if prediction differs by >50ms
      ...config
    };
  }

  /**
   * Add a new authoritative state from the server
   */
  addServerState(state: GameState, timestamp: number = Date.now()): void {
    const timestampedState: TimestampedGameState = {
      state: { ...state },
      timestamp,
      sequence: this.currentSequence++
    };

    this.serverStates.push(timestampedState);
    this.cleanupOldStates();

    // Check if we need to rollback predictions
    this.validatePredictions(timestampedState);
  }

  /**
   * Add a client-side prediction
   */
  addPrediction(state: GameState, timestamp: number = Date.now()): void {
    const prediction: TimestampedGameState = {
      state: { ...state },
      timestamp,
      sequence: this.currentSequence++
    };

    this.clientPredictions.push(prediction);
    this.cleanupOldPredictions();
  }

  /**
   * Get interpolated state for rendering at a specific time
   */
  getInterpolatedState(renderTime: number): GameState | null {
    // Calculate target time with interpolation delay
    const targetTime = renderTime - this.config.interpolationDelayMs;

    // Find two server states to interpolate between
    const states = this.findInterpolationStates(targetTime);
    if (!states) {
      return this.getLatestServerState()?.state || null;
    }

    const { before, after } = states;

    // If states are the same, no interpolation needed
    if (before.sequence === after.sequence) {
      return before.state;
    }

    // Calculate interpolation factor
    const timeDiff = after.timestamp - before.timestamp;
    const progress = timeDiff > 0 ? (targetTime - before.timestamp) / timeDiff : 0;
    const factor = Math.max(0, Math.min(1, progress));

    // Interpolate between states
    return this.interpolateStates(before.state, after.state, factor);
  }

  /**
   * Get the latest server state
   */
  getLatestServerState(): TimestampedGameState | null {
    return this.serverStates.length > 0
      ? this.serverStates[this.serverStates.length - 1]
      : null;
  }

  /**
   * Check if client predictions need rollback
   */
  private validatePredictions(serverState: TimestampedGameState): void {
    const prediction = this.findPredictionAt(serverState.timestamp);
    if (!prediction) return;

    const divergence = this.calculateStateDivergence(
      serverState.state,
      prediction.state
    );

    if (divergence > this.config.rollbackThresholdMs) {
      console.warn(`🔄 Rollback triggered: ${divergence}ms divergence detected`);
      this.rollbackPredictions(serverState);
    }
  }

  /**
   * Rollback predictions and replay from server state
   */
  private rollbackPredictions(serverState: TimestampedGameState): void {
    // Remove predictions after the server state timestamp
    this.clientPredictions = this.clientPredictions.filter(
      p => p.timestamp <= serverState.timestamp
    );

    // TODO: Replay input commands from this point forward
    // This will be implemented in Phase 3 (Input Prediction)
  }

  /**
   * Find states for interpolation at target time
   */
  private findInterpolationStates(targetTime: number): {
    before: TimestampedGameState;
    after: TimestampedGameState;
  } | null {
    if (this.serverStates.length < 2) return null;

    for (let i = 0; i < this.serverStates.length - 1; i++) {
      const current = this.serverStates[i];
      const next = this.serverStates[i + 1];

      if (current.timestamp <= targetTime && targetTime <= next.timestamp) {
        return { before: current, after: next };
      }
    }

    // If target time is beyond latest state, use two latest states
    const len = this.serverStates.length;
    return {
      before: this.serverStates[len - 2],
      after: this.serverStates[len - 1]
    };
  }

  /**
   * Find prediction at specific timestamp
   */
  private findPredictionAt(timestamp: number): TimestampedGameState | null {
    return this.clientPredictions.find(p =>
      Math.abs(p.timestamp - timestamp) < this.config.rollbackThresholdMs
    ) || null;
  }

  /**
   * Interpolate between two game states
   */
  private interpolateStates(
    stateA: GameState,
    stateB: GameState,
    factor: number
  ): GameState {
    // For now, implement basic interpolation for moving objects
    // More sophisticated interpolation will be added in Phase 2

    const interpolatedState: GameState = {
      ...stateB, // Start with state B as base
      players: this.interpolatePlayers(stateA.players || [], stateB.players || [], factor),
      strategy: stateB.strategy ? {
        ...stateB.strategy,
        mouses: this.interpolateMovingObjects(
          stateA.strategy?.mouses || [],
          stateB.strategy?.mouses || [],
          factor
        ),
        cats: this.interpolateMovingObjects(
          stateA.strategy?.cats || [],
          stateB.strategy?.cats || [],
          factor
        )
      } : undefined
    };

    return interpolatedState;
  }

  /**
   * Interpolate player positions
   */
  private interpolatePlayers(
    playersA: PlayerState[],
    playersB: PlayerState[],
    factor: number
  ): PlayerState[] {
    return playersB.map((playerB, index) => {
      // Find matching player by name or use same index
      const playerA = playersA.find(p => p.name === playerB.name) || playersA[index];
      if (!playerA || !playerA.position || !playerB.position) {
        return playerB;
      }

      // Check for teleportation (distance > 100 units)
      const distance = Math.sqrt(
        Math.pow(playerB.position[0] - playerA.position[0], 2) +
        Math.pow(playerB.position[1] - playerA.position[1], 2)
      );

      // If player teleported, don't interpolate
      if (distance > 100) {
        return playerB;
      }

      return {
        ...playerB,
        position: [
          this.lerp(playerA.position[0], playerB.position[0], factor),
          this.lerp(playerA.position[1], playerB.position[1], factor)
        ]
      };
    });
  }

  /**
   * Interpolate moving objects (cats/mice)
   */
  private interpolateMovingObjects(
    objectsA: any[],
    objectsB: any[],
    factor: number
  ): any[] {
    return objectsB.map((objB) => {
      // Find matching object in state A by ID/key if available
      const objA = this.findMatchingObject(objectsA, objB);

      // If no matching object or missing position data, use state B as-is
      if (!objA || !objA.position || !objB.position) {
        return objB;
      }

      // Check if objects are too far apart (indicating teleportation/respawn)
      const distance = Math.sqrt(
        Math.pow(objB.position[0] - objA.position[0], 2) +
        Math.pow(objB.position[1] - objA.position[1], 2)
      );

      // If objects are too far apart (>200 units), don't interpolate
      if (distance > 200) {
        return objB;
      }

      return {
        ...objB,
        position: [
          this.lerp(objA.position[0], objB.position[0], factor),
          this.lerp(objA.position[1], objB.position[1], factor)
        ]
      };
    });
  }

  /**
   * Find matching object between states
   */
  private findMatchingObject(objects: any[], targetObj: any): any | null {
    // First try to match by ID if available
    if (targetObj.id !== undefined) {
      const match = objects.find(obj => obj.id === targetObj.id);
      if (match) return match;
    }

    // Fallback: match by position proximity (within 50 units)
    if (targetObj.position) {
      const match = objects.find(obj => {
        if (!obj.position) return false;
        const distance = Math.sqrt(
          Math.pow(obj.position[0] - targetObj.position[0], 2) +
          Math.pow(obj.position[1] - targetObj.position[1], 2)
        );
        return distance < 50;
      });
      if (match) return match;
    }

    return null;
  }

  /**
   * Linear interpolation
   */
  private lerp(a: number, b: number, factor: number): number {
    return a + (b - a) * factor;
  }

  /**
   * Calculate divergence between two states (simplified)
   */
  private calculateStateDivergence(stateA: GameState, stateB: GameState): number {
    // Simple divergence calculation based on player positions
    // More sophisticated calculation will be added later

    const playersA = stateA.players || [];
    const playersB = stateB.players || [];

    let totalDivergence = 0;
    let count = 0;

    for (let i = 0; i < Math.min(playersA.length, playersB.length); i++) {
      const posA = playersA[i].position;
      const posB = playersB[i].position;

      if (posA && posB) {
        const distance = Math.sqrt(
          Math.pow(posA[0] - posB[0], 2) +
          Math.pow(posA[1] - posB[1], 2)
        );
        totalDivergence += distance;
        count++;
      }
    }

    return count > 0 ? totalDivergence / count : 0;
  }

  /**
   * Clean up old server states
   */
  private cleanupOldStates(): void {
    const cutoffTime = Date.now() - (this.config.maxHistorySize * 1000 / 20); // 20 FPS
    this.serverStates = this.serverStates.filter(s => s.timestamp > cutoffTime);
  }

  /**
   * Clean up old predictions
   */
  private cleanupOldPredictions(): void {
    const cutoffTime = Date.now() - (this.config.maxHistorySize * 1000 / 60); // 60 FPS
    this.clientPredictions = this.clientPredictions.filter(p => p.timestamp > cutoffTime);
  }

  /**
   * Get statistics for debugging
   */
  getStats(): {
    serverStates: number;
    predictions: number;
    oldestServerState: number;
    latestServerState: number;
  } {
    const latest = this.getLatestServerState();
    const oldest = this.serverStates[0];

    return {
      serverStates: this.serverStates.length,
      predictions: this.clientPredictions.length,
      oldestServerState: oldest?.timestamp || 0,
      latestServerState: latest?.timestamp || 0
    };
  }
}