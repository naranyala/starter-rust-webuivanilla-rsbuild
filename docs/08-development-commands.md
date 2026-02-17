# Development Commands

## Main Build and Run Commands

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

## Frontend Direct Commands

```bash
cd frontend
bun run dev
bun run build:incremental
bun run check
```

## Final Notes

This project is already functional and demonstrates serious progress toward MVVM-style organization. The next major value is not new layering, but layer consolidation: one canonical location per responsibility, compatibility zones explicitly isolated, and folder ownership rules enforced.
