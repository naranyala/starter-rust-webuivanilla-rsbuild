// platform/filesystem.rs
use std::path::Path;

pub struct FileSystem;

impl FileSystem {
    pub fn new() -> Self {
        Self
    }

    pub fn exists(&self, path: &str) -> bool {
        Path::new(path).exists()
    }
}
