// src/core/mvvm/viewmodel.rs
// Base ViewModel for backend MVVM

use std::result::Result as StdResult;
use std::sync::Arc;

pub trait ViewModel: Send + Sync {
    fn name(&self) -> &str;
    fn state(&self) -> ViewModelState;
    fn handle_command(&self, command: &str, payload: &str) -> StdResult<String, ViewModelError>;
    fn handle_query(&self, query: &str, params: &[String]) -> StdResult<String, ViewModelError>;
}

#[derive(Debug, Clone, PartialEq)]
pub enum ViewModelState {
    Initial,
    Loading,
    Ready,
    Error(String),
    Busy,
}

impl Default for ViewModelState {
    fn default() -> Self {
        ViewModelState::Initial
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum ViewModelError {
    InvalidCommand(String),
    InvalidQuery(String),
    ExecutionFailed(String),
    NotFound(String),
    ValidationError(String),
    Unauthorized(String),
}

impl ViewModelError {
    pub fn invalid_command(msg: impl Into<String>) -> Self {
        ViewModelError::InvalidCommand(msg.into())
    }

    pub fn invalid_query(msg: impl Into<String>) -> Self {
        ViewModelError::InvalidQuery(msg.into())
    }

    pub fn execution_failed(msg: impl Into<String>) -> Self {
        ViewModelError::ExecutionFailed(msg.into())
    }

    pub fn not_found(msg: impl Into<String>) -> Self {
        ViewModelError::NotFound(msg.into())
    }

    pub fn validation(msg: impl Into<String>) -> Self {
        ViewModelError::ValidationError(msg.into())
    }

    pub fn unauthorized(msg: impl Into<String>) -> Self {
        ViewModelError::Unauthorized(msg.into())
    }
}

impl std::fmt::Display for ViewModelError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ViewModelError::InvalidCommand(msg) => write!(f, "Invalid command: {}", msg),
            ViewModelError::InvalidQuery(msg) => write!(f, "Invalid query: {}", msg),
            ViewModelError::ExecutionFailed(msg) => write!(f, "Execution failed: {}", msg),
            ViewModelError::NotFound(msg) => write!(f, "Not found: {}", msg),
            ViewModelError::ValidationError(msg) => write!(f, "Validation error: {}", msg),
            ViewModelError::Unauthorized(msg) => write!(f, "Unauthorized: {}", msg),
        }
    }
}

impl std::error::Error for ViewModelError {}

pub type SharedViewModel = Arc<dyn ViewModel>;
