# Structure Overview

## Current Top-Level Layout

```
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

```
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
- `infrastructure/web/handlers/*` re-exports `viewmodel/bindings/*`, so both namespaces coexist.

### Practical Impact

- Good for short-term compatibility.
- Expensive for navigation and onboarding: the same concept may exist in several paths.
- Increases risk of duplicated updates or stale mirrors.

## Frontend Structure Review (`frontend/src/`)

### Current Shape

```
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
- This mirrors Rust transitional structure: useful, but not fully normalized yet.

### Practical Impact

- Easy to run and modify today.
- Harder to reason about strict MVVM ownership because boundaries are still wrapper-oriented.
