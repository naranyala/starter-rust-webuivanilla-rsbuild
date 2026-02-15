// core/domain/events.rs
use crate::core::domain::user::UserId;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

pub trait DomainEvent: Send + Sync {
    fn event_type(&self) -> &'static str;
    fn occurred_at(&self) -> DateTime<Utc>;
    fn aggregate_id(&self) -> String;
    fn payload(&self) -> serde_json::Value;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventMetadata {
    pub event_id: String,
    pub correlation_id: Option<String>,
    pub causation_id: Option<String>,
    pub source: String,
    pub version: u32,
}

impl EventMetadata {
    pub fn new(source: &str) -> Self {
        Self {
            event_id: uuid::Uuid::new_v4().to_string(),
            correlation_id: None,
            causation_id: None,
            source: source.to_string(),
            version: 1,
        }
    }

    pub fn with_correlation(mut self, correlation_id: String) -> Self {
        self.correlation_id = Some(correlation_id);
        self
    }

    pub fn with_causation(mut self, causation_id: String) -> Self {
        self.causation_id = Some(causation_id);
        self
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Envelope<T: DomainEvent> {
    pub metadata: EventMetadata,
    pub payload: T,
}

impl<T: DomainEvent> Envelope<T> {
    pub fn new(payload: T, source: &str) -> Self {
        Self {
            metadata: EventMetadata::new(source),
            payload,
        }
    }

    pub fn with_correlation(mut self, correlation_id: String) -> Self {
        self.metadata = self.metadata.with_correlation(correlation_id);
        self
    }

    pub fn with_causation(mut self, causation_id: String) -> Self {
        self.metadata = self.metadata.with_causation(causation_id);
        self
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserCreatedEvent {
    pub user_id: UserId,
    pub name: String,
    pub email: String,
    pub occurred_at: DateTime<Utc>,
}

impl UserCreatedEvent {
    pub fn new(user_id: UserId, name: String, email: String) -> Self {
        Self {
            user_id,
            name,
            email,
            occurred_at: Utc::now(),
        }
    }
}

impl DomainEvent for UserCreatedEvent {
    fn event_type(&self) -> &'static str {
        "user.created"
    }

    fn occurred_at(&self) -> DateTime<Utc> {
        self.occurred_at
    }

    fn aggregate_id(&self) -> String {
        self.user_id.0.to_string()
    }

    fn payload(&self) -> serde_json::Value {
        serde_json::json!({
            "user_id": self.user_id.0,
            "name": self.name,
            "email": self.email,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserDeletedEvent {
    pub user_id: UserId,
    pub occurred_at: DateTime<Utc>,
}

impl UserDeletedEvent {
    pub fn new(user_id: UserId) -> Self {
        Self {
            user_id,
            occurred_at: Utc::now(),
        }
    }
}

impl DomainEvent for UserDeletedEvent {
    fn event_type(&self) -> &'static str {
        "user.deleted"
    }

    fn occurred_at(&self) -> DateTime<Utc> {
        self.occurred_at
    }

    fn aggregate_id(&self) -> String {
        self.user_id.0.to_string()
    }

    fn payload(&self) -> serde_json::Value {
        serde_json::json!({
            "user_id": self.user_id.0,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserUpdatedEvent {
    pub user_id: UserId,
    pub name: Option<String>,
    pub email: Option<String>,
    pub occurred_at: DateTime<Utc>,
}

impl UserUpdatedEvent {
    pub fn new(user_id: UserId, name: Option<String>, email: Option<String>) -> Self {
        Self {
            user_id,
            name,
            email,
            occurred_at: Utc::now(),
        }
    }
}

impl DomainEvent for UserUpdatedEvent {
    fn event_type(&self) -> &'static str {
        "user.updated"
    }

    fn occurred_at(&self) -> DateTime<Utc> {
        self.occurred_at
    }

    fn aggregate_id(&self) -> String {
        self.user_id.0.to_string()
    }

    fn payload(&self) -> serde_json::Value {
        serde_json::json!({
            "user_id": self.user_id.0,
            "name": self.name,
            "email": self.email,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApplicationStartedEvent {
    pub app_name: String,
    pub version: String,
    pub occurred_at: DateTime<Utc>,
}

impl ApplicationStartedEvent {
    pub fn new(app_name: String, version: String) -> Self {
        Self {
            app_name,
            version,
            occurred_at: Utc::now(),
        }
    }
}

impl DomainEvent for ApplicationStartedEvent {
    fn event_type(&self) -> &'static str {
        "application.started"
    }

    fn occurred_at(&self) -> DateTime<Utc> {
        self.occurred_at
    }

    fn aggregate_id(&self) -> String {
        self.app_name.clone()
    }

    fn payload(&self) -> serde_json::Value {
        serde_json::json!({
            "app_name": self.app_name,
            "version": self.version,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApplicationShutdownEvent {
    pub app_name: String,
    pub reason: Option<String>,
    pub occurred_at: DateTime<Utc>,
}

impl ApplicationShutdownEvent {
    pub fn new(app_name: String, reason: Option<String>) -> Self {
        Self {
            app_name,
            reason,
            occurred_at: Utc::now(),
        }
    }
}

impl DomainEvent for ApplicationShutdownEvent {
    fn event_type(&self) -> &'static str {
        "application.shutdown"
    }

    fn occurred_at(&self) -> DateTime<Utc> {
        self.occurred_at
    }

    fn aggregate_id(&self) -> String {
        self.app_name.clone()
    }

    fn payload(&self) -> serde_json::Value {
        serde_json::json!({
            "app_name": self.app_name,
            "reason": self.reason,
        })
    }
}
