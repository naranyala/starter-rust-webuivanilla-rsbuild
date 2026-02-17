# Suggested Incremental Migration Order

1. Freeze new features in compatibility-only paths.
2. Choose canonical module map and publish it.
3. Move handlers and service wiring to canonical paths only.
4. Convert wrappers to deprecated re-exports with explicit comments.
5. Remove empty/unused directories.
6. Remove deprecated compatibility re-exports once no internal references remain.
