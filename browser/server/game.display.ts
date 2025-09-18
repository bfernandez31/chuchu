import {CONFIG} from "../common/config";
import {colors} from "../../src/colors";
import {arrowImg, cursorImg, goalImg} from "./images";
import {Direction} from "../../src/direction";

export class GameDisplay {
  canvas!: HTMLCanvasElement;
  debug?: HTMLDivElement;
  context!: CanvasRenderingContext2D;
  size: number = 10;
  drawElement!: HTMLDivElement;
  mouseImg: HTMLImageElement;
  mouseImg2: HTMLImageElement;
  catImg: HTMLImageElement;
  catImg2: HTMLImageElement;
  wallImg: HTMLImageElement;
  goalImg: { [color: string]: HTMLImageElement } = {};
  cursorImg: { [color: string]: HTMLImageElement } = {};
  arrowImg: { [color: string]: HTMLImageElement } = {};
  ready: boolean = false;
  cellSize: [number, number] = [0, 0];
  useAlt: boolean = false;

  // Enhanced multi-layer rendering system
  private layers: Map<string, HTMLCanvasElement> = new Map();
  private layerContexts: Map<string, CanvasRenderingContext2D> = new Map();
  private layerDirty: Map<string, boolean> = new Map();
  private renderLayers = ['background', 'walls', 'entities', 'players', 'ui', 'predictive'];

  // Performance optimizations
  private gridCanvas!: HTMLCanvasElement;
  private gridContext!: CanvasRenderingContext2D;
  private gridCached: boolean = false;
  private lastUseAltUpdate: number = 0;
  private currentGridSize: [number, number] = [0, 0];

  // 60 FPS performance optimization
  private lastFrameTime = 0;
  private frameCount = 0;
  private fpsHistory: number[] = [];
  private targetFPS = 60;
  private frameTimeThreshold = 16.67; // 60 FPS = 16.67ms per frame

  constructor() {
    this.mouseImg = new Image();
    this.mouseImg.src = "/img/mouse.svg";
    this.mouseImg2 = new Image();
    this.mouseImg2.src = "/img/mouse2.svg";
    this.catImg = new Image();
    this.catImg.src = "/img/cat.svg";
    this.catImg2 = new Image();
    this.catImg2.src = "/img/cat2.svg";
    this.wallImg = new Image();
    this.wallImg.src = "/img/wall.svg";

    colors.forEach((color) => {
      this.initImagesForColor(color);
    });

    setTimeout(() => this.init(), 100);
  }

  private initImagesForColor(color: string) {
    this.goalImg[color] = goalImg(color);
    this.cursorImg[color] = cursorImg(color);
    this.arrowImg[color] = arrowImg(color);
  }

  resize(cols: number, rows: number) {
    const oldRows = CONFIG.ROWS;
    const oldCols = CONFIG.COLUMNS;

    CONFIG.ROWS = rows ?? CONFIG.ROWS;
    CONFIG.COLUMNS = cols ?? CONFIG.COLUMNS;
    this.cellSize = [CONFIG.GLOBAL_WIDTH / CONFIG.ROWS, CONFIG.GLOBAL_HEIGHT / CONFIG.COLUMNS];

    // Invalidate grid cache if size changed
    if (oldRows !== CONFIG.ROWS || oldCols !== CONFIG.COLUMNS) {
      this.gridCached = false;
    }
  }

  init() {
    this.canvas = window.document.body.querySelector(".game-canvas")!;
    this.drawElement = window.document.body.querySelector("div.draw")!;
    this.context = this.canvas.getContext('2d')!;
    this.size = Math.min(this.drawElement.getBoundingClientRect().width, this.drawElement.getBoundingClientRect().height);
    this.canvas.width = CONFIG.GLOBAL_WIDTH;
    this.canvas.height = CONFIG.GLOBAL_HEIGHT;
    this.canvas.style.width = `${this.size}px`;
    this.canvas.style.height = `${this.size}px`;
    this.debug = window.document.body.querySelector(".debug-game-state")!;
    this.cellSize = [CONFIG.GLOBAL_WIDTH / CONFIG.ROWS, CONFIG.GLOBAL_HEIGHT / CONFIG.COLUMNS];

    // Initialize grid cache canvas
    this.initGridCache();

    // Initialize multi-layer rendering system
    this.initLayers();

    this.ready = true;
  }

  /**
   * Initialize multi-layer rendering system for performance optimization
   */
  private initLayers(): void {
    this.renderLayers.forEach(layerName => {
      const canvas = document.createElement('canvas');
      canvas.width = CONFIG.GLOBAL_WIDTH;
      canvas.height = CONFIG.GLOBAL_HEIGHT;
      const context = canvas.getContext('2d')!;

      this.layers.set(layerName, canvas);
      this.layerContexts.set(layerName, context);
      this.layerDirty.set(layerName, true);
    });
  }

  /**
   * Mark a specific layer as dirty for re-rendering
   */
  private markLayerDirty(layerName: string): void {
    this.layerDirty.set(layerName, true);
  }

  /**
   * Mark all layers as dirty
   */
  private markAllLayersDirty(): void {
    this.renderLayers.forEach(layer => this.markLayerDirty(layer));
  }

  previousPayload = {state: {players: [], cols: 0, rows: 0, strategy: {name: '', walls: []}}};

  display(newPayload: any) {
    const frameStartTime = performance.now();

    // Skip frame if we're exceeding target frame time
    if (frameStartTime - this.lastFrameTime < this.frameTimeThreshold) {
      return;
    }

    const payload = {...this.previousPayload, ...newPayload, state: {...this.previousPayload.state, ...newPayload.state}};

    this.resize(payload.state.cols, payload.state.rows);

    if (this.ready) {
      // Clear main canvas
      if (this.context) {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }

      // Optimize useAlt calculation - only update every 500ms
      this.updateUseAlt();

      // Determine which layers need updating
      this.determineLayerUpdates(payload);

      // Render layers that need updating
      this.renderLayers.forEach(layerName => {
        if (this.layerDirty.get(layerName)) {
          this.renderLayer(layerName, payload);
          this.layerDirty.set(layerName, false);
        }
      });

      // Composite all layers onto main canvas
      this.compositeLayers();

      // Track performance
      this.trackFramePerformance(frameStartTime);
    }

    this.previousPayload = payload;
  }

  /**
   * Determine which layers need updating based on payload changes
   */
  private determineLayerUpdates(payload: any): void {
    // Always update entities and players layers for animation
    this.markLayerDirty('entities');
    this.markLayerDirty('players');

    // Check for structural changes
    if (!this.previousPayload.state ||
        payload.state.cols !== this.previousPayload.state.cols ||
        payload.state.rows !== this.previousPayload.state.rows) {
      this.markAllLayersDirty();
      return;
    }

    // Check for strategy changes (affects walls and background)
    if (payload.state.strategy?.name !== this.previousPayload.state?.strategy?.name) {
      this.markLayerDirty('background');
      this.markLayerDirty('walls');
      this.markLayerDirty('ui');
    }

    // Check for wall changes
    if (JSON.stringify(payload.state.strategy?.walls) !== JSON.stringify(this.previousPayload.state?.strategy?.walls)) {
      this.markLayerDirty('walls');
    }
  }

  /**
   * Render a specific layer
   */
  private renderLayer(layerName: string, payload: any): void {
    const context = this.layerContexts.get(layerName);
    if (!context) return;

    // Clear layer
    context.clearRect(0, 0, CONFIG.GLOBAL_WIDTH, CONFIG.GLOBAL_HEIGHT);

    if (!payload.state || !payload.state.strategy) return;

    switch (layerName) {
      case 'background':
        this.renderBackgroundLayer(context, payload.state);
        break;
      case 'walls':
        this.renderWallsLayer(context, payload.state);
        break;
      case 'entities':
        this.renderEntitiesLayer(context, payload.state);
        break;
      case 'players':
        this.renderPlayersLayer(context, payload.state);
        break;
      case 'ui':
        this.renderUILayer(context, payload.state);
        break;
      case 'predictive':
        this.renderPredictiveLayer(context, payload.state);
        break;
    }
  }

  /**
   * Composite all layers onto the main canvas
   */
  private compositeLayers(): void {
    this.renderLayers.forEach(layerName => {
      const canvas = this.layers.get(layerName);
      if (canvas) {
        this.context.drawImage(canvas, 0, 0);
      }
    });
  }

  /**
   * Track frame performance and FPS
   */
  private trackFramePerformance(frameStartTime: number): void {
    const frameEndTime = performance.now();
    const frameTime = frameEndTime - frameStartTime;
    const fps = 1000 / (frameEndTime - this.lastFrameTime);

    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > 60) { // Keep last 60 samples
      this.fpsHistory.shift();
    }

    this.lastFrameTime = frameEndTime;
    this.frameCount++;

    // Log performance warnings if FPS drops below target
    if (fps < this.targetFPS * 0.8 && this.frameCount % 60 === 0) {
      console.warn(`Low FPS detected: ${fps.toFixed(1)} FPS (frame time: ${frameTime.toFixed(2)}ms)`);
    }
  }

  /**
   * Render background layer (grid and strategy name)
   */
  private renderBackgroundLayer(context: CanvasRenderingContext2D, state: any): void {
    // Draw grid
    const originalContext = this.context;
    this.context = context;
    this.drawCachedGrid();
    this.context = originalContext;
  }

  /**
   * Render walls layer
   */
  private renderWallsLayer(context: CanvasRenderingContext2D, state: any): void {
    state.strategy.walls.forEach((wall: any) => {
      context.drawImage(this.wallImg, wall.position[0], wall.position[1], this.cellSize[0], this.cellSize[1]);
    });
  }

  /**
   * Render entities layer (mice and cats)
   */
  private renderEntitiesLayer(context: CanvasRenderingContext2D, state: any): void {
    const originalContext = this.context;
    this.context = context;

    // Draw mice
    const mouseImg = this.useAlt ? this.mouseImg2 : this.mouseImg;
    (state.strategy.mouses ?? []).forEach((mouse: any) => {
      this.drawRotated(mouseImg, mouse.position[0], mouse.position[1], this.angleFor(mouse.direction, 'mouse'));
    });

    // Draw cats
    const catImg = this.useAlt ? this.catImg : this.catImg2;
    (state.strategy.cats ?? []).forEach((cat: any) => {
      this.drawRotated(catImg, cat.position[0], cat.position[1], this.angleFor(cat.direction, 'cat'));
    });

    this.context = originalContext;
  }

  /**
   * Render players layer (goals, cursors, arrows)
   */
  private renderPlayersLayer(context: CanvasRenderingContext2D, state: any): void {
    const originalContext = this.context;
    this.context = context;

    // Draw goals
    state.strategy.goals.forEach((goal: any) => {
      context.drawImage(this.goalImg[goal.color], goal.position[0], goal.position[1], this.cellSize[0], this.cellSize[1]);
    });

    // Draw players
    state.players.forEach((player: any) => {
      // Player position
      context.fillStyle = "#FFFFFF";
      context.beginPath();
      context.arc(player.position[0], player.position[1], 3, 0, 2 * Math.PI, true);
      context.fill();

      // Player cursor
      if (this.cursorImg[colors[player.colorIndex]] === undefined) {
        console.warn(`Cursor image for color ${colors[player.colorIndex]} not found.`);
        this.initImagesForColor(colors[player.colorIndex]);
      }
      context.drawImage(this.cursorImg[colors[player.colorIndex]], player.position[0], player.position[1], this.cellSize[0], this.cellSize[1]);

      // Player arrows
      (player.arrows || []).forEach((arrow: any) => {
        this.drawRotated(this.arrowImg[colors[player.colorIndex]], arrow.position[0], arrow.position[1], this.angleFor(arrow.direction, 'arrow'));
      });
    });

    this.context = originalContext;
  }

  /**
   * Render UI layer (strategy name, debug info)
   */
  private renderUILayer(context: CanvasRenderingContext2D, state: any): void {
    // Strategy name
    context.fillStyle = "#a0ffff";
    context.font = "50px Arial";
    context.textAlign = "center";
    context.fillText(state.strategy.name, CONFIG.GLOBAL_HEIGHT / 2, 100);

    // FPS counter (if enabled)
    if (this.fpsHistory.length > 0) {
      const avgFPS = this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
      context.fillStyle = "#00ff00";
      context.font = "20px Arial";
      context.textAlign = "left";
      context.fillText(`FPS: ${avgFPS.toFixed(1)}`, 10, 30);
    }
  }

  /**
   * Render predictive layer (client-side predictions)
   */
  private renderPredictiveLayer(context: CanvasRenderingContext2D, state: any): void {
    // This layer will be used by the PredictiveRenderer
    // For now, it's empty but ready for integration
  }

  /**
   * Get current FPS statistics
   */
  public getPerformanceStats(): {
    currentFPS: number;
    averageFPS: number;
    frameCount: number;
    layerStats: Map<string, boolean>;
  } {
    const currentFPS = this.fpsHistory.length > 0 ? this.fpsHistory[this.fpsHistory.length - 1] : 0;
    const averageFPS = this.fpsHistory.length > 0
      ? this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length
      : 0;

    return {
      currentFPS,
      averageFPS,
      frameCount: this.frameCount,
      layerStats: new Map(this.layerDirty)
    };
  }

  /**
   * Enable or disable predictive layer rendering
   */
  public setPredictiveLayerEnabled(enabled: boolean): void {
    if (enabled) {
      this.markLayerDirty('predictive');
    } else {
      const predictiveContext = this.layerContexts.get('predictive');
      if (predictiveContext) {
        predictiveContext.clearRect(0, 0, CONFIG.GLOBAL_WIDTH, CONFIG.GLOBAL_HEIGHT);
      }
    }
  }

  private drawMouses(state: any) {
    const img = this.useAlt ? this.mouseImg2 : this.mouseImg;
    (state.strategy.mouses ?? []).forEach((mouse: any) => {
      this.drawRotated(img, mouse.position[0], mouse.position[1], this.angleFor(mouse.direction, 'mouse'));
    });
  }

  private drawCats(state: any) {
    const img = this.useAlt ? this.catImg : this.catImg2;
    (state.strategy.cats ?? []).forEach((cat: any) => {
      this.drawRotated(img, cat.position[0], cat.position[1], this.angleFor(cat.direction, 'cat'));
    });
  }

  private drawPlayers(state: any) {
    // player goal
    state.strategy.goals.forEach((goal: any) => {
      this.context.drawImage(this.goalImg[goal.color], goal.position[0], goal.position[1], this.cellSize[0], this.cellSize[1]);
    });

    //player
    state.players.forEach((player: any) => {
      // player position
      this.context.fillStyle = "#FFFFFF";
      this.context.beginPath();
      this.context.arc(player.position[0], player.position[1], 3, 0, 2 * Math.PI, true);
      this.context.fill();
      if (this.cursorImg[colors[player.colorIndex]] === undefined) {
        console.warn(`Cursor image for color ${colors[player.colorIndex]} not found.`);
        this.initImagesForColor(colors[player.colorIndex]);
      }
      this.context.drawImage(this.cursorImg[colors[player.colorIndex]], player.position[0], player.position[1], this.cellSize[0], this.cellSize[1]);
      //player arrows
      (player.arrows || []).forEach((arrow: any) => {
        this.drawRotated(this.arrowImg[colors[player.colorIndex]], arrow.position[0], arrow.position[1], this.angleFor(arrow.direction, 'arrow'));
      });
    });
  }

  private drawWalls(state: any) {
    state.strategy.walls.forEach((wall: any) => {
      this.context.drawImage(this.wallImg, wall.position[0], wall.position[1], this.cellSize[0], this.cellSize[1]);
    });
  }

  private drawGrid() {
    this.context.lineWidth = 1;
    this.context.strokeStyle = 'white';
    for (let i = 0; i < CONFIG.COLUMNS + 1; i++) {
      this.context.beginPath();
      this.context.moveTo((CONFIG.GLOBAL_WIDTH / CONFIG.COLUMNS) * i, 0);
      this.context.lineTo((CONFIG.GLOBAL_WIDTH / CONFIG.COLUMNS) * i, this.canvas.height);
      this.context.stroke();
    }
    for (let i = 0; i < CONFIG.ROWS + 1; i++) {
      this.context.beginPath();
      this.context.moveTo(0, (CONFIG.GLOBAL_HEIGHT / CONFIG.ROWS) * i);
      this.context.lineTo(this.canvas.width, (CONFIG.GLOBAL_HEIGHT / CONFIG.ROWS) * i);
      this.context.stroke();
    }
  }

  drawRotated(image: HTMLImageElement, positionX: number, positionY: number, angle: number) {
    const x = this.cellSize[0] / 2;
    const y = this.cellSize[1] / 2;
    this.context.save();
    this.context.translate(positionX + x, positionY + y);
    this.context.rotate(angle);
    this.context.translate(-x, -y);
    this.context.drawImage(image, 0, 0, this.cellSize[0], this.cellSize[1]);
    this.context.restore();
  }

  angleFor(direction: Direction, type: 'mouse' | 'cat' | 'arrow'): number {
    if (type === 'mouse') {
      switch (direction) {
        case 'U':
          return Math.PI / 2;
        case 'D':
          return -Math.PI / 2;
        case 'L':
          return 0;
        case 'R':
          return Math.PI;
      }
    } else if (type === 'cat') {
      return this.angleFor(direction, 'mouse') + Math.PI;
    }
    switch (direction) {
      case 'U':
        return 0;
      case 'D':
        return Math.PI;
      case 'L':
        return -Math.PI / 2;
      case 'R':
        return Math.PI / 2;
    }
  }

  private drawStrategyName(state: any) {
    this.context.fillStyle = "#a0ffff";
    this.context.font = "50px Arial";
    this.context.textAlign = "center";
    this.context.fillText(state.strategy.name, CONFIG.GLOBAL_HEIGHT / 2, 100);
  }

  // Performance optimization methods
  private initGridCache() {
    this.gridCanvas = document.createElement('canvas');
    this.gridCanvas.width = CONFIG.GLOBAL_WIDTH;
    this.gridCanvas.height = CONFIG.GLOBAL_HEIGHT;
    this.gridContext = this.gridCanvas.getContext('2d')!;
    this.gridCached = false;
    this.currentGridSize = [CONFIG.ROWS, CONFIG.COLUMNS];
  }

  private updateUseAlt() {
    const now = Date.now();
    const currentPeriod = Math.floor(now / 500);
    const lastPeriod = Math.floor(this.lastUseAltUpdate / 500);

    if (currentPeriod !== lastPeriod) {
      this.useAlt = currentPeriod % 2 === 1;
      this.lastUseAltUpdate = now;
    }
  }

  private drawCachedGrid() {
    // Check if grid needs to be redrawn (size changed)
    if (!this.gridCached ||
        this.currentGridSize[0] !== CONFIG.ROWS ||
        this.currentGridSize[1] !== CONFIG.COLUMNS) {
      this.redrawGridCache();
    }

    // Draw the cached grid onto the main canvas
    this.context.drawImage(this.gridCanvas, 0, 0);
  }

  private redrawGridCache() {
    // Clear the grid cache
    this.gridContext.clearRect(0, 0, this.gridCanvas.width, this.gridCanvas.height);

    // Draw the grid on the cache canvas
    this.gridContext.lineWidth = 1;
    this.gridContext.strokeStyle = 'white';

    for (let i = 0; i < CONFIG.COLUMNS + 1; i++) {
      this.gridContext.beginPath();
      this.gridContext.moveTo((CONFIG.GLOBAL_WIDTH / CONFIG.COLUMNS) * i, 0);
      this.gridContext.lineTo((CONFIG.GLOBAL_WIDTH / CONFIG.COLUMNS) * i, this.gridCanvas.height);
      this.gridContext.stroke();
    }

    for (let i = 0; i < CONFIG.ROWS + 1; i++) {
      this.gridContext.beginPath();
      this.gridContext.moveTo(0, (CONFIG.GLOBAL_HEIGHT / CONFIG.ROWS) * i);
      this.gridContext.lineTo(this.gridCanvas.width, (CONFIG.GLOBAL_HEIGHT / CONFIG.ROWS) * i);
      this.gridContext.stroke();
    }

    this.gridCached = true;
    this.currentGridSize = [CONFIG.ROWS, CONFIG.COLUMNS];
  }
}
