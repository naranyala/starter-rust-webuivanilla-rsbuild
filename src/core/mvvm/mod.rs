// src/core/mvvm/mod.rs
// MVVM base structures for backend

pub mod model;
pub mod viewmodel;

pub use model::{DomainModel, Entity, ValueObject};
pub use viewmodel::{ViewModel, ViewModelError, ViewModelState};
