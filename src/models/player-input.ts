/**
 * T020: PlayerInput Model
 *
 * Timestamped input structure with validation, rate limiting,
 * and acknowledgment tracking for hybrid predictive rendering.
 */

export enum InputType {
  ARROW_PLACE = 'ARROW_PLACE',
  MOVE = 'MOVE',
  ACTION = 'ACTION'
}

export enum InputStatus {
  PENDING = 'PENDING',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  REJECTED = 'REJECTED',
  TIMEOUT = 'TIMEOUT'
}

export interface InputPosition {
  x: number;
  y: number;
}

export interface InputData {
  // Arrow placement
  position?: InputPosition;
  direction?: string;

  // Movement
  targetPosition?: InputPosition;
  velocity?: InputPosition;

  // General action
  action?: string;
  parameters?: Record<string, any>;
}

export interface RateLimitInfo {
  windowStart: number;
  inputCount: number;
  burstCount: number;
  lastInput: number;
}

export interface AcknowledgmentInfo {
  serverTimestamp: number;
  processingTime: number;
  acknowledged: boolean;
  rejectionReason?: string;
}

export interface PlayerInput {
  // Core identification
  id: string;
  playerId: string;
  sequence: number;

  // Input details
  type: InputType;
  timestamp: number;
  data: InputData;

  // Status tracking
  status: InputStatus;
  acknowledgment?: AcknowledgmentInfo;

  // Rate limiting
  rateLimitInfo: RateLimitInfo;

  // Validation
  isValid(): boolean;
  isWithinRateLimit(): boolean;
  calculateAge(): number;

  // Status management
  acknowledge(serverTimestamp: number, processingTime: number): void;
  reject(reason: string): void;
  timeout(): void;
  isAckRequired(): boolean;
  isExpired(): boolean;
}

export class PlayerInputImpl implements PlayerInput {
  public id: string;
  public playerId: string;
  public sequence: number;
  public type: InputType;
  public timestamp: number;
  public data: InputData;
  public status: InputStatus;
  public acknowledgment?: AcknowledgmentInfo;
  public rateLimitInfo: RateLimitInfo;

  constructor(data: Partial<PlayerInput> & { playerId: string; type: InputType; data: InputData }) {
    this.id = data.id || this.generateInputId();
    this.playerId = data.playerId;
    this.sequence = data.sequence || 0;
    this.type = data.type;
    this.timestamp = data.timestamp || Date.now();
    this.data = data.data;
    this.status = data.status || InputStatus.PENDING;
    this.acknowledgment = data.acknowledgment;

    this.rateLimitInfo = data.rateLimitInfo || {
      windowStart: this.timestamp,
      inputCount: 1,
      burstCount: 1,
      lastInput: this.timestamp
    };
  }

  /**
   * Validate input structure and constraints
   */
  public isValid(): boolean {
    try {
      // Basic validation
      if (!this.id || !this.playerId) return false;
      if (this.sequence < 0) return false;
      if (this.timestamp <= 0) return false;
      if (!Object.values(InputType).includes(this.type)) return false;

      // Type-specific validation
      switch (this.type) {
        case InputType.ARROW_PLACE:
          return this.validateArrowPlacement();
        case InputType.MOVE:
          return this.validateMovement();
        case InputType.ACTION:
          return this.validateAction();
        default:
          return false;
      }
    } catch (error) {
      console.error('Input validation error:', error);
      return false;
    }
  }

  /**
   * Check if input is within rate limits (60 inputs/second, burst 10)
   */
  public isWithinRateLimit(): boolean {
    const now = Date.now();
    const windowDuration = 1000; // 1 second window
    const maxInputsPerSecond = 60;
    const maxBurstInputs = 10;
    const burstWindow = 100; // 100ms burst window

    // Check 1-second window rate limit
    if (now - this.rateLimitInfo.windowStart >= windowDuration) {
      // Reset window
      this.rateLimitInfo.windowStart = now;
      this.rateLimitInfo.inputCount = 1;
    } else {
      this.rateLimitInfo.inputCount++;
      if (this.rateLimitInfo.inputCount > maxInputsPerSecond) {
        return false;
      }
    }

    // Check burst rate limit
    if (now - this.rateLimitInfo.lastInput < burstWindow) {
      this.rateLimitInfo.burstCount++;
      if (this.rateLimitInfo.burstCount > maxBurstInputs) {
        return false;
      }
    } else {
      this.rateLimitInfo.burstCount = 1;
    }

    this.rateLimitInfo.lastInput = now;
    return true;
  }

  /**
   * Calculate input age in milliseconds
   */
  public calculateAge(): number {
    return Date.now() - this.timestamp;
  }

  /**
   * Update input status with acknowledgment
   */
  public acknowledge(serverTimestamp: number, processingTime: number): void {
    this.status = InputStatus.ACKNOWLEDGED;
    this.acknowledgment = {
      serverTimestamp,
      processingTime,
      acknowledged: true
    };
  }

  /**
   * Reject input with reason
   */
  public reject(reason: string): void {
    this.status = InputStatus.REJECTED;
    this.acknowledgment = {
      serverTimestamp: Date.now(),
      processingTime: this.calculateAge(),
      acknowledged: false,
      rejectionReason: reason
    };
  }

  /**
   * Mark input as timed out
   */
  public timeout(): void {
    this.status = InputStatus.TIMEOUT;
    this.acknowledgment = {
      serverTimestamp: Date.now(),
      processingTime: this.calculateAge(),
      acknowledged: false,
      rejectionReason: 'Request timeout'
    };
  }

  /**
   * Check if input requires acknowledgment within timeout
   */
  public isAckRequired(): boolean {
    const ackTimeout = 5000; // 5 seconds
    return this.status === InputStatus.PENDING && this.calculateAge() < ackTimeout;
  }

  /**
   * Check if input has expired
   */
  public isExpired(): boolean {
    const expirationTime = 10000; // 10 seconds
    return this.calculateAge() > expirationTime;
  }

  // Private validation methods

  private validateArrowPlacement(): boolean {
    if (!this.data.position) return false;
    if (!this.data.direction) return false;

    const pos = this.data.position;
    const validDirections = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

    return pos.x >= 0 && pos.x < 50 && // Max board size
           pos.y >= 0 && pos.y < 50 &&
           validDirections.includes(this.data.direction);
  }

  private validateMovement(): boolean {
    if (!this.data.targetPosition) return false;

    const pos = this.data.targetPosition;
    const isValidPosition = pos.x >= 0 && pos.x < 50 && pos.y >= 0 && pos.y < 50;

    if (!isValidPosition) return false;

    // Validate velocity if provided
    if (this.data.velocity) {
      const vel = this.data.velocity;
      const maxVelocity = 10.0; // Max velocity units per second
      return Math.abs(vel.x) <= maxVelocity && Math.abs(vel.y) <= maxVelocity;
    }

    return true;
  }

  private validateAction(): boolean {
    if (!this.data.action) return false;

    const validActions = [
      'JOIN_GAME',
      'LEAVE_GAME',
      'READY',
      'CHAT',
      'PAUSE',
      'RESUME'
    ];

    return validActions.includes(this.data.action);
  }

  private generateInputId(): string {
    return `input_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Rate limiting manager for player inputs
 */
export class InputRateLimiter {
  private playerLimits: Map<string, RateLimitInfo> = new Map();
  private readonly maxInputsPerSecond = 60;
  private readonly maxBurstInputs = 10;
  private readonly burstWindow = 100; // ms
  private readonly cleanupInterval = 60000; // 1 minute

  constructor() {
    // Periodic cleanup of old rate limit data
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  /**
   * Check if player can send input within rate limits
   */
  public canSendInput(playerId: string): boolean {
    const now = Date.now();
    let limitInfo = this.playerLimits.get(playerId);

    if (!limitInfo) {
      limitInfo = {
        windowStart: now,
        inputCount: 0,
        burstCount: 0,
        lastInput: 0
      };
      this.playerLimits.set(playerId, limitInfo);
    }

    // Check 1-second window
    if (now - limitInfo.windowStart >= 1000) {
      limitInfo.windowStart = now;
      limitInfo.inputCount = 0;
    }

    if (limitInfo.inputCount >= this.maxInputsPerSecond) {
      return false;
    }

    // Check burst window
    if (now - limitInfo.lastInput < this.burstWindow) {
      if (limitInfo.burstCount >= this.maxBurstInputs) {
        return false;
      }
    } else {
      limitInfo.burstCount = 0;
    }

    return true;
  }

  /**
   * Record input for rate limiting
   */
  public recordInput(playerId: string): void {
    const now = Date.now();
    let limitInfo = this.playerLimits.get(playerId);

    if (!limitInfo) {
      limitInfo = {
        windowStart: now,
        inputCount: 1,
        burstCount: 1,
        lastInput: now
      };
      this.playerLimits.set(playerId, limitInfo);
      return;
    }

    limitInfo.inputCount++;
    limitInfo.burstCount++;
    limitInfo.lastInput = now;
  }

  /**
   * Get rate limit status for player
   */
  public getRateLimitStatus(playerId: string): RateLimitInfo | null {
    return this.playerLimits.get(playerId) || null;
  }

  /**
   * Clean up old rate limit data
   */
  private cleanup(): void {
    const now = Date.now();
    const cleanupThreshold = 300000; // 5 minutes

    for (const [playerId, limitInfo] of Array.from(this.playerLimits)) {
      if (now - limitInfo.lastInput > cleanupThreshold) {
        this.playerLimits.delete(playerId);
      }
    }
  }
}

/**
 * Input buffer manager for tracking acknowledgments
 */
export class InputBuffer {
  private inputs: Map<string, PlayerInput> = new Map();
  private readonly maxBufferSize = 1000;
  private readonly ackTimeout = 5000; // 5 seconds

  /**
   * Add input to buffer for tracking
   */
  public addInput(input: PlayerInput): void {
    // Maintain buffer size
    if (this.inputs.size >= this.maxBufferSize) {
      this.cleanupOldInputs();
    }

    this.inputs.set(input.id, input);
  }

  /**
   * Get input by ID
   */
  public getInput(inputId: string): PlayerInput | null {
    return this.inputs.get(inputId) || null;
  }

  /**
   * Acknowledge input
   */
  public acknowledgeInput(inputId: string, serverTimestamp: number, processingTime: number): boolean {
    const input = this.inputs.get(inputId);
    if (!input) return false;

    input.acknowledge(serverTimestamp, processingTime);
    return true;
  }

  /**
   * Get pending inputs for player
   */
  public getPendingInputs(playerId: string): PlayerInput[] {
    return Array.from(this.inputs.values())
      .filter(input => input.playerId === playerId && input.status === InputStatus.PENDING);
  }

  /**
   * Get inputs requiring acknowledgment
   */
  public getInputsRequiringAck(): PlayerInput[] {
    return Array.from(this.inputs.values())
      .filter(input => input.isAckRequired());
  }

  /**
   * Process timeouts for pending inputs
   */
  public processTimeouts(): PlayerInput[] {
    const timedOutInputs: PlayerInput[] = [];

    for (const [id, input] of Array.from(this.inputs)) {
      if (input.status === InputStatus.PENDING && input.calculateAge() > this.ackTimeout) {
        input.timeout();
        timedOutInputs.push(input);
      }
    }

    return timedOutInputs;
  }

  /**
   * Clean up old and processed inputs
   */
  public cleanup(): void {
    this.cleanupOldInputs();
  }

  private cleanupOldInputs(): void {
    const cutoffTime = Date.now() - 60000; // Keep last minute

    for (const [id, input] of Array.from(this.inputs)) {
      if (input.timestamp < cutoffTime ||
          (input.status !== InputStatus.PENDING && input.calculateAge() > 10000)) {
        this.inputs.delete(id);
      }
    }
  }
}

/**
 * Factory for creating PlayerInput instances
 */
export class PlayerInputFactory {
  static createArrowPlacement(
    playerId: string,
    position: InputPosition,
    direction: string,
    sequence: number = 0
  ): PlayerInput {
    return new PlayerInputImpl({
      playerId,
      type: InputType.ARROW_PLACE,
      sequence,
      data: {
        position,
        direction
      }
    });
  }

  static createMovement(
    playerId: string,
    targetPosition: InputPosition,
    velocity?: InputPosition,
    sequence: number = 0
  ): PlayerInput {
    return new PlayerInputImpl({
      playerId,
      type: InputType.MOVE,
      sequence,
      data: {
        targetPosition,
        velocity
      }
    });
  }

  static createAction(
    playerId: string,
    action: string,
    parameters?: Record<string, any>,
    sequence: number = 0
  ): PlayerInput {
    return new PlayerInputImpl({
      playerId,
      type: InputType.ACTION,
      sequence,
      data: {
        action,
        parameters
      }
    });
  }

  static fromJSON(json: any): PlayerInput {
    return new PlayerInputImpl({
      id: json.id,
      playerId: json.playerId,
      sequence: json.sequence,
      type: json.type,
      timestamp: json.timestamp,
      data: json.data,
      status: json.status,
      acknowledgment: json.acknowledgment,
      rateLimitInfo: json.rateLimitInfo
    });
  }
}