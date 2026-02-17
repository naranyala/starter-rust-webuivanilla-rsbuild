// src/core/result.rs
// Result type for errors as values pattern

use std::fmt::Debug;

/// A Result type that embraces errors as values pattern
#[derive(Debug, Clone)]
pub enum Result<T, E> {
    Ok(T),
    Err(E),
}

impl<T, E> Result<T, E> {
    /// Returns true if the result is Ok
    pub fn is_ok(&self) -> bool {
        matches!(self, Result::Ok(_))
    }

    /// Returns true if the result is Err
    pub fn is_err(&self) -> bool {
        matches!(self, Result::Err(_))
    }

    /// Converts from &Result<T, E> to Result<&T, &E>
    pub fn as_ref(&self) -> Result<&T, &E> {
        match self {
            Result::Ok(t) => Result::Ok(t),
            Result::Err(e) => Result::Err(e),
        }
    }

    /// Maps a Result<T, E> to Result<U, E> by applying a function to a contained Ok value
    pub fn map<U, F>(self, op: F) -> Result<U, E>
    where
        F: FnOnce(T) -> U,
    {
        match self {
            Result::Ok(t) => Result::Ok(op(t)),
            Result::Err(e) => Result::Err(e),
        }
    }

    /// Maps a Result<T, E> to Result<T, F> by applying a function to a contained Err value
    pub fn map_err<F, O>(self, op: O) -> Result<T, F>
    where
        O: FnOnce(E) -> F,
    {
        match self {
            Result::Ok(t) => Result::Ok(t),
            Result::Err(e) => Result::Err(op(e)),
        }
    }

    /// Returns the contained Ok value
    /// Panics if the value is an Err
    pub fn unwrap(self) -> T
    where
        E: std::fmt::Debug,
    {
        match self {
            Result::Ok(t) => t,
            Result::Err(e) => panic!("unwrap called on Err: {:?}", e),
        }
    }

    /// Returns the contained Ok value or a provided default
    pub fn unwrap_or(self, default: T) -> T {
        match self {
            Result::Ok(t) => t,
            Result::Err(_) => default,
        }
    }

    /// Returns the contained Ok value or computes a default from the Err
    pub fn unwrap_or_else<F>(self, op: F) -> T
    where
        F: FnOnce(E) -> T,
    {
        match self {
            Result::Ok(t) => t,
            Result::Err(e) => op(e),
        }
    }

    /// Converts from Option<T> to Result<T, E>
    pub fn ok_or(self, err: E) -> Option<T> {
        match self {
            Result::Ok(t) => Some(t),
            Result::Err(_) => None,
        }
    }

    /// Calls op if the result is Ok, otherwise returns the Err value
    pub fn and_then<U, F>(self, op: F) -> Result<U, E>
    where
        F: FnOnce(T) -> Result<U, E>,
    {
        match self {
            Result::Ok(t) => op(t),
            Result::Err(e) => Result::Err(e),
        }
    }

    /// Calls op if the result is Err, otherwise returns the Ok value
    pub fn or_else<F>(self, op: F) -> Result<T, E>
    where
        F: FnOnce(E) -> Result<T, E>,
    {
        match self {
            Result::Ok(t) => Result::Ok(t),
            Result::Err(e) => op(e),
        }
    }

    /// Converts to a std::result::Result
    pub fn into_std(self) -> std::result::Result<T, E> {
        match self {
            Result::Ok(t) => std::result::Result::Ok(t),
            Result::Err(e) => std::result::Result::Err(e),
        }
    }
}

impl<T, E: Default + PartialEq> Result<T, E> {
    /// Returns the contained Ok value, or the default value of E
    pub fn ok_or_default(self) -> Option<T> {
        match self {
            Result::Ok(t) => Some(t),
            Result::Err(e) if e == E::default() => None,
            Result::Err(_) => None,
        }
    }
}

/// Extension trait for converting std::result::Result to our Result
pub trait IntoResult<T, E> {
    fn into_result(self) -> Result<T, E>;
}

impl<T, E> IntoResult<T, E> for std::result::Result<T, E> {
    fn into_result(self) -> Result<T, E> {
        match self {
            std::result::Result::Ok(t) => Result::Ok(t),
            std::result::Result::Err(e) => Result::Err(e),
        }
    }
}

/// Convenience macro for creating Ok results
#[macro_export]
macro_rules! ok {
    ($($arg:tt)*) => {
        $crate::core::result::Result::Ok($($arg)*)
    };
}

/// Convenience macro for creating Err results
#[macro_export]
macro_rules! err {
    ($($arg:tt)*) => {
        $crate::core::result::Result::Err($($arg)*)
    };
}
