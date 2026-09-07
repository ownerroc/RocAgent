#!/usr/bin/env bash
# Start server script for Voyager inference pipeline
# Usage: ./scripts/start_server.sh [--docker]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}") && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

usage() {
    echo "Usage: $0 [--docker] [--model MODEL_CONFIG]"
    echo "  --docker     : Run via Docker (fallback)"
    echo "  --model      : Path to model config (default: inference.py)"
    exit 1
}

MODE="native"
MODEL_CONFIG="$PROJECT_ROOT/inference.py"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --docker)
            MODE="docker"
            shift
            ;;
        --model)
            MODEL_CONFIG="$2"
            shift 2
            ;;
        *)
            usage
            ;;
    esac
done

if [[ ! -f "$MODEL_CONFIG" ]]; then
    echo "Error: Model config not found: $MODEL_CONFIG"
    exit 1
fi

case "$MODE" in
    native)
        echo "Starting server (native)..."
        cd "$PROJECT_ROOT"
        python3 "$MODEL_CONFIG" --server
        ;;
    docker)
        echo "Starting server (Docker fallback)..."
        cd "$PROJECT_ROOT"
        bash launch-docker.sh
        ;;
    *)
        echo "Invalid mode: $MODE"
        usage
        ;;
esac
