// application/commands/create_user.rs
use std::sync::Arc;
use async_trait::async_trait;
use crate::application::commands::{CommandHandler};
use crate::core::domain::{user::{UserId, NewUser, Email, UserRole}, errors::DomainError};
use crate::core::services::user_service::UserService;

pub struct CreateUserCommand {
    pub name: String,
    pub email: String,
    pub role: String,
}

pub struct CreateUserHandler {
    user_service: Arc<dyn UserService>,
}

impl CreateUserHandler {
    pub fn new(user_service: Arc<dyn UserService>) -> Self {
        Self { user_service }
    }
}

#[async_trait]
impl CommandHandler<CreateUserCommand> for CreateUserHandler {
    type Output = UserId;
    
    async fn handle(&self, command: CreateUserCommand) -> Result<Self::Output, DomainError> {
        let new_user = NewUser {
            name: command.name,
            email: Email::new(&command.email).map_err(|e| DomainError::ValidationError(e))?,
            role: UserRole::from_str(&command.role),
        };
        
        self.user_service.create_user(new_user).await
    }
}
