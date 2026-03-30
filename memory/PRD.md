# MPS Bee Shop Kiosk - PRD

## Original Problem Statement
Rebuild the MPS Bee Shop Kiosk as a web app. A teacher-run iPad kiosk where students spend earned "Bee Tokens" on classroom shop items. Replace Google Sheets/Apps Script backend with FastAPI + MongoDB.

## Architecture
- **Backend**: FastAPI (Python) on port 8001, Motor async MongoDB driver
- **Frontend**: React with Tailwind CSS + shadcn/ui components on port 3000
- **Database**: MongoDB (`beeshopkiosk_db` for app data, `welltrack_db` for student/user syncing)
- **Collections**: students, items, transactions, sessions, admin_sessions
- **Auth**: Custom Google OAuth 2.0 (cookie-based sessions, validated against `welltrack_db.users`)

## User Personas
1. **Teacher**: Manages sessions, imports students, adds items, views reports, runs kiosk
2. **Student**: Uses kiosk to select class, enter tokens, shop for items (guided by teacher)

## Core Requirements
- 4-step shop flow: Class → Student → Tokens → Shop
- Session-based transaction tracking
- Dashboard with analytics and CSV export
- Student sync from WellTrack database
- Item management (add/edit/delete)
- iPad-optimized touch targets, no-scroll kiosk mode
- Full app protected by Google OAuth (only pre-existing users in welltrack_db.users)

## What's Been Implemented
- [x] Full FastAPI backend with 15+ API endpoints
- [x] MongoDB collections with auto-seeding of 8 default items
- [x] Shop View: Complete 4-step kiosk flow with numpad, cart, confirm modal
- [x] Dashboard: Session selector, summary cards, expandable class cards, item popularity chart
- [x] Settings Panel: Item CRUD, session management, data reload
- [x] Student Import: CSV text/file upload with preview table
- [x] Student Sync: Pull active students from WellTrack database
- [x] MPS SVG logo integrated in header and splash screen
- [x] Bee theme with honey/navy/sky blue design system
- [x] Error banner for offline feedback
- [x] Saving overlay + success animation
- [x] Export CSV from dashboard
- [x] Custom Google OAuth 2.0 (full app gate, cookie-based sessions)
- [x] Proper withCredentials for cookie transport
- [x] Fixed redirect_uri to use app root (single Google Console registration)
- [x] Post-auth redirect preservation via sessionStorage
- [x] Regex-safe email lookup in welltrack_db
- [x] URL-encoded OAuth parameters
- [x] Improved auth error UX for unauthorized users

## Key API Endpoints
- `GET /api/auth/google/login` - Returns Google OAuth URL
- `POST /api/auth/google/callback` - Exchanges code, validates user, sets cookie
- `GET /api/auth/me` - Validates session cookie
- `POST /api/auth/logout` - Clears session
- `GET /api/students` - List students grouped by class
- `POST /api/students/sync-welltrack` - Sync from WellTrack DB
- `GET /api/items` - List shop items
- `POST/PUT/DELETE /api/items` - Item CRUD
- `GET /api/sessions` / `POST /api/sessions` - Session management
- `PUT /api/sessions/{label}/activate` - Activate session
- `POST /api/transactions` - Record purchase
- `GET /api/report` / `GET /api/report/items` - Analytics

## Prioritized Backlog
### P1 (Should Have)
- Student photo thumbnails from WellTrack's photo_url field
- PWA manifest.json + service worker for offline support
- Session history view with date filtering

### P2 (Nice to Have)
- Token balance tracking across sessions
- Print-friendly report view
- Dark mode for teacher dashboard
- Undo last transaction feature
