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
- 4-step shop flow: Class -> Student -> Tokens -> Shop
- Session-based transaction tracking
- Dashboard with analytics and CSV export
- Student sync from WellTrack database (with photo support)
- Item management (add/edit/delete)
- iPad-optimized touch targets, no-scroll kiosk mode
- Full app protected by Google OAuth (only pre-existing users in welltrack_db.users)
- Token balance tracking across sessions
- Session history with date filtering

## What's Been Implemented
- [x] Full FastAPI backend with 16+ API endpoints
- [x] MongoDB collections with auto-seeding of 8 default items
- [x] Shop View: Complete 4-step kiosk flow with numpad, cart, confirm modal
- [x] Dashboard: Session selector, summary cards, expandable class cards, item popularity chart
- [x] Settings Panel: Item CRUD, session management, data reload
- [x] Student Import: CSV text/file upload with preview table
- [x] Student Sync: Pull active students from WellTrack database (with photo_url)
- [x] MPS SVG logo integrated in header and splash screen
- [x] Bee theme with honey/navy/sky blue design system
- [x] Error banner for offline feedback
- [x] Saving overlay + success animation
- [x] Export CSV from dashboard
- [x] Custom Google OAuth 2.0 (full app gate, cookie-based sessions)
- [x] withCredentials for cookie transport
- [x] iPad-optimized big buttons (class, student, items)
- [x] Student photo thumbnails with initials fallback
- [x] Cumulative token balance tracking (all-sessions view in admin)
- [x] Session date filtering in admin panel

## Key API Endpoints
- `GET /api/auth/google/login` - Returns Google OAuth URL
- `POST /api/auth/google/callback` - Exchanges code, validates user, sets cookie
- `GET /api/auth/me` - Validates session cookie
- `POST /api/auth/logout` - Clears session
- `GET /api/students` - List students as objects {name, photo_url?} grouped by class
- `POST /api/students/sync-welltrack` - Sync from WellTrack DB (includes photo_url)
- `GET /api/items` - List shop items
- `POST/PUT/DELETE /api/items` - Item CRUD
- `GET /api/sessions` / `POST /api/sessions` - Session management
- `PUT /api/sessions/{label}/activate` - Activate session
- `POST /api/transactions` - Record purchase
- `GET /api/report` / `GET /api/report/items` - Analytics
- `GET /api/report/balances` - Cumulative token savings per student

## Production Deployment Notes
- Nginx: `/beeshopkiosk/api/` proxies to `http://127.0.0.1:8001/api/`
- Frontend `.env` needs `REACT_APP_BASE_PATH=/beeshopkiosk`
- Google Console redirect URI: `http://apps.mps.edu.vic.gov.au/beeshopkiosk`
- Backend venv needs `httpx` installed

## Prioritized Backlog
### P1 (Should Have)
- PWA manifest.json + service worker for offline iPad support

### P2 (Nice to Have)
- Print-friendly report view
- Dark mode for teacher dashboard
- Undo last transaction feature
