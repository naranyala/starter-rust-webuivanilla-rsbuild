// frontend/src/lib/logger.ts

export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  SILENT = 5,
}

export interface LogEntry {
  timestamp: string;
  level: string;
  levelValue: LogLevel;
  context: string;
  message: string;
  data?: unknown;
  stack?: string;
}

export interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  enableStorage: boolean;
  maxStoredLogs: number;
  remoteEndpoint?: string;
}

const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: LogLevel.INFO,
  enableConsole: true,
  enableRemote: false,
  enableStorage: false,
  maxStoredLogs: 1000,
};

class StructuredLogger {
  private config: LoggerConfig;
  private context: string;
  private logBuffer: LogEntry[] = [];

  constructor(context: string, config: Partial<LoggerConfig> = {}) {
    this.context = context;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (!this.config.enableStorage) return;
    try {
      const stored = localStorage.getItem('app_logs');
      if (stored) {
        this.logBuffer = JSON.parse(stored);
        this.trimLogBuffer();
      }
    } catch {
      // Ignore storage errors
    }
  }

  private saveToStorage(): void {
    if (!this.config.enableStorage) return;
    try {
      this.trimLogBuffer();
      localStorage.setItem('app_logs', JSON.stringify(this.logBuffer));
    } catch {
      // Ignore storage errors
    }
  }

  private trimLogBuffer(): void {
    if (this.logBuffer.length > this.config.maxStoredLogs) {
      this.logBuffer = this.logBuffer.slice(-this.config.maxStoredLogs);
    }
  }

  private formatMessage(level: string, message: string, data?: unknown): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      levelValue: LogLevel[level as keyof typeof LogLevel],
      context: this.context,
      message,
      data,
      stack: level === 'ERROR' ? new Error().stack : undefined,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.minLevel;
  }

  private formatConsoleMessage(entry: LogEntry): string {
    const { timestamp, level, context, message, data } = entry;
    const time = new Date(timestamp).toLocaleTimeString();
    let formatted = `[${time}] [${level}] [${context}] ${message}`;
    if (data !== undefined) {
      formatted += ` ${JSON.stringify(data)}`;
    }
    return formatted;
  }

  private log(entry: LogEntry): void {
    if (!this.shouldLog(entry.levelValue)) return;

    this.logBuffer.push(entry);
    this.saveToStorage();

    if (this.config.enableConsole) {
      const formatted = this.formatConsoleMessage(entry);
      
      switch (entry.level) {
        case 'ERROR':
          console.error(formatted, entry.data || '');
          if (entry.stack) console.error(entry.stack);
          break;
        case 'WARN':
          console.warn(formatted, entry.data || '');
          break;
        case 'DEBUG':
          console.debug(formatted, entry.data || '');
          break;
        default:
          console.log(formatted, entry.data || '');
      }
    }

    if (this.config.enableRemote && this.config.remoteEndpoint) {
      this.sendToRemote(entry).catch(() => {});
    }
  }

  private async sendToRemote(entry: LogEntry): Promise<void> {
    try {
      await fetch(this.config.remoteEndpoint!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
    } catch {
      // Silently fail remote logging
    }
  }

  trace(message: string, data?: unknown): void {
    this.log(this.formatMessage('TRACE', message, data));
  }

  debug(message: string, data?: unknown): void {
    this.log(this.formatMessage('DEBUG', message, data));
  }

  info(message: string, data?: unknown): void {
    this.log(this.formatMessage('INFO', message, data));
  }

  warn(message: string, data?: unknown): void {
    this.log(this.formatMessage('WARN', message, data));
  }

  error(message: string, data?: unknown): void {
    this.log(this.formatMessage('ERROR', message, data));
  }

  group(label: string): void {
    console.group(`[${this.context}] ${label}`);
  }

  groupEnd(): void {
    console.groupEnd();
  }

  time(label: string): void {
    console.time(`${this.context}:${label}`);
  }

  timeEnd(label: string): void {
    console.timeEnd(`${this.context}:${label}`);
  }

  getLogs(): LogEntry[] {
    return [...this.logBuffer];
  }

  clearLogs(): void {
    this.logBuffer = [];
    if (this.config.enableStorage) {
      localStorage.removeItem('app_logs');
    }
  }

  setLevel(level: LogLevel): void {
    this.config.minLevel = level;
  }

  static createLogger(context: string, config?: Partial<LoggerConfig>): StructuredLogger {
    return new StructuredLogger(context, config);
  }
}

export const createLogger = (context: string, config?: Partial<LoggerConfig>): StructuredLogger => {
  return StructuredLogger.createLogger(context, config);
};

export const logger = createLogger('App', {
  minLevel: import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO,
  enableStorage: true,
  maxStoredLogs: 500,
});

export default StructuredLogger;
