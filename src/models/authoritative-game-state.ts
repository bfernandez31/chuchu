/**
 * T018: AuthoritativeGameState Model
 *
 * Server-authoritative game state implementation with validation,
 * state transitions, and performance metrics integration.
 */

export enum GamePhase {
  WAITING = 'WAITING',
  ACTIVE = 'ACTIVE',
  ENDING = 'ENDING'
}

export enum EntityType {
  MOUSE = 'MOUSE',
  CAT = 'CAT',
  WALL = 'WALL',
  GOAL = 'GOAL',
  ARROW = 'ARROW'
}

export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  type: EntityType;
  position: Position;
  velocity?: Velocity;
  ownerId?: string;
  direction?: string;
  createdAt: number;
  lastUpdate: number;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  connected: boolean;
  lastInput: number;
  arrowCount: number;
  maxArrows: number;
}

export interface BoardState {
  width: number;
  height: number;
  entities: Map<string, Entity>;
  goals: Entity[];
  walls: Entity[];
  arrows: Entity[];
}

export interface PerformanceSnapshot {
  timestamp: number;
  tickRate: number;
  playerCount: number;
  entityCount: number;
  messagesSent: number;
  messagesReceived: number;
  averageLatency: number;
  memoryUsage: number;
}

export interface AuthoritativeGameState {
  // Core State
  gameId: string;
  timestamp: number;
  sequence: number;
  phase: GamePhase;

  // Game Data
  board: BoardState;
  players: Map<string, Player>;

  // Game Logic
  startTime: number;
  endTime?: number;
  roundDuration: number;

  // Performance Integration
  performance: PerformanceSnapshot;

  // Validation
  isValid(): boolean;
  calculateChecksum(): string;
  checksum: string;
}

export class AuthoritativeGameStateImpl implements AuthoritativeGameState {
  public gameId: string;
  public timestamp: number;
  public sequence: number;
  public phase: GamePhase;
  public board: BoardState;
  public players: Map<string, Player>;
  public startTime: number;
  public endTime?: number;
  public roundDuration: number;
  public performance: PerformanceSnapshot;
  public checksum: string;

  constructor(data: Partial<AuthoritativeGameState> = {}) {
    this.gameId = data.gameId || this.generateGameId();
    this.timestamp = data.timestamp || Date.now();
    this.sequence = data.sequence || 0;
    this.phase = data.phase || GamePhase.WAITING;
    this.startTime = data.startTime || Date.now();
    this.roundDuration = data.roundDuration || 300000; // 5 minutes default

    this.board = data.board || {
      width: 15,
      height: 15,
      entities: new Map(),
      goals: [],
      walls: [],
      arrows: []
    };

    this.players = data.players || new Map();

    this.performance = data.performance || {
      timestamp: this.timestamp,
      tickRate: 60,
      playerCount: this.players.size,
      entityCount: this.board.entities.size,
      messagesSent: 0,
      messagesReceived: 0,
      averageLatency: 0,
      memoryUsage: 0
    };

    this.checksum = this.calculateChecksum();
  }

  /**
   * Validate game state consistency and constraints
   */
  public isValid(): boolean {
    try {
      // Timestamp validation - must be monotonic
      if (this.timestamp <= 0) return false;

      // Sequence validation - must increment
      if (this.sequence < 0) return false;

      // Phase transition validation
      if (!this.isValidPhaseTransition()) return false;

      // Board validation
      if (!this.isBoardValid()) return false;

      // Player validation
      if (!this.arePlayersValid()) return false;

      // Performance validation
      if (!this.isPerformanceValid()) return false;

      return true;
    } catch (error) {
      console.error('State validation error:', error);
      return false;
    }
  }

  /**
   * Transition to next game phase with validation
   */
  public transitionPhase(newPhase: GamePhase): boolean {
    const validTransitions: Record<GamePhase, GamePhase[]> = {
      [GamePhase.WAITING]: [GamePhase.ACTIVE],
      [GamePhase.ACTIVE]: [GamePhase.ENDING],
      [GamePhase.ENDING]: [GamePhase.WAITING]
    };

    if (!validTransitions[this.phase].includes(newPhase)) {
      return false;
    }

    this.phase = newPhase;
    this.timestamp = Date.now();
    this.sequence++;

    // Handle phase-specific logic
    switch (newPhase) {
      case GamePhase.ACTIVE:
        this.startTime = this.timestamp;
        break;
      case GamePhase.ENDING:
        this.endTime = this.timestamp;
        break;
      case GamePhase.WAITING:
        this.endTime = undefined;
        break;
    }

    this.updateChecksum();
    return true;
  }

  /**
   * Update game state with new data
   */
  public update(deltaTime: number): void {
    this.timestamp = Date.now();
    this.sequence++;

    // Update performance metrics
    this.performance.timestamp = this.timestamp;
    this.performance.playerCount = this.players.size;
    this.performance.entityCount = this.board.entities.size;

    // Update entity positions based on velocity
    this.updateEntityPositions(deltaTime);

    // Recalculate checksum
    this.updateChecksum();
  }

  /**
   * Add or update player
   */
  public addPlayer(player: Player): boolean {
    if (!this.isValidPlayer(player)) return false;

    this.players.set(player.id, player);
    this.sequence++;
    this.updateChecksum();
    return true;
  }

  /**
   * Remove player
   */
  public removePlayer(playerId: string): boolean {
    if (!this.players.has(playerId)) return false;

    this.players.delete(playerId);
    this.sequence++;
    this.updateChecksum();
    return true;
  }

  /**
   * Add entity to game board
   */
  public addEntity(entity: Entity): boolean {
    if (!this.isValidEntity(entity)) return false;

    this.board.entities.set(entity.id, entity);

    // Add to type-specific collections
    switch (entity.type) {
      case EntityType.GOAL:
        this.board.goals.push(entity);
        break;
      case EntityType.WALL:
        this.board.walls.push(entity);
        break;
      case EntityType.ARROW:
        this.board.arrows.push(entity);
        break;
    }

    this.sequence++;
    this.updateChecksum();
    return true;
  }

  /**
   * Remove entity from game board
   */
  public removeEntity(entityId: string): boolean {
    const entity = this.board.entities.get(entityId);
    if (!entity) return false;

    this.board.entities.delete(entityId);

    // Remove from type-specific collections
    switch (entity.type) {
      case EntityType.GOAL:
        this.board.goals = this.board.goals.filter(e => e.id !== entityId);
        break;
      case EntityType.WALL:
        this.board.walls = this.board.walls.filter(e => e.id !== entityId);
        break;
      case EntityType.ARROW:
        this.board.arrows = this.board.arrows.filter(e => e.id !== entityId);
        break;
    }

    this.sequence++;
    this.updateChecksum();
    return true;
  }

  // Private validation methods

  private isValidPhaseTransition(): boolean {
    switch (this.phase) {
      case GamePhase.WAITING:
        return true; // Can transition to ACTIVE
      case GamePhase.ACTIVE:
        return this.startTime > 0; // Must have valid start time
      case GamePhase.ENDING:
        return this.endTime !== undefined; // Must have end time
      default:
        return false;
    }
  }

  private isBoardValid(): boolean {
    if (this.board.width < 10 || this.board.width > 50) return false;
    if (this.board.height < 10 || this.board.height > 50) return false;

    // Validate entity positions are within bounds
    for (const [id, entity] of Array.from(this.board.entities)) {
      if (!this.isPositionValid(entity.position)) return false;
    }

    return true;
  }

  private arePlayersValid(): boolean {
    for (const [id, player] of Array.from(this.players)) {
      if (!this.isValidPlayer(player)) return false;
    }
    return true;
  }

  private isPerformanceValid(): boolean {
    const p = this.performance;
    return p.tickRate >= 1 && p.tickRate <= 120 &&
           p.playerCount >= 0 && p.playerCount <= 32 &&
           p.entityCount >= 0 &&
           p.averageLatency >= 0 && p.averageLatency <= 10000 &&
           p.memoryUsage >= 0;
  }

  private isValidPlayer(player: Player): boolean {
    return player.id.length > 0 &&
           player.name.length > 0 &&
           player.score >= 0 &&
           player.arrowCount >= 0 &&
           player.maxArrows > 0 &&
           player.lastInput >= 0;
  }

  private isValidEntity(entity: Entity): boolean {
    return entity.id.length > 0 &&
           Object.values(EntityType).includes(entity.type) &&
           this.isPositionValid(entity.position) &&
           entity.createdAt > 0 &&
           entity.lastUpdate >= entity.createdAt;
  }

  private isPositionValid(position: Position): boolean {
    return position.x >= 0 && position.x < this.board.width &&
           position.y >= 0 && position.y < this.board.height;
  }

  private updateEntityPositions(deltaTime: number): void {
    for (const [id, entity] of Array.from(this.board.entities)) {
      if (entity.velocity) {
        entity.position.x += entity.velocity.x * deltaTime;
        entity.position.y += entity.velocity.y * deltaTime;
        entity.lastUpdate = this.timestamp;
      }
    }
  }

  private generateGameId(): string {
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public calculateChecksum(): string {
    const data = {
      sequence: this.sequence,
      phase: this.phase,
      playerCount: this.players.size,
      entityCount: this.board.entities.size,
      timestamp: this.timestamp
    };

    // Simple checksum - in production would use crypto hash
    return btoa(JSON.stringify(data)).substr(0, 16);
  }

  private updateChecksum(): void {
    this.checksum = this.calculateChecksum();
  }
}

/**
 * Factory for creating AuthoritativeGameState instances
 */
export class AuthoritativeGameStateFactory {
  static create(config?: Partial<AuthoritativeGameState>): AuthoritativeGameState {
    return new AuthoritativeGameStateImpl(config);
  }

  static createDefault(): AuthoritativeGameState {
    return new AuthoritativeGameStateImpl({
      phase: GamePhase.WAITING,
      roundDuration: 300000, // 5 minutes
      board: {
        width: 15,
        height: 15,
        entities: new Map(),
        goals: [],
        walls: [],
        arrows: []
      }
    });
  }

  static fromSnapshot(data: any): AuthoritativeGameState {
    const state = new AuthoritativeGameStateImpl();

    // Restore basic properties
    state.gameId = data.gameId;
    state.timestamp = data.timestamp;
    state.sequence = data.sequence;
    state.phase = data.phase;
    state.startTime = data.startTime;
    state.endTime = data.endTime;
    state.roundDuration = data.roundDuration;

    // Restore board state
    state.board = {
      width: data.board.width,
      height: data.board.height,
      entities: new Map(data.board.entities),
      goals: data.board.goals || [],
      walls: data.board.walls || [],
      arrows: data.board.arrows || []
    };

    // Restore players
    state.players = new Map(data.players);

    // Restore performance
    state.performance = data.performance;

    // Recalculate checksum
    state.checksum = state.calculateChecksum();

    return state;
  }
}