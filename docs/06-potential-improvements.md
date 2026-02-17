# Potential Improvements

1. **Define a single canonical Rust layer map**
   - Decide whether canonical ownership is `mvvm/*` or `model/viewmodel/view/*` and document it.
   - Keep all other paths explicitly marked as compatibility-only.

2. **Collapse compatibility facades behind one migration boundary**
   - Move re-export-only modules into a dedicated `src/compat/` subtree.
   - Prevent new feature work from landing in compatibility paths.

3. **Normalize handler ownership**
   - Keep binding handlers in one place only (prefer `src/viewmodel/bindings/*`).
   - Leave forwarding modules minimal and temporary.

4. **Tighten frontend MVVM folder semantics**
   - If `frontend/src/mvvm/*` is canonical, move concrete implementations there.
   - If not, rename wrappers to `compat/` and keep real code in explicit feature folders.

5. **Introduce ownership docs by directory**
   - Add short `README.md` files inside key folders (`src/model`, `src/viewmodel`, `frontend/src/app`) defining allowed contents.

6. **Separate product code from vendored/reference code**
   - Keep `thirdparty/` and `examples/` but document them as external/reference zones not part of main architecture.

7. **Remove or fill placeholder directories**
   - Delete empty structural placeholders or add minimal real modules to justify them.

8. **Align naming and comments with actual stack**
   - Replace historical references that still mention outdated frontend stack descriptions.

9. **Add architecture decision records for major moves**
   - Track structure decisions (canonical module path, compat retirement strategy) in `docs/adr/`.

10. **Create a structure migration checklist with completion states**
    - Track each compatibility module and planned deletion date/condition.
