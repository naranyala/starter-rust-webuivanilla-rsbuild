// application/queries/get_users.rs
use std::sync::Arc;
use async_trait::async_trait;
use crate::viewmodel::queries::QueryHandler;
use crate::core::domain::{user::User, errors::DomainError};
use crate::core::services::user_service::UserService;

pub struct GetUsersQuery;

pub struct GetUsersHandler {
    user_service: Arc<dyn UserService>,
}

impl GetUsersHandler {
    pub fn new(user_service: Arc<dyn UserService>) -> Self {
        Self { user_service }
    }
}

#[async_trait]
impl QueryHandler<GetUsersQuery> for GetUsersHandler {
    type Output = Vec<User>;
    
    async fn handle(&self, _query: GetUsersQuery) -> Result<Self::Output, DomainError> {
        self.user_service.get_all_users().await
    }
}
