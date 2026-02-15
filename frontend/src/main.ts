import 'winbox/dist/css/winbox.min.css';

// Import the App class
import { App } from './mvvm/view';
import { logger, consoleX, LogLevel, errorModal, setContentSecurityPolicy } from './mvvm/shared';

// Configure CSP in production
if (!import.meta.env.DEV) {
  setContentSecurityPolicy();
}

// Configure logger based on environment
logger.setLevel(import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO);

consoleX.title('Vanilla TypeScript Application');
consoleX.info('Starting application...');
consoleX.dim(`Environment: ${import.meta.env.MODE}`);
consoleX.dim(`Timestamp: ${new Date().toISOString()}`);

try {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    initializeApp();
  }
} catch (error) {
  consoleX.error('Fatal error', (error as Error).message);
  logger.error('Application initialization failed', { error: (error as Error).message });
  errorModal.show({
    type: 'error',
    title: 'Application Failed to Start',
    message: 'An unexpected error occurred during application initialization.',
    details: (error as Error).message,
    stack: (error as Error).stack,
    actions: [
      {
        label: 'Reload',
        primary: true,
        onClick: () => window.location.reload(),
      },
      {
        label: 'View Details',
        onClick: () => {},
      },
    ],
  });
}

function initializeApp() {
  consoleX.step('Initializing application');
  
  const rootElement = document.getElementById('app');
  
  if (rootElement) {
    consoleX.info('Root element found');
    rootElement.innerHTML = '';
    
    const app = new App(rootElement);
    app.mount();
    
    consoleX.success('Application mounted');
    logger.info('Application started successfully', {
      userAgent: navigator.userAgent,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
    });
  } else {
    consoleX.error('Root element #app not found');
    logger.error('Failed to find root element');
    errorModal.show({
      type: 'error',
      title: 'Application Error',
      message: 'Root element #app not found in the document.',
      details: 'The application requires an element with id="app" to render.',
    });
  }
}

// Global error handlers
window.onerror = function(msg, url, lineNo, columnNo, error) {
  consoleX.error('Global error', `${msg} at ${url}:${lineNo}:${columnNo}`);
  logger.error('Unhandled error', { 
    message: msg, 
    url, 
    line: lineNo, 
    column: columnNo,
    stack: error?.stack 
  });
  
  errorModal.show({
    type: 'error',
    title: 'Unexpected Error',
    message: 'An unexpected error occurred in the application.',
    details: `${msg} at ${url}:${lineNo}:${columnNo}`,
    stack: error?.stack,
  });
  
  return false;
};

window.addEventListener('unhandledrejection', function(event) {
  consoleX.error('Unhandled rejection', event.reason);
  logger.error('Unhandled promise rejection', { reason: event.reason });
  
  errorModal.show({
    type: 'error',
    title: 'Unhandled Promise Rejection',
    message: 'A promise was rejected but not handled.',
    details: String(event.reason),
  });
});

window.addEventListener('unload', function() {
  logger.info('Application shutting down');
});
