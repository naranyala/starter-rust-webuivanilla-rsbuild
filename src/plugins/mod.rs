// src/plugins/mod.rs
// Plugin system for backend

pub mod plugin_trait;
pub mod registry;

pub use plugin_trait::{Plugin, CommandPlugin, QueryPlugin, EventHandlerPlugin, PluginError};
pub use registry::PluginRegistry;

use std::sync::Arc;

pub type SharedPluginRegistry = Arc<PluginRegistry>;

pub fn create_plugin_registry() -> SharedPluginRegistry {
    Arc::new(PluginRegistry::new())
}
