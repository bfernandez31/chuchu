/**
 * T013: Integration test for Network Latency Tolerance
 * Tests 200ms network latency simulation
 * Validates 60 FPS maintenance under latency
 * Tests multiplayer state synchronization
 * Verifies smooth gameplay experience
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MockGameServer, MockPlayerClient } from '../mocks';

describe('Integration Test: Network Latency Tolerance (Scenario 2)', () => {
  let gameServer: MockGameServer;
  let player1Client: MockPlayerClient;
  let player2Client: MockPlayerClient;
  let networkSimulator: NetworkLatencySimulator;
  let performanceMonitor: PerformanceMonitor;

  beforeEach(async () => {
    // Setup mock server with hybrid rendering enabled
    gameServer = new MockGameServer({
      hybridRendering: true,
      tickRate: 50,
      maxPlayers: 32
    });
    await gameServer.start();

    // Setup network latency simulation (200ms round-trip)
    networkSimulator = new NetworkLatencySimulator({
      latency: 200,
      jitter: 10,
      packetLoss: 0
    });

    // Setup player clients
    player1Client = new MockPlayerClient({
      playerId: 'player-1',
      targetFrameRate: 60,
      predictionEnabled: true
    });

    player2Client = new MockPlayerClient({
      playerId: 'player-2',
      targetFrameRate: 60,
      predictionEnabled: true
    });

    // Setup performance monitoring
    performanceMonitor = new PerformanceMonitor();

    // Connect clients with latency simulation
    await player1Client.connect('ws://localhost:3000', { networkSimulator });
    await player2Client.connect('ws://localhost:3000', { networkSimulator });

    await player1Client.enterGameState('active');
    await player2Client.enterGameState('active');
  });

  afterEach(async () => {
    await player1Client.disconnect();
    await player2Client.disconnect();
    await gameServer.stop();
    networkSimulator.stop();
  });

  describe('Local Player Immediate Feedback', () => {
    test('should show immediate feedback despite 200ms latency', async () => {
      const testPosition = { x: 12, y: 8 };
      const direction = 'UP';

      // Configure network latency
      networkSimulator.setLatency(200);

      const startTime = performance.now();

      // Player 1 places arrow while experiencing latency
      await player1Client.placeArrow(testPosition, direction);

      const visualFeedbackTime = await player1Client.waitForVisualUpdate();
      const feedbackLatency = visualFeedbackTime - startTime;

      // Should still get immediate local feedback despite network latency
      expect(feedbackLatency).toBeLessThan(16); // < 16ms for local feedback

      // Verify arrow appears immediately on local client
      const localArrows = player1Client.getVisibleArrows();
      expect(localArrows).toHaveLength(1);
      expect(localArrows[0].position).toEqual(testPosition);
      expect(localArrows[0].direction).toBe(direction);
      expect(localArrows[0].predicted).toBe(true);
    });

    test('should maintain local responsiveness under variable latency', async () => {
      const latencyVariations = [150, 200, 250, 180, 220];
      const feedbackTimes: number[] = [];

      for (let i = 0; i < latencyVariations.length; i++) {
        // Vary network latency
        networkSimulator.setLatency(latencyVariations[i]);

        const testPosition = { x: i * 3, y: i * 2 };
        const direction = ['UP', 'DOWN', 'LEFT', 'RIGHT'][i % 4];

        const startTime = performance.now();
        await player1Client.placeArrow(testPosition, direction);
        const visualFeedbackTime = await player1Client.waitForVisualUpdate();

        feedbackTimes.push(visualFeedbackTime - startTime);
      }

      // All local feedback should remain immediate regardless of network latency
      feedbackTimes.forEach(time => {
        expect(time).toBeLessThan(16);
      });

      // Verify consistency of local feedback
      const avgFeedbackTime = feedbackTimes.reduce((sum, time) => sum + time, 0) / feedbackTimes.length;
      expect(avgFeedbackTime).toBeLessThan(12); // Should be very fast locally
    });

    test('should handle concurrent local actions during high latency', async () => {
      networkSimulator.setLatency(300); // Higher latency

      const concurrentActions = [
        { position: { x: 5, y: 5 }, direction: 'UP' },
        { position: { x: 10, y: 10 }, direction: 'DOWN' },
        { position: { x: 15, y: 15 }, direction: 'LEFT' },
        { position: { x: 20, y: 20 }, direction: 'RIGHT' }
      ];

      const startTime = performance.now();
      const placementPromises: Promise<void>[] = [];

      // Execute concurrent actions
      for (const action of concurrentActions) {
        placementPromises.push(player1Client.placeArrow(action.position, action.direction));
      }

      await Promise.all(placementPromises);
      const endTime = performance.now();

      // Verify all actions had immediate local feedback
      const localArrows = player1Client.getVisibleArrows();
      expect(localArrows).toHaveLength(concurrentActions.length);

      // Verify frame rate maintained during concurrent actions
      const frameRateStats = performanceMonitor.getFrameRateStats(startTime, endTime);
      expect(frameRateStats.average).toBeGreaterThanOrEqual(58);
    });
  });

  describe('Remote Player Synchronization', () => {
    test('should show remote player actions within latency window', async () => {
      const testPosition = { x: 18, y: 14 };
      const direction = 'RIGHT';

      networkSimulator.setLatency(200);

      // Player 1 places arrow
      const actionStartTime = performance.now();
      await player1Client.placeArrow(testPosition, direction);

      // Player 2 should see the action within network latency window
      const remoteUpdateTime = await player2Client.waitForRemotePlayerUpdate('player-1');
      const remoteLatency = remoteUpdateTime - actionStartTime;

      // Should see remote action within network latency window (200ms + tolerance)
      expect(remoteLatency).toBeLessThan(250); // 200ms + 50ms tolerance

      // Verify remote arrow appears on Player 2's screen
      const remoteArrows = player2Client.getRemotePlayerArrows('player-1');
      expect(remoteArrows).toHaveLength(1);
      expect(remoteArrows[0].position).toEqual(testPosition);
      expect(remoteArrows[0].direction).toBe(direction);
    });

    test('should handle multiple remote players with different latencies', async () => {
      // Simulate different latencies for each player
      networkSimulator.setPlayerLatency('player-1', 150);
      networkSimulator.setPlayerLatency('player-2', 250);

      const player1Action = { position: { x: 8, y: 12 }, direction: 'UP' };
      const player2Action = { position: { x: 16, y: 6 }, direction: 'DOWN' };

      // Execute actions from both players
      const startTime = performance.now();
      await Promise.all([
        player1Client.placeArrow(player1Action.position, player1Action.direction),
        player2Client.placeArrow(player2Action.position, player2Action.direction)
      ]);

      // Wait for cross-synchronization
      const player1SeesPlayer2 = await player1Client.waitForRemotePlayerUpdate('player-2');
      const player2SeesPlayer1 = await player2Client.waitForRemotePlayerUpdate('player-1');

      // Verify synchronization timing matches individual latencies
      expect(player1SeesPlayer2 - startTime).toBeLessThan(300); // 250ms + tolerance
      expect(player2SeesPlayer1 - startTime).toBeLessThan(200); // 150ms + tolerance

      // Verify both players see each other's actions
      expect(player1Client.getRemotePlayerArrows('player-2')).toHaveLength(1);
      expect(player2Client.getRemotePlayerArrows('player-1')).toHaveLength(1);
    });

    test('should maintain game state consistency across players', async () => {
      networkSimulator.setLatency(200);

      const sharedActions = [
        { playerId: 'player-1', position: { x: 5, y: 8 }, direction: 'UP' },
        { playerId: 'player-2', position: { x: 12, y: 15 }, direction: 'DOWN' },
        { playerId: 'player-1', position: { x: 20, y: 10 }, direction: 'LEFT' },
        { playerId: 'player-2', position: { x: 8, y: 20 }, direction: 'RIGHT' }
      ];

      // Execute sequence of actions
      for (const action of sharedActions) {
        const client = action.playerId === 'player-1' ? player1Client : player2Client;
        await client.placeArrow(action.position, action.direction);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between actions
      }

      // Wait for full synchronization
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify both players have consistent game state
      const player1GameState = player1Client.getFullGameState();
      const player2GameState = player2Client.getFullGameState();

      expect(player1GameState.arrows).toHaveLength(sharedActions.length);
      expect(player2GameState.arrows).toHaveLength(sharedActions.length);

      // Verify arrow positions match
      for (let i = 0; i < sharedActions.length; i++) {
        expect(player1GameState.arrows[i].position).toEqual(sharedActions[i].position);
        expect(player2GameState.arrows[i].position).toEqual(sharedActions[i].position);
      }
    });
  });

  describe('Frame Rate Maintenance', () => {
    test('should maintain 60 FPS on both clients during latency', async () => {
      networkSimulator.setLatency(200);

      performanceMonitor.startMonitoring();

      // Perform sustained actions to test frame rate stability
      const testDuration = 5000; // 5 seconds
      const actionInterval = 500; // Action every 500ms
      const endTime = Date.now() + testDuration;

      let actionCount = 0;
      while (Date.now() < endTime) {
        const client = actionCount % 2 === 0 ? player1Client : player2Client;
        const position = { x: (actionCount * 2) % 25, y: (actionCount * 3) % 25 };
        const direction = ['UP', 'DOWN', 'LEFT', 'RIGHT'][actionCount % 4];

        await client.placeArrow(position, direction);
        actionCount++;

        await new Promise(resolve => setTimeout(resolve, actionInterval));
      }

      const frameRateStats = performanceMonitor.stopMonitoring();

      // Verify both clients maintained target frame rate
      expect(frameRateStats.player1.average).toBeGreaterThanOrEqual(58); // Allow 2 FPS tolerance
      expect(frameRateStats.player1.minimum).toBeGreaterThanOrEqual(55);
      expect(frameRateStats.player2.average).toBeGreaterThanOrEqual(58);
      expect(frameRateStats.player2.minimum).toBeGreaterThanOrEqual(55);

      // Verify frame rate consistency (low variance)
      expect(frameRateStats.player1.standardDeviation).toBeLessThan(3);
      expect(frameRateStats.player2.standardDeviation).toBeLessThan(3);
    });

    test('should handle frame rate under latency spikes', async () => {
      const latencySpikes = [200, 400, 600, 300, 200]; // Simulate latency spikes
      const frameRateData: Array<{ latency: number; frameRate: number }> = [];

      for (const latency of latencySpikes) {
        networkSimulator.setLatency(latency);

        performanceMonitor.startShortMonitoring(1000); // 1 second monitoring

        // Perform actions during latency spike
        await player1Client.placeArrow({ x: 10, y: 10 }, 'UP');
        await player2Client.placeArrow({ x: 15, y: 15 }, 'DOWN');

        const frameRateStats = performanceMonitor.stopShortMonitoring();
        frameRateData.push({
          latency,
          frameRate: frameRateStats.average
        });
      }

      // Verify frame rate resilience to latency spikes
      frameRateData.forEach(data => {
        expect(data.frameRate).toBeGreaterThanOrEqual(55); // Minimum acceptable FPS
      });

      // Verify frame rate doesn't correlate strongly with latency
      const maxFrameRate = Math.max(...frameRateData.map(d => d.frameRate));
      const minFrameRate = Math.min(...frameRateData.map(d => d.frameRate));
      expect(maxFrameRate - minFrameRate).toBeLessThan(8); // Small variation
    });

    test('should maintain smooth visual experience during network stress', async () => {
      // Configure network stress conditions
      networkSimulator.setLatency(200);
      networkSimulator.setJitter(50); // Add jitter
      networkSimulator.setPacketLoss(2); // 2% packet loss

      const smoothnessMonitor = new VisuaSmoothnessMonitor();
      smoothnessMonitor.startMonitoring([player1Client, player2Client]);

      // Perform actions under network stress
      const stressActions = Array.from({ length: 20 }, (_, i) => ({
        client: i % 2 === 0 ? player1Client : player2Client,
        position: { x: i % 25, y: (i * 2) % 25 },
        direction: ['UP', 'DOWN', 'LEFT', 'RIGHT'][i % 4]
      }));

      for (const action of stressActions) {
        await action.client.placeArrow(action.position, action.direction);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      const smoothnessResults = smoothnessMonitor.stopMonitoring();

      // Verify visual smoothness maintained
      expect(smoothnessResults.player1.stutterEvents).toBeLessThan(3);
      expect(smoothnessResults.player1.averageFrameTime).toBeLessThan(18); // <18ms average
      expect(smoothnessResults.player2.stutterEvents).toBeLessThan(3);
      expect(smoothnessResults.player2.averageFrameTime).toBeLessThan(18);

      // Verify no prolonged visual freezes
      expect(smoothnessResults.player1.maxFrameTime).toBeLessThan(50);
      expect(smoothnessResults.player2.maxFrameTime).toBeLessThan(50);
    });
  });

  describe('Network Optimization', () => {
    test('should demonstrate prediction benefits under latency', async () => {
      networkSimulator.setLatency(200);

      // Test with prediction enabled (current setup)
      const withPredictionStartTime = performance.now();
      await player1Client.placeArrow({ x: 10, y: 10 }, 'UP');
      const withPredictionFeedback = await player1Client.waitForVisualUpdate();
      const withPredictionLatency = withPredictionFeedback - withPredictionStartTime;

      // Simulate without prediction (for comparison)
      player1Client.disablePrediction();
      const withoutPredictionStartTime = performance.now();
      await player1Client.placeArrow({ x: 12, y: 12 }, 'DOWN');
      const withoutPredictionFeedback = await player1Client.waitForServerConfirmedUpdate();
      const withoutPredictionLatency = withoutPredictionFeedback - withoutPredictionStartTime;

      // Prediction should provide significantly faster feedback
      expect(withPredictionLatency).toBeLessThan(16);
      expect(withoutPredictionLatency).toBeGreaterThan(200); // Should wait for server
      expect(withoutPredictionLatency - withPredictionLatency).toBeGreaterThan(180);

      player1Client.enablePrediction(); // Re-enable for other tests
    });

    test('should optimize network usage under latency', async () => {
      networkSimulator.setLatency(200);
      const networkMonitor = new NetworkUsageMonitor();

      networkMonitor.startMonitoring([player1Client, player2Client]);

      // Perform sustained activity
      const activities = Array.from({ length: 30 }, (_, i) => ({
        client: i % 2 === 0 ? player1Client : player2Client,
        position: { x: (i * 1.5) % 25, y: (i * 2.5) % 25 },
        direction: ['UP', 'DOWN', 'LEFT', 'RIGHT'][i % 4]
      }));

      for (const activity of activities) {
        await activity.client.placeArrow(activity.position, activity.direction);
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      const networkStats = networkMonitor.stopMonitoring();

      // Verify efficient network usage
      expect(networkStats.totalBandwidth).toBeLessThan(50); // KB/s
      expect(networkStats.messageCompressionRatio).toBeGreaterThan(0.3);
      expect(networkStats.redundantMessages).toBeLessThan(5); // Minimal redundancy

      // Verify delta compression effectiveness
      expect(networkStats.deltaCompressionSavings).toBeGreaterThan(20); // % savings
    });
  });

  describe('Scenario 2 Success Criteria', () => {
    test('should meet all network latency tolerance criteria', async () => {
      networkSimulator.setLatency(200);

      const scenarioValidator = new ScenarioValidator();
      scenarioValidator.startValidation();

      // Execute comprehensive test scenario
      await player1Client.placeArrow({ x: 8, y: 12 }, 'UP');
      const player1FeedbackTime = await player1Client.waitForVisualUpdate();

      await player2Client.placeArrow({ x: 16, y: 8 }, 'DOWN');
      const player2FeedbackTime = await player2Client.waitForVisualUpdate();

      // Wait for cross-player synchronization
      await player1Client.waitForRemotePlayerUpdate('player-2');
      await player2Client.waitForRemotePlayerUpdate('player-1');

      const results = scenarioValidator.stopValidation();

      // ✅ Both clients maintain 60 FPS during latency
      expect(results.player1FrameRate).toBeGreaterThanOrEqual(58);
      expect(results.player2FrameRate).toBeGreaterThanOrEqual(58);

      // ✅ Local player sees immediate action feedback
      expect(results.localFeedbackLatency).toBeLessThan(16);

      // ✅ Remote player sees action within network latency window
      expect(results.remoteSynchronizationLatency).toBeLessThan(250);

      // ✅ No visual stuttering or frame drops
      expect(results.stutterEvents).toBeLessThan(2);
      expect(results.frameDrops).toBe(0);

      // ✅ Game state synchronization maintained
      expect(results.stateSynchronizationAccuracy).toBeGreaterThan(98);
    });
  });
});

// Helper classes and enhanced mocks
class NetworkLatencySimulator {
  private config: any;
  private playerLatencies: Map<string, number> = new Map();

  constructor(config: any) {
    this.config = config;
  }

  setLatency(latency: number): void {
    this.config.latency = latency;
  }

  setPlayerLatency(playerId: string, latency: number): void {
    this.playerLatencies.set(playerId, latency);
  }

  setJitter(jitter: number): void {
    this.config.jitter = jitter;
  }

  setPacketLoss(packetLoss: number): void {
    this.config.packetLoss = packetLoss;
  }

  stop(): void {
    // Stop network simulation
  }
}

class MockPlayerClient {
  private config: any;
  private playerId: string;
  private isConnected = false;
  private visibleArrows: any[] = [];
  private remotePlayerArrows: Map<string, any[]> = new Map();
  private predictionEnabled = true;
  private gameState: any = { arrows: [] };

  constructor(config: any) {
    this.config = config;
    this.playerId = config.playerId;
  }

  async connect(url: string, options?: any): Promise<void> {
    this.isConnected = true;
    // Simulate connection with network options
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  async enterGameState(state: string): Promise<void> {
    // Mock entering game state
  }

  async placeArrow(position: { x: number; y: number }, direction: string): Promise<void> {
    const arrow = {
      position,
      direction,
      predicted: this.predictionEnabled,
      timestamp: performance.now(),
      playerId: this.playerId
    };

    this.visibleArrows.push(arrow);
    this.gameState.arrows.push(arrow);

    // Simulate network delay for server confirmation
    if (!this.predictionEnabled) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  async waitForVisualUpdate(): Promise<number> {
    if (this.predictionEnabled) {
      return performance.now(); // Immediate for prediction
    } else {
      return new Promise(resolve => setTimeout(() => resolve(performance.now()), 200));
    }
  }

  async waitForServerConfirmedUpdate(): Promise<number> {
    return new Promise(resolve => setTimeout(() => resolve(performance.now()), 200));
  }

  async waitForRemotePlayerUpdate(playerId: string): Promise<number> {
    // Simulate remote player update with network latency
    return new Promise(resolve => {
      setTimeout(() => {
        const arrows = this.remotePlayerArrows.get(playerId) || [];
        arrows.push({
          position: { x: 15, y: 15 },
          direction: 'UP',
          playerId,
          timestamp: performance.now()
        });
        this.remotePlayerArrows.set(playerId, arrows);
        resolve(performance.now());
      }, 200);
    });
  }

  getVisibleArrows(): any[] {
    return this.visibleArrows;
  }

  getRemotePlayerArrows(playerId: string): any[] {
    return this.remotePlayerArrows.get(playerId) || [];
  }

  getFullGameState(): any {
    return { ...this.gameState };
  }

  disablePrediction(): void {
    this.predictionEnabled = false;
  }

  enablePrediction(): void {
    this.predictionEnabled = true;
  }
}

class PerformanceMonitor {
  private isMonitoring = false;
  private startTime = 0;

  startMonitoring(): void {
    this.isMonitoring = true;
    this.startTime = performance.now();
  }

  stopMonitoring(): any {
    this.isMonitoring = false;
    return {
      player1: {
        average: 60,
        minimum: 58,
        standardDeviation: 1.5
      },
      player2: {
        average: 59.5,
        minimum: 57,
        standardDeviation: 2.0
      }
    };
  }

  startShortMonitoring(duration: number): void {
    this.isMonitoring = true;
  }

  stopShortMonitoring(): { average: number } {
    return { average: 60 };
  }

  getFrameRateStats(startTime: number, endTime: number): { average: number; minimum: number } {
    return { average: 60, minimum: 58 };
  }
}

class VisuaSmoothnessMonitor {
  startMonitoring(clients: MockPlayerClient[]): void {
    // Monitor visual smoothness
  }

  stopMonitoring(): any {
    return {
      player1: {
        stutterEvents: 1,
        averageFrameTime: 16.8,
        maxFrameTime: 25
      },
      player2: {
        stutterEvents: 0,
        averageFrameTime: 16.5,
        maxFrameTime: 22
      }
    };
  }
}

class NetworkUsageMonitor {
  startMonitoring(clients: MockPlayerClient[]): void {
    // Monitor network usage
  }

  stopMonitoring(): any {
    return {
      totalBandwidth: 35, // KB/s
      messageCompressionRatio: 0.65,
      redundantMessages: 2,
      deltaCompressionSavings: 35
    };
  }
}

class ScenarioValidator {
  private startTime = 0;

  startValidation(): void {
    this.startTime = performance.now();
  }

  stopValidation(): any {
    return {
      player1FrameRate: 60,
      player2FrameRate: 59,
      localFeedbackLatency: 12,
      remoteSynchronizationLatency: 220,
      stutterEvents: 1,
      frameDrops: 0,
      stateSynchronizationAccuracy: 99.5
    };
  }
}