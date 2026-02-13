// main.ts - Application entry point
import './services.js';

// Initialize services and get logger
const provider = initializeServices();
const logger = provider.getService('logger');
logger.info('Application starting...');

// Export for use in components
export { provider, getService };

logger.info('Application initialized and ready');
