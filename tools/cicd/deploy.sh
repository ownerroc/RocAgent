#!/data/data/com.termux/files/usr/bin/bash
# RocSystem Deployment Script
# Usage: ./deploy.sh [env] [--rollback]

set -e

# Config
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Environment
ENV="${1:-production}"
ROLLBACK=false

# Parse args
for arg in "$@"; do
  case $arg in
    --rollback) ROLLBACK=true ;;
  esac
done

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# Check Node.js
check_dependencies() {
  log_info "Checking dependencies..."
  if ! command -v node &> /dev/null; then
    log_error "Node.js not found!"
    exit 1
  fi
  if ! command -v npm &> /dev/null; then
    log_error "npm not found!"
    exit 1
  fi
  log_success "Dependencies OK"
}

# Backup current version
backup() {
  log_info "Creating backup..."
  mkdir -p "$BACKUP_DIR"
  
  # Backup essential files
  local backup_name="backup_$TIMESTAMP"
  local backup_path="$BACKUP_DIR/$backup_name"
  
  mkdir -p "$backup_path"
  cp -r "$PROJECT_DIR"/{package.json,package-lock.json,src,server.ts,tsconfig.json} "$backup_path/" 2>/dev/null || true
  
  # Keep only last 5 backups
  ls -1t "$BACKUP_DIR" | tail -n +6 | xargs -r rm -rf
  
  log_success "Backup created: $backup_name"
  echo "$backup_path"
}

# Install dependencies
install_deps() {
  log_info "Installing dependencies..."
  cd "$PROJECT_DIR"
  npm ci --silent
  log_success "Dependencies installed"
}

# Build project
build() {
  log_info "Building project..."
  cd "$PROJECT_DIR"
  npm run build
  log_success "Build complete"
}

# Test server
test_server() {
  log_info "Testing server..."
  cd "$PROJECT_DIR"
  
  # Start server in background
  timeout 10 npm run dev &
  local pid=$!
  
  # Wait for startup
  sleep 5
  
  # Check health
  if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001 | grep -q "200"; then
    log_success "Server test passed"
    kill $pid 2>/dev/null || true
    return 0
  else
    log_error "Server test failed"
    kill $pid 2>/dev/null || true
    return 1
  fi
}

# Deploy
deploy() {
  log_info "Starting deployment to $ENV..."
  
  # Backup first
  backup
  
  # Install & Build
  install_deps
  build
  
  # Test
  if test_server; then
    log_success "Deployment successful!"
  else
    log_warn "Deployment test failed - rolling back"
    rollback
    exit 1
  fi
}

# Rollback
rollback() {
  if [ "$ROLLBACK" = false ]; then
    log_warn "Would rollback - use --rollback to confirm"
    return
  fi
  
  log_info "Rolling back..."
  local latest=$(ls -1t "$BACKUP_DIR" | head -1)
  
  if [ -z "$latest" ]; then
    log_error "No backup found!"
    exit 1
  fi
  
  cp -r "$BACKUP_DIR/$latest"/* "$PROJECT_DIR/" 2>/dev/null || true
  log_success "Rollback complete"
}

# Main
echo "🚀 RocSystem Deployment"
echo "======================="
echo "Environment: $ENV"
echo "Timestamp: $TIMESTAMP"
echo ""

check_dependencies

if [ "$ROLLBACK" = true ]; then
  rollback
else
  deploy
fi

echo ""
log_success "Done!"