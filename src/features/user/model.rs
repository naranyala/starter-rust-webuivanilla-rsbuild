// src/features/user/model.rs
// User domain model

use crate::core::mvvm::{Entity, ValueObject};
use chrono::{DateTime, Utc};
use std::sync::Arc;

#[derive(Debug, Clone, PartialEq)]
pub struct UserId(pub i64);

impl std::fmt::Display for UserId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum UserRole {
    Admin,
    Editor,
    User,
    Guest,
}

impl std::fmt::Display for UserRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            UserRole::Admin => write!(f, "Admin"),
            UserRole::Editor => write!(f, "Editor"),
            UserRole::User => write!(f, "User"),
            UserRole::Guest => write!(f, "Guest"),
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum UserStatus {
    Active,
    Inactive,
    Pending,
    Suspended,
}

impl std::fmt::Display for UserStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            UserStatus::Active => write!(f, "Active"),
            UserStatus::Inactive => write!(f, "Inactive"),
            UserStatus::Pending => write!(f, "Pending"),
            UserStatus::Suspended => write!(f, "Suspended"),
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct Email(String);

impl Email {
    pub fn new(s: &str) -> Result<Self, EmailError> {
        if s.contains('@') && s.contains('.') {
            Ok(Email(s.to_string()))
        } else {
            Err(EmailError::InvalidFormat(s.to_string()))
        }
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[derive(Debug)]
pub enum EmailError {
    InvalidFormat(String),
}

impl std::fmt::Display for EmailError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EmailError::InvalidFormat(s) => write!(f, "Invalid email format: {}", s),
        }
    }
}

impl ValueObject for Email {
    type ValidationError = EmailError;
    fn validate(&self) -> Result<(), Self::ValidationError> {
        Email::new(self.0.as_str()).map(|_| ()).map_err(|e| e)
    }
}

#[derive(Debug, Clone)]
pub struct NewUser {
    pub name: String,
    pub email: Email,
    pub role: UserRole,
}

#[derive(Debug, Clone)]
pub struct User {
    pub id: UserId,
    pub name: String,
    pub email: Email,
    pub role: UserRole,
    pub status: UserStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Entity for User {
    type Id = UserId;

    fn id(&self) -> &Self::Id {
        &self.id
    }

    fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }
}

impl User {
    pub fn new(id: UserId, data: NewUser) -> Self {
        let now = Utc::now();
        User {
            id,
            name: data.name,
            email: data.email,
            role: data.role,
            status: UserStatus::Pending,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn activate(&mut self) {
        self.status = UserStatus::Active;
        self.updated_at = Utc::now();
    }

    pub fn deactivate(&mut self) {
        self.status = UserStatus::Inactive;
        self.updated_at = Utc::now();
    }
}
