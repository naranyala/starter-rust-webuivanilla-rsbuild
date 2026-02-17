# Build and Runtime Structure Review

## Build Tooling

- Rust: Cargo + `build.rs`
- Frontend: Bun + Rsbuild + custom `build-frontend.js`
- End-to-end: `run.sh` orchestrates prerequisites, frontend build, Rust build, and runtime checks

## Strengths

- Practical single-entry workflow for local development.
- Frontend incremental build path exists and is fast.

## Risks

- Multiple scripts overlap in responsibility (shell + JS orchestration).
- Naming inconsistency in scripts and comments can drift from actual framework choices.
