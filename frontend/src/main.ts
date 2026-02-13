// Import the App class
import { App } from './App';

// Add error handling for debugging
console.log('=== Vanilla TypeScript Application Starting ===');
console.log('Current URL:', window.location.href);
console.log('Document readyState:', document.readyState);

try {
  // Initialize the application when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    // Document is already loaded, initialize immediately
    initializeApp();
  }
} catch (error) {
  console.error('Fatal error initializing application:', error);
  document.body.innerHTML = `<div style="padding: 20px; color: red;">Error: ${(error as Error).message}</div>`;
}

function initializeApp() {
  const rootElement = document.getElementById('app');
  console.log('Root element found:', rootElement);

  if (rootElement) {
    // Clear the root element
    rootElement.innerHTML = '';
    
    // Create and mount the app
    const app = new App(rootElement);
    app.mount();
    
    console.log('Vanilla TypeScript app mounted');
  } else {
    console.error('Root element #app not found!');
    document.body.innerHTML = '<div style="padding: 20px; color: red;">Error: Root element #app not found</div>';
  }
}

// Global error handler
window.onerror = function(msg, url, lineNo, columnNo, error) {
  console.error('Global error:', msg, 'at', url, lineNo, columnNo, error);
  return false;
};

window.addEventListener('unhandledrejection', function(event) {
  console.error('Unhandled promise rejection:', event.reason);
});