// infrastructure/persistence/sqlite/user_repository.rs
use std::sync::{Arc, Mutex};
use async_trait::async_trait;
use rusqlite::Connection;
use crate::core::domain::{user::{User, UserId, NewUser, Email, UserRole, UserStatus}, errors::DomainError};
use crate::core::ports::repository::UserRepository;

pub struct SqliteUserRepository {
    conn: Arc<Mutex<Connection>>,
}

impl SqliteUserRepository {
    pub fn new(conn: Arc<Mutex<Connection>>) -> Self {
        Self { conn }
    }
    
    pub fn init_schema(&self) -> Result<(), DomainError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                role TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Active',
                created_at TEXT NOT NULL
            )", [],
        ).map_err(|e| DomainError::from(e))?;
        Ok(())
    }
}

#[async_trait]
impl UserRepository for SqliteUserRepository {
    async fn get_all(&self) -> Result<Vec<User>, DomainError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, email, role, status, created_at FROM users ORDER BY id"
        ).map_err(|e| DomainError::from(e))?;
        
        let users = stmt.query_map([], |row| {
            let email_str: String = row.get(2)?;
            Ok(User {
                id: UserId(row.get(0)?),
                name: row.get(1)?,
                email: Email(email_str),
                role: UserRole::from_str(&row.get::<_, String>(3)?),
                status: UserStatus::from_str(&row.get::<_, String>(4)?),
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(5)?)
                    .unwrap()
                    .with_timezone(&chrono::Utc),
            })
        }).map_err(|e| DomainError::from(e))?;
        
        users.collect::<Result<Vec<_>, _>>()
            .map_err(|e| DomainError::from(e))
    }
    
    async fn get_by_id(&self, id: UserId) -> Result<User, DomainError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, email, role, status, created_at FROM users WHERE id = ?1"
        ).map_err(|e| DomainError::from(e))?;
        
        stmt.query_row([id.0], |row| {
            let email_str: String = row.get(2)?;
            Ok(User {
                id: UserId(row.get(0)?),
                name: row.get(1)?,
                email: Email(email_str),
                role: UserRole::from_str(&row.get::<_, String>(3)?),
                status: UserStatus::from_str(&row.get::<_, String>(4)?),
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(5)?)
                    .unwrap()
                    .with_timezone(&chrono::Utc),
            })
        }).map_err(|e| DomainError::from(e))
    }
    
    async fn create(&self, user: &NewUser) -> Result<UserId, DomainError> {
        let conn = self.conn.lock().unwrap();
        let created_at = chrono::Utc::now().to_rfc3339();
        
        conn.execute(
            "INSERT INTO users (name, email, role, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            [
                &user.name,
                &user.email.0,
                user.role.as_str(),
                UserStatus::Active.as_str(),
                &created_at,
            ],
        ).map_err(|e| DomainError::from(e))?;
        
        Ok(UserId(conn.last_insert_rowid()))
    }
    
    async fn update(&self, _user: &User) -> Result<(), DomainError> {
        // Implementation omitted for brevity
        Ok(())
    }
    
    async fn delete(&self, id: UserId) -> Result<(), DomainError> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM users WHERE id = ?1", [id.0])
            .map_err(|e| DomainError::from(e))?;
        Ok(())
    }
    
    async fn count(&self) -> Result<i64, DomainError> {
        let conn = self.conn.lock().unwrap();
        conn.query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
            .map_err(|e| DomainError::from(e))
    }
}
