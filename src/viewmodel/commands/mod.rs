// application/commands/mod.rs
pub mod create_user;
pub mod delete_user;

use async_trait::async_trait;
use crate::core::domain::errors::DomainError;

#[async_trait]
pub trait CommandHandler<C>: Send + Sync {
    type Output;
    async fn handle(&self, command: C) -> Result<Self::Output, DomainError>;
}
