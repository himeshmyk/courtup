#!/usr/bin/env bash
#
# CourtUp — deploy & run, then expose a public HTTPS URL via ngrok.
#
# Builds the web PWA + API, runs them as a single origin (the API serves the
# built web app), starts an ngrok tunnel, and prints the URL to open on your
# phone (where you can tap "Install app").
#
# Usage:
#   ./scripts/deploy.sh                # build + run + tunnel on port 8080
#   PORT=9000 ./scripts/deploy.sh      # use a different local port
#   SKIP_BUILD=1 ./scripts/deploy.sh   # skip install/build (fast restart)
#   RESEED=1 ./scripts/deploy.sh       # wipe & re-seed the demo database
#
# Stop everything with Ctrl+C.

set -euo pipefail

# ---- Locate repo root (this script lives in <root>/scripts) ----
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

PORT="${PORT:-8080}"
API_DIR="$ROOT/apps/api"
DB_FILE="$API_DIR/prisma/prod.db"
export DATABASE_URL="file:$DB_FILE"
export SERVE_STATIC=true
export PORT
# NOTE: do NOT export NODE_ENV=production here — it makes `npm install` skip
# devDependencies (typescript/vite/tailwind/prisma), which breaks the build.
# We set NODE_ENV=production only on the server launch line below.
unset NODE_ENV

# ---- Pretty output ----
bold() { printf "\033[1m%s\033[0m\n" "$1"; }
green() { printf "\033[32m%s\033[0m\n" "$1"; }
yellow() { printf "\033[33m%s\033[0m\n" "$1"; }
red() { printf "\033[31m%s\033[0m\n" "$1"; }

SERVER_PID=""
NGROK_PID=""
cleanup() {
  echo ""
  yellow "Shutting down…"
  [ -n "$NGROK_PID" ] && kill "$NGROK_PID" 2>/dev/null || true
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

# ---- Prerequisite checks ----
command -v node >/dev/null 2>&1 || { red "node is required (install Node 20+)."; exit 1; }
command -v npm  >/dev/null 2>&1 || { red "npm is required."; exit 1; }
if ! command -v ngrok >/dev/null 2>&1; then
  red "ngrok is not installed."
  echo "  Install it:  brew install ngrok        (macOS)"
  echo "               https://ngrok.com/download (other)"
  echo "  Then authenticate once: ngrok config add-authtoken <YOUR_TOKEN>"
  echo "  (free token at https://dashboard.ngrok.com/get-started/your-authtoken)"
  exit 1
fi

# ---- Build (skippable) ----
if [ "${SKIP_BUILD:-0}" != "1" ]; then
  bold "📦 Installing dependencies (incl. dev — needed to build)…"
  npm install --include=dev

  bold "🗄️  Preparing database…"
  npm run db:generate -w apps/api
  npm run db:push -w apps/api
  # Seed if the DB is empty (covers fresh + leftover-empty DBs) or RESEED=1.
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

  bold "🏗️  Building web PWA (VITE_API_BASE empty → same-origin /api)…"
  VITE_API_BASE="" npm run build -w apps/web

  bold "🏗️  Building API…"
  npm run build -w apps/api
else
  yellow "SKIP_BUILD=1 → using existing build & database."
fi

# ---- Start the server (single origin: API serves web build) ----
bold "🚀 Starting server on http://localhost:$PORT …"
( cd "$API_DIR" && NODE_ENV=production node dist/index.js ) &
SERVER_PID=$!

# Wait for health
for i in $(seq 1 30); do
  if curl -fsS "http://localhost:$PORT/api/health" >/dev/null 2>&1; then
    green "Server is up (pid $SERVER_PID)."
    break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    red "Server failed to start. See output above."; exit 1
  fi
  sleep 1
  [ "$i" = "30" ] && { red "Server did not become healthy in time."; cleanup; }
done

# ---- Start ngrok tunnel ----
bold "🌐 Opening ngrok tunnel…"
ngrok http "$PORT" --log=stdout > /tmp/courtup_ngrok.log 2>&1 &
NGROK_PID=$!

# Poll ngrok's local API for the public URL
PUBLIC_URL=""
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
    echo ""; yellow "If this is an auth error, run: ngrok config add-authtoken <YOUR_TOKEN>"
    cleanup
  fi
  sleep 1
done

if [ -z "$PUBLIC_URL" ]; then
  red "Could not read the ngrok URL. Check the dashboard at http://127.0.0.1:4040"
  cleanup
fi

# ---- Output ----
echo ""
green "════════════════════════════════════════════════════════════"
bold  "  ✅ CourtUp is live!"
echo ""
bold  "  📱 Open this URL on your phone (Chrome/Safari):"
green  "     $PUBLIC_URL"
echo ""
echo  "     Then tap  ⋮ → Install app  (Android)"
echo  "            or  Share → Add to Home Screen  (iOS)"
echo ""
echo  "  💻 Local:           http://localhost:$PORT"
echo  "  🔎 ngrok dashboard: http://127.0.0.1:4040"
green "════════════════════════════════════════════════════════════"
echo ""
yellow "Press Ctrl+C to stop the server and tunnel."

# Keep running until the server exits or Ctrl+C
wait "$SERVER_PID"
