// This file is machine-generated - edit at your own risk.

'use server';

/**
 * @fileOverview This file defines a Genkit flow for retrieving dynamic content from the T-Fiber website.
 *
 * - dynamicContentRetrieval - A function that retrieves dynamic content from the T-Fiber website.
 * - DynamicContentRetrievalInput - The input type for the dynamicContentRetrieval function.
 * - DynamicContentRetrievalOutput - The return type for the dynamicContentRetrieval function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DynamicContentRetrievalInputSchema = z.object({
  query: z.string().describe('The user query to retrieve information about.'),
});
export type DynamicContentRetrievalInput = z.infer<
  typeof DynamicContentRetrievalInputSchema
>;

const DynamicContentRetrievalOutputSchema = z.object({
  response: z.string().describe('The response from the T-Fiber website.'),
});
export type DynamicContentRetrievalOutput = z.infer<
  typeof DynamicContentRetrievalOutputSchema
>;

export async function dynamicContentRetrieval(
  input: DynamicContentRetrievalInput
): Promise<DynamicContentRetrievalOutput> {
  return dynamicContentRetrievalFlow(input);
}

const dynamicContentRetrievalPrompt = ai.definePrompt({
  name: 'dynamicContentRetrievalPrompt',
  input: {schema: DynamicContentRetrievalInputSchema},
  output: {schema: DynamicContentRetrievalOutputSchema},
  prompt: `You are a chatbot assistant for T-Fiber. Retrieve information from the T-Fiber website to answer the user's query.

User query: {{{query}}}`,
});

const dynamicContentRetrievalFlow = ai.defineFlow(
  {
    name: 'dynamicContentRetrievalFlow',
    inputSchema: DynamicContentRetrievalInputSchema,
    outputSchema: DynamicContentRetrievalOutputSchema,
  },
  async input => {
    const {output} = await dynamicContentRetrievalPrompt(input);
    return output!;
  }
);
