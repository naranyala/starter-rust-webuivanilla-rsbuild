// frontend/src/App.ts
// Vanilla TypeScript implementation of the application

import { escapeHtml, sanitizeUserInput } from './lib/security';
import { errorModal } from './lib/error-modal';

interface WindowInfo {
  id: string;
  title: string;
  minimized: boolean;
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
    getUsers?: () => void;
    getDbStats?: () => void;
    refreshUsers?: () => void;
    searchUsers?: () => void;
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

export class App {
  private rootElement: HTMLElement;
  private activeWindows: WindowInfo[] = [];
  private dbUsers: User[] = [];
  private dbStats: { users: number; tables: string[] } = { users: 0, tables: [] };
  private isLoadingUsers: boolean = false;
  private cards: CardItem[] = [];

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
    `;
  }

  private getWindowItemHTML(window: WindowInfo): string {
    return `
      <div class="window-item ${window.minimized ? 'minimized' : ''}" data-window-id="${window.id}">
        <div class="window-icon">📷</div>
        <div class="window-info">
          <span class="window-title">${window.title}</span>
          <span class="window-status">${window.minimized ? 'Minimized' : 'Active'}</span>
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
        min-height: 100vh;
        display: flex;
        flex-direction: row;
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
        overflow-y: auto;
      }

      .cards-section {
        margin-bottom: 1rem;
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
        gap: 1.5rem;
      }

      .cards-grid.two-cards {
        grid-template-columns: repeat(2, 1fr);
        max-width: 800px;
        margin: 0 auto;
      }

      .feature-card {
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        min-height: 200px;
      }

      .feature-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 12px 24px rgba(0,0,0,0.1);
      }

      .card-icon {
        font-size: 3rem;
        text-align: center;
        padding: 1.5rem;
        background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ec 100%);
      }

      .card-content {
        padding: 1.25rem;
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .card-title {
        font-size: 1.1rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
        color: #1e293b;
      }

      .card-description {
        font-size: 0.85rem;
        color: #64748b;
        margin-bottom: 1rem;
        line-height: 1.5;
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

  private generateSystemInfoHTML(): string {
    const now = new Date();
    return `
      <div style="padding: 20px; color: white; font-family: 'Segoe UI', sans-serif; max-height: 100%; overflow-y: auto;">
        <h2 style="margin-bottom: 20px; color: #4f46e5;">💻 System Information</h2>

        <div style="margin-bottom: 20px;">
          <h3 style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 10px;">Operating System</h3>
          <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #64748b;">Platform:</span>
              <span>${navigator.platform}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #64748b;">User Agent:</span>
              <span style="font-size: 0.8rem; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${navigator.userAgent}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">Language:</span>
              <span>${navigator.language}</span>
            </div>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <h3 style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 10px;">Display & Screen</h3>
          <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #64748b;">Screen Resolution:</span>
              <span>${screen.width} × ${screen.height}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #64748b;">Available Resolution:</span>
              <span>${screen.availWidth} × ${screen.availHeight}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #64748b;">Color Depth:</span>
              <span>${screen.colorDepth}-bit</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">Pixel Ratio:</span>
              <span>${window.devicePixelRatio}x</span>
            </div>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <h3 style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 10px;">Browser Information</h3>
          <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #64748b;">Online Status:</span>
              <span style="color: ${navigator.onLine ? '#10b981' : '#ef4444'}">${navigator.onLine ? '🟢 Online' : '🔴 Offline'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #64748b;">Cookies Enabled:</span>
              <span>${navigator.cookieEnabled ? 'Yes' : 'No'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #64748b;">Cores:</span>
              <span>${navigator.hardwareConcurrency || 'Unknown'}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">Memory:</span>
              <span>${navigator.deviceMemory || 'Unknown'} GB</span>
            </div>
          </div>
        </div>

        <div>
          <h3 style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 10px;">Current Time</h3>
          <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #64748b;">Local Time:</span>
              <span>${now.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #64748b;">Timezone:</span>
              <span>${Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">Timezone Offset:</span>
              <span>UTC${now.getTimezoneOffset() > 0 ? '-' : '+'}${Math.abs(now.getTimezoneOffset() / 60)}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private generateSQLiteHTML(): string {
    const users = this.dbUsers.length > 0 ? this.dbUsers : [
      { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active', created_at: '' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'Active', created_at: '' },
      { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'User', status: 'Inactive', created_at: '' },
      { id: 4, name: 'Alice Brown', email: 'alice@example.com', role: 'Editor', status: 'Active', created_at: '' },
      { id: 5, name: 'Charlie Wilson', email: 'charlie@example.com', role: 'User', status: 'Pending', created_at: '' },
    ];

    const rows = users.map((row: User) => `
      <tr style="border-bottom: 1px solid #334155;">
        <td style="padding: 10px; color: #e2e8f0;">${row.id}</td>
        <td style="padding: 10px; color: #e2e8f0;">${row.name}</td>
        <td style="padding: 10px; color: #94a3b8;">${row.email}</td>
        <td style="padding: 10px;"><span style="background: ${row.role === 'Admin' ? '#dc2626' : row.role === 'Editor' ? '#f59e0b' : '#3b82f6'}; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;">${row.role}</span></td>
        <td style="padding: 10px;"><span style="color: ${row.status === 'Active' ? '#10b981' : row.status === 'Inactive' ? '#ef4444' : '#f59e0b'}">● ${row.status}</span></td>
      </tr>
    `).join('');

    return `
      <div style="padding: 20px; color: white; font-family: 'Segoe UI', sans-serif; height: 100%; display: flex; flex-direction: column;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="color: #4f46e5;">🗄️ SQLite Database Viewer</h2>
          <span style="background: #10b981; padding: 5px 12px; border-radius: 20px; font-size: 0.8rem;">Live Data</span>
        </div>

        <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
          <div style="display: flex; gap: 10px; margin-bottom: 15px;">
            <input type="text" id="db-search" placeholder="Search records..." style="flex: 1; padding: 8px 12px; background: rgba(0,0,0,0.3); border: 1px solid #334155; border-radius: 6px; color: white; font-size: 0.9rem;">
            <button onclick="window.searchUsers && window.searchUsers()" style="padding: 8px 16px; background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">Search</button>
            <button onclick="window.refreshUsers && window.refreshUsers()" style="padding: 8px 16px; background: #f59e0b; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">↻</button>
          </div>

          <div style="display: flex; gap: 15px; font-size: 0.8rem; color: #94a3b8;">
            <span>📊 Table: <strong style="color: white;">users</strong></span>
            <span>📋 Records: <strong style="color: white;">${users.length}</strong></span>
            <span>💾 Source: <strong style="color: white;">Rust SQLite</strong></span>
          </div>
        </div>

        <div style="flex: 1; overflow: auto; background: rgba(0,0,0,0.2); border-radius: 8px;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead style="background: rgba(255,255,255,0.1); position: sticky; top: 0;">
              <tr>
                <th style="padding: 12px 10px; text-align: left; color: #94a3b8; font-weight: 600; font-size: 0.85rem;">ID</th>
                <th style="padding: 12px 10px; text-align: left; color: #94a3b8; font-weight: 600; font-size: 0.85rem;">Name</th>
                <th style="padding: 12px 10px; text-align: left; color: #94a3b8; font-weight: 600; font-size: 0.85rem;">Email</th>
                <th style="padding: 12px 10px; text-align: left; color: #94a3b8; font-weight: 600; font-size: 0.85rem;">Role</th>
                <th style="padding: 12px 10px; text-align: left; color: #94a3b8; font-weight: 600; font-size: 0.85rem;">Status</th>
              </tr>
            </thead>
            <tbody id="users-table-body">
              ${rows}
            </tbody>
          </table>
        </div>

        <div style="margin-top: 15px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #64748b; font-size: 0.8rem;">Showing ${users.length} record${users.length !== 1 ? 's' : ''}</span>
          <div style="display: flex; gap: 5px;">
            <button style="padding: 5px 12px; background: rgba(255,255,255,0.1); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;" disabled>Previous</button>
            <button style="padding: 5px 12px; background: rgba(255,255,255,0.1); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;" disabled>Next</button>
          </div>
        </div>
      </div>
    `;
  }

  private openSystemInfoWindow() {
    this.openWindow('System Information', this.generateSystemInfoHTML(), '💻');
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

    this.openWindow('SQLite Database', this.generateSQLiteHTML(), '🗄️');
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

  private generateCalculatorHTML(): string {
    return `
      <div style="padding: 20px; color: white; font-family: 'Segoe UI', sans-serif; height: 100%; display: flex; flex-direction: column; background: #1e293b;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="color: #4f46e5;">🧮 Calculator</h2>
        </div>

        <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
          <input type="text" id="calculator-display" readonly style="width: 100%; padding: 15px; font-size: 1.5rem; text-align: right; background: #0f172a; color: white; border: 1px solid #334155; border-radius: 6px; box-sizing: border-box;">
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; flex: 1;">
          <button onclick="calculatorClear()" style="grid-column: span 2; padding: 15px; background: #dc2626; color: white; border: none; border-radius: 6px; font-size: 1rem; cursor: pointer;">AC</button>
          <button onclick="calculatorDelete()" style="padding: 15px; background: #f59e0b; color: white; border: none; border-radius: 6px; font-size: 1rem; cursor: pointer;">DEL</button>
          <button onclick="calculatorAppend('/')" style="padding: 15px; background: #4f46e5; color: white; border: none; border-radius: 6px; font-size: 1rem; cursor: pointer;">÷</button>

          <button onclick="calculatorAppend('7')" style="padding: 15px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #334155; border-radius: 6px; font-size: 1rem; cursor: pointer;">7</button>
          <button onclick="calculatorAppend('8')" style="padding: 15px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #334155; border-radius: 6px; font-size: 1rem; cursor: pointer;">8</button>
          <button onclick="calculatorAppend('9')" style="padding: 15px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #334155; border-radius: 6px; font-size: 1rem; cursor: pointer;">9</button>
          <button onclick="calculatorAppend('*')" style="padding: 15px; background: #4f46e5; color: white; border: none; border-radius: 6px; font-size: 1rem; cursor: pointer;">×</button>

          <button onclick="calculatorAppend('4')" style="padding: 15px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #334155; border-radius: 6px; font-size: 1rem; cursor: pointer;">4</button>
          <button onclick="calculatorAppend('5')" style="padding: 15px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #334155; border-radius: 6px; font-size: 1rem; cursor: pointer;">5</button>
          <button onclick="calculatorAppend('6')" style="padding: 15px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #334155; border-radius: 6px; font-size: 1rem; cursor: pointer;">6</button>
          <button onclick="calculatorAppend('-')" style="padding: 15px; background: #4f46e5; color: white; border: none; border-radius: 6px; font-size: 1rem; cursor: pointer;">-</button>

          <button onclick="calculatorAppend('1')" style="padding: 15px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #334155; border-radius: 6px; font-size: 1rem; cursor: pointer;">1</button>
          <button onclick="calculatorAppend('2')" style="padding: 15px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #334155; border-radius: 6px; font-size: 1rem; cursor: pointer;">2</button>
          <button onclick="calculatorAppend('3')" style="padding: 15px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #334155; border-radius: 6px; font-size: 1rem; cursor: pointer;">3</button>
          <button onclick="calculatorAppend('+')" style="padding: 15px; background: #4f46e5; color: white; border: none; border-radius: 6px; font-size: 1rem; cursor: pointer;">+</button>

          <button onclick="calculatorAppend('0')" style="grid-column: span 2; padding: 15px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #334155; border-radius: 6px; font-size: 1rem; cursor: pointer;">0</button>
          <button onclick="calculatorAppend('.')" style="padding: 15px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #334155; border-radius: 6px; font-size: 1rem; cursor: pointer;">.</button>
          <button onclick="calculatorCalculate()" style="padding: 15px; background: #10b981; color: white; border: none; border-radius: 6px; font-size: 1rem; cursor: pointer;">=</button>
        </div>

        <script>
          let calculatorDisplay = document.getElementById('calculator-display');
          let currentInput = '0';
          let previousInput = '';
          let operation = null;
          let shouldResetDisplay = false;

          function updateDisplay() {
            calculatorDisplay.value = currentInput;
          }

          function calculatorAppend(value) {
            if (shouldResetDisplay) {
              currentInput = '';
              shouldResetDisplay = false;
            }
            
            if (currentInput === '0' && value !== '.') {
              currentInput = value;
            } else {
              currentInput += value;
            }
            
            updateDisplay();
          }

          function calculatorClear() {
            currentInput = '0';
            previousInput = '';
            operation = null;
            shouldResetDisplay = false;
            updateDisplay();
          }

          function calculatorDelete() {
            if (currentInput.length === 1) {
              currentInput = '0';
            } else {
              currentInput = currentInput.slice(0, -1);
            }
            updateDisplay();
          }

          function calculatorCalculate() {
            if (operation === null || shouldResetDisplay) return;

            let result;
            const prev = parseFloat(previousInput);
            const current = parseFloat(currentInput);

            if (isNaN(prev) || isNaN(current)) return;

            switch (operation) {
              case '+':
                result = prev + current;
                break;
              case '-':
                result = prev - current;
                break;
              case '*':
                result = prev * current;
                break;
              case '/':
                result = prev / current;
                break;
              default:
                return;
            }

            currentInput = result.toString();
            operation = null;
            previousInput = '';
            shouldResetDisplay = true;
            updateDisplay();
          }

          function calculatorSetOperation(op) {
            if (operation !== null) calculatorCalculate();
            
            operation = op;
            previousInput = currentInput;
            shouldResetDisplay = true;
          }

          // Attach functions to window so they can be called from HTML
          window.calculatorAppend = calculatorAppend;
          window.calculatorClear = calculatorClear;
          window.calculatorDelete = calculatorDelete;
          window.calculatorCalculate = calculatorCalculate;
          window.calculatorSetOperation = calculatorSetOperation;

          // Initialize display
          updateDisplay();
        </script>
      </div>
    `;
  }

  private generateTextEditorHTML(): string {
    return `
      <div style="padding: 20px; color: white; font-family: 'Segoe UI', sans-serif; height: 100%; display: flex; flex-direction: column; background: #1e293b;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="color: #4f46e5;">📝 Text Editor</h2>
          <div style="display: flex; gap: 10px;">
            <button onclick="textEditorSave()" style="padding: 8px 16px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">Save</button>
            <button onclick="textEditorLoad()" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">Load</button>
          </div>
        </div>

        <textarea id="text-editor-content" style="flex: 1; width: 100%; padding: 15px; background: #0f172a; color: white; border: 1px solid #334155; border-radius: 8px; resize: none; font-family: monospace; font-size: 1rem; box-sizing: border-box;"></textarea>

        <div style="margin-top: 15px; display: flex; justify-content: space-between; align-items: center;">
          <div style="color: #94a3b8; font-size: 0.8rem;">
            <span id="cursor-position">Line: 1, Column: 1</span>
          </div>
          <div style="display: flex; gap: 10px;">
            <button onclick="textEditorUndo()" style="padding: 6px 12px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #334155; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">Undo</button>
            <button onclick="textEditorRedo()" style="padding: 6px 12px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #334155; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">Redo</button>
          </div>
        </div>

        <script>
          let textEditorContent = document.getElementById('text-editor-content');
          let undoStack = [];
          let redoStack = [];

          function saveState() {
            undoStack.push(textEditorContent.value);
            if (undoStack.length > 50) undoStack.shift(); // Limit stack size
            redoStack = []; // Clear redo stack when new action is performed
          }

          function updateCursorPosition() {
            const textarea = textEditorContent;
            const text = textarea.value.substring(0, textarea.selectionStart);
            const lines = text.split('\\n');
            const line = lines.length;
            const column = lines[lines.length - 1].length + 1;
            document.getElementById('cursor-position').textContent = \`Line: \${line}, Column: \${column}\`;
          }

          function textEditorSave() {
            const content = textEditorContent.value;
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'document.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }

          function textEditorLoad() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.txt,.js,.ts,.html,.css,.json,.md';
            
            input.onchange = e => {
              const file = e.target.files[0];
              const reader = new FileReader();
              
              reader.onload = function(e) {
                textEditorContent.value = e.target.result;
                saveState();
                updateCursorPosition();
              };
              
              reader.readAsText(file);
            };
            
            input.click();
          }

          function textEditorUndo() {
            if (undoStack.length > 0) {
              redoStack.push(textEditorContent.value);
              textEditorContent.value = undoStack.pop();
            }
          }

          function textEditorRedo() {
            if (redoStack.length > 0) {
              undoStack.push(textEditorContent.value);
              textEditorContent.value = redoStack.pop();
            }
          }

          // Event listeners
          textEditorContent.addEventListener('input', saveState);
          textEditorContent.addEventListener('keyup', updateCursorPosition);
          textEditorContent.addEventListener('click', updateCursorPosition);
          textEditorContent.addEventListener('mousemove', updateCursorPosition);

          // Initialize
          saveState();
          updateCursorPosition();

          // Attach functions to window
          window.textEditorSave = textEditorSave;
          window.textEditorLoad = textEditorLoad;
          window.textEditorUndo = textEditorUndo;
          window.textEditorRedo = textEditorRedo;
        </script>
      </div>
    `;
  }

  private generateImageViewerHTML(): string {
    return `
      <div style="padding: 20px; color: white; font-family: 'Segoe UI', sans-serif; height: 100%; display: flex; flex-direction: column; background: #1e293b;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="color: #4f46e5;">🖼️ Image Viewer</h2>
          <div style="display: flex; gap: 10px;">
            <button onclick="imageViewerZoomIn()" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">Zoom In</button>
            <button onclick="imageViewerZoomOut()" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">Zoom Out</button>
            <button onclick="imageViewerReset()" style="padding: 8px 16px; background: #f59e0b; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">Reset</button>
          </div>
        </div>

        <div style="flex: 1; display: flex; justify-content: center; align-items: center; background: #0f172a; border-radius: 8px; overflow: hidden; position: relative;">
          <img id="image-viewer-img" src="https://placehold.co/600x400/1e293b/94a3b8?text=Select+an+Image+to+View" alt="Image Preview" style="max-width: 100%; max-height: 100%; object-fit: contain; transition: transform 0.2s ease;">
        </div>

        <div style="margin-top: 15px; display: flex; gap: 10px;">
          <input type="file" id="image-upload" accept="image/*" style="display: none;" onchange="imageViewerHandleUpload()">
          <button onclick="document.getElementById('image-upload').click()" style="flex: 1; padding: 10px; background: #8b5cf6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">Select Image</button>
          <button onclick="imageViewerPrev()" style="padding: 10px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #334155; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">← Prev</button>
          <button onclick="imageViewerNext()" style="padding: 10px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #334155; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">Next →</button>
        </div>

        <script>
          let imageView = document.getElementById('image-viewer-img');
          let scale = 1;
          let currentImageIndex = 0;
          
          // Sample images for demo
          const sampleImages = [
            'https://placehold.co/600x400/1e293b/94a3b8?text=Sample+Image+1',
            'https://placehold.co/600x400/0f172a/4f46e5?text=Sample+Image+2',
            'https://placehold.co/600x400/1e293b/f59e0b?text=Sample+Image+3',
            'https://placehold.co/600x400/0f172a/10b981?text=Sample+Image+4'
          ];

          function imageViewerZoomIn() {
            scale = Math.min(scale + 0.2, 3);
            imageView.style.transform = \`scale(\${scale})\`;
          }

          function imageViewerZoomOut() {
            scale = Math.max(scale - 0.2, 0.2);
            imageView.style.transform = \`scale(\${scale})\`;
          }

          function imageViewerReset() {
            scale = 1;
            imageView.style.transform = 'scale(1)';
          }

          function imageViewerHandleUpload() {
            const input = document.getElementById('image-upload');
            const file = input.files[0];
            
            if (file) {
              const reader = new FileReader();
              reader.onload = function(e) {
                imageView.src = e.target.result;
                scale = 1;
                imageView.style.transform = 'scale(1)';
              };
              reader.readAsDataURL(file);
            }
          }

          function imageViewerPrev() {
            currentImageIndex = (currentImageIndex - 1 + sampleImages.length) % sampleImages.length;
            imageView.src = sampleImages[currentImageIndex];
            scale = 1;
            imageView.style.transform = 'scale(1)';
          }

          function imageViewerNext() {
            currentImageIndex = (currentImageIndex + 1) % sampleImages.length;
            imageView.src = sampleImages[currentImageIndex];
            scale = 1;
            imageView.style.transform = 'scale(1)';
          }

          // Attach functions to window
          window.imageViewerZoomIn = imageViewerZoomIn;
          window.imageViewerZoomOut = imageViewerZoomOut;
          window.imageViewerReset = imageViewerReset;
          window.imageViewerHandleUpload = imageViewerHandleUpload;
          window.imageViewerPrev = imageViewerPrev;
          window.imageViewerNext = imageViewerNext;
        </script>
      </div>
    `;
  }

  private generateTerminalHTML(): string {
    return `
      <div style="padding: 20px; color: white; font-family: 'Courier New', monospace; height: 100%; display: flex; flex-direction: column; background: #0f172a;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="color: #4f46e5;">⌨️ Terminal Emulator</h2>
          <div style="display: flex; gap: 10px;">
            <button onclick="terminalClear()" style="padding: 8px 16px; background: #dc2626; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">Clear</button>
            <button onclick="terminalReset()" style="padding: 8px 16px; background: #f59e0b; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">Reset</button>
          </div>
        </div>

        <div id="terminal-output" style="flex: 1; background: #000; color: #00ff00; padding: 15px; border-radius: 8px; overflow-y: auto; font-size: 0.9rem; white-space: pre-wrap; margin-bottom: 10px; height: calc(100% - 80px);">
          <div>Welcome to Terminal Emulator v1.0</div>
          <div>Type 'help' for available commands</div>
          <div style="color: #94a3b8;">$ Ready...</div>
        </div>

        <div style="display: flex; gap: 10px;">
          <span style="color: #94a3b8;">$</span>
          <input type="text" id="terminal-input" style="flex: 1; background: #000; color: #00ff00; border: 1px solid #334155; border-radius: 4px; padding: 8px; font-family: 'Courier New', monospace;" placeholder="Enter command...">
          <button onclick="terminalExecute()" style="padding: 8px 16px; background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">Run</button>
        </div>

        <script>
          let terminalOutput = document.getElementById('terminal-output');
          let terminalInput = document.getElementById('terminal-input');
          let commandHistory = [];
          let historyIndex = -1;

          function terminalPrint(text) {
            const div = document.createElement('div');
            div.textContent = text;
            terminalOutput.appendChild(div);
            terminalOutput.scrollTop = terminalOutput.scrollHeight;
          }

          function terminalExecute() {
            const command = terminalInput.value.trim();
            if (!command) return;

            terminalPrint('$ ' + command);
            commandHistory.push(command);
            historyIndex = commandHistory.length;

            // Process command
            const cmd = command.toLowerCase();
            if (cmd === 'help') {
              terminalPrint('Available commands:');
              terminalPrint('  help - Show this help message');
              terminalPrint('  clear - Clear the terminal');
              terminalPrint('  echo [text] - Print text to terminal');
              terminalPrint('  date - Show current date and time');
              terminalPrint('  whoami - Show current user');
              terminalPrint('  pwd - Show current directory');
              terminalPrint('  ls - List directory contents');
            } else if (cmd === 'clear') {
              terminalClear();
              return;
            } else if (cmd === 'date') {
              terminalPrint(new Date().toString());
            } else if (cmd === 'whoami') {
              terminalPrint('user@rust-webui:~$');
            } else if (cmd === 'pwd') {
              terminalPrint('/home/user');
            } else if (cmd === 'ls') {
              terminalPrint('Documents\\tDownloads\\tPictures\\tMusic\\tVideos');
            } else if (cmd.startsWith('echo ')) {
              terminalPrint(command.substring(5));
            } else {
              terminalPrint('Command not found: ' + command + '. Type "help" for available commands.');
            }

            terminalInput.value = '';
          }

          function terminalClear() {
            terminalOutput.innerHTML = '';
            terminalPrint('Terminal cleared');
            terminalPrint('Type "help" for available commands');
          }

          function terminalReset() {
            terminalOutput.innerHTML = '';
            terminalPrint('Welcome to Terminal Emulator v1.0');
            terminalPrint('Type "help" for available commands');
            terminalPrint('$ Ready...');
            commandHistory = [];
            historyIndex = -1;
          }

          // Handle keyboard events
          terminalInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
              terminalExecute();
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              if (commandHistory.length > 0) {
                if (historyIndex <= 0) historyIndex = commandHistory.length;
                historyIndex--;
                terminalInput.value = commandHistory[historyIndex];
              }
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (historyIndex >= commandHistory.length - 1) {
                historyIndex = commandHistory.length;
                terminalInput.value = '';
              } else {
                historyIndex++;
                if (historyIndex < commandHistory.length) {
                  terminalInput.value = commandHistory[historyIndex];
                } else {
                  terminalInput.value = '';
                }
              }
            }
          });

          // Focus input on click anywhere in terminal
          terminalOutput.addEventListener('click', function() {
            terminalInput.focus();
          });

          // Attach functions to window
          window.terminalExecute = terminalExecute;
          window.terminalClear = terminalClear;
          window.terminalReset = terminalReset;
        </script>
      </div>
    `;
  }

  private openCalculatorWindow() {
    this.openWindow('Calculator', this.generateCalculatorHTML(), '🧮');
  }

  private openTextEditorWindow() {
    this.openWindow('Text Editor', this.generateTextEditorHTML(), '📝');
  }

  private openImageViewerWindow() {
    this.openWindow('Image Viewer', this.generateImageViewerHTML(), '🖼️');
  }

  private openTerminalWindow() {
    this.openWindow('Terminal', this.generateTerminalHTML(), '⌨️');
  }

  private waitForWinBox(retries: number = 10): Promise<any> {
    return new Promise((resolve) => {
      const check = (attempt: number) => {
        if (window.WinBox) {
          resolve(window.WinBox);
        } else if (attempt < retries) {
          setTimeout(() => check(attempt + 1), 100);
        } else {
          this.Logger.error('WinBox failed to load after retries');
          resolve(null);
        }
      };
      check(0);
    });
  }

  private async openWindow(title: string, content: string, icon: string, options: any = {}) {
    if (!window.WinBox) {
      this.Logger.warn('WinBox not ready, waiting...');
      const WinBox = await this.waitForWinBox();
      if (!WinBox) {
        this.Logger.error('WinBox is not loaded. Please try again.');
        return;
      }
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
      oncreate: function() {
        this.body.innerHTML = content;
      },
      onminimize: () => {
        this.activeWindows = this.activeWindows.map(w =>
          w.id === windowId ? { ...w, minimized: true } : w
        );
        this.updateWindowList();
      },
      onrestore: () => {
        this.activeWindows = this.activeWindows.map(w =>
          w.id === windowId ? { ...w, minimized: false, maximized: false } : w
        );
        this.updateWindowList();
      },
      onmaximize: () => {
        const availableWidth = window.innerWidth - 200;
        const availableHeight = window.innerHeight;

        winboxInstance.resize(availableWidth, availableHeight);
        winboxInstance.move(200, 0);

        this.activeWindows = this.activeWindows.map(w =>
          w.id === windowId ? { ...w, maximized: true } : w
        );
      },
      onclose: () => {
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
      maximized: false,
      winboxInstance: winboxInstance
    };

    this.activeWindows.push(windowInfo);
    this.updateWindowList();
  }

  private openCalculatorWindow() {
    this.openWindow('Calculator', this.generateCalculatorHTML(), '🧮', {
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
    this.openWindow('Text Editor', this.generateTextEditorHTML(), '📝', {
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
    this.openWindow('Image Viewer', this.generateImageViewerHTML(), '🖼️', {
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
    this.openWindow('Terminal', this.generateTerminalHTML(), '⌨️', {
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
    }
    windowInfo.winboxInstance.focus();
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
        return { ...w, minimized: true, maximized: false };
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