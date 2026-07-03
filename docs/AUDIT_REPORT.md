# IndiaTV Production Audit Report

> Audit date: July 2026 | Status after fixes applied

## Phase 1 — Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| Landing Page | ✅ Working | Stats polling, CTA |
| Video Chat | ✅ Working | WebRTC P2P, full responsive redesign |
| Matching Queue | ✅ Working | Weighted scoring, progressive relaxation |
| POST /api/match/join | ✅ Working | Verified in Vercel + Express paths |
| Supabase Realtime | ✅ Fixed | CSP now allows wss://*.supabase.co |
| Socket.IO | ✅ Working | Docker/Render path with socketio provider |
| WebRTC | ✅ Working | STUN servers configurable |
| Like System | ✅ Fixed | Silent likes; mutual celebration only |
| Temporary Chat | ✅ Fixed | Desktop sidebar + mobile bottom sheet |
| Preferences | ✅ Working | Gender, language, location, interests |
| Reports | ✅ Working | Rate limited |
| Feedback | ✅ Working | Post-chat rating |
| Session Management | ✅ Working | localStorage persistence |
| Health/Stats APIs | ✅ Working | DB connectivity check |
| Analytics | ⚠ Warning | Static admin token — set ADMIN_TOKEN env |
| 404 Page | ✅ Working | Custom NotFoundPage |

## Phase 2 — Deployment Fixes Applied

| Issue | Fix |
|-------|-----|
| CSP blocking Supabase WebSocket | Added headers in vercel.json + nginx.conf |
| CORS | Backend allows *.vercel.app + configured FRONTEND_URL |
| Hardcoded credentials | Removed from all config files |
| /api/match/join 404 | Route exists in both api/match/join.ts and backend routes |
| API URL mismatch | Frontend uses getApiBaseUrl() — same-origin on Vercel |

## Phase 3 — CSP Configuration

Allowed in production CSP:
- `connect-src`: self, Supabase HTTPS/WSS, Render, Vercel, STUN, TURN
- `media-src`: self, blob:
- `Permissions-Policy`: camera, microphone for self

## Phase 4–5 — UI Fixes Applied

- Full viewport mobile video page (native call feel)
- Partner video fills screen; local PiP draggable with safe areas
- Bottom toolbar with smaller controls on mobile
- Navbar/footer hidden on /chat route
- Desktop: sidebar chat panel
- Mobile: bottom sheet chat with drag handle
- Safe area insets for notches, Dynamic Island, gesture nav

## Phase 6 — Like System

**Before:** Heart → no feedback → partner notified immediately  
**After:**
1. Press ❤️ → pulse/glow animation + vibration + liked state
2. Like stored silently on server
3. Both liked → `mutual_like` event → celebration overlay
4. Auto-dismiss after 6 seconds

## Phase 8 — Matching Engine

| Check | Status |
|-------|--------|
| Queue management | ✅ |
| Score calculation | ✅ Unit tested |
| Preference matching | ✅ |
| Location matching | ✅ |
| Interest matching | ✅ |
| Language matching | ✅ |
| Progressive relaxation | ✅ 15s→90s thresholds |
| Recent partner avoidance | ✅ -100 penalty |
| Waiting bonus | ✅ +1/sec max 60 |
| No self-match | ✅ |
| No duplicate queue | ✅ Unique index |

Run tests: `npm run test:matching`

## Phase 11 — API Tests

Run: `npm run test:api` (requires running backend)

Covers: health, stats, locations, interests, start-session, match/join, match/leave, preferences, feedback, report, end-session, 404, invalid input.

## Known Issues

1. **Analytics auth** — Replace static token with ADMIN_TOKEN env var
2. **Dual API implementation** — Vercel serverless + Express backend share logic; keep in sync
3. **Migration 004** — Must be applied to production Supabase manually

## Future Improvements

- TURN server integration for restrictive NAT
- pg_cron for message expiry
- Redis queue for horizontal scaling
- E2E Playwright tests for WebRTC flows
