// Canonical DI module.
pub mod container;
pub mod module;

use std::sync::{Arc, Mutex};

use crate::core::config::AppConfig;
use crate::core::logging::StructuredLogger;
use crate::core::ports::logger::LogLevel;
use crate::core::ports::repository::UserRepository;
use crate::model::repositories::sqlite::user_repository::SqliteUserRepository;
use crate::model::services::user_service::{UserService, UserServiceImpl};

pub struct ServiceProvider {
    pub config: AppConfig,
    pub user_repository: Arc<dyn UserRepository>,
    pub user_service: Arc<dyn UserService>,
    pub logger: Arc<StructuredLogger>,
}

impl ServiceProvider {
    pub fn new(config: AppConfig) -> Result<Self, Box<dyn std::error::Error>> {
        let conn = Arc::new(Mutex::new(rusqlite::Connection::open(&config.database.path)?));

        let user_repository: Arc<dyn UserRepository> =
            Arc::new(SqliteUserRepository::new(conn.clone()));

        {
            let repo = user_repository.clone();
            let runtime = tokio::runtime::Runtime::new()?;
            runtime.block_on(async {
                let _ = repo.get_all().await;
            });
        }

        let sqlite_repo = SqliteUserRepository::new(conn);
        sqlite_repo.init_schema()?;

        let log_level = LogLevel::from(config.logging.level.as_str());
        let mut logger = StructuredLogger::new(log_level, "app");
        logger.init(None)?;

        let event_bus = Arc::new(NoopEventBus);

        let user_service: Arc<dyn UserService> =
            Arc::new(UserServiceImpl::new(user_repository.clone(), event_bus));

        Ok(Self {
            config,
            user_repository,
            user_service,
            logger: Arc::new(logger),
        })
    }
}

struct NoopEventBus;

impl crate::core::ports::event_bus::EventBus for NoopEventBus {
    fn publish(
        &self,
        _event: Box<dyn crate::model::entities::events::DomainEvent>,
    ) -> Result<(), crate::model::entities::errors::DomainError> {
        Ok(())
    }
}
