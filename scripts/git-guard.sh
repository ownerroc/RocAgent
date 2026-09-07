#!/bin/bash
# Git Guard - Mencegah sabotase dari luar
# Hanya owner yang bisa mengubah, bukan luar

LOG_FILE="$HOME/rocsystem/.git_guard.log"

log_guard() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] BLOCKED: $1" >> "$LOG_FILE"
    echo "🛡️ Git Guard: $1"
}

# Periksa command berbahaya
check_dangerous() {
    local cmd="$1"
    
    # Block pull dari remote manapun
    if echo "$cmd" | grep -iqE "git\s+pull|git\s+fetch|git\s+stash\s+pop|git\s+reset\s+--hard"; then
        log_guard "Percobaan sabotase: $cmd"
        echo "❌ DIBLOKIR! Hanya owner yang boleh mengubah lokal."
        echo "   Gunakan 'gh pr create' atau push manual jika perlu."
        exit 1
    fi
    
    # Block remote merge
    if echo "$cmd" | grep -iqE "git\s+merge.*origin|git\s+merge.*upstream"; then
        log_guard "Percobaan merge dari luar: $cmd"
        echo "❌ DIBLOKIR! Merge dari remote tidak diizinkan."
        exit 1
    fi
}

# Main guard
if [ $# -gt 0 ]; then
    FULL_CMD="$0 $@"
    check_dangerous "$FULL_CMD"
fi

# Allow gh cli usage
if [ "$1" = "gh" ]; then
    exit 0
fi

echo "✅ Git Guard aktif - Hanya gh cli yang diperbolehkan untuk GitHub"