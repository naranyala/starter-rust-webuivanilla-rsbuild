// frontend/src/app/index.ts
// Application module - orchestrates core and plugins

export * from './types';
export * from './components';
export { BackendBridge } from './backend-bridge';

import { pluginRegistry } from '../core/plugin';
import { userPlugin } from '../plugins';
import type { Result } from '../core/result';
import { ok, err, map } from '../core/result';

export async function initializePlugins(): Promise<Result<void, Error>> {
  console.log('Initializing plugins...');
  
  // Register plugins
  const registerResult = pluginRegistry.register(userPlugin);
  if (!registerResult.ok) {
    return err(registerResult.error);
  }
  
  // Initialize all plugins
  const initResult = await userPlugin.initialize();
  if (!initResult.ok) {
    return err(initResult.error);
  }
  
  console.log(`Initialized ${pluginRegistry.list().length} plugins`);
  return ok(undefined);
}

export { pluginRegistry } from '../core/plugin';
