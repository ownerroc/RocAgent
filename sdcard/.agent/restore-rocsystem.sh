#!/bin/bash
# RocSystem Restore Script
# Usage: ./restore-rocsystem.sh

set -e

echo "=========================================="
echo "  RocSystem Restore Script"
echo "=========================================="

# Check if zip exists
if [ ! -f "$(dirname "$0")/rocsystem-backup-*.zip" ]; then
    echo "❌ Backup zip not found!"
    echo "   Place rocsystem-backup-*.zip in the same folder as this script"
    exit 1
fi

# Find the backup zip
BACKUP_ZIP=$(ls rocsystem-backup-*.zip 2>/dev/null | head -1)
echo "📦 Found: $BACKUP_ZIP"

# Extract to home directory
echo "📂 Extracting to ~/.agent/rocsystem..."
mkdir -p ~/.agent/rocsystem
unzip -o "$BACKUP_ZIP" -d ~/.agent/rocsystem

# Navigate to rocsystem
cd ~/.agent/rocsystem

# Install dependencies
echo "📦 Running npm install..."
npm install

# Build
echo "🔨 Running npm run build..."
npm run build

# Setup environment
echo "⚙️ Setting up environment..."
export ROC_PATH="$HOME/.agent/rocsystem"
export ROC_HOME="$HOME/.agent/rocsystem"
export AGENT_MODE=owner

# Create owner config if not exists
mkdir -p ~/.agent/rocsystem/.owner
cat > ~/.agent/rocsystem/.owner/config.json << 'EOF'
{
  "owner": "ivansslo",
  "mode": "owner",
  "github": "ivansslo",
  "device": "termux-restored",
  "created": "restored"
}
EOF

# Update .env
if [ -f .env ]; then
    if ! grep -q "OWNER_MODE=true" .env; then
        echo "OWNER_MODE=true" >> .env
    fi
    if ! grep -q "OWNER_USER_GITHUB=ivansslo" .env; then
        echo "OWNER_USER_GITHUB=ivansslo" >> .env
    fi
fi

# Setup .bashrc aliases
BASHRC="$HOME/.bashrc"
if [ -f "$BASHRC" ]; then
    if ! grep -q "# RocSystem Aliases" "$BASHRC"; then
        cat >> "$BASHRC" << 'ALIAS'

# RocSystem Aliases
alias roc='cd ~/.agent/rocsystem'
alias rocs='cd ~/.agent/rocsystem && npm run start'
alias roclog='tail -f ~/.agent/rocsystem/logs/*.log'
alias rocstat='curl -s http://127.0.0.1:3001/health || echo "Server not running"'

# RocSystem Environment
export ROC_PATH="$HOME/.agent/rocsystem"
export ROC_HOME="$HOME/.agent/rocsystem"
export AGENT_MODE=owner
ALIAS
    fi
fi

echo ""
echo "=========================================="
echo "  ✅ Restore Complete!"
echo "=========================================="
echo ""
echo "📋 Next steps:"
echo "   1. source ~/.bashrc"
echo "   2. roc              # Go to rocsystem folder"
echo "   3. npm run start    # Start development server"
echo ""
echo "🚀 Or use aliases:"
echo "   rocs    # Start server"
echo "   rocstat # Check status"
echo "   roclog  # View logs"
echo ""