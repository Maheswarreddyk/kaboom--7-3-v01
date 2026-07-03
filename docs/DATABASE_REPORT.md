# IndiaTV — Database Report

> Generated from migrations 001–004. The database is the source of truth.

## Schema Overview

| Table | Purpose | RLS |
|-------|---------|-----|
| `visitor_sessions` | Anonymous session metadata & preferences | Deny public |
| `waiting_queue` | Match queue entries | Deny public |
| `matches` | Paired video chat connections | Deny public |
| `reports` | Abuse reports | Deny public |
| `feedback` | Post-chat ratings | Deny public |
| `server_metrics` | Platform stats snapshots | Public read |
| `connection_logs` | Audit trail | Deny public |
| `interests` | Autocomplete interests | Public read |
| `locations` | Autocomplete locations | Public read |
| `likes` | Per-match like records | Deny public |
| `temporary_messages` | Ephemeral chat (1hr expiry) | Deny public |

---

## Table Details

### visitor_sessions

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | UUID | NO | PK |
| session_token | VARCHAR(255) | NO | UNIQUE, client auth |
| country | VARCHAR(100) | YES | Geo preference |
| browser, device, platform | VARCHAR(100) | YES | Client metadata |
| created_at | TIMESTAMPTZ | NO | DEFAULT NOW() |
| ended_at | TIMESTAMPTZ | YES | Session end |
| status | session_status | NO | active/waiting/matched/ended |
| gender | VARCHAR(50) | YES | Added 003 |
| looking_for | VARCHAR(50)[] | YES | Gender preferences |
| languages | VARCHAR(100)[] | YES | Language prefs |
| state, district, city | VARCHAR(100) | YES | Location prefs |
| interest_tags | VARCHAR(100)[] | YES | Interest prefs |
| last_partner | UUID | YES | FK → visitor_sessions |
| queue_entered_at | TIMESTAMPTZ | YES | Queue timing |
| last_activity | TIMESTAMPTZ | YES | Activity tracking |

**Used by:** `start-session`, `end-session`, `match/*`, `preferences`, matching engine  
**Indexes:** token, status, created_at, last_activity

### waiting_queue

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | UUID | NO | PK |
| session_id | UUID | NO | FK → visitor_sessions CASCADE |
| joined_at | TIMESTAMPTZ | NO | Queue entry time |
| status | queue_status | NO | waiting/matched/left/expired |
| score_cache | INTEGER | YES | Match score cache |
| preference_hash | VARCHAR(255) | YES | Preference fingerprint |
| search_started | TIMESTAMPTZ | YES | Search start |
| priority | INTEGER | YES | Queue priority |

**Unique:** One active waiting entry per session (`idx_waiting_queue_active_session`)

### matches

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | UUID | NO | PK |
| user_a, user_b | UUID | NO | FK → visitor_sessions |
| started_at | TIMESTAMPTZ | NO | Match start |
| ended_at | TIMESTAMPTZ | YES | NULL = active |
| duration_seconds | INTEGER | YES | Computed on end |
| ended_reason | match_end_reason | YES | next/leave/disconnect/report/timeout/error |
| match_score | INTEGER | YES | Compatibility score |
| matched_reason | TEXT | YES | Score breakdown |
| liked_by_a, liked_by_b | BOOLEAN | YES | Like flags |
| chat_enabled | BOOLEAN | YES | Chat toggle |
| connection_quality | VARCHAR(50) | YES | WebRTC quality |

### likes

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | UUID | NO | PK |
| match_id | UUID | NO | FK → matches CASCADE |
| session_id | UUID | NO | FK → visitor_sessions CASCADE |
| created_at | TIMESTAMPTZ | NO | Like timestamp |

**Unique (004):** `(match_id, session_id)` — prevents duplicate likes

### temporary_messages

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | UUID | NO | PK |
| match_id | UUID | NO | FK → matches CASCADE |
| sender_session | UUID | NO | FK → visitor_sessions |
| message | TEXT | NO | Message content |
| created_at | TIMESTAMPTZ | NO | Created |
| expires_at | TIMESTAMPTZ | NO | Auto-purge target |

---

## Compatibility Report

| Layer | Status | Notes |
|-------|--------|-------|
| Frontend types | ✅ Compatible | All ChatState fields map to API responses |
| API routes | ✅ Compatible | All endpoints match frontend `api.ts` |
| Socket events | ✅ Compatible | mutual_like, matched, new_message aligned |
| Matching engine | ✅ Compatible | Uses visitor_sessions preference columns |
| Likes | ✅ Fixed | Silent storage; mutual_like only on both liked |

### Missing Items (Fixed in 004)

- ✅ Unique index on `likes(match_id, session_id)`
- ✅ Index on `temporary_messages(expires_at)`
- ✅ `purge_expired_messages()` function

---

## API → Table Mapping

| Endpoint | Tables |
|----------|--------|
| POST /start-session | visitor_sessions, connection_logs |
| POST /end-session | visitor_sessions, waiting_queue, connection_logs |
| POST /match/join | visitor_sessions, waiting_queue, matches, connection_logs |
| POST /match/leave | waiting_queue, visitor_sessions, connection_logs |
| POST /match/next | matches, temporary_messages, waiting_queue, connection_logs |
| POST /match/disconnect | matches, temporary_messages, connection_logs |
| POST /preferences | visitor_sessions |
| POST /like | likes, matches |
| POST /chat | temporary_messages, matches |
| POST /report | reports, connection_logs |
| POST /feedback | feedback |
| GET /stats | visitor_sessions, waiting_queue, matches |
| GET /locations | locations |
| GET /interests | interests |
| GET /analytics | All tables (admin) |

## Socket → Table Mapping

| Event | Tables |
|-------|--------|
| join_queue | waiting_queue, matches |
| like_partner | likes, matches |
| chat_message | temporary_messages |
| next/leave/disconnect | matches, temporary_messages, waiting_queue |

---

## Performance Suggestions

1. Run migration 004 on production Supabase
2. Schedule `purge_expired_messages()` via pg_cron or backend cleanup
3. Monitor `waiting_queue` size; stale entries cleaned every 30s
4. `idx_matches_active` speeds active match lookups
