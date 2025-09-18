import {WebSocket} from "ws";
import {v4 as uuid} from 'uuid';
import {colors} from "./colors";
import {Arrow} from "./game/arrow";
import {MovingObject} from "./game/moving-object";
import {Cat} from "./game/cat";
import {Mouse} from "./game/mouse";
import {CONFIG} from "../browser/common/config";
import {PlayerState} from "./messages_pb";
import {Direction} from "./direction";
import {PlayerInput, PlayerInputFactory, InputBuffer, InputRateLimiter, InputType} from "./models/player-input";
import {RollbackManager} from "./prediction/rollback-manager";

export class Player {
  connected = true;
  color: string = '#000000';
  name = 'Player';
  key: string;
  ws?: WebSocket;
  time: number = 0;

  position: [number, number] = [0, 0];
  arrows: Arrow[] = [];

  totalPoints = 0;
  ratio: number = 0;

  // T038: Prediction Enhancement Properties
  private inputBuffer: InputBuffer;
  private inputSequence: number = 0;
  private rateLimiter: InputRateLimiter;
  private rollbackManager?: RollbackManager;
  private lastInputTime: number = 0;
  private predictionEnabled: boolean = true;
  private performanceMetrics: {
    inputsProcessed: number;
    predictionsValidated: number;
    rollbacksApplied: number;
    averageLatency: number;
    lastMetricsReset: number;
  };

  constructor(name: string, key?: string) {
    this.name = name;
    this.key = key ?? uuid();

    // T038: Initialize prediction components
    this.inputBuffer = new InputBuffer();
    this.rateLimiter = new InputRateLimiter();
    this.performanceMetrics = {
      inputsProcessed: 0,
      predictionsValidated: 0,
      rollbacksApplied: 0,
      averageLatency: 0,
      lastMetricsReset: Date.now()
    };
  }

  connect(ws?: WebSocket) {
    this.connected = true;
    this.ws = ws;
  }

  init(idx: number) {
    this.color = colors[idx];
    this.updateRatio();
  }

  disconnect() {
    this.connected = false;
    this.ws = undefined;
  }

  move(payload: { type: "input"; x: number; y: number }) {
    const targetPosition = [Math.round(payload.x * CONFIG.GLOBAL_WIDTH), Math.round(payload.y * CONFIG.GLOBAL_HEIGHT)] as [number, number];

    // T038: Process movement input with prediction
    this.processMovementInput(targetPosition);

    this.position = targetPosition;
  }

  /**
   * T038: Process movement input with prediction validation
   */
  private processMovementInput(targetPosition: [number, number]): void {
    if (!this.predictionEnabled) {
      return;
    }

    // Create predictive input
    const input = PlayerInputFactory.createMovement(
      this.key,
      { x: targetPosition[0], y: targetPosition[1] },
      undefined, // velocity will be calculated
      this.inputSequence++
    );

    // Validate rate limiting
    if (!this.rateLimiter.canSendInput(this.key)) {
      input.reject('Rate limit exceeded');
      return;
    }

    // Record input and add to buffer
    this.rateLimiter.recordInput(this.key);
    this.inputBuffer.addInput(input);
    this.lastInputTime = Date.now();
    this.performanceMetrics.inputsProcessed++;
  }

  state() {
    return {
      colorIndex: colors.indexOf(this.color),
      name: this.name,
      position: this.position,
      totalPoints: this.totalPoints,
      arrows: this.arrows.map(a => a.state())
    };
  }

  reward(time: number) {
    this.time += time;
    this.updateRatio();

    // T038: Enhanced score message with prediction support
    this.ws?.send(JSON.stringify({
      type: 'score',
      score: this.totalPoints,
      time: this.time,
      timestamp: Date.now(),
      sequence: this.inputSequence
    }));
  }

  queued() {
    this.ws?.send(JSON.stringify({type: 'queued', color: this.color}));
  }

  stopWait() {
    this.ws?.send(JSON.stringify({type: 'wait-over', color: this.color}));
  }

  canQueue() {
    this.ws?.send(JSON.stringify({type: 'can-queue'}));
  }

  static from(playerObj: Player) {
    const player = new Player(playerObj.name, playerObj.key);
    player.totalPoints = playerObj.totalPoints;
    player.time = playerObj.time;
    player.connected = false;
    return player;
  }

  serializable() {
    return {
      totalPoints: this.totalPoints,
      time: this.time,
      name: this.name,
      key: this.key,
    };
  }

  public updateRatio() {
    this.ratio = (this.totalPoints) / (this.time + 1000);
  }

  absorb(absorbedObject: MovingObject) {
    const previousPoints = this.totalPoints;

    if (absorbedObject instanceof Cat) {
      this.totalPoints = Math.round(this.totalPoints * CONFIG.PLAYER_ABSORB_CAT_RATIO);
    }
    if (absorbedObject instanceof Mouse) {
      this.totalPoints += CONFIG.PLAYER_ABSORB_MOUSE_POINTS;
    }

    // T038: Track score changes for prediction validation
    if (this.totalPoints !== previousPoints) {
      this.updateRatio();

      // Send updated score to client
      this.ws?.send(JSON.stringify({
        type: 'score',
        score: this.totalPoints,
        timestamp: Date.now(),
        sequence: this.inputSequence
      }));
    }
  }

  arrow(payload: {
    type: "arrow";
    direction: Direction;
    key: string
  }, position: [number, number], forbiddenPlaces: MovingObject[]) {
    if (this.arrows.length > 2) {
      this.arrows.shift();
    }
    const cellWidth = CONFIG.GLOBAL_WIDTH / CONFIG.COLUMNS;
    const cellHeight = CONFIG.GLOBAL_HEIGHT / CONFIG.ROWS;
    // Centrer l'input sur la case la plus proche
    const gridAligned = [
      Math.floor((position[0]) / cellWidth) * cellWidth,
      Math.floor((position[1]) / cellHeight) * cellHeight
    ] as [number, number];
    // Vérification : ne pas placer de flèche sur un wall ou un goal
    const isOnForbiddenPlace = forbiddenPlaces.some(obj => obj.collides({position} as MovingObject, obj.norm * 2));
    if (isOnForbiddenPlace) {
      return;
    }

    // T038: Process arrow placement with prediction
    this.processArrowPlacementInput(gridAligned, payload.direction);

    this.arrows.push(new Arrow(gridAligned, payload.direction, this));
  }

  /**
   * T038: Process arrow placement input with prediction validation
   */
  private processArrowPlacementInput(position: [number, number], direction: Direction): void {
    if (!this.predictionEnabled) {
      return;
    }

    // Create predictive input
    const input = PlayerInputFactory.createArrowPlacement(
      this.key,
      { x: position[0], y: position[1] },
      direction,
      this.inputSequence++
    );

    // Validate rate limiting
    if (!this.rateLimiter.canSendInput(this.key)) {
      input.reject('Rate limit exceeded');
      return;
    }

    // Record input and add to buffer
    this.rateLimiter.recordInput(this.key);
    this.inputBuffer.addInput(input);
    this.lastInputTime = Date.now();
    this.performanceMetrics.inputsProcessed++;
  }

  /**
   * T038: Set rollback manager for prediction validation
   */
  setRollbackManager(rollbackManager: RollbackManager): void {
    this.rollbackManager = rollbackManager;
  }

  /**
   * T038: Enable or disable prediction for this player
   */
  setPredictionEnabled(enabled: boolean): void {
    this.predictionEnabled = enabled;
  }

  /**
   * T038: Validate a prediction against server result
   */
  validatePrediction(inputId: string, serverResult: any): { success: boolean; requiresRollback: boolean } {
    const input = this.inputBuffer.getInput(inputId);
    if (!input) {
      return { success: false, requiresRollback: false };
    }

    // Acknowledge successful input
    if (serverResult.success) {
      input.acknowledge(Date.now(), serverResult.processingTime || 0);
      this.performanceMetrics.predictionsValidated++;
      return { success: true, requiresRollback: false };
    }

    // Handle prediction failure
    input.reject(serverResult.reason || 'Server rejected input');

    // Check if rollback is needed
    const requiresRollback = this.rollbackManager && serverResult.requiresRollback;
    if (requiresRollback) {
      this.performanceMetrics.rollbacksApplied++;
    }

    return { success: false, requiresRollback: !!requiresRollback };
  }

  /**
   * T038: Apply rollback correction
   */
  applyRollbackCorrection(correctedState: any): void {
    if (!this.rollbackManager) {
      return;
    }

    // Apply position correction if needed
    if (correctedState.position) {
      const currentPos = { x: this.position[0], y: this.position[1] };
      const correctedPos = correctedState.position;

      this.rollbackManager.applySmoothCorrection(
        this.key,
        currentPos,
        correctedPos
      );

      // Update position after smooth correction
      this.position = [correctedPos.x, correctedPos.y];
    }

    // Apply arrow corrections
    if (correctedState.arrows) {
      this.arrows = correctedState.arrows.map((arrowData: any) =>
        new Arrow([arrowData.x, arrowData.y], arrowData.direction, this)
      );
    }

    // Apply score correction
    if (correctedState.score !== undefined) {
      this.totalPoints = correctedState.score;
      this.updateRatio();
    }

    this.performanceMetrics.rollbacksApplied++;
  }

  /**
   * T038: Get pending inputs for this player
   */
  getPendingInputs(): PlayerInput[] {
    return this.inputBuffer.getPendingInputs(this.key);
  }

  /**
   * T038: Process input acknowledgments and timeouts
   */
  processInputTimeouts(): void {
    // Process any timed out inputs
    const timedOutInputs = this.inputBuffer.processTimeouts();

    if (timedOutInputs.length > 0) {
      console.warn(`Player ${this.name} has ${timedOutInputs.length} timed out inputs`);
    }
  }

  /**
   * T038: Get player performance metrics
   */
  getPerformanceMetrics(): {
    playerId: string;
    inputsProcessed: number;
    predictionsValidated: number;
    rollbacksApplied: number;
    accuracyRate: number;
    averageLatency: number;
    lastInputTime: number;
    uptime: number;
  } {
    const now = Date.now();
    const uptime = now - this.performanceMetrics.lastMetricsReset;
    const accuracyRate = this.performanceMetrics.inputsProcessed > 0
      ? (this.performanceMetrics.predictionsValidated / this.performanceMetrics.inputsProcessed)
      : 0;

    return {
      playerId: this.key,
      inputsProcessed: this.performanceMetrics.inputsProcessed,
      predictionsValidated: this.performanceMetrics.predictionsValidated,
      rollbacksApplied: this.performanceMetrics.rollbacksApplied,
      accuracyRate,
      averageLatency: this.performanceMetrics.averageLatency,
      lastInputTime: this.lastInputTime,
      uptime
    };
  }

  /**
   * T038: Reset performance metrics
   */
  resetPerformanceMetrics(): void {
    this.performanceMetrics = {
      inputsProcessed: 0,
      predictionsValidated: 0,
      rollbacksApplied: 0,
      averageLatency: 0,
      lastMetricsReset: Date.now()
    };
  }

  /**
   * T038: Update average latency for performance tracking
   */
  updateLatency(newLatency: number): void {
    const alpha = 0.1; // Exponential moving average factor
    this.performanceMetrics.averageLatency =
      (this.performanceMetrics.averageLatency * (1 - alpha)) + (newLatency * alpha);
  }

  /**
   * T038: Cleanup old inputs and perform maintenance
   */
  cleanup(): void {
    this.inputBuffer.cleanup();
    this.processInputTimeouts();
  }

  /**
   * T038: Enhanced serializable with prediction data
   */
  serializableWithPrediction() {
    return {
      ...this.serializable(),
      position: this.position,
      arrows: this.arrows.map(arrow => arrow.state()),
      predictionEnabled: this.predictionEnabled,
      lastInputTime: this.lastInputTime,
      performance: this.getPerformanceMetrics()
    };
  }
}
