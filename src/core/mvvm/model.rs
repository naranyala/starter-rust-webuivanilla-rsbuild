// src/core/mvvm/model.rs
// Base Model structures for backend MVVM

use chrono::{DateTime, Utc};

pub trait Entity: Send + Sync {
    type Id: Clone + std::fmt::Debug;
    fn id(&self) -> &Self::Id;
    fn created_at(&self) -> DateTime<Utc>;
    fn updated_at(&self) -> DateTime<Utc>;
}

pub trait ValueObject: Send + Sync + PartialEq {
    type ValidationError;
    fn validate(&self) -> Result<(), Self::ValidationError>;
}

pub trait DomainModel: Send + Sync {
    fn aggregate_id(&self) -> &str;
    fn apply_event(&mut self, event: &DomainEvent) -> Result<(), ModelError>;
}

#[derive(Debug, Clone)]
pub enum DomainEvent {
    Created {
        entity_type: String,
        entity_id: String,
        payload: String,
    },
    Updated {
        entity_type: String,
        entity_id: String,
        changes: String,
    },
    Deleted {
        entity_type: String,
        entity_id: String,
    },
    Custom {
        event_type: String,
        payload: String,
    },
}

#[derive(Debug)]
pub enum ModelError {
    InvalidState(String),
    ValidationFailed(String),
    EventHandlingFailed(String),
}

impl std::fmt::Display for ModelError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ModelError::InvalidState(msg) => write!(f, "Invalid state: {}", msg),
            ModelError::ValidationFailed(msg) => write!(f, "Validation failed: {}", msg),
            ModelError::EventHandlingFailed(msg) => write!(f, "Event handling failed: {}", msg),
        }
    }
}

impl std::error::Error for ModelError {}
