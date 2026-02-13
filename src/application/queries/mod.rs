// application/queries/mod.rs
pub mod get_users;
pub mod get_user_by_id;

use async_trait::async_trait;
use crate::core::domain::errors::DomainError;

#[async_trait]
pub trait QueryHandler<Q>: Send + Sync {
    type Output;
    async fn handle(&self, query: Q) -> Result<Self::Output, DomainError>;
}
