/**
 * Authoritative Game Server for Hybrid Predictive Rendering
 *
 * Server-side game logic with reduced tick rate and authoritative state management
 * Part of Phase 1: Logic/Rendering Separation
 */

import {Game} from "../game";
import {Queue} from "../queue";
import {CONFIG} from "../../browser/common/config";
import {GameState} from "../messages_pb";

export interface AuthoritativeServerConfig {
  tickRate: number; // Server ticks per second (reduced from 50 to 20)
  stateSnapshotInterval: number; // How often to send full state snapshots
  deltaCompressionEnabled: boolean; // Enable delta compression
}

export class AuthoritativeGameServer {
  private game: Game | null = null;
  private queue: Queue;
  private config: AuthoritativeServerConfig;
  private lastTickTime: number = 0;
  private tickCount: number = 0;
  private lastFullSnapshot: number = 0;
  private isRunning: boolean = false;

  constructor(queue: Queue, config: Partial<AuthoritativeServerConfig> = {}) {
    this.queue = queue;
    // Don't assign game immediately - it will be set when start() is called
    this.config = {
      tickRate: 20, // Reduced from 50 FPS to 20 FPS for server
      stateSnapshotInterval: 1000, // Full snapshot every 1 second
      deltaCompressionEnabled: true,
      ...config
    };
  }

  /**
   * Start the authoritative game server (integrates with existing loop)
   */
  start(): void {
    if (this.isRunning) {
      console.warn('⚠️ Authoritative server already running');
      return;
    }

    // Ensure game is available before starting
    this.game = this.queue.currentGame;
    if (!this.game) {
      console.error('❌ Cannot start authoritative server: Game not initialized');
      return;
    }

    this.isRunning = true;
    this.lastTickTime = Date.now();

    // Don't start our own loop - integrate with existing executeGame loop
    console.log(`🎮 Authoritative Game Server enabled (integrates with existing game loop)`);
  }

  /**
   * Stop the authoritative game server
   */
  stop(): void {
    this.isRunning = false;
    console.log('🎮 Authoritative Game Server stopped');
  }

  /**
   * Get current tick rate configuration
   */
  getTickRate(): number {
    return this.config.tickRate;
  }

  /**
   * Update tick rate (for dynamic adjustment)
   */
  updateTickRate(newTickRate: number): void {
    this.config.tickRate = Math.max(10, Math.min(50, newTickRate));
    console.log(`🔧 Server tick rate updated to ${this.config.tickRate} TPS`);
  }

  /**
   * Called by existing game loop - processes authoritative state
   */
  onGameTick(): void {
    if (!this.isRunning) return;

    const now = Date.now();
    const deltaTime = now - this.lastTickTime;
    this.lastTickTime = now;
    this.tickCount++;

    // Send periodic full snapshots for reliability
    if (now - this.lastFullSnapshot >= this.config.stateSnapshotInterval) {
      this.sendFullSnapshot(now);
      this.lastFullSnapshot = now;
    }

    // Log performance statistics every 10 ticks
    if (this.tickCount % 10 === 0) {
      this.logPerformanceStats(deltaTime);
    }
  }

  /**
   * Process a single game tick (legacy method for standalone mode)
   */
  private processTick(): void {
    const now = Date.now();
    const deltaTime = now - this.lastTickTime;
    this.lastTickTime = now;
    this.tickCount++;

    // Safety check: ensure game is still available
    if (!this.game) {
      console.warn('⚠️ Game instance not available, stopping authoritative server');
      this.stop();
      return;
    }

    try {
      // Execute game logic (existing game.execute method)
      this.game.execute(() => {
        this.broadcastGameState(now);
      });
    } catch (error) {
      console.error('❌ Error in game execution:', error);
      // Continue running but log the error
    }

    // Send periodic full snapshots for reliability
    if (now - this.lastFullSnapshot >= this.config.stateSnapshotInterval) {
      this.sendFullSnapshot(now);
      this.lastFullSnapshot = now;
    }

    // Log performance statistics periodically
    if (this.tickCount % (this.config.tickRate * 10) === 0) { // Every 10 seconds
      this.logPerformanceStats(deltaTime);
    }
  }

  /**
   * Schedule the next tick based on tick rate
   */
  private scheduleNextTick(): void {
    if (!this.isRunning) return;

    const tickInterval = 1000 / this.config.tickRate;
    const nextTickTime = this.lastTickTime + tickInterval;
    const now = Date.now();
    const delay = Math.max(0, nextTickTime - now);

    setTimeout(() => {
      this.processTick();
      this.scheduleNextTick();
    }, delay);
  }

  /**
   * Broadcast authoritative game state to all clients
   */
  private broadcastGameState(timestamp: number): void {
    const authoritativeState = this.createAuthoritativeState(timestamp);

    // Use existing queue's broadcasting mechanism but with enhanced metadata
    const enhancedMessage = {
      ...authoritativeState,
      _meta: {
        timestamp,
        sequence: this.tickCount,
        tickRate: this.config.tickRate,
        authoritative: true
      }
    };

    // Broadcast through existing WebSocket system
    this.queue.sendGameToServer();
  }

  /**
   * Send full state snapshot for synchronization
   */
  private sendFullSnapshot(timestamp: number): void {
    const fullState = this.createAuthoritativeState(timestamp);

    const snapshotMessage = {
      ...fullState,
      _meta: {
        timestamp,
        sequence: this.tickCount,
        type: 'FULL_SNAPSHOT',
        authoritative: true
      }
    };

    // Send full snapshot through existing system
    this.queue.sendGameToServer();

    console.log(`📸 Full state snapshot sent (tick: ${this.tickCount})`);
  }

  /**
   * Create authoritative game state
   */
  private createAuthoritativeState(timestamp: number): GameState {
    if (!this.game) {
      throw new Error('Game not available for state creation');
    }
    const baseState = this.game.state();

    // Enhance state with authoritative metadata
    return {
      ...baseState,
      // Add server-specific metadata (will be filtered before sending to clients)
      _serverMeta: {
        timestamp,
        tickCount: this.tickCount,
        tickRate: this.config.tickRate
      }
    } as GameState;
  }

  /**
   * Validate client input before processing
   */
  validateClientInput(playerId: string, input: any): boolean {
    // Basic input validation
    if (!playerId || !input) return false;

    // Check if player exists in game
    if (!this.game) return false;
    const player = this.game.players.find(p => p.key === playerId);
    if (!player) return false;

    // Validate input timing (prevent input flooding)
    const now = Date.now();
    if (input.timestamp && Math.abs(now - input.timestamp) > 1000) {
      console.warn(`⚠️ Input timestamp too old/future: ${playerId}`);
      return false;
    }

    return true;
  }

  /**
   * Process validated client input
   */
  processClientInput(playerId: string, input: any): void {
    if (!this.validateClientInput(playerId, input)) {
      return;
    }

    // Process input through existing game logic
    // This integrates with the existing Queue.processMsg system
    this.queue.processMsg(input);
  }

  /**
   * Get server performance statistics
   */
  getServerStats(): {
    tickRate: number;
    actualTPS: number;
    tickCount: number;
    uptime: number;
    playerCount: number;
    entityCount: number;
  } {
    if (!this.game) {
      return {
        tickRate: this.config.tickRate,
        actualTPS: 0,
        tickCount: this.tickCount,
        uptime: 0,
        playerCount: 0,
        entityCount: 0
      };
    }

    const playerCount = this.game.players.filter(p => p.connected).length;
    const strategy = this.game.currentStrategy;
    const entityCount = (strategy?.mouses?.length || 0) + (strategy?.cats?.length || 0);

    return {
      tickRate: this.config.tickRate,
      actualTPS: this.calculateActualTPS(),
      tickCount: this.tickCount,
      uptime: Date.now() - this.lastTickTime + (this.tickCount * 1000 / this.config.tickRate),
      playerCount,
      entityCount
    };
  }

  /**
   * Calculate actual TPS based on recent performance
   */
  private calculateActualTPS(): number {
    // Simple calculation - in a real implementation, this would track
    // actual tick timing over a window
    return this.config.tickRate; // Placeholder
  }

  /**
   * Log performance statistics
   */
  private logPerformanceStats(deltaTime: number): void {
    const stats = this.getServerStats();

    console.log(`🎮 Authoritative Server Stats:`);
    console.log(`   Tick: ${stats.tickCount} | TPS: ${stats.tickRate} | Players: ${stats.playerCount}`);
    console.log(`   Entities: ${stats.entityCount} | Delta: ${deltaTime.toFixed(1)}ms`);

    // Warn if we're falling behind target tick rate
    const targetDelta = 1000 / this.config.tickRate;
    if (deltaTime > targetDelta * 1.2) {
      console.warn(`⚠️ Server tick rate falling behind: ${deltaTime.toFixed(1)}ms > ${targetDelta.toFixed(1)}ms`);
    }
  }

  /**
   * Adjust server performance based on load
   */
  adaptToLoad(): void {
    const stats = this.getServerStats();

    // Auto-adjust tick rate based on player count and entity count
    let targetTickRate = 20; // Base tick rate

    if (stats.playerCount > 20 || stats.entityCount > 100) {
      targetTickRate = 15; // Reduce for high load
    } else if (stats.playerCount < 5 && stats.entityCount < 20) {
      targetTickRate = 25; // Increase for low load
    }

    if (targetTickRate !== this.config.tickRate) {
      this.updateTickRate(targetTickRate);
    }
  }
}