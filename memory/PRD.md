# MPS Bee Shop Kiosk - PRD

## Original Problem Statement
Rebuild the MPS Bee Shop Kiosk as a web app. A teacher-run iPad kiosk where students spend earned "Bee Tokens" on classroom shop items. Replace Google Sheets/Apps Script backend with FastAPI + MongoDB.

## Architecture
- **Backend**: FastAPI (Python) on port 8001, Motor async MongoDB driver
- **Frontend**: React with Tailwind CSS + shadcn/ui components on port 3000
- **Database**: MongoDB (beeshopkiosk_db)
- **Collections**: students, items, transactions, sessions

## User Personas
1. **Teacher**: Manages sessions, imports students, adds items, views reports
2. **Student**: Uses kiosk to select class, enter tokens, shop for items (guided by teacher)

## Core Requirements
- 4-step shop flow: Class → Student → Tokens → Shop
- Session-based transaction tracking
- Dashboard with analytics and CSV export
- Student CSV import
- Item management (add/delete)
- iPad-optimized touch targets

## What's Been Implemented (March 26, 2026)
- [x] Full FastAPI backend with 12 API endpoints
- [x] MongoDB collections with auto-seeding of 8 default items
- [x] Shop View: Complete 4-step kiosk flow with numpad, cart, confirm modal
- [x] Dashboard: Session selector, summary cards, expandable class cards, item popularity chart
- [x] Settings Panel: Item CRUD, session management, data reload
- [x] Student Import: CSV text/file upload with preview table
- [x] MPS SVG logo integrated in header and splash screen
- [x] Bee theme with honey/navy/sky blue design system
- [x] Error banner for offline feedback
- [x] Saving overlay + success animation
- [x] Export CSV from dashboard

## Prioritized Backlog
### P0 (Must Have)
- All implemented ✅

### P1 (Should Have)
- PWA manifest.json + service worker for offline support
- Long-press to skip student (currently uses hover button)
- Session history view with date filtering

### P2 (Nice to Have)
- Token balance tracking across sessions
- Student photo/avatar support
- Print-friendly report view
- Dark mode for teacher dashboard
- Undo last transaction feature
