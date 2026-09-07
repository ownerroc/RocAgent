#!/data/data/com.termux/files/usr/bin/bash
# RocSystem Owner Configuration for Termux
# Dikonfigurasi khusus untuk RocSystem Agent

# ===== ROC SYSTEM ENVIRONMENT =====
export ROC_PATH="/data/data/com.termux/files/home/.agent/rocsystem"
export ROC_HOME="/data/data/com.termux/files/home/.agent/rocsystem"
export AGENT_HOME="/data/data/com.termux/files/home/.agent"
export AGENT_NAME="RocSystem"
export AGENT_VERSION="2.0.0"
export AGENT_MODE="owner"

# ===== PATH CONFIGURATION =====
export PATH="$ROC_HOME:$AGENT_HOME/rocenv:$PATH"
export NODE_PATH="$ROC_HOME/node_modules:$AGENT_HOME/rocenv/node_modules"

# ===== DISABLE UNNECESSARY FEATURES =====
export DISABLE_HMR="true"
export TERMUX_HACK="true"

# ===== ALIASES =====
alias roc="cd $ROC_PATH && ls -la"
alias rocs="cd $ROC_PATH && npm run dev"
alias roclog="tail -f $ROC_PATH/logs/rocsystem.log"
alias rocstat="curl -s http://127.0.0.1:3001/api/health 2>/dev/null || echo 'Server not running'"
alias rocstop="pkill -f 'tsx server.ts' && echo 'RocSystem stopped'"
alias rocstart="cd $ROC_PATH && npm run dev &"
alias agent="cd $ROC_PATH"
alias .agent="cd $AGENT_HOME"

# ===== FUNCTIONS =====
roc() {
    cd $ROC_PATH
    if [ "$1" = "dev" ]; then
        npm run dev
    elif [ "$1" = "build" ]; then
        npm run build
    elif [ "$1" = "log" ]; then
        tail -f logs/rocsystem.log
    elif [ "$1" = "status" ]; then
        curl -s http://127.0.0.1:3001/api/health 2>/dev/null && echo " ✅ Running" || echo " ❌ Not running"
    elif [ "$1" = "stop" ]; then
        pkill -f 'tsx server.ts' && echo "Stopped" || echo "Not running"
    elif [ "$1" = "start" ]; then
        npm run dev &
    else
        ls -la
    fi
}

# Quick navigation
back() {
    cd $ROC_PATH
}

home() {
    cd $AGENT_HOME
}

# ===== DISPLAY BANNER =====
echo -e "\033[1;36m"
echo "══════════════════════════════════════════════════════"
echo "     🚀 ROCSYSTEM OWNER MODE ACTIVATED"
echo "══════════════════════════════════════════════════════"
echo -e "\033[0m"
echo "  📁 ROC_PATH: $ROC_PATH"
echo "  🤖 Agent: $AGENT_NAME v$AGENT_VERSION"
echo "  👤 Mode: OWNER (Full Access)"
echo "  🌐 Server: http://127.0.0.1:3001"
echo -e "\033[1;36m══════════════════════════════════════════════════════\033[0m"
echo ""

# ===== DOCKER ALIASES (if rootd available) =====
dock() { rootd sh docker -- docker "$@"; }
dc()   { rootd sh docker -- docker compose "$@"; }