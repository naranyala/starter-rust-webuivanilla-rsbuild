// frontend/src/lib/error-modal.ts

export interface ErrorModalConfig {
  title?: string;
  message: string;
  details?: string;
  error?: Error;
  stack?: string;
  timestamp?: Date;
  type: 'error' | 'warning' | 'info';
  actions?: ErrorModalAction[];
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showDetails?: boolean;
  autoClose?: number;
}

export interface ErrorModalAction {
  label: string;
  primary?: boolean;
  onClick: () => void;
}

class ErrorModal {
  private container: HTMLElement | null = null;
  private backdrop: HTMLElement | null = null;
  private currentConfig: ErrorModalConfig | null = null;
  private isVisible = false;

  constructor() {
    this.init();
    this.setupGlobalHandlers();
  }

  private init(): void {
    if (typeof document === 'undefined') return;

    this.container = document.createElement('div');
    this.container.id = 'error-modal-root';
    this.container.setAttribute('aria-live', 'polite');
    this.container.setAttribute('aria-modal', 'true');
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    document.body.appendChild(this.container);

    this.backdrop = document.createElement('div');
    this.backdrop.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    this.container.appendChild(this.backdrop);
  }

  private setupGlobalHandlers(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      this.show({
        type: 'error',
        message: 'An unexpected error occurred',
        error: event.error,
        stack: event.error?.stack,
        details: `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.show({
        type: 'error',
        message: 'Unhandled Promise Rejection',
        details: String(event.reason),
      });
    });
  }

  show(config: ErrorModalConfig): void {
    if (!this.container || !this.backdrop) return;

    this.currentConfig = {
      closeOnBackdrop: true,
      closeOnEscape: true,
      showDetails: true,
      title: 'Error',
      ...config,
      timestamp: config.timestamp || new Date(),
    };

    this.render();
    this.animateIn();

    if (this.currentConfig.closeOnEscape) {
      this.setupEscapeHandler();
    }

    if (this.currentConfig.autoClose) {
      setTimeout(() => this.hide(), this.currentConfig.autoClose);
    }
  }

  private render(): void {
    if (!this.container || !this.currentConfig) return;

    const { type, title, message, details, stack, actions, showDetails } = this.currentConfig;

    const iconSvg = type === 'error' 
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
      : type === 'warning'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';

    const colors = {
      error: { bg: '#fef2f2', border: '#fecaca', icon: '#dc2626', title: '#991b1b' },
      warning: { bg: '#fffbeb', border: '#fde68a', icon: '#d97706', title: '#92400e' },
      info: { bg: '#eff6ff', border: '#bfdbfe', icon: '#2563eb', title: '#1e40af' },
    }[type];

    const modal = document.createElement('div');
    modal.className = 'error-modal';
    modal.style.cssText = `
      position: relative;
      background: white;
      border-radius: 12px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow: hidden;
      transform: scale(0.9) translateY(20px);
      transition: transform 0.3s ease;
      pointer-events: auto;
      display: flex;
      flex-direction: column;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 24px;
      border-bottom: 1px solid ${colors.border};
      background: ${colors.bg};
    `;

    const iconContainer = document.createElement('div');
    iconContainer.innerHTML = iconSvg;
    iconContainer.style.cssText = `
      width: 32px;
      height: 32px;
      color: ${colors.icon};
      flex-shrink: 0;
    `;
    iconContainer.querySelector('svg')!.style.cssText = 'width: 100%; height: 100%;';

    const titleEl = document.createElement('h2');
    titleEl.textContent = title;
    titleEl.style.cssText = `
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: ${colors.title};
      flex: 1;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    closeBtn.style.cssText = `
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      cursor: pointer;
      color: #6b7280;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    `;
    closeBtn.onmouseover = () => closeBtn.style.background = '#f3f4f6';
    closeBtn.onmouseout = () => closeBtn.style.background = 'transparent';
    closeBtn.onclick = () => this.hide();

    header.appendChild(iconContainer);
    header.appendChild(titleEl);
    header.appendChild(closeBtn);

    const content = document.createElement('div');
    content.style.cssText = `
      padding: 24px;
      overflow-y: auto;
      flex: 1;
    `;

    const messageEl = document.createElement('p');
    messageEl.textContent = message;
    messageEl.style.cssText = `
      margin: 0 0 16px;
      font-size: 15px;
      color: #374151;
      line-height: 1.6;
    `;

    content.appendChild(messageEl);

    if (showDetails && (details || stack)) {
      const detailsContainer = document.createElement('div');
      detailsContainer.style.cssText = `
        background: #1f2937;
        border-radius: 8px;
        padding: 16px;
        overflow-x: auto;
      `;

      const detailsHeader = document.createElement('div');
      detailsHeader.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      `;

      const detailsLabel = document.createElement('span');
      detailsLabel.textContent = 'Details';
      detailsLabel.style.cssText = `
        font-size: 12px;
        font-weight: 600;
        color: #9ca3af;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      `;

      const timestamp = document.createElement('span');
      timestamp.textContent = this.currentConfig.timestamp?.toLocaleTimeString() || '';
      timestamp.style.cssText = `
        font-size: 11px;
        color: #6b7280;
      `;

      detailsHeader.appendChild(detailsLabel);
      detailsHeader.appendChild(timestamp);

      const pre = document.createElement('pre');
      pre.textContent = stack || details || '';
      pre.style.cssText = `
        margin: 0;
        font-size: 12px;
        font-family: 'SF Mono', Monaco, 'Courier New', monospace;
        color: #e5e7eb;
        white-space: pre-wrap;
        word-break: break-all;
      `;

      detailsContainer.appendChild(detailsHeader);
      detailsContainer.appendChild(pre);
      content.appendChild(detailsContainer);
    }

    const footer = document.createElement('div');
    footer.style.cssText = `
      padding: 16px 24px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      background: #f9fafb;
    `;

    if (actions && actions.length > 0) {
      actions.forEach(action => {
        const btn = document.createElement('button');
        btn.textContent = action.label;
        btn.style.cssText = `
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid ${action.primary ? colors.icon : '#d1d5db'};
          background: ${action.primary ? colors.icon : 'white'};
          color: ${action.primary ? 'white' : '#374151'};
        `;
        btn.onmouseover = () => {
          btn.style.opacity = '0.9';
          btn.style.transform = 'translateY(-1px)';
        };
        btn.onmouseout = () => {
          btn.style.opacity = '1';
          btn.style.transform = 'translateY(0)';
        };
        btn.onclick = () => {
          action.onClick();
          this.hide();
        };
        footer.appendChild(btn);
      });
    } else {
      const defaultBtn = document.createElement('button');
      defaultBtn.textContent = 'Close';
      defaultBtn.style.cssText = `
        padding: 10px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        border: none;
        background: ${colors.icon};
        color: white;
        transition: all 0.2s;
      `;
      defaultBtn.onmouseover = () => defaultBtn.style.opacity = '0.9';
      defaultBtn.onmouseout = () => defaultBtn.style.opacity = '1';
      defaultBtn.onclick = () => this.hide();
      footer.appendChild(defaultBtn);
    }

    modal.appendChild(header);
    modal.appendChild(content);
    modal.appendChild(footer);

    this.container.innerHTML = '';
    this.container.appendChild(this.backdrop);
    this.container.appendChild(modal);

    if (this.currentConfig.closeOnBackdrop) {
      this.backdrop.onclick = () => this.hide();
    }

    requestAnimationFrame(() => {
      modal.style.transform = 'scale(1) translateY(0)';
      this.backdrop!.style.opacity = '1';
    });
  }

  private animateIn(): void {
    this.isVisible = true;
    document.body.style.overflow = 'hidden';
  }

  private animateOut(callback: () => void): void {
    const modal = this.container?.querySelector('.error-modal') as HTMLElement;
    if (modal) {
      modal.style.transform = 'scale(0.9) translateY(20px)';
    }
    if (this.backdrop) {
      this.backdrop.style.opacity = '0';
    }
    setTimeout(callback, 300);
  }

  hide(): void {
    if (!this.isVisible) return;

    this.animateOut(() => {
      if (this.container) {
        this.container.innerHTML = '';
        this.container.appendChild(this.backdrop!);
      }
      document.body.style.overflow = '';
      this.isVisible = false;
      this.currentConfig = null;
    });
  }

  private setupEscapeHandler(): void {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && this.isVisible) {
        this.hide();
        document.removeEventListener('keydown', handler);
      }
    };
    document.addEventListener('keydown', handler);
  }

  success(message: string, details?: string): void {
    this.show({
      type: 'info',
      title: 'Success',
      message,
      details,
    });
  }

  warning(message: string, details?: string): void {
    this.show({
      type: 'warning',
      title: 'Warning',
      message,
      details,
    });
  }

  info(message: string, details?: string): void {
    this.show({
      type: 'info',
      title: 'Information',
      message,
      details,
    });
  }

  confirm(message: string, onConfirm: () => void, onCancel?: () => void): void {
    this.show({
      type: 'info',
      title: 'Confirm',
      message,
      actions: [
        {
          label: 'Cancel',
          onClick: onCancel || (() => {}),
        },
        {
          label: 'Confirm',
          primary: true,
          onClick: onConfirm,
        },
      ],
    });
  }
}

export const errorModal = new ErrorModal();

export default ErrorModal;
