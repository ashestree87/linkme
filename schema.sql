-- Schema for LinkMe application

-- Events table for tracking LinkedIn connection and messaging activities
CREATE TABLE IF NOT EXISTS events (
  urn TEXT,
  event_type TEXT,
  timestamp INTEGER,
  PRIMARY KEY (urn, event_type, timestamp)
);

-- Possible event_type values:
-- - invite_sent: Connection invitation sent
-- - invite_failed: Failed to send connection invitation
-- - dm_sent: Direct message sent
-- - dm_failed: Failed to send direct message 