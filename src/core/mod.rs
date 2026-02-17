// src/core/mod.rs
// Core module - ports and interfaces for the application

pub mod mvvm;
pub mod ports;
pub mod result;

pub use mvvm::*;
pub use ports::*;

// Re-export from model for backward compatibility
pub use crate::model::dtos as infrastructure_dto;
pub use crate::model::entities as domain;
pub use crate::model::repositories as persistence;
pub use crate::model::services;

// Re-export config and logging
pub mod config;
pub mod di;
pub mod logging;
pub mod platform;

pub use config::*;
pub use di::*;
pub use logging::*;
pub use platform::*;
