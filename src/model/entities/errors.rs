// core/domain/errors.rs
use std::fmt;

#[derive(Debug, Clone)]
pub enum DomainError {
    ValidationError(String),
    NotFound(String),
    AlreadyExists(String),
    InvalidOperation(String),
}

impl fmt::Display for DomainError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            DomainError::ValidationError(msg) => write!(f, "Validation error: {}", msg),
            DomainError::NotFound(msg) => write!(f, "Not found: {}", msg),
            DomainError::AlreadyExists(msg) => write!(f, "Already exists: {}", msg),
            DomainError::InvalidOperation(msg) => write!(f, "Invalid operation: {}", msg),
        }
    }
}

impl std::error::Error for DomainError {}

impl From<String> for DomainError {
    fn from(err: String) -> Self {
        DomainError::ValidationError(err)
    }
}

impl From<rusqlite::Error> for DomainError {
    fn from(err: rusqlite::Error) -> Self {
        match err {
            rusqlite::Error::QueryReturnedNoRows => {
                DomainError::NotFound("Record not found".to_string())
            }
            _ => DomainError::InvalidOperation(err.to_string()),
        }
    }
}
