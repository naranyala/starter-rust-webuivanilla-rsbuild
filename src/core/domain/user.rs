// core/domain/user.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: UserId,
    pub name: String,
    pub email: Email,
    pub role: UserRole,
    pub status: UserStatus,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct UserId(pub i64);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewUser {
    pub name: String,
    pub email: Email,
    pub role: UserRole,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Email(pub String);

impl Email {
    pub fn new(email: &str) -> Result<Self, String> {
        if email.contains('@') {
            Ok(Email(email.to_string()))
        } else {
            Err("Invalid email format".to_string())
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum UserRole {
    Admin,
    User,
    Guest,
}

impl UserRole {
    pub fn as_str(&self) -> &'static str {
        match self {
            UserRole::Admin => "Admin",
            UserRole::User => "User",
            UserRole::Guest => "Guest",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "Admin" => UserRole::Admin,
            "Guest" => UserRole::Guest,
            _ => UserRole::User,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum UserStatus {
    Active,
    Inactive,
    Suspended,
}

impl UserStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            UserStatus::Active => "Active",
            UserStatus::Inactive => "Inactive",
            UserStatus::Suspended => "Suspended",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "Inactive" => UserStatus::Inactive,
            "Suspended" => UserStatus::Suspended,
            _ => UserStatus::Active,
        }
    }
}

impl User {
    pub fn create(new_user: NewUser) -> Result<Self, String> {
        Ok(User {
            id: UserId(0),
            name: new_user.name,
            email: new_user.email,
            role: new_user.role,
            status: UserStatus::Active,
            created_at: Utc::now(),
        })
    }
}
