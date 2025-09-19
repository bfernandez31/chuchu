/**
 * Hybrid Coordinator for Predictive Rendering System
 *
 * Coordinates between server authoritative logic and client predictive rendering
 * Part of Phase 1: Logic/Rendering Separation
 */

import {AuthoritativeGameServer} from "./authoritative-game-server";
import {Queue} from "../queue";
import {CONFIG} from "../../browser/common/config";

export interface HybridSystemConfig {
  serverTickRate: number;
  clientRenderFPS: number;
  predictionEnabled: boolean;
  interpolationEnabled: boolean;
  debugMode: boolean;
}

export class HybridCoordinator {
  private authoritativeServer: AuthoritativeGameServer;
  private queue: Queue;
  private config: HybridSystemConfig;
  private isEnabled: boolean = false;

  constructor(queue: Queue, config: Partial<HybridSystemConfig> = {}) {
    this.queue = queue;
    this.config = {
      serverTickRate: 20, // Reduced from 50 to 20
      clientRenderFPS: 60,
      predictionEnabled: true,
      interpolationEnabled: true,
      debugMode: false,
      ...config
    };

    this.authoritativeServer = new AuthoritativeGameServer(queue, {
      tickRate: this.config.serverTickRate,
      deltaCompressionEnabled: true
    });
  }

  /**
   * Enable hybrid predictive rendering system
   */
  enable(): void {
    if (this.isEnabled) {
      console.warn('⚠️ Hybrid system already enabled');
      return;
    }

    // Update CONFIG to use new tick rates
    this.updateServerConfig();

    // Start authoritative server
    this.authoritativeServer.start();

    this.isEnabled = true;

    console.log('🚀 Hybrid Predictive Rendering System enabled');
    console.log(`   Server: ${this.config.serverTickRate} TPS`);
    console.log(`   Client: ${this.config.clientRenderFPS} FPS`);
    console.log(`   Prediction: ${this.config.predictionEnabled ? 'ON' : 'OFF'}`);
    console.log(`   Interpolation: ${this.config.interpolationEnabled ? 'ON' : 'OFF'}`);
  }

  /**
   * Disable hybrid system and return to legacy mode
   */
  disable(): void {
    if (!this.isEnabled) {
      console.warn('⚠️ Hybrid system already disabled');
      return;
    }

    // Stop authoritative server
    this.authoritativeServer.stop();

    // Restore legacy CONFIG
    this.restoreLegacyConfig();

    this.isEnabled = false;

    console.log('🔄 Hybrid system disabled, returning to legacy mode');
  }

  /**
   * Update server configuration for hybrid mode
   */
  private updateServerConfig(): void {
    // Store original values for restoration
    const originalConfig = {
      GAME_LOOP_MS: CONFIG.GAME_LOOP_MS,
      GAME_LOOP_MIN_MS: CONFIG.GAME_LOOP_MIN_MS,
      GAME_LOOP_MAX_MS: CONFIG.GAME_LOOP_MAX_MS,
      ADAPTIVE_FREQUENCY: CONFIG.ADAPTIVE_FREQUENCY
    };

    // Update CONFIG for hybrid mode
    CONFIG.GAME_LOOP_MS = 1000 / this.config.serverTickRate; // 50ms for 20 TPS
    CONFIG.GAME_LOOP_MIN_MS = 1000 / this.config.serverTickRate;
    CONFIG.GAME_LOOP_MAX_MS = 1000 / Math.max(10, this.config.serverTickRate - 5); // Slightly higher max
    CONFIG.ADAPTIVE_FREQUENCY = false; // Disable adaptive frequency in hybrid mode

    // Store original for restoration
    (CONFIG as any)._originalConfig = originalConfig;

    console.log(`🔧 Server config updated for hybrid mode: ${CONFIG.GAME_LOOP_MS}ms intervals`);
  }

  /**
   * Restore legacy configuration
   */
  private restoreLegacyConfig(): void {
    const originalConfig = (CONFIG as any)._originalConfig;
    if (!originalConfig) {
      console.warn('⚠️ No original config found, using defaults');
      return;
    }

    CONFIG.GAME_LOOP_MS = originalConfig.GAME_LOOP_MS;
    CONFIG.GAME_LOOP_MIN_MS = originalConfig.GAME_LOOP_MIN_MS;
    CONFIG.GAME_LOOP_MAX_MS = originalConfig.GAME_LOOP_MAX_MS;
    CONFIG.ADAPTIVE_FREQUENCY = originalConfig.ADAPTIVE_FREQUENCY;

    delete (CONFIG as any)._originalConfig;

    console.log('🔄 Legacy config restored');
  }

  /**
   * Get system status and statistics
   */
  getStatus(): {
    enabled: boolean;
    serverStats: ReturnType<AuthoritativeGameServer['getServerStats']> | null;
    config: HybridSystemConfig;
    performance: {
      networkReduction: number;
      serverLoadReduction: number;
    };
  } {
    const serverStats = this.isEnabled ? this.authoritativeServer.getServerStats() : null;

    // Calculate performance improvements
    const networkReduction = this.isEnabled ? this.calculateNetworkReduction() : 0;
    const serverLoadReduction = this.isEnabled ? this.calculateServerLoadReduction() : 0;

    return {
      enabled: this.isEnabled,
      serverStats,
      config: this.config,
      performance: {
        networkReduction,
        serverLoadReduction
      }
    };
  }

  /**
   * Calculate network traffic reduction
   */
  private calculateNetworkReduction(): number {
    // In legacy mode: 50 FPS = 50 messages/second
    // In hybrid mode: 20 TPS = 20 messages/second
    // Reduction = (50 - 20) / 50 = 60%

    const legacyFPS = 50;
    const hybridTPS = this.config.serverTickRate;

    return ((legacyFPS - hybridTPS) / legacyFPS) * 100;
  }

  /**
   * Calculate server load reduction
   */
  private calculateServerLoadReduction(): number {
    // Server processes fewer ticks, calculates less frequently
    // Conservative estimate based on tick rate reduction

    const legacyFPS = 50;
    const hybridTPS = this.config.serverTickRate;

    return ((legacyFPS - hybridTPS) / legacyFPS) * 100;
  }

  /**
   * Update hybrid system configuration
   */
  updateConfig(newConfig: Partial<HybridSystemConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    // If server tick rate changed, update server
    if (newConfig.serverTickRate && newConfig.serverTickRate !== oldConfig.serverTickRate) {
      this.authoritativeServer.updateTickRate(newConfig.serverTickRate);
      this.updateServerConfig(); // Update CONFIG accordingly
    }

    console.log('🔧 Hybrid system config updated:', newConfig);
  }

  /**
   * Process client input with hybrid logic
   */
  processClientInput(playerId: string, input: any): void {
    if (!this.isEnabled) {
      // Fallback to legacy input processing
      this.queue.processMsg(input);
      return;
    }

    // Process through authoritative server with validation
    this.authoritativeServer.processClientInput(playerId, input);
  }

  /**
   * Enable/disable prediction on the fly
   */
  setPredictionEnabled(enabled: boolean): void {
    this.config.predictionEnabled = enabled;
    console.log(`🔮 Client prediction ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Enable/disable interpolation on the fly
   */
  setInterpolationEnabled(enabled: boolean): void {
    this.config.interpolationEnabled = enabled;
    console.log(`🎨 State interpolation ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get performance metrics for monitoring
   */
  getPerformanceMetrics(): {
    serverTPS: number;
    networkSavings: string;
    serverLoadReduction: string;
    uptime: number;
    playerCount: number;
  } {
    const status = this.getStatus();
    const serverStats = status.serverStats;

    return {
      serverTPS: serverStats?.actualTPS || 0,
      networkSavings: `${status.performance.networkReduction.toFixed(1)}%`,
      serverLoadReduction: `${status.performance.serverLoadReduction.toFixed(1)}%`,
      uptime: serverStats?.uptime || 0,
      playerCount: serverStats?.playerCount || 0
    };
  }

  /**
   * Emergency fallback to legacy mode
   */
  emergencyFallback(reason: string): void {
    console.error(`🚨 Emergency fallback triggered: ${reason}`);
    this.disable();

    // Notify all clients to switch to legacy mode
    // This would be implemented in Phase 2 with proper client communication
  }

  /**
   * Check system health and auto-adjust if needed
   */
  healthCheck(): boolean {
    if (!this.isEnabled) return true;

    const serverStats = this.authoritativeServer.getServerStats();

    // Check if server is falling behind
    if (serverStats.actualTPS < serverStats.tickRate * 0.8) {
      console.warn(`⚠️ Server performance degraded: ${serverStats.actualTPS} < ${serverStats.tickRate * 0.8}`);

      // Auto-adjust tick rate
      const newTickRate = Math.max(10, Math.floor(serverStats.actualTPS));
      this.updateConfig({ serverTickRate: newTickRate });

      return false;
    }

    return true;
  }
}