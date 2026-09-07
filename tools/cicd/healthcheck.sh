#!/data/data/com.termux/files/usr/bin/bash
# RocSystem Health Check Script
# Usage: ./healthcheck.sh [options]

set -e

# Config
SERVER_URL="${ROC_SYSTEM_URL:-http://127.0.0.1:3001}"
TIMEOUT=10
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Options
VERBOSE=false
WATCH=false

while [[ $# -gt 0 ]]; do
  case $1 in
    -v|--verbose) VERBOSE=true; shift ;;
    -w|--watch) WATCH=true; shift ;;
    -u|--url) SERVER_URL="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

check_health() {
  local start_time=$(date +%s%N)
  
  # HTTP Check
  local http_code=$(curl -s -o /dev/null -w "%{http_code}" \
    --connect-timeout 5 \
    --max-time "$TIMEOUT" \
    "$SERVER_URL" 2>/dev/null || echo "000")
  
  local end_time=$(date +%s%N)
  local response_time=$(( (end_time - start_time) / 1000000 ))
  
  # Results
  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ HTTP:${NC} $http_code | Response: ${response_time}ms"
    [ "$VERBOSE" = true ] && echo -e "${GREEN}✅ Server:${NC} Running"
    return 0
  else
    echo -e "${RED}❌ HTTP:${NC} $http_code | Response: ${response_time}ms"
    [ "$VERBOSE" = true ] && echo -e "${RED}❌ Server:${NC} Down or Error"
    return 1
  fi
}

# Main
echo "🏥 RocSystem Health Check"
echo "=========================="
echo "URL: $SERVER_URL"
echo ""

if [ "$WATCH" = true ]; then
  echo "Watching... (Ctrl+C to stop)"
  while true; do
    check_health
    echo "---"
    sleep 5
  done
else
  check_health
  exit $?
fi