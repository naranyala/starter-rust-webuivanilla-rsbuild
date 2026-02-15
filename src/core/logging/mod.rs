// Core logging - logging utilities (with re-exports for compatibility)
pub use crate::model::ports::logger;

use crate::core::ports::logger::{ContextualLogger, LogLevel, Logger};
use chrono::Local;
use log::{debug, error, info, warn, Level, LevelFilter};
use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
use std::sync::Arc;

pub struct StructuredLogger {
    level: LogLevel,
    service_name: String,
    log_file: Option<PathBuf>,
}

pub struct StructuredContextualLogger {
    inner: Arc<StructuredLogger>,
    context: String,
}

impl StructuredLogger {
    pub fn new(level: LogLevel, service_name: &str) -> Self {
        Self {
            level,
            service_name: service_name.to_string(),
            log_file: None,
        }
    }

    pub fn with_default_config(service_name: &str) -> Self {
        Self::new(LogLevel::Info, service_name)
    }

    pub fn init(&mut self, log_dir: Option<PathBuf>) -> Result<(), Box<dyn std::error::Error>> {
        let filter = match self.level {
            LogLevel::Trace => LevelFilter::Trace,
            LogLevel::Debug => LevelFilter::Debug,
            LogLevel::Info => LevelFilter::Info,
            LogLevel::Warn => LevelFilter::Warn,
            LogLevel::Error => LevelFilter::Error,
        };

        env_logger::Builder::new()
            .filter_level(filter)
            .format(|buf, record| {
                writeln!(
                    buf,
                    "[{} {} {}:{}] {}",
                    Local::now().format("%Y-%m-%d %H:%M:%S%.3f"),
                    record.level(),
                    record.file().unwrap_or("unknown"),
                    record.line().unwrap_or(0),
                    record.args()
                )
            })
            .try_init()
            .ok();

        if let Some(ref dir) = log_dir {
            let logs_dir = dir.join("logs");
            std::fs::create_dir_all(&logs_dir)?;
            self.log_file = Some(logs_dir.join(format!("{}.log", self.service_name)));

            info!(
                "Logging initialized: level={:?}, log_dir={}",
                self.level,
                logs_dir.display()
            );
        }

        Ok(())
    }

    fn write_to_file(&self, message: &str) {
        if let Some(ref file) = self.log_file {
            if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(file) {
                let _ = writeln!(
                    f,
                    "[{}] {}",
                    Local::now().format("%Y-%m-%d %H:%M:%S%.3f"),
                    message
                );
            }
        }
    }
}

impl Logger for StructuredLogger {
    fn debug(&self, message: &str) {
        let msg = format!("[{}] DEBUG: {}", self.service_name, message);
        debug!("{}", message);
        self.write_to_file(&msg);
    }

    fn info(&self, message: &str) {
        let msg = format!("[{}] INFO: {}", self.service_name, message);
        info!("{}", message);
        self.write_to_file(&msg);
    }

    fn warn(&self, message: &str) {
        let msg = format!("[{}] WARN: {}", self.service_name, message);
        warn!("{}", message);
        self.write_to_file(&msg);
    }

    fn error(&self, message: &str) {
        let msg = format!("[{}] ERROR: {}", self.service_name, message);
        error!("{}", message);
        self.write_to_file(&msg);
    }

    fn trace(&self, message: &str) {
        let msg = format!("[{}] TRACE: {}", self.service_name, message);
        log::trace!("{}", message);
        self.write_to_file(&msg);
    }
}

impl Clone for StructuredLogger {
    fn clone(&self) -> Self {
        Self {
            level: self.level.clone(),
            service_name: self.service_name.clone(),
            log_file: self.log_file.clone(),
        }
    }
}

impl ContextualLogger for StructuredContextualLogger {
    fn debug(&self, message: &str) {
        debug!(
            "[{}] [{}] {}",
            self.inner.service_name, self.context, message
        );
    }

    fn info(&self, message: &str) {
        info!(
            "[{}] [{}] {}",
            self.inner.service_name, self.context, message
        );
    }

    fn warn(&self, message: &str) {
        warn!(
            "[{}] [{}] {}",
            self.inner.service_name, self.context, message
        );
    }

    fn error(&self, message: &str) {
        error!(
            "[{}] [{}] {}",
            self.inner.service_name, self.context, message
        );
    }
}

impl StructuredContextualLogger {
    fn new(inner: Arc<StructuredLogger>, context: &str) -> Self {
        Self {
            inner,
            context: context.to_string(),
        }
    }
}

pub struct BuildLogger {
    log_file: PathBuf,
}

impl BuildLogger {
    pub fn new(log_dir: PathBuf) -> Self {
        std::fs::create_dir_all(&log_dir).ok();
        let log_file = log_dir.join(format!(
            "build_{}.log",
            Local::now().format("%Y%m%d_%H%M%S")
        ));
        Self { log_file }
    }

    pub fn log(&self, level: &str, message: &str) {
        let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
        let entry = format!("[{}] [{}] {}\n", timestamp, level.to_uppercase(), message);

        if let Ok(mut file) = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.log_file)
        {
            let _ = file.write_all(entry.as_bytes());
        }

        match level {
            "error" => eprintln!(
                "\x1b[31m[{}] [{}] {}\x1b[0m",
                timestamp,
                level.to_uppercase(),
                message
            ),
            "warn" => println!(
                "\x1b[33m[{}] [{}] {}\x1b[0m",
                timestamp,
                level.to_uppercase(),
                message
            ),
            "info" => println!("[{}] [{}] {}", timestamp, level.to_uppercase(), message),
            "debug" => println!(
                "\x1b[90m[{}] [{}] {}\x1b[0m",
                timestamp,
                level.to_uppercase(),
                message
            ),
            _ => println!("[{}] [{}] {}", timestamp, level.to_uppercase(), message),
        }
    }

    pub fn get_log_path(&self) -> &PathBuf {
        &self.log_file
    }
}