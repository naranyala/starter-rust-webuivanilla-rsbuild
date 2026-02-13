// di.js - Dependency Injection Container for Frontend

/**
 * Service Lifetime Types
 */
export const ServiceLifetime = {
  Singleton: 'singleton',  // One instance for the entire app
  Scoped: 'scoped',        // One instance per scope (e.g., component tree)
  Transient: 'transient'   // New instance every time
};

/**
 * Service Descriptor
 */
class ServiceDescriptor {
  constructor(name, lifetime, factory, instance = null) {
    this.name = name;
    this.lifetime = lifetime;
    this.factory = factory;
    this.instance = instance;
    this.dependencies = [];
  }
}

/**
 * Service Collection - For registering services
 */
export class ServiceCollection {
  constructor() {
    this.descriptors = new Map();
  }

  /**
   * Register a service
   * @param {string} name - Service name
   * @param {string} lifetime - ServiceLifetime value
   * @param {Function} factory - Factory function or class constructor
   * @param {Array} dependencies - Array of dependency names
   */
  add(name, lifetime, factory, dependencies = []) {
    const descriptor = new ServiceDescriptor(name, lifetime, factory);
    descriptor.dependencies = dependencies;
    this.descriptors.set(name, descriptor);
    return this;
  }

  /**
   * Register a singleton service
   */
  addSingleton(name, factory, dependencies = []) {
    return this.add(name, ServiceLifetime.Singleton, factory, dependencies);
  }

  /**
   * Register a transient service
   */
  addTransient(name, factory, dependencies = []) {
    return this.add(name, ServiceLifetime.Transient, factory, dependencies);
  }

  /**
   * Register a scoped service
   */
  addScoped(name, factory, dependencies = []) {
    return this.add(name, ServiceLifetime.Scoped, factory, dependencies);
  }

  /**
   * Register a singleton instance directly
   */
  addSingletonInstance(name, instance) {
    const descriptor = new ServiceDescriptor(name, ServiceLifetime.Singleton, null, instance);
    descriptor.instance = instance;
    this.descriptors.set(name, descriptor);
    return this;
  }

  /**
   * Build the service provider
   */
  build() {
    return new ServiceProvider(this.descriptors);
  }
}

/**
 * Service Provider - For resolving services
 */
export class ServiceProvider {
  constructor(descriptors) {
    this.descriptors = new Map(descriptors);
    this.singletons = new Map();
    this.scopedInstances = new Map();
  }

  /**
   * Get a service by name
   */
  get(name) {
    const descriptor = this.descriptors.get(name);
    if (!descriptor) {
      throw new Error(`Service '${name}' not registered`);
    }

    switch (descriptor.lifetime) {
      case ServiceLifetime.Singleton:
        return this._getSingleton(descriptor);
      case ServiceLifetime.Transient:
        return this._createInstance(descriptor);
      case ServiceLifetime.Scoped:
        return this._getScoped(descriptor);
      default:
        throw new Error(`Unknown lifetime: ${descriptor.lifetime}`);
    }
  }

  /**
   * Get a service or return null if not found
   */
  tryGet(name) {
    try {
      return this.get(name);
    } catch {
      return null;
    }
  }

  /**
   * Check if a service is registered
   */
  isRegistered(name) {
    return this.descriptors.has(name);
  }

  /**
   * Create a new scope
   */
  createScope() {
    const scopeId = Math.random().toString(36).substring(7);
    return new ServiceScope(this, scopeId);
  }

  /**
   * Get singleton instance
   */
  _getSingleton(descriptor) {
    if (!this.singletons.has(descriptor.name)) {
      const instance = this._createInstance(descriptor);
      this.singletons.set(descriptor.name, instance);
    }
    return this.singletons.get(descriptor.name);
  }

  /**
   * Get scoped instance
   */
  _getScoped(descriptor) {
    // For now, treat scoped like singleton in the root provider
    // In a real implementation, this would check the current scope
    return this._getSingleton(descriptor);
  }

  /**
   * Create a new instance with dependency injection
   */
  _createInstance(descriptor) {
    // Resolve dependencies
    const dependencies = descriptor.dependencies.map(depName => this.get(depName));

    // Create instance
    if (typeof descriptor.factory === 'function') {
      // Check if it's a class constructor
      if (descriptor.factory.prototype && descriptor.factory.prototype.constructor) {
        return new descriptor.factory(...dependencies);
      } else {
        // It's a factory function
        return descriptor.factory(...dependencies);
      }
    }

    throw new Error(`Invalid factory for service '${descriptor.name}'`);
  }
}

/**
 * Service Scope - For managing scoped services
 */
export class ServiceScope {
  constructor(parentProvider, scopeId) {
    this.provider = parentProvider;
    this.scopeId = scopeId;
    this.scopedInstances = new Map();
  }

  /**
   * Get a service from this scope
   */
  get(name) {
    const descriptor = this.provider.descriptors.get(name);
    if (!descriptor) {
      throw new Error(`Service '${name}' not registered`);
    }

    if (descriptor.lifetime === ServiceLifetime.Scoped) {
      if (!this.scopedInstances.has(name)) {
        const instance = this.provider._createInstance(descriptor);
        this.scopedInstances.set(name, instance);
      }
      return this.scopedInstances.get(name);
    }

    // For non-scoped, delegate to parent
    return this.provider.get(name);
  }

  /**
   * Dispose of this scope
   */
  dispose() {
    // Clean up scoped instances if they have dispose methods
    for (const [name, instance] of this.scopedInstances) {
      if (instance && typeof instance.dispose === 'function') {
        instance.dispose();
      }
    }
    this.scopedInstances.clear();
  }
}

/**
 * Global service provider instance
 */
let globalProvider = null;

/**
 * Initialize the global service provider
 */
export function initGlobalProvider(provider) {
  globalProvider = provider;
}

/**
 * Get the global service provider
 */
export function getGlobalProvider() {
  if (!globalProvider) {
    throw new Error('Global provider not initialized. Call initGlobalProvider() first.');
  }
  return globalProvider;
}

/**
 * Get a service from the global provider
 */
export function getService(name) {
  return getGlobalProvider().get(name);
}

/**
 * Vue 3 Plugin for DI
 */
export const DIPlugin = {
  install(app, options = {}) {
    const provider = options.provider || getGlobalProvider();
    
    // Provide the service provider to all components
    app.provide('serviceProvider', provider);
    
    // Add global property for composition API
    app.config.globalProperties.$services = provider;
    
    // Add mixin for options API
    app.mixin({
      beforeCreate() {
        // Inject service provider if available
        const serviceProvider = this.$.provides?.serviceProvider;
        if (serviceProvider) {
          this.$serviceProvider = serviceProvider;
        }
      }
    });
  }
};

/**
 * Composable for Vue 3 Composition API
 */
export function useServices() {
  // This would use Vue's inject in a real Vue app
  // For now, return the global provider
  return {
    get: (name) => getGlobalProvider().get(name),
    tryGet: (name) => getGlobalProvider().tryGet(name),
    isRegistered: (name) => getGlobalProvider().isRegistered(name)
  };
}

/**
 * Decorator for injecting services into Vue components (Options API)
 */
export function Inject(serviceName) {
  return function(target, propertyKey) {
    if (!target._injections) {
      target._injections = {};
    }
    target._injections[propertyKey] = serviceName;
  };
}

// Export default
export default {
  ServiceLifetime,
  ServiceCollection,
  ServiceProvider,
  ServiceScope,
  initGlobalProvider,
  getGlobalProvider,
  getService,
  DIPlugin,
  useServices,
  Inject
};
