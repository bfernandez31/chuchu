/**
 * Predictive Renderer for Hybrid Predictive Rendering
 *
 * Client-side predictive rendering with 60 FPS interpolation
 * Part of Phase 1: Logic/Rendering Separation
 */

import {GameDisplay} from "./game.display";
import {GameStateManager, TimestampedGameState} from "../../src/prediction/game-state-manager";
import {GameState} from "../../src/messages_pb";

export interface PredictiveRendererConfig {
  targetFPS: number;
  renderDelay: number; // Delay before rendering for smoother interpolation
  debugMode: boolean;
  performanceMonitoring: boolean;
}

export class PredictiveRenderer {
  private gameDisplay: GameDisplay;
  private stateManager: GameStateManager;
  private config: PredictiveRendererConfig;

  private animationFrameId: number = 0;
  private lastRenderTime: number = 0;
  private frameCount: number = 0;
  private fpsCalculation: number[] = [];
  private isRunning: boolean = false;

  // Performance monitoring
  private renderTimes: number[] = [];
  private interpolationTimes: number[] = [];
  private lastPerformanceLog: number = 0;

  constructor(
    gameDisplay: GameDisplay,
    config: Partial<PredictiveRendererConfig> = {}
  ) {
    this.gameDisplay = gameDisplay;
    this.stateManager = new GameStateManager();
    this.config = {
      targetFPS: 60,
      renderDelay: 100, // 100ms delay for smoother interpolation
      debugMode: false,
      performanceMonitoring: true,
      ...config
    };
  }

  /**
   * Start the predictive rendering loop
   */
  start(): void {
    if (this.isRunning) {
      console.warn('⚠️ Predictive Renderer already running');
      return;
    }

    this.isRunning = true;
    this.lastRenderTime = performance.now();
    this.scheduleNextFrame();

    console.log(`🎨 Predictive Renderer started at ${this.config.targetFPS} FPS`);
  }

  /**
   * Stop the predictive rendering loop
   */
  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
    console.log('🎨 Predictive Renderer stopped');
  }

  /**
   * Process new server state
   */
  onServerState(state: GameState, timestamp: number = Date.now()): void {
    this.stateManager.addServerState(state, timestamp);

    if (this.config.debugMode) {
      console.log(`📡 Server state received (timestamp: ${timestamp}) - Players: ${state.players?.length || 0}, Started: ${state.started}`);
    }
  }

  /**
   * Add client-side prediction
   */
  addPrediction(state: GameState, timestamp: number = Date.now()): void {
    this.stateManager.addPrediction(state, timestamp);

    if (this.config.debugMode) {
      console.log(`🔮 Client prediction added (timestamp: ${timestamp})`);
    }
  }

  /**
   * Main rendering loop
   */
  private render(currentTime: number): void {
    const deltaTime = currentTime - this.lastRenderTime;
    const renderStartTime = performance.now();

    // Skip frame if running too fast (maintain target FPS)
    const targetFrameTime = 1000 / this.config.targetFPS;
    if (deltaTime < targetFrameTime - 1) {
      this.scheduleNextFrame();
      return;
    }

    this.lastRenderTime = currentTime;
    this.frameCount++;

    try {
      // Calculate render time with delay for smooth interpolation
      const renderTime = currentTime - this.config.renderDelay;

      // Get interpolated state for current render time
      const interpolationStartTime = performance.now();
      const interpolatedState = this.stateManager.getInterpolatedState(renderTime);
      const interpolationTime = performance.now() - interpolationStartTime;

      if (interpolatedState) {
        // Render the interpolated state
        this.gameDisplay.display({
          state: interpolatedState,
          _meta: {
            renderTime: currentTime,
            interpolated: true,
            predictive: true
          }
        });
      } else {
        // Debug: Why no state to render?
        if (this.config.debugMode) {
          const stateStats = this.stateManager.getStats();
          console.warn(`⚠️ No interpolated state available - Server states: ${stateStats.serverStates}, Latest: ${stateStats.latestServerState ? new Date(stateStats.latestServerState).toLocaleTimeString() : 'none'}`);
        }

        // Fallback: Try to render the latest available server state directly
        const latestState = this.stateManager.getLatestServerState();
        if (latestState) {
          this.gameDisplay.display({
            state: latestState.state,
            _meta: {
              renderTime: currentTime,
              interpolated: false,
              predictive: true,
              fallback: true
            }
          });
        }
      }

      // Performance monitoring
      if (this.config.performanceMonitoring) {
        const renderTime = performance.now() - renderStartTime;
        this.trackPerformance(renderTime, interpolationTime, deltaTime);
      }

      // Debug information
      if (this.config.debugMode) {
        this.renderDebugInfo(currentTime, deltaTime, interpolatedState);
      }

    } catch (error) {
      console.error('🚨 Render error:', error);
    }

    this.scheduleNextFrame();
  }

  /**
   * Schedule the next render frame
   */
  private scheduleNextFrame(): void {
    if (!this.isRunning) return;

    this.animationFrameId = requestAnimationFrame((time) => this.render(time));
  }

  /**
   * Track performance metrics
   */
  private trackPerformance(renderTime: number, interpolationTime: number, deltaTime: number): void {
    this.renderTimes.push(renderTime);
    this.interpolationTimes.push(interpolationTime);
    this.fpsCalculation.push(deltaTime);

    // Keep only last 60 measurements (1 second at 60 FPS)
    const maxSamples = 60;
    if (this.renderTimes.length > maxSamples) {
      this.renderTimes.shift();
      this.interpolationTimes.shift();
      this.fpsCalculation.shift();
    }

    // Log performance every 5 seconds
    const now = Date.now();
    if (now - this.lastPerformanceLog >= 5000) {
      this.logPerformanceStats();
      this.lastPerformanceLog = now;
    }
  }

  /**
   * Log performance statistics
   */
  private logPerformanceStats(): void {
    if (this.renderTimes.length === 0) return;

    const avgRenderTime = this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length;
    const avgInterpolationTime = this.interpolationTimes.reduce((a, b) => a + b, 0) / this.interpolationTimes.length;
    const avgFrameTime = this.fpsCalculation.reduce((a, b) => a + b, 0) / this.fpsCalculation.length;
    const actualFPS = 1000 / avgFrameTime;

    const stateStats = this.stateManager.getStats();

    console.log(`🎨 Predictive Renderer Stats:`);
    console.log(`   FPS: ${actualFPS.toFixed(1)} (target: ${this.config.targetFPS})`);
    console.log(`   Render: ${avgRenderTime.toFixed(2)}ms | Interpolation: ${avgInterpolationTime.toFixed(2)}ms`);
    console.log(`   States: ${stateStats.serverStates} server, ${stateStats.predictions} predictions`);

    // Performance warnings
    if (avgRenderTime > 16) { // > 16ms means we can't maintain 60 FPS
      console.warn(`⚠️ Render performance warning: ${avgRenderTime.toFixed(2)}ms > 16ms`);
    }

    if (actualFPS < this.config.targetFPS * 0.9) {
      console.warn(`⚠️ FPS below target: ${actualFPS.toFixed(1)} < ${this.config.targetFPS}`);
    }
  }

  /**
   * Render debug information
   */
  private renderDebugInfo(currentTime: number, deltaTime: number, state: GameState | null): void {
    const debugElement = document.querySelector('.debug-predictive-renderer');
    if (!debugElement) return;

    const stateStats = this.stateManager.getStats();
    const fps = 1000 / deltaTime;

    debugElement.innerHTML = `
      <div class="debug-section">
        <h4>🎨 Predictive Renderer Debug</h4>
        <div>Frame: ${this.frameCount} | FPS: ${fps.toFixed(1)}</div>
        <div>Render Time: ${currentTime.toFixed(0)}ms</div>
        <div>Server States: ${stateStats.serverStates}</div>
        <div>Predictions: ${stateStats.predictions}</div>
        <div>State Age: ${stateStats.latestServerState ? (currentTime - stateStats.latestServerState).toFixed(0) + 'ms' : 'N/A'}</div>
        <div>Interpolated: ${state ? '✅' : '❌'}</div>
      </div>
    `;
  }

  /**
   * Get current renderer statistics
   */
  getStats(): {
    fps: number;
    frameCount: number;
    renderTime: number;
    interpolationTime: number;
    stateManager: ReturnType<GameStateManager['getStats']>;
  } {
    const avgRenderTime = this.renderTimes.length > 0
      ? this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length
      : 0;

    const avgInterpolationTime = this.interpolationTimes.length > 0
      ? this.interpolationTimes.reduce((a, b) => a + b, 0) / this.interpolationTimes.length
      : 0;

    const avgFrameTime = this.fpsCalculation.length > 0
      ? this.fpsCalculation.reduce((a, b) => a + b, 0) / this.fpsCalculation.length
      : 16.67; // Default to 60 FPS

    return {
      fps: 1000 / avgFrameTime,
      frameCount: this.frameCount,
      renderTime: avgRenderTime,
      interpolationTime: avgInterpolationTime,
      stateManager: this.stateManager.getStats()
    };
  }

  /**
   * Update renderer configuration
   */
  updateConfig(newConfig: Partial<PredictiveRendererConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 Predictive Renderer config updated:', newConfig);
  }

  /**
   * Force immediate render (for debugging)
   */
  forceRender(): void {
    this.render(performance.now());
  }
}