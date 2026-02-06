
#!/usr/bin/env bash
# bob_auto_setup.sh - Scaffold, install, and run the app end-to-end
set -Eeuo pipefail
APP_ROOT="meeting-memory-intel"
RUN_APP=1
FRESH=0
WITH_MCP=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-run) RUN_APP=0; shift;;
    --fresh) FRESH=1; shift;;
    --with-mcp) WITH_MCP=1; shift;;
    *) shift;;
  esac
done

log(){ echo "[setup] $*"; }
fail(){ echo "[error] $*"; exit 1; }
need(){ command -v "$1" >/dev/null 2>&1 || fail "Missing: $1"; }

need node; need npm; need git

if [[ $FRESH -eq 1 && -d "$APP_ROOT" ]]; then rm -rf "$APP_ROOT"; fi

# copy current regenerated folder as APP_ROOT if not exists
if [[ ! -d "$APP_ROOT" ]]; then
  cp -r "$(dirname "$0")" "$APP_ROOT"
fi

cd "$APP_ROOT/api"
log "Installing dependencies"
npm install

if [[ ! -f .env ]]; then
  cp .env.example .env
  log "Created .env (fill credentials)"
fi

if [[ $RUN_APP -eq 1 ]]; then
  log "Starting dev server"
  npm run dev
else
  log "Done. To run: cd $APP_ROOT/api && npm run dev"
fi
