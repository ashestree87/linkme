-- Events table for tracking LinkedIn connection and messaging activities
CREATE TABLE IF NOT EXISTS events (
  urn TEXT,
  event_type TEXT,
  timestamp INTEGER,
  PRIMARY KEY (urn, event_type, timestamp)
); 