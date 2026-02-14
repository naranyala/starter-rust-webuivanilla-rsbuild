// frontend/src/lib/event-bus.ts

export type EventHandler<T = unknown> = (event: T) => void;

export interface EventSubscription {
  id: string;
  event: string;
  handler: EventHandler;
  priority: number;
  once: boolean;
}

export interface EventBusConfig {
  enableLogging: boolean;
  enableHistory: boolean;
  maxHistorySize: number;
}

export interface EventHistoryEntry {
  id: string;
  event: string;
  data: unknown;
  timestamp: Date;
  handlerId?: string;
}

export interface EventBusMetrics {
  eventsPublished: number;
  eventsHandled: number;
  subscriptions: number;
  lastEvent?: string;
}

class EventBus {
  private subscriptions: Map<string, EventSubscription[]> = new Map();
  private history: EventHistoryEntry[] = [];
  private config: EventBusConfig;
  private subscriptionIdCounter = 0;
  private metrics: EventBusMetrics = {
    eventsPublished: 0,
    eventsHandled: 0,
    subscriptions: 0,
  };

  constructor(config: Partial<EventBusConfig> = {}) {
    this.config = {
      enableLogging: config.enableLogging ?? false,
      enableHistory: config.enableHistory ?? true,
      maxHistorySize: config.maxHistorySize ?? 500,
    };
  }

  private generateId(): string {
    return `sub_${++this.subscriptionIdCounter}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addToHistory(event: string, data: unknown, handlerId?: string): void {
    if (!this.config.enableHistory) return;

    this.history.push({
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      event,
      data,
      timestamp: new Date(),
      handlerId,
    });

    if (this.history.length > this.config.maxHistorySize) {
      this.history = this.history.slice(-this.config.maxHistorySize);
    }
  }

  private log(event: string, data?: unknown, action: string = 'emit'): void {
    if (!this.config.enableLogging) return;
    
    const color = action === 'emit' ? '\x1b[36m' : '\x1b[35m';
    const prefix = action === 'emit' ? '[EVENT]' : '[HANDLER]';
    console.log(`${color}${prefix}${'\x1b[0m'} ${event}`, data ?? '');
  }

  on<T = unknown>(event: string, handler: EventHandler<T>, priority: number = 0): string {
    const id = this.generateId();
    
    const subscription: EventSubscription = {
      id,
      event,
      handler: handler as EventHandler,
      priority,
      once: false,
    };

    const existing = this.subscriptions.get(event) || [];
    existing.push(subscription);
    existing.sort((a, b) => b.priority - a.priority);
    this.subscriptions.set(event, existing);

    this.metrics.subscriptions = this.countSubscriptions();

    if (this.config.enableLogging) {
      console.log(`[BUS] Subscribed to '${event}' (id: ${id}, priority: ${priority})`);
    }

    return id;
  }

  once<T = unknown>(event: string, handler: EventHandler<T>, priority: number = 0): string {
    const id = this.generateId();
    
    const subscription: EventSubscription = {
      id,
      event,
      handler: handler as EventHandler,
      priority,
      once: true,
    };

    const existing = this.subscriptions.get(event) || [];
    existing.push(subscription);
    existing.sort((a, b) => b.priority - a.priority);
    this.subscriptions.set(event, existing);

    this.metrics.subscriptions = this.countSubscriptions();

    if (this.config.enableLogging) {
      console.log(`[BUS] One-time subscription to '${event}' (id: ${id})`);
    }

    return id;
  }

  off(eventOrId?: string, handlerId?: string): void {
    if (eventOrId && handlerId) {
      const subs = this.subscriptions.get(eventOrId);
      if (subs) {
        const index = subs.findIndex(s => s.id === handlerId);
        if (index !== -1) {
          subs.splice(index, 1);
          if (this.config.enableLogging) {
            console.log(`[BUS] Unsubscribed '${eventOrId}' (id: ${handlerId})`);
          }
        }
        if (subs.length === 0) {
          this.subscriptions.delete(eventOrId);
        }
      }
    } else if (eventOrId) {
      const count = this.subscriptions.get(eventOrId)?.length ?? 0;
      this.subscriptions.delete(eventOrId);
      if (this.config.enableLogging) {
        console.log(`[BUS] Unsubscribed all from '${eventOrId}' (${count} handlers)`);
      }
    } else {
      const total = this.countSubscriptions();
      this.subscriptions.clear();
      if (this.config.enableLogging) {
        console.log(`[BUS] Unsubscribed all events (${total} handlers)`);
      }
    }

    this.metrics.subscriptions = this.countSubscriptions();
  }

  emit<T = unknown>(event: string, data?: T): void {
    this.metrics.eventsPublished++;
    this.metrics.lastEvent = event;

    this.log(event, data, 'emit');
    this.addToHistory(event, data);

    const subs = this.subscriptions.get(event);
    if (!subs || subs.length === 0) {
      if (this.config.enableLogging) {
        console.log(`[BUS] No handlers for '${event}'`);
      }
      return;
    }

    const toRemove: string[] = [];

    for (const sub of subs) {
      try {
        sub.handler(data);
        this.metrics.eventsHandled++;
        this.addToHistory(event, data, sub.id);
        
        if (sub.once) {
          toRemove.push(sub.id);
        }
      } catch (error) {
        console.error(`[BUS] Handler error for '${event}' (id: ${sub.id}):`, error);
      }
    }

    for (const id of toRemove) {
      this.off(event, id);
    }
  }

  emitAsync<T = unknown>(event: string, data?: T): Promise<void> {
    return new Promise((resolve) => {
      const subs = this.subscriptions.get(event);
      
      if (!subs || subs.length === 0) {
        resolve();
        return;
      }

      const promises = subs.map(sub => {
        try {
          const result = sub.handler(data);
          this.metrics.eventsHandled++;
          this.addToHistory(event, data, sub.id);
          
          if (sub.once) {
            this.off(event, sub.id);
          }
          
          return result instanceof Promise ? result : Promise.resolve();
        } catch (error) {
          console.error(`[BUS] Handler error for '${event}' (id: ${sub.id}):`, error);
          return Promise.resolve();
        }
      });

      Promise.all(promises).then(() => resolve());
    });
  }

  waitFor<T = unknown>(event: string, timeout: number = 5000): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off(event, subscriptionId);
        reject(new Error(`Timeout waiting for event: ${event}`));
      }, timeout);

      const subscriptionId = this.once<T>(event, (data) => {
        clearTimeout(timer);
        resolve(data as T);
      });
    });
  }

  hasListeners(event: string): boolean {
    const subs = this.subscriptions.get(event);
    return !!subs && subs.length > 0;
  }

  listenerCount(event: string): number {
    return this.subscriptions.get(event)?.length ?? 0;
  }

  countSubscriptions(): number {
    let count = 0;
    for (const subs of this.subscriptions.values()) {
      count += subs.length;
    }
    return count;
  }

  getHistory(event?: string): EventHistoryEntry[] {
    if (event) {
      return this.history.filter(e => e.event === event);
    }
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
    if (this.config.enableLogging) {
      console.log('[BUS] Event history cleared');
    }
  }

  getMetrics(): EventBusMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      eventsPublished: 0,
      eventsHandled: 0,
      subscriptions: this.countSubscriptions(),
    };
  }

  getEvents(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  getSubscriptions(event?: string): EventSubscription[] {
    if (event) {
      return this.subscriptions.get(event) ?? [];
    }
    
    const all: EventSubscription[] = [];
    for (const subs of this.subscriptions.values()) {
      all.push(...subs);
    }
    return all;
  }
}

export const eventBus = new EventBus({
  enableLogging: import.meta.env.DEV,
  enableHistory: true,
  maxHistorySize: 500,
});

export default EventBus;
