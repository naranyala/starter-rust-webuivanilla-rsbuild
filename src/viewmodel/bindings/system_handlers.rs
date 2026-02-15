// infrastructure/web/handlers/system_handlers.rs
use log::{info, warn};
use webui_rs::webui;

fn get_event_arg(event: &webui::Event, index: usize) -> Option<String> {
    unsafe {
        let size =
            webui::bindgen::webui_interface_get_size_at(event.window, event.event_number, index);
        if size == 0 {
            return None;
        }

        let ptr =
            webui::bindgen::webui_interface_get_string_at(event.window, event.event_number, index);
        if ptr.is_null() {
            return None;
        }

        Some(std::ffi::CStr::from_ptr(ptr).to_string_lossy().into_owned())
    }
}

fn get_event_element(event: &webui::Event) -> Option<String> {
    if event.element.is_null() {
        return None;
    }

    unsafe {
        Some(
            std::ffi::CStr::from_ptr(event.element)
                .to_string_lossy()
                .into_owned(),
        )
    }
}

pub fn setup_system_handlers(window: &mut webui::Window) {
    window.bind("get_system_info", |event| {
        let mut sysinfo = serde_json::Map::new();

        sysinfo.insert(
            "os".to_string(),
            serde_json::json!({
                "platform": std::env::consts::OS,
                "arch": std::env::consts::ARCH,
            }),
        );

        // Memory info
        if let Ok(content) = std::fs::read_to_string("/proc/meminfo") {
            let mut mem = serde_json::Map::new();
            for line in content.lines() {
                let parts: Vec<&str> = line.split(':').collect();
                if parts.len() == 2 {
                    let key = parts[0].trim();
                    let value = parts[1].trim().split_whitespace().next();
                    if let Some(v) = value {
                        if let Ok(n) = v.parse::<u64>() {
                            match key {
                                "MemTotal" => {
                                    mem.insert("total_mb".to_string(), serde_json::json!(n / 1024));
                                }
                                "MemFree" => {
                                    mem.insert("free_mb".to_string(), serde_json::json!(n / 1024));
                                }
                                _ => {}
                            }
                        }
                    }
                }
            }
            sysinfo.insert("memory".to_string(), serde_json::Value::Object(mem));
        }

        let response = serde_json::json!({
            "success": true,
            "data": serde_json::Value::Object(sysinfo)
        });

        let js = format!(
            "window.dispatchEvent(new CustomEvent('sysinfo_response', {{ detail: {} }}))",
            response
        );
        webui::Window::from_id(event.window).run_js(&js);
    });

    window.bind("log_window_lifecycle", |event| {
        let payload_raw = get_event_arg(&event, 0)
            .or_else(|| get_event_element(&event))
            .unwrap_or_default();

        match serde_json::from_str::<serde_json::Value>(&payload_raw) {
            Ok(payload) => {
                let lifecycle_event = payload
                    .get("event")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown");
                let window_id = payload
                    .get("window_id")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown");
                let title = payload
                    .get("title")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown");
                let timestamp = payload
                    .get("timestamp")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown");

                info!(
                    "Window lifecycle | event={} window_id={} title=\"{}\" at={}",
                    lifecycle_event, window_id, title, timestamp
                );
            }
            Err(err) => {
                warn!(
                    "Invalid window lifecycle payload from frontend: payload='{}' error={}",
                    payload_raw, err
                );
            }
        }
    });

    window.bind("ws_state_change", |event| {
        let payload_raw = get_event_arg(&event, 0)
            .or_else(|| get_event_element(&event))
            .unwrap_or_default();

        match serde_json::from_str::<serde_json::Value>(&payload_raw) {
            Ok(payload) => {
                let state = payload
                    .get("state")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown");
                let reason = payload
                    .get("reason")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let ts = payload
                    .get("timestamp")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown");
                let attempts = payload
                    .get("reconnect_attempts")
                    .and_then(|v| v.as_i64())
                    .unwrap_or(0);
                let ws_port = payload.get("ws_port").and_then(|v| v.as_i64()).unwrap_or(-1);
                let ws_port_source = payload
                    .get("ws_port_source")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown");
                info!(
                    "WS state | state={} attempts={} port={} source={} reason=\"{}\" at={}",
                    state, attempts, ws_port, ws_port_source, reason, ts
                );
            }
            Err(err) => {
                warn!(
                    "Invalid ws_state_change payload from frontend: payload='{}' error={}",
                    payload_raw, err
                );
            }
        }
    });

    window.bind("ws_error_report", |event| {
        let payload_raw = get_event_arg(&event, 0)
            .or_else(|| get_event_element(&event))
            .unwrap_or_default();

        match serde_json::from_str::<serde_json::Value>(&payload_raw) {
            Ok(payload) => {
                let context = payload
                    .get("context")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown");
                let message = payload
                    .get("message")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown");
                let ts = payload
                    .get("timestamp")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown");
                let ws_port = payload.get("ws_port").and_then(|v| v.as_i64()).unwrap_or(-1);
                let ws_port_source = payload
                    .get("ws_port_source")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown");
                warn!(
                    "WS frontend error | context={} port={} source={} message=\"{}\" at={}",
                    context, ws_port, ws_port_source, message, ts
                );
            }
            Err(err) => {
                warn!(
                    "Invalid ws_error_report payload from frontend: payload='{}' error={}",
                    payload_raw, err
                );
            }
        }
    });

    window.bind("ws_heartbeat", |event| {
        let payload_raw = get_event_arg(&event, 0)
            .or_else(|| get_event_element(&event))
            .unwrap_or_default();

        match serde_json::from_str::<serde_json::Value>(&payload_raw) {
            Ok(payload) => {
                let state = payload
                    .get("state")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown");
                let connected = payload
                    .get("connected")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);
                let queued = payload
                    .get("queued_lifecycle_events")
                    .and_then(|v| v.as_i64())
                    .unwrap_or(0);
                let ts = payload
                    .get("timestamp")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown");
                let ws_port = payload.get("ws_port").and_then(|v| v.as_i64()).unwrap_or(-1);
                let ws_port_source = payload
                    .get("ws_port_source")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown");
                info!(
                    "WS heartbeat | state={} connected={} queued={} port={} source={} at={}",
                    state, connected, queued, ws_port, ws_port_source, ts
                );
            }
            Err(err) => {
                warn!(
                    "Invalid ws_heartbeat payload from frontend: payload='{}' error={}",
                    payload_raw, err
                );
            }
        }
    });
}
