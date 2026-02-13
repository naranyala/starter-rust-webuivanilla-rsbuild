// infrastructure/config/mod.rs
use serde::Deserialize;

#[derive(Debug, Deserialize, Clone)]
pub struct AppConfig {
    pub app: AppSettings,
    pub database: DatabaseSettings,
    pub window: WindowSettings,
    pub logging: LoggingSettings,
}

#[derive(Debug, Deserialize, Clone)]
pub struct AppSettings {
    pub name: String,
    pub version: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct DatabaseSettings {
    pub path: String,
    pub create_sample_data: Option<bool>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct WindowSettings {
    pub title: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct LoggingSettings {
    pub level: String,
    pub file: String,
    pub append: Option<bool>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            app: AppSettings {
                name: String::from("Rust WebUI Application"),
                version: String::from("1.0.0"),
            },
            database: DatabaseSettings {
                path: String::from("app.db"),
                create_sample_data: Some(true),
            },
            window: WindowSettings {
                title: String::from("Rust WebUI Application"),
                width: Some(1200),
                height: Some(800),
            },
            logging: LoggingSettings {
                level: String::from("info"),
                file: String::from("application.log"),
                append: Some(true),
            },
        }
    }
}

impl AppConfig {
    pub fn load() -> Result<Self, Box<dyn std::error::Error>> {
        let config_paths = ["app.config.toml", "./app.config.toml"];

        for path in &config_paths {
            if std::path::Path::new(path).exists() {
                let content = std::fs::read_to_string(path)?;
                return Ok(toml::from_str(&content)?);
            }
        }

        Ok(AppConfig::default())
    }
}
