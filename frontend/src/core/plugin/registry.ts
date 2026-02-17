// frontend/src/core/plugin/registry.ts
// Plugin registry implementation

import type { Plugin, PluginRegistry } from './types';
import { ok, err, Result } from '../result';
import { AppError } from '../result';

class PluginRegistryImpl implements PluginRegistry {
  private plugins: Map<string, Plugin> = new Map();

  register(plugin: Plugin): Result<void, Error> {
    if (this.plugins.has(plugin.name)) {
      return err(AppError.validation(`Plugin ${plugin.name} is already registered`));
    }
    
    this.plugins.set(plugin.name, plugin);
    console.log(`Plugin registered: ${plugin.name} v${plugin.version}`);
    return ok(undefined);
  }

  unregister(name: string): Result<void, Error> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      return err(AppError.notFound(`Plugin ${name} not found`));
    }
    
    this.plugins.delete(name);
    console.log(`Plugin unregistered: ${name}`);
    return ok(undefined);
  }

  get<T extends Plugin>(name: string): T | undefined {
    return this.plugins.get(name) as T | undefined;
  }

  list(): string[] {
    return Array.from(this.plugins.keys());
  }

  clear(): void {
    this.plugins.clear();
  }
}

export const pluginRegistry = new PluginRegistryImpl();
export default pluginRegistry;
