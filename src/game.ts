import {Player} from "./player";
import {Queue} from "./queue";
import {CONFIG} from "../browser/common/config";
import {GameStrategy} from "./generators/strategy/game-strategy";
import {StartingStrategy} from "./generators/strategy/impl/starting-strategy";
import {StrategyFactory} from "./generators/strategy/strategy-factory";
import {Bot} from './bot';
import {GameState} from "./messages_pb";
import {PerformanceMonitor} from "./performance/performance-monitor";
import {PredictionEngine, PredictionEngineFactory} from "./prediction/prediction-engine";
import {AuthoritativeGameState, AuthoritativeGameStateFactory, GamePhase, Entity, EntityType} from "./models/authoritative-game-state";
import {DeltaCompression, DeltaCompressionManager} from "./networking/delta-compression";

export class Game {
  players: Player[] = [];
  queue: Queue;
  started: boolean = false;
  ready = false;
  currentStrategy: GameStrategy;
  phases = 1;
  bots: Bot[] = [];
  private lastBotActionTime: number = 0;
  private lastPerformanceLog: number = 0;
  private performanceMonitor: PerformanceMonitor;

  // T037: Prediction Engine Integration
  private predictionEngine: PredictionEngine;
  private authoritativeState: AuthoritativeGameState;
  private deltaCompression: DeltaCompression;
  private lastStateSequence: number = 0;
  private gameStartTime: number = 0;

  constructor(queue: Queue) {
    this.queue = queue;
    this.currentStrategy = new StartingStrategy();
    this.performanceMonitor = new PerformanceMonitor();

    // T037: Initialize prediction engine and authoritative state
    this.predictionEngine = PredictionEngineFactory.createHighPerformance();
    this.authoritativeState = AuthoritativeGameStateFactory.createDefault();
    this.deltaCompression = DeltaCompressionManager.getInstance();
    this.gameStartTime = Date.now();

    setTimeout(() => this.createBots(), 100);
  }

  createBots() {
    // Création automatique des bots selon CONFIG.BOTS
    for (let i = 0; i < CONFIG.BOTS; i++) {
      const botName = `Bot ${i + 1}`;
      const bot = new Bot(this, botName);
      // Message 'joined'
      this.queue.processMsg({
        type: 'joined',
        name: botName,
        key: bot.key,
        bot: true
      });
      // Message 'queue'
      this.queue.processMsg({
        type: 'queue',
        key: bot.key
      });
      console.log(`Bot ${i + 1} joined and queued.`);
      this.bots.push(bot);
    }
  }

  apply(player: Player) {
    if (!this.players.filter(player => player.connected).find(playerInGame => playerInGame.key === player.key)) {
      if (this.players.length <= CONFIG.MAX_PLAYERS) {
        this.players.push(player);
        player.init(this.players.length - 1);
        player.queued();
        if (this.players.length > CONFIG.MIN_PLAYERS) {
          console.log('starting game execution...')
          this.currentStrategy = StrategyFactory.next(this.currentStrategy, this.players);
          this.currentStrategy.applySpeedCorrection();
          this.queue.doneWaiting();
          this.queue.executeGame();
          this.queue.sendQueueUpdate();
        }
        this.size();
        this.queue.sendGameToServer();
      } else {
        console.log('Game full');
        player.canQueue();
      }
    }
  }

  unapply(player: Player) {
    if (this.players.find(playerInGame => playerInGame.key === player.key)) {
      this.players = this.players.filter(playerInGame => playerInGame.key !== player.key);
      this.currentStrategy.unapply(player);
      player.canQueue();
      if (this.players.length === 0) {
        this.started = false;
        console.log('Game stopped');
      }
      this.size();
      this.queue.sendGameToServer();
      this.queue.sendQueueUpdate();
    }
  }

  state(): GameState {
    return {
      players: this.players.map(player => player.state()).sort((p1, p2) => p1.totalPoints! - p2.totalPoints!),
      strategy: this.currentStrategy.state(),
      width: CONFIG.GLOBAL_WIDTH,
      height: CONFIG.GLOBAL_HEIGHT,
      started: this.started,
      ready: this.ready,
      cols: CONFIG.COLUMNS,
      rows: CONFIG.ROWS
    };
  }

  /**
   * T037: Get authoritative game state with prediction support
   */
  getAuthoritativeState(): AuthoritativeGameState {
    return this.authoritativeState;
  }

  /**
   * T037: Generate delta state for efficient network transmission
   */
  generateDeltaState(): any {
    const currentState = this.buildCurrentAuthoritativeState();
    const previousState = this.authoritativeState;

    // Calculate delta using compression engine
    const deltaState = this.deltaCompression.calculateDelta(previousState, currentState);

    // Update authoritative state
    this.authoritativeState = currentState;

    return deltaState;
  }

  size() {
    let size = 15;
    if (this.players.length > 25) {
      size = 45;
    } else if (this.players.length > 20) {
      size = 41;
    } else if (this.players.length > 15) {
      size = 35;
    } else if (this.players.length > 10) {
      size = 31;
    } else if (this.players.length > 6) {
      size = 25;
    } else if (this.players.length > 3) {
      size = 21;
    } else {
      size = 15;
    }
    CONFIG.ROWS = size;
    CONFIG.COLUMNS = size;
  }

  execute(changeScoreListener: () => void) {
    let sendUpdate = false;
    const executionStartTime = performance.now();

    // Limite globale d'action des bots
    const now = Date.now();
    const botCooldown = CONFIG.BOT_LIMIT_ACTIONS_MS || 1000;
    let canBotsAct = false;
    if (now - this.lastBotActionTime >= botCooldown) {
      canBotsAct = true;
      this.lastBotActionTime = now;
    }
    if (canBotsAct) {
      this.bots.forEach(bot => {
        bot.play();
      });
    }

    this.currentStrategy.mouses.forEach(mouse => mouse.move(this.currentStrategy.walls, this.players.map(player => player.arrows).flat(), this.currentStrategy.mouseSpeed));
    this.currentStrategy.cats.forEach(cat => cat.move(this.currentStrategy.walls, this.players.map(player => player.arrows).flat(), this.currentStrategy.catSpeed));
    this.currentStrategy.goals.map(goal => {
      const absorbed = goal.absorbing([...this.currentStrategy.mouses, ...this.currentStrategy.cats]);
      if (absorbed && absorbed.length > 0) {
        absorbed.forEach(absorbedObject => goal.player.absorb(absorbedObject));
        this.currentStrategy.remove(absorbed);
        sendUpdate = true;
      }
    });

    // Optimized collision detection using spatial partitioning
    const collisionStartTime = performance.now();
    const collisions = this.currentStrategy.findCollisions();
    const collisionDuration = performance.now() - collisionStartTime;

    if (collisions.length > 0) {
      const mousesToRemove = collisions.map(([mouse, cat]) => mouse);
      this.currentStrategy.remove(mousesToRemove);
    }

    // Phase Management
    this.currentStrategy.step();
    if (this.currentStrategy.hasEnded()) {
      this.currentStrategy.reward(this.players);
      this.currentStrategy = StrategyFactory.next(this.currentStrategy, this.players);
      this.currentStrategy.applySpeedCorrection();
      this.players.forEach(player => player.arrows = []);
      this.phases++;
      sendUpdate = true;
    }

    // T037: Update authoritative state with prediction support
    this.updateAuthoritativeState(now - this.gameStartTime);

    if (sendUpdate) {
      changeScoreListener();
    }

    // Log performance statistics every 30 seconds
    const currentTime = Date.now();
    if (currentTime - this.lastPerformanceLog >= 30000) {
      this.lastPerformanceLog = currentTime;
      const spatialStats = this.currentStrategy.getSpatialGridStats();
      console.log(`🗺️ Spatial Grid Stats - Objects: ${spatialStats.totalObjects}, Cells: ${spatialStats.occupiedCells}/${spatialStats.totalCells}, Avg/Cell: ${spatialStats.averageObjectsPerCell.toFixed(1)}`);

      // Update server metrics with collision performance and execution time
      const executionDuration = performance.now() - executionStartTime;
      this.performanceMonitor.updateServerMetrics({
        timestamp: currentTime,
        messagesSent: 0  // TODO: Implement message counting
      });
      console.log(`⚡ Collision Detection Duration: ${collisionDuration.toFixed(3)}ms`);
      console.log(`🎮 Game Execution Duration: ${executionDuration.toFixed(3)}ms`);

      // T037: Log prediction engine statistics
      const predictionStats = this.predictionEngine.getStatistics();
      console.log(`🔮 Prediction Stats - Total: ${predictionStats.totalPredictions}, Avg Accuracy: ${(predictionStats.averageAccuracy * 100).toFixed(1)}%`);
    }
  }

  clear() {
    this.currentStrategy = new StartingStrategy();
  }

  /**
   * T037: Build current authoritative game state from current game data
   */
  private buildCurrentAuthoritativeState(): AuthoritativeGameState {
    const now = Date.now();

    // Create new authoritative state
    const newState = AuthoritativeGameStateFactory.create({
      gameId: this.authoritativeState.gameId,
      timestamp: now,
      sequence: this.lastStateSequence + 1,
      phase: this.determineGamePhase(),
      startTime: this.gameStartTime,
      roundDuration: 300000, // 5 minutes
      board: {
        width: CONFIG.COLUMNS,
        height: CONFIG.ROWS,
        entities: this.buildEntityMap(),
        goals: this.buildGoalEntities(),
        walls: this.buildWallEntities(),
        arrows: this.buildArrowEntities()
      },
      players: this.buildPlayerMap(),
      performance: {
        timestamp: now,
        tickRate: 60, // Target tick rate
        playerCount: this.players.filter(p => p.connected).length,
        entityCount: this.getTotalEntityCount(),
        messagesSent: 0, // TODO: Track from queue
        messagesReceived: 0, // TODO: Track from queue
        averageLatency: 0, // TODO: Calculate from player latencies
        memoryUsage: process.memoryUsage?.()?.heapUsed || 0
      }
    });

    this.lastStateSequence = newState.sequence;
    return newState;
  }

  /**
   * T037: Update authoritative state with current game data
   */
  private updateAuthoritativeState(deltaTime: number): void {
    // Update sequence and timestamp
    this.authoritativeState.sequence++;
    this.authoritativeState.timestamp = Date.now();

    // Synchronize with current game state
    this.authoritativeState.players = this.buildPlayerMap();
    this.authoritativeState.board.entities = this.buildEntityMap();
    this.authoritativeState.board.goals = this.buildGoalEntities();
    this.authoritativeState.board.walls = this.buildWallEntities();
    this.authoritativeState.board.arrows = this.buildArrowEntities();

    // Update performance metrics
    this.authoritativeState.performance.playerCount = this.players.filter(p => p.connected).length;
    this.authoritativeState.performance.entityCount = this.getTotalEntityCount();

    // Update checksum
    this.authoritativeState.checksum = this.authoritativeState.calculateChecksum();
  }

  /**
   * T037: Determine current game phase
   */
  private determineGamePhase(): GamePhase {
    if (!this.started) {
      return GamePhase.WAITING;
    } else if (this.currentStrategy.hasEnded()) {
      return GamePhase.ENDING;
    } else {
      return GamePhase.ACTIVE;
    }
  }

  /**
   * T037: Build player map for authoritative state
   */
  private buildPlayerMap(): Map<string, any> {
    const playerMap = new Map();

    this.players.forEach((player, index) => {
      playerMap.set(player.key, {
        id: player.key,
        name: player.name,
        score: player.totalPoints,
        connected: player.connected,
        lastInput: Date.now(), // TODO: Track actual last input time
        arrowCount: player.arrows.length,
        maxArrows: 3 // From game logic
      });
    });

    return playerMap;
  }

  /**
   * T037: Build entity map for authoritative state
   */
  private buildEntityMap(): Map<string, Entity> {
    const entityMap = new Map<string, Entity>();
    const now = Date.now();

    // Add mice
    this.currentStrategy.mouses.forEach((mouse, index) => {
      const entity: Entity = {
        id: `mouse_${index}`,
        type: EntityType.MOUSE,
        position: { x: mouse.position[0], y: mouse.position[1] },
        velocity: { x: 0, y: 0 }, // MovingObject doesn't track velocity directly
        createdAt: now,
        lastUpdate: now
      };
      entityMap.set(entity.id, entity);
    });

    // Add cats
    this.currentStrategy.cats.forEach((cat, index) => {
      const entity: Entity = {
        id: `cat_${index}`,
        type: EntityType.CAT,
        position: { x: cat.position[0], y: cat.position[1] },
        velocity: { x: 0, y: 0 }, // MovingObject doesn't track velocity directly
        createdAt: now,
        lastUpdate: now
      };
      entityMap.set(entity.id, entity);
    });

    return entityMap;
  }

  /**
   * T037: Build goal entities for authoritative state
   */
  private buildGoalEntities(): Entity[] {
    const now = Date.now();

    return this.currentStrategy.goals.map((goal, index) => ({
      id: `goal_${index}`,
      type: EntityType.GOAL,
      position: { x: goal.position[0], y: goal.position[1] },
      ownerId: goal.player?.key,
      createdAt: now,
      lastUpdate: now
    }));
  }

  /**
   * T037: Build wall entities for authoritative state
   */
  private buildWallEntities(): Entity[] {
    const now = Date.now();

    return this.currentStrategy.walls.map((wall, index) => ({
      id: `wall_${index}`,
      type: EntityType.WALL,
      position: { x: wall.position[0], y: wall.position[1] },
      createdAt: now,
      lastUpdate: now
    }));
  }

  /**
   * T037: Build arrow entities for authoritative state
   */
  private buildArrowEntities(): Entity[] {
    const now = Date.now();
    const arrows: Entity[] = [];

    this.players.forEach(player => {
      player.arrows.forEach((arrow, index) => {
        arrows.push({
          id: `arrow_${player.key}_${index}`,
          type: EntityType.ARROW,
          position: { x: arrow.position[0], y: arrow.position[1] },
          direction: arrow.direction,
          ownerId: player.key,
          createdAt: now,
          lastUpdate: now
        });
      });
    });

    return arrows;
  }

  /**
   * T037: Get total entity count for performance metrics
   */
  private getTotalEntityCount(): number {
    return this.currentStrategy.mouses.length +
           this.currentStrategy.cats.length +
           this.currentStrategy.goals.length +
           this.currentStrategy.walls.length +
           this.players.reduce((total, player) => total + player.arrows.length, 0);
  }
}
