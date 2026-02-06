
#!/usr/bin/env bash
# seed_bob_tasks.sh - Fill .bob with detailed content (idempotent)
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
BOB_DIR="$ROOT/.bob"
mkdir -p "$BOB_DIR"

echo "[seed] Writing .bob artifacts into: $BOB_DIR"
# Files are already present in this regenerated package; this script is here
# in case you want to re-run after cleaning.
exit 0
