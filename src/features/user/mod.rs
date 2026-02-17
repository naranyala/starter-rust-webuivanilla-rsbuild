// src/features/user/mod.rs
// User feature module

pub mod model;
pub mod viewmodel;
pub mod plugin;

pub use model::{User, UserId, UserRole, UserStatus, NewUser, Email};
pub use viewmodel::UserViewModel;
pub use plugin::UserPlugin;
