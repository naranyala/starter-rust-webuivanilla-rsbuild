// frontend/src/lib/index.ts
export { createLogger, logger, LogLevel } from './logger';
export type { LoggerConfig, LogEntry } from './logger';

export { consoleX } from './console';

export { eventBus } from './event-bus';
export type { EventSubscription, EventBusConfig, EventHistoryEntry, EventBusMetrics } from './event-bus';

export { AppEvents, createEvent, emitUserCreated, emitNotification } from './events';
export type { BaseEvent, UserEvent, UILifecycleEvent, NotificationEvent, DataEvent, AppEvent } from './events';

export { escapeHtml, escapeAttr, sanitizeUserInput, createSafeHtml, setContentSecurityPolicy, validateInput } from './security';

export { errorModal } from './error-modal';
export type { ErrorModalConfig, ErrorModalAction } from './error-modal';
