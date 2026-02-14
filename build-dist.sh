#!/usr/bin/env bash

#===============================================================================
# Cross-Platform Distribution Build Script
# Builds self-contained executables for Windows, macOS, and Linux
#===============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
WHITE='\033[0;37m'
GRAY='\033[0;90m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

APP_NAME=""
APP_VERSION="1.0.0"
DIST_DIR="dist"
PLATFORM=""
ARCH=""
LOG_DIR=""
LOG_FILE=""

declare -A STAGE_TIMES
declare -A STAGE_STATUS
BUILD_START_TIME=$(date +%s)

setup_logging() {
    LOG_DIR="$SCRIPT_DIR/logs"
    mkdir -p "$LOG_DIR"
    
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    LOG_FILE="$LOG_DIR/build_${timestamp}.log"
    
    exec > >(tee -a "$LOG_FILE")
    exec 2>&1
    
    echo "Log file: $LOG_FILE"
}

log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S.%3N")
    local elapsed=$(($(date +%s) - BUILD_START_TIME))
    
    local color=""
    local prefix=""
    
    case $level in
        "INFO")
            color="$CYAN"
            prefix="[INFO]"
            ;;
        "SUCCESS")
            color="$GREEN"
            prefix="[DONE]"
            ;;
        "WARN")
            color="$YELLOW"
            prefix="[WARN]"
            ;;
        "ERROR")
            color="$RED"
            prefix="[FAIL]"
            ;;
        "STEP")
            color="$BLUE"
            prefix="[STEP]"
            ;;
        "DEBUG")
            color="$GRAY"
            prefix="[DEBUG]"
            ;;
        *)
            color="$WHITE"
            prefix="[LOG]"
            ;;
    esac
    
    if [[ -t 1 ]]; then
        echo -e "${GRAY}[${elapsed}s]${NC} ${color}${prefix}${NC} $message"
    else
        echo "[$timestamp] [$level] $message"
    fi
}

print_banner() {
    log "INFO" "========================================"
    log "INFO" "Cross-Platform Distribution Builder"
    log "INFO" "========================================"
    echo
}

start_stage() {
    local stage=$1
    STAGE_TIMES["$stage"]=$(date +%s.%N)
    STAGE_STATUS["$stage"]="running"
    log "STEP" "Starting: $stage"
}

end_stage() {
    local stage=$1
    local status=${2:-success}
    local end_time=$(date +%s.%N)
    local start_time=${STAGE_TIMES[$stage]}
    
    if [[ -n "$start_time" ]]; then
        local duration=$(echo "$end_time - $start_time" | bc 2>/dev/null || echo "0")
        STAGE_STATUS["$stage"]="$status"
        
        if [[ "$status" == "success" ]]; then
            log "SUCCESS" "Completed: $stage (${duration}s)"
        else
            log "ERROR" "Failed: $stage (${duration}s)"
        fi
    fi
}

print_summary() {
    local end_time=$(date +%s)
    local total_duration=$((end_time - BUILD_START_TIME))
    
    echo
    echo -e "${BOLD}========================================${NC}"
    echo -e "${BOLD}           BUILD SUMMARY${NC}"
    echo -e "${BOLD}========================================${NC}"
    echo
    
    local total_size=0
    for stage in "${!STAGE_STATUS[@]}"; do
        local status=${STAGE_STATUS[$stage]}
        local icon=""
        local color=""
        
        case $status in
            "success")
                icon="✓"
                color="$GREEN"
                ;;
            "failed")
                icon="✗"
                color="$RED"
                ;;
            "running")
                icon="⟳"
                color="$BLUE"
                ;;
            *)
                icon="○"
                color="$GRAY"
                ;;
        esac
        
        local duration=${STAGE_TIMES[$stage]:-0}
        printf "  ${color}%s${NC} %-20s %s\n" "$icon" "$stage" "${duration}s"
    done
    
    echo
    echo -e "${BOLD}Total build time:${NC} ${CYAN}${total_duration}s${NC}"
    echo -e "${BOLD}Log file:${NC} ${GRAY}${LOG_FILE}${NC}"
    echo -e "${BOLD}========================================${NC}"
}

detect_platform() {
    case "$(uname -s)" in
        Linux*)     PLATFORM="linux";;
        Darwin*)    PLATFORM="macos";;
        CYGWIN*|MINGW*|MSYS*) PLATFORM="windows";;
        *)          PLATFORM="unknown";;
    esac
    log "INFO" "Detected platform: $PLATFORM"
}

detect_arch() {
    case "$(uname -m)" in
        x86_64|amd64)   ARCH="x64";;
        aarch64|arm64)  ARCH="arm64";;
        armv7l)         ARCH="arm";;
        *)              ARCH="x64";;
    esac
    log "INFO" "Detected architecture: $ARCH"
}

read_config() {
    log "INFO" "Reading configuration..."
    
    if [ -f "app.config.toml" ]; then
        APP_NAME=$(grep -A1 '\[executable\]' app.config.toml 2>/dev/null | grep 'name' | cut -d'=' -f2 | tr -d ' "' || echo "app")
        APP_VERSION=$(grep '^version = ' Cargo.toml 2>/dev/null | cut -d'"' -f2 || echo "1.0.0")
    else
        APP_NAME="app"
        APP_VERSION="1.0.0"
    fi
    
    if [ -z "$APP_NAME" ]; then
        APP_NAME=$(grep '^name = ' Cargo.toml | head -1 | cut -d'"' -f2 || echo "rustwebui-app")
    fi
    
    log "INFO" "App: $APP_NAME v$APP_VERSION"
}

check_prerequisites() {
    log "INFO" "Checking prerequisites..."
    
    local missing=0
    
    if ! command -v cargo &> /dev/null; then
        log "ERROR" "Cargo is not installed. Please install Rust from https://rustup.rs/"
        missing=1
    else
        local cargo_version=$(cargo --version)
        log "INFO" "Cargo found: $cargo_version"
    fi
    
    if ! command -v bun &> /dev/null; then
        log "WARN" "Bun is not installed. Frontend build may fail."
        log "WARN" "Install Bun from https://bun.sh/"
    else
        local bun_version=$(bun --version)
        log "INFO" "Bun found: $bun_version"
    fi
    
    if [ $missing -eq 1 ]; then
        return 1
    fi
}

build_frontend() {
    start_stage "Frontend Build"
    
    if [ ! -d "frontend" ]; then
        log "WARN" "Frontend directory not found, skipping frontend build"
        end_stage "Frontend Build" "skipped"
        return 0
    fi
    
    if [ ! -d "frontend/node_modules" ]; then
        log "INFO" "Installing frontend dependencies..."
        cd frontend
        bun install
        cd ..
    fi
    
    if [ -f "build-frontend.js" ]; then
        bun build-frontend.js
    else
        log "WARN" "build-frontend.js not found, skipping frontend build"
    fi
    
    end_stage "Frontend Build" "success"
}

build_rust() {
    start_stage "Rust Build"
    
    local build_type="${1:-release}"
    
    if [ "$build_type" = "release" ]; then
        log "INFO" "Building release binary..."
        cargo build --release 2>&1 | while IFS= read -r line; do
            if [[ "$line" == *"Compiling"* ]] || [[ "$line" == *"Finished"* ]]; then
                log "DEBUG" "$line"
            fi
        done
    else
        log "INFO" "Building debug binary..."
        cargo build 2>&1 | while IFS= read -r line; do
            if [[ "$line" == *"Compiling"* ]] || [[ "$line" == *"Finished"* ]]; then
                log "DEBUG" "$line"
            fi
        done
    fi
    
    end_stage "Rust Build" "success"
}

create_dist_package() {
    start_stage "Create Package"
    
    local build_type="${1:-release}"
    local output_dir="$DIST_DIR/${APP_NAME}-${APP_VERSION}-${PLATFORM}-${ARCH}"
    
    log "INFO" "Creating distribution package: $output_dir"
    
    rm -rf "$output_dir"
    mkdir -p "$output_dir"
    
    local exe_name="${APP_NAME}"
    if [ "$PLATFORM" = "windows" ]; then
        exe_name="${APP_NAME}.exe"
    fi
    
    local source_exe=""
    if [ "$build_type" = "release" ]; then
        source_exe="target/release/${APP_NAME}"
    else
        source_exe="target/debug/${APP_NAME}"
    fi
    
    if [ ! -f "$source_exe" ]; then
        local cargo_name=$(grep '^name = ' Cargo.toml | head -1 | cut -d'"' -f2)
        source_exe="target/${build_type}/${cargo_name}"
    fi
    
    if [ "$PLATFORM" = "windows" ]; then
        source_exe="${source_exe}.exe"
    fi
    
    if [ ! -f "$source_exe" ]; then
        log "ERROR" "Executable not found: $source_exe"
        end_stage "Create Package" "failed"
        return 1
    fi
    
    cp "$source_exe" "${output_dir}/${exe_name}"
    chmod +x "${output_dir}/${exe_name}"
    log "INFO" "Copied executable: $exe_name"
    
    if [ -d "static" ]; then
        cp -r static "$output_dir/"
        log "INFO" "Copied static files"
    fi
    
    if [ -f "app.db" ]; then
        cp app.db "$output_dir/"
        log "INFO" "Copied database"
    fi
    
    if [ -f "app.config.toml" ]; then
        cp app.config.toml "$output_dir/"
        log "INFO" "Copied configuration"
    fi
    
    create_readme "$output_dir"
    create_startup_script "$output_dir"
    create_archive "$output_dir"
    
    local size=$(du -sh "$output_dir" 2>/dev/null | cut -f1 || echo "unknown")
    log "INFO" "Package created: $output_dir ($size)"
    
    end_stage "Create Package" "success"
}

create_readme() {
    local dir="$1"
    local readme_file="${dir}/README.txt"
    
    cat > "$readme_file" << EOF
================================================================================
${APP_NAME} v${APP_VERSION}
================================================================================

Platform: ${PLATFORM}-${ARCH}
Build Date: $(date +"%Y-%m-%d %H:%M:%S")

Quick Start:
  ./${APP_NAME}

The application will start a local web server and open your default browser.

Configuration:
  - Edit app.config.toml to customize settings

Features:
  - Built with Rust + WebUI
  - SQLite database (bundled)
  - Self-contained distribution

================================================================================
EOF
    
    log "INFO" "Created README.txt"
}

create_startup_script() {
    local dir="$1"
    local script_file="${dir}/start.sh"
    
    cat > "$script_file" << 'STARTUP_EOF'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
export RUSTWEBUI_HOME="$SCRIPT_DIR"
./app "$@"
STARTUP_EOF
    
    chmod +x "$script_file"
    log "INFO" "Created startup script: start.sh"
}

create_archive() {
    start_stage "Create Archive"
    
    local dir="$1"
    local archive_name=$(basename "$dir")
    
    cd "$DIST_DIR"
    
    case $PLATFORM in
        linux|macos)
            if command -v tar &> /dev/null; then
                tar -czf "${archive_name}.tar.gz" "$archive_name"
                log "INFO" "Created: ${archive_name}.tar.gz"
            fi
            ;;
        windows)
            if command -v zip &> /dev/null; then
                zip -rq "${archive_name}.zip" "$archive_name"
                log "INFO" "Created: ${archive_name}.zip"
            else
                log "WARN" "zip not found, skipping archive"
            fi
            ;;
    esac
    
    cd "$SCRIPT_DIR"
    end_stage "Create Archive" "success"
}

build_and_package() {
    local build_type="${1:-release}"
    
    log "INFO" "Building and packaging for $PLATFORM-$ARCH..."
    
    start_stage "Full Build"
    
    build_frontend
    build_rust "$build_type"
    create_dist_package "$build_type"
    
    end_stage "Full Build" "success"
}

verify_self_contained() {
    start_stage "Verify Package"
    
    local dir="${1:-$DIST_DIR/${APP_NAME}-${APP_VERSION}-${PLATFORM}-${ARCH}}"
    
    if [ ! -d "$dir" ]; then
        log "ERROR" "Directory not found: $dir"
        end_stage "Verify Package" "failed"
        return 1
    fi
    
    if [ ! -f "$dir/${APP_NAME}" ]; then
        if [ "$PLATFORM" = "windows" ]; then
            if [ ! -f "$dir/${APP_NAME}.exe" ]; then
                log "ERROR" "Executable not found"
                end_stage "Verify Package" "failed"
                return 1
            fi
        else
            log "ERROR" "Executable not found"
            end_stage "Verify Package" "failed"
            return 1
        fi
    fi
    
    if [ ! -d "$dir/static" ]; then
        log "WARN" "Static files directory not found"
    fi
    
    if [ "$PLATFORM" = "linux" ] && command -v ldd &> /dev/null; then
        local exe_path="$dir/${APP_NAME}"
        if [ -f "$exe_path" ]; then
            log "INFO" "Checking library dependencies..."
            ldd "$exe_path" 2>/dev/null | grep -v "=> /" | grep -v "statically linked" || true
        fi
    fi
    
    end_stage "Verify Package" "success"
}

clean_dist() {
    start_stage "Clean"
    
    if [ -d "$DIST_DIR" ]; then
        rm -rf "$DIST_DIR"
        log "INFO" "Cleaned $DIST_DIR"
    else
        log "INFO" "$DIST_DIR already clean"
    fi
    
    end_stage "Clean" "success"
}

show_help() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Cross-Platform Distribution Build Script"
    echo ""
    echo "Options:"
    echo "  build              Build and create package for current platform"
    echo "  build-release     Build release version and package (default)"
    echo "  build-debug       Build debug version and package"
    echo "  build-frontend     Build frontend only"
    echo "  build-rust        Build Rust only"
    echo "  verify            Verify self-contained package"
    echo "  clean             Clean distribution directory"
    echo "  help, -h          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 build-release  # Build release package"
    echo "  $0 build-debug    # Build debug package"
    echo "  $0 verify         # Verify package"
    echo "  $0 clean          # Clean dist directory"
}

main() {
    setup_logging
    print_banner
    
    detect_platform
    detect_arch
    read_config
    
    echo
    echo "----------------------------------------"
    log "INFO" "Building: $APP_NAME v$APP_VERSION"
    log "INFO" "Platform: $PLATFORM-$ARCH"
    echo "----------------------------------------"
    echo
    
    case "${1:-build-release}" in
        build)
            check_prerequisites && build_and_package "${BUILD_TYPE:-release}"
            ;;
        build-release)
            check_prerequisites && build_and_package "release"
            ;;
        build-debug)
            check_prerequisites && build_and_package "debug"
            ;;
        build-frontend)
            build_frontend
            ;;
        build-rust)
            check_prerequisites && build_rust "${BUILD_TYPE:-release}"
            ;;
        verify)
            verify_self_contained
            ;;
        clean)
            clean_dist
            ;;
        all)
            check_prerequisites && build_and_package "release"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log "ERROR" "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
    
    print_summary
}

main "$@"
