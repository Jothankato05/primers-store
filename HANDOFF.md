# Primers Store — Full Project Handoff

> **Last updated:** 2026-06-18 20:30 GMT+1  
> **Built for:** Jothankato05  
> **Status:** Live (Vercel + Render), 3D storefront, first app (Presona) seeding

---

## Quick Links

| What | URL |
|------|-----|
| 🖥️ Production frontend | `https://primers-store-ruddy.vercel.app` |
| 🔙 Backend API | `https://primers-store.onrender.com` |
| 📦 GitHub repo | `https://github.com/Jothankato05/primers-store` |
| 🚀 Presona release | `https://github.com/Jothankato05/primers-store/releases/tag/v1.0.0` |
| 🖥️ Vercel dashboard | `https://vercel.com/dashboard` → primers-store |
| 🔙 Render dashboard | `https://dashboard.render.com` → primers-store |

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@primers.store` | `admin123` |
| Developer | `dev@primers.store` | `dev123456` |
| User | `user@primers.store` | `user123456` |

These auto-seed on first run (server/index.js `autoSeed()` function).

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  VERCEL (Frontend)                   │
│          primers-store-ruddy.vercel.app              │
│                                                     │
│  React 18 + Vite + Tailwind + Three.js              │
│  - /login, /store, /store/:slug, /dashboard, etc.   │
│  - 3D hero scene (rotating logo, particles)         │
│  - 3D tilt app cards                                │
│                                                     │
│  vercel.json rewrites:                              │
│    /api/*    → https://primers-store.onrender.com    │
│    /uploads/* → https://primers-store.onrender.com   │
│    /*        → /index.html (SPA catch-all)          │
└──────────────┬──────────────────────────────────────┘
               │ HTTPS proxy
               ▼
┌─────────────────────────────────────────────────────┐
│                  RENDER (Backend)                    │
│           primers-store.onrender.com                 │
│                                                     │
│  Node.js + Express + SQLite (better-sqlite3)        │
│  - JWT auth with PBKDF2 password hashing            │
│  - Multer file uploads (500MB max)                  │
│  - App review pipeline (pending→approved/rejected)  │
│  - Developer application system                     │
│  - Auto-seed on first run (users + Presona app)     │
│                                                     │
│  ⚠️ Free tier: sleeps after 15min inactivity        │
│  ⚠️ Keep-alive cron pings /api/health every 10min   │
│  ⚠️ Needs persistent disk for SQLite (1GB)          │
└─────────────────────────────────────────────────────┘
```

---

## Project Structure

```
primers-store/
├── server/                    # Express backend
│   ├── index.js               # Server entry + autoSeed
│   ├── database.js            # SQLite setup, password hashing, JWT tokens
│   ├── seed.js                # Standalone seed script (demo accounts + Presona)
│   ├── middleware/
│   │   └── auth.js            # JWT middleware, role guards, signToken
│   ├── routes/
│   │   ├── auth.js            # Register, login, profile, developer application
│   │   ├── apps.js            # App CRUD, reviews, downloads, versions, screenshots
│   │   └── admin.js           # Admin dashboard, app review, user management
│   └── uploads/               # Uploaded files (icons, banners, app files)
├── client/                    # React frontend
│   ├── .npmrc                 # legacy-peer-deps=true (required for Three.js)
│   ├── vercel.json            # SPA rewrites + API proxy
│   ├── vite.config.js         # Dev proxy to :3001
│   ├── tailwind.config.js     # Primers brand colors (#4361EE)
│   ├── public/
│   │   ├── primers-logo.svg   # Custom SVG logo (blue P + Primers text)
│   │   ├── primers-logo-light.png   # Logo on white bg
│   │   ├── primers-logo-dark.png    # Logo on black bg
│   │   ├── primers-hero.jpg         # iPhone lifestyle mockup
│   │   └── primers-mockup.jpg       # MacBook landing page mockup
│   └── src/
│       ├── context/
│       │   └── AuthContext.jsx # Auth state, apiRequest, login/register/logout
│       ├── components/
│       │   ├── Navbar.jsx      # Top nav with Primers logo, search, user menu
│       │   ├── Footer.jsx      # Site footer
│       │   ├── Hero3DScene.jsx # Three.js 3D hero (rotating P, orbiting rings, particles)
│       │   ├── AppCard3D.jsx   # 3D tilt card with glow effect on hover
│       │   ├── AppCard.jsx     # Original flat card (still used in some places)
│       │   ├── StarRating.jsx  # Star rating display/input
│       │   └── LoadingScreen.jsx
│       └── pages/
│           ├── Home.jsx        # Landing with 3D hero + featured apps
│           ├── Store.jsx       # Browse/search/filter apps
│           ├── AppDetail.jsx   # App detail, reviews, download button
│           ├── Login.jsx       # Login form (no demo buttons)
│           ├── Register.jsx    # Registration form
│           ├── Dashboard.jsx   # User dashboard + profile edit
│           ├── DeveloperDashboard.jsx  # Dev stats + app management
│           ├── SubmitApp.jsx   # Multi-step app submission form
│           ├── EditApp.jsx     # Edit app, add versions, manage screenshots
│           └── AdminDashboard.jsx  # App review, user management, dev applications
├── render.yaml                # Render Blueprint config (Disk mount + JWT_SECRET)
├── package.json               # Root: concurrently for dev
└── README.md
```

## Database Schema

**SQLite** with the following tables:
- `users` — roles: user/developer/admin, PBKDF2 password hashing
- `apps` — status: pending/reviewing/approved/rejected/suspended, slug-based URLs
- `app_versions` — file tracking with SHA256 hashes
- `app_screenshots` — ordered screenshots per app
- `reviews` — 1-5 star ratings, helpful votes
- `review_votes` — upvote/downvote per review
- `downloads` — download tracking with IP/user agent
- `developer_applications` — request developer role with admin approval
- `sessions` — JWT session tokens with expiry

## API Endpoints

### Public
- `GET /api/health` — Health check
- `POST /api/auth/register` — { username, email, password, display_name }
- `POST /api/auth/login` — { email, password } → { user, token }
- `GET /api/apps` — List approved apps (?search, ?category, ?sort, ?limit, ?offset)
- `GET /api/apps/categories` — Category list with counts
- `GET /api/apps/:slug` — App detail + reviews + screenshots
- `POST /api/apps/:slug/reviews` — Submit review (auth required)
- `POST /api/apps/:id/download` — Track download
- `GET /api/apps/:slug/reviews` — Get reviews for app

### Authenticated (any user)
- `GET /api/auth/me` — Current user
- `PATCH /api/auth/profile` — Update display_name, bio, avatar_url
- `POST /api/auth/apply-developer` — Request developer role

### Developer
- `GET /api/apps/developer/mine` — Developer's apps
- `POST /api/apps` — Create app (multipart: name, description, category, icon, screenshots, app_file)
- `PATCH /api/apps/:id` — Update app + media
- `POST /api/apps/:id/versions` — Add new version with file

### Admin
- `GET /api/admin/dashboard` — Stats overview
- `GET/PATCH/DELETE /api/admin/apps` — App review management
- `GET/PATCH /api/admin/users` — User management + role changes
- `GET/PATCH /api/admin/developer-applications` — Dev application review
- `GET/DELETE /api/admin/reviews` — Review moderation

## Known Issues

### 1. Render Authentication (INTERMITTENT)
**Symptom:** Login succeeds (returns token + user), but subsequent API calls with the token return 401.
**Cause:** Unclear — possibly related to Render cold starts or database connection issues on free tier.
**Workaround:** The keep-alive cron prevents sleeping. Still investigating root cause.
**Last tested:** 2026-06-18 20:13 — login + /me BOTH worked through Vercel proxy.

### 2. GitHub Release Missing File
**Symptom:** Presona shows on the store but download link is broken.
**Cause:** The 1.5GB `Presona-Installer.exe` failed to upload via CLI (timeout).
**Fix:** Upload manually:
1. Go to `https://github.com/Jothankato05/primers-store/releases/tag/v1.0.0`
2. Drag `C:\Users\jerry\Downloads\Presona-Installer.exe` into the release
3. Publish the release

### 3. Large Bundle Size
**Symptom:** Production JS bundle is ~1.2MB (337KB gzipped).
**Cause:** Three.js library included for 3D hero + cards.
**Mitigation:** Already acceptable. Could code-split with `React.lazy()` if needed.

### 4. File Case Sensitivity
**Symptom:** Build fails on Linux/Vercel with import errors.
**Cause:** Files committed with lowercase names but imported with PascalCase.
**Fix:** All files renamed to match imports (commit `26238ef`). New files MUST use PascalCase for components/pages.

## Keep-Alive Cron

A cron job pings `https://primers-store.onrender.com/api/health` every 10 minutes to prevent Render's free tier from sleeping.

- **Cron ID:** `ed91572a-59c9-4bd0-9e79-5bcf5eec2795`
- **Schedule:** Every 10 minutes
- **Managed via:** OpenClaw cron system

## Deployment Flow

### Vercel (Frontend)
- **Auto-deploys** on push to `main` branch
- **Root Directory:** `client/`
- **Framework:** Vite (auto-detected)
- **Build Command:** `npm run build` (runs `vite build`)
- **Output:** `client/dist/`
- **Environment Variables needed:** None (rewrites handle proxy)
- **Required file:** `client/.npmrc` with `legacy-peer-deps=true`

### Render (Backend)
- **Auto-deploys** on push to `main` branch
- **Runtime:** Node.js
- **Build Command:** `npm install`
- **Start Command:** `node server/index.js`
- **Required Disk:** 1GB persistent, mount path `/opt/render/project/src/server`
- **Environment Variables:**
  - `NODE_ENV` = `production`
  - `JWT_SECRET` = (auto-generated or set manually)
  - `PORT` = (auto-set by Render, defaults to 10000)

## Colors & Branding

```css
Primers Blue:   #4361EE  (primary)
Primers Dark:   #3A56D4  (hover)
Primers Light:  #91A7FF  (accents)
```

Tailwind config: `client/tailwind.config.js` — `primer` color scale from 50 to 950.

## If You Need to Reset Everything

1. **Wipe database:** Delete the Render persistent disk and redeploy
2. **Wipe Vercel cache:** Redeploy from Vercel dashboard with "Clear cache"
3. **Re-seed locally:** `npm run seed` in project root
4. **Fresh install:** `rm -rf node_modules && npm run install:all`

## What Comes Next (Suggested)

1. **Finish Presona upload** — Drag installer to GitHub release
2. **Add email verification** — Currently stubbed but not implemented (no SMTP)
3. **Payment system** — Stripe integration for paid apps
4. **Auto-update mechanism** — App version checking + background updates
5. **Analytics dashboard** — Download/rating trends for developers
6. **Custom domain** — `primers.store` or similar on Vercel
7. **Switch to PostgreSQL** — Neon (free) for production reliability instead of SQLite
8. **CDN for uploads** — Cloudflare R2 or S3 for app file storage
