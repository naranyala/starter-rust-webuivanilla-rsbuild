// infrastructure/logging/mod.rs
use crate::core::ports::logger::Logger;

pub struct SimpleLogger;

impl SimpleLogger {
    pub fn new() -> Self {
        Self
    }
}

impl Logger for SimpleLogger {
    fn debug(&self, message: &str) {
        log::debug!("{}", message);
    }

    fn info(&self, message: &str) {
        log::info!("{}", message);
    }

    fn warn(&self, message: &str) {
        log::warn!("{}", message);
    }

    fn error(&self, message: &str) {
        log::error!("{}", message);
    }
}
