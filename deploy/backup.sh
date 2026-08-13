#!/bin/bash
# Nightly backup of the app's persistent data (JSON records + uploaded
# photos/documents + secret.key). Keeps the last N days, deletes older ones
# automatically so backups don't slowly fill the disk.
#
# Set up once via crontab -e (see README "النسخ الاحتياطي التلقائي"):
#   0 2 * * * /home/YOUR_USER/rescue-system/deploy/backup.sh >> /home/YOUR_USER/backup.log 2>&1

set -euo pipefail

DATA_DIR="${FRT_DATA_DIR:-$HOME/frt-data}"
BACKUP_DIR="${FRT_BACKUP_DIR:-$HOME/frt-backups}"
KEEP_DAYS="${FRT_BACKUP_KEEP_DAYS:-14}"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR"

if [ ! -d "$DATA_DIR" ]; then
  echo "[$(date)] ERROR: data directory not found at $DATA_DIR — nothing to back up." >&2
  exit 1
fi

ARCHIVE="$BACKUP_DIR/frt-data-$DATE.tar.gz"
tar -czf "$ARCHIVE" -C "$(dirname "$DATA_DIR")" "$(basename "$DATA_DIR")"

echo "[$(date)] Backup created: $ARCHIVE ($(du -h "$ARCHIVE" | cut -f1))"

# Delete backups older than KEEP_DAYS
find "$BACKUP_DIR" -name "frt-data-*.tar.gz" -mtime "+$KEEP_DAYS" -print -delete | while read -r old; do
  echo "[$(date)] Deleted old backup: $old"
done

echo "[$(date)] Current backups: $(find "$BACKUP_DIR" -name "frt-data-*.tar.gz" | wc -l)"
