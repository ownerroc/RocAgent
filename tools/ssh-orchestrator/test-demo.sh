#!/bin/bash

# SSH Orchestrator - Interactive Demo & Test

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORCHESTRATOR="$SCRIPT_DIR/ssh-orchestrator.cjs"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${CYAN}ℹ $1${NC}"; }
log_success() { echo -e "${GREEN}✓ $1${NC}"; }
log_error() { echo -e "${RED}✗ $1${NC}"; }

echo ""
echo "=========================================="
echo "  SSH Orchestrator - Demo & Test Suite"
echo "=========================================="
echo ""

log_info "Test 1: Checking dependencies..."
if command -v node &> /dev/null; then
  log_success "Node.js: $(node --version)"
else
  log_error "Node.js not found!"
  exit 1
fi

if command -v ssh &> /dev/null; then
  log_success "SSH: $(ssh -V 2>&1 | cut -d' ' -f1)"
else
  log_error "SSH not found!"
  exit 1
fi

log_info "Test 2: Checking orchestrator script..."
if [ -f "$ORCHESTRATOR" ]; then
  log_success "Orchestrator found"
else
  log_error "Orchestrator not found!"
  exit 1
fi

log_info "Test 3: Displaying help..."
echo ""
node "$ORCHESTRATOR" help

log_info "Test 4: Listing devices (should be empty)..."
node "$ORCHESTRATOR" list

log_info "Test 5: Listing groups (should be empty)..."
node "$ORCHESTRATOR" groups

echo ""
echo "=========================================="
echo "  Demo Complete!"
echo "=========================================="
echo ""
echo "To add real devices, use:"
echo "  node $ORCHESTRATOR add <alias> <host> <port> <user> [key-file]"
echo ""
echo "Examples:"
echo "  node $ORCHESTRATOR add web1 192.168.1.10 22 root"
echo "  node $ORCHESTRATOR add db1 10.0.0.5 22 admin ~/.ssh/id_rsa"
echo "  node $ORCHESTRATOR exec web1 'uptime'"
echo "  node $ORCHESTRATOR all 'df -h'"
echo "  node $ORCHESTRATOR group prod web1,db1"
echo "  node $ORCHESTRATOR run-group prod 'systemctl restart nginx'"
echo ""