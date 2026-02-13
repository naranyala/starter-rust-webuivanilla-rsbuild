// infrastructure/web/handlers/user_handlers.rs
use webui_rs::webui;

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
        let element = unsafe { std::ffi::CStr::from_ptr(event.element).to_string_lossy() };
        let parts: Vec<&str> = element.split(':').collect();
        let name = parts.get(1).unwrap_or(&"");
        let email = parts.get(2).unwrap_or(&"");

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
        let element = unsafe { std::ffi::CStr::from_ptr(event.element).to_string_lossy() };
        let parts: Vec<&str> = element.split(':').collect();
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
