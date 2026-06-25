#  Primers Store

A full-featured app store platform built from scratch — upload, verify, and distribute applications. Think Microsoft Store, but Primers-branded.

## Features

###  Storefront
- Browse apps by category, search, and sort (downloads, rating, newest)
- App detail pages with screenshots, description, reviews
- Download tracking and version management
- Star ratings and user reviews with helpful votes

### ‍ Developer Portal
- Apply to become a developer
- Submit new apps with metadata, icons, banners, screenshots
- Upload app files (Windows, macOS, Linux, Android, iOS, Web)
- Manage versions and changelogs
- Track downloads and ratings

###  Admin Panel
- Comprehensive dashboard with stats
- App review workflow: pending → reviewing → approved/rejected
- Developer application review and approval
- User management with role assignment
- Review moderation
- Version approval system

###  Authentication
- JWT-based auth with session management
- User roles: user, developer, admin
- Email verification system
- Developer application process with admin approval

## Tech Stack

- **Frontend:** React 18, Tailwind CSS, React Router, Lucide Icons, React Dropzone
- **Backend:** Node.js, Express.js
- **Database:** SQLite (via better-sqlite3)
- **Auth:** JWT with PBKDF2 password hashing

## Getting Started

### Prerequisites
- Node.js 18+

### Install & Run

```bash
# Install dependencies
cd primers-store
npm run install:all

# Seed demo accounts
npm run seed

# Start (runs both backend + frontend)
npm run dev
```

Frontend: `http://localhost:5173`
Backend API: `http://localhost:3001`

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@primers.store | admin123 |
| Developer | dev@primers.store | dev123456 |
| User | user@primers.store | user123456 |

## Project Structure

```
primers-store/
├── server/
│   ├── index.js          # Express server
│   ├── database.js       # SQLite setup + helpers
│   ├── seed.js           # Demo data seeder
│   ├── middleware/
│   │   └── auth.js       # JWT auth middleware
│   ├── routes/
│   │   ├── auth.js       # Registration, login, profile
│   │   ├── apps.js       # App CRUD, reviews, downloads
│   │   └── admin.js      # Admin: review, users, moderation
│   └── uploads/          # Uploaded files storage
├── client/
│   ├── src/
│   │   ├── context/      # Auth context + API client
│   │   ├── components/   # Navbar, Footer, AppCard, StarRating
│   │   └── pages/        # All route pages
│   └── vite.config.js    # Proxy to backend
└── package.json
```

## API Endpoints

### Auth
- `POST /api/auth/register` — Register
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Current user
- `PATCH /api/auth/profile` — Update profile
- `POST /api/auth/apply-developer` — Apply for developer role

### Apps (Public)
- `GET /api/apps` — List apps (supports ?search, ?category, ?sort)
- `GET /api/apps/categories` — List categories
- `GET /api/apps/:slug` — App detail with reviews
- `POST /api/apps/:slug/reviews` — Submit review
- `POST /api/apps/:id/download` — Track download

### Developer
- `GET /api/apps/developer/mine` — Developer's apps
- `POST /api/apps` — Create app (FormData with files)
- `PATCH /api/apps/:id` — Update app
- `POST /api/apps/:id/versions` — Add new version

### Admin
- `GET /api/admin/dashboard` — Stats
- `GET /api/admin/apps` — All apps with filters
- `PATCH /api/admin/apps/:id/review` — Approve/reject app
- `GET /api/admin/users` — User list
- `PATCH /api/admin/users/:id/role` — Change user role
- `GET /api/admin/developer-applications` — Dev applications
- `PATCH /api/admin/developer-applications/:id/review` — Review dev app
- `DELETE /api/admin/reviews/:id` — Remove review

## License

MIT
