# MPS Bee Shop Kiosk - PRD

## Original Problem Statement
Rebuild the MPS Bee Shop Kiosk as a web app. A teacher-run iPad kiosk where students spend earned "Bee Tokens" on classroom shop items. Replace Google Sheets/Apps Script backend with FastAPI + MongoDB.

## Architecture
- **Backend**: FastAPI (Python) on port 8001, Motor async MongoDB driver
- **Frontend**: React with Tailwind CSS + shadcn/ui components on port 3000
- **Database**: MongoDB (`beeshopkiosk_db` for app data, `welltrack_db` for students/users)
- **Collections (beeshopkiosk_db)**: items, transactions, sessions, admin_sessions, skipped_students
- **Auth**: Custom Google OAuth 2.0 (cookie-based sessions, validated against `welltrack_db.users`)

## Data Architecture
- Students: Read LIVE from `welltrack_db.students` (no sync needed). Falls back to local CSV imports if welltrack empty.
- Skip tracking: `beeshopkiosk_db.skipped_students` (class, student, session_label)
- Transactions: `beeshopkiosk_db.transactions`
- Sessions: `beeshopkiosk_db.sessions`

## What's Been Implemented
- [x] Full FastAPI backend with 16+ API endpoints
- [x] Live student data from welltrack_db (auto-populates, no manual sync)
- [x] Shop View: 4-step kiosk flow with big buttons, numpad, cart, confirm modal
- [x] Dashboard: Session selector, summary cards, class cards, item rankings, token balances
- [x] Settings Panel: Item CRUD, session management
- [x] Student Import: CSV fallback when welltrack_db is empty
- [x] Custom Google OAuth 2.0 with cookie-based sessions
- [x] iPad-optimized layout (big touch targets, no-scroll viewport)
- [x] Student photo thumbnails with initials fallback
- [x] Cumulative token balance tracking across sessions
- [x] Session date filtering in admin

## Key API Endpoints
- `GET /api/students` - Live read from welltrack_db, fallback to local
- `POST /api/students/skip` - Skip student for current session
- `POST /api/students/import` - CSV import fallback
- `GET /api/items` / `POST/PUT/DELETE /api/items` - Item CRUD
- `GET /api/sessions` / `POST /api/sessions` - Session management
- `PUT /api/sessions/{label}/activate` - Activate session
- `DELETE /api/sessions/{label}` - Delete session + cleanup skips
- `POST /api/transactions` - Record purchase
- `GET /api/report` / `GET /api/report/items` / `GET /api/report/balances` - Analytics

## Prioritized Backlog
### P1
- PWA manifest + service worker for offline iPad support

### P2
- Print-friendly report view
- Dark mode for teacher dashboard
- Undo last transaction feature
