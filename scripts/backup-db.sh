#!/usr/bin/env bash
# NaughtyFish DB backup — the dispute-defense evidence must survive a dead disk.
# Uses sqlite3's online .backup (safe while the app is running). Keeps the last
# 30 snapshots locally; copy backups/ off-machine (cloud drive / second disk).
#
# Usage:  npm run db:backup          (or: bash scripts/backup-db.sh)
# Restore: stop the app, then:  cp backups/<file>.db prisma/dev.db
set -euo pipefail

cd "$(dirname "$0")/.."
DB="prisma/dev.db"
OUT_DIR="backups"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$OUT_DIR/naughtyfish-$STAMP.db"

[ -f "$DB" ] || { echo "No database at $DB — nothing to back up." >&2; exit 1; }
mkdir -p "$OUT_DIR"

if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$DB" ".backup '$OUT'"
else
  # Fallback: plain copy (fine when the app is idle).
  cp "$DB" "$OUT"
fi

# Integrity check on the snapshot.
if command -v sqlite3 >/dev/null 2>&1; then
  CHECK="$(sqlite3 "$OUT" "PRAGMA integrity_check;")"
  [ "$CHECK" = "ok" ] || { echo "Integrity check FAILED on $OUT: $CHECK" >&2; exit 1; }
fi

# Prune: keep the newest 30 snapshots.
ls -1t "$OUT_DIR"/naughtyfish-*.db 2>/dev/null | tail -n +31 | xargs -I{} rm -f {}

SIZE="$(du -h "$OUT" | cut -f1)"
COUNT="$(ls -1 "$OUT_DIR"/naughtyfish-*.db | wc -l | tr -d ' ')"
echo "Backup OK → $OUT ($SIZE). $COUNT snapshot(s) kept. Copy $OUT_DIR/ off-machine!"
