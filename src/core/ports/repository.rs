// core/ports/repository.rs
use async_trait::async_trait;
use crate::core::domain::{user::{User, UserId, NewUser}, errors::DomainError};

#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn get_all(&self) -> Result<Vec<User>, DomainError>;
    async fn get_by_id(&self, id: UserId) -> Result<User, DomainError>;
    async fn create(&self, user: &NewUser) -> Result<UserId, DomainError>;
    async fn update(&self, user: &User) -> Result<(), DomainError>;
    async fn delete(&self, id: UserId) -> Result<(), DomainError>;
    async fn count(&self) -> Result<i64, DomainError>;
}
