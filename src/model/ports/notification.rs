// core/ports/notification.rs
use async_trait::async_trait;
use crate::core::domain::errors::DomainError;

#[async_trait]
pub trait NotificationService: Send + Sync {
    async fn send(&self, title: &str, message: &str) -> Result<(), DomainError>;
    async fn send_with_options(&self, notification: NotificationOptions) -> Result<(), DomainError>;
}

pub struct NotificationOptions {
    pub title: String,
    pub message: String,
    pub icon: Option<String>,
    pub timeout_ms: Option<u64>,
}
