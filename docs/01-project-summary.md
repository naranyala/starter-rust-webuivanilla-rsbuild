# Project Summary

This repository is a Rust desktop application using `webui-rs` with a vanilla TypeScript frontend built by Rsbuild and Bun. The current codebase contains both a canonical MVVM path and several compatibility layers kept for migration safety.

This document replaces the previous README with an accurate assessment of the current structure and a project-structure-focused improvement plan.

## Quick Structural Judgment

Overall assessment: usable, but transitional and over-layered.

### What is strong

- Clear intent to move toward MVVM and layered boundaries.
- Frontend and backend are separated cleanly at the top level.
- Build and run workflows are scripted and reproducible.
- Compatibility shims reduce immediate breakage during refactor.

### What is weak

- Multiple parallel module surfaces in Rust (`core`, `model`, `mvvm`, `viewmodel`, `infrastructure`) create cognitive overhead.
- Some modules are thin re-export facades rather than functional domains.
- Naming and structure in README/history are partially out of sync with real implementation.
- Empty or placeholder directories exist and blur ownership.
- Third-party source vendoring and local examples increase repo noise without clear boundary docs.
