// infrastructure/web/handlers/system_handlers.rs
use webui_rs::webui;

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
}
