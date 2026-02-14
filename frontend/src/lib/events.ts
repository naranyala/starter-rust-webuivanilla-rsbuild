// frontend/src/lib/events.ts

export interface BaseEvent {
  type: string;
  timestamp: Date;
  payload?: unknown;
}

export interface UserEvent extends BaseEvent {
  type: 'user:created' | 'user:updated' | 'user:deleted' | 'user:selected';
  payload: {
    userId?: string;
    name?: string;
    email?: string;
  };
}

export interface UILifecycleEvent extends BaseEvent {
  type: 'app:ready' | 'app:loading' | 'app:error' | 'app:navigation';
  payload?: {
    route?: string;
    error?: string;
  };
}

export interface NotificationEvent extends BaseEvent {
  type: 'notification:info' | 'notification:success' | 'notification:warning' | 'notification:error';
  payload: {
    title: string;
    message: string;
    duration?: number;
  };
}

export interface DataEvent<T = unknown> extends BaseEvent {
  type: 'data:fetch' | 'data:fetched' | 'data:save' | 'data:saved' | 'data:delete' | 'data:deleted';
  payload: T;
}

export type AppEvent = UserEvent | UILifecycleEvent | NotificationEvent | DataEvent;

export const AppEvents = {
  User: {
    CREATED: 'user:created',
    UPDATED: 'user:updated',
    DELETED: 'user:deleted',
    SELECTED: 'user:selected',
  } as const,

  App: {
    READY: 'app:ready',
    LOADING: 'app:loading',
    ERROR: 'app:error',
    NAVIGATION: 'app:navigation',
  } as const,

  Notification: {
    INFO: 'notification:info',
    SUCCESS: 'notification:success',
    WARNING: 'notification:warning',
    ERROR: 'notification:error',
  } as const,

  Data: {
    FETCH: 'data:fetch',
    FETCHED: 'data:fetched',
    SAVE: 'data:save',
    SAVED: 'data:saved',
    DELETE: 'data:delete',
    DELETED: 'data:deleted',
  } as const,
};

export function createEvent<T>(type: string, payload?: T): BaseEvent & { payload: T } {
  return {
    type,
    timestamp: new Date(),
    payload,
  };
}

export function emitUserCreated(userId: string, name: string, email: string) {
  const { eventBus } = require('./event-bus');
  eventBus.emit(AppEvents.User.CREATED, {
    userId,
    name,
    email,
  });
}

export function emitNotification(type: 'info' | 'success' | 'warning' | 'error', title: string, message: string, duration = 3000) {
  const { eventBus } = require('./event-bus');
  eventBus.emit(`notification:${type}`, { title, message, duration });
}
