// core/services/user_service.rs
use std::sync::Arc;
use async_trait::async_trait;
use crate::core::domain::{user::{User, UserId, NewUser}, errors::DomainError};
use crate::core::ports::repository::UserRepository;
use crate::core::ports::event_bus::EventBus;

#[async_trait]
pub trait UserService: Send + Sync {
    async fn get_all_users(&self) -> Result<Vec<User>, DomainError>;
    async fn get_user(&self, id: UserId) -> Result<User, DomainError>;
    async fn create_user(&self, new_user: NewUser) -> Result<UserId, DomainError>;
    async fn delete_user(&self, id: UserId) -> Result<(), DomainError>;
}

pub struct UserServiceImpl {
    repository: Arc<dyn UserRepository>,
}

impl UserServiceImpl {
    pub fn new(
        repository: Arc<dyn UserRepository>,
        _event_bus: Arc<dyn EventBus>,
    ) -> Self {
        Self {
            repository,
        }
    }
}

#[async_trait]
impl UserService for UserServiceImpl {
    async fn get_all_users(&self) -> Result<Vec<User>, DomainError> {
        self.repository.get_all().await
    }
    
    async fn get_user(&self, id: UserId) -> Result<User, DomainError> {
        self.repository.get_by_id(id).await
    }
    
    async fn create_user(&self, new_user: NewUser) -> Result<UserId, DomainError> {
        // Validate
        User::create(new_user.clone())?;
        
        // Create in repository
        let id = self.repository.create(&new_user).await?;
        
        Ok(id)
    }
    
    async fn delete_user(&self, id: UserId) -> Result<(), DomainError> {
        self.repository.delete(id).await
    }
}
