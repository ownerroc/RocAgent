#!/data/data/com.termux/files/usr/bin/bash
#roc-termux filestore key backup script

FILESTORE_DIR="/sdcard/RocOwner/.roc/filestore"
KEY_FILE="$FILESTORE_DIR/filestore.key"
BACKUP_DIR="$FILESTORE_DIR/backups"

mkdir -p "$BACKUP_DIR"

# Generate new key if not exists
if [ ! -f "$KEY_FILE" ]; then
    openssl rand -base64 32 > "$KEY_FILE"
    echo "New filestore key generated"
else
    echo "Filestore key already exists"
fi

# Backup existing key
cp "$KEY_FILE" "$BACKUP_DIR/filestore.key.$(date +%Y%m%d_%H%M%S)"

echo "Filestore key location: $KEY_FILE"
echo "Key contents:"
cat "$KEY_FILE"