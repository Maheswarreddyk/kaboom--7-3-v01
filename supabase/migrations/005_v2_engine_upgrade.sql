-- =============================================
-- KaboomPremium V2 Engine Upgrade Migration
-- Additive only — no columns removed, no data lost
-- =============================================

-- 1. Reservation support on waiting_queue
ALTER TABLE waiting_queue ADD COLUMN IF NOT EXISTS reserved_by UUID;
ALTER TABLE waiting_queue ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMPTZ;

-- 2. Match lifecycle and ready state
ALTER TABLE matches ADD COLUMN IF NOT EXISTS lifecycle VARCHAR(20) DEFAULT 'creating';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS ready_a BOOLEAN DEFAULT FALSE;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS ready_b BOOLEAN DEFAULT FALSE;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ;

-- 3. User state on visitor_sessions
ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS user_state VARCHAR(20) DEFAULT 'active';

-- 4. Reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a UUID NOT NULL REFERENCES visitor_sessions(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES visitor_sessions(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT reservations_different_users CHECK (user_a <> user_b)
);

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reservations_pending ON reservations(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_reservations_expires ON reservations(expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_waiting_queue_reservable
  ON waiting_queue(status, joined_at DESC) WHERE status = 'waiting' AND reserved_by IS NULL;
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_user_state ON visitor_sessions(user_state);

-- 6. RLS and grants for reservations table
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
GRANT ALL ON reservations TO service_role;
