// infrastructure/event_bus/in_memory.rs
use crate::core::domain::events::DomainEvent;
use crate::core::domain::errors::DomainError;
use crate::core::ports::event_bus::{EventBus, EventHandler};
use crate::infrastructure::event_bus::{EventBusConfig, EventBusMetrics, Subscription};
use crate::infrastructure::logging::StructuredLogger;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct InMemoryEventBus {
    handlers: Arc<Mutex<HashMap<String, Vec<Box<dyn Fn(String, serde_json::Value) + Send + Sync>>>>>,
    subscriptions: Arc<Mutex<HashMap<String, Vec<Subscription>>>>,
    config: EventBusConfig,
    metrics: Arc<Mutex<EventBusMetrics>>,
    logger: StructuredLogger,
}

impl InMemoryEventBus {
    pub fn new(config: EventBusConfig, logger: StructuredLogger) -> Self {
        Self {
            handlers: Arc::new(Mutex::new(HashMap::new())),
            subscriptions: Arc::new(Mutex::new(HashMap::new())),
            config,
            metrics: Arc::new(Mutex::new(EventBusMetrics::new())),
            logger,
        }
    }

    pub async fn subscribe<F>(&self, event_type: &str, handler: F) -> String 
    where 
        F: Fn(String, serde_json::Value) + Send + Sync + 'static,
    {
        let subscription_id = uuid::Uuid::new_v4().to_string();

        let mut handlers = self.handlers.lock().await;
        let handlers_for_type = handlers.entry(event_type.to_string()).or_insert_with(Vec::new);
        handlers_for_type.push(Box::new(handler));

        let mut subscriptions = self.subscriptions.lock().await;
        subscriptions
            .entry(event_type.to_string())
            .or_insert_with(Vec::new)
            .push(Subscription {
                id: subscription_id.clone(),
                event_type: event_type.to_string(),
            });

        self.logger.info(&format!(
            "Subscribed handler to event: {} (id: {})",
            event_type, subscription_id
        ));

        subscription_id
    }

    pub async fn unsubscribe(&self, subscription_id: &str) -> Result<(), DomainError> {
        let mut subscriptions = self.subscriptions.lock().await;

        for (event_type, subs) in subscriptions.iter_mut() {
            if let Some(pos) = subs.iter().position(|s| s.id == subscription_id) {
                subs.remove(pos);
                self.logger.info(&format!(
                    "Unsubscribed handler from event: {} (id: {})",
                    event_type, subscription_id
                ));
                return Ok(());
            }
        }

        Err(DomainError::NotFound(format!(
            "Subscription {} not found",
            subscription_id
        )))
    }

    pub async fn get_subscriptions(&self) -> Vec<Subscription> {
        let subscriptions = self.subscriptions.lock().await;
        subscriptions.values().flatten().cloned().collect()
    }

    pub async fn get_metrics(&self) -> EventBusMetrics {
        let metrics = self.metrics.lock().await;
        EventBusMetrics {
            events_published: metrics.events_published,
            events_handled: metrics.events_handled,
            events_failed: metrics.events_failed,
            last_event_type: metrics.last_event_type.clone(),
        }
    }

    pub async fn clear(&self) {
        let mut handlers = self.handlers.lock().await;
        handlers.clear();
        let mut subscriptions = self.subscriptions.lock().await;
        subscriptions.clear();
        let mut metrics = self.metrics.lock().await;
        *metrics = EventBusMetrics::new();
        self.logger.info("Event bus cleared");
    }
}

impl Clone for InMemoryEventBus {
    fn clone(&self) -> Self {
        Self {
            handlers: self.handlers.clone(),
            subscriptions: self.subscriptions.clone(),
            config: self.config.clone(),
            metrics: self.metrics.clone(),
            logger: self.logger.clone(),
        }
    }
}

impl EventBus for InMemoryEventBus {
    fn publish(&self, event: Box<dyn DomainEvent>) -> Result<(), DomainError> {
        let event_type = event.event_type();
        let payload = event.payload();

        if self.config.enable_logging {
            self.logger.info(&format!(
                "Publishing event: {} (aggregate: {})",
                event_type,
                event.aggregate_id()
            ));
        }

        let handlers = futures::executor::block_on(async {
            let handlers = self.handlers.lock().await;
            if let Some(h) = handlers.get(event_type) {
                Some(h.clone())
            } else {
                None
            }
        });

        if let Some(handlers) = handlers {
            {
                let mut metrics = futures::executor::block_on(async { self.metrics.lock().await });
                metrics.events_published += 1;
                metrics.last_event_type = Some(event_type.to_string());
            }

            for handler in handlers {
                handler(event_type.to_string(), payload.clone());
            }
        }

        Ok(())
    }
}

impl Default for EventBusConfig {
    fn default() -> Self {
        Self::new()
    }
}

impl EventBusConfig {
    pub fn new() -> Self {
        Self {
            max_queue_size: 10000,
            enable_logging: true,
            enable_metrics: true,
        }
    }

    pub fn with_max_queue_size(mut self, size: usize) -> Self {
        self.max_queue_size = size;
        self
    }

    pub fn with_logging(mut self, enabled: bool) -> Self {
        self.enable_logging = enabled;
        self
    }

    pub fn with_metrics(mut self, enabled: bool) -> Self {
        self.enable_metrics = enabled;
        self
    }
}

impl Clone for EventBusConfig {
    fn clone(&self) -> Self {
        Self {
            max_queue_size: self.max_queue_size,
            enable_logging: self.enable_logging,
            enable_metrics: self.enable_metrics,
        }
    }
}
