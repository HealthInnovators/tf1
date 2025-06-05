
import { config } from 'dotenv';
config(); // Ensures .env variables are loaded for Genkit and potentially DB access if run standalone

import '@/ai/flows/faq-retrieval.ts';
import '@/ai/flows/dynamic-content-retrieval.ts';
import '@/ai/flows/service-eligibility-check.ts';
// No direct import for db.ts needed here unless genkit flows use it directly
// and are run in a context where Next.js isn't managing env vars.
// However, leadService.ts which uses db.ts is a server action called from client.
