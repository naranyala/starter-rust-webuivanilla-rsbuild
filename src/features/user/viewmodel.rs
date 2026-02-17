// src/features/user/viewmodel.rs
// User ViewModel

use crate::core::mvvm::{ViewModel, ViewModelError, ViewModelState};
use serde_json::{json, Value};
use std::result::Result as StdResult;
use std::sync::{Arc, RwLock};

use super::model::{Email, NewUser, User, UserId, UserRole, UserStatus};

pub struct UserViewModel {
    state: RwLock<ViewModelState>,
    users: RwLock<Vec<User>>,
    current_user_id: RwLock<Option<UserId>>,
}

impl UserViewModel {
    pub fn new() -> Self {
        Self {
            state: RwLock::new(ViewModelState::Initial),
            users: RwLock::new(Vec::new()),
            current_user_id: RwLock::new(None),
        }
    }

    pub fn set_state(&self, state: ViewModelState) {
        let mut s = self.state.write().unwrap();
        *s = state;
    }

    pub fn get_users(&self) -> Vec<User> {
        self.users.read().unwrap().clone()
    }

    pub fn add_user(&self, user: User) {
        self.users.write().unwrap().push(user);
    }

    pub fn find_by_id(&self, id: &UserId) -> Option<User> {
        self.users
            .read()
            .unwrap()
            .iter()
            .find(|u| &u.id == id)
            .cloned()
    }

    pub fn create_user(
        &self,
        name: &str,
        email: &str,
        role: &str,
    ) -> StdResult<User, ViewModelError> {
        let email =
            Email::new(email).map_err(|e| ViewModelError::ExecutionFailed(e.to_string()))?;

        let role = match role {
            "admin" => UserRole::Admin,
            "editor" => UserRole::Editor,
            "user" => UserRole::User,
            _ => UserRole::Guest,
        };

        let new_user = NewUser {
            name: name.to_string(),
            email,
            role,
        };

        let id = UserId(self.users.read().unwrap().len() as i64 + 1);
        let user = User::new(id, new_user);

        self.add_user(user.clone());

        Ok(user)
    }
}

impl Default for UserViewModel {
    fn default() -> Self {
        Self::new()
    }
}

impl ViewModel for UserViewModel {
    fn name(&self) -> &str {
        "UserViewModel"
    }

    fn state(&self) -> ViewModelState {
        self.state.read().unwrap().clone()
    }

    fn handle_command(&self, command: &str, payload: &str) -> StdResult<String, ViewModelError> {
        match command {
            "create_user" => {
                let data: Value = serde_json::from_str(payload)
                    .map_err(|e| ViewModelError::InvalidCommand(e.to_string()))?;

                let name = data["name"].as_str().unwrap_or("Unknown");
                let email = data["email"].as_str().unwrap_or("unknown@example.com");
                let role = data["role"].as_str().unwrap_or("user");

                let user = self.create_user(name, email, role)?;

                Ok(serde_json::to_string(&json!({
                    "success": true,
                    "user": {
                        "id": user.id.0,
                        "name": user.name,
                        "email": user.email.as_str(),
                        "role": user.role.to_string(),
                        "status": user.status.to_string(),
                    }
                }))
                .unwrap())
            }
            "delete_user" => {
                let data: Value = serde_json::from_str(payload)
                    .map_err(|e| ViewModelError::InvalidCommand(e.to_string()))?;

                let id = data["id"].as_i64().unwrap_or(0);
                let user_id = UserId(id);

                let mut users = self.users.write().unwrap();
                users.retain(|u| u.id != user_id);

                Ok(serde_json::to_string(&json!({"success": true})).unwrap())
            }
            "activate_user" => {
                let data: Value = serde_json::from_str(payload)
                    .map_err(|e| ViewModelError::InvalidCommand(e.to_string()))?;

                let id = data["id"].as_i64().unwrap_or(0);
                let user_id = UserId(id);

                if let Some(user) = self.find_by_id(&user_id) {
                    let mut users = self.users.write().unwrap();
                    if let Some(u) = users.iter_mut().find(|u| u.id == user_id) {
                        u.activate();
                    }
                    Ok(serde_json::to_string(&json!({"success": true})).unwrap())
                } else {
                    Err(ViewModelError::NotFound(format!("User {}", id)))
                }
            }
            _ => Err(ViewModelError::InvalidCommand(format!(
                "Unknown command: {}",
                command
            ))),
        }
    }

    fn handle_query(&self, query: &str, params: &[String]) -> StdResult<String, ViewModelError> {
        match query {
            "get_users" => {
                let users = self.get_users();
                let user_list: Vec<Value> = users
                    .iter()
                    .map(|u| {
                        json!({
                            "id": u.id.0,
                            "name": u.name,
                            "email": u.email.as_str(),
                            "role": u.role.to_string(),
                            "status": u.status.to_string(),
                            "created_at": u.created_at.to_rfc3339(),
                        })
                    })
                    .collect();

                Ok(serde_json::to_string(&json!({
                    "success": true,
                    "users": user_list,
                    "count": user_list.len(),
                }))
                .unwrap())
            }
            "get_user_by_id" => {
                let id = params
                    .first()
                    .and_then(|s| s.parse::<i64>().ok())
                    .unwrap_or(0);

                if let Some(user) = self.find_by_id(&UserId(id)) {
                    Ok(serde_json::to_string(&json!({
                        "success": true,
                        "user": {
                            "id": user.id.0,
                            "name": user.name,
                            "email": user.email.as_str(),
                            "role": user.role.to_string(),
                            "status": user.status.to_string(),
                        }
                    }))
                    .unwrap())
                } else {
                    Err(ViewModelError::NotFound(format!("User {}", id)))
                }
            }
            _ => Err(ViewModelError::InvalidQuery(format!(
                "Unknown query: {}",
                query
            ))),
        }
    }
}

pub type SharedUserViewModel = Arc<UserViewModel>;

pub fn create_user_viewmodel() -> SharedUserViewModel {
    Arc::new(UserViewModel::new())
}
