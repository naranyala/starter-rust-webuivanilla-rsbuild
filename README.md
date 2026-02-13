# Rust WebUI Desktop Application

A production-ready desktop application framework that combines the raw performance of Rust with the flexibility of modern web technologies. This starter template delivers a complete full-stack desktop architecture where Rust powers the backend logic and data management, while a Vue.js frontend renders in a native window through WebUI.

## Why This Project?

Building desktop applications has traditionally meant choosing between performance (Electron apps that eat memory) or complexity (Qt, GTK requiring steep learning curves). This project solves that trade-off by leveraging WebUI - a lightweight framework that embeds a webview directly into your Rust application without the overhead of Electron.

The result is a native desktop application that:
- Launches in milliseconds, not seconds
- Consumes minimal memory (typically under 50MB)
- Produces a single statically-linked binary
- Gives you full control over both frontend and backend

## What You Get Out of the Box

This starter template ships with everything you need to build serious desktop applications:

**Backend (Rust)**
- WebUI integration for native webview rendering
- SQLite database with full CRUD operations
- Dependency injection container for clean architecture
- Structured logging with configurable levels
- System information monitoring (CPU, memory, disk)
- HTTP client for external API integration

**Frontend (Vue.js + TypeScript)**
- Modern reactive UI built with Vue 3
- TypeScript support for type-safe code
- Rsbuild for fast builds and hot reload
- WinBox integration for floating windows
- Clean component architecture

**Build System**
- Single-command build process
- Statically-linked release binary
- Automated frontend asset processing
- Distribution packaging for Linux

## Project Structure

The project follows a clean layered architecture that separates concerns and makes the codebase easy to navigate as it grows.

### Root Directory

```
starter-rust-webuivanilla-rsbuild/
├── Cargo.toml                 # Rust project manifest and dependencies
├── Cargo.lock                # Locked dependency versions
├── build.rs                  # Build script for C dependencies
├── app.config.toml           # Application configuration
├── run.sh                    # Main build and run script
├── build-frontend.js         # Frontend build orchestrator
├── build-dist.sh             # Distribution package builder
│
├── src/                      # Rust backend source
├── frontend/                 # Vue.js frontend source
├── thirdparty/               # WebUI C library
├── static/                  # Runtime static assets
└── docs/                    # Documentation
```

### Rust Backend (src/)

The backend follows domain-driven design principles with clear separation between infrastructure, application logic, and utilities.

```
src/
├── main.rs                   # Application entry point and WebUI initialization
│
├── core/                    # Core domain layer
│   ├── domain/              # Domain entities and value objects
│   │   ├── user.rs         # User entity with validation
│   │   ├── errors.rs       # Domain error types
│   │   ├── events.rs       # Domain events
│   │   └── mod.rs
│   ├── ports/              # Interface definitions (traits)
│   │   ├── repository.rs   # Data access interface
│   │   ├── logger.rs       # Logging interface
│   │   ├── notification.rs # Notification interface
│   │   ├── event_bus.rs    # Event handling interface
│   │   └── mod.rs
│   └── services/           # Domain services
│       ├── user_service.rs  # User business logic
│       └── mod.rs
│
├── application/            # Application layer (use cases)
│   ├── commands/          # Command handlers (write operations)
│   │   ├── create_user.rs
│   │   ├── delete_user.rs
│   │   └── mod.rs
│   ├── queries/           # Query handlers (read operations)
│   │   ├── get_users.rs
│   │   ├── get_user_by_id.rs
│   │   └── mod.rs
│   └── mod.rs
│
├── infrastructure/         # Infrastructure layer
│   ├── mod.rs
│   ├── config/            # TOML configuration parser
│   │   └── mod.rs         # AppConfig with typed access
│   ├── database/          # SQLite abstraction
│   │   └── mod.rs         # Database struct with CRUD
│   ├── di/                # Dependency injection
│   │   └── mod.rs         # ServiceProvider container
│   ├── web/               # WebUI integration
│   │   ├── mod.rs
│   │   ├── handlers/      # Event handlers
│   │   │   ├── mod.rs
│   │   │   ├── user_handlers.rs   # User CRUD handlers
│   │   │   ├── ui_handlers.rs     # UI event handlers
│   │   │   └── mod.rs
│   │   └── dto.rs        # Data transfer objects
│   └── logging/           # Logging setup
│       └── mod.rs
│
├── platform/             # Platform-specific utilities
│   ├── mod.rs
│   ├── filesystem.rs     # File operations
│   ├── process.rs        # Process management
│   └── mod.rs
│
└── di/                   # DI module exports
    └── mod.rs
```

### Frontend (frontend/)

The frontend uses Vue 3 with TypeScript, built with Rsbuild for optimal performance during development and production.

```
frontend/
├── package.json           # Node.js dependencies
├── tsconfig.json          # TypeScript configuration
├── rsbuild.config.ts      # Production build config
├── rsbuild.config.dev.ts  # Development build config
├── biome.json             # Linter configuration
├── index.html             # HTML template
│
└── src/
    ├── main.ts            # Application entry point
    ├── app.ts             # App initialization
    │
    ├── lib/               # Core utilities
    │   ├── index.js       # Library exports
    │   ├── di.js          # Dependency injection
    │   ├── logger.js      # Logging utility
    │   └── webui-bridge.js # Rust-JavaScript bridge
    │
    ├── use-cases/         # Feature components
    │   └── App.vue        # Root Vue component with dashboard
    │
    ├── components/        # Reusable components
    │
    └── types/             # TypeScript definitions
```

### Third-Party Dependencies (thirdparty/)

```
thirdparty/
└── webui-c-src/          # WebUI C library
    ├── include/           # C header files
    └── src/               # C source files
```

## Understanding the Architecture

This application implements a layered architecture that makes it easy to understand, test, and extend.

### Layer 1: Presentation (Vue.js Frontend)

The frontend handles all user interactions and visual presentation. It communicates with Rust through the WebUI bridge, sending commands and receiving responses via custom events. The WinBox integration provides floating window capabilities for a multi-window desktop experience.

### Layer 2: Communication (WebUI Bridge)

WebUI creates a bidirectional bridge between JavaScript and Rust. Frontend code calls Rust functions directly, and Rust can push updates to the frontend through JavaScript execution. This bridge is type-safe and efficient, avoiding the overhead of HTTP calls.

### Layer 3: Application (Handlers)

Handlers in the infrastructure layer receive events from the frontend, orchestrate domain logic, and send responses back. They act as the application layer, translating between the presentation format and domain objects.

### Layer 4: Domain (Core Services)

Domain services contain pure business logic. The user service, for example, handles user-related operations without knowing how data is stored or how results are presented.

### Layer 5: Infrastructure

Infrastructure implementations provide concrete functionality: SQLite for persistence, configuration parsing, logging, and dependency injection. These are injected into services through constructor parameters.

## Communication Flow

### Calling Rust from JavaScript

The frontend invokes Rust functions through the WebUI bridge:

```javascript
// Frontend code
window.getUsers();  // Calls the bound Rust handler
```

```rust
// Rust handler
create_window.bind("get_users", |event| {
    let users = db.get_all_users()?;
    // Send response back to JavaScript
    let response = serde_json::json!({"data": users, "success": true});
    send_response(window, "db_response", response);
});
```

### Receiving Responses in JavaScript

```javascript
window.addEventListener('db_response', (event) => {
    const { success, data } = event.detail;
    if (success) {
        updateUserList(data);
    }
});
```

## Configuration

Application behavior is controlled through `app.config.toml`:

```toml
[app]
name = "Rust WebUI Application"
version = "1.0.0"

[database]
path = "app.db"
create_sample_data = true

[window]
title = "Rust WebUI Application"
width = 1200
height = 800

[logging]
level = "info"
file = "application.log"

[features]
dark_mode = true
```

## Building and Running

### Development Mode

```bash
./run.sh
```

This builds both Rust and frontend, then launches the application.

### Release Build

```bash
./run.sh --release
```

### Frontend Only

```bash
./run.sh --build-frontend
```

### Create Distribution Package

```bash
./build-dist.sh
```

This produces a distributable package in the `dist/` directory containing the binary, configuration, database, and frontend assets.

## Dependencies

### Rust (Cargo.toml)

| Crate | Purpose |
|-------|---------|
| webui-rs | WebUI framework Rust bindings |
| rusqlite | SQLite database with bundled library |
| serde/serde_json | Serialization framework |
| chrono | Date and time handling |
| log/env_logger | Logging infrastructure |
| sysinfo | System information retrieval |
| reqwest | HTTP client |
| tokio | Async runtime |
| tao | Alternative window management |

### Frontend (package.json)

| Package | Purpose |
|---------|---------|
| winbox | Window management library |
| @rsbuild/core | Build tooling |
| vue | Reactive UI framework |
| typescript | Type checking |

## Why This Architecture Works

This architecture gives you the best of both worlds: Rust's performance and safety for backend logic, and the vast ecosystem of web technologies for your user interface. The layered design means you can swap components as requirements change - swap SQLite for PostgreSQL, or Vue for React - without rewriting your entire application.

The WebUI approach produces binaries that are dramatically smaller than Electron apps (typically under 10MB versus hundreds of MB), launch significantly faster, and use a fraction of the memory. For applications that need native desktop capabilities but want to avoid the Electron tax, this architecture provides an compelling alternative.

## Extending the Application

Adding new features follows a consistent pattern:

1. **Domain**: Define entities and business rules in `src/core/domain/`
2. **Ports**: Create interfaces in `src/core/ports/`
3. **Services**: Implement business logic in `src/core/services/`
4. **Handlers**: Wire up WebUI handlers in `src/infrastructure/web/handlers/`
5. **Frontend**: Add Vue components in `frontend/src/`

The dependency injection container makes it simple to register new services and have them available throughout the application.

## License

This project provides a foundation for building desktop applications. Modify and distribute as needed.
