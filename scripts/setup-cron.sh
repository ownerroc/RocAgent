#!/bin/bash
# setup-cron.sh — pasang crontab untuk auto-backup RocEnv (setiap 30 menit).
# Jalankan: bash scripts/setup-cron.sh
set -e

ROCENV_DIR="$HOME/rocsystem"
CRON_LINE="*/30 * * * * cd $ROCENV_DIR && node $ROCENV_DIR/backup-auto.cjs >> $ROCENV_DIR/backup/auto.log 2>&1"

mkdir -p "$ROCENV_DIR/backup"

# Ambil crontab yang ada, buang baris backup-auto lama (jika ada), tambahkan yang baru.
TMP="$(mktemp)"
crontab -l 2>/dev/null | grep -v 'backup-auto.cjs' > "$TMP" || true
echo "$CRON_LINE" >> "$TMP"
crontab "$TMP"
rm -f "$TMP"

echo "✅ Crontab dipasang:"
echo "   $CRON_LINE"
echo ""
echo "Cek dengan: crontab -l"
echo "Log backup: tail -f $ROCENV_DIR/backup/auto.log"
