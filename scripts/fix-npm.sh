#!/bin/bash
# Fix script for npm commands after ctrl+c interruption

set -e

echo "🔧 RocSystem NPM Fix Utility"
echo "============================"

fix_install() {
    echo "📦 Fixing npm install..."
    rm -rf node_modules package-lock.json
    npm install --legacy-peer-deps
    echo "✅ npm install fixed!"
}

fix_test() {
    echo "🧪 Fixing npm test..."
    # Kill any hanging node processes
    pkill -f "node.*test" 2>/dev/null || true
    pkill -f "tsx" 2>/dev/null || true
    sleep 1
    npm test
    echo "✅ npm test fixed!"
}

fix_build() {
    echo "🏗️ Fixing npm run build..."
    rm -rf dist
    rm -f server.js
    npm run build
    echo "✅ npm run build fixed!"
}

case "${1:-all}" in
    install)
        fix_install
        ;;
    test)
        fix_test
        ;;
    build)
        fix_build
        ;;
    all)
        fix_install
        fix_test
        fix_build
        ;;
    *)
        echo "Usage: $0 {install|test|build|all}"
        exit 1
        ;;
esac

echo "🎉 All fixes complete!"