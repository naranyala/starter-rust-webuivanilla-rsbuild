// src/features/user/plugin.rs
// User Plugin implementation

use crate::core::mvvm::ViewModel;
use crate::plugins::{Plugin, PluginError};
use std::any::Any;
use std::result::Result as StdResult;
use std::sync::Arc;

use super::viewmodel::{SharedUserViewModel, UserViewModel};

pub struct UserPlugin {
    viewmodel: SharedUserViewModel,
}

impl UserPlugin {
    pub fn new() -> Self {
        Self {
            viewmodel: Arc::new(UserViewModel::new()),
        }
    }

    pub fn viewmodel(&self) -> SharedUserViewModel {
        self.viewmodel.clone()
    }
}

impl Default for UserPlugin {
    fn default() -> Self {
        Self::new()
    }
}

impl Plugin for UserPlugin {
    fn name(&self) -> &str {
        "user"
    }

    fn version(&self) -> &str {
        "1.0.0"
    }

    fn initialize(&self) -> StdResult<(), PluginError> {
        Ok(())
    }

    fn shutdown(&self) -> StdResult<(), PluginError> {
        Ok(())
    }

    fn as_any(&self) -> &dyn Any {
        self
    }
}
