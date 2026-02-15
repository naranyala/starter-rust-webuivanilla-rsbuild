// Core ports - interface definitions (re-exported from model for backward compatibility)
pub use crate::model::ports::*;

// Original modules still exist for backward compatibility
pub mod event_bus;
pub mod logger;
pub mod notification;
pub mod repository;