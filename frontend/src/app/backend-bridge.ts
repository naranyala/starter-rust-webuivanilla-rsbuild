// frontend/src/app/backend-bridge.ts
// Backend communication and WebUI bridge logic

import type { WindowLifecyclePayload, WsConnectionState } from './types';

export class BackendBridge {
  private wsState: WsConnectionState = 'initializing';
  private wsStateHistory: Array<{ state: WsConnectionState; at: string; reason?: string }> = [];
  private wsHeartbeatTimer: number | null = null;
  private wsReconnectAttempts = 0;
  private wsLastError = '';
  private wsLastHeartbeatAt = '';
  private wsBackendSendOk = 0;
  private wsBackendSendFail = 0;
  private wsBackendLastOkAt = '';
  private wsRuntimePort: number | null = null;
  private wsRuntimePortSource: 'injected' | 'location' | 'unknown' = 'unknown';
  private lifecycleQueue: WindowLifecyclePayload[] = [];
  private lifecycleFlushTimer: number | null = null;
  private lifecycleLastSent = new Map<string, { state: string; ts: number }>();
  private lifecycleFocusTimers = new Map<string, number>();
  private logger: any;
  private updateStatusBarFn: ((reason?: string) => void) | null = null;
  private reportStateFn: ((state: WsConnectionState, reason?: string) => void) | null = null;
  private reportErrorFn: ((error: unknown, context: string) => void) | null = null;

  constructor(logger: any) {
    this.logger = logger;
  }

  setCallbacks(
    updateStatusBar: (reason?: string) => void,
    reportState: (state: WsConnectionState, reason?: string) => void,
    reportError: (error: unknown, context: string) => void
  ) {
    this.updateStatusBarFn = updateStatusBar;
    this.reportStateFn = reportState;
    this.reportErrorFn = reportError;
  }

  getState(): WsConnectionState {
    return this.wsState;
  }

  getStateHistory(): Array<{ state: WsConnectionState; at: string; reason?: string }> {
    return this.wsStateHistory;
  }

  getPort(): number | null {
    return this.wsRuntimePort;
  }

  getPortSource(): string {
    return this.wsRuntimePortSource;
  }

  getMetrics() {
    return {
      lastHeartbeatAt: this.wsLastHeartbeatAt,
      backendSendOk: this.wsBackendSendOk,
      backendSendFail: this.wsBackendSendFail,
      backendLastOkAt: this.wsBackendLastOkAt,
      reconnectAttempts: this.wsReconnectAttempts,
      lastError: this.wsLastError,
    };
  }

  getPanelState() {
    return {
      isCollapsed: true,
      port: this.wsRuntimePort,
      portSource: this.wsRuntimePortSource,
      state: this.wsState,
      history: this.wsStateHistory,
      metrics: this.getMetrics(),
    };
  }

  resolveWsRuntimePort(): number | null {
    const fromWindow = (window as any).__WEBUI_WS_PORT__;
    if (fromWindow) {
      this.wsRuntimePort = fromWindow;
      this.wsRuntimePortSource = 'injected';
      this.logger.info('Resolved WebUI runtime port from window variable', { port: fromWindow });
      return fromWindow;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const fromUrl = urlParams.get('ws_port');
    if (fromUrl) {
      const port = parseInt(fromUrl, 10);
      if (!isNaN(port)) {
        this.wsRuntimePort = port;
        this.wsRuntimePortSource = 'location';
        this.logger.info('Resolved WebUI runtime port from URL', { port });
        return port;
      }
    }

    this.wsRuntimePortSource = 'unknown';
    return null;
  }

  transitionState(newState: WsConnectionState, reason?: string) {
    if (this.wsState === newState) return;

    const prevState = this.wsState;
    this.wsState = newState;
    this.wsStateHistory.push({
      state: newState,
      at: new Date().toLocaleTimeString(),
      reason,
    });

    if (this.wsStateHistory.length > 50) {
      this.wsStateHistory = this.wsStateHistory.slice(-25);
    }

    this.logger.info(`WS state transition: ${prevState} -> ${newState}`, { reason });
    this.updateStatusBarFn?.(reason);
    this.reportStateFn?.(newState, reason);
  }

  start() {
    this.startLifecycleQueue();
  }

  private startLifecycleQueue() {
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
        this.updateStatusBarFn?.();
        this.logger.error('Backend binding invocation failed', {
          name,
          error: (error as Error).message,
          payload,
        });
      }
    }

    if ((window as any).webui && typeof (window as any).webui.call === 'function') {
      (window as any).webui
        .call(name, serialized)
        .then(() => {
          this.wsBackendSendOk += 1;
          this.wsBackendLastOkAt = new Date().toLocaleTimeString();
          this.updateStatusBarFn?.();
        })
        .catch((error: Error) => {
          this.wsBackendSendFail += 1;
          this.wsLastError = `${name}: ${error.message}`;
          this.updateStatusBarFn?.();
          this.logger.error('webui.call backend send failed', {
            name,
            error: error.message,
            payload,
          });
        });
      return true;
    }

    return false;
  }

  sendLifecycleToBackend(payload: WindowLifecyclePayload): boolean {
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

  emitWindowLifecycle(state: string, windowInfo: Pick<{ id: string; title: string }, 'id' | 'title'>) {
    const key = windowInfo.id;
    const now = Date.now();
    const last = this.lifecycleLastSent.get(key);
    if (last && last.state === state && now - last.ts < 250) {
      return;
    }
    this.lifecycleLastSent.set(key, { state, ts: now });

    const payload: WindowLifecyclePayload = {
      event: state as any,
      window_id: windowInfo.id,
      title: windowInfo.title,
      timestamp: new Date().toISOString(),
    };
    this.lifecycleQueue.push(payload);
  }

  emitFocusedLifecycle(windowInfo: Pick<{ id: string; title: string }, 'id' | 'title'>) {
    const existing = this.lifecycleFocusTimers.get(windowInfo.id);
    if (existing) {
      window.clearTimeout(existing);
    }

    const timer = window.setTimeout(() => {
      this.emitWindowLifecycle('focused', windowInfo);
      this.lifecycleFocusTimers.delete(windowInfo.id);
    }, 100);

    this.lifecycleFocusTimers.set(windowInfo.id, timer);
  }

  destroy() {
    if (this.lifecycleFlushTimer !== null) {
      window.clearInterval(this.lifecycleFlushTimer);
    }
    this.lifecycleFocusTimers.forEach((timer) => window.clearTimeout(timer));
  }
}
