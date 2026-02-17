// frontend/src/core/plugin/base-viewmodel.ts
// Base ViewModel class

import type { ViewModel, ViewModelState } from './types';
import type { Result } from '../result';

export abstract class BaseViewModel implements ViewModel {
  abstract readonly name: string;
  protected state: ViewModelState = 'initial';
  private subscribers: Set<(event: string, data: unknown) => void> = new Set();

  getState(): ViewModelState {
    return this.state;
  }

  setState(newState: ViewModelState): void {
    this.state = newState;
    this.notify('stateChanged', newState);
  }

  abstract handleCommand(command: string, payload: unknown): Promise<Result<unknown, Error>>;
  abstract handleQuery(query: string, params?: Record<string, unknown>): Promise<Result<unknown, Error>>;

  subscribe(callback: (event: string, data: unknown) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  protected notify(event: string, data: unknown): void {
    this.subscribers.forEach(callback => {
      try {
        callback(event, data);
      } catch (e) {
        console.error(`ViewModel ${this.name} subscriber error:`, e);
      }
    });
  }

  async destroy(): Promise<Result<void, Error>> {
    this.subscribers.clear();
    this.setState('initial');
    return { ok: true, value: undefined };
  }
}
