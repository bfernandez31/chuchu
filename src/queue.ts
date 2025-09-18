import {Player} from "./player";
import {Game} from "./game";
import {DataMsg} from "./data.message";
import {WebSocket} from "ws";
import * as fs from "fs";
import {CONFIG} from "../browser/common/config";
import {Bot} from "./bot";
import { encodeServerMessage, ServerMessage, Long } from './messages_pb';

/**
 * Enhanced WebSocket batcher with delta compression, adaptive batching, and priority-based message handling
 * Supports hybrid predictive rendering with delta compression and rollback correction distribution
 */

// Helper function to convert number to Long
function toLong(value: number): Long {
  return {
    low: value & 0xFFFFFFFF,
    high: Math.floor(value / 0x100000000),
    unsigned: false
  };
}
class WebSocketBatcher {
  private pendingUpdates = new Set<string>();
  private priorityQueue: { message: any, priority: 'high' | 'medium' | 'low' }[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private adaptiveBatchDelay = 5; // ms - adaptive delay based on load
  private compressionRatios: number[] = [];
  private queue: Queue;

  constructor(queue: Queue) {
    this.queue = queue;
  }

  /**
   * Schedule update for batched sending with adaptive delay
   */
  scheduleUpdate(updateType: 'game' | 'queue' | 'highscore' | 'delta' | 'rollback' | 'acknowledgment') {
    this.pendingUpdates.add(updateType);

    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flushUpdates();
      }, this.adaptiveBatchDelay);
    }
  }

  /**
   * Send immediate update for critical messages
   */
  sendImmediate(updateType: 'game' | 'queue' | 'highscore' | 'delta' | 'rollback' | 'acknowledgment') {
    this.pendingUpdates.add(updateType);
    this.flushUpdates();
  }

  /**
   * Add priority message to queue
   */
  addPriorityMessage(message: any, priority: 'high' | 'medium' | 'low' = 'medium') {
    this.priorityQueue.push({ message, priority });

    if (priority === 'high') {
      this.flushPriorityMessages();
    }
  }

  /**
   * Handle new predictiveInput message type
   */
  handlePredictiveInput(playerId: string, input: any, prediction: any) {
    const message = {
      type: 'input-acknowledgment',
      playerId,
      acknowledgedSequence: input.sequence,
      processingTime: Date.now() - input.timestamp
    };

    this.addPriorityMessage(message, 'high');
  }

  /**
   * Handle rollback correction distribution
   */
  distributeRollbackCorrection(correction: any) {
    const message = {
      type: 'rollback-correction',
      correction
    };

    this.addPriorityMessage(message, 'high');
  }

  /**
   * Process and send all pending updates
   */
  private flushUpdates() {
    // Process priority messages first
    this.flushPriorityMessages();

    // Process standard updates
    if (this.pendingUpdates.has('game')) {
      this.queue.sendGameToServerInternal();
    }
    if (this.pendingUpdates.has('delta')) {
      this.queue.sendDeltaGameStateInternal();
    }
    if (this.pendingUpdates.has('queue')) {
      this.queue.sendQueueUpdateInternal();
    }
    if (this.pendingUpdates.has('highscore')) {
      this.queue.sendHighScoreToServerInternal();
    }

    this.pendingUpdates.clear();
    this.batchTimer = null;

    // Adapt batch delay based on current load
    this.adaptBatchDelay();
  }

  /**
   * Flush priority messages immediately
   */
  private flushPriorityMessages() {
    // Sort by priority: high > medium > low
    this.priorityQueue.sort((a, b) => {
      const priorities = { high: 3, medium: 2, low: 1 };
      return priorities[b.priority] - priorities[a.priority];
    });

    // Send priority messages
    this.priorityQueue.forEach(({ message }) => {
      this.queue.sendPriorityMessage(message);
    });

    this.priorityQueue = [];
  }

  /**
   * Adapt batch delay based on compression ratios and load
   */
  private adaptBatchDelay() {
    const avgCompressionRatio = this.compressionRatios.length > 0
      ? this.compressionRatios.reduce((a, b) => a + b) / this.compressionRatios.length
      : 0.5;

    // Lower compression ratio = more changes = longer delay to batch more
    // Higher compression ratio = fewer changes = shorter delay for responsiveness
    this.adaptiveBatchDelay = Math.max(3, Math.min(15, 5 + (1 - avgCompressionRatio) * 10));

    // Keep only recent compression ratios
    if (this.compressionRatios.length > 10) {
      this.compressionRatios = this.compressionRatios.slice(-10);
    }
  }

  /**
   * Track compression ratio for adaptive optimization
   */
  trackCompressionRatio(ratio: number) {
    this.compressionRatios.push(ratio);
  }

  /**
   * Force sending of all pending updates (for cleanup)
   */
  flush() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.flushUpdates();
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics() {
    return {
      adaptiveBatchDelay: this.adaptiveBatchDelay,
      averageCompressionRatio: this.compressionRatios.length > 0
        ? this.compressionRatios.reduce((a, b) => a + b) / this.compressionRatios.length
        : 0,
      pendingUpdatesCount: this.pendingUpdates.size,
      priorityQueueSize: this.priorityQueue.length
    };
  }
}

/**
 * Gestionnaire de fréquence adaptative pour optimiser les performances
 * selon le nombre de joueurs et d'entités dans le jeu
 */
class AdaptiveGameLoop {
  private currentFrequency: number = CONFIG.GAME_LOOP_MS;

  /**
   * Calcule la fréquence optimale basée sur la charge du jeu
   */
  calculateOptimalFrequency(playerCount: number, entityCount: number): number {
    if (!CONFIG.ADAPTIVE_FREQUENCY) {
      return CONFIG.GAME_LOOP_MS;
    }

    // Formule adaptative : plus de joueurs/entités = fréquence plus lente
    const baseFrequency = CONFIG.GAME_LOOP_MIN_MS;

    // Facteur basé sur le nombre de joueurs (moins critique)
    const playerFactor = Math.floor(playerCount / 8) * 5;

    // Facteur basé sur le nombre d'entités (plus critique)
    const entityFactor = Math.floor(entityCount / 50) * 3;

    // Calcul de la fréquence avec contraintes min/max
    const calculatedFrequency = baseFrequency + playerFactor + entityFactor;

    this.currentFrequency = Math.max(
      CONFIG.GAME_LOOP_MIN_MS,
      Math.min(CONFIG.GAME_LOOP_MAX_MS, calculatedFrequency)
    );

    return this.currentFrequency;
  }

  /**
   * Retourne la fréquence actuelle
   */
  getCurrentFrequency(): number {
    return this.currentFrequency;
  }

  /**
   * Log des informations de performance (pour debug)
   */
  logPerformanceInfo(playerCount: number, entityCount: number): void {
    if (CONFIG.ADAPTIVE_FREQUENCY) {
      console.log(`[AdaptiveLoop] Players: ${playerCount}, Entities: ${entityCount}, Frequency: ${this.currentFrequency}ms (${Math.round(1000/this.currentFrequency)} FPS)`);
    }
  }
}

export class Queue {
  players = [] as Player[];
  currentGame: Game;
  servers: (WebSocket | undefined)[] = [];
  path: string;
  lastSave: string = '[]';
  savePlanned = false;
  private adaptiveLoop: AdaptiveGameLoop;
  private batcher: WebSocketBatcher;

  constructor(path: string) {
    this.path = path;
    this.adaptiveLoop = new AdaptiveGameLoop();
    this.batcher = new WebSocketBatcher(this);
    fs.readFile(this.path, 'utf8', (err, data) => {
      if (err) {
        console.error('Cannont initialize', err);
      } else {
        this.players = JSON.parse(data).map((playerObj: Player) => Player.from(playerObj));
      }
    });
    this.currentGame = new Game(this);
  }

  processMsg(payload: DataMsg, ws?: WebSocket) {
    switch (payload.type) {
      case 'joined':
        const previous = this.players.find((player) => payload.key === player.key);
        if (!previous) {
          let player;
          if (payload.bot) {
            // Si c'est un bot, on va chercher l'instance déjà créée dans le jeu
            player = this.currentGame.players.find((p) => p.key === payload.key);
            if (!player) {
              player = new Bot(this.currentGame, payload.name);
            }
          } else {
            player = new Player(payload.name, payload.key);
          }
          this.players.push(player);
          ws?.send(
              JSON.stringify({
                type: 'key',
                payload: {
                  key: player.key
                }
              })
          );
          player.connect(ws);
          console.log(`New ${payload.bot ? 'bot' : 'player'} ${player.name} joined`);
          player.updateRatio();
        } else {
          console.log(`Previous player ${previous.name} > ${payload.name} joined`);
          previous.name = payload.name;
          previous.connect(ws);
          previous.updateRatio();
        }
        this.sendHighScoreToServer();
        this.currentGame.size();
        break;
      case 'queue':
        const player = this.players.find((player) => payload.key === player.key);
        const playerInCurrentGame = this.currentGame?.players.find((player) => payload.key === player.key);

        if (!playerInCurrentGame && !!player) {
          console.log(`Adding Player ${player.name}`);
          this.currentGame.apply(player);
          this.sendQueueUpdate();
        }
        if (!!player && playerInCurrentGame) {
          //already in game
          player.queued();
          player.stopWait();
        }
        break;
      case 'quit':
        const playerQuitting = this.players.find((player) => payload.key === player.key);
        if (playerQuitting) {
          this.currentGame!.unapply(playerQuitting);
          console.log(`Player ${playerQuitting?.name} quitting`);
          this.currentGame.size();
        }
        break;
      case 'input':
        const playerInput = this.players.find((player) => payload.key === player.key);
        if (!!playerInput) {
          playerInput.move(payload)
        }
        break;
      case 'arrow':
        const playerArrow = this.players.find((player) => payload.key === player.key);
        if (!!playerArrow) {
          playerArrow.arrow(payload, playerArrow.position, [...this.players.map(player => player.arrows).flat(), ...this.currentGame.currentStrategy.goals]);
        }
        break;
      case 'predictive-input':
        this.handlePredictiveInput(payload, ws);
        break;
      case 'performance-report':
        this.handlePerformanceReport(payload, ws);
        break;
      case 'request-state-sync':
        this.handleStateSyncRequest(payload, ws);
        break;
      case 'server':
        this.servers.push(ws);
        // Send immediate state to newly connected server
        this.sendGameTo(ws!);
        this.batcher.sendImmediate('queue');
        this.batcher.sendImmediate('highscore');
        break;
    }
  }

  /**
   * Handle predictive input messages with acknowledgment
   */
  private handlePredictiveInput(payload: any, ws?: WebSocket) {
    const player = this.players.find((p) => p.key === payload.playerId);
    if (!player) {
      this.sendError('INVALID_PLAYER_ID', 'Player not found', ws);
      return;
    }

    // Process the input immediately
    if (payload.input.inputType === 'ARROW_PLACE') {
      player.arrow(payload.input.data, player.position, [...this.players.map(p => p.arrows).flat(), ...this.currentGame.currentStrategy.goals]);
    } else if (payload.input.inputType === 'MOVE') {
      player.move(payload.input.data);
    }

    // Send acknowledgment through batcher
    this.batcher.handlePredictiveInput(payload.playerId, payload.input, payload.prediction);
  }

  /**
   * Handle performance report from client
   */
  private handlePerformanceReport(payload: any, ws?: WebSocket) {
    const player = this.players.find((p) => p.key === payload.playerId);
    if (player) {
      // Store performance metrics for monitoring
      // TODO: Implement updatePerformanceMetrics method on Player class
      // player.updatePerformanceMetrics?.(payload.metrics);
    }
  }

  /**
   * Handle state synchronization request
   */
  private handleStateSyncRequest(payload: any, ws?: WebSocket) {
    if (!ws) return;

    const fullGameState = this.currentGame.state();
    const msg: ServerMessage = {
      type: 'SYNC_',
      game: {
        ...fullGameState
      }
    };

    const buffer = encodeServerMessage(msg);
    ws.send(buffer);
  }

  /**
   * Send error message to client
   */
  private sendError(errorCode: string, message: string, ws?: WebSocket) {
    if (!ws) return;

    const errorMessage = {
      type: 'error',
      error: {
        code: errorCode,
        message: message,
        timestamp: Date.now()
      }
    };

    ws.send(JSON.stringify(errorMessage));
  }

  executeGame() {
    this.currentGame!.started = this.currentGame.players.length >= CONFIG.MIN_PLAYERS;
    this.currentGame!.execute(() => {
      this.sendHighScoreToServer();
      this.sendGameToServer();
      this.sendQueueUpdate();
      this.asyncSave();
    });
    this.sendGameToServer();
    if (this.currentGame!.started) {
      // Calcul de la fréquence adaptative
      const playerCount = this.currentGame.players.filter(p => p.connected).length;
      const strategy = this.currentGame.currentStrategy;
      const entityCount = (strategy?.mouses?.length || 0) + (strategy?.cats?.length || 0);

      const optimalFrequency = this.adaptiveLoop.calculateOptimalFrequency(playerCount, entityCount);

      // Log pour debug (seulement si la fréquence change)
      if (optimalFrequency !== this.adaptiveLoop.getCurrentFrequency()) {
        this.adaptiveLoop.logPerformanceInfo(playerCount, entityCount);
      }

      setTimeout(() => this.executeGame(), optimalFrequency);
    } else {
      this.currentGame.clear();
      this.sendGameToServer();
    }
  }

  disconnect(ws: InstanceType<typeof WebSocket.WebSocket>) {
    this.players.find(player => player.ws === ws)?.disconnect();
    this.servers = this.servers.filter(server => server !== ws);
    // Flush pending updates before disconnect
    this.batcher.flush();
  }

  private previousGameState: any = null;

  public sendGameToServer() {
    this.batcher.scheduleUpdate('game');
  }

  public sendGameToServerInternal() {
    const currentState = this.currentGame?.state();
    let diff: any = {};

    if (this.previousGameState) {
      for (const key in currentState) {
        // @ts-ignore
        if (JSON.stringify(currentState[key]) !== JSON.stringify(this.previousGameState[key])) {
          // @ts-ignore
          diff[key] = currentState[key];
        }
      }
    } else {
      diff = currentState;
    }

    this.previousGameState = currentState;

    if (Object.keys(diff).length > 0) {
      const msg: ServerMessage = {
        type: 'GAME_',
        game: diff
      };
      const buffer = encodeServerMessage(msg);
      this.servers.forEach((ws) => ws?.send(buffer));
    }
  }

  public sendGameTo(ws: WebSocket) {
    if (!this.currentGame) return;
    const gameState = this.currentGame.state();
    const msg: ServerMessage = {
      type: 'GAME_',
      game: gameState
    };
    const buffer = encodeServerMessage(msg);
    ws.send(buffer);
  }

  public sendQueueUpdate() {
    this.batcher.scheduleUpdate('queue');
  }

  public sendQueueUpdateInternal() {
    if (!this.currentGame) return;
    const gameState = this.currentGame.state();
    const msg: ServerMessage = {
      type: 'QU_',
      queue: { state: gameState }
    };
    const buffer = encodeServerMessage(msg);
    this.servers.forEach((ws) => ws?.send(buffer));
  }

  public sendHighScoreToServer() {
    this.batcher.scheduleUpdate('highscore');
  }

  public sendHighScoreToServerInternal() {
    const scoreState = this.state();
    const msg: ServerMessage = {
      type: 'SC_',
      score: { players: scoreState.players }
    };
    const buffer = encodeServerMessage(msg);
    this.servers.forEach((ws) => ws?.send(buffer));
  }

  /**
   * Send delta compressed game state
   */
  public sendDeltaGameStateInternal() {
    if (!this.currentGame) return;

    const currentState = this.currentGame.state();
    if (!this.previousGameState) {
      // First state, send full state
      this.sendGameToServerInternal();
      return;
    }

    // Calculate delta using simple diff
    const delta = this.calculateStateDelta(this.previousGameState, currentState);

    if (delta.hasChanges) {
      const compressionRatio = this.calculateCompressionRatio(delta, currentState);
      this.batcher.trackCompressionRatio(compressionRatio);

      const msg: ServerMessage = {
        type: 'DELTA_',
        deltaGame: {
          baseSequence: toLong(delta.baseSequence),
          deltaSequence: toLong(delta.deltaSequence),
          timestamp: toLong(Date.now()),
          changedPlayers: delta.changedPlayers,
          changedEntities: delta.changedEntities,
          compressionRatio
        }
      };

      const buffer = encodeServerMessage(msg);
      this.servers.forEach((ws) => ws?.send(buffer));
    }

    this.previousGameState = currentState;
  }

  /**
   * Send priority message immediately
   */
  public sendPriorityMessage(message: any) {
    const buffer = Buffer.from(JSON.stringify(message));
    this.servers.forEach((ws) => ws?.send(buffer));
  }

  /**
   * Calculate simple delta between two game states
   */
  private calculateStateDelta(oldState: any, newState: any): any {
    const delta: any = {
      baseSequence: oldState.sequence || 0,
      deltaSequence: (oldState.sequence || 0) + 1,
      hasChanges: false,
      changedPlayers: [],
      changedEntities: [],
      newArrows: [],
      removedEntityIds: []
    };

    // Compare players
    if (newState.players && oldState.players) {
      for (let i = 0; i < Math.max(newState.players.length, oldState.players.length); i++) {
        const newPlayer = newState.players[i];
        const oldPlayer = oldState.players[i];

        if (!oldPlayer && newPlayer) {
          // New player
          delta.changedPlayers.push(newPlayer);
          delta.hasChanges = true;
        } else if (oldPlayer && newPlayer && JSON.stringify(oldPlayer) !== JSON.stringify(newPlayer)) {
          // Changed player
          delta.changedPlayers.push(newPlayer);
          delta.hasChanges = true;
        }
      }
    }

    // Compare arrows (simplified)
    if (newState.arrows && oldState.arrows) {
      const newArrows = newState.arrows.filter((arrow: any) =>
        !oldState.arrows.some((oldArrow: any) => oldArrow.id === arrow.id)
      );
      if (newArrows.length > 0) {
        delta.newArrows = newArrows;
        delta.hasChanges = true;
      }
    }

    return delta;
  }

  /**
   * Calculate compression ratio
   */
  private calculateCompressionRatio(delta: any, fullState: any): number {
    const deltaSize = JSON.stringify(delta).length;
    const fullSize = JSON.stringify(fullState).length;
    return fullSize > 0 ? 1 - (deltaSize / fullSize) : 0;
  }

  private state() {
    const list = [...this.players.map(player => player.state())];
    list.sort((p1, p2) => p2.totalPoints! - p1.totalPoints!);
    return {players: list.slice(0, 10)};
  }

  private asyncSave() {
    this.lastSave = JSON.stringify(this.players.map(player => player.serializable()));

    if (!this.savePlanned) {
      this.savePlanned = true;
      setTimeout(() => {
        fs.writeFile(this.path, this.lastSave, 'utf8', (err) => {
          this.savePlanned = false;
          if (!!err) {
            console.log('Cannot save state', err);
          }
        });
      }, 1000);
    }
  }

  doneWaiting() {
    this.players.forEach(pl => pl.stopWait());
  }
}
