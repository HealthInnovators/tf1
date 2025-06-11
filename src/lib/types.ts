
export type Message = {
  id: string; // Client-side ID, can be different from DB ID
  dbId?: number; // Actual ID from the database, once saved
  conversationDbId: number; // DB ID of the conversation this message belongs to
  text: string;
  sender: 'user' | 'bot' | 'system';
  timestamp: Date;
  language?: Language;
  isEligibilityResult?: boolean;
  eligibility?: {
    isEligible: boolean;
    details: string;
  };
};

export type Language = 'en' | 'te';

// For database representation of a message
export interface MessageFromDB {
  id: number;
  conversation_id: number;
  sender_type: 'user' | 'bot' | 'system';
  content: string;
  language: Language | null;
  timestamp: Date;
  is_eligibility_result: boolean | null;
  eligibility_is_eligible: boolean | null;
  eligibility_details: string | null;
}

// For database representation of a conversation
export interface ConversationFromDB {
  id: number;
  session_id: string; // Unique client-generated ID
  lead_id: number | null;
  initial_language: Language | null;
  started_at: Date;
  last_activity_at: Date;
}



// Return type for getOrCreateConversation
export interface GetOrCreateConversationResult {
  id: number;
  error?: string;
}

// Return type for addMessageToConversation
export interface AddMessageResult {
  success: boolean;
  messageDbId?: number;
  error?: string;
}
