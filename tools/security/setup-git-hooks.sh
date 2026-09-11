#!/bin/bash
# 🔧 Script Setup Git Pre-commit Hook untuk mencegah commit file sensitif
# Dijalankan sekali saat setup project atau setelah clone baru

set -euo pipefail

HOOK_DIR=".git/hooks"
mkdir -p "$HOOK_DIR"

HOOK_PATH="$HOOK_DIR/pre-commit"

cat > "$HOOK_PATH" << 'EOF'
#!/bin/bash
set -euo pipefail

# 🔍 Check file sensitif sebelum commit (meningkatkan cakupan)
if find . -maxdepth 5 \( -name "*.vault" -o -name "*vault*" -o -name "*.pem" -o -name "*.key" -o -name "cookies.txt" -o -name "*.env" \( ! -name ".env.example" \) -o -name "*.keystore" -o -name "id_rsa*" -o -name "*.tmp*" -o -name "alpine-*.rootfs" \) | grep -q .; then
  echo "❌ Gagal commit: file sensitif terdeteksi di staging."
  echo "Hapus/correct atau vault file-file berikut dari workspace:"
  find . -maxdepth 5 \( -name "*.vault" -o -name "*vault*" -o -name "*.pem" -o -name "*.key" -o -name "cookies.txt" -o -name "*.env" \( ! -name ".env.example" \) -o -name "*.keystore" -o -name "id_rsa*" -o -name "*.tmp*" -o -name "alpine-*.rootfs" \)
  exit 1
fi
echo "✅ Tidak ditemukan file sensitif. Commit diijinkan."
EOF

chmod +x "$HOOK_PATH"
echo "✅ Git pre-commit hook telah dipasang: $HOOK_PATH"
echo "✅ Hook akan mem-blok commit jika mendeteksi:"
echo "   - *.vault, *vault*, *.pem, *.key, *.keystore, id_rsa*, cookies.txt, .env (kecuali .env.example), *.tmp*, alpine-*.rootfs"
