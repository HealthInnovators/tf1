-- migrations/002_create_conversations_table.sql
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  lead_id INTEGER NULL,
  initial_language VARCHAR(10),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lead
    FOREIGN KEY(lead_id) 
    REFERENCES leads(id)
    ON DELETE SET NULL -- If a lead is deleted, nullify lead_id in conversations
);

CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_lead_id ON conversations(lead_id);
