# Primers Store — Full Project Handoff

> **Last updated:** 2026-07-02
> **Built for:** Jothankato05
> **Status:** Live (Vercel + Railway + MongoDB Atlas), 3D storefront, first app (Presona) seeded

---

## Quick Links

| What | URL |
|------|-----|
|  Production frontend | `https://primers-store-liard.vercel.app` |
|  Backend API | `https://primers-api-production.up.railway.app` |
|  GitHub repo | `https://github.com/Jothankato05/primers-store` |
|  Presona release | `https://github.com/Jothankato05/primers-store/releases/tag/v1.0.0` |
|  Vercel dashboard | `https://vercel.com/dashboard` → primers-store |
|  Railway dashboard | `https://railway.app/dashboard` → primers-api |
|  MongoDB Atlas | `https://cloud.mongodb.com` → primersstore cluster |

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@primers.store` | `admin123` (override with `ADMIN_PASSWORD` env var) |
| Developer | `dev@primers.store` | `dev123456` |
| User | `user@primers.store` | `user123456` |

These auto-seed on first run (server/index.js `autoSeed()` function).
**Change the admin password after first login** — these credentials are public in this repo.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  VERCEL (Frontend)                   │
│          primers-store-liard.vercel.app              │
│                                                     │
│  React 18 + Vite + Tailwind + Three.js              │
│  - /login, /store, /store/:slug, /dashboard, etc.   │
│  - 3D hero scene (rotating logo, particles)         │
│  - 3D tilt app cards                                │
│                                                     │
│  vercel.json rewrites:                              │
│    /api/*     → Railway backend                     │
│    /uploads/* → Railway backend                     │
│    /*         → /index.html (SPA catch-all)         │
└──────────────┬──────────────────────────────────────┘
               │ HTTPS proxy
               ▼
┌─────────────────────────────────────────────────────┐
│                 RAILWAY (Backend)                    │
│        primers-api-production.up.railway.app         │
│                                                     │
│  Node.js + Express + Mongoose                       │
│  - JWT auth with PBKDF2 password hashing            │
│  - Multer file uploads (500MB max)                  │
│  - App review pipeline (pending→approved/rejected)  │
│  - Developer application system                     │
│  - Auto-seed on first run (users + Presona app)     │
└──────────────┬──────────────────────────────────────┘
               │ mongodb+srv
               ▼
┌─────────────────────────────────────────────────────┐
│               MONGODB ATLAS (Database)               │
│           primersstore.07ocypu.mongodb.net            │
│   Free M0 tier — persistent, survives redeploys      │
└─────────────────────────────────────────────────────┘
```

---

## Project Structure

```
primers-store/
├── server/                    # Express backend
│   ├── index.js               # Server entry + autoSeed + Mongo connect w/ retry
│   ├── database.js            # Mongoose connection, schemas/models, password hashing
│   ├── seed.js                # Standalone seed script (demo accounts)
│   ├── middleware/
│   │   ├── auth.js            # JWT middleware, role guards, signToken
│   │   └── rateLimit.js       # In-memory per-IP rate limiter
│   ├── routes/
│   │   ├── auth.js            # Register, login, profile, developer application
│   │   ├── apps.js            # App CRUD, reviews, downloads, versions, screenshots
│   │   ├── admin.js           # Admin dashboard, app review, user management
│   │   └── ai.js              # AI chat assistant, description generator, moderation
│   └── uploads/               # Uploaded files (⚠ ephemeral on Railway — see Known Issues)
├── client/                    # React frontend
│   ├── .npmrc                 # legacy-peer-deps=true (required for Three.js)
│   ├── vercel.json            # SPA rewrites + API proxy
│   ├── vite.config.js         # Dev proxy to :3001
│   ├── tailwind.config.js     # Primers brand colors (#4361EE)
│   └── src/
│       ├── context/AuthContext.jsx  # Auth state, apiRequest, login/register/logout
│       ├── components/        # Navbar, Footer, Hero3DScene, AppCard3D, AIChatWidget, ...
│       └── pages/             # Home, Store, AppDetail, Login, Register, Dashboard,
│                              # DeveloperDashboard, SubmitApp, EditApp, AdminDashboard
├── launcher/                  # Electron desktop app (window.__PRIMERS__ bridge)
├── package.json               # Root: server deps (express, mongoose, cors, jwt, multer)
└── README.md
```

## Database Schema

**MongoDB (Mongoose models)** — ids are ObjectId strings exposed as `id` in API responses:
- `User` — roles: user/developer/admin, PBKDF2 password hashing
- `App` — status: pending/reviewing/approved/rejected/suspended/removed, slug-based URLs
- `AppVersion` — file tracking with SHA256 hashes
- `AppScreenshot` — ordered screenshots per app
- `Review` — 1-5 star ratings, unique per (app, user)
- `ReviewVote` — upvote/downvote per review, unique per (review, user)
- `Download` — download tracking with IP/user agent
- `DeveloperApplication` — request developer role with admin approval
- `Session` — JWT session tokens with expiry (cleaned hourly)
- `AppInstallation` — per-user installed apps, unique per (user, app)

## API Endpoints

### Public
- `GET /api/health` — Health check (reports `db` connection state; 503 while degraded)
- `POST /api/auth/register` — { username, email, password, display_name } (rate limited)
- `POST /api/auth/login` — { email, password } → { user, token } (brute-force protected)
- `GET /api/apps` — List approved apps (?search, ?category, ?sort, ?limit, ?offset)
- `GET /api/apps/categories` — Category list with counts
- `GET /api/apps/:slug` — App detail + reviews + screenshots + latest_version
- `POST /api/apps/:id/download` — Track download
- `GET /api/apps/:slug/reviews` — Get reviews for app
- `POST /api/ai/chat` — AI app discovery assistant (rate limited)

### Authenticated (any user)
- `GET /api/auth/me` — Current user
- `PATCH /api/auth/profile` — Update display_name, bio, avatar_url
- `POST /api/auth/logout` — Invalidate session
- `POST /api/auth/apply-developer` — Request developer role
- `POST /api/apps/:slug/reviews` — Submit review
- `POST /api/apps/:slug/reviews/:reviewId/vote` — Helpful vote
- `POST/DELETE /api/apps/:slug/install` — Install/uninstall tracking

### Developer
- `GET /api/apps/developer/mine` — Developer's apps
- `POST /api/apps` — Create app (multipart: name, description, category, icon, screenshots, app_file)
- `PATCH /api/apps/:id` — Update app + media
- `POST /api/apps/:id/versions` — Add new version with file
- `POST /api/ai/generate-description` — AI short-description generator
- `POST /api/ai/moderate` — AI content moderation (fails open)

### Admin
- `GET /api/admin/dashboard` — Stats overview
- `GET/PATCH/DELETE /api/admin/apps` — App review management
- `GET/PATCH /api/admin/users` — User management + role changes
- `GET/PATCH /api/admin/developer-applications` — Dev application review
- `GET/DELETE /api/admin/reviews` — Review moderation

## Known Issues

### 1. Uploads are ephemeral on Railway
**Symptom:** App icons, banners, screenshots, and uploaded app files disappear after a redeploy/restart.
**Cause:** `server/uploads/` lives on Railway's ephemeral filesystem.
**Fix options:** attach a Railway volume mounted at `/app/server/uploads`, or (better) move uploads
to object storage (Cloudflare R2 / S3). External download URLs (like Presona's archive.org link)
are unaffected.

### 2. Large Bundle Size
**Symptom:** Production JS bundle is ~1.2MB (337KB gzipped).
**Cause:** Three.js library included for 3D hero + cards.
**Mitigation:** Already acceptable. Could code-split with `React.lazy()` if needed.

### 3. File Case Sensitivity
**Symptom:** Build fails on Linux/Vercel with import errors.
**Cause:** Files committed with lowercase names but imported with PascalCase.
**Fix:** All files renamed to match imports. New files MUST use PascalCase for components/pages.

## Deployment Flow

### Vercel (Frontend)
- **Auto-deploys** on push to `main` branch
- **Root Directory:** `client/`
- **Framework:** Vite (auto-detected)
- **Build Command:** `npm run build` (runs `vite build`)
- **Output:** `client/dist/`
- **Environment Variables needed:** None (rewrites handle proxy)
- **Required file:** `client/.npmrc` with `legacy-peer-deps=true`

### Railway (Backend)
- **Auto-deploys** on push to `main` branch
- **Runtime:** Node.js
- **Start Command:** `node server/index.js`
- **Environment Variables (required):**
  - `MONGODB_URI` = MongoDB Atlas connection string (include a database name in the path,
    e.g. `...mongodb.net/primers_store?retryWrites=true&w=majority`)
  - `JWT_SECRET` = long random string (sessions invalidate if this changes)
  - `NODE_ENV` = `production`
- **Environment Variables (optional):**
  - `ADMIN_PASSWORD` / `ADMIN_EMAIL` — override the seeded admin account
  - `CORS_ORIGIN` — extra allowed origin beyond `primers-store*.vercel.app`
  - `VERCEL_AI_GATEWAY_URL` / `VERCEL_AI_GATEWAY_KEY` / `VERCEL_AI_MODEL` — AI features
  - `DESKTOP_INSTALLER_URL` — desktop download redirect

### MongoDB Atlas
- Free M0 cluster, database name `primers_store` (created automatically on first write)
- **Network Access must allow Railway** — easiest is `0.0.0.0/0` (Allow Access from Anywhere)
- Rotate credentials from Atlas → Database Access if they ever leak

## Colors & Branding

```css
Primers Blue:   #4361EE  (primary)
Primers Dark:   #3A56D4  (hover)
Primers Light:  #91A7FF  (accents)
```

Tailwind config: `client/tailwind.config.js` — `primer` color scale from 50 to 950.

## If You Need to Reset Everything

1. **Wipe database:** Atlas → Browse Collections → drop the `primers_store` database, then restart the Railway service (auto-seed re-runs)
2. **Wipe Vercel cache:** Redeploy from Vercel dashboard with "Clear cache"
3. **Re-seed manually:** `MONGODB_URI=... npm run seed` in project root
4. **Fresh install:** `rm -rf node_modules && npm run install:all`

## What Comes Next (Suggested)

1. **Object storage for uploads** — Cloudflare R2 or S3 (fixes Known Issue #1)
2. **Add email verification** — Currently stubbed but not implemented (no SMTP)
3. **Payment system** — Stripe integration for paid apps
4. **Auto-update mechanism** — App version checking + background updates
5. **Analytics dashboard** — Download/rating trends for developers
6. **Custom domain** — `primers.store` or similar on Vercel
