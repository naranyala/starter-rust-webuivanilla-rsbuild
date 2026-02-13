// application/commands/delete_user.rs
use std::sync::Arc;
use async_trait::async_trait;
use crate::application::commands::{CommandHandler};
use crate::core::domain::{user::UserId, errors::DomainError};
use crate::core::services::user_service::UserService;

pub struct DeleteUserCommand {
    pub id: i64,
}

pub struct DeleteUserHandler {
    user_service: Arc<dyn UserService>,
}

impl DeleteUserHandler {
    pub fn new(user_service: Arc<dyn UserService>) -> Self {
        Self { user_service }
    }
}

#[async_trait]
impl CommandHandler<DeleteUserCommand> for DeleteUserHandler {
    type Output = ();
    
    async fn handle(&self, command: DeleteUserCommand) -> Result<Self::Output, DomainError> {
        self.user_service.delete_user(UserId(command.id)).await
    }
}
