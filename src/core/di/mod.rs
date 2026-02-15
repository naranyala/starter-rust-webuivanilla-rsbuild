// Compatibility DI facade.
pub use crate::di::ServiceProvider;

pub mod container {
    pub use crate::di::container::*;
}

pub mod module {
    pub use crate::di::module::*;
}
