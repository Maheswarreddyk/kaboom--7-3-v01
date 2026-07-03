-- Migration 004: Production fixes — indexes, constraints, cleanup

-- Prevent duplicate likes per user per match
CREATE UNIQUE INDEX IF NOT EXISTS idx_likes_match_session
  ON likes(match_id, session_id);

-- Speed up message expiry cleanup
CREATE INDEX IF NOT EXISTS idx_temporary_messages_expires_at
  ON temporary_messages(expires_at);

-- Speed up active queue lookups
CREATE INDEX IF NOT EXISTS idx_waiting_queue_status_joined
  ON waiting_queue(status, joined_at DESC)
  WHERE status = 'waiting';

-- Speed up session activity tracking
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_last_activity
  ON visitor_sessions(last_activity DESC)
  WHERE status IN ('active', 'waiting', 'matched');

-- Function to purge expired temporary messages
CREATE OR REPLACE FUNCTION purge_expired_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM temporary_messages WHERE expires_at < NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION purge_expired_messages() TO service_role;
