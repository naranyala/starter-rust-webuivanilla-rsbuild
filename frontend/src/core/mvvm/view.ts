// frontend/src/core/mvvm/view.ts
// MVVM View base

import type { ViewModel } from '../plugin';

export interface View {
  mount(container: HTMLElement): void;
  unmount(): void;
  update(data: unknown): void;
}

export abstract class BaseView implements View {
  protected container: HTMLElement | null = null;
  protected viewModel: ViewModel | null = null;
  private unsubscribe: (() => void) | null = null;

  abstract render(): string;

  mount(container: HTMLElement): void {
    this.container = container;
    this.container.innerHTML = this.render();
    this.bindEvents();
  }

  unmount(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.container) {
      this.container.innerHTML = '';
      this.container = null;
    }
  }

  update(data: unknown): void {
    if (this.container) {
      this.container.innerHTML = this.render();
      this.bindEvents();
    }
  }

  setViewModel(vm: ViewModel): void {
    this.viewModel = vm;
    this.unsubscribe = vm.subscribe((event, data) => {
      this.onViewModelEvent(event, data);
    });
  }

  protected onViewModelEvent(event: string, data: unknown): void {
    console.log(`View ${this.constructor.name} received event:`, event, data);
  }

  protected bindEvents(): void {
    // Override in subclasses
  }

  protected getElement(selector: string): HTMLElement | null {
    return this.container?.querySelector(selector) ?? null;
  }

  protected getElements(selector: string): NodeListOf<HTMLElement> {
    return this.container?.querySelectorAll(selector) ?? new NodeList();
  }
}
