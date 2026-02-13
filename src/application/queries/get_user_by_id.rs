// application/queries/get_user_by_id.rs
use std::sync::Arc;
use async_trait::async_trait;
use crate::application::queries::QueryHandler;
use crate::core::domain::{user::{User, UserId}, errors::DomainError};
use crate::core::services::user_service::UserService;

pub struct GetUserByIdQuery {
    pub id: i64,
}

pub struct GetUserByIdHandler {
    user_service: Arc<dyn UserService>,
}

impl GetUserByIdHandler {
    pub fn new(user_service: Arc<dyn UserService>) -> Self {
        Self { user_service }
    }
}

#[async_trait]
impl QueryHandler<GetUserByIdQuery> for GetUserByIdHandler {
    type Output = User;
    
    async fn handle(&self, query: GetUserByIdQuery) -> Result<Self::Output, DomainError> {
        self.user_service.get_user(UserId(query.id)).await
    }
}
