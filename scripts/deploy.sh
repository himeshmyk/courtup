#!/usr/bin/env bash
#
# CourtUp — deploy & run, locally or exposed publicly via ngrok.
#
# Modes (MODE):
#   prod (default) — builds the PWA + API and runs them as a single origin
#                    (the API serves the built web app). Best for sharing/demo.
#   dev            — hot reload: Vite (frontend HMR) + API (tsx watch, auto
#                    restart). Edits reflect live without a rebuild.
#
# Exposure (TUNNEL):
#   0 (default)    — run locally only; prints the http://localhost URL.
#                    ngrok is NOT required or started.
#   1              — also open an ngrok tunnel; prints the public HTTPS URL
#                    (needed to install the PWA on a phone).
#
# Usage:
#   ./scripts/deploy.sh                 # prod build, LOCAL only (localhost URL)
#   TUNNEL=1 ./scripts/deploy.sh        # prod build + public ngrok URL
#   MODE=dev ./scripts/deploy.sh        # hot reload, LOCAL only
#   MODE=dev TUNNEL=1 ./scripts/deploy.sh   # hot reload + public ngrok URL
#   PORT=9000 ./scripts/deploy.sh       # prod: different local port
#   SKIP_BUILD=1 ./scripts/deploy.sh    # prod: reuse last build/db (fast)
#   RESEED=1 ./scripts/deploy.sh        # wipe & re-seed the demo database
#
# If a previous run is still up, this script stops it first, then rebuilds.
# Stop everything with Ctrl+C.

set -euo pipefail

# ---- Locate repo root (this script lives in <root>/scripts) ----
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

MODE="${MODE:-prod}"
TUNNEL="${TUNNEL:-0}"   # 0 = localhost only (default), 1 = expose via ngrok
API_DIR="$ROOT/apps/api"
DB_FILE="$API_DIR/prisma/prod.db"

PROD_PORT="${PORT:-8080}"
DEV_WEB_PORT=5173
DEV_API_PORT=4000

if [ "$MODE" = "dev" ]; then
  TUNNEL_PORT="$DEV_WEB_PORT"
else
  TUNNEL_PORT="$PROD_PORT"
  # prod uses a dedicated prod.db (absolute path, unambiguous)
  export DATABASE_URL="file:$DB_FILE"
fi
# NOTE: never export NODE_ENV=production before `npm install` — it makes npm
# skip devDependencies (typescript/vite/tsx) and breaks the build.

# ---- Pretty output ----
bold()   { printf "\033[1m%s\033[0m\n" "$1"; }
green()  { printf "\033[32m%s\033[0m\n" "$1"; }
yellow() { printf "\033[33m%s\033[0m\n" "$1"; }
red()    { printf "\033[31m%s\033[0m\n" "$1"; }

# ---- Stop any prior run (frees ports + kills our server + ngrok) ----
free_port() {
  local p="$1" pids
  pids="$(lsof -ti tcp:"$p" 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    yellow "Stopping process on port $p (pid: $pids)…"
    # shellcheck disable=SC2086
    kill $pids 2>/dev/null || true
  fi
}
stop_existing() {
  if [ "$MODE" = "dev" ]; then
    free_port "$DEV_WEB_PORT"; free_port "$DEV_API_PORT"
  else
    free_port "$PROD_PORT"
  fi
  pkill -f "node dist/index.js"       2>/dev/null || true  # prod server
  pkill -f "tsx watch src/index.ts"   2>/dev/null || true  # dev API
  pkill -f "courtup .* run dev"        2>/dev/null || true
  # Only stop ngrok when we're about to start our own (free tier = 1 agent);
  # a local-only run leaves any unrelated tunnels you have alone.
  [ "$TUNNEL" = "1" ] && pkill -x ngrok 2>/dev/null || true
  sleep 1
}

SERVER_PID=""
NGROK_PID=""
CLEANED=0
cleanup() {
  [ "$CLEANED" = "1" ] && return 0
  CLEANED=1
  echo ""
  yellow "Shutting down (stopping server + tunnel)…"
  [ -n "$NGROK_PID" ]  && kill "$NGROK_PID"  2>/dev/null || true
  if [ -n "$SERVER_PID" ]; then
    pkill -P "$SERVER_PID" 2>/dev/null || true   # children (concurrently → api/web)
    kill "$SERVER_PID"     2>/dev/null || true
  fi
  stop_existing
}
# EXIT covers "server died / script ended for any reason" → ngrok never orphaned.
# INT/TERM (Ctrl+C) clean up then exit. The CLEANED guard prevents double-runs.
trap cleanup EXIT
trap 'cleanup; exit 130' INT TERM

# ---- Prerequisite checks ----
command -v node >/dev/null 2>&1 || { red "node is required (install Node 20+)."; exit 1; }
command -v npm  >/dev/null 2>&1 || { red "npm is required."; exit 1; }
if [ "$TUNNEL" = "1" ] && ! command -v ngrok >/dev/null 2>&1; then
  red "TUNNEL=1 but ngrok is not installed."
  echo "  Install:  brew install ngrok   (or https://ngrok.com/download)"
  echo "  Then once: ngrok config add-authtoken <YOUR_TOKEN>"
  echo "  (free token: https://dashboard.ngrok.com/get-started/your-authtoken)"
  echo "  Or omit TUNNEL=1 to run locally without ngrok."
  exit 1
fi

bold "🧹 Stopping any previous CourtUp run…"
stop_existing

# ---- Dependencies (always include dev deps — needed to build/run) ----
if [ "${SKIP_BUILD:-0}" = "1" ]; then
  yellow "SKIP_BUILD=1 → skipping install & build (reusing existing build/db)."
else
  bold "📦 Installing dependencies…"
  npm install --include=dev
fi

# ---- Database (generate, push, seed-if-empty) ----
bold "🗄️  Preparing database…"
npm run db:generate -w apps/api
npm run db:push -w apps/api
VENUE_COUNT="$(cd "$API_DIR" && node -e '
  const { PrismaClient } = require("@prisma/client");
  const p = new PrismaClient();
  p.venue.count().then(c => { console.log(c); process.exit(0); })
    .catch(() => { console.log(0); process.exit(0); });
' 2>/dev/null || echo 0)"
if [ "${RESEED:-0}" = "1" ] || [ "${VENUE_COUNT:-0}" = "0" ]; then
  bold "🌱 Seeding demo data…"
  npm run db:seed -w apps/api
else
  green "Existing database kept ($VENUE_COUNT venues; set RESEED=1 to reset)."
fi

# ---- Start the app ----
if [ "$MODE" = "dev" ]; then
  bold "🔥 Starting HOT-RELOAD dev servers (Vite :$DEV_WEB_PORT + API :$DEV_API_PORT)…"
  ( TUNNEL_HMR=1 npm run dev ) &
  SERVER_PID=$!
  HEALTH_URL="http://localhost:$DEV_API_PORT/api/health"
  READY_URL="http://localhost:$DEV_WEB_PORT/"
else
  if [ "${SKIP_BUILD:-0}" = "1" ]; then
    [ -f "$API_DIR/dist/index.js" ] && [ -f "$ROOT/apps/web/dist/index.html" ] || {
      red "SKIP_BUILD=1 but no existing build found. Run once without SKIP_BUILD."; exit 1; }
  else
    bold "🏗️  Building web PWA (same-origin /api)…"
    VITE_API_BASE="" npm run build -w apps/web
    bold "🏗️  Building API…"
    npm run build -w apps/api
  fi
  bold "🚀 Starting server on http://localhost:$PROD_PORT …"
  ( cd "$API_DIR" && NODE_ENV=production SERVE_STATIC=true PORT="$PROD_PORT" node dist/index.js ) &
  SERVER_PID=$!
  HEALTH_URL="http://localhost:$PROD_PORT/api/health"
  READY_URL="$HEALTH_URL"
fi

# Wait until healthy
for i in $(seq 1 40); do
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1 && curl -fsS "$READY_URL" >/dev/null 2>&1; then
    green "App is up (pid $SERVER_PID)."
    break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    red "App failed to start. See output above."; exit 1
  fi
  sleep 1
  [ "$i" = "40" ] && { red "App did not become healthy in time."; exit 1; }
done

# ---- ngrok tunnel (only when TUNNEL=1) ----
PUBLIC_URL=""
if [ "$TUNNEL" = "1" ]; then
  bold "🌐 Opening ngrok tunnel → port $TUNNEL_PORT …"
  ngrok http "$TUNNEL_PORT" --log=stdout > /tmp/courtup_ngrok.log 2>&1 &
  NGROK_PID=$!
  for i in $(seq 1 30); do
    PUBLIC_URL="$(node -e '
      fetch("http://127.0.0.1:4040/api/tunnels")
        .then(r => r.json())
        .then(d => {
          const t = (d.tunnels || []).find(x => (x.public_url||"").startsWith("https")) || (d.tunnels||[])[0];
          if (t) process.stdout.write(t.public_url);
        })
        .catch(() => {});
    ' 2>/dev/null || true)"
    [ -n "$PUBLIC_URL" ] && break
    if ! kill -0 "$NGROK_PID" 2>/dev/null; then
      red "ngrok exited. Last log lines:"; tail -n 15 /tmp/courtup_ngrok.log
      echo ""; yellow "If this is an auth error: ngrok config add-authtoken <YOUR_TOKEN>"
      exit 1
    fi
    sleep 1
  done
  [ -z "$PUBLIC_URL" ] && { red "Could not read the ngrok URL (see http://127.0.0.1:4040)."; exit 1; }
fi

# ---- Output ----
LOCAL_URL="http://localhost:$TUNNEL_PORT"
echo ""
green "════════════════════════════════════════════════════════════"
bold  "  ✅ CourtUp is live!  (mode: $MODE$([ "$MODE" = dev ] && echo ' — hot reload ON'))"
echo ""
if [ "$TUNNEL" = "1" ]; then
  bold  "  📱 Public URL (open on your phone — Chrome/Safari):"
  green "     $PUBLIC_URL"
  echo ""
  echo  "     Then tap  ⋮ → Install app  (Android)  /  Share → Add to Home Screen (iOS)"
  echo  "  💻 Local:           $LOCAL_URL"
  echo  "  🔎 ngrok dashboard: http://127.0.0.1:4040"
else
  bold  "  💻 Open this URL:"
  green "     $LOCAL_URL"
  echo ""
  echo  "     (Installable as a PWA in desktop Chrome on localhost.)"
  echo  "     Want a public URL for your phone?  Re-run with  TUNNEL=1"
fi
[ "$MODE" = "dev" ] && echo "  ✏️  Edit files in apps/web or apps/api — changes reload live."
green "════════════════════════════════════════════════════════════"
echo ""
yellow "Press Ctrl+C to stop$([ "$TUNNEL" = "1" ] && echo ' the server and tunnel' || echo ' the server')."

wait "$SERVER_PID"
