
'use server';
import pool from '@/lib/db'; // Import the PostgreSQL connection pool
import type { Language } from '@/lib/types';
import { linkLeadToConversation } from './conversationService'; // Import the new function

interface LeadData {
  name: string;
  phoneNumber: string;
  languagePreference: Language;
}

export async function saveLead(
  name: string,
  phoneNumber: string,
  language: Language,
  conversationDbId: number | null // Added conversationDbId
): Promise<{ success: boolean; leadId?: number; error?: string }> { // Added leadId to return type

  if (!name.trim() || !phoneNumber.trim()) {
    return { success: false, error: 'Name and phone number are required.' };
  }

  if (!/^\d{10}$/.test(phoneNumber)) {
    return { success: false, error: 'Invalid phone number format. Please enter 10 digits.' };
  }

  const leadData: LeadData = {
    name,
    phoneNumber,
    languagePreference: language,
  };

  const queryText = `
    INSERT INTO leads (name, phone_number, language_preference)
    VALUES ($1, $2, $3)
    ON CONFLICT (phone_number) DO UPDATE 
      SET name = EXCLUDED.name, 
          language_preference = EXCLUDED.language_preference, 
          updated_at = NOW()
    RETURNING id;
  `;
  const values = [leadData.name, leadData.phoneNumber, leadData.languagePreference];

  let client;
  try {
    client = await pool.connect();
    const result = await client.query(queryText, values);
    
    if (result.rows.length > 0) {
      const leadId = result.rows[0].id;
      if (conversationDbId !== null) {
        const linkResult = await linkLeadToConversation(leadId, conversationDbId);
        if (!linkResult.success) {
          // Log the error but still consider lead saving successful
          console.warn(`Failed to link lead ${leadId} to conversation ${conversationDbId}: ${linkResult.error}`);
          // Optionally, you could decide to return an error here if linking is critical
          // For now, we'll proceed as lead saved, but linking failed.
        }
      }
      return { success: true, leadId };
    } else {
      return { success: false, error: 'Failed to save lead data. No rows affected.' };
    }
  } catch (e: unknown) {
    console.error('Error saving lead to PostgreSQL:', e);
    let errorMessage = 'An internal error occurred while saving your details.';
    if (e instanceof Error) {
      // Check for unique constraint violation on phone_number if not using ON CONFLICT
      // if ((e as any).code === '23505' && (e as any).constraint === 'leads_phone_number_key') {
      //   errorMessage = 'This phone number is already registered.';
      // } else {
        errorMessage = e.message;
      // }
    }
    return {
      success: false,
      error: `Failed to save lead: ${errorMessage}`,
    };
  } finally {
    if (client) {
      client.release(); 
    }
  }
}
