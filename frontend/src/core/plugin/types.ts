// frontend/src/core/plugin/types.ts
// Plugin types for frontend

import type { Result } from '../result';

export interface Plugin {
  name: string;
  version: string;
  initialize(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
}

export interface ViewModelPlugin extends Plugin {
  viewModel: ViewModel;
}

export interface ComponentPlugin extends Plugin {
  component: string;
  render(props?: Record<string, unknown>): string;
}

export interface CommandHandler {
  execute(command: string, payload: unknown): Promise<Result<unknown, Error>>;
}

export interface QueryHandler {
  query(query: string, params?: Record<string, unknown>): Promise<Result<unknown, Error>>;
}

export interface ViewModel {
  name: string;
  state: ViewModelState;
  handleCommand(command: string, payload: unknown): Promise<Result<unknown, Error>>;
  handleQuery(query: string, params?: Record<string, unknown>): Promise<Result<unknown, Error>>;
  subscribe(callback: (event: string, data: unknown) => void): () => void;
}

export type ViewModelState = 'initial' | 'loading' | 'ready' | 'error' | 'busy';

export interface PluginRegistry {
  register(plugin: Plugin): Result<void, Error>;
  unregister(name: string): Result<void, Error>;
  get<T extends Plugin>(name: string): T | undefined;
  list(): string[];
  clear(): void;
}
