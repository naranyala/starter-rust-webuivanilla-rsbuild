#![allow(dead_code)]
#![allow(unused_imports)]
#![allow(unused_variables)]

use log::{error, info};
use std::ffi::CStr;
use std::net::TcpListener;
use std::sync::Arc;
use webui_rs::webui;

mod core;
mod features;
mod plugins;
mod di;
mod infrastructure;
mod model;
mod mvvm;
mod platform;
mod view;
mod viewmodel;

use plugins::{create_plugin_registry, PluginRegistry, Plugin};
use features::user::UserPlugin;

use mvvm::shared::config::AppConfig;
use mvvm::shared::di::ServiceProvider;
use mvvm::shared::logging::StructuredLogger;
use mvvm::shared::ports::logger::LogLevel;
use mvvm::viewmodel::bindings::{
    system_handlers::setup_system_handlers,
    user_handlers::setup_user_handlers,
};

include!(concat!(env!("OUT_DIR"), "/build_config.rs"));

fn allocate_ephemeral_port() -> Option<u16> {
    let listener = TcpListener::bind(("127.0.0.1", 0)).ok()?;
    let port = listener.local_addr().ok()?.port();
    drop(listener);
    Some(port)
}

fn configure_random_webui_port(window: &webui::Window) -> Option<u16> {
    for _ in 0..24 {
        let Some(candidate) = allocate_ephemeral_port() else {
            continue;
        };

        let applied = unsafe { webui::bindgen::webui_set_port(window.id, candidate as usize) };
        if applied {
            return Some(candidate);
        }
    }
    None
}

fn get_window_url(window: &webui::Window) -> Option<String> {
    let url_ptr = unsafe { webui::bindgen::webui_get_url(window.id) };
    if url_ptr.is_null() {
        return None;
    }
    let url = unsafe { CStr::from_ptr(url_ptr) }
        .to_string_lossy()
        .trim()
        .to_string();
    if url.is_empty() {
        None
    } else {
        Some(url)
    }
}

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

    info!("=== Backend-Frontend Communication Configuration ===");
    info!("Transport Options:");
    info!("  - WebUI (WebSocket over HTTP) [SELECTED]");
    info!("  - WebRTC (peer-to-peer)");
    info!("  - HTTP REST API");
    info!("  - IPC (local)");
    info!("Serialization Options:");
    info!("  - JSON [SELECTED]");
    info!("  - MessagePack");
    info!("  - CBOR");
    info!("  - Protocol Buffers (protobuf)");
    info!("  - YAML");
    info!("Selected: WebUI (transport) + JSON (serialization)");
    info!("===================================================");

    // Initialize plugin system
    let plugin_registry = create_plugin_registry();
    let user_plugin = Arc::new(UserPlugin::new());
    
    if let Err(e) = plugin_registry.register(user_plugin.clone() as Arc<dyn plugins::Plugin>) {
        error!("Failed to register user plugin: {}", e);
    } else {
        info!("Plugin registered: {} v{}", user_plugin.name(), user_plugin.version());
    }

    info!("Plugin system initialized with {} plugins", plugin_registry.len());

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

    let selected_port = configure_random_webui_port(&window);
    match selected_port {
        Some(port) => info!("WebUI runtime port selected: {}", port),
        None => info!("WebUI runtime port selection fallback: automatic WebUI port"),
    }

    info!("Loading UI from frontend/dist/index.html");
    if !window.show("frontend/dist/index.html") {
        error!("Failed to show WebUI window");
        return;
    }

    if let Some(url) = get_window_url(&window) {
        info!("WebUI runtime URL: {}", url);
    }

    if let Some(port) = selected_port {
        let js = format!(
            "window.__WEBUI_WS_PORT__ = {}; window.dispatchEvent(new CustomEvent('webui_runtime_port', {{ detail: {{ port: {} }} }}));",
            port, port
        );
        let _ = window.run_js(js);
    }

    info!("Application started, waiting for events...");
    webui::wait();

    info!("Application shutting down gracefully");
}
