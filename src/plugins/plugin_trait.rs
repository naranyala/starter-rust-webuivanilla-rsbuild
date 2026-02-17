// src/plugins/trait.rs
// Plugin trait definition for backend

use std::any::Any;

pub trait Plugin: Send + Sync {
    fn name(&self) -> &str;
    fn version(&self) -> &str;
    fn initialize(&self) -> Result<(), PluginError>;
    fn shutdown(&self) -> Result<(), PluginError>;
    fn as_any(&self) -> &dyn Any;
}

pub trait CommandPlugin: Plugin {
    fn execute(&self, command: &str, args: &[String]) -> Result<String, PluginError>;
}

pub trait QueryPlugin: Plugin {
    fn query(&self, query: &str, params: &[String]) -> Result<String, PluginError>;
}

pub trait EventHandlerPlugin: Plugin {
    fn on_event(&self, event: &str, payload: &str) -> Result<(), PluginError>;
}

#[derive(Debug, Clone)]
pub enum PluginError {
    InitializationFailed(String),
    ExecutionFailed(String),
    NotFound(String),
    AlreadyLoaded(String),
}

impl std::fmt::Display for PluginError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PluginError::InitializationFailed(msg) => write!(f, "Initialization failed: {}", msg),
            PluginError::ExecutionFailed(msg) => write!(f, "Execution failed: {}", msg),
            PluginError::NotFound(msg) => write!(f, "Not found: {}", msg),
            PluginError::AlreadyLoaded(msg) => write!(f, "Already loaded: {}", msg),
        }
    }
}

impl std::error::Error for PluginError {}
