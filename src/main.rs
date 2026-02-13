use log::info;
use webui_rs::webui;

// Core domain and services
mod core;

// Application layer (commands and queries)
mod application;

// Infrastructure (implementations)
mod infrastructure;

// DI container
mod di;

// Platform utilities
mod platform;

use di::ServiceProvider;
use infrastructure::web::handlers::{user_handlers::setup_user_handlers, system_handlers::setup_system_handlers};
use infrastructure::config::AppConfig;

// Build-time generated config
include!(concat!(env!("OUT_DIR"), "/build_config.rs"));

fn main() {
    // Load configuration
    let config = AppConfig::load().unwrap_or_default();
    
    // Initialize logging
    if let Err(e) = init_logging(&config) {
        eprintln!("Failed to initialize logging: {}", e);
        return;
    }

    info!("=============================================");
    info!("Starting: {} v{}", config.app.name, config.app.version);
    info!("=============================================");

    // Initialize DI container
    let provider = match ServiceProvider::new(config.clone()) {
        Ok(p) => {
            info!("DI container initialized");
            p
        }
        Err(e) => {
            log::error!("Failed to initialize services: {}", e);
            return;
        }
    };

    // Store provider globally for handlers to access
    // (In production, use a proper global state mechanism)
    
    // Create window
    let mut window = webui::Window::new();

    // Register handlers
    setup_user_handlers(&mut window);
    setup_system_handlers(&mut window);

    info!("Window title: {}", config.window.title);
    info!("Loading UI from frontend/dist/index.html");
    
    window.show("frontend/dist/index.html");

    info!("Application started, waiting for events...");
    info!("=============================================");

    webui::wait();

    info!("Application shutting down...");
    info!("=============================================");
}

fn init_logging(config: &AppConfig) -> Result<(), Box<dyn std::error::Error>> {
    use log::Level;
    
    let level = match config.logging.level.as_str() {
        "debug" => Level::Debug,
        "info" => Level::Info,
        "warn" => Level::Warn,
        "error" => Level::Error,
        _ => Level::Info,
    };
    
    simple_logger::init_with_level(level)?;
    Ok(())
}
