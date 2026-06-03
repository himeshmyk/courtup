# 🏸 CourtUp — Book & Play (PWA)

A sports-venue **booking** + **social games** Progressive Web App, inspired by apps
like Hudle/Grip. Runs in any browser, installs to your Android/iOS home screen,
and can be shared publicly via ngrok or deployed to GCP Cloud Run.

> Personal/learning project. Venue names, branding, and content are original
> placeholders — not affiliated with any real product.

## ✨ Features

**Booking flow**
- Home with location header, sport picker, and games near you
- Explore venues (filter by sport / All · Venues · Games)
- Venue detail → **select facility** (e.g. Synthetic+Wooden ₹350 / Center Court ₹375)
- **Slot-grid calendar** — days × hourly slots with live "X left" availability
- Confirm booking (mock payment) → **My Bookings**

**Social games**
- Open games near you, with host, per-player share, and join progress
- Game detail → **Join / Leave**, players list
- **Host a Game** — pick venue, sport, time, format, players, cost split

**PWA**
- Installable (manifest + service worker via Workbox)
- Offline-tolerant API caching, works as a standalone app

## 🧱 Tech stack

| Layer    | Tech                                            |
| -------- | ----------------------------------------------- |
| Frontend | React 18 · Vite · TypeScript · Tailwind · PWA   |
| Backend  | Node · Express · TypeScript                     |
| Data     | Prisma ORM · SQLite (local) → Postgres (prod)   |

Monorepo via npm workspaces:

```
hudle/
├─ apps/api/     # Express + Prisma API (also serves the web build in prod)
├─ apps/web/     # React PWA
├─ Dockerfile    # single-container build (web + api)
└─ docker-compose.yml
```

> ℹ️ **No login yet.** Every request acts as a single seeded user ("Himesh").
> Auth can be added later without changing the data model.

---

## 🚀 Run locally (dev)

Requires Node 20+.

```bash
# 1. Install deps
npm install

# 2. Create + seed the SQLite database (one time)
npm run db:setup

# 3. Start API (:4000) + web (:5173) together
npm run dev
```

Open **http://localhost:5173**. The web dev server proxies `/api` → `:4000`.

Reset demo data anytime:

```bash
npm run db:setup    # re-pushes schema + re-seeds
```

---

## ⚡ One command: build & run

```bash
./scripts/deploy.sh
```

Builds the PWA + API, runs them as a **single origin**, and prints the
**`http://localhost:8080`** URL. Runs **locally by default** — no ngrok needed.
If a previous run is still up, the script **stops it first**, then rebuilds.
Stop with `Ctrl+C`.

### 🌐 Get a public URL for your phone (`TUNNEL=1`)

```bash
TUNNEL=1 ./scripts/deploy.sh
```

Also opens an **ngrok** tunnel and prints the public **HTTPS URL** (required to
install the PWA on a phone). Prereqs: [ngrok](https://ngrok.com/download)
(`brew install ngrok`, then `ngrok config add-authtoken <token>` once).

### 🔥 Hot-reload mode (`MODE=dev`)

```bash
MODE=dev ./scripts/deploy.sh            # hot reload, local
MODE=dev TUNNEL=1 ./scripts/deploy.sh   # hot reload on the public URL
```

Runs Vite (frontend **HMR**) + the API in watch mode. Edit anything in
`apps/web` or `apps/api` and it reloads live — no rebuild. (When tunnelling,
Vite is configured to accept the ngrok host and route HMR over `wss:443`.)

### Flags

```bash
TUNNEL=1   ./scripts/deploy.sh     # expose via ngrok (default: localhost only)
MODE=dev   ./scripts/deploy.sh     # hot reload (default: prod build)
PORT=9000  ./scripts/deploy.sh     # prod: different local port
SKIP_BUILD=1 ./scripts/deploy.sh   # prod: reuse last build/db (fast)
RESEED=1   ./scripts/deploy.sh     # wipe & re-seed demo data
```

## 📱 Install on your Android phone (via ngrok)

PWA install requires **HTTPS**. ngrok gives you a public HTTPS URL to your laptop.
(`TUNNEL=1 ./scripts/deploy.sh` automates everything in this section.)

**Option A — single URL (recommended):** run the production container so one URL
serves both the app and API (see Docker below), then:

```bash
ngrok http 8080
```

**Option B — dev servers:** point ngrok at Vite (the proxy forwards `/api`):

```bash
ngrok http 5173
```

Then on your phone:

1. Open the `https://<something>.ngrok-free.app` URL in **Chrome**.
2. Tap **⋮ → Install app** (or "Add to Home Screen").
3. CourtUp launches full-screen like a native app. 🎉

> iOS: open in **Safari** → Share → **Add to Home Screen**.

---

## 🐳 Run with Docker (production mode, one container)

```bash
docker compose up --build
# open http://localhost:8080
```

This builds the web PWA, builds the API, and the API serves both on port 8080
(no CORS, single origin). Great for ngrok and Cloud Run.

---

## ☁️ Deploy to GCP Cloud Run

```bash
PROJECT=your-gcp-project
REGION=asia-south1

# Build & push the image (Cloud Build)
gcloud builds submit --tag gcr.io/$PROJECT/courtup

# Deploy
gcloud run deploy courtup \
  --image gcr.io/$PROJECT/courtup \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080
```

Cloud Run injects `PORT`; the container already listens on it and sets
`SERVE_STATIC=true`. You'll get a public HTTPS URL — open it on your phone and
install the PWA directly (no ngrok needed).

### Persisting data (Postgres / Cloud SQL)

SQLite on Cloud Run is **ephemeral** (resets per instance) — fine for a demo.
For real persistence:

1. In `apps/api/prisma/schema.prisma`, change:
   ```prisma
   datasource db {
     provider = "postgresql"   // was "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
2. Provision Cloud SQL (Postgres) and connect it to the Cloud Run service.
3. Deploy with the connection string:
   ```bash
   gcloud run deploy courtup \
     --image gcr.io/$PROJECT/courtup \
     --region $REGION --allow-unauthenticated --port 8080 \
     --add-cloudsql-instances $PROJECT:$REGION:courtup-db \
     --set-env-vars DATABASE_URL="postgresql://USER:PASS@/courtup?host=/cloudsql/$PROJECT:$REGION:courtup-db"
   ```

The Prisma models are unchanged — only the datasource provider differs.

---

## 🔌 API reference (quick)

| Method | Path                                   | Purpose                         |
| ------ | -------------------------------------- | ------------------------------- |
| GET    | `/api/me`                              | Current (seeded) user           |
| GET    | `/api/sports`                          | Sport list                      |
| GET    | `/api/venues?sport=`                   | Venues (optional sport filter)  |
| GET    | `/api/venues/:id`                      | Venue + facilities              |
| GET    | `/api/facilities/:id/availability`     | Slot grid (`?from=&days=`)      |
| POST   | `/api/bookings`                        | Create booking                  |
| GET    | `/api/bookings`                        | My bookings                     |
| DELETE | `/api/bookings/:id`                    | Cancel booking                  |
| GET    | `/api/games?sport=`                    | Open games                      |
| GET    | `/api/games/:id`                       | Game detail                     |
| POST   | `/api/games`                           | Host a game                     |
| POST   | `/api/games/:id/join` · `/leave`       | Join / leave a game             |

---

## 🗺️ Roadmap (deferred)

- Auth (phone OTP) + per-user profiles
- Live match score tracking & in-game chat
- Real payment gateway (Razorpay/Stripe)
- Community tab, ratings & reviews
- Push notifications
