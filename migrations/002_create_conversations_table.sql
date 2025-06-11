-- migrations/002_create_conversations_table.sql
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  initial_language VARCHAR(10),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
