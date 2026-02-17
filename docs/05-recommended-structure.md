# Recommended Target Structure

This is a suggested end-state for clearer ownership while keeping MVVM intent.

## Rust Target Structure

```
src/
├── main.rs
├── shared/                 cross-cutting config/logging/ports/di
├── model/                  entities, repositories, domain services
├── viewmodel/              commands, queries, UI bindings/adapters
├── view/                   UI-facing Rust assets/integration glue
└── platform/               OS/filesystem/process abstractions
```

## Frontend Target Structure

```
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

## Notes

- Keep only one canonical path per concern.
- Keep compatibility re-exports temporarily, but isolate and mark them deprecated.
