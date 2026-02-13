// core/domain/events.rs
use crate::core::domain::user::UserId;
use chrono::{DateTime, Utc};
use serde::Serialize;

pub trait DomainEvent: Send + Sync {
    fn event_type(&self) -> &'static str;
    fn occurred_at(&self) -> DateTime<Utc>;
    fn aggregate_id(&self) -> String;
}

#[derive(Debug, Clone, Serialize)]
pub struct UserCreatedEvent {
    pub user_id: UserId,
    pub name: String,
    pub email: String,
    pub occurred_at: DateTime<Utc>,
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
}

#[derive(Debug, Clone, Serialize)]
pub struct UserDeletedEvent {
    pub user_id: UserId,
    pub occurred_at: DateTime<Utc>,
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
}
