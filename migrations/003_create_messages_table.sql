-- migrations/003_create_messages_table.sql
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL,
  sender_type VARCHAR(50) NOT NULL, -- 'user', 'bot', 'system'
  content TEXT NOT NULL,
  language VARCHAR(10),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_eligibility_result BOOLEAN DEFAULT FALSE,
  eligibility_is_eligible BOOLEAN NULL,
  eligibility_details TEXT NULL,
  CONSTRAINT fk_conversation
    FOREIGN KEY(conversation_id) 
    REFERENCES conversations(id)
    ON DELETE CASCADE -- If a conversation is deleted, delete its messages
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
