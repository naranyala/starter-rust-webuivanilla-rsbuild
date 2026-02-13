<template>
  <div class="app">
    <!-- Left Sidebar for Window Management -->
    <aside class="sidebar">
      <!-- Home Button at Very Top -->
      <div class="home-button-container">
        <button @click="hideAllWindows" class="home-btn" title="Show Main View">
          <span class="home-icon">🏠</span>
          <span class="home-text">Home</span>
        </button>
      </div>

      <div class="sidebar-header">
        <h2>Windows</h2>
        <span class="window-count">{{ activeWindows.length }}</span>
      </div>

      <div class="window-list">
        <div
          v-for="window in activeWindows"
          :key="window.id"
          class="window-item"
          :class="{ minimized: window.minimized }"
          @click="toggleWindow(window)"
        >
          <div class="window-icon">📷</div>
          <div class="window-info">
            <span class="window-title">{{ window.title }}</span>
            <span class="window-status">{{ window.minimized ? 'Minimized' : 'Active' }}</span>
          </div>
          <button
            class="window-close"
            @click.stop="closeWindow(window)"
            title="Close window"
          >×</button>
        </div>

        <div v-if="activeWindows.length === 0" class="no-windows">
          No open windows
        </div>
      </div>

      <div class="sidebar-footer">
        <button @click="closeAllWindows" class="close-all-btn" v-if="activeWindows.length > 0">
          Close All
        </button>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="main-container">
      <header class="header">
        <h1>System Dashboard</h1>
      </header>

      <main class="main-content">
        <!-- Fuzzy Search Input -->
        <div class="search-container">
          <div class="search-wrapper">
            <span class="search-icon">🔍</span>
            <input 
              type="text" 
              v-model="searchQuery" 
              placeholder="Search features... (try 'system', 'database', 'hardware', 'stats')"
              class="search-input"
            />
            <button v-if="searchQuery" @click="searchQuery = ''" class="search-clear" title="Clear search">×</button>
          </div>
          <div class="search-results-info" v-if="searchQuery">
            Found {{ filteredCards.length }} of {{ cards.length }} features
          </div>
        </div>

        <section class="cards-section">
          <div class="cards-grid two-cards">
            <!-- System Info Card -->
            <div 
              v-for="card in filteredCards" 
              :key="card.id"
              class="card feature-card" 
              :class="{ 'card-hidden': searchQuery && filteredCards.length === 0 }"
              @click="openCardWindow(card.id)"
            >
              <div class="card-icon">{{ card.icon }}</div>
              <div class="card-content">
                <h3 class="card-title">{{ card.title }}</h3>
                <p class="card-description">
                  {{ card.description }}
                </p>
                <div class="card-tags">
                  <span v-for="tag in card.tags" :key="tag" class="tag">{{ tag }}</span>
                </div>
              </div>
            </div>

            <!-- No results message -->
            <div v-if="searchQuery && filteredCards.length === 0" class="no-results">
              <div class="no-results-icon">🔎</div>
              <p>No features found for "{{ searchQuery }}"</p>
              <button @click="searchQuery = ''" class="clear-search-btn">Clear Search</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import Logger from '../lib/logger.js';

interface WindowInfo {
  id: string;
  title: string;
  minimized: boolean;
  maximized?: boolean;
  winboxInstance: any;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

const activeWindows = ref<WindowInfo[]>([]);
const dbUsers = ref<User[]>([]);
const dbStats = ref({ users: 0, tables: [] as string[] });
const isLoadingUsers = ref(false);
const searchQuery = ref('');

// Card data for fuzzy search
const cards = [
  {
    id: 'system-info',
    title: 'System Information',
    description: 'View detailed system information including OS, memory, CPU, and runtime statistics.',
    icon: '💻',
    tags: ['Hardware', 'Stats'],
    searchTerms: 'system information hardware stats os memory cpu runtime'
  },
  {
    id: 'sqlite',
    title: 'SQLite Database',
    description: 'Interactive database viewer with sample data. Connects to backend SQLite integration.',
    icon: '🗄️',
    tags: ['Database', 'Mockup'],
    searchTerms: 'sqlite database mockup data viewer backend'
  }
];

// Fuzzy search filter
const filteredCards = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();
  if (!query) return cards;
  
  return cards.filter(card => {
    const searchText = `${card.title} ${card.description} ${card.tags.join(' ')} ${card.searchTerms}`.toLowerCase();
    return fuzzyMatch(query, searchText);
  });
});

// Simple fuzzy matching function
function fuzzyMatch(pattern: string, text: string): boolean {
  if (pattern.length === 0) return true;
  
  let patternIdx = 0;
  let textIdx = 0;
  
  while (patternIdx < pattern.length && textIdx < text.length) {
    if (pattern[patternIdx] === text[textIdx]) {
      patternIdx++;
    }
    textIdx++;
  }
  
  return patternIdx === pattern.length;
}

// Generate system info HTML
const generateSystemInfoHTML = () => {
  const now = new Date();
  return `
    <div style="padding: 20px; color: white; font-family: 'Segoe UI', sans-serif; max-height: 100%; overflow-y: auto;">
      <h2 style="margin-bottom: 20px; color: #4f46e5;">💻 System Information</h2>
      
      <div style="margin-bottom: 20px;">
        <h3 style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 10px;">Operating System</h3>
        <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #64748b;">Platform:</span>
            <span>${navigator.platform}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #64748b;">User Agent:</span>
            <span style="font-size: 0.8rem; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${navigator.userAgent}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">Language:</span>
            <span>${navigator.language}</span>
          </div>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 10px;">Display & Screen</h3>
        <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #64748b;">Screen Resolution:</span>
            <span>${screen.width} × ${screen.height}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #64748b;">Available Resolution:</span>
            <span>${screen.availWidth} × ${screen.availHeight}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #64748b;">Color Depth:</span>
            <span>${screen.colorDepth}-bit</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">Pixel Ratio:</span>
            <span>${window.devicePixelRatio}x</span>
          </div>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 10px;">Browser Information</h3>
        <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #64748b;">Online Status:</span>
            <span style="color: ${navigator.onLine ? '#10b981' : '#ef4444'}">${navigator.onLine ? '🟢 Online' : '🔴 Offline'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #64748b;">Cookies Enabled:</span>
            <span>${navigator.cookieEnabled ? 'Yes' : 'No'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #64748b;">Cores:</span>
            <span>${navigator.hardwareConcurrency || 'Unknown'}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">Memory:</span>
            <span>${navigator.deviceMemory || 'Unknown'} GB</span>
          </div>
        </div>
      </div>

      <div>
        <h3 style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 10px;">Current Time</h3>
        <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #64748b;">Local Time:</span>
            <span>${now.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #64748b;">Timezone:</span>
            <span>${Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">Timezone Offset:</span>
            <span>UTC${now.getTimezoneOffset() > 0 ? '-' : '+'}${Math.abs(now.getTimezoneOffset() / 60)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
};

// Generate SQLite demo HTML
const generateSQLiteHTML = (): string => {
  const users = dbUsers.value.length > 0 ? dbUsers.value : [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'Active' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'User', status: 'Inactive' },
    { id: 4, name: 'Alice Brown', email: 'alice@example.com', role: 'Editor', status: 'Active' },
    { id: 5, name: 'Charlie Wilson', email: 'charlie@example.com', role: 'User', status: 'Pending' },
  ];

  const rows = users.map((row: any) => `
    <tr style="border-bottom: 1px solid #334155;">
      <td style="padding: 10px; color: #e2e8f0;">${row.id}</td>
      <td style="padding: 10px; color: #e2e8f0;">${row.name}</td>
      <td style="padding: 10px; color: #94a3b8;">${row.email}</td>
      <td style="padding: 10px;"><span style="background: ${row.role === 'Admin' ? '#dc2626' : row.role === 'Editor' ? '#f59e0b' : '#3b82f6'}; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;">${row.role}</span></td>
      <td style="padding: 10px;"><span style="color: ${row.status === 'Active' ? '#10b981' : row.status === 'Inactive' ? '#ef4444' : '#f59e0b'}">● ${row.status}</span></td>
    </tr>
  `).join('');

  return `
    <div style="padding: 20px; color: white; font-family: 'Segoe UI', sans-serif; height: 100%; display: flex; flex-direction: column;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="color: #4f46e5;">🗄️ SQLite Database Viewer</h2>
        <span style="background: #10b981; padding: 5px 12px; border-radius: 20px; font-size: 0.8rem;">Live Data</span>
      </div>

      <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
          <input type="text" id="db-search" placeholder="Search records..." style="flex: 1; padding: 8px 12px; background: rgba(0,0,0,0.3); border: 1px solid #334155; border-radius: 6px; color: white; font-size: 0.9rem;">
          <button onclick="searchUsers()" style="padding: 8px 16px; background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">Search</button>
          <button onclick="refreshUsers()" style="padding: 8px 16px; background: #f59e0b; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">↻</button>
        </div>

        <div style="display: flex; gap: 15px; font-size: 0.8rem; color: #94a3b8;">
          <span>📊 Table: <strong style="color: white;">users</strong></span>
          <span>📋 Records: <strong style="color: white;">${users.length}</strong></span>
          <span>💾 Source: <strong style="color: white;">Rust SQLite</strong></span>
        </div>
      </div>

      <div style="flex: 1; overflow: auto; background: rgba(0,0,0,0.2); border-radius: 8px;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead style="background: rgba(255,255,255,0.1); position: sticky; top: 0;">
            <tr>
              <th style="padding: 12px 10px; text-align: left; color: #94a3b8; font-weight: 600; font-size: 0.85rem;">ID</th>
              <th style="padding: 12px 10px; text-align: left; color: #94a3b8; font-weight: 600; font-size: 0.85rem;">Name</th>
              <th style="padding: 12px 10px; text-align: left; color: #94a3b8; font-weight: 600; font-size: 0.85rem;">Email</th>
              <th style="padding: 12px 10px; text-align: left; color: #94a3b8; font-weight: 600; font-size: 0.85rem;">Role</th>
              <th style="padding: 12px 10px; text-align: left; color: #94a3b8; font-weight: 600; font-size: 0.85rem;">Status</th>
            </tr>
          </thead>
          <tbody id="users-table-body">
            ${rows}
          </tbody>
        </table>
      </div>

      <div style="margin-top: 15px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
        <span style="color: #64748b; font-size: 0.8rem;">Showing ${users.length} record${users.length !== 1 ? 's' : ''}</span>
        <div style="display: flex; gap: 5px;">
          <button style="padding: 5px 12px; background: rgba(255,255,255,0.1); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;" disabled>Previous</button>
          <button style="padding: 5px 12px; background: rgba(255,255,255,0.1); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;" disabled>Next</button>
        </div>
      </div>
    </div>
  `;
};

const openSystemInfoWindow = () => {
  openWindow('System Information', generateSystemInfoHTML(), '💻');
};

const openSQLiteWindow = () => {
  isLoadingUsers.value = true;
  Logger.info('Opening SQLite window, fetching users from backend...');

  // Fetch users from Rust backend
  if ((window as any).getUsers) {
    Logger.info('Calling Rust backend get_users function');
    (window as any).getUsers();
  } else {
    Logger.warn('Rust backend get_users not available');
    isLoadingUsers.value = false;
  }

  // Also fetch stats
  if ((window as any).getDbStats) {
    (window as any).getDbStats();
  }

  openWindow('SQLite Database', generateSQLiteHTML(), '🗄️');
};

// Handle card click based on card ID
const openCardWindow = (cardId: string) => {
  if (cardId === 'system-info') {
    openSystemInfoWindow();
  } else if (cardId === 'sqlite') {
    openSQLiteWindow();
  }
};

// Global function for refresh
(window as any).refreshUsers = () => {
  Logger.info('Refreshing users from database');
  isLoadingUsers.value = true;
  if ((window as any).getUsers) {
    (window as any).getUsers();
  }
};

// Global function for search
(window as any).searchUsers = () => {
  const searchInput = document.getElementById('db-search') as HTMLInputElement;
  const searchTerm = searchInput?.value.toLowerCase() || '';
  Logger.info('Searching users', { term: searchTerm });

  const tableBody = document.getElementById('users-table-body');
  if (tableBody) {
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach((row: any) => {
      const text = row.textContent?.toLowerCase() || '';
      row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
  }
};

// Function to update the SQLite window table with new data
const updateSQLiteTable = () => {
  const tableBody = document.getElementById('users-table-body');
  if (!tableBody || dbUsers.value.length === 0) return;

  const rows = dbUsers.value.map((row: User) => `
    <tr style="border-bottom: 1px solid #334155;">
      <td style="padding: 10px; color: #e2e8f0;">${row.id}</td>
      <td style="padding: 10px; color: #e2e8f0;">${row.name}</td>
      <td style="padding: 10px; color: #94a3b8;">${row.email}</td>
      <td style="padding: 10px;"><span style="background: ${row.role === 'Admin' ? '#dc2626' : row.role === 'Editor' ? '#f59e0b' : '#3b82f6'}; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;">${row.role}</span></td>
      <td style="padding: 10px;"><span style="color: ${row.status === 'Active' ? '#10b981' : row.status === 'Inactive' ? '#ef4444' : '#f59e0b'}">● ${row.status}</span></td>
    </tr>
  `).join('');

  tableBody.innerHTML = rows;
};

const openWindow = (title: string, content: string, icon: string) => {
  if (!window.WinBox) {
    Logger.error('WinBox is not loaded. Please ensure winbox.bundle.min.js is included via script tag.');
    return;
  }
  createWindow(title, content, icon);
};

const createWindow = (title: string, content: string, icon: string) => {
  // Check if window already exists
  const existingWindow = activeWindows.value.find(w => w.title === title);
  if (existingWindow) {
    if (existingWindow.minimized) {
      existingWindow.winboxInstance.restore();
      existingWindow.minimized = false;
    }
    existingWindow.winboxInstance.focus();
    return;
  }

  Logger.info('Opening window', { windowTitle: title });

  const windowId = 'win-' + Date.now();
  let winboxInstance: any;

  winboxInstance = new window.WinBox({
    title: title,
    background: '#1e293b',
    border: 4,
    // Initially respect sidebar width (200px)
    width: 'calc(100% - 200px)',
    height: '100%',
    x: '200px',
    y: '0',
    minwidth: '300px',
    minheight: '300px',
    // Enable maximize button
    max: true,
    // Show minimize button
    min: true,
    mount: document.createElement('div'),
    oncreate: function() {
      this.body.innerHTML = content;
    },
    onminimize: function() {
      const windowInfo = activeWindows.value.find(w => w.id === windowId);
      if (windowInfo) {
        windowInfo.minimized = true;
      }
    },
    onrestore: function() {
      const windowInfo = activeWindows.value.find(w => w.id === windowId);
      if (windowInfo) {
        windowInfo.minimized = false;
        windowInfo.maximized = false;
      }
    },
    onmaximize: function() {
      // When maximizing, ensure the window respects the sidebar width
      // Calculate available space considering the sidebar
      const availableWidth = window.innerWidth - 200; // Subtract sidebar width
      const availableHeight = window.innerHeight;
      
      // Set the window dimensions to fit in the available space
      this.resize(availableWidth, availableHeight);
      this.move(200, 0); // Position to start after the sidebar
      
      const windowInfo = activeWindows.value.find(w => w.id === windowId);
      if (windowInfo) {
        windowInfo.maximized = true;
      }
    },
    onclose: function() {
      // Remove from active windows when closed
      const index = activeWindows.value.findIndex(w => w.id === windowId);
      if (index > -1) {
        activeWindows.value.splice(index, 1);
      }
    }
  });

  // Track the window
  const windowInfo = {
    id: windowId,
    title: title,
    minimized: false,
    maximized: false,
    winboxInstance: winboxInstance
  };
  activeWindows.value.push(windowInfo);
};

const toggleWindow = (windowInfo: WindowInfo) => {
  if (windowInfo.minimized) {
    windowInfo.winboxInstance.restore();
    windowInfo.minimized = false;
  } else if (windowInfo.maximized) {
    windowInfo.winboxInstance.restore();
    windowInfo.maximized = false;
  } else {
    windowInfo.winboxInstance.minimize();
    windowInfo.minimized = true;
  }
};

const closeWindow = (windowInfo: WindowInfo) => {
  windowInfo.winboxInstance.close();
  const index = activeWindows.value.findIndex(w => w.id === windowInfo.id);
  if (index > -1) {
    activeWindows.value.splice(index, 1);
  }
};

const closeAllWindows = () => {
  activeWindows.value.forEach(windowInfo => {
    windowInfo.winboxInstance.close();
  });
  activeWindows.value = [];
};

// Hide/minimize all windows to show main view
const hideAllWindows = () => {
  activeWindows.value.forEach(windowInfo => {
    if (!windowInfo.minimized) {
      windowInfo.winboxInstance.minimize();
      windowInfo.minimized = true;
      windowInfo.maximized = false;
    }
  });
  Logger.info('All windows minimized - showing main view');
};

// Set up reactive updates for logs
onMounted(() => {
  Logger.info('Application initialized');

  // Add event listener for database responses
  window.addEventListener('db_response', ((event: CustomEvent) => {
    const response = event.detail;
    if (response.success) {
      dbUsers.value = response.data || [];
      Logger.info('Users loaded from database', { count: dbUsers.value.length });
      updateSQLiteTable();
    } else {
      Logger.error('Failed to load users', { error: response.error });
    }
    isLoadingUsers.value = false;
  }) as EventListener);

  // Add event listener for stats responses
  window.addEventListener('stats_response', ((event: CustomEvent) => {
    const response = event.detail;
    if (response.success) {
      dbStats.value = response.stats;
      Logger.info('Database stats loaded', response.stats);
    }
  }) as EventListener);

  // Add a global resize handler to adjust maximized windows when the browser resizes
  window.addEventListener('resize', handleWindowResize);
});

// Clean up event listeners when component is unmounted
onUnmounted(() => {
  window.removeEventListener('resize', handleWindowResize);
});

// Handle window resize to adjust maximized windows to respect sidebar
const handleWindowResize = () => {
  activeWindows.value.forEach(windowInfo => {
    if (windowInfo.maximized && !windowInfo.minimized) {
      // If the window is maximized, adjust its size to respect the sidebar
      const availableWidth = window.innerWidth - 200; // Subtract sidebar width (same as CSS)
      const availableHeight = window.innerHeight;
      
      windowInfo.winboxInstance.resize(availableWidth, availableHeight);
      windowInfo.winboxInstance.move(200, 0); // Position to start after the sidebar
    }
  });
};
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f5f7fa;
  color: #333;
  font-size: 14px;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: row;
}

/* Sidebar Styles */
.sidebar {
  width: 200px;
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  color: white;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #334155;
}

/* Home Button */
.home-button-container {
  padding: 0.75rem;
  background: rgba(79, 70, 229, 0.2);
  border-bottom: 1px solid #334155;
}

.home-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.home-btn:hover {
  background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.4);
}

.home-icon {
  font-size: 1rem;
}

.home-text {
  font-size: 0.85rem;
}

.sidebar-header {
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid #334155;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header h2 {
  font-size: 0.9rem;
  font-weight: 600;
}

.window-count {
  background: #4f46e5;
  color: white;
  padding: 0.15rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.window-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.window-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  margin-bottom: 0.25rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.window-item:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: #4f46e5;
}

.window-item.minimized {
  opacity: 0.6;
  background: rgba(255, 255, 255, 0.02);
}

.window-icon {
  font-size: 1rem;
}

.window-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.window-title {
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.window-status {
  font-size: 0.65rem;
  color: #94a3b8;
}

.window-close {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0.15rem;
  line-height: 1;
  border-radius: 3px;
  transition: all 0.2s ease;
}

.window-close:hover {
  background: #dc3545;
  color: white;
}

.no-windows {
  text-align: center;
  padding: 1rem;
  color: #64748b;
  font-size: 0.8rem;
  font-style: italic;
}

.sidebar-footer {
  padding: 0.75rem;
  border-top: 1px solid #334155;
}

.close-all-btn {
  width: 100%;
  padding: 0.5rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.2s ease;
}

.close-all-btn:hover {
  background: #c82333;
}

/* Main Container */
.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  color: white;
  padding: 0.5rem 1rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.header h1 {
  font-size: 1.2rem;
  font-weight: 600;
}

.main-content {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
}

.cards-section {
  margin-bottom: 1rem;
}

/* Search Container Styles */
.search-container {
  margin-bottom: 1.5rem;
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  max-width: 600px;
  margin: 0 auto;
}

.search-icon {
  position: absolute;
  left: 16px;
  font-size: 1.1rem;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 14px 40px 14px 45px;
  font-size: 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  background: white;
  color: #1e293b;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.search-input:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 4px 16px rgba(79, 70, 229, 0.2);
}

.search-input::placeholder {
  color: #94a3b8;
}

.search-clear {
  position: absolute;
  right: 12px;
  background: #e2e8f0;
  border: none;
  color: #64748b;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.search-clear:hover {
  background: #cbd5e1;
  color: #1e293b;
}

.search-results-info {
  text-align: center;
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: #64748b;
}

.no-results {
  grid-column: 1 / -1;
  text-align: center;
  padding: 3rem;
  color: #64748b;
}

.no-results-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.no-results p {
  margin-bottom: 1rem;
  font-size: 1rem;
}

.clear-search-btn {
  padding: 10px 20px;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.clear-search-btn:hover {
  background: #4338ca;
}

.card-hidden {
  display: none;
}

.cards-grid {
  display: grid;
  gap: 1.5rem;
}

.cards-grid.two-cards {
  grid-template-columns: repeat(2, 1fr);
  max-width: 800px;
  margin: 0 auto;
}

.feature-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  min-height: 200px;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.1);
}

.card-icon {
  font-size: 3rem;
  text-align: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ec 100%);
}

.card-content {
  padding: 1.25rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.card-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #1e293b;
}

.card-description {
  font-size: 0.85rem;
  color: #64748b;
  margin-bottom: 1rem;
  line-height: 1.5;
  flex: 1;
}

.card-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tag {
  background: #e0e7ff;
  color: #4f46e5;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
}

/* Hide only the bottom minimize bar/dock, NOT the minimize button in window controls */
/* The bottom bar appears when windows are minimized to the bottom */
.wb-dock,
.wb-taskbar,
.winbox-dock,
.winbox-taskbar,
.winbox-dock-container,
.wb-dock-container,
.winbox.minimized ~ .wb-dock,
.winbox.min ~ .wb-dock,
.winbox.minimized ~ .wb-taskbar,
.winbox.min ~ .wb-taskbar {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  height: 0 !important;
  width: 0 !important;
  position: absolute !important;
  bottom: -9999px !important;
}

/* When window is minimized, hide it completely (don't show at bottom) */
.winbox.min,
.winbox.minimized {
  opacity: 0 !important;
  pointer-events: none !important;
  top: -9999px !important;
  left: -9999px !important;
}

/* Responsive */
@media (max-width: 768px) {
  .app {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    max-height: 150px;
  }

  .window-list {
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    overflow-x: auto;
    padding: 0.5rem;
  }

  .window-item {
    min-width: 150px;
    margin-bottom: 0;
  }

  .cards-grid.two-cards {
    grid-template-columns: 1fr;
  }
}
</style>
