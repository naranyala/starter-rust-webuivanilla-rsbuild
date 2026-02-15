// core/ports/event_bus.rs
use crate::core::domain::errors::DomainError;
use crate::core::domain::events::DomainEvent;

pub trait EventBus: Send + Sync {
    fn publish(&self, event: Box<dyn DomainEvent>) -> Result<(), DomainError>;
}

pub trait EventHandler<E: DomainEvent>: Send + Sync {
    fn handle(&self, event: &E);
}
