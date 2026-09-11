#!/bin/bash
# 🧹 Cleanup Workspace RocSystem — membersihkan file temporary dan legacy
# Dipanggil secara otomatis setiap Jumat atau manual

set -euo pipefail

echo "🧹 🧹 🧹 Memulai cleanup workspace rocsystem..."

# Bersihkan file temporary
echo "🗑️ Menghapus file temporary (.tmp*, *~)"
find . -type f -name "*~" -delete
find . -type f -name "*.tmp*" -delete

# Bersihkan file debug di archive/debug
echo "🗑️ Menghapus file debug di archive/debug/"
if [ -d "archive/debug" ]; then
  find archive/debug -type f -name "*.ts" -delete
  find archive/debug -type f -name "*.mjs" -delete
  find archive/debug -type f -name "*.cjs" -delete
fi

# Bersihkan file binary besar
echo "🗑️ Menghapus file binary besar (>10MB) kecuali di rocxmo-push"
find . -type f -name "alpine-*.rootfs" -size +10M -delete

# Bersihkan file .swp
echo "🗑️ Menghapus file .swp"
find . -type f -name "*.swp" -delete

# Bersihkan file log di .security-reports
echo "🗑️ Menghapus file log lama di .security-reports"
find .security-reports -type f -name "report-*.log" -mtime +7 -delete

# Bersihkan file cache npm dan tmp
echo "🗑️ Menghapus file cache npm dan tmp"
rm -rf node_modules/.cache npm-debug.log* tmp/ .npm tmp run_tests.mjs*

# Verifikasi cleanup
echo "✅ Cleanup selesai. Workspace lebih bersih."
echo "📊 Info sisa file temporary (jika ada):"
find . -type f \( -name "*.swp" -o -name "*~" -o -name "*.tmp*" \) -ls || echo "🎉 Tidak ditemukan file temporary sisa."
