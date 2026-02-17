// frontend/src/App.ts
// Vanilla TypeScript implementation of the application

import { errorModal } from './lib/error-modal';
import WinBox from 'winbox/src/js/winbox.js';
import {
  generateSystemInfoHTML,
  generateSQLiteHTML,
  generateCalculatorHTML,
  generateTextEditorHTML,
  generateImageViewerHTML,
  generateTerminalHTML,
} from './app/components';

interface WindowInfo {
  id: string;
  title: string;
  minimized: boolean;
  active: boolean;
  maximized?: boolean;
  winboxInstance: any;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

declare global {
  interface Window {
    WinBox: any;
    webui?: {
      call: (fn: string, ...args: any[]) => Promise<any>;
      isConnected?: () => boolean;
      setEventCallback?: (cb: (event: any) => void) => void;
      event?: {
        CONNECTED?: any;
        DISCONNECTED?: any;
      };
    };
    __WEBUI_WS_PORT__?: number;
    getUsers?: () => void;
    getDbStats?: () => void;
    refreshUsers?: () => void;
    searchUsers?: () => void;
    logWindowLifecycle?: (payload: string) => void;
    log_window_lifecycle?: (payload: string) => void;
    Logger?: {
      info: (message: string, meta?: Record<string, any>) => void;
      warn: (message: string, meta?: Record<string, any>) => void;
      error: (message: string, meta?: Record<string, any>) => void;
      debug: (message: string, meta?: Record<string, any>) => void;
    };
  }
}

interface CardItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  tags: string[];
  action: () => void;
}

type WindowLifecycleState = 'opened' | 'focused' | 'active' | 'minimized' | 'restored' | 'closed';
type WsConnectionState =
  | 'initializing'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'bridge_missing'
  | 'error';

interface WindowLifecyclePayload {
  event: WindowLifecycleState;
  window_id: string;
  title: string;
  timestamp: string;
}

export class App {
  private rootElement: HTMLElement;
  private activeWindows: WindowInfo[] = [];
  private dbUsers: User[] = [];
  private dbStats: { users: number; tables: string[] } = { users: 0, tables: [] };
  private isLoadingUsers: boolean = false;
  private cards: CardItem[] = [];
  private lifecycleQueue: WindowLifecyclePayload[] = [];
  private lifecycleFlushTimer: number | null = null;
  private lifecycleLastSent = new Map<string, { state: WindowLifecycleState; ts: number }>();
  private lifecycleFocusTimers = new Map<string, number>();
  private wsState: WsConnectionState = 'initializing';
  private wsStateHistory: Array<{ state: WsConnectionState; at: string; reason?: string }> = [];
  private wsHeartbeatTimer: number | null = null;
  private wsReconnectAttempts = 0;
  private wsPanelCollapsed = true;
  private wsLastError = '';
  private wsLastHeartbeatAt = '';
  private wsBackendSendOk = 0;
  private wsBackendSendFail = 0;
  private wsBackendLastOkAt = '';
  private wsRuntimePort: number | null = null;
  private wsRuntimePortSource: 'injected' | 'location' | 'unknown' = 'unknown';

  constructor(rootElement: HTMLElement) {
    this.rootElement = rootElement;
    this.cards = [
      {
        id: 'system-info-card',
        icon: '💻',
        title: 'System Information',
        description: 'View detailed system information including OS, memory, CPU, and runtime statistics.',
        tags: ['Hardware', 'Stats'],
        action: () => this.openSystemInfoWindow(),
      },
      {
        id: 'sqlite-card',
        icon: '🗄️',
        title: 'SQLite Database',
        description: 'Interactive database viewer with sample data. Connects to backend SQLite integration.',
        tags: ['Database', 'Mockup'],
        action: () => this.openSQLiteWindow(),
      },
      {
        id: 'calculator-card',
        icon: '🧮',
        title: 'Calculator',
        description: 'Simple calculator application running in a winbox window.',
        tags: ['Utility', 'Calculator'],
        action: () => this.openCalculatorWindow(),
      },
      {
        id: 'text-editor-card',
        icon: '📝',
        title: 'Text Editor',
        description: 'Basic text editor with save and load functionality.',
        tags: ['Productivity', 'Editor'],
        action: () => this.openTextEditorWindow(),
      },
      {
        id: 'image-viewer-card',
        icon: '🖼️',
        title: 'Image Viewer',
        description: 'Simple image viewer with zoom and navigation controls.',
        tags: ['Media', 'Viewer'],
        action: () => this.openImageViewerWindow(),
      },
      {
        id: 'terminal-card',
        icon: '⌨️',
        title: 'Terminal Emulator',
        description: 'Basic terminal emulator interface with command history.',
        tags: ['Development', 'Terminal'],
        action: () => this.openTerminalWindow(),
      },
    ];
  }

  // Use window.Logger or create a fallback
  private Logger = window.Logger || {
    info: (msg: string, meta?: any) => console.log('[INFO]', msg, meta),
    warn: (msg: string, meta?: any) => console.warn('[WARN]', msg, meta),
    error: (msg: string, meta?: any) => console.error('[ERROR]', msg, meta),
    debug: (msg: string, meta?: any) => console.debug('[DEBUG]', msg, meta),
  };

  mount() {
    this.render();
    this.setupEventListeners();
    this.setupWindowResizeHandler();
    this.setupBackendCallbacks();
    this.setupErrorHandlers();
    this.startBackendBridge();
    this.setupConnectionMonitoring();
  }

  private setupErrorHandlers(): void {
    this.showError = (config) => {
      errorModal.show({
        type: 'error',
        title: config.title || 'Error',
        message: config.message,
        details: config.details,
        stack: config.stack,
      });
    };

    this.showWarning = (config) => {
      errorModal.show({
        type: 'warning',
        title: config.title || 'Warning',
        message: config.message,
        details: config.details,
      });
    };

    this.showInfo = (config) => {
      errorModal.show({
        type: 'info',
        title: config.title || 'Information',
        message: config.message,
        details: config.details,
      });
    };

    this.confirm = (message, onConfirm, onCancel) => {
      errorModal.confirm(message, onConfirm, onCancel);
    };
  }

  private showError!: (config: { title?: string; message: string; details?: string; stack?: string }) => void;
  private showWarning!: (config: { title?: string; message: string; details?: string }) => void;
  private showInfo!: (config: { title?: string; message: string; details?: string }) => void;
  private confirm!: (message: string, onConfirm: () => void, onCancel?: () => void) => void;

  private render() {
    this.rootElement.innerHTML = this.getAppHTML();
    this.applyStyles();
    this.setupEventHandlers();
  }

  private getAppHTML(): string {
    return `
      <div class="app-shell">
      <div class="app">
        <aside class="sidebar">
          <div class="home-button-container">
            <button id="home-btn" class="home-btn" title="Show Main View">
              <span class="home-icon">🏠</span>
              <span class="home-text">Home</span>
            </button>
          </div>

          <div class="sidebar-header">
            <h2>Windows</h2>
            <span class="window-count">${this.activeWindows.length}</span>
          </div>

          <div class="window-list" id="window-list">
            ${this.activeWindows.map(window => this.getWindowItemHTML(window)).join('')}
            
            ${this.activeWindows.length === 0 ? `
              <div class="no-windows">
                No open windows
              </div>
            ` : ''}
          </div>

          <div class="sidebar-footer" id="sidebar-footer">
            <div class="demo-buttons">
              <button id="demo-error-btn" class="demo-btn" title="Demo Error Modal">
                Demo Error
              </button>
              <button id="demo-warning-btn" class="demo-btn demo-btn-warning" title="Demo Warning Modal">
                Demo Warning
              </button>
              <button id="demo-confirm-btn" class="demo-btn demo-btn-info" title="Demo Confirm Modal">
                Demo Confirm
              </button>
            </div>
            ${this.activeWindows.length > 0 ? `
              <button id="close-all-btn" class="close-all-btn">
                Close All
              </button>
            ` : ''}
          </div>
        </aside>

        <div class="main-container">
          <header class="header">
            <h1>System Dashboard</h1>
          </header>

          <main class="main-content">
            <section class="cards-section">
              <div class="search-container">
                <input type="text" id="card-search" class="card-search" placeholder="Search features..." autocomplete="off">
              </div>
              <div class="cards-grid two-cards" id="cards-grid">
                ${this.renderCards()}
              </div>
            </section>
          </main>
        </div>
      </div>
      <div id="ws-status-panel" class="ws-status-panel ws-state-initializing ws-collapsed">
        <button id="ws-status-toggle" class="ws-status-toggle" type="button">
          <span id="ws-status-summary">WS: INITIALIZING</span>
          <span id="ws-status-chevron">▴</span>
        </button>
        <div id="ws-status-details" class="ws-status-details"></div>
      </div>
      </div>
    `;
  }

  private getWindowItemHTML(window: WindowInfo): string {
    const status = window.minimized ? 'Minimized' : window.active ? 'Active' : 'Open';
    return `
      <div class="window-item ${window.minimized ? 'minimized' : ''}" data-window-id="${window.id}">
        <div class="window-icon">📷</div>
        <div class="window-info">
          <span class="window-title">${window.title}</span>
          <span class="window-status">${status}</span>
        </div>
        <button class="window-close" data-close-window="${window.id}" title="Close window">
          ×
        </button>
      </div>
    `;
  }

  private applyStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #f5f7fa;
        color: #333;
        font-size: 14px;
      }

      .app {
        min-height: calc(100vh - 24px);
        padding-bottom: 24px;
        display: flex;
        flex-direction: row;
      }

      .app-shell {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }

      .ws-status-panel {
        width: 100vw;
        position: fixed;
        left: 0;
        bottom: 0;
        z-index: 2147483647;
        color: #e2e8f0;
        border-top: 1px solid #475569;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      }

      .ws-status-toggle {
        appearance: none;
        border: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        height: 24px;
        padding: 0 10px;
        font-size: 11px;
        line-height: 24px;
        cursor: pointer;
        color: inherit;
        background: transparent;
      }

      .ws-status-details {
        display: none;
        max-height: 160px;
        overflow-y: auto;
        border-top: 1px solid rgba(255, 255, 255, 0.15);
        padding: 6px 10px 8px;
        font-size: 10px;
        line-height: 1.4;
        white-space: pre-wrap;
      }

      .ws-status-panel.ws-expanded .ws-status-details {
        display: block;
      }

      .ws-status-panel.ws-collapsed #ws-status-chevron {
        transform: rotate(180deg);
      }

      .ws-status-panel.ws-state-initializing,
      .ws-status-panel.ws-state-reconnecting {
        background: #92400e;
        border-top-color: #b45309;
      }

      .ws-status-panel.ws-state-connected {
        background: #166534;
        border-top-color: #15803d;
      }

      .ws-status-panel.ws-state-disconnected {
        background: #7c2d12;
        border-top-color: #9a3412;
      }

      .ws-status-panel.ws-state-bridge-missing,
      .ws-status-panel.ws-state-error {
        background: #991b1b;
        border-top-color: #b91c1c;
      }

      .sidebar {
        width: 200px;
        background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
        color: white;
        display: flex;
        flex-direction: column;
        border-right: 1px solid #334155;
      }

      .home-button-container {
        padding: 0.75rem;
        background: rgba(79, 70, 229, 0.2);
        border-bottom: 1px solid #334155;
      }

      .home-btn {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
        background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .home-btn:hover {
        background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(79, 70, 229, 0.4);
      }

      .home-icon {
        font-size: 1rem;
      }

      .home-text {
        font-size: 0.85rem;
      }

      .sidebar-header {
        padding: 0.75rem;
        background: rgba(255, 255, 255, 0.05);
        border-bottom: 1px solid #334155;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .sidebar-header h2 {
        font-size: 0.9rem;
        font-weight: 600;
      }

      .window-count {
        background: #4f46e5;
        color: white;
        padding: 0.15rem 0.5rem;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
      }

      .window-list {
        flex: 1;
        overflow-y: auto;
        padding: 0.5rem;
      }

      .window-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem;
        margin-bottom: 0.25rem;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 1px solid transparent;
      }

      .window-item:hover {
        background: rgba(255, 255, 255, 0.15);
        border-color: #4f46e5;
        transform: translateX(4px);
      }

      .window-item.minimized {
        opacity: 0.6;
        background: rgba(255, 255, 255, 0.02);
      }

      .window-item.minimized:hover {
        opacity: 0.9;
        background: rgba(255, 255, 255, 0.1);
      }

      .window-icon {
        font-size: 1rem;
      }

      .window-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .window-title {
        font-size: 0.75rem;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .window-status {
        font-size: 0.65rem;
        color: #94a3b8;
      }

      .window-close {
        background: transparent;
        border: none;
        color: #94a3b8;
        font-size: 1.1rem;
        cursor: pointer;
        padding: 0.15rem;
        line-height: 1;
        border-radius: 3px;
        transition: all 0.2s ease;
      }

      .window-close:hover {
        background: #dc3545;
        color: white;
      }

      .no-windows {
        text-align: center;
        padding: 1rem;
        color: #64748b;
        font-size: 0.8rem;
        font-style: italic;
      }

      .sidebar-footer {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px;
        border-top: 1px solid #374151;
        background: #1f2937;
      }

      .demo-buttons {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .demo-btn {
        flex: 1;
        min-width: 80px;
        padding: 8px 12px;
        border: none;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        background: #dc2626;
        color: white;
      }

      .demo-btn:hover {
        opacity: 0.9;
        transform: translateY(-1px);
      }

      .demo-btn-warning {
        background: #d97706;
      }

      .demo-btn-info {
        background: #2563eb;
      }

      .close-all-btn {
        width: 100%;
        padding: 0.5rem;
        background: #dc3545;
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 0.75rem;
        cursor: pointer;
        transition: background 0.2s ease;
      }

      .close-all-btn:hover {
        background: #c82333;
      }

      .main-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .header {
        background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
        color: white;
        padding: 0.5rem 1rem;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      }

      .header h1 {
        font-size: 1.2rem;
        font-weight: 600;
      }

      .main-content {
        flex: 1;
        padding: 1rem;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }

      .cards-section {
        margin-bottom: 1rem;
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }

      .search-container {
        max-width: 800px;
        margin: 0 auto 1.5rem;
      }

      .card-search {
        width: 100%;
        padding: 12px 16px;
        font-size: 0.95rem;
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        background: white;
        color: #1e293b;
        transition: border-color 0.2s, box-shadow 0.2s;
      }

      .card-search:focus {
        outline: none;
        border-color: #4f46e5;
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
      }

      .card-search::placeholder {
        color: #94a3b8;
      }

      .cards-grid {
        display: grid;
        gap: 0.75rem;
        overflow-y: auto;
        flex: 1;
        min-height: 0;
        padding-right: 6px;
      }

      .cards-grid.two-cards {
        grid-template-columns: 1fr;
        max-width: 100%;
        margin: 0;
        width: 100%;
      }

      .feature-card {
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        cursor: pointer;
        display: grid;
        grid-template-columns: 88px 1fr;
        min-height: 108px;
      }

      .feature-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 12px 24px rgba(0,0,0,0.1);
      }

      .card-icon {
        font-size: 2rem;
        text-align: center;
        padding: 1rem 0.75rem;
        background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ec 100%);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .card-content {
        padding: 0.75rem 1rem;
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .card-title {
        font-size: 0.98rem;
        font-weight: 600;
        margin-bottom: 0.25rem;
        color: #1e293b;
      }

      .card-description {
        font-size: 0.8rem;
        color: #64748b;
        margin-bottom: 0.5rem;
        line-height: 1.35;
        flex: 1;
      }

      .card-tags {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .tag {
        background: #e0e7ff;
        color: #4f46e5;
        padding: 0.25rem 0.75rem;
        font-size: 0.75rem;
        font-weight: 500;
        border-radius: 12px;
      }

      .wb-dock,
      .wb-taskbar,
      .winbox-dock,
      .winbox-taskbar,
      .winbox-dock-container,
      .wb-dock-container,
      .winbox.minimized ~ .wb-dock,
      .winbox.min ~ .wb-dock,
      .winbox.minimized ~ .wb-taskbar,
      .winbox.min ~ .wb-taskbar {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        height: 0 !important;
        width: 0 !important;
        position: absolute !important;
        bottom: -9999px !important;
      }

      .winbox.min,
      .winbox.minimized {
        opacity: 0 !important;
        pointer-events: none !important;
        top: -9999px !important;
        left: -9999px !important;
      }

      /* Enhanced WinBox styling */
      .winbox {
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      }

      .winbox .wb-header {
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding: 8px 12px;
        height: 40px;
      }

      .winbox .wb-body {
        background: #1e293b;
        overflow: hidden;
      }

      .winbox .wb-control {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        margin-left: 4px;
        width: 24px;
        height: 24px;
        line-height: 24px;
        font-size: 14px;
      }

      .winbox .wb-control:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .winbox .wb-title {
        font-size: 14px;
        font-weight: 500;
        color: white;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      }

      .winbox .wb-body iframe {
        border: none;
      }

      @media (max-width: 768px) {
        .app {
          flex-direction: column;
        }

        .sidebar {
          width: 100%;
          max-height: 150px;
        }

        .window-list {
          display: flex;
          flex-direction: row;
          gap: 0.5rem;
          overflow-x: auto;
          padding: 0.5rem;
        }

        .window-item {
          min-width: 150px;
          margin-bottom: 0;
        }

        .cards-grid.two-cards {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(styleElement);
  }

  private setupEventHandlers() {
    // Card click handlers
    this.setupCardClickHandlers();

    // Card search handler
    const cardSearch = document.getElementById('card-search');
    if (cardSearch) {
      cardSearch.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        this.filterCards(target.value);
      });
    }

    // Home button
    const homeBtn = document.getElementById('home-btn');
    if (homeBtn) {
      homeBtn.addEventListener('click', () => this.hideAllWindows());
    }

    const wsToggle = document.getElementById('ws-status-toggle');
    if (wsToggle) {
      wsToggle.addEventListener('click', () => {
        this.wsPanelCollapsed = !this.wsPanelCollapsed;
        this.updateWsStatusBar();
      });
    }

    // Close all button - attach via direct selector since it might be added dynamically
    document.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'close-all-btn') {
        this.closeAllWindows();
      }
      
      // Demo error modal button
      if ((e.target as HTMLElement).id === 'demo-error-btn') {
        this.showError({
          title: 'Demo Error Modal',
          message: 'This is a demonstration of the error modal system.',
          details: 'Error code: DEMO_ERROR_001\nFile: demo.ts:42',
          stack: new Error('Demo error').stack,
        });
      }
      
      // Demo warning modal button
      if ((e.target as HTMLElement).id === 'demo-warning-btn') {
        this.showWarning({
          title: 'Demo Warning Modal',
          message: 'This is a demonstration of the warning modal system.',
          details: 'Warning: This action may have unintended consequences.',
        });
      }
      
      // Demo confirm modal button
      if ((e.target as HTMLElement).id === 'demo-confirm-btn') {
        this.confirm(
          'Are you sure you want to proceed with this action?',
          () => {
            errorModal.success('Action confirmed!', 'The action was completed successfully.');
          },
          () => {
            errorModal.info('Action cancelled', 'You chose to cancel the action.');
          }
        );
      }
    });

    // Window item click handlers
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      // Handle window item clicks
      if (target.closest('.window-item')) {
        const windowItem = target.closest('.window-item');
        const windowId = windowItem?.getAttribute('data-window-id');
        if (windowId) {
          const windowInfo = this.activeWindows.find(w => w.id === windowId);
          if (windowInfo) {
            this.focusWindow(windowInfo);
          }
        }
      }
      
      // Handle window close button clicks
      if (target.classList.contains('window-close')) {
        e.stopPropagation();
        const windowId = target.getAttribute('data-close-window');
        if (windowId) {
          const windowInfo = this.activeWindows.find(w => w.id === windowId);
          if (windowInfo) {
            this.closeWindow(windowInfo);
          }
        }
      }
    });
  }

  private setupEventListeners() {
    // Set up global functions that the backend might call
    window.refreshUsers = () => {
      this.Logger.info('Refreshing users from database');
      this.isLoadingUsers = true;
      if (window.getUsers) {
        window.getUsers();
      }
    };

    window.searchUsers = () => {
      const searchInput = document.getElementById('db-search') as HTMLInputElement;
      const searchTerm = searchInput?.value.toLowerCase() || '';
      this.Logger.info('Searching users', { term: searchTerm });

      const tableBody = document.getElementById('users-table-body');
      if (tableBody) {
        const rows = tableBody.querySelectorAll('tr');
        rows.forEach((row: any) => {
          const text = row.textContent?.toLowerCase() || '';
          row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
      }
    };
  }

  private setupWindowResizeHandler() {
    window.addEventListener('resize', () => {
      this.handleWindowResize();
    });
  }

  private setupBackendCallbacks() {
    const handleDbResponse = (event: CustomEvent) => {
      const response = event.detail;
      if (response.success) {
        this.dbUsers = response.data || [];
        this.Logger.info('Users loaded from database', { count: response.data?.length || 0 });
        this.updateSQLiteTable();
      } else {
        this.Logger.error('Failed to load users', { error: response.error });
      }
      this.isLoadingUsers = false;
    };

    const handleStatsResponse = (event: CustomEvent) => {
      const response = event.detail;
      if (response.success) {
        this.dbStats = response.stats;
        this.Logger.info('Database stats loaded', response.stats);
      }
    };

    window.addEventListener('db_response', handleDbResponse as EventListener);
    window.addEventListener('stats_response', handleStatsResponse as EventListener);

    // Store cleanup references for later use if needed
    this.cleanupFunctions = [handleDbResponse, handleStatsResponse];
  }

  private cleanupFunctions: any[] = [];

  private resolveWsRuntimePort() {
    const injected = Number(window.__WEBUI_WS_PORT__);
    if (Number.isInteger(injected) && injected > 0 && injected <= 65535) {
      this.wsRuntimePort = injected;
      this.wsRuntimePortSource = 'injected';
      return;
    }

    const locationPort = Number(window.location?.port);
    if (Number.isInteger(locationPort) && locationPort > 0 && locationPort <= 65535) {
      this.wsRuntimePort = locationPort;
      this.wsRuntimePortSource = 'location';
      return;
    }

    this.wsRuntimePort = null;
    this.wsRuntimePortSource = 'unknown';
  }

  private updateWsStatusBar(reason?: string) {
    const panel = document.getElementById('ws-status-panel');
    const summaryEl = document.getElementById('ws-status-summary');
    const detailsEl = document.getElementById('ws-status-details');
    if (!panel || !summaryEl || !detailsEl) return;

    const latest = this.wsStateHistory[this.wsStateHistory.length - 1];
    const ts = latest?.at ? new Date(latest.at).toLocaleTimeString() : new Date().toLocaleTimeString();
    const suffix = reason ? ` | ${reason}` : '';

    panel.className = `ws-status-panel ws-state-${this.wsState.replace('_', '-')} ${this.wsPanelCollapsed ? 'ws-collapsed' : 'ws-expanded'}`;
    summaryEl.textContent = `WS: ${this.wsState.toUpperCase()} | last=${ts}${suffix}`;

    const recentHistory = this.wsStateHistory
      .slice(-6)
      .map((entry) => {
        const t = new Date(entry.at).toLocaleTimeString();
        return `- ${t} | ${entry.state}${entry.reason ? ` | ${entry.reason}` : ''}`;
      })
      .join('\n');

    detailsEl.textContent =
      `State: ${this.wsState}\n` +
      `Reconnect attempts: ${this.wsReconnectAttempts}\n` +
      `Lifecycle queue: ${this.lifecycleQueue.length}\n` +
      `Runtime WS port: ${this.wsRuntimePort || 'n/a'} (${this.wsRuntimePortSource})\n` +
      `Backend send ok/fail: ${this.wsBackendSendOk}/${this.wsBackendSendFail}\n` +
      `Last backend ok: ${this.wsBackendLastOkAt || 'n/a'}\n` +
      `Last heartbeat: ${this.wsLastHeartbeatAt || 'n/a'}\n` +
      `Last error: ${this.wsLastError || 'none'}\n\n` +
      `Recent transitions:\n${recentHistory || '- none'}`;
  }

  private reportWsStateToBackend(state: WsConnectionState, reason?: string) {
    const payload = {
      state,
      reason: reason || '',
      timestamp: new Date().toISOString(),
      reconnect_attempts: this.wsReconnectAttempts,
      ws_port: this.wsRuntimePort,
      ws_port_source: this.wsRuntimePortSource,
    };
    const sent = this.callBackend('ws_state_change', payload);
    if (!sent) {
      this.Logger.warn('Failed to report ws_state_change to backend', payload);
    }
  }

  private reportWsErrorToBackend(error: unknown, context: string) {
    const payload = {
      context,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack || '' : '',
      timestamp: new Date().toISOString(),
      ws_port: this.wsRuntimePort,
      ws_port_source: this.wsRuntimePortSource,
    };
    const sent = this.callBackend('ws_error_report', payload);
    if (!sent) {
      this.Logger.warn('Failed to report ws_error_report to backend', payload);
    }
  }

  private transitionWsState(state: WsConnectionState, reason?: string) {
    if (this.wsState === state && !reason) return;
    if (state === 'connected') {
      this.wsLastError = '';
    }
    this.wsState = state;
    this.wsStateHistory.push({ state, at: new Date().toISOString(), reason });
    if (this.wsStateHistory.length > 200) {
      this.wsStateHistory.shift();
    }

    this.Logger.info('WebSocket state transition', { state, reason, reconnectAttempts: this.wsReconnectAttempts });
    this.updateWsStatusBar(reason);
    this.reportWsStateToBackend(state, reason);
  }

  private setupConnectionMonitoring() {
    this.transitionWsState('initializing', 'App mounted');
    this.resolveWsRuntimePort();
    this.Logger.info('Resolved WebUI runtime port', {
      port: this.wsRuntimePort,
      source: this.wsRuntimePortSource,
      location: window.location.href,
    });
    this.updateWsStatusBar();

    window.addEventListener('webui_runtime_port', (rawEvent: Event) => {
      const event = rawEvent as CustomEvent<{ port?: number }>;
      const candidate = Number(event.detail?.port);
      if (Number.isInteger(candidate) && candidate > 0 && candidate <= 65535) {
        this.wsRuntimePort = candidate;
        this.wsRuntimePortSource = 'injected';
        this.Logger.info('Updated WebUI runtime port from backend event', { port: candidate });
        this.updateWsStatusBar('runtime port update');
      }
    });

    if (!window.webui) {
      this.transitionWsState('bridge_missing', 'window.webui not found');
    } else {
      this.transitionWsState('connected', 'webui bridge object detected');
    }

    if (window.webui?.setEventCallback && window.webui?.event) {
      try {
        window.webui.setEventCallback((evt: any) => {
          const connectedValue = window.webui?.event?.CONNECTED;
          const disconnectedValue = window.webui?.event?.DISCONNECTED;
          if (evt === connectedValue) {
            this.wsReconnectAttempts = 0;
            this.transitionWsState('connected', 'webui CONNECTED event');
          } else if (evt === disconnectedValue) {
            this.wsReconnectAttempts += 1;
            this.transitionWsState('disconnected', 'webui DISCONNECTED event');
          } else {
            this.Logger.debug('webui event callback', { evt });
          }
        });
      } catch (error) {
        this.transitionWsState('error', 'setEventCallback failed');
        this.reportWsErrorToBackend(error, 'setEventCallback');
      }
    }

    window.addEventListener('offline', () => {
      this.wsReconnectAttempts += 1;
      this.transitionWsState('reconnecting', 'Browser offline');
    });
    window.addEventListener('online', () => {
      this.transitionWsState('connected', 'Browser online');
    });

    if (this.wsHeartbeatTimer !== null) {
      window.clearInterval(this.wsHeartbeatTimer);
    }
    this.wsHeartbeatTimer = window.setInterval(() => {
      const connectedByApi =
        typeof window.webui?.isConnected === 'function' ? window.webui.isConnected() : !!window.webui;

      if (!connectedByApi) {
        this.wsReconnectAttempts += 1;
        this.transitionWsState('reconnecting', 'Heartbeat indicates disconnected bridge');
      } else if (this.wsState !== 'connected') {
        this.transitionWsState('connected', 'Heartbeat recovered');
      }

      const heartbeatPayload = {
        state: this.wsState,
        connected: connectedByApi,
        queued_lifecycle_events: this.lifecycleQueue.length,
        timestamp: new Date().toISOString(),
        ws_port: this.wsRuntimePort,
        ws_port_source: this.wsRuntimePortSource,
      };
      this.callBackend('ws_heartbeat', heartbeatPayload);
      this.wsLastHeartbeatAt = new Date().toLocaleTimeString();
      this.updateWsStatusBar();
    }, 1500);
  }

  private openSystemInfoWindow() {
    this.openWindow('System Information', generateSystemInfoHTML(), '💻');
  }

  private openSQLiteWindow() {
    this.isLoadingUsers = true;
    this.Logger.info('Opening SQLite window, fetching users from backend...');

    if (window.getUsers) {
      this.Logger.info('Calling Rust backend get_users function');
      window.getUsers();
    } else {
      this.Logger.warn('Rust backend get_users not available');
      this.isLoadingUsers = false;
    }

    if (window.getDbStats) {
      window.getDbStats();
    }

    this.openWindow('SQLite Database', generateSQLiteHTML(), '🗄️');
  }

  private updateSQLiteTable() {
    const tableBody = document.getElementById('users-table-body');
    if (!tableBody || this.dbUsers.length === 0) return;

    tableBody.innerHTML = '';

    for (const row of this.dbUsers) {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid #334155';

      const idCell = document.createElement('td');
      idCell.style.padding = '10px';
      idCell.style.color = '#e2e8f0';
      idCell.textContent = String(row.id);
      tr.appendChild(idCell);

      const nameCell = document.createElement('td');
      nameCell.style.padding = '10px';
      nameCell.style.color = '#e2e8f0';
      nameCell.textContent = row.name;
      tr.appendChild(nameCell);

      const emailCell = document.createElement('td');
      emailCell.style.padding = '10px';
      emailCell.style.color = '#94a3b8';
      emailCell.textContent = row.email;
      tr.appendChild(emailCell);

      const roleCell = document.createElement('td');
      roleCell.style.padding = '10px';
      const roleSpan = document.createElement('span');
      roleSpan.style.background = row.role === 'Admin' ? '#dc2626' : row.role === 'Editor' ? '#f59e0b' : '#3b82f6';
      roleSpan.style.padding = '2px 8px';
      roleSpan.style.borderRadius = '4px';
      roleSpan.style.fontSize = '0.75rem';
      roleSpan.textContent = row.role;
      roleCell.appendChild(roleSpan);
      tr.appendChild(roleCell);

      const statusCell = document.createElement('td');
      statusCell.style.padding = '10px';
      statusCell.style.color = row.status === 'Active' ? '#10b981' : row.status === 'Inactive' ? '#ef4444' : '#f59e0b';
      statusCell.textContent = `● ${row.status}`;
      tr.appendChild(statusCell);

      tableBody.appendChild(tr);
    }
  }

  private async ensureWinBoxLoaded(): Promise<any> {
    if (!window.WinBox) {
      window.WinBox = WinBox;
    }
    return window.WinBox;
  }

  private startBackendBridge() {
    this.flushLifecycleQueue();
    if (this.lifecycleFlushTimer !== null) {
      window.clearInterval(this.lifecycleFlushTimer);
    }
    this.lifecycleFlushTimer = window.setInterval(() => {
      this.flushLifecycleQueue();
    }, 1000);
  }

  private resolveBackendBinding(name: string): ((payload: string) => unknown) | null {
    const candidates = new Set<string>([
      name,
      name.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
      name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`),
    ]);

    for (const candidate of candidates) {
      const fn = (window as any)[candidate];
      if (typeof fn === 'function') {
        return fn as (payload: string) => unknown;
      }
    }
    return null;
  }

  private callBackend(name: string, payload: unknown): boolean {
    const serialized = JSON.stringify(payload);
    const binding = this.resolveBackendBinding(name);
    if (binding) {
      try {
        binding(serialized);
        this.wsBackendSendOk += 1;
        this.wsBackendLastOkAt = new Date().toLocaleTimeString();
        return true;
      } catch (error) {
        this.wsBackendSendFail += 1;
        this.wsLastError = `${name}: ${(error as Error).message}`;
        this.updateWsStatusBar();
        this.Logger.error('Backend binding invocation failed', {
          name,
          error: (error as Error).message,
          payload,
        });
      }
    }

    if (window.webui && typeof window.webui.call === 'function') {
      window.webui
        .call(name, serialized)
        .then(() => {
          this.wsBackendSendOk += 1;
          this.wsBackendLastOkAt = new Date().toLocaleTimeString();
          this.updateWsStatusBar();
        })
        .catch((error: Error) => {
          this.wsBackendSendFail += 1;
          this.wsLastError = `${name}: ${error.message}`;
          this.updateWsStatusBar();
          this.Logger.error('webui.call backend send failed', {
            name,
            error: error.message,
            payload,
          });
        });
      return true;
    }

    return false;
  }

  private sendLifecycleToBackend(payload: WindowLifecyclePayload): boolean {
    return this.callBackend('log_window_lifecycle', payload);
  }

  private flushLifecycleQueue() {
    if (this.lifecycleQueue.length === 0) return;

    const pending = [...this.lifecycleQueue];
    this.lifecycleQueue = [];
    for (const payload of pending) {
      if (!this.sendLifecycleToBackend(payload)) {
        this.lifecycleQueue.push(payload);
      }
    }
  }

  private emitWindowLifecycle(state: WindowLifecycleState, windowInfo: Pick<WindowInfo, 'id' | 'title'>) {
    const key = windowInfo.id;
    const now = Date.now();
    const last = this.lifecycleLastSent.get(key);
    if (last && last.state === state && now - last.ts < 250) {
      return;
    }
    this.lifecycleLastSent.set(key, { state, ts: now });

    const payload: WindowLifecyclePayload = {
      event: state,
      window_id: windowInfo.id,
      title: windowInfo.title,
      timestamp: new Date().toISOString(),
    };

    this.Logger.info('Window lifecycle event', payload);
    if (!this.sendLifecycleToBackend(payload)) {
      this.lifecycleQueue.push(payload);
      if (this.lifecycleQueue.length > 256) {
        this.lifecycleQueue.shift();
      }
      this.Logger.debug('Lifecycle event queued until backend bridge is ready', {
        queued: this.lifecycleQueue.length,
      });
    }
  }

  private emitFocusedLifecycle(windowInfo: Pick<WindowInfo, 'id' | 'title'>) {
    const existing = this.lifecycleFocusTimers.get(windowInfo.id);
    if (existing) {
      window.clearTimeout(existing);
    }
    const timer = window.setTimeout(() => {
      this.emitWindowLifecycle('active', windowInfo);
      this.lifecycleFocusTimers.delete(windowInfo.id);
    }, 120);
    this.lifecycleFocusTimers.set(windowInfo.id, timer);
  }

  private async openWindow(title: string, content: string, _icon: string, options: any = {}) {
    if (!window.WinBox) {
      await this.ensureWinBoxLoaded();
    }
    if (!window.WinBox) {
      this.Logger.error('WinBox is not loaded. Please try again.');
      return;
    }

    const existingWindow = this.activeWindows.find(w => w.title === title);
    if (existingWindow) {
      if (existingWindow.minimized) {
        existingWindow.winboxInstance.restore();
        existingWindow.minimized = false;
      }
      existingWindow.winboxInstance.focus();
      this.updateWindowList();
      return;
    }

    this.Logger.info('Opening window', { windowTitle: title });

    const windowId = 'win-' + Date.now();
    let winboxInstance: any;

    const app = this;

    // Default options
    const defaultOptions = {
      title: title,
      background: '#1e293b',
      border: 4,
      width: 'calc(100% - 200px)',
      height: '100%',
      x: '200px',
      y: '0',
      minwidth: '300px',
      minheight: '300px',
      max: true,
      min: true,
      mount: document.createElement('div'),
      oncreate: function(this: any) {
        this.body.innerHTML = content;
      },
      onminimize: () => {
        this.activeWindows = this.activeWindows.map(w =>
          w.id === windowId ? { ...w, minimized: true, active: false } : w
        );
        this.emitWindowLifecycle('minimized', { id: windowId, title });
        this.updateWindowList();
      },
      onrestore: () => {
        this.activeWindows = this.activeWindows.map(w => ({
          ...w,
          minimized: w.id === windowId ? false : w.minimized,
          maximized: w.id === windowId ? false : w.maximized,
          active: w.id === windowId,
        }));
        this.emitWindowLifecycle('restored', { id: windowId, title });
        this.updateWindowList();
      },
      onmaximize: function(this: any) {
        const availableWidth = window.innerWidth - 200;
        const availableHeight = window.innerHeight;

        this.resize(availableWidth, availableHeight);
        this.move(200, 0);

        app.activeWindows = app.activeWindows.map(w => ({
          ...w,
          maximized: w.id === windowId,
          active: w.id === windowId,
          minimized: w.id === windowId ? false : w.minimized,
        }));
        app.emitFocusedLifecycle({ id: windowId, title });
        app.updateWindowList();
      },
      onfocus: () => {
        this.activeWindows = this.activeWindows.map(w => ({
          ...w,
          active: w.id === windowId,
          minimized: w.id === windowId ? false : w.minimized,
        }));
        this.emitFocusedLifecycle({ id: windowId, title });
        this.updateWindowList();
      },
      onblur: () => {
        this.activeWindows = this.activeWindows.map(w =>
          w.id === windowId ? { ...w, active: false } : w
        );
        this.updateWindowList();
      },
      onclose: () => {
        const timer = this.lifecycleFocusTimers.get(windowId);
        if (timer) {
          window.clearTimeout(timer);
          this.lifecycleFocusTimers.delete(windowId);
        }
        this.emitWindowLifecycle('closed', { id: windowId, title });
        this.activeWindows = this.activeWindows.filter(w => w.id !== windowId);
        this.updateWindowList();
      }
    };

    // Merge default options with custom options
    const winboxOptions = { ...defaultOptions, ...options };

    winboxInstance = new window.WinBox(winboxOptions);

    const windowInfo: WindowInfo = {
      id: windowId,
      title: title,
      minimized: false,
      active: true,
      maximized: false,
      winboxInstance: winboxInstance
    };

    this.activeWindows = this.activeWindows.map(w => ({ ...w, active: false }));
    this.activeWindows.push(windowInfo);
    this.emitWindowLifecycle('opened', { id: windowId, title });
    this.updateWindowList();
  }

  private openCalculatorWindow() {
    this.openWindow('Calculator', generateCalculatorHTML(), '🧮', {
      width: '400px',
      height: '500px',
      x: 'center',
      y: 'center',
      minwidth: '300px',
      minheight: '400px',
      background: '#1e293b',
      border: 4
    });
  }

  private openTextEditorWindow() {
    this.openWindow('Text Editor', generateTextEditorHTML(), '📝', {
      width: '800px',
      height: '600px',
      x: 'center',
      y: 'center',
      minwidth: '500px',
      minheight: '400px',
      background: '#1e293b',
      border: 4
    });
  }

  private openImageViewerWindow() {
    this.openWindow('Image Viewer', generateImageViewerHTML(), '🖼️', {
      width: '800px',
      height: '600px',
      x: 'center',
      y: 'center',
      minwidth: '600px',
      minheight: '500px',
      background: '#1e293b',
      border: 4
    });
  }

  private openTerminalWindow() {
    this.openWindow('Terminal', generateTerminalHTML(), '⌨️', {
      width: '800px',
      height: '500px',
      x: 'center',
      y: 'center',
      minwidth: '500px',
      minheight: '400px',
      background: '#0f172a',
      border: 4
    });
  }

  private focusWindow(windowInfo: WindowInfo) {
    if (windowInfo.minimized) {
      windowInfo.winboxInstance.restore();
      this.activeWindows = this.activeWindows.map(w =>
        w.id === windowInfo.id ? { ...w, minimized: false } : w
      );
      this.updateWindowList();
      // WinBox restore can be async; focus on next tick to make a single click reliable.
      window.setTimeout(() => {
        windowInfo.winboxInstance.focus();
        this.emitWindowLifecycle('focused', { id: windowInfo.id, title: windowInfo.title });
      }, 0);
      return;
    }
    windowInfo.winboxInstance.focus();
    this.emitWindowLifecycle('focused', { id: windowInfo.id, title: windowInfo.title });
  }

  private closeWindow(windowInfo: WindowInfo) {
    windowInfo.winboxInstance.close();
    this.activeWindows = this.activeWindows.filter(w => w.id !== windowInfo.id);
    this.updateWindowList();
  }

  private closeAllWindows() {
    this.activeWindows.forEach(windowInfo => {
      windowInfo.winboxInstance.close();
    });
    this.activeWindows = [];
    this.updateWindowList();
    this.Logger.info('All windows closed');
  }

  private hideAllWindows() {
    this.activeWindows.forEach(windowInfo => {
      if (!windowInfo.minimized) {
        windowInfo.winboxInstance.minimize();
      }
    });
    
    this.activeWindows = this.activeWindows.map(w => {
      if (!w.minimized) {
        return { ...w, minimized: true, maximized: false, active: false };
      }
      return w;
    });
    
    this.updateWindowList();
    this.Logger.info('All windows minimized - showing main view');
  }

  private handleWindowResize() {
    this.activeWindows.forEach(windowInfo => {
      if (windowInfo.maximized && !windowInfo.minimized) {
        const availableWidth = window.innerWidth - 200;
        const availableHeight = window.innerHeight;

        windowInfo.winboxInstance.resize(availableWidth, availableHeight);
        windowInfo.winboxInstance.move(200, 0);
      }
    });
  }

  private updateWindowList() {
    const windowListElement = document.getElementById('window-list');
    if (!windowListElement) return;

    // Re-render the window list
    windowListElement.innerHTML = `
      ${this.activeWindows.map(window => this.getWindowItemHTML(window)).join('')}
      
      ${this.activeWindows.length === 0 ? `
        <div class="no-windows">
          No open windows
        </div>
      ` : ''}
    `;

    // Update window count
    const windowCountElements = document.querySelectorAll('.window-count');
    windowCountElements.forEach(element => {
      element.textContent = `${this.activeWindows.length}`;
    });

    // Update sidebar footer
    const sidebarFooter = document.getElementById('sidebar-footer');
    if (sidebarFooter) {
      if (this.activeWindows.length > 0) {
        sidebarFooter.innerHTML = `
          <button id="close-all-btn" class="close-all-btn">
            Close All
          </button>
        `;
      } else {
        sidebarFooter.innerHTML = '';
      }
    }
  }

  private fuzzyMatch(pattern: string, text: string): boolean {
    const patternLower = pattern.toLowerCase();
    const textLower = text.toLowerCase();
    
    if (textLower.includes(patternLower)) return true;
    
    let patternIdx = 0;
    for (let i = 0; i < textLower.length && patternIdx < patternLower.length; i++) {
      if (textLower[i] === patternLower[patternIdx]) {
        patternIdx++;
      }
    }
    return patternIdx === patternLower.length;
  }

  private renderCards(filter: string = ''): string {
    const searchTerm = filter.toLowerCase().trim();
    
    const filteredCards = this.cards.filter(card => {
      if (!searchTerm) return true;
      const searchableText = `${card.title} ${card.description} ${card.tags.join(' ')}`;
      return this.fuzzyMatch(searchTerm, searchableText);
    });

    return filteredCards.map(card => `
      <div id="${card.id}" class="feature-card" data-searchable="${card.title.toLowerCase()} ${card.description.toLowerCase()} ${card.tags.join(' ').toLowerCase()}">
        <div class="card-icon">${card.icon}</div>
        <div class="card-content">
          <h3 class="card-title">${card.title}</h3>
          <p class="card-description">${card.description}</p>
          <div class="card-tags">
            ${card.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
          </div>
        </div>
      </div>
    `).join('');
  }

  private filterCards(searchTerm: string) {
    const cardsGrid = document.getElementById('cards-grid');
    if (!cardsGrid) return;

    cardsGrid.innerHTML = this.renderCards(searchTerm);
    this.setupCardClickHandlers();
  }

  private setupCardClickHandlers() {
    this.cards.forEach(card => {
      const cardElement = document.getElementById(card.id);
      if (cardElement) {
        cardElement.addEventListener('click', () => {
          this.Logger.info('Card clicked', { card: card.title, WinBox: !!window.WinBox });
          card.action();
        });
      }
    });
  }
}
