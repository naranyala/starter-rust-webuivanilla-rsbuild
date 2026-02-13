// di/mod.rs
use std::sync::{Arc, Mutex};
use crate::core::ports::repository::UserRepository;
use crate::core::services::user_service::{UserService, UserServiceImpl};
use crate::infrastructure::config::AppConfig;
use crate::infrastructure::logging::SimpleLogger;
use crate::infrastructure::persistence::sqlite::user_repository::SqliteUserRepository;

pub struct ServiceProvider {
    pub config: AppConfig,
    pub user_repository: Arc<dyn UserRepository>,
    pub user_service: Arc<dyn UserService>,
    pub logger: Arc<SimpleLogger>,
}

impl ServiceProvider {
    pub fn new(config: AppConfig) -> Result<Self, Box<dyn std::error::Error>> {
        // Initialize database connection
        let conn = Arc::new(Mutex::new(rusqlite::Connection::open(
            &config.database.path,
        )?));

        // Create repository
        let user_repository: Arc<dyn UserRepository> = Arc::new(SqliteUserRepository::new(conn.clone()));

        // Initialize schema
        {
            let repo = user_repository.clone();
            let runtime = tokio::runtime::Runtime::new()?;
            runtime.block_on(async {
                // Initialize via a simple query
                let _ = repo.get_all().await; // This will fail if table doesn't exist
            });
        }
        
        // Actually initialize the schema
        let sqlite_repo = SqliteUserRepository::new(conn);
        sqlite_repo.init_schema()?;

        // Create logger
        let logger = Arc::new(SimpleLogger::new());

        // Create event bus (noop for now)
        let event_bus = Arc::new(NoopEventBus);

        // Create services
        let user_service: Arc<dyn UserService> =
            Arc::new(UserServiceImpl::new(user_repository.clone(), event_bus));

        Ok(Self {
            config,
            user_repository,
            user_service,
            logger,
        })
    }
}

// Simplified event bus for now
struct NoopEventBus;

impl crate::core::ports::event_bus::EventBus for NoopEventBus {
    fn publish(
        &self,
        _event: Box<dyn crate::core::domain::events::DomainEvent>,
    ) -> Result<(), crate::core::domain::errors::DomainError> {
        Ok(())
    }
}
