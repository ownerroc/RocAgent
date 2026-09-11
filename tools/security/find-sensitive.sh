#!/bin/bash
# 🔍 Script Cari File Sensitif di workspace rocsystem
# Dijalankan setiap Jumat / saat perubahan besar
# Output: report-{timestamp}.log

set -euo pipefail

REPORT_DIR=".security-reports"
mkdir -p "$REPORT_DIR"

REPORT="$REPORT_DIR/report-$(date +%Y%m%d-%H%M%S).log"

echo "🔍 Mulai pencarian file sensitif..." | tee "$REPORT"
echo "Workspace: $(pwd)" | tee -a "$REPORT"
echo "Tanggal  : $(date)" | tee -a "$REPORT"
echo "===================================" | tee -a "$REPORT"

# Cari vault (semua .vault tidak boleh di workspace!)
echo ""
echo "🗂️  Menemukan vault di workspace (HARUS DIHAPUS/VAULT DI LUAR):" | tee -a "$REPORT"
find . -maxdepth 3 -type f \( -name "*.vault" -o -name "*vault*" \) \
  -print \
  -exec sh -c 'echo "  ⚠️  {} (lokasi SALAH: di workspace)" >> "$REPORT"' \;

# Cari key (private key, ssh key, dll)
echo ""
echo "🔑 Menemukan file key privat (HARUS DIHAPUS/DIPINDAH):" | tee -a "$REPORT"
find . -maxdepth 3 -type f \( -name "*.pem" -o -name "id_rsa*" -o -name "testkey.keystore" \) \
  -print \
  -exec sh -c 'echo "  ⚠️  {} (lokasi mencurigakan)" >> "$REPORT"' \;

# Cari manifest.cookies
echo ""
echo "🍪 Menemukan file cookies/manifest (HARUS DIHAPUS):" | tee -a "$REPORT"
find . -maxdepth 3 -type f \( -name "cookies.txt" -o -name "manifest.json" -o -name "manifest.txt" \) \
  -print \
  -exec sh -c 'echo "  ⚠️  {} (cookies sensitive)" >> "$REPORT"' \;

# Cari env (kecuali .env.example)
echo ""
echo "🌿 Menemukan .env (harus hapus .env, simpan .env.example saja):" | tee -a "$REPORT"
find . -maxdepth 3 -type f -name ".env" \
  ! -name ".env.example" \
  -print \
  -exec sh -c 'echo "  ⚠️  {} (.env tidak boleh ada di workspace)" >> "$REPORT"' \;

# Cari test OCI/vault scalable
echo ""
echo "☁️  Menemukan file test/vault scalable cloud (HARUS DIHAPUS):" | tee -a "$REPORT"
find . -maxdepth 3 -type f -regextype posix-extended -regex ".*(scaleway|oci|aws|gcp|azure).*(test|example|v[0-9]|backup)" \
  -print \
  -exec sh -c 'echo "  ⚠️  {} (test credential cloud beresiko)" >> "$REPORT"' \;

# Cari file *.log / debug-*.* yang masih aktif
echo ""
echo "📜 Menemukan log/debug temp (HARUS DIAPUS/ARCHIVE):" | tee -a "$REPORT"
find . -maxdepth 3 -type f \( -name "*.log" -o -name "debug-*" \) \
  -print \
  -exec sh -c 'echo "  ⚠️  {} (log/debug temp)" >> "$REPORT"' \;

# Cari alpine-*.rootfs (tidak boleh di workspace)
echo ""
echo "🐘 Menemukan alpine-*.rootfs di workspace (HARUS DIHAPUS):" | tee -a "$REPORT"
find . -maxdepth 3 -type f -name "alpine-*.rootfs" \
  -print \
  -exec sh -c 'echo "  ⚠️  {} (binary besar tidak seharusnya)" >> "$REPORT"' \;

echo ""
echo "===================================" | tee -a "$REPORT"
echo "✅ Pencarian selesai."
echo "📄 Laporan: $REPORT"

# Jika ditemukan pencuriga, exit 1
if grep -Eq "Menemukan|⚠️" "$REPORT"; then
  echo "❌❌❌  DITEMUKAN FILE SENSITIF DI WORKSPACE! Harap segera hapus/dipindah/vault."
  echo "📄 Laporan: $REPORT"
  exit 1
else
  echo "✅ Tidak ditemukan file sensitif di workspace"
  exit 0
fi
