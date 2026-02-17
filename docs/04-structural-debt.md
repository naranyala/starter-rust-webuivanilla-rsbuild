# Structural Debt Inventory

1. **Namespace duplication in Rust**
   - Similar capabilities are exposed under `core/*`, `model/*`, `mvvm/*`, and `infrastructure/*` compatibility facades.

2. **Dual handler paths**
   - `src/viewmodel/bindings/*` appears canonical while `src/infrastructure/web/handlers/*` forwards/re-exports.

3. **Transitional frontend MVVM wrappers**
   - `frontend/src/mvvm/*` currently behaves mostly as export indirection.

4. **Placeholder directories**
   - Some directories are present with little or no concrete ownership yet (`docs/`, parts of `view/`, `use-cases/`).

5. **Repo noise around vendored/auxiliary code**
   - `thirdparty/webui-c-src` and local examples are useful, but should be clearly separated from app architecture docs.
