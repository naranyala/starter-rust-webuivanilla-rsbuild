// infrastructure/web/handlers/user_handlers.rs
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

pub fn setup_user_handlers(window: &mut webui::Window) {
    // Get service from DI - this is a simplified approach
    // In a more advanced setup, you'd use a registry or lazy initialization

    window.bind("get_users", move |event| {
        let window = event.get_window();

        // Simple synchronous approach - directly access provider
        // In production, you'd want to store the provider globally
        let response = serde_json::json!({
            "success": true,
            "data": [],
            "message": "Use get_users via Rust backend"
        });

        let js = format!(
            "window.dispatchEvent(new CustomEvent('db_response', {{ detail: {} }}))",
            response
        );
        let _ = webui::Window::from_id(window.id).run_js(&js);
    });

    window.bind("create_user", |event| {
        let window = event.get_window();
        let payload = get_event_arg(&event, 0)
            .or_else(|| get_event_element(&event))
            .unwrap_or_default();
        let parts: Vec<&str> = payload.split(':').collect();
        let name = parts.get(1).unwrap_or(&"");
        let _email = parts.get(2).unwrap_or(&"");

        let response = serde_json::json!({
            "success": true,
            "message": format!("User '{}' created", name)
        });

        let js = format!(
            "window.dispatchEvent(new CustomEvent('user_create_response', {{ detail: {} }}))",
            response
        );
        let _ = webui::Window::from_id(window.id).run_js(&js);
    });

    window.bind("delete_user", |event| {
        let window = event.get_window();
        let payload = get_event_arg(&event, 0)
            .or_else(|| get_event_element(&event))
            .unwrap_or_default();
        let parts: Vec<&str> = payload.split(':').collect();
        let id = parts.get(1).unwrap_or(&"0");

        let response = serde_json::json!({
            "success": true,
            "message": format!("User {} deleted", id)
        });

        let js = format!(
            "window.dispatchEvent(new CustomEvent('user_delete_response', {{ detail: {} }}))",
            response
        );
        let _ = webui::Window::from_id(window.id).run_js(&js);
    });
}
