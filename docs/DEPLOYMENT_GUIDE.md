# Deployment Guide

IndiaTV is deployment-agnostic. Only environment variables change between environments.

## Architecture Paths

### Path A: Vercel (Recommended for frontend + API)
- Frontend: Static SPA from `dist/`
- API: Serverless functions in `api/`
- Signaling: Supabase Realtime (default)
- Set all env vars in Vercel Dashboard

### Path B: Render / Docker (Full backend)
- Express + Socket.IO serves API + optional static SPA
- Set `VITE_SIGNALING_PROVIDER=socketio` for Socket.IO signaling
- Use `docker-compose.yml` for local self-hosted stack

## Environment Variables

See `.env.example` for complete list.

### Required (all deployments)
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

### Vercel-specific
```
VITE_API_URL=          # Leave empty (same-origin)
VITE_SIGNALING_PROVIDER=supabase
```

### Render/Docker-specific
```
PORT=5000
FRONTEND_URL=https://your-frontend-domain.com
VITE_SIGNALING_PROVIDER=socketio
VITE_API_URL=https://your-backend.onrender.com
VITE_SOCKET_URL=https://your-backend.onrender.com
```

## Build Commands

```bash
# Vercel (automatic)
npm run build

# Docker Compose
docker-compose up --build

# Manual backend
cd backend && npm install && npm run build && npm start
```

## Database Migrations

Apply in order on Supabase SQL Editor:
1. `001_initial_schema.sql`
2. `002_realtime_indexes.sql`
3. `003_mvp_upgrade.sql`
4. `004_production_fixes.sql`

## Health Checks

```
GET /api/health   → { status: "healthy", database: "connected" }
GET /api/stats    → Live platform metrics
```

## CSP Headers

Configured automatically via:
- `vercel.json` (Vercel)
- `frontend/nginx.conf` (Docker/nginx)
- `backend/src/index.ts` helmet (Express)

## Post-Deploy Checklist

- [ ] All 4 migrations applied
- [ ] Env vars set (no hardcoded fallbacks)
- [ ] `/api/health` returns healthy
- [ ] `/api/match/join` returns 200
- [ ] Camera/mic permissions work
- [ ] Supabase Realtime connects (check browser console)
- [ ] Like mutual celebration works with two browsers
