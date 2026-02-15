# Rust WebUI Desktop App: Structure Review and Improvement Plan

## Project Summary
This repository is a Rust desktop application using `webui-rs` with a vanilla TypeScript frontend built by Rsbuild and Bun. The current codebase contains both a canonical MVVM path and several compatibility layers kept for migration safety.

This document replaces the previous README with an accurate assessment of the current structure and a project-structure-focused improvement plan.

## Quick Structural Judgment
Overall assessment: **usable, but transitional and over-layered**.

What is strong:
- Clear intent to move toward MVVM and layered boundaries.
- Frontend and backend are separated cleanly at the top level.
- Build and run workflows are scripted and reproducible.
- Compatibility shims reduce immediate breakage during refactor.

What is weak:
- Multiple parallel module surfaces in Rust (`core`, `model`, `mvvm`, `viewmodel`, `infrastructure`) create cognitive overhead.
- Some modules are thin re-export facades rather than functional domains.
- Naming and structure in README/history are partially out of sync with real implementation.
- Empty or placeholder directories exist and blur ownership.
- Third-party source vendoring and local examples increase repo noise without clear boundary docs.

## Current Top-Level Layout

```text
.
├── src/                    Rust application and architecture layers
├── frontend/               Vanilla TS frontend (Rsbuild + Bun)
├── thirdparty/             Vendored WebUI C source
├── examples/               Local example crate(s)
├── docs/                   Currently minimal
├── static/                 Runtime/static assets (minimal currently)
├── run.sh                  Main build/run orchestrator
├── build-frontend.js       Frontend build orchestrator
├── build-dist.sh           Distribution helper
├── post-build.sh           Post-build integration steps
├── app.config.toml         Runtime config
├── Cargo.toml              Rust dependencies and features
└── README.md
```

## Rust Structure Review (`src/`)

### Current Module Surfaces

```text
src/
├── main.rs
├── application/
├── core/
├── di/
├── infrastructure/
├── model/
├── mvvm/
├── platform/
├── view/
└── viewmodel/
```

### Observed Pattern
- `model/`, `view/`, and `viewmodel/` look like the intended canonical runtime layers.
- `mvvm/` mostly re-exports those canonical modules.
- `core/` and `infrastructure/` contain compatibility and re-export surfaces, some mapping to `model` or `viewmodel`.
- `infrastructure/web/handlers/*` re-export `viewmodel/bindings/*`, so both namespaces coexist.

### Practical Impact
- Good for short-term compatibility.
- Expensive for navigation and onboarding: the same concept may exist in several paths.
- Increases risk of duplicated updates or stale mirrors.

## Frontend Structure Review (`frontend/src/`)

### Current Shape

```text
frontend/src/
├── App.ts
├── main.ts
├── lib/
├── mvvm/
│   ├── model/
│   ├── shared/
│   ├── view/
│   └── viewmodel/
├── types/
└── use-cases/   (currently empty)
```

### Observed Pattern
- `App.ts` is currently the real UI composition center.
- `mvvm/*` in frontend is largely a canonical export layer redirecting to `App.ts` and `lib/*`.
- This mirrors Rust’s transitional structure: useful, but not fully normalized yet.

### Practical Impact
- Easy to run and modify today.
- Harder to reason about strict MVVM ownership because boundaries are still wrapper-oriented.

## Build and Runtime Structure Review

### Build Tooling
- Rust: Cargo + `build.rs`.
- Frontend: Bun + Rsbuild + custom `build-frontend.js`.
- End-to-end: `run.sh` orchestrates prerequisites, frontend build, Rust build, and runtime checks.

### Strengths
- Practical single-entry workflow for local development.
- Frontend incremental build path exists and is fast.

### Risks
- Multiple scripts overlap in responsibility (shell + JS orchestration).
- Naming inconsistency in scripts and comments can drift from actual framework choices.

## Structural Debt Inventory

1. Namespace duplication in Rust
- Similar capabilities are exposed under `core/*`, `model/*`, `mvvm/*`, and `infrastructure/*` compatibility facades.

2. Dual handler paths
- `src/viewmodel/bindings/*` appears canonical while `src/infrastructure/web/handlers/*` forwards/re-exports.

3. Transitional frontend MVVM wrappers
- `frontend/src/mvvm/*` currently behaves mostly as export indirection.

4. Placeholder directories
- Some directories are present with little or no concrete ownership yet (`docs/`, parts of `view/`, `use-cases/`).

5. Repo noise around vendored/auxiliary code
- `thirdparty/webui-c-src` and local examples are useful, but should be clearly separated from app architecture docs.

## Recommended Target Structure (Project-Structure Focus)

This is a suggested end-state for clearer ownership while keeping MVVM intent.

```text
src/
├── main.rs
├── shared/                 cross-cutting config/logging/ports/di
├── model/                  entities, repositories, domain services
├── viewmodel/              commands, queries, UI bindings/adapters
├── view/                   UI-facing Rust assets/integration glue
└── platform/               OS/filesystem/process abstractions

frontend/src/
├── main.ts
├── app/
│   ├── App.ts
│   ├── layout/
│   ├── components/
│   └── styles/
├── viewmodel/
├── model/
├── shared/
└── bridge/                 webui bridge + transport state
```

Notes:
- Keep only one canonical path per concern.
- Keep compatibility re-exports temporarily, but isolate and mark them deprecated.

## Potential Improvements (Project Structure)

1. Define a single canonical Rust layer map
- Decide whether canonical ownership is `mvvm/*` or `model/viewmodel/view/*` and document it.
- Keep all other paths explicitly marked as compatibility-only.

2. Collapse compatibility facades behind one migration boundary
- Move re-export-only modules into a dedicated `src/compat/` subtree.
- Prevent new feature work from landing in compatibility paths.

3. Normalize handler ownership
- Keep binding handlers in one place only (prefer `src/viewmodel/bindings/*`).
- Leave forwarding modules minimal and temporary.

4. Tighten frontend MVVM folder semantics
- If `frontend/src/mvvm/*` is canonical, move concrete implementations there.
- If not, rename wrappers to `compat/` and keep real code in explicit feature folders.

5. Introduce ownership docs by directory
- Add short `README.md` files inside key folders (`src/model`, `src/viewmodel`, `frontend/src/app`) defining allowed contents.

6. Separate product code from vendored/reference code
- Keep `thirdparty/` and `examples/` but document them as external/reference zones not part of main architecture.

7. Remove or fill placeholder directories
- Delete empty structural placeholders or add minimal real modules to justify them.

8. Align naming and comments with actual stack
- Replace historical references that still mention outdated frontend stack descriptions.

9. Add architecture decision records for major moves
- Track structure decisions (canonical module path, compat retirement strategy) in `docs/adr/`.

10. Create a structure migration checklist with completion states
- Track each compatibility module and planned deletion date/condition.

## Suggested Incremental Migration Order

1. Freeze new features in compatibility-only paths.
2. Choose canonical module map and publish it.
3. Move handlers and service wiring to canonical paths only.
4. Convert wrappers to deprecated re-exports with explicit comments.
5. Remove empty/unused directories.
6. Remove deprecated compatibility re-exports once no internal references remain.

## Development Commands

```bash
# build + run
./run.sh

# build only
./run.sh --build

# frontend only
./run.sh --build-frontend

# rust only
./run.sh --build-rust
```

Frontend direct commands:

```bash
cd frontend
bun run dev
bun run build:incremental
bun run check
```

## Final Notes
This project is already functional and demonstrates serious progress toward MVVM-style organization. The next major value is not new layering, but **layer consolidation**: one canonical location per responsibility, compatibility zones explicitly isolated, and folder ownership rules enforced.
