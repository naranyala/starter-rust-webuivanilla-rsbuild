// infrastructure/event_bus/mod.rs
use crate::core::domain::events::{DomainEvent, Envelope, EventMetadata};
use crate::core::ports::event_bus::{EventBus, EventHandler};
use crate::core::ports::logger::Logger;
use crate::infrastructure::logging::StructuredLogger;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio::sync::broadcast;
use std::sync::Mutex;

pub mod in_memory;
pub mod async_event_bus;

pub use in_memory::InMemoryEventBus;
pub use async_event_bus::AsyncEventBus;

pub type EventHandlerFn<E> = Box<dyn Fn(E) + Send + Sync>;

#[derive(Clone)]
pub struct Subscription {
    pub id: String,
    pub event_type: String,
}

pub struct EventBusConfig {
    pub max_queue_size: usize,
    pub enable_logging: bool,
    pub enable_metrics: bool,
}

impl Default for EventBusConfig {
    fn default() -> Self {
        Self {
            max_queue_size: 10000,
            enable_logging: true,
            enable_metrics: true,
        }
    }
}

pub struct EventBusMetrics {
    pub events_published: usize,
    pub events_handled: usize,
    pub events_failed: usize,
    pub last_event_type: Option<String>,
}

impl EventBusMetrics {
    pub fn new() -> Self {
        Self {
            events_published: 0,
            events_handled: 0,
            events_failed: 0,
            last_event_type: None,
        }
    }
}

impl Default for EventBusMetrics {
    fn default() -> Self {
        Self::new()
    }
}
