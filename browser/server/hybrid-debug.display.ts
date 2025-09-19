/**
 * Debug Display for Hybrid Predictive Rendering System
 *
 * Shows real-time metrics and system status
 * Part of Phase 1: Debug and Monitoring Interface
 */

export class HybridDebugDisplay {
  private debugElement: HTMLElement | null = null;
  private lastUpdateTime: number = 0;
  private updateInterval: number = 1000; // Update every second

  constructor() {
    // Delay element creation until DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.createDebugElement());
    } else {
      this.createDebugElement();
    }
  }

  private createDebugElement(): void {
    // Create debug panel if it doesn't exist
    this.debugElement = document.querySelector('.debug-hybrid-system');
    if (!this.debugElement) {
      this.debugElement = document.createElement('div');
      this.debugElement.className = 'debug-hybrid-system';
      this.debugElement.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: #00ff00;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 12px;
        padding: 10px;
        border-radius: 5px;
        z-index: 10000;
        min-width: 300px;
        max-height: 400px;
        overflow-y: auto;
        border: 1px solid #00ff00;
      `;

      document.body.appendChild(this.debugElement);
    }
  }

  /**
   * Update debug display with hybrid system metrics
   */
  update(metrics: {
    renderer?: {
      fps: number;
      frameCount: number;
      renderTime: number;
      interpolationTime: number;
      stateManager: {
        serverStates: number;
        predictions: number;
        latestServerState: number;
      };
    };
    network?: {
      reduction: string;
      serverTPS: number;
      clientFPS: number;
    };
    system?: {
      enabled: boolean;
      mode: 'HYBRID' | 'LEGACY';
      uptime: number;
    };
  }): void {
    const now = Date.now();
    if (now - this.lastUpdateTime < this.updateInterval) {
      return; // Throttle updates
    }
    this.lastUpdateTime = now;

    if (!this.debugElement) return;

    const renderer = metrics.renderer;
    const network = metrics.network;
    const system = metrics.system;

    this.debugElement.innerHTML = `
      <div style="border-bottom: 1px solid #00ff00; margin-bottom: 8px; padding-bottom: 4px;">
        <strong>🔮 HYBRID PREDICTIVE RENDERING</strong>
      </div>

      <div style="margin-bottom: 8px;">
        <strong>📊 System Status</strong><br>
        Mode: <span style="color: ${system?.enabled ? '#00ff00' : '#ff6600'}">${system?.mode || 'UNKNOWN'}</span><br>
        Enabled: <span style="color: ${system?.enabled ? '#00ff00' : '#ff0000'}">${system?.enabled ? 'YES' : 'NO'}</span><br>
        Uptime: ${system?.uptime ? this.formatUptime(system.uptime) : 'N/A'}
      </div>

      ${renderer ? `
      <div style="margin-bottom: 8px;">
        <strong>🎨 Renderer Metrics</strong><br>
        FPS: <span style="color: ${this.getFPSColor(renderer.fps)}">${renderer.fps.toFixed(1)}</span><br>
        Frame: ${renderer.frameCount}<br>
        Render: ${renderer.renderTime.toFixed(2)}ms<br>
        Interpolation: ${renderer.interpolationTime.toFixed(2)}ms
      </div>

      <div style="margin-bottom: 8px;">
        <strong>🎯 State Management</strong><br>
        Server States: ${renderer.stateManager.serverStates}<br>
        Predictions: ${renderer.stateManager.predictions}<br>
        State Age: ${renderer.stateManager.latestServerState ? (now - renderer.stateManager.latestServerState).toFixed(0) + 'ms' : 'N/A'}
      </div>
      ` : ''}

      ${network ? `
      <div style="margin-bottom: 8px;">
        <strong>🌐 Network Performance</strong><br>
        Server: ${network.serverTPS} TPS<br>
        Client: ${network.clientFPS} FPS<br>
        Traffic Reduction: <span style="color: #00ff00">${network.reduction}</span>
      </div>
      ` : ''}

      <div style="font-size: 10px; color: #666; margin-top: 8px;">
        Phase 1: Logic/Rendering Separation<br>
        Last Update: ${new Date().toLocaleTimeString()}
      </div>
    `;
  }

  /**
   * Show system status messages
   */
  showStatus(message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info'): void {
    // Wait for DOM if not ready
    if (!document.body) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.showStatus(message, type));
        return;
      } else {
        // DOM should be ready but body not found, log error
        console.warn('Cannot show status message: document.body not found');
        return;
      }
    }

    const colors = {
      info: '#00bfff',
      warning: '#ff6600',
      error: '#ff0000',
      success: '#00ff00'
    };

    const statusElement = document.createElement('div');
    statusElement.style.cssText = `
      position: fixed;
      top: 50px;
      right: 10px;
      background: rgba(0, 0, 0, 0.9);
      color: ${colors[type]};
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 12px;
      padding: 8px 12px;
      border-radius: 3px;
      z-index: 10001;
      border-left: 3px solid ${colors[type]};
      max-width: 300px;
    `;
    statusElement.textContent = message;

    document.body.appendChild(statusElement);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (statusElement.parentNode) {
        statusElement.parentNode.removeChild(statusElement);
      }
    }, 3000);
  }

  /**
   * Toggle debug display visibility
   */
  toggle(): void {
    if (this.debugElement) {
      const isVisible = this.debugElement.style.display !== 'none';
      this.debugElement.style.display = isVisible ? 'none' : 'block';
    }
  }

  /**
   * Show/hide debug display
   */
  setVisible(visible: boolean): void {
    if (this.debugElement) {
      this.debugElement.style.display = visible ? 'block' : 'none';
    }
  }

  /**
   * Get color for FPS display
   */
  private getFPSColor(fps: number): string {
    if (fps >= 55) return '#00ff00'; // Green for good FPS
    if (fps >= 45) return '#ffff00'; // Yellow for moderate FPS
    if (fps >= 30) return '#ff6600'; // Orange for low FPS
    return '#ff0000'; // Red for very low FPS
  }

  /**
   * Format uptime in human readable format
   */
  private formatUptime(uptime: number): string {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Update with performance warnings
   */
  updatePerformanceWarnings(warnings: string[]): void {
    if (warnings.length === 0) return;

    // Wait for DOM if not ready
    if (!document.body) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.updatePerformanceWarnings(warnings));
        return;
      } else {
        console.warn('Cannot show performance warnings: document.body not found');
        return;
      }
    }

    const warningContainer = document.querySelector('.debug-performance-warnings') ||
                           (() => {
                             const container = document.createElement('div');
                             container.className = 'debug-performance-warnings';
                             container.style.cssText = `
                               position: fixed;
                               bottom: 10px;
                               right: 10px;
                               background: rgba(255, 100, 0, 0.9);
                               color: white;
                               font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                               font-size: 11px;
                               padding: 8px;
                               border-radius: 3px;
                               z-index: 10002;
                               max-width: 300px;
                             `;
                             document.body.appendChild(container);
                             return container;
                           })();

    warningContainer.innerHTML = `
      <strong>⚠️ Performance Warnings</strong><br>
      ${warnings.map(w => `• ${w}`).join('<br>')}
    `;

    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (warningContainer.parentNode) {
        warningContainer.parentNode.removeChild(warningContainer);
      }
    }, 5000);
  }
}