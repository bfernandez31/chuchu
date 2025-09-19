import QueueDisplay from './queue.display';
import {ScoreDisplay} from "./score.display";
import {GameDisplay} from "./game.display";
import {QrCodeDisplay} from "./qrcode.display";
import {createWs} from '../common/ws';
import {CONFIG} from "../common/config";
import {decodeServerMessage, ServerMessage} from '../../src/messages_pb';

/**
 * Optimiseur de rendu avec requestAnimationFrame pour synchroniser
 * le rendu avec le refresh rate de l'écran et éviter les redraw inutiles
 */
class OptimizedRenderer {
  private needsRedraw: boolean = false;
  private isRendering: boolean = false;
  private lastFrameTime: number = 0;
  private targetFPS: number = 60;
  private frameInterval: number = 1000 / this.targetFPS;
  private gameDisplay: GameDisplay;
  private pendingGameState: any = null;
  private previousState: any = null;
  private targetState: any = null;
  private interpolatedState: any = null;
  private transitionStartTime: number = 0;
  private transitionDuration: number = 100;
  private lastUpdateTimestamp: number = 0;

  constructor(gameDisplay: GameDisplay) {
    this.gameDisplay = gameDisplay;
    this.startRenderLoop();
  }

  private startRenderLoop() {
    const renderFrame = (currentTime: number) => {
      if (currentTime - this.lastFrameTime >= this.frameInterval) {
        if (!this.isRendering && this.pendingGameState) {
          this.isRendering = true;
          const renderState = this.computeInterpolatedState(currentTime);
          const payload = { ...this.pendingGameState, state: renderState ?? this.pendingGameState.state };
          this.gameDisplay.display(payload);
          this.isRendering = false;
          this.lastFrameTime = currentTime;
        }
      }
      requestAnimationFrame(renderFrame);
    };

    requestAnimationFrame(renderFrame);
  }

  // Appelé par les WebSocket messages
  markForRedraw(gameState: any) {
    const now = performance.now();

    if (this.interpolatedState) {
      this.previousState = this.cloneState(this.interpolatedState);
    } else if (this.targetState) {
      this.previousState = this.cloneState(this.targetState);
    } else if (this.pendingGameState?.state) {
      this.previousState = this.cloneState(this.pendingGameState.state);
    } else {
      this.previousState = this.cloneState(gameState.state);
    }

    this.targetState = this.cloneState(gameState.state);
    this.transitionStartTime = now;

    if (this.lastUpdateTimestamp === 0) {
      this.transitionDuration = this.frameInterval;
    } else {
      const delta = now - this.lastUpdateTimestamp;
      this.transitionDuration = this.clamp(delta, 16, 160);
    }

    this.lastUpdateTimestamp = now;

    this.pendingGameState = gameState;
    this.needsRedraw = true;
  }

  // FPS adaptatif selon la charge (nombre d'entités)
  setTargetFPS(fps: number) {
    this.targetFPS = Math.max(15, Math.min(60, fps));
    this.frameInterval = 1000 / this.targetFPS;
  }

  // Adaptation automatique du FPS selon le contenu
  adaptFPSBasedOnGameState(gameState: any) {
    if (!gameState?.state?.strategy) return;

    const entityCount = (gameState.state.strategy.mouses?.length || 0) +
                       (gameState.state.strategy.cats?.length || 0) +
                       (gameState.state.players?.length || 0);

    // Plus d'entités = FPS plus bas pour maintenir les performances
    let adaptedFPS = 60;
    if (entityCount > 100) {
      adaptedFPS = 30;
    } else if (entityCount > 50) {
      adaptedFPS = 45;
    }

    this.setTargetFPS(adaptedFPS);
  }

  private computeInterpolatedState(currentTime: number): any {
    if (!this.targetState) {
      if (this.pendingGameState?.state) {
        this.interpolatedState = this.cloneState(this.pendingGameState.state);
        return this.interpolatedState;
      }
      return null;
    }

    const duration = this.transitionDuration || this.frameInterval;
    const elapsed = currentTime - this.transitionStartTime;
    const progress = duration > 0 ? Math.min(1, Math.max(0, elapsed / duration)) : 1;

    if (!this.previousState) {
      this.previousState = this.cloneState(this.targetState);
    }

    this.interpolatedState = this.interpolateState(this.previousState, this.targetState, progress);

    if (progress >= 1) {
      this.previousState = this.cloneState(this.targetState);
      this.targetState = null;
      this.needsRedraw = false;
    }

    return this.interpolatedState;
  }

  private interpolateState(fromState: any, toState: any, progress: number): any {
    if (!fromState || !toState) {
      return this.cloneState(toState ?? fromState);
    }

    const eased = this.smoothStep(progress);
    const result = this.cloneState(toState);

    if (Array.isArray(fromState.players) && Array.isArray(toState.players)) {
      result.players = this.interpolateEntityArray(fromState.players, toState.players, eased, true);
    }

    if (fromState.strategy && toState.strategy) {
      if (Array.isArray(fromState.strategy.mouses) && Array.isArray(toState.strategy.mouses)) {
        result.strategy.mouses = this.interpolateEntityArray(fromState.strategy.mouses, toState.strategy.mouses, eased);
      }

      if (Array.isArray(fromState.strategy.cats) && Array.isArray(toState.strategy.cats)) {
        result.strategy.cats = this.interpolateEntityArray(fromState.strategy.cats, toState.strategy.cats, eased);
      }
    }

    return result;
  }

  private interpolateEntityArray(fromList: any[], toList: any[], progress: number, includeNested = false): any[] {
    return toList.map((toEntity, index) => {
      const fromEntity = this.findMatchingEntity(fromList, toEntity, index);

      if (!fromEntity) {
        return JSON.parse(JSON.stringify(toEntity));
      }

      const interpolated = { ...toEntity };

      if (Array.isArray(fromEntity.position) && Array.isArray(toEntity.position)) {
        interpolated.position = this.interpolatePoint(fromEntity.position, toEntity.position, progress);
      }

      if (includeNested && Array.isArray(fromEntity.arrows) && Array.isArray(toEntity.arrows)) {
        interpolated.arrows = this.interpolateEntityArray(fromEntity.arrows, toEntity.arrows, progress);
      }

      return interpolated;
    });
  }

  private findMatchingEntity(fromList: any[], targetEntity: any, fallbackIndex: number): any {
    if (targetEntity && typeof targetEntity.id !== 'undefined') {
      const match = fromList.find(item => item && item.id === targetEntity.id);
      if (match) {
        return match;
      }
    }

    return fromList[fallbackIndex] ?? null;
  }

  private interpolatePoint(from: number[], to: number[], progress: number): number[] {
    return [
      from[0] + (to[0] - from[0]) * progress,
      from[1] + (to[1] - from[1]) * progress
    ];
  }

  private cloneState<T>(state: T): T {
    if (state === null || state === undefined) {
      return state;
    }

    const globalClone = (globalThis as any)?.structuredClone;
    if (typeof globalClone === 'function') {
      return globalClone(state);
    }

    return JSON.parse(JSON.stringify(state));
  }

  private smoothStep(t: number): number {
    return t * t * (3 - 2 * t);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}

const queue = new QueueDisplay();
const score = new ScoreDisplay();
const game = new GameDisplay();
const qrcode = new QrCodeDisplay();
const optimizedRenderer = new OptimizedRenderer(game);

let ws: WebSocket;
let lastGameState: any = null;

fetch('/config.json').then(config => {
  config.json().then(json => {
    // @ts-ignore
    Object.keys(json).forEach(key => CONFIG[key] = json[key])
    console.log(JSON.stringify(CONFIG), 4);
    const connect = () => {
      ws = createWs();

      ws.addEventListener('open', () => {
        ws.send(JSON.stringify({type: 'server'}));
        qrcode.init();
      })

      ws.addEventListener("message", function (event) {
        let handlePayload = (payload: ServerMessage) => {
          switch (payload.type) {
            case 'GAME_':
              lastGameState = { ...lastGameState, ...payload.game};
              const gameState = {state: lastGameState};

              // Adaptation automatique du FPS selon la charge
              optimizedRenderer.adaptFPSBasedOnGameState(gameState);

              // Demander un redraw avec le nouveau système optimisé
              optimizedRenderer.markForRedraw(gameState);
              break;
            case 'QU_':
              queue.update(payload.queue);
              break;
            case 'SC_':
              score.updateHighScore(payload.score);
              break;
          }
        };
        if (event.data instanceof Blob) {
          const reader = new FileReader();
          reader.onload = function() {
            const arrayBuffer = reader.result as ArrayBuffer;
            const data = new Uint8Array(arrayBuffer);
            const payload = decodeServerMessage(data);
            handlePayload(payload);
          };
          reader.readAsArrayBuffer(event.data);
        } else if (event.data instanceof ArrayBuffer) {
          const data = new Uint8Array(event.data);
          const payload = decodeServerMessage(data);
          handlePayload(payload);
        } else if (event.data instanceof Uint8Array) {
          const payload = decodeServerMessage(event.data);
          handlePayload(payload);
        } else if (event.data.buffer instanceof ArrayBuffer) {
          const data = new Uint8Array(event.data.buffer);
          const payload = decodeServerMessage(data);
          handlePayload(payload);
        } else {
          // fallback JSON si besoin (pour compatibilité)
          try {
            const payload = JSON.parse(event.data.toString());
            handlePayload(payload);
          } catch (e) {
            console.error('Impossible de décoder le message WebSocket', e);
          }
        }
      });

      ws.addEventListener('close', (event) => {
        setTimeout(() => connect(), 1000);
      });
    }

    connect();
  })
})
