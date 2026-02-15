// Core layer compatibility surface.
pub use crate::model::dtos as infrastructure_dto;
pub use crate::model::entities as domain;
pub use crate::model::repositories as persistence;
pub use crate::model::services as services;

pub mod config;
pub mod di;
pub mod event_bus;
pub mod logging;
pub mod platform;
pub mod ports;
