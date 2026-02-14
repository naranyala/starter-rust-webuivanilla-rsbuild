// infrastructure/web/logging.rs
use log::{debug, error, info, warn};
use std::time::Instant;

pub struct RequestLogger {
    handler_name: String,
    start_time: Instant,
}

impl RequestLogger {
    pub fn new(handler_name: &str) -> Self {
        let logger = Self {
            handler_name: handler_name.to_string(),
            start_time: Instant::now(),
        };
        info!("[{}] Handler invoked", handler_name);
        logger
    }

    pub fn success(&self, message: &str) {
        let duration = self.start_time.elapsed();
        info!(
            "[{}] {} ({}ms)",
            self.handler_name,
            message,
            duration.as_millis()
        );
    }

    pub fn failure(&self, err_msg: &str) {
        let duration = self.start_time.elapsed();
        error!(
            "[{}] Handler failed: {} ({}ms)",
            self.handler_name,
            err_msg,
            duration.as_millis()
        );
    }

    pub fn debug(&self, message: &str) {
        let duration = self.start_time.elapsed();
        debug!(
            "[{}] {} ({}ms)",
            self.handler_name,
            message,
            duration.as_millis()
        );
    }
}

#[macro_export]
macro_rules! log_handler {
    ($name:expr) => {
        RequestLogger::new($name)
    };
    ($name:expr, $msg:expr) => {{
        let logger = RequestLogger::new($name);
        logger.success($msg);
        logger
    }};
}

#[macro_export]
macro_rules! log_handler_error {
    ($logger:expr, $error:expr) => {{
        $logger.failure(&$error.to_string());
    }};
}

pub struct BuildMetrics {
    pub start_time: Instant,
    pub phases: Vec<BuildPhase>,
}

pub struct BuildPhase {
    pub name: String,
    pub start: Instant,
    pub end: Option<Instant>,
    pub status: PhaseStatus,
}

#[derive(Clone, Debug)]
pub enum PhaseStatus {
    Pending,
    Running,
    Success,
    Failed(String),
}

impl BuildMetrics {
    pub fn new() -> Self {
        Self {
            start_time: Instant::now(),
            phases: Vec::new(),
        }
    }

    pub fn start_phase(&mut self, name: &str) {
        self.phases.push(BuildPhase {
            name: name.to_string(),
            start: Instant::now(),
            end: None,
            status: PhaseStatus::Running,
        });
    }

    pub fn end_phase(&mut self, name: &str, success: bool, error_msg: Option<&str>) {
        if let Some(phase) = self.phases.iter_mut().find(|p| p.name == name) {
            phase.end = Some(Instant::now());
            phase.status = if success {
                PhaseStatus::Success
            } else {
                PhaseStatus::Failed(error_msg.unwrap_or("Unknown error").to_string())
            };
        }
    }

    pub fn summary(&self) -> String {
        let total = self.start_time.elapsed();
        let mut summary = format!("Build completed in {:.2}s\n", total.as_secs_f64());

        for phase in &self.phases {
            let duration = phase
                .end
                .map(|e| e.duration_since(phase.start).as_millis())
                .unwrap_or(0);

            let status = match &phase.status {
                PhaseStatus::Success => "✓",
                PhaseStatus::Failed(_) => "✗",
                PhaseStatus::Running => "⟳",
                PhaseStatus::Pending => "○",
            };

            summary.push_str(&format!("  {} {} ({}ms)\n", status, phase.name, duration));
        }

        summary
    }
}

impl Default for BuildMetrics {
    fn default() -> Self {
        Self::new()
    }
}
