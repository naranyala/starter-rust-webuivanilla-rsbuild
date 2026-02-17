// src/plugins/registry.rs
// Plugin registry for backend

use std::collections::HashMap;
use std::sync::{Arc, RwLock};

use super::plugin_trait::{Plugin, PluginError};

pub struct PluginRegistry {
    plugins: RwLock<HashMap<String, Arc<dyn Plugin>>>,
}

impl PluginRegistry {
    pub fn new() -> Self {
        Self {
            plugins: RwLock::new(HashMap::new()),
        }
    }

    pub fn register(&self, plugin: Arc<dyn Plugin>) -> Result<(), PluginError> {
        let name = plugin.name().to_string();

        {
            let plugins = self.plugins.read().unwrap();
            if plugins.contains_key(&name) {
                return Err(PluginError::AlreadyLoaded(name));
            }
        }

        plugin
            .initialize()
            .map_err(|e| PluginError::InitializationFailed(e.to_string()))?;

        let mut plugins = self.plugins.write().unwrap();
        plugins.insert(name, plugin);

        Ok(())
    }

    pub fn unregister(&self, name: &str) -> Result<(), PluginError> {
        let plugin = {
            let mut plugins = self.plugins.write().unwrap();
            plugins.remove(name)
        };

        if let Some(p) = plugin {
            p.shutdown()
                .map_err(|e| PluginError::ExecutionFailed(e.to_string()))?;
            Ok(())
        } else {
            Err(PluginError::NotFound(name.to_string()))
        }
    }

    pub fn get(&self, name: &str) -> Option<Arc<dyn Plugin>> {
        let plugins = self.plugins.read().unwrap();
        plugins.get(name).cloned()
    }

    pub fn list(&self) -> Vec<String> {
        let plugins = self.plugins.read().unwrap();
        plugins.keys().cloned().collect()
    }

    pub fn len(&self) -> usize {
        let plugins = self.plugins.read().unwrap();
        plugins.len()
    }
}

impl Default for PluginRegistry {
    fn default() -> Self {
        Self::new()
    }
}
