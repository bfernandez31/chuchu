import { AnalogStickComponent } from './analog-stick.component';
import { PlayerInput, InputData } from '../common/player-input';

export interface InputMetrics {
  totalInputs: number;
  averageLatency: number;
  acknowledgedInputs: number;
  droppedInputs: number;
  lastInputTime: number;
}

export interface PredictiveInputOptions {
  enablePrediction: boolean;
  immediateVisualFeedback: boolean;
  inputBuffering: boolean;
  maxBufferSize: number;
  acknowledgmentTimeout: number; // ms
}

export class InputComponent {
  analogStick: AnalogStickComponent;
  panel: HTMLDivElement | undefined;
  label: HTMLDivElement | undefined;
  up: HTMLButtonElement | undefined;
  down: HTMLButtonElement | undefined;
  left: HTMLButtonElement | undefined;
  right: HTMLButtonElement | undefined;
  quit: HTMLButtonElement | undefined;
  lastArrowTime: number = 0;
  stickActive: boolean = false;

  // Enhanced input system
  private inputSequence: number = 0;
  private inputBuffer: PlayerInput[] = [];
  private pendingAcknowledgments: Map<number, number> = new Map(); // sequence -> timestamp
  private inputMetrics: InputMetrics;
  private predictiveOptions: PredictiveInputOptions;

  // Rate limiting
  private inputRateLimit = 60; // inputs per second
  private inputTimes: number[] = [];

  // Visual feedback
  private feedbackElements: Map<string, HTMLElement> = new Map();
  private lastFeedbackTime = 0;

  constructor() {
    this.analogStick = new AnalogStickComponent();

    this.inputMetrics = {
      totalInputs: 0,
      averageLatency: 0,
      acknowledgedInputs: 0,
      droppedInputs: 0,
      lastInputTime: 0
    };

    this.predictiveOptions = {
      enablePrediction: true,
      immediateVisualFeedback: true,
      inputBuffering: true,
      maxBufferSize: 10,
      acknowledgmentTimeout: 1000
    };

    // Start cleanup interval
    setInterval(() => this.cleanupPendingAcknowledgments(), 1000);

    // Initialize visual feedback styles
    this.initVisualFeedbackStyles();
  }

  /**
   * Create timestamped input with prediction metadata
   */
  private createTimestampedInput(
    playerId: string,
    inputType: 'ARROW_PLACE' | 'MOVE' | 'ACTION',
    data: any
  ): PlayerInput {
    const now = Date.now();
    this.inputSequence++;

    const input: PlayerInput = {
      playerId,
      timestamp: now,
      sequence: this.inputSequence,
      inputType,
      data,
      rateLimitingInfo: {
        windowStart: now - 1000,
        windowEnd: now,
        inputCount: this.getRecentInputCount(),
        allowedCount: this.inputRateLimit
      },
      acknowledged: false,
      acknowledgmentTimeout: this.predictiveOptions.acknowledgmentTimeout
    };

    return input;
  }

  /**
   * Send predictive input with immediate feedback
   */
  private sendPredictiveInput(
    ws: WebSocket,
    playerId: string,
    inputType: 'ARROW_PLACE' | 'MOVE' | 'ACTION',
    data: any,
    activity: () => void
  ): void {
    // Check rate limiting
    if (!this.checkRateLimit()) {
      console.warn('Input rate limit exceeded');
      return;
    }

    const input = this.createTimestampedInput(playerId, inputType, data);

    // Add to buffer if enabled
    if (this.predictiveOptions.inputBuffering) {
      this.inputBuffer.push(input);

      // Maintain buffer size
      if (this.inputBuffer.length > this.predictiveOptions.maxBufferSize) {
        this.inputBuffer.shift();
      }
    }

    // Track pending acknowledgment
    this.pendingAcknowledgments.set(input.sequence, input.timestamp);

    // Apply immediate visual feedback
    if (this.predictiveOptions.immediateVisualFeedback) {
      this.applyImmediateVisualFeedback(input);
    }

    // Send predictive input message
    const predictiveMessage = {
      type: 'predictive-input',
      playerId: input.playerId,
      input: {
        timestamp: input.timestamp,
        sequence: input.sequence,
        inputType: input.inputType,
        data: input.data
      },
      prediction: {
        predictionId: `pred_${input.sequence}_${Date.now()}`,
        expectedOutcome: this.generateExpectedOutcome(input),
        confidence: this.calculatePredictionConfidence(input)
      }
    };

    ws.send(JSON.stringify(predictiveMessage));

    // Update metrics
    this.updateInputMetrics(input);
    activity();
  }

  /**
   * Apply immediate visual feedback for input
   */
  private applyImmediateVisualFeedback(input: PlayerInput): void {
    const now = Date.now();

    // Skip if too frequent (maintain 60 FPS)
    if (now - this.lastFeedbackTime < 16.67) {
      return;
    }

    switch (input.inputType) {
      case 'ARROW_PLACE':
        this.showArrowPlacementFeedback(input.data.direction);
        break;
      case 'MOVE':
        this.showMovementFeedback(input.data.direction);
        break;
      case 'ACTION':
        this.showActionFeedback(input.data.action);
        break;
    }

    this.lastFeedbackTime = now;
  }

  /**
   * Show arrow placement feedback
   */
  private showArrowPlacementFeedback(direction: string): void {
    const arrowButton = this.getArrowButton(direction);
    if (arrowButton) {
      arrowButton.classList.add('input-feedback');
      setTimeout(() => {
        arrowButton.classList.remove('input-feedback');
      }, 150);
    }
  }

  /**
   * Show movement feedback
   */
  private showMovementFeedback(direction: string): void {
    // Create visual indicator for movement prediction
    const indicator = document.createElement('div');
    indicator.className = 'movement-prediction';
    indicator.style.cssText = `
      position: absolute;
      width: 20px;
      height: 20px;
      background: rgba(0, 255, 0, 0.5);
      border-radius: 50%;
      pointer-events: none;
      z-index: 1000;
      transition: all 0.3s ease;
    `;

    // Position based on analog stick position
    const stickTrack = document.getElementById('analog-stick-track');
    if (stickTrack) {
      const rect = stickTrack.getBoundingClientRect();
      indicator.style.left = `${rect.left + rect.width / 2}px`;
      indicator.style.top = `${rect.top + rect.height / 2}px`;

      document.body.appendChild(indicator);

      // Animate and remove
      setTimeout(() => {
        indicator.style.opacity = '0';
        indicator.style.transform = 'scale(2)';
      }, 10);

      setTimeout(() => {
        document.body.removeChild(indicator);
      }, 300);
    }
  }

  /**
   * Show action feedback
   */
  private showActionFeedback(action: string): void {
    // Visual feedback for action inputs
    const feedbackText = document.createElement('div');
    feedbackText.textContent = action.toUpperCase();
    feedbackText.className = 'action-feedback';
    feedbackText.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #00ff00;
      font-size: 24px;
      font-weight: bold;
      pointer-events: none;
      z-index: 1000;
      opacity: 0;
      transition: all 0.5s ease;
    `;

    document.body.appendChild(feedbackText);

    setTimeout(() => {
      feedbackText.style.opacity = '1';
      feedbackText.style.transform = 'translate(-50%, -60%)';
    }, 10);

    setTimeout(() => {
      feedbackText.style.opacity = '0';
    }, 400);

    setTimeout(() => {
      document.body.removeChild(feedbackText);
    }, 500);
  }

  /**
   * Handle input acknowledgment from server
   */
  public handleInputAcknowledgment(acknowledgment: { playerId: string; acknowledgedSequence: number; processingTime: number }): void {
    const sentTime = this.pendingAcknowledgments.get(acknowledgment.acknowledgedSequence);

    if (sentTime) {
      const latency = Date.now() - sentTime;
      this.updateLatencyMetrics(latency);
      this.pendingAcknowledgments.delete(acknowledgment.acknowledgedSequence);

      // Mark input as acknowledged in buffer
      const input = this.inputBuffer.find(i => i.sequence === acknowledgment.acknowledgedSequence);
      if (input) {
        input.acknowledged = true;
      }

      this.inputMetrics.acknowledgedInputs++;
    }
  }

  /**
   * Check if rate limit allows new input
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    const windowStart = now - 1000; // 1 second window

    // Clean old entries
    this.inputTimes = this.inputTimes.filter(time => time > windowStart);

    // Check if under limit
    if (this.inputTimes.length < this.inputRateLimit) {
      this.inputTimes.push(now);
      return true;
    }

    return false;
  }

  /**
   * Generate expected outcome for prediction
   */
  private generateExpectedOutcome(input: PlayerInput): string {
    switch (input.inputType) {
      case 'ARROW_PLACE':
        return `arrow_placed_${input.data.direction}`;
      case 'MOVE':
        return `player_moved_${input.data.x}_${input.data.y}`;
      case 'ACTION':
        return `action_executed_${input.data.action}`;
      default:
        return 'unknown_outcome';
    }
  }

  /**
   * Calculate prediction confidence based on current conditions
   */
  private calculatePredictionConfidence(input: PlayerInput): number {
    let confidence = 1.0;

    // Reduce confidence based on pending acknowledgments
    const pendingCount = this.pendingAcknowledgments.size;
    confidence *= Math.max(0.5, 1 - (pendingCount * 0.1));

    // Reduce confidence based on recent dropped inputs
    const dropRate = this.inputMetrics.totalInputs > 0 ?
      this.inputMetrics.droppedInputs / this.inputMetrics.totalInputs : 0;
    confidence *= Math.max(0.3, 1 - dropRate);

    // Reduce confidence based on latency
    if (this.inputMetrics.averageLatency > 200) {
      confidence *= 0.8;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Get recent input count for rate limiting
   */
  private getRecentInputCount(): number {
    const now = Date.now();
    const windowStart = now - 1000;
    return this.inputTimes.filter(time => time > windowStart).length;
  }

  /**
   * Update input metrics
   */
  private updateInputMetrics(input: PlayerInput): void {
    this.inputMetrics.totalInputs++;
    this.inputMetrics.lastInputTime = input.timestamp;
  }

  /**
   * Update latency metrics
   */
  private updateLatencyMetrics(latency: number): void {
    const currentAvg = this.inputMetrics.averageLatency;
    const count = this.inputMetrics.acknowledgedInputs;

    this.inputMetrics.averageLatency = (currentAvg * count + latency) / (count + 1);
  }

  /**
   * Cleanup pending acknowledgments that have timed out
   */
  private cleanupPendingAcknowledgments(): void {
    const now = Date.now();
    const timeout = this.predictiveOptions.acknowledgmentTimeout;

    for (const entry of Array.from(this.pendingAcknowledgments.entries())) {
      const [sequence, timestamp] = entry;
      if (now - timestamp > timeout) {
        this.pendingAcknowledgments.delete(sequence);
        this.inputMetrics.droppedInputs++;
      }
    }
  }

  /**
   * Get arrow button by direction
   */
  private getArrowButton(direction: string): HTMLButtonElement | undefined {
    switch (direction) {
      case 'U': return this.up;
      case 'D': return this.down;
      case 'L': return this.left;
      case 'R': return this.right;
      default: return undefined;
    }
  }

  detectArrowFromSecondTouch(touch: Touch, ws: WebSocket, key: string, activity: () => void) {
    const x = touch.clientX;
    const y = touch.clientY;

    // Vérifie quel bouton est sous cette coordonnée
    const element = document.elementFromPoint(x, y);

    // Fonction pour trouver le bouton parent
    const findArrowButton = (el: Element | null): string | null => {
      if (!el) return null;

      // Vérification directe
      if (el.id === 'arrow-up') return 'U';
      if (el.id === 'arrow-down') return 'D';
      if (el.id === 'arrow-left') return 'L';
      if (el.id === 'arrow-right') return 'R';

      // Vérification du parent (pour les enfants comme le texte)
      if (el.parentElement) {
        return findArrowButton(el.parentElement);
      }

      return null;
    };

    const direction = findArrowButton(element);
    if (direction) {
      const now = Date.now();
      // Évite les déclenchements multiples (debouncing 150ms)
      if (now - this.lastArrowTime > 150) {
        ws.send(JSON.stringify({type: 'arrow', direction, key}));
        activity();
        this.lastArrowTime = now;
      }
    }
  }

  init(ws: WebSocket, key: string, activity: () => void) {
    this.panel = document.getElementById('panel-input') as HTMLDivElement;
    this.label = document.getElementById('player-label') as HTMLDivElement;

    this.up = document.getElementById('arrow-up') as HTMLButtonElement;
    this.down = document.getElementById('arrow-down') as HTMLButtonElement;
    this.left = document.getElementById('arrow-left') as HTMLButtonElement;
    this.right = document.getElementById('arrow-right') as HTMLButtonElement;

    this.quit = document.getElementById('quit') as HTMLButtonElement;

    if (this.label && this.panel) {
      this.hide();

      // Initialisation du stick analogique with predictive input
      this.analogStick.init((x: number, y: number) => {
        if (this.predictiveOptions.enablePrediction) {
          this.sendPredictiveInput(ws, key, 'MOVE', { x, y }, activity);
        } else {
          ws.send(JSON.stringify({type: 'input', key, x, y}));
          activity();
        }
      });

      // Gestion multi-touch pour les flèches (conservé de l'ancien système)
      document.addEventListener("touchstart", (event) => {
        if (event.touches.length >= 2) {
          // Trouve la touche qui n'est pas sur le stick
          for (let i = 0; i < event.touches.length; i++) {
            const touch = event.touches[i];
            const element = document.elementFromPoint(touch.clientX, touch.clientY);
            const stickTrack = document.getElementById('analog-stick-track');
            if (element && stickTrack && !stickTrack.contains(element)) {
              this.detectArrowFromSecondTouch(touch, ws, key, activity);
              break;
            }
          }
        }
      }, {passive: false});

      this.up.addEventListener("click", () => {
        if (this.predictiveOptions.enablePrediction) {
          this.sendPredictiveInput(ws, key, 'ARROW_PLACE', { direction: 'U' }, activity);
        } else {
          ws.send(JSON.stringify({type: 'arrow', direction: 'U', key}));
          activity();
        }
      }, false);
      this.down.addEventListener("click", () => {
        if (this.predictiveOptions.enablePrediction) {
          this.sendPredictiveInput(ws, key, 'ARROW_PLACE', { direction: 'D' }, activity);
        } else {
          ws.send(JSON.stringify({type: 'arrow', direction: 'D', key}));
          activity();
        }
      }, false);
      this.left.addEventListener("click", () => {
        if (this.predictiveOptions.enablePrediction) {
          this.sendPredictiveInput(ws, key, 'ARROW_PLACE', { direction: 'L' }, activity);
        } else {
          ws.send(JSON.stringify({type: 'arrow', direction: 'L', key}));
          activity();
        }
      }, false);
      this.right.addEventListener("click", () => {
        if (this.predictiveOptions.enablePrediction) {
          this.sendPredictiveInput(ws, key, 'ARROW_PLACE', { direction: 'R' }, activity);
        } else {
          ws.send(JSON.stringify({type: 'arrow', direction: 'R', key}));
          activity();
        }
      }, false);
      this.quit.addEventListener("click", () => {
        ws.send(JSON.stringify({type: 'quit', key}));
        activity();
      }, false);
    } else {
      setTimeout(() => this.init(ws, key, activity), 100);
    }
  }

  show(color: string, name: string) {
    this.panel!.style.display = "flex";
    this.label!.style.color = color;
    this.label!.innerText = name;
  }

  hide() {
    this.panel!.style.display = "none";
  }

  /**
   * Get current input metrics
   */
  public getInputMetrics(): InputMetrics {
    return { ...this.inputMetrics };
  }

  /**
   * Get input buffer status
   */
  public getInputBufferStatus(): {
    bufferedInputs: number;
    acknowledgedInputs: number;
    pendingInputs: number;
    averageLatency: number;
  } {
    const acknowledgedCount = this.inputBuffer.filter(input => input.acknowledged).length;
    const pendingCount = this.pendingAcknowledgments.size;

    return {
      bufferedInputs: this.inputBuffer.length,
      acknowledgedInputs: acknowledgedCount,
      pendingInputs: pendingCount,
      averageLatency: this.inputMetrics.averageLatency
    };
  }

  /**
   * Update predictive input options
   */
  public updatePredictiveOptions(options: Partial<PredictiveInputOptions>): void {
    this.predictiveOptions = { ...this.predictiveOptions, ...options };
  }

  /**
   * Enable or disable prediction mode
   */
  public setPredictionEnabled(enabled: boolean): void {
    this.predictiveOptions.enablePrediction = enabled;

    if (!enabled) {
      // Clear pending acknowledgments when disabling prediction
      this.pendingAcknowledgments.clear();
      this.inputBuffer.length = 0;
    }
  }

  /**
   * Set input rate limit
   */
  public setRateLimit(inputsPerSecond: number): void {
    this.inputRateLimit = Math.max(1, Math.min(120, inputsPerSecond));
  }

  /**
   * Get prediction performance stats
   */
  public getPredictionStats(): {
    predictionAccuracy: number;
    averageConfidence: number;
    rollbackFrequency: number;
    inputResponseTime: number;
  } {
    const totalInputs = this.inputMetrics.totalInputs;
    const acknowledgedInputs = this.inputMetrics.acknowledgedInputs;

    const predictionAccuracy = totalInputs > 0 ?
      (acknowledgedInputs / totalInputs) * 100 : 100;

    // Calculate average confidence from recent inputs
    const recentInputs = this.inputBuffer.slice(-10);
    const averageConfidence = recentInputs.length > 0 ?
      recentInputs.reduce((sum, input) => {
        return sum + this.calculatePredictionConfidence(input);
      }, 0) / recentInputs.length : 1.0;

    return {
      predictionAccuracy,
      averageConfidence,
      rollbackFrequency: 0, // Would be calculated by PredictiveRenderer
      inputResponseTime: this.inputMetrics.averageLatency
    };
  }

  /**
   * Clear input buffer and reset metrics
   */
  public reset(): void {
    this.inputBuffer.length = 0;
    this.pendingAcknowledgments.clear();
    this.inputTimes.length = 0;
    this.inputSequence = 0;

    this.inputMetrics = {
      totalInputs: 0,
      averageLatency: 0,
      acknowledgedInputs: 0,
      droppedInputs: 0,
      lastInputTime: 0
    };
  }

  /**
   * Add CSS for visual feedback
   */
  private initVisualFeedbackStyles(): void {
    if (document.getElementById('input-feedback-styles')) return;

    const style = document.createElement('style');
    style.id = 'input-feedback-styles';
    style.textContent = `
      .input-feedback {
        background-color: rgba(0, 255, 0, 0.3) !important;
        transform: scale(1.1);
        transition: all 0.15s ease;
      }

      .movement-prediction {
        box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
      }

      .action-feedback {
        text-shadow: 0 0 10px rgba(0, 255, 0, 0.8);
      }
    `;

    document.head.appendChild(style);
  }
}