use log::{error, info, warn};
use webui_rs::webui;

mod core;
mod application;
mod infrastructure;
mod di;
mod platform;

use di::ServiceProvider;
use infrastructure::logging::StructuredLogger;
use infrastructure::web::handlers::{user_handlers::setup_user_handlers, system_handlers::setup_system_handlers};
use infrastructure::config::AppConfig;
use core::ports::logger::LogLevel;

include!(concat!(env!("OUT_DIR"), "/build_config.rs"));

fn main() {
    let config = AppConfig::load().unwrap_or_default();
    
    let log_level = LogLevel::from(config.logging.level.as_str());
    
    let log_dir = if let Some(data_dir) = dirs::data_local_dir() {
        Some(data_dir.join(&config.app.name))
    } else {
        None
    };
    
    let mut logger = StructuredLogger::new(log_level, &config.app.name);
    if let Err(e) = logger.init(log_dir) {
        eprintln!("Failed to initialize logging: {}", e);
    }

    info!("Application starting: {} v{}", config.app.name, config.app.version);
    info!("Window title: {}", config.window.title);

    let _provider = match ServiceProvider::new(config.clone()) {
        Ok(p) => {
            info!("DI container initialized successfully");
            p
        }
        Err(e) => {
            error!("Failed to initialize services: {}", e);
            return;
        }
    };

    let mut window = webui::Window::new();

    setup_user_handlers(&mut window);
    setup_system_handlers(&mut window);

    info!("Loading UI from frontend/dist/index.html");
    window.show("frontend/dist/index.html");

    info!("Application started, waiting for events...");
    
    webui::wait();

    info!("Application shutting down gracefully");
}
