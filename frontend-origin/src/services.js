// services.js - Application services using DI
import { ServiceCollection, ServiceLifetime, initGlobalProvider } from './di.js';

/**
 * Logger Service
 */
export class LoggerService {
  constructor() {
    this.level = 'info';
    this.logs = [];
  }

  debug(message, data) {
    this._log('debug', message, data);
  }

  info(message, data) {
    this._log('info', message, data);
  }

  warn(message, data) {
    this._log('warn', message, data);
  }

  error(message, data) {
    this._log('error', message, data);
  }

  _log(level, message, data) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message, data };
    this.logs.push(logEntry);

    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    if (levels[level] >= levels[this.level]) {
      console[level](`[${timestamp}] ${level.toUpperCase()}: ${message}`, data || '');
    }
  }

  getLogs() {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  setLevel(level) {
    this.level = level;
  }
}

/**
 * WebUI Bridge Service
 */
export class WebUIBridgeService {
  constructor(logger) {
    this.logger = logger;
    this.callbacks = new Map();
    this.nextId = 1;
    this.eventListeners = new Map();
  }

  /**
   * Call a Rust function
   */
  async call(funcName, data = null) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.callbacks.set(id, { resolve, reject });

      this.logger.info(`Calling Rust function: ${funcName}`, data);

      if (window.webui) {
        window.webui.call(funcName, JSON.stringify(data || {}))
          .then(result => {
            this.logger.info(`Rust function ${funcName} succeeded`, result);
            resolve(JSON.parse(result));
          })
          .catch(error => {
            this.logger.error(`Rust function ${funcName} failed`, error);
            reject(error);
          });
      } else {
        this.logger.warn('WebUI not available, using mock');
        resolve({ success: true, mock: true, funcName, data });
      }
    });
  }

  /**
   * Bind to an event from Rust
   */
  on(eventName, callback) {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
      
      // Set up global listener for this event type
      window.addEventListener(eventName, (e) => {
        this._handleEvent(eventName, e.detail);
      });
    }
    
    this.eventListeners.get(eventName).add(callback);
    this.logger.debug(`Bound to event: ${eventName}`);
  }

  /**
   * Unbind from an event
   */
  off(eventName, callback) {
    if (this.eventListeners.has(eventName)) {
      this.eventListeners.get(eventName).delete(callback);
    }
  }

  _handleEvent(eventName, data) {
    if (this.eventListeners.has(eventName)) {
      this.eventListeners.get(eventName).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          this.logger.error(`Error in event handler for ${eventName}`, error);
        }
      });
    }
  }
}

/**
 * Database Service
 */
export class DatabaseService {
  constructor(bridge, logger) {
    this.bridge = bridge;
    this.logger = logger;
    this.users = [];
    this.isLoading = false;
  }

  async getUsers() {
    this.isLoading = true;
    this.logger.info('Fetching users from database');
    
    try {
      const result = await this.bridge.call('get_users');
      if (result.success) {
        this.users = result.data || [];
        this.logger.info(`Loaded ${this.users.length} users`);
        return this.users;
      } else {
        throw new Error(result.error);
      }
    } finally {
      this.isLoading = false;
    }
  }

  async createUser(name, email, role = 'User', status = 'Active') {
    this.logger.info(`Creating user: ${name}`);
    const result = await this.bridge.call('create_user', { name, email, role, status });
    
    if (result.success) {
      await this.getUsers(); // Refresh list
      return result;
    } else {
      throw new Error(result.error);
    }
  }

  async deleteUser(id) {
    this.logger.info(`Deleting user: ${id}`);
    const result = await this.bridge.call('delete_user', { id });
    
    if (result.success) {
      await this.getUsers(); // Refresh list
      return result;
    } else {
      throw new Error(result.error);
    }
  }

  async getStats() {
    const result = await this.bridge.call('get_db_stats');
    return result.success ? result.stats : null;
  }
}

/**
 * System Info Service
 */
export class SystemInfoService {
  constructor(bridge, logger) {
    this.bridge = bridge;
    this.logger = logger;
    this.systemInfo = null;
  }

  async getSystemInfo() {
    this.logger.info('Fetching system info');
    const result = await this.bridge.call('get_system_info');
    
    if (result.success) {
      this.systemInfo = result.data;
      return this.systemInfo;
    } else {
      throw new Error(result.error);
    }
  }
}

/**
 * Notification Service
 */
export class NotificationService {
  constructor(bridge, logger) {
    this.bridge = bridge;
    this.logger = logger;
  }

  async showNotification(title, body, options = {}) {
    this.logger.info(`Showing notification: ${title}`);
    return this.bridge.call('send_notification', {
      title,
      body,
      ...options
    });
  }
}

/**
 * File System Service
 */
export class FileSystemService {
  constructor(bridge, logger) {
    this.bridge = bridge;
    this.logger = logger;
  }

  async listDirectory(path) {
    this.logger.info(`Listing directory: ${path}`);
    return this.bridge.call('list_directory', { path });
  }

  async createDirectory(path) {
    this.logger.info(`Creating directory: ${path}`);
    return this.bridge.call('create_directory', { path });
  }
}

/**
 * Process Service
 */
export class ProcessService {
  constructor(bridge, logger) {
    this.bridge = bridge;
    this.logger = logger;
  }

  async getProcesses() {
    this.logger.info('Fetching processes');
    const result = await this.bridge.call('get_processes');
    return result.success ? result.data : [];
  }
}

/**
 * Configuration Service
 */
export class ConfigService {
  constructor(logger) {
    this.logger = logger;
    this.config = {
      appName: 'Rust WebUI Application',
      version: '1.0.0',
      theme: 'dark'
    };
  }

  get(key) {
    return this.config[key];
  }

  set(key, value) {
    this.config[key] = value;
    this.logger.info(`Config updated: ${key} = ${value}`);
  }

  getAll() {
    return { ...this.config };
  }
}

/**
 * Initialize and configure all services
 */
export function initializeServices() {
  const collection = new ServiceCollection();

  // Register Logger as singleton (shared everywhere)
  collection.addSingleton('logger', LoggerService);

  // Register WebUI Bridge as singleton
  collection.addSingleton('webui', WebUIBridgeService, ['logger']);

  // Register Config as singleton
  collection.addSingleton('config', ConfigService, ['logger']);

  // Register Database Service as scoped
  collection.addScoped('database', DatabaseService, ['webui', 'logger']);

  // Register System Info Service as scoped
  collection.addScoped('systemInfo', SystemInfoService, ['webui', 'logger']);

  // Register Notification Service as scoped
  collection.addScoped('notifications', NotificationService, ['webui', 'logger']);

  // Register File System Service as scoped
  collection.addScoped('filesystem', FileSystemService, ['webui', 'logger']);

  // Register Process Service as scoped
  collection.addScoped('processes', ProcessService, ['webui', 'logger']);

  const provider = collection.build();
  initGlobalProvider(provider);

  return provider;
}

// Export all services
export const Services = {
  LoggerService,
  WebUIBridgeService,
  DatabaseService,
  SystemInfoService,
  NotificationService,
  FileSystemService,
  ProcessService,
  ConfigService
};

export default Services;
