#!/data/data/com.termux/files/usr/bin/env bash

# ROC-Termux Setup Script
# Fungsi: Setup repository, update/upgrade, dan install native packages

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 ROC-Termux Setup Script${NC}"
echo "================================"

# =====================
# 1. Update Package List
# =====================
echo -e "${YELLOW}📦 Updating package list...${NC}"
apt-get update -qq

# =====================
# 2. Upgrade Packages
# =====================
echo -e "${YELLOW}⬆️  Upgrading packages...${NC}"
apt-get upgrade -y -qq

# =====================
# 3. Install Base Dependencies
# =====================
echo -e "${YELLOW}🔧 Installing base dependencies...${NC}"

BASIC_PACKAGES=(
    "coreutils"
    "curl"
    "wget"
    "git"
    "vim"
    "nano"
    "htop"
    "tree"
    "jq"
    "yaml"
    "python"
    "python-pip"
    "nodejs"
    "npm"
    "ruby"
    "perl"
    "bash"
    "zsh"
    "fish"
    "termux-api"
    "termux-authentication"
    "openssh"
    "postgresql"
    "redis"
    "nginx"
)

for pkg in "${BASIC_PACKAGES[@]}"; do
    if pkg install -y "$pkg" 2>/dev/null; then
        echo -e "  ✅ $pkg installed"
    else
        echo -e "  ⚠️  $pkg already installed or not available"
    fi
done

# =====================
# 4. ROC Custom Repository
# =====================
ROC_REPO_DIR="/data/data/com.termux/files/home/roc-packages"
mkdir -p "$ROC_REPO_DIR"

# Create ROC custom pkg list
cat > "$ROC_REPO_DIR/roc-packages.list" << 'EOF'
# ROC Custom Packages Repository
# Untuk package kustom yang tidak tersedia di repository utama
EOF

echo -e "${GREEN}✅ ROC repository configured at: $ROC_REPO_DIR${NC}"

# =====================
# 5. Setup Package Aliases
# =====================
echo -e "${YELLOW}📋 Setting up package aliases...${NC}"

# Create function untuk roc-update
mkdir -p /data/data/com.termux/files/home/.termux/funcs

cat > /data/data/com.termux/files/home/.termux/funcs/roc-update.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/env bash
# ROC Update Function - Update semua package ROC-Termux

echo "🔄 Updating ROC-Termux..."
apt-get update -y
apt-get upgrade -y
echo "✅ Update complete!"
EOF

# Create function untuk roc-install
cat > /data/data/com.termux/files/home/.termux/funcs/roc-install.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/env bash
# ROC Install Function - Install package dengan logging

if [ -z "$1" ]; then
    echo "Usage: roc-install <package-name>"
    exit 1
fi

echo "📦 Installing $1..."
pkg install -y "$1"
echo "✅ $1 installed!"
EOF

chmod +x /data/data/com.termux/files/home/.termux/funcs/*.sh

# Add to bashrc/zshrc
ROC_FUNCS_SOURCE='
# ROC-Termux Functions
[ -f ~/.termux/funcs/roc-update.sh ] && source ~/.termux/funcs/roc-update.sh
[ -f ~/.termux/funcs/roc-install.sh ] && source ~/.termux/funcs/roc-install.sh
alias roc-update="apt-get update && apt-get upgrade -y"
alias roc-install="pkg install -y"
'

if ! grep -q "ROC-Termux Functions" ~/.bashrc 2>/dev/null; then
    echo "$ROC_FUNCS_SOURCE" >> ~/.bashrc
fi

if [ -f ~/.zshrc ] && ! grep -q "ROC-Termux Functions" ~/.zshrc; then
    echo "$ROC_FUNCS_SOURCE" >> ~/.zshrc
fi

# =====================
# 6. Verify Installation
# =====================
echo -e "${YELLOW}🔍 Verifying installation...${NC}"

verify_package() {
    if command -v "$1" &>/dev/null; then
        echo -e "  ✅ $1: $(command -v $1)"
    else
        echo -e "  ❌ $1: NOT FOUND"
    fi
}

verify_package "git"
verify_package "python"
verify_package "node"
verify_package "npm"
verify_package "curl"
verify_package "wget"

# =====================
# 7. Create ROC CLI
# =====================
cat > /data/data/com.termux/files/usr/bin/roc << 'EOF'
#!/data/data/com.termux/files/usr/bin/env bash

case "$1" in
    update)
        apt-get update && apt-get upgrade -y
        ;;
    install)
        shift
        pkg install -y "$@"
        ;;
    list)
        apt list --upgradable
        ;;
    version)
        echo "ROC-Termux v1.0.0"
        ;;
    help)
        echo "ROC-Termux CLI"
        echo "Usage: roc <command>"
        echo ""
        echo "Commands:"
        echo "  update     - Update dan upgrade semua package"
        echo "  install    - Install package"
        echo "  list       - List package yang bisa diupgrade"
        echo "  version    - Show version"
        ;;
    *)
        echo "Unknown command. Use: roc help"
        ;;
esac
EOF

chmod +x /data/data/com.termux/files/usr/bin/roc

# =====================
# 8. Final Message
# =====================
echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ ROC-Termux Setup Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "📝 Commands:"
echo "  roc update       - Update & upgrade"
echo "  roc install <pkg> - Install package"
echo "  roc list         - List upgrades"
echo "  roc version      - Show version"
echo ""
echo -e "${YELLOW}Silakan restart terminal atau source ~/.bashrc${NC}"