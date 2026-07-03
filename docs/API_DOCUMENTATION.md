# API Documentation

Base URL: `{origin}/api` (Vercel) or `{BACKEND_URL}/api` (Render)

## Response Format

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "message" }
```

---

## Endpoints

### GET /health
No auth. Returns server and database status.

### GET /stats
No auth. Returns `{ activeUsers, waitingUsers, matchesToday, onlineNow }`.

### POST /start-session
Rate limited (backend). Body: `{ browser?, device?, platform? }`  
Returns: `{ sessionId, sessionToken, createdAt }`

### POST /end-session
Body: `{ sessionId }`

### POST /match/join
Body: `{ sessionId, sessionToken }`  
Returns: `{ status: "waiting"|"matched", queuePosition?, matchId?, partnerSessionId?, isInitiator?, iceServers? }`

### POST /match/leave
Body: `{ sessionId, sessionToken }`

### POST /match/next
Body: `{ sessionId, sessionToken }`  
Ends current match, re-queues user.

### POST /match/disconnect
Body: `{ sessionId, sessionToken, reason? }`  
Reasons: `leave`, `disconnect`, `report`

### POST /preferences
Body: `{ sessionId, sessionToken, preferences: { gender?, looking_for?, languages?, country?, state?, district?, city?, interest_tags? } }`

### GET /locations?q=
Autocomplete. Returns array of location objects.

### GET /interests?q=
Autocomplete. Returns array of interest objects.

### POST /like
Body: `{ sessionId, sessionToken, matchId }`  
Returns: `{ success: true, mutual: boolean }`  
Emits `mutual_like` broadcast when both users liked.

### POST /chat
Body: `{ sessionId, sessionToken, matchId, message }`  
Returns message object. Broadcasts `new_message` to partner.

### POST /report
Body: `{ reporterSessionId, reportedSessionId, reason, notes? }`  
Reasons: `spam`, `nudity`, `abuse`, `harassment`, `other`

### POST /feedback
Body: `{ sessionId, rating (1-5), feedback? }`

### GET /analytics
Header: `Authorization: Bearer {ADMIN_TOKEN}`  
Returns platform analytics dashboard data.

---

## Socket.IO Events (when VITE_SIGNALING_PROVIDER=socketio)

### Client → Server
`join_queue`, `leave_queue`, `next`, `offer`, `answer`, `ice_candidate`, `like_partner`, `chat_message`, `typing`, `preferences_updated`

### Server → Client
`matched`, `waiting`, `searching`, `partner_left`, `mutual_like`, `new_message`, `partner_typing`, `offer`, `answer`, `ice_candidate`, `error`, `reconnect`

## Supabase Realtime (default)

**Session channel** `session:{sessionId}`:  
`matched`, `partner_left`, `searching`, `mutual_like`, `new_message`, `partner_typing`

**Match channel** `match:{matchId}`:  
`offer`, `answer`, `ice_candidate`, `typing`
